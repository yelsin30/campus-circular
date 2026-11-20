import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../data/auth.service';
import { MaterialCatalogService } from '../../data/material-catalog.service';
import {
  ModerationService,
  PublicationReport,
  ReportStatus,
  UserStatus,
} from '../../data/moderation.service';
import { PublicationService } from '../../data/publication.service';
import { MaterialArtwork } from '../../shared/material-artwork/material-artwork';

type AdminSection = 'dashboard' | 'publications' | 'reports' | 'users' | 'history';
type ReportFilter = 'Todas' | 'Pendientes' | 'Resueltas';
type PublicationFilter = 'Todas' | 'Activa' | 'Oculta' | 'Eliminada';
type ConfirmationAction = {
  type: 'hide' | 'hidePublication' | 'delete' | 'deleteReported' | 'suspend' | 'suspendPublication';
  id: string;
} | null;

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [RouterLink, MaterialArtwork],
  templateUrl: './admin.html',
})
export class AdminPage {
  readonly moderation = inject(ModerationService);
  readonly catalog = inject(MaterialCatalogService);
  readonly auth = inject(AuthService);
  private readonly publicationService = inject(PublicationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly menuItems: { id: AdminSection; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Panel general', icon: 'dashboard' },
    { id: 'publications', label: 'Publicaciones', icon: 'publications' },
    { id: 'reports', label: 'Reportes', icon: 'reports' },
    { id: 'users', label: 'Usuarios', icon: 'users' },
    { id: 'history', label: 'Historial', icon: 'history' },
  ];

  readonly section = signal<AdminSection>('reports');
  readonly reportFilter = signal<ReportFilter>('Pendientes');
  readonly publicationFilter = signal<PublicationFilter>('Todas');
  readonly reportSearch = signal('');
  readonly publicationSearch = signal('');
  readonly selectedReport = signal<PublicationReport | null>(null);
  readonly selectedMaterialId = signal<string | null>(null);
  readonly selectedUserId = signal<string | null>(null);
  readonly confirmation = signal<ConfirmationAction>(null);
  readonly notice = signal('');
  readonly isMobileMenuOpen = signal(false);

  constructor() {
    if (this.router.url.includes('/reportes')) {
      this.section.set('reports');
    }

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.publicationService
        .getPublications({ page: 0, size: 50 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
      this.moderation
        .loadAdminReports(true)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    });
  }

  get adminName(): string {
    return this.auth.currentUser()?.email || 'Administrador UPN';
  }

  get adminInitials(): string {
    const email = this.auth.currentUser()?.email;
    return email ? email.slice(0, 2).toUpperCase() : 'AD';
  }

  get heading(): string {
    return this.menuItems.find((item) => item.id === this.section())?.label ?? 'Panel general';
  }

  get publications() {
    const query = this.publicationSearch().trim().toLocaleLowerCase('es');
    const source = this.publicationService.publications().length
      ? this.publicationService.publications()
      : this.catalog.materials();
    return source.filter((material) => {
      const status = this.moderation.getPublicationStatus(material);
      const matchesFilter =
        this.publicationFilter() === 'Todas' || status === this.publicationFilter();
      const matchesText =
        !query ||
        `${material.title} ${material.owner} ${material.category}`
          .toLocaleLowerCase('es')
          .includes(query);
      return matchesFilter && matchesText;
    });
  }

  get reports(): PublicationReport[] {
    const query = this.reportSearch().trim().toLocaleLowerCase('es');
    return this.moderation.reports().filter((report) => {
      const matchesTab =
        this.reportFilter() === 'Todas' ||
        (this.reportFilter() === 'Pendientes' &&
          (report.status === 'Pendiente' || report.status === 'En revisión')) ||
        (this.reportFilter() === 'Resueltas' &&
          (report.status === 'Resuelto' || report.status === 'Descartado'));
      const material = this.moderation.materialForReport(report);
      const matchesText =
        !query ||
        `${material.title} ${report.reporter} ${report.reason}`
          .toLocaleLowerCase('es')
          .includes(query);
      return matchesTab && matchesText;
    });
  }

  selectSection(section: AdminSection): void {
    this.section.set(section);
    this.notice.set('');
    this.isMobileMenuOpen.set(false);
    if (section === 'reports') {
      this.moderation
        .loadAdminReports(true)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  updateReportSearch(event: Event): void {
    this.reportSearch.set((event.target as HTMLInputElement).value);
  }

  updatePublicationSearch(event: Event): void {
    this.publicationSearch.set((event.target as HTMLInputElement).value);
  }

  publicationStatus(materialId: string) {
    const material =
      this.publicationService.findById(materialId) ?? this.catalog.findById(materialId);
    return material ? this.moderation.getPublicationStatus(material) : 'Oculta';
  }

  publicationStatusClass(materialId: string): string {
    return `status-${this.publicationStatus(materialId).toLocaleLowerCase('es')}`;
  }

  reportStatusClass(status: ReportStatus): string {
    return `status-${status.toLocaleLowerCase('es').replace(/\s+/g, '-')}`;
  }

  userStatusClass(status: UserStatus): string {
    return status === 'Activo' ? 'status-active' : 'status-suspended';
  }

  showMaterial(materialId: string): void {
    this.selectedMaterialId.set(materialId);
  }

  openReport(report: PublicationReport): void {
    this.selectedReport.set(this.moderation.findReport(report.id) ?? report);
    this.section.set('reports');
  }

  reviewReport(report: PublicationReport): void {
    this.openReport(report);
  }

  suspendReportedPublication(report: PublicationReport): void {
    const pubId = report.publicationId ?? Number(report.materialId);
    if (!Number.isFinite(pubId) || pubId <= 0) {
      this.moderation.hideReportedPublication(report.id);
      this.notice.set(`Publicación ${report.materialId} suspendida y reporte atendido.`);
      this.selectedReport.set(null);
      return;
    }

    this.moderation
      .suspendPublicationByAdmin(pubId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.notice.set(
            `Publicación #${res.idPublicacion} suspendida (${res.estadoPublicacion}). Reportes atendidos: ${res.reportesAtendidos}.`,
          );
          this.selectedReport.set(null);
          this.confirmation.set(null);
          this.moderation
            .loadAdminReports(true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
          this.publicationService
            .getPublications({ page: 0, size: 50 })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
        },
        error: (err: HttpErrorResponse) => {
          this.notice.set(
            (err.error?.message as string | undefined) ||
              'No se pudo suspender la publicación reportada.',
          );
        },
      });
  }

  resolveReport(report: PublicationReport): void {
    this.notice.set(
      this.moderation.resolveReport(report.id)
        ? `Reporte ${report.id} resuelto.`
        : 'No se pudo actualizar este reporte.',
    );
    this.selectedReport.set(null);
  }

  discardReport(report: PublicationReport): void {
    this.notice.set(
      this.moderation.discardReport(report.id)
        ? `Reporte ${report.id} descartado.`
        : 'No se pudo descartar este reporte.',
    );
    this.selectedReport.set(null);
  }

  requestHideReported(report: PublicationReport): void {
    this.suspendReportedPublication(report);
  }

  requestDeleteReported(report: PublicationReport): void {
    this.suspendReportedPublication(report);
  }

  requestHidePublication(materialId: string): void {
    const pubId = Number(materialId);
    if (Number.isFinite(pubId) && pubId > 0) {
      this.moderation
        .suspendPublicationByAdmin(pubId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.notice.set(`Publicación #${res.idPublicacion} suspendida en el servidor.`);
            this.publicationService
              .getPublications({ page: 0, size: 50 })
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe();
          },
        });
      return;
    }
    this.confirmation.set({ type: 'hidePublication', id: materialId });
  }

  requestDelete(materialId: string): void {
    this.confirmation.set({ type: 'delete', id: materialId });
  }

  requestSuspend(userId: string): void {
    this.confirmation.set({ type: 'suspend', id: userId });
  }

  hidePublication(materialId: string): void {
    this.notice.set(
      this.moderation.moderatePublication(materialId, 'Oculta')
        ? 'Publicación ocultada del marketplace.'
        : 'No se pudo ocultar la publicación.',
    );
  }

  restorePublication(materialId: string): void {
    this.notice.set(
      this.moderation.moderatePublication(materialId, 'Activa')
        ? 'Publicación restaurada y visible en el marketplace.'
        : 'No se pudo restaurar la publicación.',
    );
  }

  confirmAction(): void {
    const pending = this.confirmation();
    if (!pending) return;
    const { type, id } = pending;
    if (type === 'hide') {
      this.notice.set(
        this.moderation.hideReportedPublication(id)
          ? 'La publicación se ocultó y el reporte quedó resuelto.'
          : 'No se pudo ocultar la publicación reportada.',
      );
      this.selectedReport.set(null);
    } else if (type === 'hidePublication') {
      this.notice.set(
        this.moderation.moderatePublication(id, 'Oculta')
          ? 'Publicación ocultada del marketplace.'
          : 'No se pudo ocultar la publicación.',
      );
    } else if (type === 'delete') {
      this.notice.set(
        this.moderation.moderatePublication(id, 'Eliminada')
          ? 'Publicación retirada del marketplace; el registro histórico se conserva.'
          : 'No se pudo eliminar la publicación.',
      );
    } else if (type === 'deleteReported') {
      this.notice.set(
        this.moderation.deleteReportedPublication(id)
          ? `Publicación retirada y reporte ${id} resuelto.`
          : 'No se pudo eliminar la publicación reportada.',
      );
      this.selectedReport.set(null);
    } else {
      this.notice.set(
        this.moderation.suspendUser(id)
          ? 'Usuario suspendido.'
          : 'No se puede suspender esta cuenta.',
      );
    }
    this.confirmation.set(null);
  }

  closeDialogs(): void {
    this.confirmation.set(null);
    this.selectedReport.set(null);
    this.selectedMaterialId.set(null);
    this.selectedUserId.set(null);
  }

  showUser(userId: string): void {
    this.selectedUserId.set(userId);
  }

  reactivateUser(userId: string): void {
    this.notice.set(
      this.moderation.reactivateUser(userId)
        ? 'Usuario reactivado.'
        : 'No se pudo reactivar el usuario.',
    );
  }

  formatDate(timestamp: number): string {
    if (timestamp < 100_000_000_000) return 'Reciente';
    return new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(timestamp);
  }

  formatPublicationDate(timestamp: number, label: string): string {
    return timestamp < 100_000_000_000 ? label : this.formatDate(timestamp);
  }

  formatDateTime(timestamp: number): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  }
}

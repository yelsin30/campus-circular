import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
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
export class AdminPage implements OnInit {
  readonly moderation = inject(ModerationService);
  readonly catalog = inject(MaterialCatalogService);
  private readonly publicationService = inject(PublicationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly menuItems: { id: AdminSection; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Panel general', icon: 'dashboard' },
    { id: 'publications', label: 'Publicaciones', icon: 'publications' },
    { id: 'reports', label: 'Reportes', icon: 'reports' },
    { id: 'users', label: 'Usuarios', icon: 'users' },
    { id: 'history', label: 'Historial', icon: 'history' },
  ];

  section: AdminSection = 'reports';
  reportFilter: ReportFilter = 'Pendientes';
  publicationFilter: PublicationFilter = 'Todas';
  reportSearch = '';
  publicationSearch = '';
  selectedReport: PublicationReport | null = null;
  selectedMaterialId: string | null = null;
  selectedUserId: string | null = null;
  confirmation: ConfirmationAction = null;
  notice = '';
  isMobileMenuOpen = false;

  ngOnInit(): void {
    if (this.router.url.includes('/reportes')) {
      this.section = 'reports';
    }
    this.publicationService
      .getPublications({ page: 0, size: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
    this.moderation
      .loadAdminReports(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  get heading(): string {
    return this.menuItems.find((item) => item.id === this.section)?.label ?? 'Panel general';
  }

  get publications() {
    const query = this.publicationSearch.trim().toLocaleLowerCase('es');
    const source = this.publicationService.publications().length
      ? this.publicationService.publications()
      : this.catalog.materials();
    return source.filter((material) => {
      const status = this.moderation.getPublicationStatus(material);
      const matchesFilter =
        this.publicationFilter === 'Todas' || status === this.publicationFilter;
      const matchesText =
        !query ||
        `${material.title} ${material.owner} ${material.category}`
          .toLocaleLowerCase('es')
          .includes(query);
      return matchesFilter && matchesText;
    });
  }

  get reports(): PublicationReport[] {
    const query = this.reportSearch.trim().toLocaleLowerCase('es');
    return this.moderation.reports().filter((report) => {
      const matchesTab =
        this.reportFilter === 'Todas' ||
        (this.reportFilter === 'Pendientes' &&
          (report.status === 'Pendiente' || report.status === 'En revisión')) ||
        (this.reportFilter === 'Resueltas' &&
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
    this.section = section;
    this.notice = '';
    this.isMobileMenuOpen = false;
    if (section === 'reports') {
      this.moderation
        .loadAdminReports(true)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  updateReportSearch(event: Event): void {
    this.reportSearch = (event.target as HTMLInputElement).value;
  }

  updatePublicationSearch(event: Event): void {
    this.publicationSearch = (event.target as HTMLInputElement).value;
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
    this.selectedMaterialId = materialId;
  }

  openReport(report: PublicationReport): void {
    this.selectedReport = this.moderation.findReport(report.id) ?? report;
    this.section = 'reports';
  }

  reviewReport(report: PublicationReport): void {
    this.openReport(report);
  }

  suspendReportedPublication(report: PublicationReport): void {
    const pubId = report.publicationId ?? Number(report.materialId);
    if (!Number.isFinite(pubId) || pubId <= 0) {
      this.moderation.hideReportedPublication(report.id);
      this.notice = `Publicación ${report.materialId} suspendida y reporte atendido.`;
      this.selectedReport = null;
      return;
    }

    this.moderation
      .suspendPublicationByAdmin(pubId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.notice = `Publicación #${res.idPublicacion} suspendida (${res.estadoPublicacion}). Reportes atendidos: ${res.reportesAtendidos}.`;
          this.selectedReport = null;
          this.confirmation = null;
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
          this.notice =
            (err.error?.message as string | undefined) ||
            'No se pudo suspender la publicación reportada.';
        },
      });
  }

  resolveReport(report: PublicationReport): void {
    this.notice = this.moderation.resolveReport(report.id)
      ? `Reporte ${report.id} resuelto.`
      : 'No se pudo actualizar este reporte.';
    this.selectedReport = null;
  }

  discardReport(report: PublicationReport): void {
    this.notice = this.moderation.discardReport(report.id)
      ? `Reporte ${report.id} descartado.`
      : 'No se pudo descartar este reporte.';
    this.selectedReport = null;
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
            this.notice = `Publicación #${res.idPublicacion} suspendida en el servidor.`;
            this.publicationService
              .getPublications({ page: 0, size: 50 })
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe();
          },
        });
      return;
    }
    this.confirmation = { type: 'hidePublication', id: materialId };
  }

  requestDelete(materialId: string): void {
    this.confirmation = { type: 'delete', id: materialId };
  }

  requestSuspend(userId: string): void {
    this.confirmation = { type: 'suspend', id: userId };
  }

  hidePublication(materialId: string): void {
    this.notice = this.moderation.moderatePublication(materialId, 'Oculta')
      ? 'Publicación ocultada del marketplace.'
      : 'No se pudo ocultar la publicación.';
  }

  restorePublication(materialId: string): void {
    this.notice = this.moderation.moderatePublication(materialId, 'Activa')
      ? 'Publicación restaurada y visible en el marketplace.'
      : 'No se pudo restaurar la publicación.';
  }

  confirmAction(): void {
    if (!this.confirmation) return;
    const { type, id } = this.confirmation;
    if (type === 'hide') {
      this.notice = this.moderation.hideReportedPublication(id)
        ? 'La publicación se ocultó y el reporte quedó resuelto.'
        : 'No se pudo ocultar la publicación reportada.';
      this.selectedReport = null;
    } else if (type === 'hidePublication') {
      this.notice = this.moderation.moderatePublication(id, 'Oculta')
        ? 'Publicación ocultada del marketplace.'
        : 'No se pudo ocultar la publicación.';
    } else if (type === 'delete') {
      this.notice = this.moderation.moderatePublication(id, 'Eliminada')
        ? 'Publicación eliminada del marketplace; el registro se conserva.'
        : 'No se pudo eliminar la publicación.';
    } else if (type === 'deleteReported') {
      this.notice = this.moderation.deleteReportedPublication(id)
        ? `Publicación eliminada y reporte ${id} resuelto.`
        : 'No se pudo eliminar la publicación reportada.';
      this.selectedReport = null;
    } else {
      this.notice = this.moderation.suspendUser(id)
        ? 'Usuario suspendido.'
        : 'No se puede suspender esta cuenta.';
    }
    this.confirmation = null;
  }

  closeDialogs(): void {
    this.confirmation = null;
    this.selectedReport = null;
    this.selectedMaterialId = null;
    this.selectedUserId = null;
  }

  showUser(userId: string): void {
    this.selectedUserId = userId;
  }

  reactivateUser(userId: string): void {
    this.notice = this.moderation.reactivateUser(userId)
      ? 'Usuario reactivado.'
      : 'No se pudo reactivar el usuario.';
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

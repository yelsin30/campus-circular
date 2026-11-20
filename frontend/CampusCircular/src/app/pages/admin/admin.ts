import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../data/auth.service';
import { MarketplaceMaterial } from '../../data/material-catalog';
import {
  AdminUser,
  ModerationService,
  PublicationReport,
  ReportStatus,
} from '../../data/moderation.service';
import { BackendPublicationStatus, PublicationService } from '../../data/publication.service';
import { ImageLightbox } from '../../shared/image-lightbox/image-lightbox';
import { MaterialArtwork } from '../../shared/material-artwork/material-artwork';

type AdminSection = 'dashboard' | 'publications' | 'reports' | 'users' | 'history';
type ReportFilter = 'Todas' | 'Pendientes' | 'Resueltas';
type PublicationFilter = 'Todas' | 'Activas' | 'Suspendidas' | 'Retiradas';
type ConfirmationAction = {
  type: 'suspendPublication' | 'retirePublication' | 'toggleUser';
  id: number;
  label: string;
  currentStatus?: string;
} | null;

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [RouterLink, MaterialArtwork, ImageLightbox],
  templateUrl: './admin.html',
})
export class AdminPage {
  readonly moderation = inject(ModerationService);
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

  readonly section = signal<AdminSection>('dashboard');
  readonly reportFilter = signal<ReportFilter>('Pendientes');
  readonly publicationFilter = signal<PublicationFilter>('Todas');
  readonly reportSearch = signal('');
  readonly publicationSearch = signal('');
  readonly userSearch = signal('');
  readonly selectedReport = signal<PublicationReport | null>(null);
  readonly selectedMaterial = signal<MarketplaceMaterial | null>(null);
  readonly selectedUser = signal<AdminUser | null>(null);
  readonly confirmation = signal<ConfirmationAction>(null);
  readonly notice = signal('');
  readonly busy = signal(false);
  readonly isMobileMenuOpen = signal(false);

  readonly lightboxImages = signal<string[]>([]);
  readonly lightboxTitle = signal('');

  readonly allPublicationsCount = computed(() => this.moderation.adminPublications().length);
  readonly activePublicationsCount = computed(
    () =>
      this.moderation
        .adminPublications()
        .filter((p) => p.backendStatus === 'DISPONIBLE' || p.backendStatus === 'EN_NEGOCIACION')
        .length,
  );
  readonly suspendedPublicationsCount = computed(
    () =>
      this.moderation.adminPublications().filter((p) => p.backendStatus === 'SUSPENDIDO').length,
  );
  readonly retiredPublicationsCount = computed(
    () =>
      this.moderation
        .adminPublications()
        .filter((p) => p.backendStatus === 'RETIRADA' || p.backendStatus === 'TRANSFERIDO').length,
  );

  constructor() {
    if (this.router.url.includes('/reportes')) {
      this.section.set('reports');
    }

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.refreshAllAdminData();
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

  get publications(): MarketplaceMaterial[] {
    const query = this.publicationSearch().trim().toLocaleLowerCase('es');
    return this.moderation.adminPublications().filter((material) => {
      const status = material.backendStatus ?? 'DISPONIBLE';
      const matchesFilter =
        this.publicationFilter() === 'Todas' ||
        (this.publicationFilter() === 'Activas' &&
          (status === 'DISPONIBLE' || status === 'EN_NEGOCIACION')) ||
        (this.publicationFilter() === 'Suspendidas' && status === 'SUSPENDIDO') ||
        (this.publicationFilter() === 'Retiradas' &&
          (status === 'RETIRADA' || status === 'TRANSFERIDO'));

      const matchesText =
        !query ||
        `${material.id} ${material.title} ${material.owner} ${material.category} ${status}`
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
        (this.reportFilter() === 'Pendientes' && report.status === 'Pendiente') ||
        (this.reportFilter() === 'Resueltas' &&
          (report.status === 'Resuelto' || report.status === 'Descartado'));
      const matchesText =
        !query ||
        `${report.id} ${report.publicationTitle} ${report.reporter} ${report.reason} ${report.ownerEmail}`
          .toLocaleLowerCase('es')
          .includes(query);
      return matchesTab && matchesText;
    });
  }

  get filteredUsers(): AdminUser[] {
    const query = this.userSearch().trim().toLocaleLowerCase('es');
    return this.moderation.users().filter((user) => {
      if (!query) return true;
      return `${user.id} ${user.fullName} ${user.email} ${user.roleLabel} ${user.statusLabel}`
        .toLocaleLowerCase('es')
        .includes(query);
    });
  }

  selectSection(section: AdminSection): void {
    this.section.set(section);
    this.notice.set('');
    this.isMobileMenuOpen.set(false);
    if (!isPlatformBrowser(this.platformId)) return;

    if (section === 'dashboard' || section === 'history') {
      this.moderation.loadAdminOverview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
    if (section === 'publications') {
      this.moderation.loadAdminPublications().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
    if (section === 'reports' || section === 'dashboard') {
      this.moderation.loadAdminReports(true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
    if (section === 'users') {
      this.moderation.loadAdminUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  refreshAllAdminData(): void {
    this.moderation.loadAdminOverview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.moderation.loadAdminPublications().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.moderation.loadAdminReports(true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.moderation.loadAdminUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  updateReportSearch(event: Event): void {
    this.reportSearch.set((event.target as HTMLInputElement).value);
  }

  updatePublicationSearch(event: Event): void {
    this.publicationSearch.set((event.target as HTMLInputElement).value);
  }

  updateUserSearch(event: Event): void {
    this.userSearch.set((event.target as HTMLInputElement).value);
  }

  backendStatusLabel(status: BackendPublicationStatus | string | undefined): string {
    switch (status) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'EN_NEGOCIACION':
        return 'En negociación';
      case 'SUSPENDIDO':
        return 'Suspendida';
      case 'RETIRADA':
        return 'Retirada';
      case 'TRANSFERIDO':
        return 'Transferida';
      default:
        return status || 'Disponible';
    }
  }

  backendStatusClass(status: BackendPublicationStatus | string | undefined): string {
    switch (status) {
      case 'DISPONIBLE':
        return 'status-activa';
      case 'EN_NEGOCIACION':
        return 'status-en-revisión';
      case 'SUSPENDIDO':
        return 'status-pendiente';
      case 'RETIRADA':
        return 'status-eliminada';
      case 'TRANSFERIDO':
        return 'status-oculta';
      default:
        return 'status-oculta';
    }
  }

  reportStatusClass(status: ReportStatus): string {
    return `status-${status.toLocaleLowerCase('es').replace(/\s+/g, '-')}`;
  }

  userStatusClass(estado: string): string {
    if (estado === 'ACTIVO') return 'status-active';
    if (estado === 'SUSPENDIDO') return 'status-suspended';
    return 'status-oculta';
  }

  openLightbox(images: string[] | undefined, title: string, event?: Event): void {
    event?.stopPropagation();
    if (!images?.length) return;
    this.lightboxImages.set(images);
    this.lightboxTitle.set(title);
  }

  closeLightbox(): void {
    this.lightboxImages.set([]);
    this.lightboxTitle.set('');
  }

  showMaterial(material: MarketplaceMaterial): void {
    this.selectedMaterial.set(material);
  }

  openReport(report: PublicationReport): void {
    this.selectedReport.set(this.moderation.findReport(report.id) ?? report);
    this.section.set('reports');
  }

  showUser(user: AdminUser): void {
    this.selectedUser.set(user);
  }

  requestSuspendPublication(material: MarketplaceMaterial): void {
    this.confirmation.set({
      type: 'suspendPublication',
      id: Number(material.id),
      label: material.title,
    });
  }

  requestRetirePublication(material: MarketplaceMaterial): void {
    this.confirmation.set({
      type: 'retirePublication',
      id: Number(material.id),
      label: material.title,
    });
  }

  requestToggleUser(user: AdminUser): void {
    this.confirmation.set({
      type: 'toggleUser',
      id: user.id,
      label: user.email,
      currentStatus: user.estado,
    });
  }

  activatePublication(pubId: number | string): void {
    const id = Number(pubId);
    if (!Number.isFinite(id) || id <= 0 || this.busy()) return;
    this.busy.set(true);
    this.moderation
      .activatePublicationByAdmin(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.notice.set(
            `Publicación #${res.id} (“${res.titulo}”) reactivada en estado DISPONIBLE.`,
          );
          this.syncAfterMutation();
          if (this.selectedMaterial()?.id === String(id)) {
            this.selectedMaterial.set(this.moderation.findPublicationById(String(id)) ?? null);
          }
          if (this.selectedReport()?.publicationId === id) {
            this.selectedReport.update((r) =>
              r ? { ...r, publicationStatus: 'DISPONIBLE' } : null,
            );
          }
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.notice.set(
            (err.error?.message as string | undefined) || 'No se pudo reactivar la publicación.',
          );
        },
      });
  }

  suspendReportedPublication(report: PublicationReport): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.moderation
      .suspendPublicationByAdmin(report.publicationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.notice.set(
            `Publicación #${res.idPublicacion} suspendida (${res.estadoPublicacion}). Reportes atendidos: ${res.reportesAtendidos}.`,
          );
          this.selectedReport.set(null);
          this.syncAfterMutation();
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.notice.set(
            (err.error?.message as string | undefined) ||
              'No se pudo suspender la publicación reportada.',
          );
        },
      });
  }

  dismissReport(report: PublicationReport): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.moderation
      .dismissReportByAdmin(report.reportId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.notice.set(`Reporte ${report.id} desestimado correctamente.`);
          this.selectedReport.set(null);
          this.syncAfterMutation();
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.notice.set(
            (err.error?.message as string | undefined) || 'No se pudo desestimar el reporte.',
          );
        },
      });
  }

  confirmAction(): void {
    const pending = this.confirmation();
    if (!pending || this.busy()) return;

    this.busy.set(true);
    if (pending.type === 'suspendPublication') {
      this.moderation
        .suspendPublicationByAdmin(pending.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.busy.set(false);
            this.confirmation.set(null);
            this.selectedMaterial.set(null);
            this.notice.set(
              `Publicación #${res.idPublicacion} suspendida correctamente (${res.reportesAtendidos} reportes atendidos).`,
            );
            this.syncAfterMutation();
          },
          error: (err: HttpErrorResponse) => {
            this.busy.set(false);
            this.confirmation.set(null);
            this.notice.set(
              (err.error?.message as string | undefined) || 'No se pudo suspender la publicación.',
            );
          },
        });
    } else if (pending.type === 'retirePublication') {
      this.moderation
        .retirePublicationByAdmin(pending.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.busy.set(false);
            this.confirmation.set(null);
            this.selectedMaterial.set(null);
            this.notice.set(`Publicación #${res.id} retirada del catálogo público.`);
            this.syncAfterMutation();
          },
          error: (err: HttpErrorResponse) => {
            this.busy.set(false);
            this.confirmation.set(null);
            this.notice.set(
              (err.error?.message as string | undefined) || 'No se pudo retirar la publicación.',
            );
          },
        });
    } else {
      this.moderation
        .toggleUserStatusByAdmin(pending.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.busy.set(false);
            this.confirmation.set(null);
            this.selectedUser.set(null);
            this.notice.set(
              `Cuenta ${res.correoInstitucional} actualizada a estado ${res.estado}.`,
            );
            this.syncAfterMutation();
          },
          error: (err: HttpErrorResponse) => {
            this.busy.set(false);
            this.confirmation.set(null);
            this.notice.set(
              (err.error?.message as string | undefined) ||
                'No se pudo actualizar el estado del usuario.',
            );
          },
        });
    }
  }

  closeDialogs(): void {
    this.confirmation.set(null);
    this.selectedReport.set(null);
    this.selectedMaterial.set(null);
    this.selectedUser.set(null);
  }

  isProtectedAdmin(user: AdminUser): boolean {
    const currentEmail = this.auth.currentUser()?.email?.toLowerCase();
    return user.rol === 'ADMIN' || (Boolean(currentEmail) && user.email.toLowerCase() === currentEmail);
  }

  truncate(text: string | null | undefined, max = 72): string {
    if (!text) return '';
    const trimmed = text.trim();
    return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
  }

  formatDate(timestamp: number | null | undefined): string {
    if (!timestamp || timestamp < 100_000_000_000) return '—';
    return new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(timestamp);
  }

  formatIsoDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) return '—';
    return this.formatDateTime(parsed);
  }

  formatDateTime(timestamp: number | null | undefined): string {
    if (!timestamp || timestamp < 100_000_000_000) return '—';
    return new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  }

  private syncAfterMutation(): void {
    this.moderation.loadAdminOverview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.moderation.loadAdminPublications().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.moderation.loadAdminReports(true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.moderation.loadAdminUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.publicationService
      .getPublications({ page: 0, size: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
}

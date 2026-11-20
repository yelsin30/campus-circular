import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { MarketplaceMaterial, MaterialArt, MaterialCategory, MaterialCondition } from './material-catalog';
import {
  BackendPublicationStatus,
  PublicationResponseDto,
  PublicationService,
} from './publication.service';

export type ReportStatus = 'Pendiente' | 'Resuelto' | 'Descartado';
export type BackendUserStatus = 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO';
export type BackendUserRole = 'USUARIO' | 'ADMIN' | 'ADMIN_AUDITOR';

export type ModerationLogAction =
  | 'Publicación suspendida'
  | 'Publicación reactivada'
  | 'Publicación retirada'
  | 'Reporte desestimado'
  | 'Usuario suspendido'
  | 'Usuario reactivado';

export interface BackendReportDto {
  idReporte: number;
  idPublicacion: number;
  tituloPublicacion: string | null;
  descripcionPublicacion: string | null;
  categoriaPublicacion: string | null;
  estadoPublicacion: BackendPublicationStatus | string | null;
  modalidadPublicacion: string | null;
  precioSolidarioPublicacion: number | null;
  imagenUrlPublicacion: string | null;
  imagenesPublicacion: string[] | null;
  idPropietario: number | null;
  correoPropietario: string | null;
  idReportante: number | null;
  correoReportante: string | null;
  motivo: string;
  estado: 'PENDIENTE' | 'ATENDIDO' | 'DESESTIMADO' | string;
  fechaCreacion: string;
  fechaResolucion: string | null;
}

export interface SuspendPublicationResponseDto {
  idPublicacion: number;
  estadoPublicacion: BackendPublicationStatus | string;
  reportesAtendidos: number;
  fechaResolucion: string;
}

export interface AdminActivityItemDto {
  id: string;
  type: 'REPORTE' | 'PUBLICACION' | 'TRANSACCION' | string;
  action: string;
  actor: string;
  targetLabel: string;
  description: string;
  createdAt: string | null;
}

export interface AdminOverviewDto {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  inactiveUsers: number;
  totalPublications: number;
  activePublications: number;
  inNegotiationPublications: number;
  suspendedPublications: number;
  retiredPublications: number;
  transferredPublications: number;
  pendingReports: number;
  resolvedReports: number;
  totalReports: number;
  completedTransactions: number;
  activeTransactions: number;
  recentActivity: AdminActivityItemDto[];
}

export interface AdminUserDto {
  idUsuario: number;
  nombres: string | null;
  apellidos: string | null;
  correoInstitucional: string;
  rol: BackendUserRole | string;
  estado: BackendUserStatus | string;
  reputacionPromedio: number | null;
  fechaCreacion: string | null;
}

export interface AdminUser {
  id: number;
  nombres: string;
  apellidos: string;
  fullName: string;
  email: string;
  rol: BackendUserRole | string;
  roleLabel: string;
  estado: BackendUserStatus | string;
  statusLabel: string;
  reputation: number | null;
  registeredAt: number;
}

export interface PublicationReport {
  id: string;
  reportId: number;
  materialId: string;
  publicationId: number;
  publicationTitle: string;
  publicationDescription: string;
  publicationCategory: MaterialCategory;
  publicationStatus: BackendPublicationStatus | string;
  publicationModality: string;
  publicationPrice: number | null;
  publicationImageUrl: string | null;
  publicationImages: string[];
  ownerEmail: string;
  reporter: string;
  reason: string;
  reportedAt: number;
  resolvedAt: number | null;
  status: ReportStatus;
  backendStatus: string;
}

export interface ModerationLog {
  id: string;
  admin: string;
  action: ModerationLogAction;
  targetId: string;
  targetLabel: string;
  description: string;
  createdAt: number;
}

const EMPTY_OVERVIEW: AdminOverviewDto = {
  totalUsers: 0,
  activeUsers: 0,
  suspendedUsers: 0,
  inactiveUsers: 0,
  totalPublications: 0,
  activePublications: 0,
  inNegotiationPublications: 0,
  suspendedPublications: 0,
  retiredPublications: 0,
  transferredPublications: 0,
  pendingReports: 0,
  resolvedReports: 0,
  totalReports: 0,
  completedTransactions: 0,
  activeTransactions: 0,
  recentActivity: [],
};

@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly publicationService = inject(PublicationService);
  private readonly baseUrl = environment.apiUrl;

  private readonly overviewSignal = signal<AdminOverviewDto>(EMPTY_OVERVIEW);
  private readonly adminPublicationsSignal = signal<MarketplaceMaterial[]>([]);
  private readonly reportsSignal = signal<PublicationReport[]>([]);
  private readonly usersSignal = signal<AdminUser[]>([]);
  private readonly logsSignal = signal<ModerationLog[]>([]);

  readonly overview = this.overviewSignal.asReadonly();
  readonly adminPublications = this.adminPublicationsSignal.asReadonly();
  readonly reports = this.reportsSignal.asReadonly();
  readonly users = this.usersSignal.asReadonly();
  readonly logs = this.logsSignal.asReadonly();

  readonly pendingReports = computed(
    () => this.reportsSignal().filter((report) => report.status === 'Pendiente').length,
  );
  readonly resolvedReports = computed(
    () =>
      this.reportsSignal().filter(
        (report) => report.status === 'Resuelto' || report.status === 'Descartado',
      ).length,
  );

  private sequence = 0;

  submitReportToBackend(
    publicationId: number | string,
    motivo: string,
  ): Observable<BackendReportDto> {
    if (!this.http) {
      throw new Error('HttpClient no disponible');
    }
    const numericId = Number(publicationId);
    return this.http
      .post<BackendReportDto>(`${this.baseUrl}/publications/${numericId}/reports`, {
        motivo: motivo.trim(),
      })
      .pipe(
        tap((dto) => {
          const mapped = this.mapDtoToReport(dto);
          this.reportsSignal.update((reports) => [
            mapped,
            ...reports.filter((item) => item.id !== mapped.id),
          ]);
        }),
      );
  }

  loadAdminOverview(): Observable<AdminOverviewDto> {
    if (!this.http) {
      return of(this.overviewSignal());
    }
    return this.http.get<AdminOverviewDto>(`${this.baseUrl}/admin/overview`).pipe(
      tap((data) => {
        if (data) {
          this.overviewSignal.set(data);
        }
      }),
      catchError(() => of(this.overviewSignal())),
    );
  }

  loadAdminPublications(): Observable<MarketplaceMaterial[]> {
    if (!this.http) {
      return of(this.adminPublicationsSignal());
    }
    return this.http.get<PublicationResponseDto[]>(`${this.baseUrl}/admin/publications`).pipe(
      map((list) => (list ?? []).map((dto) => this.mapAdminPublication(dto))),
      tap((items) => this.adminPublicationsSignal.set(items)),
      catchError(() => of(this.adminPublicationsSignal())),
    );
  }

  activatePublicationByAdmin(publicationId: number | string): Observable<PublicationResponseDto> {
    if (!this.http) {
      throw new Error('HttpClient no disponible');
    }
    const numericId = Number(publicationId);
    return this.http
      .post<PublicationResponseDto>(`${this.baseUrl}/admin/publications/${numericId}/activate`, {})
      .pipe(
        tap((dto) => {
          const mapped = this.mapAdminPublication(dto);
          this.upsertAdminPublication(mapped);
          this.reportsSignal.update((reports) =>
            reports.map((report) =>
              report.publicationId === numericId
                ? { ...report, publicationStatus: 'DISPONIBLE' }
                : report,
            ),
          );
          this.log(
            'Publicación reactivada',
            String(numericId),
            dto.titulo,
            `Publicación #${numericId} reactivada y visible nuevamente en el catálogo público.`,
          );
        }),
      );
  }

  suspendPublicationByAdmin(
    publicationId: number | string,
  ): Observable<SuspendPublicationResponseDto> {
    if (!this.http) {
      throw new Error('HttpClient no disponible');
    }
    const numericId = Number(publicationId);
    return this.http
      .post<SuspendPublicationResponseDto>(
        `${this.baseUrl}/admin/publications/${numericId}/suspend`,
        {},
      )
      .pipe(
        tap((res) => {
          const idStr = String(numericId);
          this.adminPublicationsSignal.update((pubs) =>
            pubs.map((pub) =>
              pub.id === idStr
                ? { ...pub, backendStatus: 'SUSPENDIDO', publicationStatus: 'Oculta' }
                : pub,
            ),
          );
          const resolvedTs = res.fechaResolucion ? Date.parse(res.fechaResolucion) : Date.now();
          this.reportsSignal.update((reports) =>
            reports.map((report) =>
              report.publicationId === numericId
                ? {
                    ...report,
                    publicationStatus: 'SUSPENDIDO',
                    status: report.status === 'Pendiente' ? 'Resuelto' : report.status,
                    backendStatus: report.status === 'Pendiente' ? 'ATENDIDO' : report.backendStatus,
                    resolvedAt: report.resolvedAt ?? (Number.isNaN(resolvedTs) ? Date.now() : resolvedTs),
                  }
                : report,
            ),
          );
          this.log(
            'Publicación suspendida',
            idStr,
            `Publicación #${numericId}`,
            `Publicación #${numericId} suspendida. Reportes atendidos: ${res.reportesAtendidos}.`,
          );
        }),
      );
  }

  retirePublicationByAdmin(publicationId: number | string): Observable<PublicationResponseDto> {
    if (!this.http) {
      throw new Error('HttpClient no disponible');
    }
    const numericId = Number(publicationId);
    return this.http
      .post<PublicationResponseDto>(`${this.baseUrl}/admin/publications/${numericId}/retire`, {})
      .pipe(
        tap((dto) => {
          const mapped = this.mapAdminPublication(dto);
          this.upsertAdminPublication(mapped);
          this.reportsSignal.update((reports) =>
            reports.map((report) =>
              report.publicationId === numericId
                ? {
                    ...report,
                    publicationStatus: 'RETIRADA',
                    status: report.status === 'Pendiente' ? 'Resuelto' : report.status,
                    resolvedAt: report.resolvedAt ?? Date.now(),
                  }
                : report,
            ),
          );
          this.log(
            'Publicación retirada',
            String(numericId),
            dto.titulo,
            `Publicación #${numericId} retirada del catálogo conservando su registro histórico.`,
          );
        }),
      );
  }

  loadAdminReports(includeResolved = true): Observable<PublicationReport[]> {
    if (!this.http) {
      return of(this.reportsSignal());
    }
    const params = new HttpParams().set('includeResolved', String(includeResolved));
    return this.http
      .get<BackendReportDto[]>(`${this.baseUrl}/admin/reports`, { params })
      .pipe(
        map((list) => (list ?? []).map((dto) => this.mapDtoToReport(dto))),
        tap((items) => this.reportsSignal.set(items)),
        catchError(() => of(this.reportsSignal())),
      );
  }

  dismissReportByAdmin(reportId: number): Observable<BackendReportDto> {
    if (!this.http) {
      throw new Error('HttpClient no disponible');
    }
    return this.http
      .post<BackendReportDto>(`${this.baseUrl}/admin/reports/${reportId}/dismiss`, {})
      .pipe(
        tap((dto) => {
          const mapped = this.mapDtoToReport(dto);
          this.reportsSignal.update((reports) =>
            reports.map((r) => (r.reportId === reportId ? mapped : r)),
          );
          this.log(
            'Reporte desestimado',
            `R-${reportId}`,
            mapped.publicationTitle,
            `El reporte R-${reportId} fue desestimado por administración.`,
          );
        }),
      );
  }

  loadAdminUsers(): Observable<AdminUser[]> {
    if (!this.http) {
      return of(this.usersSignal());
    }
    return this.http.get<AdminUserDto[]>(`${this.baseUrl}/admin/users`).pipe(
      map((list) => (list ?? []).map((dto) => this.mapAdminUser(dto))),
      tap((items) => this.usersSignal.set(items)),
      catchError(() => of(this.usersSignal())),
    );
  }

  toggleUserStatusByAdmin(userId: number): Observable<AdminUserDto> {
    if (!this.http) {
      throw new Error('HttpClient no disponible');
    }
    return this.http
      .post<AdminUserDto>(`${this.baseUrl}/admin/users/${userId}/toggle-status`, {})
      .pipe(
        tap((dto) => {
          const mapped = this.mapAdminUser(dto);
          this.usersSignal.update((users) =>
            users.map((u) => (u.id === mapped.id ? mapped : u)),
          );
          const action: ModerationLogAction =
            dto.estado === 'SUSPENDIDO' ? 'Usuario suspendido' : 'Usuario reactivado';
          this.log(
            action,
            String(userId),
            mapped.email,
            `Cuenta ${mapped.email} actualizada a estado ${dto.estado}.`,
          );
        }),
      );
  }

  findPublicationById(id: string): MarketplaceMaterial | undefined {
    return this.adminPublicationsSignal().find((item) => item.id === id);
  }

  findReport(id: string): PublicationReport | undefined {
    return this.reportsSignal().find((report) => report.id === id);
  }

  userById(id: number): AdminUser | undefined {
    return this.usersSignal().find((user) => user.id === id);
  }

  private upsertAdminPublication(mapped: MarketplaceMaterial): void {
    this.adminPublicationsSignal.update((pubs) => {
      const exists = pubs.some((item) => item.id === mapped.id);
      return exists
        ? pubs.map((item) => (item.id === mapped.id ? mapped : item))
        : [mapped, ...pubs];
    });
  }

  private mapAdminPublication(dto: PublicationResponseDto): MarketplaceMaterial {
    const category = this.publicationService.fromBackendCategory(dto.categoria, dto.categoriaId);
    const mode = this.publicationService.fromBackendModality(dto.modalidad);
    const condition: MaterialCondition = this.publicationService.fromBackendCondition(dto.condicion);
    const createdTimestamp = dto.fechaCreacion ? Date.parse(dto.fechaCreacion) : Date.now();
    const ownerEmail = dto.propietarioCorreo?.trim();
    const ownerLabel = ownerEmail || `Usuario #${dto.usuarioId}`;
    const initials = ownerEmail ? ownerEmail.slice(0, 2).toUpperCase() : `U${dto.usuarioId}`;

    const resolvedImages: string[] = [];
    if (Array.isArray(dto.imagenes)) {
      for (const img of dto.imagenes) {
        if (img && img.trim()) {
          resolvedImages.push(img.trim());
        }
      }
    }
    if (resolvedImages.length === 0 && dto.imagenUrl && dto.imagenUrl.trim()) {
      resolvedImages.push(dto.imagenUrl.trim());
    }

    return {
      id: String(dto.id),
      title: dto.titulo,
      category,
      career: dto.carrera || 'Ingeniería de Sistemas',
      condition,
      mode,
      owner: ownerLabel,
      initials,
      ...(dto.precioSolidario !== null && dto.precioSolidario !== undefined
        ? { price: Number(dto.precioSolidario) }
        : {}),
      art: this.artForCategory(category),
      background: this.backgroundForCategory(category),
      publishedAt: Number.isNaN(createdTimestamp) ? Date.now() : createdTimestamp,
      publishedLabel: this.formatDate(createdTimestamp),
      campus: 'Campus UPN',
      publisher: ownerLabel,
      description: dto.descripcion,
      rating: 5,
      ratingCount: 1,
      offeredExamples: [],
      ...(resolvedImages.length > 0 ? { images: resolvedImages } : {}),
      publicationStatus:
        dto.estado === 'DISPONIBLE'
          ? 'Activa'
          : dto.estado === 'RETIRADA'
            ? 'Eliminada'
            : 'Oculta',
      ownerId: dto.usuarioId,
      backendModality: dto.modalidad,
      backendStatus: dto.estado,
    };
  }

  private mapDtoToReport(dto: BackendReportDto): PublicationReport {
    const createdTimestamp = dto.fechaCreacion ? Date.parse(dto.fechaCreacion) : Date.now();
    const resolvedTimestamp = dto.fechaResolucion ? Date.parse(dto.fechaResolucion) : null;
    const status: ReportStatus =
      dto.estado === 'ATENDIDO'
        ? 'Resuelto'
        : dto.estado === 'DESESTIMADO'
          ? 'Descartado'
          : 'Pendiente';

    const images: string[] = [];
    if (Array.isArray(dto.imagenesPublicacion)) {
      for (const img of dto.imagenesPublicacion) {
        if (img && img.trim()) images.push(img.trim());
      }
    }
    if (images.length === 0 && dto.imagenUrlPublicacion && dto.imagenUrlPublicacion.trim()) {
      images.push(dto.imagenUrlPublicacion.trim());
    }

    const category = this.publicationService.fromBackendCategory(dto.categoriaPublicacion);

    return {
      id: `R-${dto.idReporte}`,
      reportId: dto.idReporte,
      materialId: String(dto.idPublicacion),
      publicationId: dto.idPublicacion,
      publicationTitle: dto.tituloPublicacion ?? `Publicación #${dto.idPublicacion}`,
      publicationDescription: dto.descripcionPublicacion ?? '',
      publicationCategory: category,
      publicationStatus: dto.estadoPublicacion ?? 'DISPONIBLE',
      publicationModality: dto.modalidadPublicacion
        ? this.publicationService.fromBackendModality(dto.modalidadPublicacion)
        : 'Trueque',
      publicationPrice:
        dto.precioSolidarioPublicacion !== null && dto.precioSolidarioPublicacion !== undefined
          ? Number(dto.precioSolidarioPublicacion)
          : null,
      publicationImageUrl: images[0] ?? null,
      publicationImages: images,
      ownerEmail: dto.correoPropietario ?? 'Usuario UPN',
      reporter: dto.correoReportante ?? `Usuario #${dto.idReportante ?? ''}`,
      reason: dto.motivo,
      reportedAt: Number.isNaN(createdTimestamp) ? Date.now() : createdTimestamp,
      resolvedAt:
        resolvedTimestamp !== null && !Number.isNaN(resolvedTimestamp) ? resolvedTimestamp : null,
      status,
      backendStatus: dto.estado,
    };
  }

  private mapAdminUser(dto: AdminUserDto): AdminUser {
    const nombres = dto.nombres?.trim() ?? '';
    const apellidos = dto.apellidos?.trim() ?? '';
    const combinedName = `${nombres} ${apellidos}`.trim();
    const fallbackName = dto.correoInstitucional.split('@')[0] || `Usuario #${dto.idUsuario}`;
    const createdTimestamp = dto.fechaCreacion ? Date.parse(dto.fechaCreacion) : Date.now();

    const roleLabel =
      dto.rol === 'ADMIN'
        ? 'Administrador'
        : dto.rol === 'ADMIN_AUDITOR'
          ? 'Auditor'
          : 'Estudiante';
    const statusLabel =
      dto.estado === 'ACTIVO'
        ? 'Activo'
        : dto.estado === 'SUSPENDIDO'
          ? 'Suspendido'
          : 'Inactivo';

    return {
      id: dto.idUsuario,
      nombres,
      apellidos,
      fullName: combinedName || fallbackName,
      email: dto.correoInstitucional,
      rol: dto.rol,
      roleLabel,
      estado: dto.estado,
      statusLabel,
      reputation:
        dto.reputacionPromedio !== null && dto.reputacionPromedio !== undefined
          ? Number(dto.reputacionPromedio)
          : null,
      registeredAt: Number.isNaN(createdTimestamp) ? Date.now() : createdTimestamp,
    };
  }

  private log(
    action: ModerationLogAction,
    targetId: string,
    targetLabel: string,
    description: string,
  ): void {
    this.sequence += 1;
    const entry: ModerationLog = {
      id: `LOG-${this.sequence}`,
      admin: 'Administrador UPN',
      action,
      targetId,
      targetLabel,
      description,
      createdAt: Date.now(),
    };
    this.logsSignal.update((logs) => [entry, ...logs]);
  }

  private formatDate(timestamp: number): string {
    if (Number.isNaN(timestamp)) return 'Reciente';
    return new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(timestamp);
  }

  private artForCategory(category: MaterialCategory): MaterialArt {
    switch (category) {
      case 'Libros':
        return 'calculus';
      case 'Apuntes':
        return 'notes';
      case 'Equipos':
        return 'calculator';
      case 'Materiales':
        return 'backpack';
      case 'Otros':
        return 'arduino';
    }
  }

  private backgroundForCategory(category: MaterialCategory): string {
    switch (category) {
      case 'Libros':
        return '#f0f2f4';
      case 'Apuntes':
        return '#f4f2ec';
      case 'Equipos':
        return '#eef1f4';
      case 'Materiales':
        return '#edf1e7';
      case 'Otros':
        return '#f2f0e8';
    }
  }
}

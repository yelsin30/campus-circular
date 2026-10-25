import { computed, inject, Injectable, signal } from '@angular/core';
import { MarketplaceMaterial, PublicationStatus } from './material-catalog';
import { MaterialCatalogService } from './material-catalog.service';

export type ReportStatus = 'Pendiente' | 'En revisión' | 'Resuelto' | 'Descartado';
export type UserRole = 'Estudiante' | 'Administrador';
export type UserStatus = 'Activo' | 'Suspendido';
export type ReportReason = 'Contenido inapropiado' | 'Información falsa' | 'Artículo no disponible' | 'Otro';
export type ModerationLogAction = 'Publicación ocultada' | 'Publicación restaurada' | 'Publicación eliminada' | 'Reporte revisado' | 'Reporte resuelto' | 'Reporte descartado' | 'Usuario suspendido' | 'Usuario reactivado';

export interface PublicationReport {
  id: string;
  materialId: string;
  reporter: string;
  reason: string;
  details: string;
  reportedAt: number;
  status: ReportStatus;
  demo?: boolean;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  registeredAt: number;
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

export type CreateReportResult =
  | { created: true; report: PublicationReport }
  | { created: false; report: PublicationReport };

const ADMIN_NAME = 'Administrador UPN';

@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly catalog = inject(MaterialCatalogService);
  private readonly reportsSignal = signal<PublicationReport[]>(this.createDemoReports());
  private readonly usersSignal = signal<DemoUser[]>(this.createDemoUsers());
  private readonly logsSignal = signal<ModerationLog[]>([]);
  readonly reports = this.reportsSignal.asReadonly();
  readonly users = this.usersSignal.asReadonly();
  readonly logs = this.logsSignal.asReadonly();
  readonly activePublications = computed(() => this.catalog.materials().filter((material) => this.getPublicationStatus(material) === 'Activa').length);
  readonly moderatedPublications = computed(() => new Set(this.logsSignal()
    .filter((log) => ['Publicación ocultada', 'Publicación restaurada', 'Publicación eliminada'].includes(log.action))
    .map((log) => log.targetId)).size);
  readonly registeredUsers = computed(() => this.usersSignal().length);
  readonly pendingReports = computed(() => this.reportsSignal().filter((report) => report.status === 'Pendiente' || report.status === 'En revisión').length);
  readonly administratorName = ADMIN_NAME;
  private sequence = 0;

  getPublicationStatus(material: MarketplaceMaterial): PublicationStatus {
    return material.publicationStatus ?? 'Activa';
  }

  createReport(materialId: string, reporter: string, reason: string, details = ''): CreateReportResult | null {
    const material = this.catalog.findPublicById(materialId);
    if (!material) return null;

    const duplicate = this.reportsSignal().find((report) =>
      report.materialId === materialId
      && report.reporter === reporter
      && report.reason === reason,
    );
    if (duplicate) return { created: false, report: duplicate };

    const report: PublicationReport = {
      id: this.createId('report'),
      materialId,
      reporter,
      reason,
      details: details.trim(),
      reportedAt: Date.now(),
      status: 'Pendiente',
    };
    this.reportsSignal.update((reports) => [report, ...reports]);
    return { created: true, report };
  }

  reviewReport(reportId: string): boolean {
    const report = this.findReport(reportId);
    if (!report || report.status !== 'Pendiente') return false;
    this.reportsSignal.update((reports) => reports.map((item) => item.id === reportId ? { ...item, status: 'En revisión' } : item));
    this.log('Reporte revisado', reportId, this.materialLabel(report.materialId), `Se inició la revisión del reporte ${report.id}.`);
    return true;
  }

  resolveReport(reportId: string, description = 'Reporte atendido por administración.'): boolean {
    const report = this.findReport(reportId);
    if (!report || (report.status !== 'Pendiente' && report.status !== 'En revisión')) return false;
    this.reportsSignal.update((reports) => reports.map((item) => item.id === reportId ? { ...item, status: 'Resuelto' } : item));
    this.log('Reporte resuelto', reportId, this.materialLabel(report.materialId), description);
    return true;
  }

  discardReport(reportId: string): boolean {
    const report = this.findReport(reportId);
    if (!report || (report.status !== 'Pendiente' && report.status !== 'En revisión')) return false;
    this.reportsSignal.update((reports) => reports.map((item) => item.id === reportId ? { ...item, status: 'Descartado' } : item));
    this.log('Reporte descartado', reportId, this.materialLabel(report.materialId), `El reporte ${report.id} fue descartado.`);
    return true;
  }

  moderatePublication(materialId: string, status: PublicationStatus): boolean {
    const material = this.catalog.findById(materialId);
    if (!material || this.getPublicationStatus(material) === status) return false;
    if (!this.catalog.setPublicationStatus(materialId, status)) return false;
    const action: ModerationLogAction = status === 'Activa'
      ? 'Publicación restaurada'
      : status === 'Oculta' ? 'Publicación ocultada' : 'Publicación eliminada';
    this.log(action, materialId, material.title, `${material.title}: estado cambiado a ${status}.`);
    return true;
  }

  suspendUser(userId: string): boolean {
    const user = this.usersSignal().find((item) => item.id === userId);
    if (!user || user.role === 'Administrador' || user.status === 'Suspendido') return false;
    this.usersSignal.update((users) => users.map((item) => item.id === userId ? { ...item, status: 'Suspendido' } : item));
    this.log('Usuario suspendido', userId, user.name, `${user.name} fue suspendido en el modo demostración.`);
    return true;
  }

  reactivateUser(userId: string): boolean {
    const user = this.usersSignal().find((item) => item.id === userId);
    if (!user || user.status !== 'Suspendido') return false;
    this.usersSignal.update((users) => users.map((item) => item.id === userId ? { ...item, status: 'Activo' } : item));
    this.log('Usuario reactivado', userId, user.name, `${user.name} fue reactivado en el modo demostración.`);
    return true;
  }

  findReport(id: string): PublicationReport | undefined {
    return this.reportsSignal().find((report) => report.id === id);
  }

  isUserSuspended(name: string): boolean {
    return this.usersSignal().some((user) => user.name === name && user.status === 'Suspendido');
  }

  userByName(name: string): DemoUser | undefined {
    return this.usersSignal().find((user) => user.name === name);
  }

  userById(id: string): DemoUser | undefined {
    return this.usersSignal().find((user) => user.id === id);
  }

  materialForReport(report: PublicationReport): MarketplaceMaterial | undefined {
    return this.catalog.findById(report.materialId);
  }

  private materialLabel(materialId: string): string {
    return this.catalog.findById(materialId)?.title ?? materialId;
  }

  private log(action: ModerationLogAction, targetId: string, targetLabel: string, description: string): void {
    const entry: ModerationLog = {
      id: this.createId('log'),
      admin: ADMIN_NAME,
      action,
      targetId,
      targetLabel,
      description,
      createdAt: Date.now(),
    };
    this.logsSignal.update((logs) => [entry, ...logs]);
  }

  private createId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.sequence.toString(36)}`;
  }

  private createDemoReports(): PublicationReport[] {
    const day = (daysAgo: number) => Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    return [
      { id: 'R-005', materialId: 'kit-arduino', reporter: 'Daniel P.', reason: 'Material restringido', details: '', reportedAt: day(5), status: 'Resuelto', demo: true },
      { id: 'R-004', materialId: 'apuntes-java', reporter: 'María P.', reason: 'Fotos inadecuadas', details: '', reportedAt: day(4), status: 'Resuelto', demo: true },
      { id: 'R-003', materialId: 'libro-algoritmos', reporter: 'Miguel S.', reason: 'Venta no permitida', details: 'Revisar la modalidad de la publicación.', reportedAt: day(3), status: 'Pendiente', demo: true },
      { id: 'R-002', materialId: 'calculadora-cientifica', reporter: 'Lucía R.', reason: 'Información falsa', details: '', reportedAt: day(2), status: 'Pendiente', demo: true },
      { id: 'R-001', materialId: 'calculo-diferencial', reporter: 'Carlos M.', reason: 'Contenido inapropiado', details: '', reportedAt: day(1), status: 'Pendiente', demo: true },
    ];
  }

  private createDemoUsers(): DemoUser[] {
    const day = (daysAgo: number) => Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    const students: DemoUser[] = [
      ['user-ana', 'Ana Torres', 'ana.torres@upn.pe', 90],
      ['user-jorge', 'Jorge Ruiz', 'jorge.ruiz@upn.pe', 86],
      ['user-camila', 'Camila Rojas', 'camila.rojas@upn.pe', 72],
      ['user-diana', 'Diana Castro', 'diana.castro@upn.pe', 64],
      ['user-diego', 'Diego Ramos', 'diego.ramos@upn.pe', 58],
      ['user-luis', 'Luis García', 'luis.garcia@upn.pe', 52],
      ['user-daniel', 'Daniel Peña', 'daniel.pena@upn.pe', 45],
      ['user-maria', 'María Pérez', 'maria.perez@upn.pe', 30],
    ].map(([id, name, email, daysAgo]) => ({ id: String(id), name: String(name), email: String(email), role: 'Estudiante' as const, status: 'Activo' as const, registeredAt: day(Number(daysAgo)) }));
    return [
      { id: 'admin-upn', name: ADMIN_NAME, email: 'admin@upn.pe', role: 'Administrador', status: 'Activo', registeredAt: day(365) },
      ...students,
    ];
  }
}

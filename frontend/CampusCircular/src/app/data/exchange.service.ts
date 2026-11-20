import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ExchangeMode, MaterialCategory, MaterialCondition } from './material-catalog';

export type ExchangeStatus =
  | 'Pendiente'
  | 'En negociación'
  | 'Aceptado'
  | 'Rechazado'
  | 'Cancelado'
  | 'Completado';
export type ExchangeTab = 'received' | 'sent' | 'completed' | 'rejected';
export type ExchangeRole = 'requester' | 'owner';
export type BackendTransactionType = 'TRUEQUE' | 'DONACION' | 'VENTA_SOLIDARIA';
export type BackendTransactionStatus =
  | 'PENDIENTE'
  | 'EN_NEGOCIACION'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'CANCELADA'
  | 'COMPLETADA';

export interface CreateTransactionRequestDto {
  publicationId?: number;
  type?: BackendTransactionType;
  offeredPublicationId?: number | null;
  idPublicacion: number;
  idPublicacionOfrecida?: number | null;
  mensajeInicial?: string | null;
}

export interface TransactionResponseDto {
  transactionId?: number;
  state?: string;
  ownerNotified?: boolean;
  idTransaccion?: number;
  idPublicacion?: number;
  idPublicacionOfrecida?: number | null;
  idSolicitante?: number;
  idPropietario?: number;
  tipo?: BackendTransactionType;
  estado?: BackendTransactionStatus | string;
  fechaCreacion?: string;
  tituloPublicacion?: string | null;
  categoriaPublicacion?: string | null;
  condicionPublicacion?: string | null;
  precioSolidario?: number | null;
  tituloPublicacionOfrecida?: string | null;
  correoSolicitante?: string | null;
  correoPropietario?: string | null;
  otpExpiraEn?: string | null;
  fechaCierre?: string | null;
  yaCalificada?: boolean;
  motivoRechazo?: string | null;
}

export interface TransactionMessage {
  idMensaje: number;
  idTransaccion: number;
  idEmisor: number;
  correoEmisor: string | null;
  contenido: string;
  fechaEnvio: string;
}

export interface DeliveryCodeResponseDto {
  code: string;
  expiresAt: string;
}

export interface RatingResponseDto {
  idCalificacion: number;
  idTransaccion: number;
  idEmisor: number;
  idReceptor: number;
  score: number;
  comment: string | null;
  receptorReputacionPromedio: number;
  fechaCreacion: string;
}

export interface ExchangeRating {
  reviewer: string;
  reviewee: string;
  stars: number;
  comment: string;
  submittedAt: number;
}

export interface ExchangeRequest {
  id: string;
  transactionId?: number;
  materialId: string;
  materialTitle?: string;
  materialCategory?: MaterialCategory;
  materialCondition?: MaterialCondition;
  requesterId?: number;
  ownerId?: number;
  requester: string;
  owner: string;
  mode: ExchangeMode;
  status: ExchangeStatus;
  requestedAt: number;
  completedAt?: number;
  dateLabel: string;
  message?: string;
  offeredMaterial?: string;
  exchangedMaterialIds?: string[];
  paidAmount?: number;
  referenceValueSoles?: number;
  otpExpiresAt?: string | null;
  alreadyRated?: boolean;
  rejectionReason?: string;
  requesterConfirmed: boolean;
  ownerConfirmed: boolean;
  ratings: ExchangeRating[];
}

@Injectable({ providedIn: 'root' })
export class ExchangeService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/transactions`;

  private readonly requestsSignal = signal<ExchangeRequest[]>([]);
  readonly requests = this.requestsSignal.asReadonly();

  get currentUser(): string {
    const user = this.auth.currentUser();
    if (user?.email) {
      return user.email;
    }
    if (user?.id !== undefined) {
      return `Usuario #${user.id}`;
    }
    return '';
  }

  get currentUserId(): number | undefined {
    return this.auth.currentUser()?.id;
  }

  loadMyTransactions(): Observable<ExchangeRequest[]> {
    return this.http.get<TransactionResponseDto[]>(this.baseUrl).pipe(
      map((list) => (list ?? []).map((dto) => this.mapDtoToExchangeRequest(dto))),
      tap((items) => this.requestsSignal.set(items)),
      catchError(() => of(this.requestsSignal())),
    );
  }

  createTransaction(
    payload: CreateTransactionRequestDto,
    meta?: { materialId: string; owner: string; mode: ExchangeMode; message?: string; offeredMaterial?: string },
  ): Observable<TransactionResponseDto> {
    return this.http.post<TransactionResponseDto>(this.baseUrl, payload).pipe(
      tap((response) => {
        const mapped = this.mapDtoToExchangeRequest(response, meta);
        this.requestsSignal.update((requests) => [
          mapped,
          ...requests.filter((r) => r.id !== mapped.id),
        ]);
      }),
    );
  }

  acceptTransaction(id: number | string): Observable<TransactionResponseDto> {
    const numericId = this.toNumericId(id);
    return this.http.post<TransactionResponseDto>(`${this.baseUrl}/${numericId}/accept`, {}).pipe(
      tap((response) => this.upsertFromDto(response)),
    );
  }

  rejectTransaction(id: number | string, reason?: string): Observable<TransactionResponseDto> {
    const numericId = this.toNumericId(id);
    const trimmed = reason?.trim();
    const body = trimmed ? { reason: trimmed } : {};
    return this.http.post<TransactionResponseDto>(`${this.baseUrl}/${numericId}/reject`, body).pipe(
      tap((response) => this.upsertFromDto(response)),
    );
  }

  getMessages(id: number | string): Observable<TransactionMessage[]> {
    const numericId = this.toNumericId(id);
    return this.http.get<TransactionMessage[]>(`${this.baseUrl}/${numericId}/messages`);
  }

  sendMessage(id: number | string, contenido: string): Observable<TransactionMessage> {
    const numericId = this.toNumericId(id);
    return this.http.post<TransactionMessage>(`${this.baseUrl}/${numericId}/messages`, {
      contenido: contenido.trim(),
    });
  }

  generateDeliveryCode(id: number | string): Observable<DeliveryCodeResponseDto> {
    const numericId = this.toNumericId(id);
    return this.http.post<DeliveryCodeResponseDto>(`${this.baseUrl}/${numericId}/delivery-code`, {}).pipe(
      tap((res) => {
        const targetId = String(numericId);
        this.requestsSignal.update((requests) =>
          requests.map((req) =>
            req.id === targetId || req.transactionId === numericId
              ? { ...req, otpExpiresAt: res.expiresAt }
              : req,
          ),
        );
      }),
    );
  }

  confirmDeliveryWithOtp(id: number | string, code: string): Observable<TransactionResponseDto> {
    const numericId = this.toNumericId(id);
    return this.http
      .post<TransactionResponseDto>(`${this.baseUrl}/${numericId}/confirm-delivery`, {
        code: code.trim().toUpperCase(),
      })
      .pipe(tap((response) => this.upsertFromDto(response)));
  }

  rateTransaction(id: number | string, score: number, comment: string): Observable<RatingResponseDto> {
    const numericId = this.toNumericId(id);
    return this.http
      .post<RatingResponseDto>(`${this.baseUrl}/${numericId}/ratings`, {
        score,
        comment: comment.trim(),
      })
      .pipe(
        tap((res) => {
          const targetId = String(numericId);
          this.requestsSignal.update((requests) =>
            requests.map((req) => {
              if (req.id !== targetId && req.transactionId !== numericId) {
                return req;
              }
              const reviewer = this.currentUser || `Usuario #${res.idEmisor}`;
              const reviewee = req.ownerId === res.idEmisor ? req.requester : req.owner;
              return {
                ...req,
                alreadyRated: true,
                ratings: [
                  ...req.ratings,
                  {
                    reviewer,
                    reviewee,
                    stars: res.score,
                    comment: res.comment ?? '',
                    submittedAt: Date.now(),
                  },
                ],
              };
            }),
          );
        }),
      );
  }

  getRequests(tab: ExchangeTab): ExchangeRequest[] {
    const requests = this.requestsSignal();
    const userId = this.currentUserId;
    const userEmail = this.auth.currentUser()?.email?.toLowerCase();

    const isOwner = (req: ExchangeRequest): boolean => {
      if (userId !== undefined && req.ownerId !== undefined) {
        return req.ownerId === userId;
      }
      if (userEmail) {
        return req.owner.toLowerCase() === userEmail;
      }
      return req.owner === this.currentUser;
    };

    const isRequester = (req: ExchangeRequest): boolean => {
      if (userId !== undefined && req.requesterId !== undefined) {
        return req.requesterId === userId;
      }
      if (userEmail) {
        return req.requester.toLowerCase() === userEmail;
      }
      return req.requester === this.currentUser;
    };

    if (tab === 'received') {
      return requests.filter(
        (request) =>
          isOwner(request) && request.status !== 'Completado' && request.status !== 'Rechazado',
      );
    }
    if (tab === 'sent') {
      return requests.filter(
        (request) =>
          isRequester(request) && request.status !== 'Completado' && request.status !== 'Rechazado',
      );
    }
    if (tab === 'rejected') {
      return requests.filter((request) => request.status === 'Rechazado');
    }
    return requests.filter((request) => request.status === 'Completado');
  }

  findRequest(requestId: string): ExchangeRequest | undefined {
    return this.requestsSignal().find(
      (request) => request.id === requestId || String(request.transactionId) === requestId,
    );
  }

  isUserOwner(request: ExchangeRequest | undefined): boolean {
    if (!request) return false;
    const userId = this.currentUserId;
    if (userId !== undefined && request.ownerId !== undefined) {
      return request.ownerId === userId;
    }
    const userEmail = this.auth.currentUser()?.email?.toLowerCase();
    if (userEmail) {
      return request.owner.toLowerCase() === userEmail;
    }
    return request.owner === this.currentUser;
  }

  toNumericId(id: number | string): number {
    if (typeof id === 'number') return id;
    const cleaned = id.replace(/^tx-/, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private upsertFromDto(dto: TransactionResponseDto): void {
    const mapped = this.mapDtoToExchangeRequest(dto);
    this.requestsSignal.update((requests) => {
      const exists = requests.some(
        (req) => req.id === mapped.id || req.transactionId === mapped.transactionId,
      );
      if (!exists) {
        return [mapped, ...requests];
      }
      return requests.map((req) =>
        req.id === mapped.id || req.transactionId === mapped.transactionId
          ? {
              ...req,
              ...mapped,
              message: mapped.message ?? req.message,
              offeredMaterial: mapped.offeredMaterial ?? req.offeredMaterial,
            }
          : req,
      );
    });
  }

  private mapDtoToExchangeRequest(
    dto: TransactionResponseDto,
    meta?: { materialId: string; owner: string; mode: ExchangeMode; message?: string; offeredMaterial?: string },
  ): ExchangeRequest {
    const txId = dto.idTransaccion ?? dto.transactionId ?? Date.now();
    const createdTimestamp = dto.fechaCreacion ? Date.parse(dto.fechaCreacion) : Date.now();
    const closedTimestamp = dto.fechaCierre ? Date.parse(dto.fechaCierre) : undefined;
    const requestedAt = Number.isNaN(createdTimestamp) ? Date.now() : createdTimestamp;
    const status = this.fromBackendStatus(dto.estado ?? dto.state);
    const mode = meta?.mode ?? this.fromBackendType(dto.tipo);
    const requesterLabel =
      dto.correoSolicitante ??
      (dto.idSolicitante !== undefined ? `Usuario #${dto.idSolicitante}` : this.currentUser);
    const ownerLabel =
      dto.correoPropietario ??
      meta?.owner ??
      (dto.idPropietario !== undefined ? `Usuario #${dto.idPropietario}` : '');
    const offeredLabel =
      dto.tituloPublicacionOfrecida ??
      meta?.offeredMaterial ??
      (dto.idPublicacionOfrecida ? `Publicación #${dto.idPublicacionOfrecida}` : undefined);

    return {
      id: String(txId),
      transactionId: txId,
      materialId: meta?.materialId ?? String(dto.idPublicacion ?? ''),
      ...(dto.tituloPublicacion ? { materialTitle: dto.tituloPublicacion } : {}),
      ...(dto.categoriaPublicacion
        ? { materialCategory: this.fromBackendCategory(dto.categoriaPublicacion) }
        : {}),
      ...(dto.condicionPublicacion
        ? { materialCondition: this.fromBackendCondition(dto.condicionPublicacion) }
        : {}),
      requesterId: dto.idSolicitante,
      ownerId: dto.idPropietario,
      requester: requesterLabel,
      owner: ownerLabel,
      mode,
      status,
      requestedAt,
      ...(closedTimestamp && !Number.isNaN(closedTimestamp)
        ? { completedAt: closedTimestamp }
        : status === 'Completado'
          ? { completedAt: Date.now() }
          : {}),
      dateLabel: this.formatDate(requestedAt),
      ...(meta?.message?.trim() ? { message: meta.message.trim() } : {}),
      ...(offeredLabel ? { offeredMaterial: offeredLabel } : {}),
      ...(dto.idPublicacionOfrecida
        ? { exchangedMaterialIds: [String(dto.idPublicacionOfrecida)] }
        : {}),
      ...(dto.precioSolidario !== null && dto.precioSolidario !== undefined
        ? { paidAmount: Number(dto.precioSolidario) }
        : {}),
      otpExpiresAt: dto.otpExpiraEn ?? null,
      alreadyRated: Boolean(dto.yaCalificada),
      ...(dto.motivoRechazo?.trim() ? { rejectionReason: dto.motivoRechazo.trim() } : {}),
      requesterConfirmed: status === 'Completado',
      ownerConfirmed: status === 'Completado',
      ratings: [],
    };
  }

  private fromBackendStatus(raw: string | undefined): ExchangeStatus {
    switch ((raw ?? '').trim().toUpperCase()) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'EN_NEGOCIACION':
        return 'En negociación';
      case 'ACEPTADA':
        return 'Aceptado';
      case 'RECHAZADA':
        return 'Rechazado';
      case 'CANCELADA':
        return 'Cancelado';
      case 'COMPLETADA':
        return 'Completado';
      default:
        return 'Pendiente';
    }
  }

  private fromBackendType(type: BackendTransactionType | string | undefined): ExchangeMode {
    switch ((type ?? '').trim().toUpperCase()) {
      case 'DONACION':
        return 'Donación';
      case 'VENTA_SOLIDARIA':
        return 'Precio solidario';
      case 'TRUEQUE':
      default:
        return 'Trueque';
    }
  }

  private fromBackendCategory(raw: string): MaterialCategory {
    const normalized = raw.toLowerCase();
    if (normalized.includes('libro')) return 'Libros';
    if (normalized.includes('apunte')) return 'Apuntes';
    if (
      normalized.includes('equipo') ||
      normalized.includes('microcontrolador') ||
      normalized.includes('red') ||
      normalized.includes('instrument') ||
      normalized.includes('perif')
    ) {
      return 'Equipos';
    }
    if (normalized.includes('material') || normalized.includes('textil')) return 'Materiales';
    return 'Otros';
  }

  private fromBackendCondition(raw: string): MaterialCondition {
    switch (raw.trim().toUpperCase()) {
      case 'NUEVO':
        return 'Nuevo';
      case 'SEMINUEVO':
        return 'Seminuevo';
      case 'BUENO':
        return 'En buen estado';
      case 'ACEPTABLE':
        return 'Aceptable';
      case 'SCRAP':
        return 'Repuestos / Scrap';
      default:
        return 'En buen estado';
    }
  }

  private formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(timestamp);
  }
}

import { inject, Injectable, signal } from '@angular/core';
import { ExchangeMode } from './material-catalog';
import { MaterialCatalogService } from './material-catalog.service';
import { ModerationService } from './moderation.service';

export type ExchangeStatus = 'Pendiente' | 'En negociación' | 'Aceptado' | 'Rechazado' | 'Cancelado' | 'Completado';
export type ExchangeTab = 'received' | 'sent' | 'completed';
export type ExchangeRole = 'requester' | 'owner';

export interface ExchangeRating {
  reviewer: string;
  reviewee: string;
  stars: number;
  comment: string;
  submittedAt: number;
}

export interface ExchangeRequest {
  id: string;
  materialId: string;
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
  requesterConfirmed: boolean;
  ownerConfirmed: boolean;
  ratings: ExchangeRating[];
  demo?: boolean;
}

export type CreateExchangeResult =
  | { success: true; request: ExchangeRequest }
  | { success: false; reason: 'own-material' | 'duplicate' | 'not-found' | 'suspended' | 'owner-suspended' };

const CURRENT_USER = 'María Pérez';
const ACTIVE_STATUSES: ExchangeStatus[] = ['Pendiente', 'En negociación', 'Aceptado'];

@Injectable({ providedIn: 'root' })
export class ExchangeService {
  private readonly catalog = inject(MaterialCatalogService);
  private readonly moderation = inject(ModerationService);
  private readonly requestsSignal = signal<ExchangeRequest[]>(this.createDemoRequests());
  readonly requests = this.requestsSignal.asReadonly();
  readonly currentUser = CURRENT_USER;
  readonly demoOtp = '482931';
  private sequence = 0;

  getRequests(tab: ExchangeTab): ExchangeRequest[] {
    const requests = this.requestsSignal();
    if (tab === 'received') {
      return requests.filter((request) => request.owner === CURRENT_USER && request.status !== 'Completado');
    }
    if (tab === 'sent') {
      return requests.filter((request) => request.requester === CURRENT_USER && request.status !== 'Completado');
    }
    return requests.filter((request) => request.status === 'Completado');
  }

  createRequest(materialId: string, message = '', offeredMaterial = ''): CreateExchangeResult {
    const material = this.catalog.findPublicById(materialId);
    if (!material) return { success: false, reason: 'not-found' };
    if (material.owner === CURRENT_USER) return { success: false, reason: 'own-material' };
    if (this.moderation.isUserSuspended(CURRENT_USER)) return { success: false, reason: 'suspended' };
    if (this.moderation.isUserSuspended(material.owner)) return { success: false, reason: 'owner-suspended' };

    const duplicate = this.requestsSignal().some((request) =>
      request.materialId === materialId
      && request.requester === CURRENT_USER
      && ACTIVE_STATUSES.includes(request.status),
    );
    if (duplicate) return { success: false, reason: 'duplicate' };

    const request: ExchangeRequest = {
      id: this.createId(),
      materialId,
      requester: CURRENT_USER,
      owner: material.owner,
      mode: material.mode,
      status: 'Pendiente',
      requestedAt: Date.now(),
      dateLabel: this.formatDate(Date.now()),
      ...(message.trim() ? { message: message.trim() } : {}),
      ...(offeredMaterial.trim() ? { offeredMaterial: offeredMaterial.trim() } : {}),
      requesterConfirmed: false,
      ownerConfirmed: false,
      ratings: [],
    };
    this.requestsSignal.update((requests) => [request, ...requests]);
    return { success: true, request };
  }

  accept(requestId: string, actor: string): boolean {
    const request = this.findRequest(requestId);
    if (!request || request.owner !== actor || request.status !== 'Pendiente') return false;
    return this.update(requestId, (item) => ({ ...item, status: 'Aceptado' }));
  }

  reject(requestId: string, actor: string): boolean {
    const request = this.findRequest(requestId);
    if (!request || request.owner !== actor || request.status !== 'Pendiente') return false;
    return this.update(requestId, (item) => ({ ...item, status: 'Rechazado' }));
  }

  setNegotiating(requestId: string, actor: string): boolean {
    const request = this.findRequest(requestId);
    if (!request || request.owner !== actor || request.status !== 'Pendiente') return false;
    return this.update(requestId, (item) => ({ ...item, status: 'En negociación' }));
  }

  acceptNegotiation(requestId: string, actor: string): boolean {
    const request = this.findRequest(requestId);
    if (!request || request.owner !== actor || request.status !== 'En negociación') return false;
    return this.update(requestId, (item) => ({ ...item, status: 'Aceptado' }));
  }

  rejectNegotiation(requestId: string, actor: string): boolean {
    const request = this.findRequest(requestId);
    if (!request || request.owner !== actor || request.status !== 'En negociación') return false;
    return this.update(requestId, (item) => ({ ...item, status: 'Rechazado' }));
  }

  cancel(requestId: string, actor: string): boolean {
    const request = this.findRequest(requestId);
    if (!request || request.requester !== actor || !['Pendiente', 'En negociación', 'Aceptado'].includes(request.status)) return false;
    return this.update(requestId, (item) => ({ ...item, status: 'Cancelado' }));
  }

  confirmDelivery(requestId: string, actor: string, role: ExchangeRole, code: string): { success: boolean; message: string } {
    const request = this.findRequest(requestId);
    if (!request || request.status !== 'Aceptado') return { success: false, message: 'Solo se pueden confirmar entregas aceptadas.' };
    if (code !== this.demoOtp) return { success: false, message: 'El código de prueba no coincide.' };
    if ((role === 'owner' && request.owner !== actor) || (role === 'requester' && request.requester !== actor)) {
      return { success: false, message: 'Este participante no corresponde a la solicitud.' };
    }
    if ((role === 'owner' && request.ownerConfirmed) || (role === 'requester' && request.requesterConfirmed)) {
      return { success: false, message: 'Este participante ya confirmó la entrega.' };
    }

    const updated = this.update(requestId, (item) => ({
      ...item,
      ownerConfirmed: role === 'owner' ? true : item.ownerConfirmed,
      requesterConfirmed: role === 'requester' ? true : item.requesterConfirmed,
    }));
    if (!updated) return { success: false, message: 'No se pudo actualizar la confirmación.' };

    const latest = this.findRequest(requestId);
    return {
      success: true,
      message: latest?.ownerConfirmed && latest.requesterConfirmed
        ? 'Ambas partes confirmaron. El intercambio se completó.'
        : 'Confirmación de demostración registrada para esta parte. Falta la otra persona.',
    };
  }

  rate(requestId: string, reviewer: string, stars: number, comment: string): boolean {
    const request = this.findRequest(requestId);
    if (!request || request.status !== 'Completado' || !Number.isInteger(stars) || stars < 1 || stars > 5) return false;
    if (reviewer !== request.owner && reviewer !== request.requester) return false;
    if (request.ratings.some((rating) => rating.reviewer === reviewer)) return false;

    const reviewee = reviewer === request.owner ? request.requester : request.owner;
    return this.update(requestId, (item) => ({
      ...item,
      ratings: [...item.ratings, { reviewer, reviewee, stars, comment: comment.trim(), submittedAt: Date.now() }],
    }));
  }

  findRequest(requestId: string): ExchangeRequest | undefined {
    return this.requestsSignal().find((request) => request.id === requestId);
  }

  private update(requestId: string, updater: (request: ExchangeRequest) => ExchangeRequest): boolean {
    let found = false;
    this.requestsSignal.update((requests) => requests.map((request) => {
      if (request.id !== requestId) return request;
      found = true;
      const updated = updater(request);
      if (updated.status === 'Aceptado' && request.status !== 'Aceptado') {
        updated.requesterConfirmed = false;
        updated.ownerConfirmed = false;
      }
      if (updated.ownerConfirmed && updated.requesterConfirmed && updated.status !== 'Completado') {
        updated.status = 'Completado';
        updated.completedAt = Date.now();
      }
      return updated;
    }));
    return found;
  }

  private createId(): string {
    this.sequence += 1;
    return `exchange-${Date.now().toString(36)}-${this.sequence.toString(36)}`;
  }

  private formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(timestamp);
  }

  private createDemoRequests(): ExchangeRequest[] {
    const daysAgo = (days: number) => Date.now() - days * 24 * 60 * 60 * 1000;
    const create = (id: string, materialId: string, requester: string, owner: string, mode: ExchangeMode, status: ExchangeStatus, days: number, impact?: { paidAmount?: number; referenceValueSoles?: number }): ExchangeRequest => ({
      id, materialId, requester, owner, mode, status, requestedAt: daysAgo(days), dateLabel: this.formatDate(daysAgo(days)),
      requesterConfirmed: status === 'Completado', ownerConfirmed: status === 'Completado', ratings: [], demo: true,
      ...(status === 'Completado' ? { completedAt: daysAgo(days) } : {}),
      ...impact,
      ...(status === 'En negociación' ? { message: '¿Podemos coordinar el intercambio en el campus?' } : {}),
    });

    return [
      create('demo-received-calculator', 'calculadora-cientifica', 'Luis García', CURRENT_USER, 'Precio solidario', 'Pendiente', 11),
      create('demo-received-notes', 'apuntes-java', 'Valeria Montalvo', CURRENT_USER, 'Trueque', 'En negociación', 13),
      create('demo-received-algorithms', 'libro-algoritmos', 'Diego Ramos', CURRENT_USER, 'Trueque', 'Aceptado', 15),
      create('demo-sent-backpack', 'mochila-azul', CURRENT_USER, 'Diana Castro', 'Donación', 'Pendiente', 8),
      create('demo-sent-tablet', 'tablet-apuntes', CURRENT_USER, 'Luis García', 'Precio solidario', 'Aceptado', 9),
      ...[
        create('demo-completed-1', 'calculo-diferencial', 'Ana Torres', CURRENT_USER, 'Donación', 'Completado', 18, { referenceValueSoles: 80 }),
        create('demo-completed-2', 'kit-arduino', CURRENT_USER, 'Daniel Peña', 'Trueque', 'Completado', 20),
        create('demo-completed-3', 'apuntes-java', 'Camila Rojas', CURRENT_USER, 'Trueque', 'Completado', 22),
        create('demo-completed-4', 'mochila-azul', CURRENT_USER, 'Diana Castro', 'Donación', 'Completado', 25, { referenceValueSoles: 65 }),
        create('demo-completed-5', 'tablet-apuntes', 'Luis García', CURRENT_USER, 'Precio solidario', 'Completado', 27, { paidAmount: 280, referenceValueSoles: 420 }),
      ],
    ];
  }
}

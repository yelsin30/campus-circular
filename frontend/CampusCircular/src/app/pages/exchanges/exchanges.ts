import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExchangeRequest, ExchangeService, ExchangeTab } from '../../data/exchange.service';
import { MarketplaceMaterial } from '../../data/material-catalog';
import { MaterialCatalogService } from '../../data/material-catalog.service';
import { ExchangeSidePanel } from './exchange-side-panel/exchange-side-panel';
import { ExchangeRequestRow, ExchangeRowAction } from './exchange-request-row/exchange-request-row';

@Component({
  selector: 'app-exchanges-page',
  standalone: true,
  imports: [RouterLink, ExchangeSidePanel, ExchangeRequestRow],
  templateUrl: './exchanges.html',
  styleUrl: './exchanges.scss',
})
export class ExchangesPage {
  readonly exchangeService = inject(ExchangeService);
  private readonly catalog = inject(MaterialCatalogService);
  readonly tabs: { id: ExchangeTab; label: string }[] = [
    { id: 'received', label: 'Recibidos' },
    { id: 'sent', label: 'Enviados' },
    { id: 'completed', label: 'Completados' },
  ];

  activeTab: ExchangeTab = 'received';
  selectedRequestId: string | null = null;
  agreementDetailsId: string | null = null;
  actionMessage = '';

  get currentUser(): string { return this.exchangeService.currentUser; }
  get requests(): ExchangeRequest[] { return this.exchangeService.getRequests(this.activeTab); }
  get receivedCount(): number { return this.exchangeService.getRequests('received').length; }
  get sentCount(): number { return this.exchangeService.getRequests('sent').length; }
  get completedCount(): number { return this.exchangeService.getRequests('completed').length; }
  get selectedRequest(): ExchangeRequest | undefined {
    return this.selectedRequestId ? this.exchangeService.findRequest(this.selectedRequestId) : undefined;
  }
  get selectedMaterial(): MarketplaceMaterial | undefined {
    return this.selectedRequest ? this.catalog.findById(this.selectedRequest.materialId) : undefined;
  }
  get selectedCounterparty(): string {
    if (!this.selectedRequest) return '';
    return this.selectedRequest.owner === this.currentUser ? this.selectedRequest.requester : this.selectedRequest.owner;
  }
  constructor() {
    const initial = this.exchangeService.getRequests('received').find((request) => request.status === 'Aceptado');
    this.selectedRequestId = initial?.id ?? null;
  }

  selectTab(tab: ExchangeTab): void {
    this.activeTab = tab;
    this.actionMessage = '';
    const list = this.exchangeService.getRequests(tab);
    if (!list.some((request) => request.id === this.selectedRequestId)) {
      this.selectedRequestId = (tab === 'completed' ? list[0] : list.find((request) => request.status === 'Aceptado') ?? list[0])?.id ?? null;
    }
  }

  selectRequest(request: ExchangeRequest): void {
    this.selectedRequestId = request.id;
    this.actionMessage = '';
  }

  materialFor(request: ExchangeRequest): MarketplaceMaterial | undefined {
    return this.catalog.findById(request.materialId);
  }

  accept(request: ExchangeRequest): void {
    this.actionMessage = this.exchangeService.accept(request.id, this.currentUser)
      ? 'Solicitud aceptada. Ya pueden coordinar la entrega.' : 'No se pudo aceptar esta solicitud.';
    this.selectRequest(request);
  }

  reject(request: ExchangeRequest): void {
    this.actionMessage = this.exchangeService.reject(request.id, this.currentUser)
      ? 'Solicitud rechazada.' : 'No se pudo rechazar esta solicitud.';
    this.selectRequest(request);
  }

  negotiate(request: ExchangeRequest): void {
    this.actionMessage = this.exchangeService.setNegotiating(request.id, this.currentUser)
      ? 'La solicitud pasó a negociación.' : 'No se pudo actualizar la solicitud.';
    this.selectRequest(request);
  }

  acceptNegotiation(request: ExchangeRequest): void {
    this.actionMessage = this.exchangeService.acceptNegotiation(request.id, this.currentUser)
      ? 'Acuerdo aceptado. Ya pueden confirmar la entrega presencial.' : 'No se pudo aceptar el acuerdo.';
    this.selectRequest(request);
  }

  rejectNegotiation(request: ExchangeRequest): void {
    this.actionMessage = this.exchangeService.rejectNegotiation(request.id, this.currentUser)
      ? 'La negociación se cerró.' : 'No se pudo cerrar la negociación.';
    this.selectRequest(request);
  }

  cancel(request: ExchangeRequest): void {
    this.actionMessage = this.exchangeService.cancel(request.id, this.currentUser)
      ? 'Solicitud cancelada.' : 'No puedes cancelar esta solicitud en su estado actual.';
    this.selectRequest(request);
  }

  handleRowAction(action: { type: ExchangeRowAction; request: ExchangeRequest }): void {
    switch (action.type) {
      case 'select': this.selectRequest(action.request); break;
      case 'accept': this.accept(action.request); break;
      case 'reject': this.reject(action.request); break;
      case 'negotiate': this.negotiate(action.request); break;
      case 'accept-negotiation': this.acceptNegotiation(action.request); break;
      case 'reject-negotiation': this.rejectNegotiation(action.request); break;
      case 'cancel': this.cancel(action.request); break;
      case 'agreement': this.showAgreement(action.request); break;
    }
  }

  showAgreement(request: ExchangeRequest): void {
    this.agreementDetailsId = this.agreementDetailsId === request.id ? null : request.id;
  }

  alreadyRated(request: ExchangeRequest): boolean {
    return request.ratings.some((rating) => rating.reviewer === this.currentUser);
  }

  onDeliveryConfirmed(completed: boolean): void {
    if (!completed) return;
    this.activeTab = 'completed';
    this.selectedRequestId = this.exchangeService.getRequests('completed')[0]?.id ?? null;
  }
}
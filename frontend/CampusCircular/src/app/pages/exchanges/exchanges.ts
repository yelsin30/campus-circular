import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ExchangeRequest, ExchangeService, ExchangeTab } from '../../data/exchange.service';
import { MarketplaceMaterial } from '../../data/material-catalog';
import { MaterialCatalogService } from '../../data/material-catalog.service';
import { PublicationService } from '../../data/publication.service';
import { ExchangeRequestRow, ExchangeRowAction } from './exchange-request-row/exchange-request-row';
import { ExchangeSidePanel } from './exchange-side-panel/exchange-side-panel';

@Component({
  selector: 'app-exchanges-page',
  standalone: true,
  imports: [RouterLink, ExchangeSidePanel, ExchangeRequestRow],
  templateUrl: './exchanges.html',
  styleUrl: './exchanges.scss',
})
export class ExchangesPage implements OnInit {
  readonly exchangeService = inject(ExchangeService);
  private readonly publicationService = inject(PublicationService);
  private readonly catalog = inject(MaterialCatalogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tabs: { id: ExchangeTab; label: string }[] = [
    { id: 'received', label: 'Recibidos' },
    { id: 'sent', label: 'Enviados' },
    { id: 'completed', label: 'Completados' },
  ];

  activeTab: ExchangeTab = 'received';
  selectedRequestId: string | null = null;
  agreementDetailsId: string | null = null;
  actionMessage = '';
  loading = false;

  get currentUser(): string {
    return this.exchangeService.currentUser;
  }

  get requests(): ExchangeRequest[] {
    return this.exchangeService.getRequests(this.activeTab);
  }

  get receivedCount(): number {
    return this.exchangeService.getRequests('received').length;
  }

  get sentCount(): number {
    return this.exchangeService.getRequests('sent').length;
  }

  get completedCount(): number {
    return this.exchangeService.getRequests('completed').length;
  }

  get selectedRequest(): ExchangeRequest | undefined {
    return this.selectedRequestId
      ? this.exchangeService.findRequest(this.selectedRequestId)
      : undefined;
  }

  get selectedMaterial(): MarketplaceMaterial | undefined {
    return this.selectedRequest ? this.materialFor(this.selectedRequest) : undefined;
  }

  get selectedCounterparty(): string {
    if (!this.selectedRequest) return '';
    return this.exchangeService.isUserOwner(this.selectedRequest)
      ? this.selectedRequest.requester
      : this.selectedRequest.owner;
  }

  ngOnInit(): void {
    this.loading = true;
    this.publicationService
      .getPublications({ page: 0, size: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

    this.exchangeService
      .loadMyTransactions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loading = false;
        this.ensureSelectedRequest();
      });
  }

  selectTab(tab: ExchangeTab): void {
    this.activeTab = tab;
    this.actionMessage = '';
    this.ensureSelectedRequest();
  }

  selectRequest(request: ExchangeRequest): void {
    this.selectedRequestId = request.id;
  }

  materialFor(request: ExchangeRequest): MarketplaceMaterial {
    const found =
      this.publicationService.findById(request.materialId) ??
      this.catalog.findById(request.materialId);
    if (found) {
      return found;
    }

    const category = request.materialCategory ?? 'Libros';
    return {
      id: request.materialId,
      title: request.materialTitle ?? `Publicación #${request.materialId}`,
      category,
      career: 'Ingeniería de Sistemas',
      condition: request.materialCondition ?? 'En buen estado',
      mode: request.mode,
      owner: request.owner,
      initials: (request.owner.slice(0, 2) || 'UP').toUpperCase(),
      ...(request.paidAmount !== undefined ? { price: request.paidAmount } : {}),
      art: 'calculus',
      background: '#f0f2f4',
      publishedAt: request.requestedAt,
      publishedLabel: request.dateLabel,
      campus: 'Campus UPN',
      publisher: request.owner,
      description: '',
      rating: 5,
      ratingCount: 1,
      offeredExamples: [],
    };
  }

  accept(request: ExchangeRequest): void {
    this.actionMessage = '';
    this.exchangeService
      .acceptTransaction(request.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionMessage =
            'Solicitud aceptada. La transacción pasó a EN_NEGOCIACION y ya pueden validar la entrega con código OTP.';
          this.selectedRequestId = request.id;
        },
        error: (err: HttpErrorResponse) => {
          this.actionMessage =
            (err.error?.message as string | undefined) ||
            'No se pudo aceptar esta solicitud.';
        },
      });
  }

  reject(request: ExchangeRequest): void {
    this.actionMessage = '';
    this.exchangeService
      .rejectTransaction(request.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionMessage =
            'Solicitud rechazada. Las publicaciones involucradas siguen disponibles.';
          this.selectedRequestId = request.id;
        },
        error: (err: HttpErrorResponse) => {
          this.actionMessage =
            (err.error?.message as string | undefined) ||
            'No se pudo rechazar esta solicitud.';
        },
      });
  }

  handleRowAction(action: { type: ExchangeRowAction; request: ExchangeRequest }): void {
    switch (action.type) {
      case 'select':
        this.selectRequest(action.request);
        break;
      case 'accept':
        this.accept(action.request);
        break;
      case 'reject':
        this.reject(action.request);
        break;
      case 'agreement':
        this.showAgreement(action.request);
        break;
    }
  }

  showAgreement(request: ExchangeRequest): void {
    this.agreementDetailsId = this.agreementDetailsId === request.id ? null : request.id;
  }

  alreadyRated(request: ExchangeRequest): boolean {
    return (
      Boolean(request.alreadyRated) ||
      request.ratings.some((rating) => rating.reviewer === this.currentUser)
    );
  }

  onDeliveryConfirmed(completed: boolean): void {
    if (!completed) return;
    this.actionMessage = 'Entrega presencial confirmada con éxito. Ahora puedes calificar al estudiante.';
    this.activeTab = 'completed';
    const completedList = this.exchangeService.getRequests('completed');
    if (
      !this.selectedRequestId ||
      !completedList.some((item) => item.id === this.selectedRequestId)
    ) {
      this.selectedRequestId = completedList[0]?.id ?? null;
    }
  }

  private ensureSelectedRequest(): void {
    const list = this.exchangeService.getRequests(this.activeTab);
    if (!list.some((request) => request.id === this.selectedRequestId)) {
      const preferred =
        this.activeTab === 'completed'
          ? list[0]
          : list.find((request) => request.status === 'En negociación') ?? list[0];
      this.selectedRequestId = preferred?.id ?? null;
    }
  }
}

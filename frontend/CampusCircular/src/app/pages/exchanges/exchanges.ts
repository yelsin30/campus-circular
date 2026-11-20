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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { exhaustMap, finalize, interval } from 'rxjs';
import { ExchangeRequest, ExchangeService, ExchangeTab } from '../../data/exchange.service';
import { MarketplaceMaterial } from '../../data/material-catalog';
import { MaterialCatalogService } from '../../data/material-catalog.service';
import { PublicationService } from '../../data/publication.service';
import { ImageLightbox } from '../../shared/image-lightbox/image-lightbox';
import { ExchangeRequestRow, ExchangeRowAction } from './exchange-request-row/exchange-request-row';
import { ExchangeSidePanel } from './exchange-side-panel/exchange-side-panel';

const REJECTION_REASONS: readonly string[] = [
  'Ya acordé el intercambio con otro estudiante',
  'El material ofrecido no coincide con lo que busco',
  'No puedo coincidir en horarios/sede',
  'Otro motivo',
];

@Component({
  selector: 'app-exchanges-page',
  standalone: true,
  imports: [RouterLink, ExchangeSidePanel, ExchangeRequestRow, ImageLightbox],
  templateUrl: './exchanges.html',
  styleUrl: './exchanges.scss',
})
export class ExchangesPage {
  readonly exchangeService = inject(ExchangeService);
  private readonly publicationService = inject(PublicationService);
  private readonly catalog = inject(MaterialCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly tabs: { id: ExchangeTab; label: string }[] = [
    { id: 'received', label: 'Recibidos' },
    { id: 'sent', label: 'Enviados' },
    { id: 'completed', label: 'Completados' },
    { id: 'rejected', label: 'Rechazados' },
  ];

  readonly rejectionOptions = REJECTION_REASONS;
  readonly activeTab = signal<ExchangeTab>('received');
  readonly selectedRequestId = signal<string | null>(null);
  readonly agreementDetailsId = signal<string | null>(null);
  readonly actionMessage = signal('');
  readonly loading = signal(false);

  readonly rejectModalRequest = signal<ExchangeRequest | null>(null);
  readonly selectedRejectOption = signal<string>(REJECTION_REASONS[0]);
  readonly customRejectReason = signal('');
  readonly rejecting = signal(false);

  readonly lightboxImages = signal<string[]>([]);
  readonly lightboxTitle = signal('');

  readonly requests = computed(() => this.exchangeService.getRequests(this.activeTab()));
  readonly receivedCount = computed(() => this.exchangeService.getRequests('received').length);
  readonly sentCount = computed(() => this.exchangeService.getRequests('sent').length);
  readonly completedCount = computed(() => this.exchangeService.getRequests('completed').length);
  readonly rejectedCount = computed(() => this.exchangeService.getRequests('rejected').length);

  readonly selectedRequest = computed(() => {
    const id = this.selectedRequestId();
    return id ? this.exchangeService.findRequest(id) : undefined;
  });

  readonly selectedMaterial = computed(() => {
    const req = this.selectedRequest();
    return req ? this.materialFor(req) : undefined;
  });

  readonly selectedCounterparty = computed(() => {
    const req = this.selectedRequest();
    if (!req) return '';
    return this.exchangeService.isUserOwner(req) ? req.requester : req.owner;
  });

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const requestedTx = this.route.snapshot.queryParamMap.get('tx');
      this.loadTransactions(requestedTx);

      interval(3000)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          exhaustMap(() => this.exchangeService.loadMyTransactions()),
        )
        .subscribe(() => {
          const currentId = this.selectedRequestId();
          if (!currentId) {
            this.ensureSelectedRequest();
          }
        });
    });
  }

  get currentUser(): string {
    return this.exchangeService.currentUser;
  }

  tabCount(tabId: ExchangeTab): number {
    switch (tabId) {
      case 'received':
        return this.receivedCount();
      case 'sent':
        return this.sentCount();
      case 'completed':
        return this.completedCount();
      case 'rejected':
        return this.rejectedCount();
    }
  }

  selectTab(tab: ExchangeTab): void {
    this.activeTab.set(tab);
    this.actionMessage.set('');
    this.ensureSelectedRequest();
  }

  selectRequest(request: ExchangeRequest): void {
    this.selectedRequestId.set(request.id);
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
    this.actionMessage.set('');
    this.exchangeService
      .acceptTransaction(request.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionMessage.set(
            'Solicitud aceptada. La transacción pasó a EN_NEGOCIACION y ya pueden coordinar por chat y validar la entrega con código OTP.',
          );
          this.selectedRequestId.set(request.id);
        },
        error: (err: HttpErrorResponse) => {
          this.actionMessage.set(
            (err.error?.message as string | undefined) || 'No se pudo aceptar esta solicitud.',
          );
        },
      });
  }

  openRejectModal(request: ExchangeRequest): void {
    this.rejectModalRequest.set(request);
    this.selectedRejectOption.set(REJECTION_REASONS[0]);
    this.customRejectReason.set('');
    this.actionMessage.set('');
  }

  closeRejectModal(): void {
    if (this.rejecting()) return;
    this.rejectModalRequest.set(null);
  }

  updateCustomRejectReason(event: Event): void {
    this.customRejectReason.set((event.target as HTMLTextAreaElement).value);
  }

  confirmReject(): void {
    const target = this.rejectModalRequest();
    if (!target || this.rejecting()) return;

    const option = this.selectedRejectOption();
    const extra = this.customRejectReason().trim();
    const composedReason =
      option === 'Otro motivo'
        ? extra || 'Otro motivo'
        : extra
          ? `${option}. ${extra}`
          : option;

    this.rejecting.set(true);
    this.actionMessage.set('');
    this.exchangeService
      .rejectTransaction(target.id, composedReason)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.rejecting.set(false)),
      )
      .subscribe({
        next: () => {
          this.rejectModalRequest.set(null);
          this.actionMessage.set(
            'Solicitud rechazada. Se movió a la pestaña Rechazados con el motivo registrado y la publicación sigue disponible.',
          );
          this.activeTab.set('rejected');
          this.selectedRequestId.set(target.id);
        },
        error: (err: HttpErrorResponse) => {
          this.actionMessage.set(
            (err.error?.message as string | undefined) || 'No se pudo rechazar esta solicitud.',
          );
        },
      });
  }

  openLightbox(material: MarketplaceMaterial): void {
    if (!material.images?.length) return;
    this.lightboxImages.set(material.images);
    this.lightboxTitle.set(material.title);
  }

  closeLightbox(): void {
    this.lightboxImages.set([]);
    this.lightboxTitle.set('');
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
        this.openRejectModal(action.request);
        break;
      case 'agreement':
        this.showAgreement(action.request);
        break;
      case 'zoom':
        this.openLightbox(this.materialFor(action.request));
        break;
    }
  }

  showAgreement(request: ExchangeRequest): void {
    this.agreementDetailsId.update((current) => (current === request.id ? null : request.id));
  }

  alreadyRated(request: ExchangeRequest): boolean {
    return (
      Boolean(request.alreadyRated) ||
      request.ratings.some((rating) => rating.reviewer === this.currentUser)
    );
  }

  isUserOwner(request: ExchangeRequest): boolean {
    return this.exchangeService.isUserOwner(request);
  }

  onDeliveryConfirmed(completed: boolean): void {
    if (!completed) return;
    this.actionMessage.set(
      'Entrega presencial confirmada con éxito. Ahora puedes calificar al estudiante.',
    );
    this.activeTab.set('completed');
    const completedList = this.exchangeService.getRequests('completed');
    const currentId = this.selectedRequestId();
    if (!currentId || !completedList.some((item) => item.id === currentId)) {
      this.selectedRequestId.set(completedList[0]?.id ?? null);
    }
  }

  private loadTransactions(preferredTxId?: string | null): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loading.set(true);
    this.publicationService
      .getPublications({ page: 0, size: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

    this.exchangeService
      .loadMyTransactions()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe(() => {
        if (preferredTxId) {
          const matched = this.exchangeService.findRequest(preferredTxId);
          if (matched) {
            this.switchTabForRequest(matched);
            this.selectedRequestId.set(matched.id);
            return;
          }
        }
        this.ensureSelectedRequest();
      });
  }

  private switchTabForRequest(request: ExchangeRequest): void {
    if (request.status === 'Completado') {
      this.activeTab.set('completed');
    } else if (request.status === 'Rechazado') {
      this.activeTab.set('rejected');
    } else if (this.exchangeService.isUserOwner(request)) {
      this.activeTab.set('received');
    } else {
      this.activeTab.set('sent');
    }
  }

  private ensureSelectedRequest(): void {
    const list = this.exchangeService.getRequests(this.activeTab());
    const currentId = this.selectedRequestId();
    if (!list.some((request) => request.id === currentId)) {
      const preferred =
        this.activeTab() === 'completed' || this.activeTab() === 'rejected'
          ? list[0]
          : list.find((request) => request.status === 'En negociación') ?? list[0];
      this.selectedRequestId.set(preferred?.id ?? null);
    }
  }
}

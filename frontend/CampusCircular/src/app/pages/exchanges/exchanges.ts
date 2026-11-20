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
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
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
export class ExchangesPage {
  readonly exchangeService = inject(ExchangeService);
  private readonly publicationService = inject(PublicationService);
  private readonly catalog = inject(MaterialCatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly tabs: { id: ExchangeTab; label: string }[] = [
    { id: 'received', label: 'Recibidos' },
    { id: 'sent', label: 'Enviados' },
    { id: 'completed', label: 'Completados' },
  ];

  readonly activeTab = signal<ExchangeTab>('received');
  readonly selectedRequestId = signal<string | null>(null);
  readonly agreementDetailsId = signal<string | null>(null);
  readonly actionMessage = signal('');
  readonly loading = signal(false);

  readonly requests = computed(() => this.exchangeService.getRequests(this.activeTab()));
  readonly receivedCount = computed(() => this.exchangeService.getRequests('received').length);
  readonly sentCount = computed(() => this.exchangeService.getRequests('sent').length);
  readonly completedCount = computed(() => this.exchangeService.getRequests('completed').length);
  readonly rejectedSentCount = computed(
    () =>
      this.exchangeService
        .getRequests('sent')
        .filter((request) => request.status === 'Rechazado').length,
  );

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
      this.loadTransactions();
    });
  }

  get currentUser(): string {
    return this.exchangeService.currentUser;
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

  reject(request: ExchangeRequest): void {
    this.actionMessage.set('');
    this.exchangeService
      .rejectTransaction(request.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionMessage.set(
            'Solicitud rechazada. El solicitante verá el estado "Rechazado" y las publicaciones siguen disponibles.',
          );
          this.selectedRequestId.set(request.id);
        },
        error: (err: HttpErrorResponse) => {
          this.actionMessage.set(
            (err.error?.message as string | undefined) || 'No se pudo rechazar esta solicitud.',
          );
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
    this.agreementDetailsId.update((current) => (current === request.id ? null : request.id));
  }

  alreadyRated(request: ExchangeRequest): boolean {
    return (
      Boolean(request.alreadyRated) ||
      request.ratings.some((rating) => rating.reviewer === this.currentUser)
    );
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

  private loadTransactions(): void {
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
        this.ensureSelectedRequest();
      });
  }

  private ensureSelectedRequest(): void {
    const list = this.exchangeService.getRequests(this.activeTab());
    const currentId = this.selectedRequestId();
    if (!list.some((request) => request.id === currentId)) {
      const preferred =
        this.activeTab() === 'completed'
          ? list[0]
          : list.find((request) => request.status === 'En negociación') ?? list[0];
      this.selectedRequestId.set(preferred?.id ?? null);
    }
  }
}

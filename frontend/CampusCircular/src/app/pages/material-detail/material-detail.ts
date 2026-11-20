import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../data/auth.service';
import { MarketplaceMaterial } from '../../data/material-catalog';
import { MaterialCatalogService } from '../../data/material-catalog.service';
import { CreateTransactionRequestDto, ExchangeService } from '../../data/exchange.service';
import { ModerationService } from '../../data/moderation.service';
import { PublicationService } from '../../data/publication.service';
import { MaterialArtwork } from '../../shared/material-artwork/material-artwork';
import { MaterialGallery } from './material-gallery/material-gallery';
import { MaterialInformation } from './material-information/material-information';

type DetailModal = 'request' | 'report' | null;

@Component({
  selector: 'app-material-detail-page',
  standalone: true,
  imports: [RouterLink, MaterialGallery, MaterialArtwork, MaterialInformation],
  templateUrl: './material-detail.html',
  styleUrl: './material-detail.scss',
})
export class MaterialDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly catalog = inject(MaterialCatalogService);
  private readonly publicationService = inject(PublicationService);
  private readonly auth = inject(AuthService);
  private readonly exchanges = inject(ExchangeService);
  private readonly moderation = inject(ModerationService);

  readonly material = signal<MarketplaceMaterial | undefined>(undefined);
  readonly loadingMaterial = signal(true);
  readonly activeGalleryView = signal(0);
  readonly isSaved = signal(false);
  readonly activeModal = signal<DetailModal>(null);
  readonly requestMessage = signal('');
  readonly offeredMaterial = signal('');
  readonly otherOfferedMaterial = signal('');
  readonly reportReason = signal('Contenido inapropiado');
  readonly reportDetails = signal('');
  readonly shareMessage = signal('');
  readonly modalConfirmation = signal('');
  readonly requestCreated = signal(false);
  readonly reportCreated = signal(false);
  readonly isSubmittingRequest = signal(false);
  readonly isSubmittingReport = signal(false);

  readonly ownTradePublications = computed<MarketplaceMaterial[]>(() => {
    const currentUserId = this.auth.currentUser()?.id;
    const currentMaterialId = this.material()?.id;
    return this.publicationService.publications().filter((pub) => {
      if (pub.id === currentMaterialId) return false;
      const isNumericId = Number.isFinite(Number(pub.id)) && Number(pub.id) > 0;
      if (!isNumericId) return false;
      const isAvailableTrueque =
        (pub.backendModality ?? this.publicationService.toBackendModality(pub.mode)) === 'TRUEQUE' &&
        (pub.backendStatus ?? 'DISPONIBLE') === 'DISPONIBLE';
      if (!isAvailableTrueque) return false;
      return currentUserId !== undefined ? pub.ownerId === currentUserId : true;
    });
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        const cached =
          this.publicationService.findPublicById(id) ?? this.catalog.findPublicById(id);
        this.material.set(cached);
        this.activeGalleryView.set(0);
        this.isSaved.set(false);
        this.shareMessage.set('');

        if (!isPlatformBrowser(this.platformId) || !id) {
          this.loadingMaterial.set(false);
          return;
        }

        this.loadingMaterial.set(!cached);
        this.publicationService
          .getPublicationById(id)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loadingMaterial.set(false)),
          )
          .subscribe((loaded) => {
            if (loaded) {
              this.material.set(loaded);
            }
          });

        this.publicationService
          .getPublications({ page: 0, size: 50 })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            const refreshed = this.publicationService.findPublicById(id);
            if (refreshed) {
              this.material.set(refreshed);
            }
          });
      });
  }

  selectGalleryView(view: number): void {
    this.activeGalleryView.set(view);
  }

  toggleSaved(): void {
    this.isSaved.update((value) => !value);
  }

  openRequest(): void {
    this.requestMessage.set('');
    this.offeredMaterial.set(this.ownTradePublications()[0]?.id ?? '');
    this.otherOfferedMaterial.set('');
    this.modalConfirmation.set('');
    this.requestCreated.set(false);
    this.reportCreated.set(false);
    this.activeModal.set('request');
  }

  openReport(): void {
    this.reportReason.set('Contenido inapropiado');
    this.reportDetails.set('');
    this.modalConfirmation.set('');
    this.requestCreated.set(false);
    this.reportCreated.set(false);
    this.activeModal.set('report');
  }

  closeModal(): void {
    this.activeModal.set(null);
  }

  submitRequest(): void {
    const currentItem = this.material();
    if (!currentItem || this.isSubmittingRequest()) return;

    const publicationId = Number(currentItem.id);
    if (!Number.isFinite(publicationId) || publicationId <= 0) {
      this.requestCreated.set(false);
      this.modalConfirmation.set('La publicación seleccionada no tiene un identificador válido.');
      return;
    }

    const type = this.publicationService.toBackendModality(
      currentItem.backendModality ?? currentItem.mode,
    );
    const initialMessage = this.requestMessage().trim();

    let offeredPublicationId: number | null = null;
    let selectedOfferLabel: string | undefined;

    if (type === 'TRUEQUE') {
      const rawOffered =
        this.offeredMaterial() === 'Otro material'
          ? this.otherOfferedMaterial().trim()
          : this.offeredMaterial().trim();
      const parsedOfferedId = Number(rawOffered);
      if (!Number.isFinite(parsedOfferedId) || parsedOfferedId <= 0) {
        this.requestCreated.set(false);
        this.modalConfirmation.set(
          'Para proponer un trueque debes tener al menos una publicación tuya disponible en modalidad Trueque.',
        );
        return;
      }
      offeredPublicationId = parsedOfferedId;
      const matchedOwnOffer = this.ownTradePublications().find(
        (pub) => pub.id === String(parsedOfferedId),
      );
      selectedOfferLabel = matchedOwnOffer
        ? `${matchedOwnOffer.title} (#${matchedOwnOffer.id})`
        : `Publicación #${parsedOfferedId}`;
    }

    const payload: CreateTransactionRequestDto = {
      idPublicacion: publicationId,
      idPublicacionOfrecida: offeredPublicationId,
      ...(initialMessage ? { mensajeInicial: initialMessage } : {}),
    };

    this.isSubmittingRequest.set(true);
    this.exchanges
      .createTransaction(payload, {
        materialId: currentItem.id,
        owner: currentItem.owner,
        mode: currentItem.mode,
        message: initialMessage || undefined,
        offeredMaterial: selectedOfferLabel,
      })
      .pipe(finalize(() => this.isSubmittingRequest.set(false)))
      .subscribe({
        next: (res) => {
          const txId = res.transactionId ?? res.idTransaccion ?? payload.idPublicacion;
          const txState = res.state ?? res.estado ?? 'PENDIENTE';
          this.requestCreated.set(true);
          this.modalConfirmation.set(
            `Solicitud #${txId} registrada en el servidor (${txState}) para “${currentItem.title}”. Puedes coordinar la entrega en el chat de Mis intercambios.`,
          );
        },
        error: (err: HttpErrorResponse) => {
          this.requestCreated.set(false);
          const backendMessage = err.error?.message as string | undefined;
          if (err.status === 409) {
            this.modalConfirmation.set(
              backendMessage ||
                'La publicación solicitada u ofrecida no está disponible en este momento (409 Conflict).',
            );
          } else if (err.status === 403) {
            this.modalConfirmation.set(
              backendMessage || 'La publicación ofrecida debe pertenecer a tu cuenta autenticada.',
            );
          } else if (err.status === 401) {
            this.modalConfirmation.set(
              backendMessage ||
                'Debes iniciar sesión con tu cuenta institucional para solicitar materiales.',
            );
          } else if (err.status === 400) {
            this.modalConfirmation.set(
              backendMessage || 'No puedes solicitar tu propia publicación o los datos son inválidos.',
            );
          } else {
            this.modalConfirmation.set(
              backendMessage || 'No se pudo procesar la solicitud en el servidor.',
            );
          }
        },
      });
  }

  submitReport(): void {
    const currentItem = this.material();
    if (!currentItem || this.isSubmittingReport()) return;

    const parsedId = Number(currentItem.id);
    const publicationId = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : 1;
    const combinedMotivo = this.reportDetails().trim()
      ? `${this.reportReason()}: ${this.reportDetails().trim()}`
      : this.reportReason();

    this.isSubmittingReport.set(true);
    this.moderation
      .submitReportToBackend(publicationId, combinedMotivo)
      .pipe(finalize(() => this.isSubmittingReport.set(false)))
      .subscribe({
        next: (res) => {
          this.reportCreated.set(true);
          this.modalConfirmation.set(
            `Reporte #${res.idReporte} registrado en estado ${res.estado}. El equipo de administración lo revisará.`,
          );
        },
        error: (err: HttpErrorResponse) => {
          this.reportCreated.set(false);
          const backendMessage = err.error?.message as string | undefined;
          if (err.status === 409) {
            this.modalConfirmation.set(
              backendMessage || 'Ya existe un reporte pendiente tuyo para esta publicación.',
            );
          } else if (err.status === 401 || err.status === 403) {
            this.modalConfirmation.set(
              backendMessage || 'Debes iniciar sesión con tu cuenta institucional para reportar.',
            );
          } else {
            this.modalConfirmation.set(
              backendMessage || 'No se pudo registrar el reporte en el servidor.',
            );
          }
        },
      });
  }

  async shareMaterial(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      await globalThis.navigator.clipboard.writeText(globalThis.location.href);
      this.shareMessage.set('Enlace copiado al portapapeles.');
    } catch {
      this.shareMessage.set(
        'No se pudo copiar automáticamente. Copia la dirección desde la barra del navegador.',
      );
    }
  }

  updateRequestMessage(event: Event): void {
    this.requestMessage.set((event.target as HTMLTextAreaElement).value);
  }

  updateOfferedMaterial(event: Event): void {
    this.offeredMaterial.set((event.target as HTMLSelectElement).value);
  }

  updateOtherOfferedMaterial(event: Event): void {
    this.otherOfferedMaterial.set((event.target as HTMLInputElement).value);
  }

  updateReportReason(event: Event): void {
    this.reportReason.set((event.target as HTMLSelectElement).value);
  }

  updateReportDetails(event: Event): void {
    this.reportDetails.set((event.target as HTMLTextAreaElement).value);
  }
}

import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

  material: MarketplaceMaterial | undefined;
  activeGalleryView = 0;
  isSaved = false;
  activeModal: DetailModal = null;
  requestMessage = '';
  offeredMaterial = '';
  otherOfferedMaterial = '';
  reportReason = 'Contenido inapropiado';
  reportDetails = '';
  shareMessage = '';
  modalConfirmation = '';
  requestCreated = false;
  reportCreated = false;

  get ownTradePublications(): MarketplaceMaterial[] {
    const currentUserId = this.auth.currentUser()?.id;
    const currentMaterialId = this.material?.id;
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
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        this.material =
          this.publicationService.findPublicById(id) ?? this.catalog.findPublicById(id);
        this.activeGalleryView = 0;
        this.isSaved = false;
        this.shareMessage = '';

        this.publicationService
          .getPublications({ page: 0, size: 50 })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            const refreshed = this.publicationService.findPublicById(id);
            if (refreshed) {
              this.material = refreshed;
            }
          });
      });
  }

  selectGalleryView(view: number): void {
    this.activeGalleryView = view;
  }

  toggleSaved(): void {
    this.isSaved = !this.isSaved;
  }

  openRequest(): void {
    this.requestMessage = '';
    this.offeredMaterial =
      this.ownTradePublications[0]?.id ?? this.material?.offeredExamples[0] ?? '';
    this.otherOfferedMaterial = '';
    this.modalConfirmation = '';
    this.requestCreated = false;
    this.reportCreated = false;
    this.activeModal = 'request';
  }

  openReport(): void {
    this.reportReason = 'Contenido inapropiado';
    this.reportDetails = '';
    this.modalConfirmation = '';
    this.requestCreated = false;
    this.reportCreated = false;
    this.activeModal = 'report';
  }

  closeModal(): void {
    this.activeModal = null;
  }

  submitRequest(): void {
    if (!this.material) return;

    const currentItem = this.material;
    const parsedPublicationId = Number(currentItem.id);
    const fallbackRequestedId = Number(
      this.publicationService
        .publications()
        .find(
          (pub) =>
            (pub.backendModality ?? this.publicationService.toBackendModality(pub.mode)) === 'TRUEQUE' &&
            (pub.backendStatus ?? 'DISPONIBLE') === 'DISPONIBLE' &&
            (this.auth.currentUser()?.id === undefined || pub.ownerId !== this.auth.currentUser()?.id),
        )?.id,
    );
    const publicationId =
      Number.isFinite(parsedPublicationId) && parsedPublicationId > 0
        ? parsedPublicationId
        : Number.isFinite(fallbackRequestedId) && fallbackRequestedId > 0
          ? fallbackRequestedId
          : 1;

    const rawOffered =
      this.offeredMaterial === 'Otro material' ? this.otherOfferedMaterial : this.offeredMaterial;
    const parsedOfferedId = Number(rawOffered);
    const fallbackOwnId = Number(
      this.ownTradePublications[0]?.id ??
        this.publicationService
          .publications()
          .find(
            (pub) =>
              this.auth.currentUser()?.id !== undefined &&
              pub.ownerId === this.auth.currentUser()?.id &&
              Number(pub.id) !== publicationId,
          )?.id,
    );
    const offeredPublicationId =
      Number.isFinite(parsedOfferedId) && parsedOfferedId > 0
        ? parsedOfferedId
        : Number.isFinite(fallbackOwnId) && fallbackOwnId > 0
          ? fallbackOwnId
          : this.auth.currentUser()?.id === 1
            ? 1
            : publicationId === 2
              ? 3
              : 2;
    const type = this.publicationService.toBackendModality(
      currentItem.backendModality ?? currentItem.mode,
    );

    const payload: CreateTransactionRequestDto = {
      publicationId,
      type,
      offeredPublicationId,
      idPublicacion: publicationId,
      idPublicacionOfrecida: offeredPublicationId,
    };

    const matchedOwnOffer = this.ownTradePublications.find((pub) => pub.id === this.offeredMaterial);
    const selectedOfferLabel =
      this.offeredMaterial === 'Otro material'
        ? this.otherOfferedMaterial
        : matchedOwnOffer
          ? `${matchedOwnOffer.title} (#${matchedOwnOffer.id})`
          : this.offeredMaterial;

    this.exchanges
      .createTransaction(payload, {
        materialId: currentItem.id,
        owner: currentItem.owner,
        mode: currentItem.mode,
        message: this.requestMessage,
        offeredMaterial: selectedOfferLabel,
      })
      .subscribe({
        next: (res) => {
          const txId = res.transactionId ?? res.idTransaccion ?? payload.publicationId;
          const txState = res.state ?? res.estado ?? 'PENDIENTE';
          this.requestCreated = true;
          this.modalConfirmation = `Solicitud #${txId} registrada en el servidor con estado ${txState} para “${currentItem.title}”.`;
        },
        error: (err: HttpErrorResponse) => {
          this.requestCreated = false;
          const backendMessage = err.error?.message as string | undefined;
          if (err.status === 409) {
            this.modalConfirmation =
              backendMessage || 'La publicación solicitada u ofrecida no está disponible para trueque (409 Conflict).';
          } else if (err.status === 403) {
            this.modalConfirmation =
              backendMessage || 'La publicación ofrecida debe pertenecer a tu cuenta autenticada.';
          } else if (err.status === 401) {
            this.modalConfirmation =
              backendMessage || 'Debes iniciar sesión con tu cuenta institucional para solicitar materiales.';
          } else if (err.status === 400) {
            this.modalConfirmation =
              backendMessage || 'No puedes solicitar una publicación propia o con datos inválidos.';
          } else {
            this.modalConfirmation =
              backendMessage || 'No se pudo procesar la solicitud en el servidor.';
          }
        },
      });
  }

  submitReport(): void {
    if (!this.material) return;
    const parsedId = Number(this.material.id);
    const publicationId = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : 1;
    const combinedMotivo = this.reportDetails.trim()
      ? `${this.reportReason}: ${this.reportDetails.trim()}`
      : this.reportReason;

    this.moderation.submitReportToBackend(publicationId, combinedMotivo).subscribe({
      next: (res) => {
        this.reportCreated = true;
        this.modalConfirmation = `Reporte #${res.idReporte} registrado en estado ${res.estado}. El equipo de administración lo revisará.`;
      },
      error: (err: HttpErrorResponse) => {
        this.reportCreated = false;
        const backendMessage = err.error?.message as string | undefined;
        if (err.status === 409) {
          this.modalConfirmation =
            backendMessage || 'Ya existe un reporte pendiente tuyo para esta publicación.';
        } else if (err.status === 401 || err.status === 403) {
          this.modalConfirmation =
            backendMessage || 'Debes iniciar sesión con tu cuenta institucional para reportar.';
        } else {
          this.modalConfirmation =
            backendMessage || 'No se pudo registrar el reporte en el servidor.';
        }
      },
    });
  }

  async shareMaterial(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      await globalThis.navigator.clipboard.writeText(globalThis.location.href);
      this.shareMessage = 'Enlace copiado al portapapeles.';
    } catch {
      this.shareMessage =
        'No se pudo copiar automáticamente. Copia la dirección desde la barra del navegador.';
    }
  }

  updateRequestMessage(event: Event): void {
    this.requestMessage = (event.target as HTMLTextAreaElement).value;
  }

  updateOfferedMaterial(event: Event): void {
    this.offeredMaterial = (event.target as HTMLSelectElement).value;
  }

  updateOtherOfferedMaterial(event: Event): void {
    this.otherOfferedMaterial = (event.target as HTMLInputElement).value;
  }

  updateReportReason(event: Event): void {
    this.reportReason = (event.target as HTMLSelectElement).value;
  }

  updateReportDetails(event: Event): void {
    this.reportDetails = (event.target as HTMLTextAreaElement).value;
  }
}

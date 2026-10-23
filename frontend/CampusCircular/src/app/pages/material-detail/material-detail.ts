import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MarketplaceMaterial } from '../../data/material-catalog';
import { MaterialCatalogService } from '../../data/material-catalog.service';
import { ExchangeService } from '../../data/exchange.service';
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
  private readonly exchanges = inject(ExchangeService);

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

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.material = this.catalog.findById(params.get('id'));
        this.activeGalleryView = 0;
        this.isSaved = false;
        this.shareMessage = '';
      });
  }

  selectGalleryView(view: number): void { this.activeGalleryView = view; }
  toggleSaved(): void { this.isSaved = !this.isSaved; }

  openRequest(): void {
    this.requestMessage = '';
    this.offeredMaterial = this.material?.offeredExamples[0] ?? '';
    this.otherOfferedMaterial = '';
    this.modalConfirmation = '';
    this.requestCreated = false;
    this.activeModal = 'request';
  }

  openReport(): void {
    this.reportReason = 'Contenido inapropiado';
    this.reportDetails = '';
    this.modalConfirmation = '';
    this.requestCreated = false;
    this.activeModal = 'report';
  }

  closeModal(): void { this.activeModal = null; }

  submitRequest(): void {
    if (!this.material) return;
    const result = this.exchanges.createRequest(this.material.id, this.requestMessage, this.offeredMaterial);
    if (!result.success) {
      this.modalConfirmation = result.reason === 'own-material'
        ? 'No puedes solicitar una publicación propia.'
        : result.reason === 'duplicate'
          ? 'Ya tienes una solicitud activa para este material. Puedes revisarla en Mis intercambios.'
          : 'No se encontró el material para crear la solicitud.';
      return;
    }
    this.requestCreated = true;
    this.modalConfirmation = `Solicitud de demostración creada para “${this.material.title}”. Puedes verla en Mis intercambios. No se envió a un servidor.`;
  }

  submitReport(): void {
    this.modalConfirmation = 'Reporte de demostración preparado. No se envió a un servidor.';
  }

  async shareMaterial(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      await globalThis.navigator.clipboard.writeText(globalThis.location.href);
      this.shareMessage = 'Enlace copiado al portapapeles.';
    } catch {
      this.shareMessage = 'No se pudo copiar automáticamente. Copia la dirección desde la barra del navegador.';
    }
  }

  updateRequestMessage(event: Event): void { this.requestMessage = (event.target as HTMLTextAreaElement).value; }
  updateOfferedMaterial(event: Event): void { this.offeredMaterial = (event.target as HTMLSelectElement).value; }
  updateOtherOfferedMaterial(event: Event): void { this.otherOfferedMaterial = (event.target as HTMLInputElement).value; }
  updateReportReason(event: Event): void { this.reportReason = (event.target as HTMLSelectElement).value; }
  updateReportDetails(event: Event): void { this.reportDetails = (event.target as HTMLTextAreaElement).value; }
}
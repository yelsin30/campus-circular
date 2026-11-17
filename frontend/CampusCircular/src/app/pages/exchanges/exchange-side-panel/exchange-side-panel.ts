import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ExchangeRequest, ExchangeService } from '../../../data/exchange.service';
import { MarketplaceMaterial } from '../../../data/material-catalog';

@Component({
  selector: 'app-exchange-side-panel',
  standalone: true,
  templateUrl: './exchange-side-panel.html',
  styleUrl: './exchange-side-panel.scss',
})
export class ExchangeSidePanel implements OnChanges {
  private readonly exchanges = inject(ExchangeService);

  @Input() request: ExchangeRequest | undefined;
  @Input() material: MarketplaceMaterial | undefined;
  @Input() currentUser = '';
  @Input() counterparty = '';
  @Output() requestSelected = new EventEmitter<ExchangeRequest>();
  @Output() deliveryConfirmed = new EventEmitter<boolean>();

  otpCode = '';
  generatedCode = '';
  generatedExpiresAt = '';
  generatingCode = false;
  confirmingDelivery = false;
  otpMessage = '';
  otpSuccess = false;

  selectedRating = 0;
  ratingComment = '';
  ratingMessage = '';
  ratingSuccess = false;
  submittingRating = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['request']) {
      const prevId = (changes['request'].previousValue as ExchangeRequest | undefined)?.id;
      const nextId = (changes['request'].currentValue as ExchangeRequest | undefined)?.id;
      if (prevId !== nextId) {
        this.otpCode = '';
        this.generatedCode = '';
        this.generatedExpiresAt = '';
        this.otpMessage = '';
        this.otpSuccess = false;
        this.selectedRating = 0;
        this.ratingComment = '';
        this.ratingMessage = '';
        this.ratingSuccess = false;
      }
    }
  }

  get alreadyRated(): boolean {
    return (
      Boolean(this.request?.alreadyRated) ||
      (this.request?.ratings.some((rating) => rating.reviewer === this.currentUser) ?? false)
    );
  }

  get deliveryEnabled(): boolean {
    return (
      this.request?.status === 'En negociación' || this.request?.status === 'Aceptado'
    );
  }

  generateDeliveryCode(): void {
    if (!this.request || !this.deliveryEnabled || this.generatingCode) return;

    this.generatingCode = true;
    this.otpMessage = '';
    this.otpSuccess = false;

    this.exchanges.generateDeliveryCode(this.request.id).subscribe({
      next: (res) => {
        this.generatingCode = false;
        this.generatedCode = res.code;
        this.generatedExpiresAt = this.formatExpiration(res.expiresAt);
        this.otpSuccess = true;
        this.otpMessage = 'Código OTP generado y enviado al correo institucional.';
      },
      error: (err: HttpErrorResponse) => {
        this.generatingCode = false;
        this.otpSuccess = false;
        this.otpMessage =
          (err.error?.message as string | undefined) ||
          'No se pudo generar el código de entrega.';
      },
    });
  }

  updateOtp(event: Event): void {
    this.otpCode = (event.target as HTMLInputElement).value
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);
    this.otpMessage = '';
  }

  confirmDelivery(): void {
    if (!this.request || !this.deliveryEnabled || this.confirmingDelivery) return;
    if (this.otpCode.length !== 6) {
      this.otpSuccess = false;
      this.otpMessage = 'Ingresa los 6 caracteres alfanuméricos del código OTP.';
      return;
    }

    this.confirmingDelivery = true;
    this.otpMessage = '';
    this.otpSuccess = false;

    this.exchanges.confirmDeliveryWithOtp(this.request.id, this.otpCode).subscribe({
      next: () => {
        this.confirmingDelivery = false;
        this.otpCode = '';
        this.generatedCode = '';
        this.otpSuccess = true;
        this.otpMessage = 'Entrega presencial confirmada. La transacción pasó a COMPLETADA.';
        this.deliveryConfirmed.emit(true);
      },
      error: (err: HttpErrorResponse) => {
        this.confirmingDelivery = false;
        this.otpSuccess = false;
        const backendMessage = err.error?.message as string | undefined;
        if (err.status === 410) {
          this.otpMessage =
            backendMessage ||
            'El código OTP ha expirado (410 Gone). Genera un nuevo código de entrega.';
        } else if (err.status === 400) {
          this.otpMessage =
            backendMessage || 'El código OTP ingresado es incorrecto.';
        } else {
          this.otpMessage =
            backendMessage || 'No se pudo validar el código de entrega.';
        }
      },
    });
  }

  setRating(stars: number): void {
    this.selectedRating = stars;
    this.ratingMessage = '';
  }

  updateRatingComment(event: Event): void {
    this.ratingComment = (event.target as HTMLTextAreaElement).value;
  }

  submitRating(): void {
    if (!this.request || this.submittingRating) return;
    if (!this.selectedRating || this.selectedRating < 1 || this.selectedRating > 5) {
      this.ratingSuccess = false;
      this.ratingMessage = 'Selecciona una calificación de 1 a 5 estrellas.';
      return;
    }

    this.submittingRating = true;
    this.ratingMessage = '';
    this.ratingSuccess = false;

    this.exchanges
      .rateTransaction(this.request.id, this.selectedRating, this.ratingComment)
      .subscribe({
        next: (res) => {
          this.submittingRating = false;
          this.ratingSuccess = true;
          this.selectedRating = 0;
          this.ratingComment = '';
          this.ratingMessage = `Calificación registrada. Reputación actualizada: ${res.receptorReputacionPromedio.toFixed(2)} ★`;
        },
        error: (err: HttpErrorResponse) => {
          this.submittingRating = false;
          this.ratingSuccess = false;
          const backendMessage = err.error?.message as string | undefined;
          if (err.status === 409) {
            this.ratingMessage =
              backendMessage || 'Ya calificaste esta transacción anteriormente.';
          } else {
            this.ratingMessage =
              backendMessage || 'No se pudo registrar la calificación.';
          }
        },
      });
  }

  private formatExpiration(isoString: string): string {
    const parsed = Date.parse(isoString);
    if (Number.isNaN(parsed)) {
      return '15 minutos';
    }
    return new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }
}

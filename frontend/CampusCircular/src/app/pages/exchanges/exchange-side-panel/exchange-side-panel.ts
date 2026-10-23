import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ExchangeRequest, ExchangeRole, ExchangeService } from '../../../data/exchange.service';
import { MarketplaceMaterial } from '../../../data/material-catalog';
import { inject } from '@angular/core';

@Component({
  selector: 'app-exchange-side-panel',
  standalone: true,
  templateUrl: './exchange-side-panel.html',
  styleUrl: './exchange-side-panel.scss',
})
export class ExchangeSidePanel {
  private readonly exchanges = inject(ExchangeService);

  @Input() request: ExchangeRequest | undefined;
  @Input() material: MarketplaceMaterial | undefined;
  @Input() currentUser = '';
  @Input() counterparty = '';
  @Output() requestSelected = new EventEmitter<ExchangeRequest>();
  @Output() deliveryConfirmed = new EventEmitter<boolean>();

  otpCode = '';
  otpRole: ExchangeRole = 'owner';
  otpMessage = '';
  selectedRating = 0;
  ratingComment = '';
  ratingMessage = '';

  get alreadyRated(): boolean {
    return this.request?.ratings.some((rating) => rating.reviewer === this.currentUser) ?? false;
  }

  get deliveryEnabled(): boolean {
    return this.request?.status === 'Aceptado';
  }

  chooseRole(role: ExchangeRole): void {
    if (!this.request) return;
    this.otpRole = role;
    this.otpCode = '';
    this.otpMessage = '';
    this.requestSelected.emit(this.request);
  }

  updateOtp(event: Event): void {
    this.otpCode = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6);
    this.otpMessage = '';
  }

  confirmDelivery(): void {
    if (!this.request || !this.deliveryEnabled) return;
    if (this.otpCode.length !== 6) {
      this.otpMessage = 'Ingresa los 6 dígitos del código de prueba.';
      return;
    }
    const actor = this.otpRole === 'owner' ? this.request.owner : this.request.requester;
    const result = this.exchanges.confirmDelivery(this.request.id, actor, this.otpRole, this.otpCode);
    this.otpMessage = result.message;
    if (result.success) {
      this.otpCode = '';
      this.deliveryConfirmed.emit(result.message.startsWith('Ambas partes'));
    }
  }

  setRating(stars: number): void {
    this.selectedRating = stars;
    this.ratingMessage = '';
  }

  updateRatingComment(event: Event): void {
    this.ratingComment = (event.target as HTMLTextAreaElement).value;
  }

  submitRating(): void {
    if (!this.request || !this.selectedRating) {
      this.ratingMessage = 'Selecciona una calificación de 1 a 5 estrellas.';
      return;
    }
    const saved = this.exchanges.rate(this.request.id, this.currentUser, this.selectedRating, this.ratingComment);
    this.ratingMessage = saved ? 'Calificación de demostración enviada.' : 'Ya calificaste esta transacción o no está completada.';
    if (saved) {
      this.selectedRating = 0;
      this.ratingComment = '';
    }
  }
}

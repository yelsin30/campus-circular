import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { finalize } from 'rxjs';
import {
  ExchangeRequest,
  ExchangeService,
  TransactionMessage,
} from '../../../data/exchange.service';
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

  readonly otpCode = signal('');
  readonly generatedCode = signal('');
  readonly generatedExpiresAt = signal('');
  readonly generatingCode = signal(false);
  readonly confirmingDelivery = signal(false);
  readonly otpMessage = signal('');
  readonly otpSuccess = signal(false);

  readonly selectedRating = signal(0);
  readonly ratingComment = signal('');
  readonly ratingMessage = signal('');
  readonly ratingSuccess = signal(false);
  readonly submittingRating = signal(false);

  readonly messages = signal<TransactionMessage[]>([]);
  readonly loadingMessages = signal(false);
  readonly chatDraft = signal('');
  readonly sendingMessage = signal(false);
  readonly chatError = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['request']) {
      const prevId = (changes['request'].previousValue as ExchangeRequest | undefined)?.id;
      const nextRequest = changes['request'].currentValue as ExchangeRequest | undefined;
      const nextId = nextRequest?.id;
      if (prevId !== nextId) {
        this.otpCode.set('');
        this.generatedCode.set('');
        this.generatedExpiresAt.set('');
        this.generatingCode.set(false);
        this.confirmingDelivery.set(false);
        this.otpMessage.set('');
        this.otpSuccess.set(false);
        this.selectedRating.set(0);
        this.ratingComment.set('');
        this.ratingMessage.set('');
        this.ratingSuccess.set(false);
        this.chatDraft.set('');
        this.chatError.set('');
        this.messages.set([]);

        if (nextRequest) {
          this.loadMessages(nextRequest.id);
        }
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
    return this.request?.status === 'En negociación' || this.request?.status === 'Aceptado';
  }

  get chatWritable(): boolean {
    return (
      this.request?.status === 'Pendiente' ||
      this.request?.status === 'En negociación' ||
      this.request?.status === 'Aceptado'
    );
  }

  isOwnMessage(message: TransactionMessage): boolean {
    const currentUserId = this.exchanges.currentUserId;
    if (currentUserId !== undefined && message.idEmisor === currentUserId) {
      return true;
    }
    if (this.currentUser && message.correoEmisor) {
      return message.correoEmisor.toLowerCase() === this.currentUser.toLowerCase();
    }
    return false;
  }

  loadMessages(transactionId?: string): void {
    const id = transactionId ?? this.request?.id;
    if (!id) return;

    this.loadingMessages.set(true);
    this.chatError.set('');
    this.exchanges
      .getMessages(id)
      .pipe(finalize(() => this.loadingMessages.set(false)))
      .subscribe({
        next: (items) => {
          this.messages.set(items ?? []);
        },
        error: (err: HttpErrorResponse) => {
          this.chatError.set(
            (err.error?.message as string | undefined) ||
              'No se pudieron cargar los mensajes de coordinación.',
          );
        },
      });
  }

  updateChatDraft(event: Event): void {
    this.chatDraft.set((event.target as HTMLInputElement).value);
    if (this.chatError()) {
      this.chatError.set('');
    }
  }

  sendChatMessage(): void {
    if (!this.request || !this.chatWritable || this.sendingMessage()) return;
    const text = this.chatDraft().trim();
    if (!text) return;

    this.sendingMessage.set(true);
    this.chatError.set('');
    this.exchanges
      .sendMessage(this.request.id, text)
      .pipe(finalize(() => this.sendingMessage.set(false)))
      .subscribe({
        next: (created) => {
          this.messages.update((current) => [...current, created]);
          this.chatDraft.set('');
        },
        error: (err: HttpErrorResponse) => {
          this.chatError.set(
            (err.error?.message as string | undefined) || 'No se pudo enviar el mensaje.',
          );
        },
      });
  }

  formatMessageTime(isoString: string): string {
    const parsed = Date.parse(isoString);
    if (Number.isNaN(parsed)) return '';
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }

  generateDeliveryCode(): void {
    if (!this.request || !this.deliveryEnabled || this.generatingCode()) return;

    this.generatingCode.set(true);
    this.otpMessage.set('');
    this.otpSuccess.set(false);

    this.exchanges
      .generateDeliveryCode(this.request.id)
      .pipe(finalize(() => this.generatingCode.set(false)))
      .subscribe({
        next: (res) => {
          this.generatedCode.set(res.code);
          this.generatedExpiresAt.set(this.formatExpiration(res.expiresAt));
          this.otpSuccess.set(true);
          this.otpMessage.set('Código OTP generado y enviado al correo institucional.');
        },
        error: (err: HttpErrorResponse) => {
          this.otpSuccess.set(false);
          this.otpMessage.set(
            (err.error?.message as string | undefined) ||
              'No se pudo generar el código de entrega.',
          );
        },
      });
  }

  updateOtp(event: Event): void {
    const cleaned = (event.target as HTMLInputElement).value
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);
    this.otpCode.set(cleaned);
    this.otpMessage.set('');
  }

  confirmDelivery(): void {
    if (!this.request || !this.deliveryEnabled || this.confirmingDelivery()) return;
    if (this.otpCode().length !== 6) {
      this.otpSuccess.set(false);
      this.otpMessage.set('Ingresa los 6 caracteres alfanuméricos del código OTP.');
      return;
    }

    this.confirmingDelivery.set(true);
    this.otpMessage.set('');
    this.otpSuccess.set(false);

    this.exchanges
      .confirmDeliveryWithOtp(this.request.id, this.otpCode())
      .pipe(finalize(() => this.confirmingDelivery.set(false)))
      .subscribe({
        next: () => {
          this.otpCode.set('');
          this.generatedCode.set('');
          this.otpSuccess.set(true);
          this.otpMessage.set('Entrega presencial confirmada. La transacción pasó a COMPLETADA.');
          this.deliveryConfirmed.emit(true);
        },
        error: (err: HttpErrorResponse) => {
          this.otpSuccess.set(false);
          const backendMessage = err.error?.message as string | undefined;
          if (err.status === 410) {
            this.otpMessage.set(
              backendMessage ||
                'El código OTP ha expirado (410 Gone). Genera un nuevo código de entrega.',
            );
          } else if (err.status === 400) {
            this.otpMessage.set(backendMessage || 'El código OTP ingresado es incorrecto.');
          } else {
            this.otpMessage.set(backendMessage || 'No se pudo validar el código de entrega.');
          }
        },
      });
  }

  setRating(stars: number): void {
    this.selectedRating.set(stars);
    this.ratingMessage.set('');
  }

  updateRatingComment(event: Event): void {
    this.ratingComment.set((event.target as HTMLTextAreaElement).value);
  }

  submitRating(): void {
    if (!this.request || this.submittingRating()) return;
    const score = this.selectedRating();
    if (!score || score < 1 || score > 5) {
      this.ratingSuccess.set(false);
      this.ratingMessage.set('Selecciona una calificación de 1 a 5 estrellas.');
      return;
    }

    this.submittingRating.set(true);
    this.ratingMessage.set('');
    this.ratingSuccess.set(false);

    this.exchanges
      .rateTransaction(this.request.id, score, this.ratingComment())
      .pipe(finalize(() => this.submittingRating.set(false)))
      .subscribe({
        next: (res) => {
          this.ratingSuccess.set(true);
          this.selectedRating.set(0);
          this.ratingComment.set('');
          this.ratingMessage.set(
            `Calificación registrada. Reputación actualizada: ${res.receptorReputacionPromedio.toFixed(2)} ★`,
          );
        },
        error: (err: HttpErrorResponse) => {
          this.ratingSuccess.set(false);
          const backendMessage = err.error?.message as string | undefined;
          if (err.status === 409) {
            this.ratingMessage.set(
              backendMessage || 'Ya calificaste esta transacción anteriormente.',
            );
          } else {
            this.ratingMessage.set(backendMessage || 'No se pudo registrar la calificación.');
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

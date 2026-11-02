import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ExchangeRequest, ExchangeTab } from '../../../data/exchange.service';
import { MarketplaceMaterial } from '../../../data/material-catalog';
import { MaterialArtwork } from '../../../shared/material-artwork/material-artwork';

export type ExchangeRowAction = 'select' | 'accept' | 'reject' | 'negotiate' | 'accept-negotiation' | 'reject-negotiation' | 'cancel' | 'agreement';

@Component({
  selector: 'app-exchange-request-row',
  standalone: true,
  imports: [MaterialArtwork],
  templateUrl: './exchange-request-row.html',
  styleUrl: './exchange-request-row.scss',
})
export class ExchangeRequestRow {
  @Input({ required: true }) request!: ExchangeRequest;
  @Input({ required: true }) material!: MarketplaceMaterial;
  @Input() currentUser = '';
  @Input() activeTab: ExchangeTab = 'received';
  @Input() selected = false;
  @Input() agreementDetailsVisible = false;
  @Input() alreadyRated = false;
  @Output() action = new EventEmitter<{ type: ExchangeRowAction; request: ExchangeRequest }>();

  get counterparty(): string {
    return this.request.owner === this.currentUser ? this.request.requester : this.request.owner;
  }

  get statusClass(): string {
    return `status-${this.request.status.toLocaleLowerCase('es').replace(/\s+/g, '-')}`;
  }

  emit(type: ExchangeRowAction, event?: Event): void {
    event?.stopPropagation();
    this.action.emit({ type, request: this.request });
  }
}

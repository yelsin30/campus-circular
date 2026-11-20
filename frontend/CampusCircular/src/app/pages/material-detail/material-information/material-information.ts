import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketplaceMaterial } from '../../../data/material-catalog';

@Component({
  selector: 'app-material-information',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './material-information.html',
  styleUrl: './material-information.scss',
})
export class MaterialInformation {
  @Input({ required: true }) material!: MarketplaceMaterial;
  @Input() isSaved = false;
  @Input() shareMessage = '';
  @Input() existingTransactionId: string | null = null;
  @Input() existingTransactionStatus: string | null = null;
  @Output() saveToggled = new EventEmitter<void>();
  @Output() requestOpened = new EventEmitter<void>();
  @Output() reportOpened = new EventEmitter<void>();
  @Output() shareRequested = new EventEmitter<void>();
}

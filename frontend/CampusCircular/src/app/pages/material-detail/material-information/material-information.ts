import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MarketplaceMaterial } from '../../../data/material-catalog';

@Component({
  selector: 'app-material-information',
  standalone: true,
  templateUrl: './material-information.html',
  styleUrl: './material-information.scss',
})
export class MaterialInformation {
  @Input({ required: true }) material!: MarketplaceMaterial;
  @Input() isSaved = false;
  @Input() shareMessage = '';
  @Output() saveToggled = new EventEmitter<void>();
  @Output() requestOpened = new EventEmitter<void>();
  @Output() reportOpened = new EventEmitter<void>();
  @Output() shareRequested = new EventEmitter<void>();
}

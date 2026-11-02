import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketplaceMaterial } from '../../../data/material-catalog';
import { MaterialArtwork } from '../../../shared/material-artwork/material-artwork';

@Component({
  selector: 'app-material-card',
  standalone: true,
  imports: [RouterLink, MaterialArtwork],
  templateUrl: './material-card.html',
  styleUrl: './material-card.scss',
})
export class MaterialCard {
  @Input({ required: true }) material!: MarketplaceMaterial;
  @Input() favorite = false;
  @Output() favoriteToggled = new EventEmitter<string>();
}
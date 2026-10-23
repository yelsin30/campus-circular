import { Component, Input } from '@angular/core';
import { MaterialArt } from '../../data/material-catalog';

@Component({
  selector: 'app-material-artwork',
  standalone: true,
  templateUrl: './material-artwork.html',
  styleUrl: './material-artwork.scss',
})
export class MaterialArtwork {
  @Input({ required: true }) art!: MaterialArt;
  @Input() variant = 0;
}
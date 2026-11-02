import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MaterialArt } from '../../../data/material-catalog';
import { MaterialArtwork } from '../../../shared/material-artwork/material-artwork';

@Component({
  selector: 'app-material-gallery',
  standalone: true,
  imports: [MaterialArtwork],
  templateUrl: './material-gallery.html',
  styleUrl: './material-gallery.scss',
})
export class MaterialGallery {
  @Input({ required: true }) art!: MaterialArt;
  @Input() background = '#f0f2f4';
  @Input() activeView = 0;
  @Input() images: string[] = [];
  @Output() viewSelected = new EventEmitter<number>();
  readonly views = [0, 1, 2];
}
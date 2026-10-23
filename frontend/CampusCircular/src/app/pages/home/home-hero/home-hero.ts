import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.scss',
})
export class HomeHero {
  @Input() searchTerm = '';
  @Output() searchChanged = new EventEmitter<string>();

  updateSearch(event: Event): void {
    this.searchChanged.emit((event.target as HTMLInputElement).value);
  }
}
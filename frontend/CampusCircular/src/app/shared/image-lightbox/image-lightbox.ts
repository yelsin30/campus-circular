import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  templateUrl: './image-lightbox.html',
  styleUrl: './image-lightbox.scss',
})
export class ImageLightbox {
  @Input() images: string[] = [];
  @Input() activeIndex = 0;
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();
  @Output() indexChanged = new EventEmitter<number>();

  get currentImage(): string {
    return this.images[this.activeIndex] || this.images[0] || '';
  }

  get hasMultiple(): boolean {
    return this.images.length > 1;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.arrowright')
  onArrowRight(): void {
    if (this.hasMultiple) {
      this.next();
    }
  }

  @HostListener('document:keydown.arrowleft')
  onArrowLeft(): void {
    if (this.hasMultiple) {
      this.prev();
    }
  }

  prev(event?: Event): void {
    event?.stopPropagation();
    if (!this.hasMultiple) return;
    const nextIdx = (this.activeIndex - 1 + this.images.length) % this.images.length;
    this.activeIndex = nextIdx;
    this.indexChanged.emit(nextIdx);
  }

  next(event?: Event): void {
    event?.stopPropagation();
    if (!this.hasMultiple) return;
    const nextIdx = (this.activeIndex + 1) % this.images.length;
    this.activeIndex = nextIdx;
    this.indexChanged.emit(nextIdx);
  }

  close(event?: Event): void {
    event?.stopPropagation();
    this.closed.emit();
  }
}

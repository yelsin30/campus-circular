import { isPlatformBrowser } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, PLATFORM_ID } from '@angular/core';

export interface ImagePreview {
  name: string;
  dataUrl: string;
}

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DIMENSION_PX = 800;
const JPEG_QUALITY = 0.75;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-photo-upload',
  standalone: true,
  templateUrl: './photo-upload.html',
  styleUrl: './photo-upload.scss',
})
export class PhotoUpload {
  private readonly platformId = inject(PLATFORM_ID);

  @Input() previews: ImagePreview[] = [];
  @Output() previewsChange = new EventEmitter<ImagePreview[]>();
  @Input() photoErrors: string[] = [];
  @Output() photoErrorsChange = new EventEmitter<string[]>();

  isDragging = false;

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    void this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(): void {
    this.isDragging = false;
  }

  removeImage(index: number): void {
    this.previews = this.previews.filter((_, previewIndex) => previewIndex !== index);
    this.previewsChange.emit(this.previews);
    this.setErrors([]);
  }

  private async addFiles(files: File[]): Promise<void> {
    const errors: string[] = [];
    this.setErrors([]);
    if (!isPlatformBrowser(this.platformId)) return;

    for (const file of files) {
      if (this.previews.length >= MAX_IMAGES) {
        errors.push(`Puedes cargar hasta ${MAX_IMAGES} imágenes.`);
        break;
      }
      if (!IMAGE_TYPES.includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name)) {
        errors.push(`${file.name}: utiliza una imagen JPG, PNG o WebP.`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: supera el máximo de 5 MB.`);
        continue;
      }
      try {
        const dataUrl = await this.compressImage(file);
        this.previews = [...this.previews, { name: file.name, dataUrl }];
        this.previewsChange.emit(this.previews);
      } catch {
        errors.push(`${file.name}: no se pudo procesar la imagen.`);
      }
    }
    this.setErrors(errors);
  }

  private setErrors(errors: string[]): void {
    this.photoErrors = errors;
    this.photoErrorsChange.emit(errors);
  }

  private async compressImage(file: File): Promise<string> {
    const rawDataUrl = await this.readImage(file);
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      return rawDataUrl;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
            if (width >= height) {
              height = Math.max(1, Math.round((height * MAX_DIMENSION_PX) / width));
              width = MAX_DIMENSION_PX;
            } else {
              width = Math.max(1, Math.round((width * MAX_DIMENSION_PX) / height));
              height = MAX_DIMENSION_PX;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
          resolve(compressed && compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    });
  }

  private readImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('Formato inválido'));
      reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });
  }
}

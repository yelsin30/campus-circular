import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ExchangeMode, MaterialCategory, MarketplaceMaterial } from '../../data/material-catalog';
import { CreatePublicationRequestDto, PublicationService } from '../../data/publication.service';
import { ImagePreview, PhotoUpload } from './photo-upload/photo-upload';

@Component({
  selector: 'app-publish-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PhotoUpload],
  templateUrl: './publish.html',
  styleUrl: './publish.scss',
})
export class PublishPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly publicationService = inject(PublicationService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly careers = [
    'Ingeniería de Sistemas',
    'Ingeniería Industrial',
    'Arquitectura',
    'Administración',
    'Derecho',
    'Psicología',
    'Comunicaciones',
  ];
  readonly categories: MaterialCategory[] = ['Libros', 'Apuntes', 'Equipos', 'Materiales', 'Otros'];
  readonly conditions = ['Nuevo', 'Seminuevo', 'En buen estado', 'Aceptable', 'Repuestos / Scrap (RAEE)'];
  readonly modes: ExchangeMode[] = ['Donación', 'Trueque', 'Precio solidario'];

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.pattern(/.*\S.*/), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.pattern(/.*\S.*/), Validators.maxLength(1000)]],
    career: ['', Validators.required],
    category: ['' as MaterialCategory | '', Validators.required],
    condition: ['' as string, Validators.required],
    mode: ['Trueque' as ExchangeMode | '', Validators.required],
    price: [''],
  });

  readonly previews = signal<ImagePreview[]>([]);
  readonly photoErrors = signal<string[]>([]);
  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly publishMessage = signal('');
  readonly publishedMaterial = signal<MarketplaceMaterial | null>(null);

  constructor() {
    this.form.controls.mode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mode) => this.setPriceValidation(mode));
  }

  get priceModeSelected(): boolean {
    return this.form.controls.mode.value === 'Precio solidario';
  }

  get hasUnsavedChanges(): boolean {
    return this.form.dirty || this.previews().length > 0;
  }

  fieldInvalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  updatePreviews(previews: ImagePreview[]): void {
    this.previews.set(previews);
  }

  updatePhotoErrors(errors: string[]): void {
    this.photoErrors.set(errors);
  }

  cancel(): void {
    if (
      this.hasUnsavedChanges &&
      isPlatformBrowser(this.platformId) &&
      !globalThis.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos?')
    ) {
      return;
    }

    void this.router.navigateByUrl('/inicio');
  }

  publish(): void {
    if (this.submitting()) return;

    this.submitted.set(true);
    this.publishMessage.set('');
    this.form.markAllAsTouched();

    if (this.form.invalid || this.photoErrors().length > 0) {
      this.publishMessage.set(
        'Revisa los campos obligatorios y corrige los archivos indicados antes de publicar.',
      );
      return;
    }

    const value = this.form.getRawValue();
    const mode = value.mode as ExchangeMode;
    const category = value.category as MaterialCategory;
    const categoryId = this.publicationService.toCategoryId(category) ?? 1;
    const modalidad = this.publicationService.toBackendModality(mode);
    const condicion = this.publicationService.toBackendCondition(value.condition);
    const precioSolidario = modalidad === 'VENTA_SOLIDARIA' ? Number(value.price) : null;
    const imageUrls = this.previews().map((preview) => preview.dataUrl);

    const payload: CreatePublicationRequestDto = {
      categoryId,
      titulo: value.title.trim(),
      descripcion: value.description.trim(),
      condicion,
      modalidad,
      precioSolidario,
      carrera: value.career || null,
      imagenUrl: imageUrls[0] ?? null,
      imagenes: imageUrls,
    };

    this.submitting.set(true);
    this.publicationService
      .createPublication(payload)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.previews.set([]);
          this.photoErrors.set([]);
          this.form.reset({
            title: '',
            description: '',
            career: '',
            category: '',
            condition: '',
            mode: 'Trueque',
            price: '',
          });
          this.form.markAsPristine();
          this.form.markAsUntouched();
          this.submitted.set(false);
          void this.router.navigateByUrl('/inicio');
        },
        error: (err: HttpErrorResponse) => {
          const backendMsg = err.error?.message as string | undefined;
          if (err.status === 401 || err.status === 403) {
            this.publishMessage.set(
              backendMsg || 'Debes iniciar sesión con una cuenta activa para publicar.',
            );
          } else if (err.status === 400) {
            this.publishMessage.set(
              backendMsg || 'Datos inválidos. Verifica que el precio solidario no supere S/ 80.00.',
            );
          } else {
            this.publishMessage.set(
              backendMsg || 'No se pudo registrar la publicación en el servidor.',
            );
          }
        },
      });
  }

  private setPriceValidation(mode: string): void {
    const priceControl = this.form.controls.price;
    if (mode === 'Precio solidario' || mode === 'VENTA_SOLIDARIA') {
      priceControl.setValidators([
        Validators.required,
        Validators.pattern(/^\d+(?:\.\d{1,2})?$/),
        Validators.min(0.01),
        Validators.max(80),
      ]);
    } else {
      priceControl.clearValidators();
      priceControl.setValue('');
    }
    priceControl.updateValueAndValidity({ emitEvent: false });
  }
}

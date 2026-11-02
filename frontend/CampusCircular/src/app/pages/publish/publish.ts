import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExchangeMode, MaterialArt, MaterialCategory, MarketplaceMaterial } from '../../data/material-catalog';
import { MaterialCatalogService } from '../../data/material-catalog.service';
import { ModerationService } from '../../data/moderation.service';
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
  private readonly catalog = inject(MaterialCatalogService);
  private readonly moderation = inject(ModerationService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly careers = [
    'Ingeniería de Sistemas',
    'Ingeniería Industrial',
    'Arquitectura',
    'Derecho',
    'Psicología',
    'Administración',
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
    mode: ['' as ExchangeMode | '', Validators.required],
    price: [''],
  });

  previews: ImagePreview[] = [];
  photoErrors: string[] = [];
  submitted = false;
  publishMessage = '';
  publishedMaterial: MarketplaceMaterial | null = null;
  private publicationSequence = 0;

  constructor() {
    this.form.controls.mode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mode) => this.setPriceValidation(mode));
  }

  get priceModeSelected(): boolean {
    return this.form.controls.mode.value === 'Precio solidario';
  }

  get hasUnsavedChanges(): boolean {
    return this.form.dirty || this.previews.length > 0;
  }

  fieldInvalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted);
  }

  updatePreviews(previews: ImagePreview[]): void {
    this.previews = previews;
  }

  cancel(): void {
    if (this.hasUnsavedChanges && isPlatformBrowser(this.platformId) && !globalThis.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos?')) {
      return;
    }

    void this.router.navigateByUrl('/inicio');
  }

  async publish(): Promise<void> {
    this.submitted = true;
    this.form.markAllAsTouched();

    if (this.moderation.isUserSuspended('María Pérez')) {
      this.publishMessage = 'La cuenta de demostración está suspendida y no puede publicar materiales.';
      return;
    }

    if (this.form.invalid || this.photoErrors.length > 0) {
      this.publishMessage = 'Revisa los campos obligatorios y corrige los archivos indicados antes de publicar.';
      return;
    }

    const value = this.form.getRawValue();
    const mode = value.mode as ExchangeMode;
    const category = value.category as MaterialCategory;
    const id = this.createMaterialId();
    const art = this.artForCategory(category);
    const imageData = this.previews.map((preview) => preview.dataUrl);
    const price = mode === 'Precio solidario' ? Number(value.price) : undefined;

    const material: MarketplaceMaterial = {
      id,
      title: value.title.trim(),
      category,
      career: value.career,
      condition: value.condition === 'Repuestos / Scrap (RAEE)' ? 'Repuestos / Scrap' : value.condition as MarketplaceMaterial['condition'],
      mode,
      owner: 'María Pérez',
      initials: 'MP',
      ...(price === undefined ? {} : { price }),
      art,
      background: this.backgroundForCategory(category),
      publishedAt: Date.now() + this.publicationSequence,
      publishedLabel: 'ahora',
      campus: 'Sede Breña · Lima',
      publisher: 'María Pérez',
      description: value.description.trim(),
      rating: 5,
      ratingCount: 0,
      offeredExamples: mode === 'Trueque' ? ['Material por acordar con el propietario'] : [],
      ...(imageData.length ? { images: imageData } : {}),
    };

    this.catalog.publish(material);
    this.publishedMaterial = material;
    this.publishMessage = 'Publicación de demostración agregada al catálogo en memoria. Se perderá al recargar la aplicación.';
    this.previews = [];
    this.photoErrors = [];
    this.form.reset({ title: '', description: '', career: '', category: '', condition: '', mode: '', price: '' });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.submitted = false;
  }

  private setPriceValidation(mode: string): void {
    const priceControl = this.form.controls.price;
    if (mode === 'Precio solidario') {
      priceControl.setValidators([
        Validators.required,
        Validators.pattern(/^\d+(?:\.\d{1,2})?$/),
        Validators.min(0.01),
      ]);
    } else {
      priceControl.clearValidators();
      priceControl.setValue('');
    }
    priceControl.updateValueAndValidity({ emitEvent: false });
  }

  private createMaterialId(): string {
    this.publicationSequence += 1;
    return `material-${Date.now().toString(36)}-${this.publicationSequence.toString(36)}`;
  }

  private artForCategory(category: MaterialCategory): MaterialArt {
    switch (category) {
      case 'Libros': return 'calculus';
      case 'Apuntes': return 'notes';
      case 'Equipos': return 'calculator';
      case 'Materiales': return 'backpack';
      case 'Otros': return 'arduino';
    }
  }

  private backgroundForCategory(category: MaterialCategory): string {
    switch (category) {
      case 'Libros': return '#f0f2f4';
      case 'Apuntes': return '#f4f2ec';
      case 'Equipos': return '#eef1f4';
      case 'Materiales': return '#edf1e7';
      case 'Otros': return '#f2f0e8';
    }
  }
}
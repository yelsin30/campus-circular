import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ExchangeMode, MarketplaceMaterial, MaterialCondition } from '../../data/material-catalog';
import {
  normalizeFilterText,
  PublicationQueryParams,
  PublicationService,
} from '../../data/publication.service';
import { CategoryNav } from './category-nav/category-nav';
import { HomeHero } from './home-hero/home-hero';
import { MaterialCard } from './material-card/material-card';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [HomeHero, CategoryNav, MaterialCard],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {
  private readonly publicationService = inject(PublicationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly categories: { label: string; icon: string }[] = [
    { label: 'Todos', icon: 'all' },
    { label: 'Libros', icon: 'book' },
    { label: 'Apuntes', icon: 'notes' },
    { label: 'Equipos', icon: 'equipment' },
    { label: 'Materiales', icon: 'shield' },
    { label: 'Otros', icon: 'exchange' },
  ];

  readonly careers: string[] = [
    'Todas las carreras',
    'Ingeniería de Sistemas',
    'Ingeniería Industrial',
    'Arquitectura',
    'Administración',
    'Derecho',
    'Psicología',
    'Comunicaciones',
  ];

  readonly conditions: MaterialCondition[] = [
    'Nuevo',
    'Seminuevo',
    'En buen estado',
    'Aceptable',
    'Repuestos / Scrap',
  ];

  readonly modes: ExchangeMode[] = ['Trueque', 'Donación', 'Precio solidario'];

  readonly publications = signal<MarketplaceMaterial[]>([]);
  readonly isLoading = signal(false);
  readonly selectedCategory = signal('Todos');
  readonly selectedCareer = signal('Todas las carreras');
  readonly selectedConditions = signal<Set<MaterialCondition>>(new Set());
  readonly selectedModes = signal<Set<ExchangeMode>>(new Set());
  readonly searchTerm = signal('');
  readonly sortOrder = signal('recent');
  readonly favorites = signal<Set<string>>(new Set());

  readonly filteredMaterials = computed<MarketplaceMaterial[]>(() => {
    const selectedCategoryNorm = normalizeFilterText(this.selectedCategory());
    const selectedCareerNorm = normalizeFilterText(this.selectedCareer());
    const selectedConditionsNorm = new Set(
      [...this.selectedConditions()].map((c) => this.publicationService.toBackendCondition(c)),
    );
    const selectedModesNorm = new Set(
      [...this.selectedModes()].map((m) => this.publicationService.toBackendModality(m)),
    );
    const queryNorm = normalizeFilterText(this.searchTerm());

    const list = this.publications().filter((material) => {
      const matchesCategory =
        selectedCategoryNorm === 'todos' ||
        normalizeFilterText(material.category) === selectedCategoryNorm;

      const matchesCareer =
        selectedCareerNorm === 'todas las carreras' ||
        normalizeFilterText(material.career).includes(selectedCareerNorm);

      const matchesConditions =
        selectedConditionsNorm.size === 0 ||
        selectedConditionsNorm.has(this.publicationService.toBackendCondition(material.condition));

      const matchesModes =
        selectedModesNorm.size === 0 ||
        selectedModesNorm.has(
          material.backendModality ?? this.publicationService.toBackendModality(material.mode),
        );

      const matchesQuery =
        !queryNorm ||
        normalizeFilterText(
          `${material.title} ${material.description} ${material.category} ${material.career} ${material.owner}`,
        ).includes(queryNorm);

      return matchesCategory && matchesCareer && matchesConditions && matchesModes && matchesQuery;
    });

    const sort = this.sortOrder();
    return [...list].sort((first, second) =>
      sort === 'price'
        ? (first.price ?? 0) - (second.price ?? 0)
        : second.publishedAt - first.publishedAt,
    );
  });

  constructor() {
    afterNextRender(() => {
      this.fetchPublications();
    });
  }

  onSearchChanged(term: string): void {
    this.searchTerm.set(term);
    this.fetchPublications();
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.fetchPublications();
  }

  updateCareer(event: Event): void {
    this.selectedCareer.set((event.target as HTMLSelectElement).value);
    this.fetchPublications();
  }

  toggleCondition(condition: MaterialCondition, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedConditions.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(condition);
      } else {
        next.delete(condition);
      }
      return next;
    });
    this.fetchPublications();
  }

  toggleMode(mode: ExchangeMode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedModes.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(mode);
      } else {
        next.delete(mode);
      }
      return next;
    });
    this.fetchPublications();
  }

  toggleFavorite(id: string): void {
    this.favorites.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  onFavoriteToggled(id: string): void {
    this.toggleFavorite(id);
  }

  clearFilters(): void {
    this.selectedCategory.set('Todos');
    this.selectedCareer.set('Todas las carreras');
    this.selectedConditions.set(new Set());
    this.selectedModes.set(new Set());
    this.searchTerm.set('');
    this.sortOrder.set('recent');
    this.fetchPublications();
  }

  updateSort(event: Event): void {
    this.sortOrder.set((event.target as HTMLSelectElement).value);
  }

  private fetchPublications(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const conditions = [...this.selectedConditions()];
    const modes = [...this.selectedModes()];
    const categorySlug = this.publicationService.toCategorySlug(this.selectedCategory());
    const career = this.selectedCareer();
    const query = this.searchTerm().trim();

    const queryParams: PublicationQueryParams = {
      ...(normalizeFilterText(career) !== 'todas las carreras' ? { carrera: career } : {}),
      ...(categorySlug ? { category: categorySlug } : {}),
      ...(conditions.length === 1
        ? { condition: this.publicationService.toBackendCondition(conditions[0]) }
        : {}),
      ...(modes.length === 1
        ? { modality: this.publicationService.toBackendModality(modes[0]) }
        : {}),
      ...(query ? { q: query } : {}),
      page: 0,
      size: 50,
    };

    this.isLoading.set(true);
    this.publicationService
      .getPublications(queryParams)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((items) => {
        this.publications.set(items);
      });
  }
}

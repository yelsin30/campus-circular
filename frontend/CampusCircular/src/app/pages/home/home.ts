import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ExchangeMode, MarketplaceMaterial, MaterialCondition } from '../../data/material-catalog';
import { PublicationQueryParams, PublicationService } from '../../data/publication.service';
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
export class HomePage implements OnInit {
  private readonly publicationService = inject(PublicationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories: { label: string; icon: string }[] = [
    { label: 'Todos', icon: 'all' },
    { label: 'Libros', icon: 'book' },
    { label: 'Apuntes', icon: 'notes' },
    { label: 'Equipos', icon: 'equipment' },
    { label: 'Materiales', icon: 'shield' },
    { label: 'Otros', icon: 'exchange' },
  ];

  readonly conditions: MaterialCondition[] = [
    'Nuevo',
    'Seminuevo',
    'En buen estado',
    'Aceptable',
    'Repuestos / Scrap',
  ];

  readonly modes: ExchangeMode[] = ['Trueque', 'Donación', 'Precio solidario'];

  selectedCategory = 'Todos';
  selectedCareer = 'Todas las carreras';
  selectedConditions = new Set<MaterialCondition>();
  selectedModes = new Set<ExchangeMode>();
  searchTerm = '';
  sortOrder = 'recent';
  favorites = new Set<string>();
  materials: MarketplaceMaterial[] = [];

  ngOnInit(): void {
    this.fetchPublications();
  }

  get filteredMaterials(): MarketplaceMaterial[] {
    const list = this.materials.filter((material) => {
      const matchesConditions =
        this.selectedConditions.size <= 1 || this.selectedConditions.has(material.condition);
      const matchesModes =
        this.selectedModes.size <= 1 || this.selectedModes.has(material.mode);
      return matchesConditions && matchesModes;
    });

    return [...list].sort((first, second) =>
      this.sortOrder === 'price'
        ? (first.price ?? 0) - (second.price ?? 0)
        : second.publishedAt - first.publishedAt,
    );
  }

  onSearchChanged(term: string): void {
    this.searchTerm = term;
    this.fetchPublications();
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.fetchPublications();
  }

  updateCareer(event: Event): void {
    this.selectedCareer = (event.target as HTMLSelectElement).value;
    this.fetchPublications();
  }

  toggleCondition(condition: MaterialCondition, event: Event): void {
    this.toggleFilter(this.selectedConditions, condition, event);
    this.fetchPublications();
  }

  toggleMode(mode: ExchangeMode, event: Event): void {
    this.toggleFilter(this.selectedModes, mode, event);
    this.fetchPublications();
  }

  toggleFavorite(id: string): void {
    const next = new Set(this.favorites);
    next.has(id) ? next.delete(id) : next.add(id);
    this.favorites = next;
  }

  onFavoriteToggled(id: string): void {
    this.toggleFavorite(id);
  }

  clearFilters(): void {
    this.selectedCategory = 'Todos';
    this.selectedCareer = 'Todas las carreras';
    this.selectedConditions = new Set<MaterialCondition>();
    this.selectedModes = new Set<ExchangeMode>();
    this.searchTerm = '';
    this.sortOrder = 'recent';
    this.fetchPublications();
  }

  updateSort(event: Event): void {
    this.sortOrder = (event.target as HTMLSelectElement).value;
  }

  private fetchPublications(): void {
    const firstCondition = [...this.selectedConditions][0];
    const firstMode = [...this.selectedModes][0];
    const categoryId =
      this.selectedCategory !== 'Todos'
        ? this.publicationService.toCategoryId(this.selectedCategory)
        : undefined;

    const queryParams: PublicationQueryParams = {
      ...(this.selectedCareer !== 'Todas las carreras' ? { carrera: this.selectedCareer } : {}),
      ...(categoryId !== undefined ? { category: categoryId } : {}),
      ...(firstCondition
        ? { condition: this.publicationService.toBackendCondition(firstCondition) }
        : {}),
      ...(firstMode ? { modality: this.publicationService.toBackendModality(firstMode) } : {}),
      ...(this.searchTerm.trim() ? { q: this.searchTerm.trim() } : {}),
      page: 0,
      size: 20,
    };

    this.publicationService
      .getPublications(queryParams)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.materials = items;
      });
  }

  private toggleFilter<T>(selected: Set<T>, value: T, event: Event): void {
    const next = new Set(selected);
    (event.target as HTMLInputElement).checked ? next.add(value) : next.delete(value);

    if (this.conditions.includes(value as MaterialCondition)) {
      this.selectedConditions = next as Set<MaterialCondition>;
    } else {
      this.selectedModes = next as Set<ExchangeMode>;
    }
  }
}

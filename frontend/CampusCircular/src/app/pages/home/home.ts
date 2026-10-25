import { Component, inject } from '@angular/core';
import { MaterialCondition, ExchangeMode } from '../../data/material-catalog';
import { MaterialCatalogService } from '../../data/material-catalog.service';
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
  private readonly catalog = inject(MaterialCatalogService);
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

  get filteredMaterials() {
    const query = this.searchTerm.trim().toLocaleLowerCase('es');
    const filtered = this.catalog.publicMaterials().filter((material) => {
      const matchesCategory = this.selectedCategory === 'Todos' || material.category === this.selectedCategory;
      const matchesCareer = this.selectedCareer === 'Todas las carreras' || material.career.startsWith(this.selectedCareer);
      const matchesConditions = this.selectedConditions.size === 0 || this.selectedConditions.has(material.condition);
      const matchesModes = this.selectedModes.size === 0 || this.selectedModes.has(material.mode);
      const matchesQuery = !query || `${material.title} ${material.category} ${material.owner}`
        .toLocaleLowerCase('es')
        .includes(query);

      return matchesCategory && matchesCareer && matchesConditions && matchesModes && matchesQuery;
    });

    return filtered.sort((first, second) => this.sortOrder === 'price'
      ? (first.price ?? 0) - (second.price ?? 0)
      : second.publishedAt - first.publishedAt);
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  updateCareer(event: Event): void {
    this.selectedCareer = (event.target as HTMLSelectElement).value;
  }

  toggleCondition(condition: MaterialCondition, event: Event): void {
    this.toggleFilter(this.selectedConditions, condition, event);
  }

  toggleMode(mode: ExchangeMode, event: Event): void {
    this.toggleFilter(this.selectedModes, mode, event);
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
  }

  updateSort(event: Event): void {
    this.sortOrder = (event.target as HTMLSelectElement).value;
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
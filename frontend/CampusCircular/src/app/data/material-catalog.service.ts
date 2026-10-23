import { Injectable, signal } from '@angular/core';
import { MATERIAL_CATALOG, MarketplaceMaterial } from './material-catalog';

@Injectable({ providedIn: 'root' })
export class MaterialCatalogService {
  private readonly catalogSignal = signal<MarketplaceMaterial[]>([...MATERIAL_CATALOG]);
  readonly materials = this.catalogSignal.asReadonly();

  findById(id: string | null | undefined): MarketplaceMaterial | undefined {
    return this.catalogSignal().find((material) => material.id === id);
  }

  publish(material: MarketplaceMaterial): void {
    this.catalogSignal.update((catalog) => [material, ...catalog]);
  }
}
import { computed, Injectable, signal } from '@angular/core';
import { MATERIAL_CATALOG, MarketplaceMaterial, PublicationStatus } from './material-catalog';

@Injectable({ providedIn: 'root' })
export class MaterialCatalogService {
  private readonly catalogSignal = signal<MarketplaceMaterial[]>([...MATERIAL_CATALOG]);
  readonly materials = this.catalogSignal.asReadonly();
  readonly publicMaterials = computed(() => this.catalogSignal().filter((material) => (material.publicationStatus ?? 'Activa') === 'Activa'));

  findById(id: string | null | undefined): MarketplaceMaterial | undefined {
    return this.catalogSignal().find((material) => material.id === id);
  }

  findPublicById(id: string | null | undefined): MarketplaceMaterial | undefined {
    const material = this.findById(id);
    return material && (material.publicationStatus ?? 'Activa') === 'Activa' ? material : undefined;
  }

  setPublicationStatus(id: string, status: PublicationStatus): boolean {
    let found = false;
    this.catalogSignal.update((catalog) => catalog.map((material) => {
      if (material.id !== id) return material;
      found = true;
      return { ...material, publicationStatus: status };
    }));
    return found;
  }

  publish(material: MarketplaceMaterial): void {
    this.catalogSignal.update((catalog) => [{ ...material, publicationStatus: 'Activa' }, ...catalog]);
  }
}
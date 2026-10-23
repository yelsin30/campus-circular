import { describe, expect, it } from 'vitest';
import { MarketplaceMaterial } from './material-catalog';
import { MaterialCatalogService } from './material-catalog.service';

describe('MaterialCatalogService', () => {
  it('adds a new material to the in-memory catalog and resolves it by id', () => {
    const service = new MaterialCatalogService();
    const material: MarketplaceMaterial = {
      id: 'demo-publication',
      title: 'Material de prueba',
      category: 'Libros',
      career: 'Ingeniería de Sistemas',
      condition: 'Nuevo',
      mode: 'Donación',
      owner: 'María Pérez',
      initials: 'MP',
      art: 'calculus',
      background: '#f0f2f4',
      publishedAt: Date.now(),
      publishedLabel: 'ahora',
      campus: 'Sede Breña · Lima',
      publisher: 'María Pérez',
      description: 'Publicación de prueba.',
      rating: 5,
      ratingCount: 0,
      offeredExamples: [],
    };

    service.publish(material);

    expect(service.findById('demo-publication')).toBe(material);
    expect(service.materials()[0]).toBe(material);
  });
});
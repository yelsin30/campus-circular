import { describe, expect, it } from 'vitest';
import { MATERIAL_CATALOG, findMaterialById } from './material-catalog';

describe('material catalog', () => {
  it('resolves each marketplace item by its route id', () => {
    for (const material of MATERIAL_CATALOG) {
      expect(findMaterialById(material.id)).toBe(material);
    }
  });

  it('returns no material for an unknown id', () => {
    expect(findMaterialById('no-existe')).toBeUndefined();
  });
});

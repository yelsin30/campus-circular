import { MaterialCategory } from './material-catalog';

/**
 * Explicit demo-only assumptions. These are illustrative estimates, not verified
 * measurements or market prices. Replace them with validated transaction data
 * when the backend and actual weights/reference values are available.
 */
export const IMPACT_DEMO_ASSUMPTIONS = {
  estimatedElectronicWeightKgByMaterialId: {
    'calculadora-cientifica': 0.45,
    'tablet-apuntes': 0.5,
    'kit-arduino': 0.25,
  } satisfies Record<string, number>,
  estimatedReferenceValueSolesByMaterialId: {
    'calculo-diferencial': 80,
    'mochila-azul': 65,
    'tablet-apuntes': 420,
  } satisfies Record<string, number>,
  categoryOrder: ['Libros', 'Apuntes', 'Equipos', 'Materiales', 'Otros'] as MaterialCategory[],
} as const;

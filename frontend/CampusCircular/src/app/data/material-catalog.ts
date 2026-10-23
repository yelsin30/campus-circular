export type MaterialCategory = 'Libros' | 'Apuntes' | 'Equipos' | 'Materiales' | 'Otros';
export type MaterialCondition = 'Nuevo' | 'Seminuevo' | 'En buen estado' | 'Aceptable' | 'Repuestos / Scrap';
export type ExchangeMode = 'Trueque' | 'Donación' | 'Precio solidario';
export type MaterialArt = 'calculus' | 'calculator' | 'notes' | 'backpack' | 'algorithms' | 'tablet' | 'arduino';

export interface MarketplaceMaterial {
  id: string;
  title: string;
  category: MaterialCategory;
  career: string;
  condition: MaterialCondition;
  mode: ExchangeMode;
  owner: string;
  initials: string;
  price?: number;
  art: MaterialArt;
  background: string;
  publishedAt: number;
  publishedLabel: string;
  campus: string;
  publisher: string;
  description: string;
  rating: number;
  ratingCount: number;
  offeredExamples: string[];
  images?: string[];
}

export const MATERIAL_CATALOG: MarketplaceMaterial[] = [
  {
    id: 'calculo-diferencial',
    title: 'Cálculo Diferencial (7ma edición)',
    category: 'Libros',
    career: 'Ingeniería de Sistemas',
    condition: 'En buen estado',
    mode: 'Donación',
    owner: 'Ana Torres',
    initials: 'AT',
    art: 'calculus',
    background: '#f0f2f4',
    publishedAt: 7,
    publishedLabel: 'hace 2 días',
    campus: 'Sede Breña · Lima',
    publisher: 'Editorial Pearson',
    description: 'Libro de Cálculo Diferencial, séptima edición. Tiene algunas marcas de uso, pero está en buen estado y es ideal para estudiantes de los primeros ciclos. Busco darle una segunda oportunidad dentro de la comunidad UPN.',
    rating: 4.9,
    ratingCount: 12,
    offeredExamples: ['Apuntes de cursos generales', 'Material de dibujo técnico'],
  },
  {
    id: 'calculadora-cientifica',
    title: 'Calculadora científica Casio fx-570',
    category: 'Equipos',
    career: 'Ingeniería de Sistemas',
    condition: 'Seminuevo',
    mode: 'Precio solidario',
    owner: 'Jorge Ruiz',
    initials: 'JR',
    price: 40,
    art: 'calculator',
    background: '#f1f0ed',
    publishedAt: 6,
    publishedLabel: 'hace 1 día',
    campus: 'Sede Los Olivos · Lima',
    publisher: 'Jorge Ruiz',
    description: 'Calculadora científica en muy buen estado, probada y lista para usar en clases y evaluaciones. Incluye su tapa protectora.',
    rating: 4.8,
    ratingCount: 8,
    offeredExamples: ['Cuaderno universitario', 'Libro de matemática básica'],
  },
  {
    id: 'apuntes-java',
    title: 'Apuntes de Programación Java',
    category: 'Apuntes',
    career: 'Ingeniería de Sistemas',
    condition: 'Nuevo',
    mode: 'Trueque',
    owner: 'Camila Rojas',
    initials: 'CR',
    art: 'notes',
    background: '#f4f2ec',
    publishedAt: 5,
    publishedLabel: 'hace 3 días',
    campus: 'Sede Breña · Lima',
    publisher: 'Camila Rojas',
    description: 'Resumen ordenado de fundamentos de Java, con ejemplos de programación orientada a objetos y ejercicios resueltos.',
    rating: 5,
    ratingCount: 6,
    offeredExamples: ['Libro de algoritmos', 'Apuntes de cálculo'],
  },
  {
    id: 'mochila-azul',
    title: 'Mochila universitaria azul',
    category: 'Materiales',
    career: 'Administración',
    condition: 'En buen estado',
    mode: 'Donación',
    owner: 'Diana Castro',
    initials: 'DC',
    art: 'backpack',
    background: '#edf1e7',
    publishedAt: 4,
    publishedLabel: 'hace 4 días',
    campus: 'Sede San Juan de Lurigancho · Lima',
    publisher: 'Diana Castro',
    description: 'Mochila universitaria cómoda y espaciosa, con compartimento para laptop. Conservada en buen estado.',
    rating: 4.7,
    ratingCount: 9,
    offeredExamples: ['No se requiere intercambio'],
  },
  {
    id: 'libro-algoritmos',
    title: 'Libro de Algoritmos',
    category: 'Libros',
    career: 'Ingeniería de Sistemas',
    condition: 'Aceptable',
    mode: 'Trueque',
    owner: 'Diego Ramos',
    initials: 'DR',
    art: 'algorithms',
    background: '#f1eff8',
    publishedAt: 3,
    publishedLabel: 'hace 5 días',
    campus: 'Sede Breña · Lima',
    publisher: 'Editorial universitaria',
    description: 'Libro introductorio de algoritmos y lógica de programación. Tiene subrayados útiles y todas las páginas completas.',
    rating: 4.6,
    ratingCount: 5,
    offeredExamples: ['Apuntes de programación', 'Material de laboratorio'],
  },
  {
    id: 'tablet-apuntes',
    title: 'Tablet para apuntes',
    category: 'Equipos',
    career: 'Comunicaciones',
    condition: 'Seminuevo',
    mode: 'Precio solidario',
    owner: 'Luis García',
    initials: 'LG',
    price: 280,
    art: 'tablet',
    background: '#eef1f4',
    publishedAt: 2,
    publishedLabel: 'hace 1 semana',
    campus: 'Sede San Miguel · Lima',
    publisher: 'Luis García',
    description: 'Tablet ligera ideal para leer y tomar apuntes en clase. Funciona correctamente y se entrega con cargador.',
    rating: 4.9,
    ratingCount: 15,
    offeredExamples: ['Precio fijo de S/ 280'],
  },
  {
    id: 'kit-arduino',
    title: 'Kit básico de Arduino',
    category: 'Equipos',
    career: 'Ingeniería de Sistemas',
    condition: 'En buen estado',
    mode: 'Trueque',
    owner: 'Daniel Peña',
    initials: 'DP',
    art: 'arduino',
    background: '#f2f0e8',
    publishedAt: 1,
    publishedLabel: 'hace 1 semana',
    campus: 'Sede Breña · Lima',
    publisher: 'Daniel Peña',
    description: 'Kit inicial para proyectos de electrónica y programación. Incluye placa y componentes básicos para prácticas.',
    rating: 4.8,
    ratingCount: 7,
    offeredExamples: ['Libro de electrónica', 'Componentes de prototipado'],
  },
];

export function findMaterialById(id: string | null | undefined): MarketplaceMaterial | undefined {
  return MATERIAL_CATALOG.find((material) => material.id === id);
}
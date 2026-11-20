import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ExchangeMode,
  MarketplaceMaterial,
  MaterialArt,
  MaterialCategory,
  MaterialCondition,
} from './material-catalog';

export type BackendCondition = 'NUEVO' | 'SEMINUEVO' | 'BUENO' | 'ACEPTABLE' | 'SCRAP';
export type BackendModality = 'TRUEQUE' | 'DONACION' | 'VENTA_SOLIDARIA';
export type BackendPublicationStatus = 'DISPONIBLE' | 'EN_NEGOCIACION' | 'TRANSFERIDO' | 'SUSPENDIDO';

export interface PublicationResponseDto {
  id: number;
  categoriaId: number;
  categoria: string;
  carrera: string | null;
  usuarioId: number;
  propietarioCorreo?: string | null;
  titulo: string;
  descripcion: string;
  condicion: BackendCondition;
  modalidad: BackendModality;
  estado: BackendPublicationStatus;
  precioSolidario: number | null;
  imagenUrl?: string | null;
  imagenes?: string[] | null;
  fechaCreacion: string;
}

export interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CreatePublicationRequestDto {
  categoryId: number;
  titulo: string;
  descripcion: string;
  condicion: BackendCondition;
  modalidad: BackendModality;
  precioSolidario: number | null;
  imagenUrl?: string | null;
  imagenes?: string[];
  carrera?: string | null;
}

export interface CreatedPublicationResponseDto {
  id: number;
  estado: BackendPublicationStatus;
  createdAt: string;
}

export interface PublicationQueryParams {
  carrera?: string;
  category?: number | string;
  condition?: BackendCondition;
  modality?: BackendModality;
  q?: string;
  page?: number;
  size?: number;
}

export function normalizeFilterText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

@Injectable({ providedIn: 'root' })
export class PublicationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/publications`;

  private readonly publicationsSignal = signal<MarketplaceMaterial[]>([]);
  readonly publications = this.publicationsSignal.asReadonly();
  readonly publicMaterials = computed(() =>
    this.publicationsSignal().filter((item) => (item.publicationStatus ?? 'Activa') === 'Activa'),
  );

  getPublications(filters: PublicationQueryParams = {}): Observable<MarketplaceMaterial[]> {
    let params = new HttpParams();

    if (filters.carrera && normalizeFilterText(filters.carrera) !== 'todas las carreras') {
      params = params.set('carrera', filters.carrera.trim());
    }
    if (filters.category !== undefined && filters.category !== null && String(filters.category).trim() !== '') {
      params = params.set('category', String(filters.category));
    }
    if (filters.condition) {
      params = params.set('condition', filters.condition);
    }
    if (filters.modality) {
      params = params.set('modality', filters.modality);
    }
    if (filters.q && filters.q.trim()) {
      params = params.set('q', filters.q.trim());
    }
    if (filters.page !== undefined) {
      params = params.set('page', String(filters.page));
    }
    if (filters.size !== undefined) {
      params = params.set('size', String(filters.size));
    }

    return this.http.get<PageResponseDto<PublicationResponseDto>>(this.baseUrl, { params }).pipe(
      map((page) => (page?.content ?? []).map((dto) => this.mapToMarketplaceMaterial(dto))),
      tap((items) => this.publicationsSignal.set(items)),
      catchError(() => of(this.publicationsSignal())),
    );
  }

  getPublicationById(id: number | string): Observable<MarketplaceMaterial | undefined> {
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return of(this.findById(String(id)));
    }

    return this.http.get<PublicationResponseDto>(`${this.baseUrl}/${numericId}`).pipe(
      map((dto) => this.mapToMarketplaceMaterial(dto)),
      tap((mapped) => {
        this.publicationsSignal.update((current) => {
          const exists = current.some((item) => item.id === mapped.id);
          return exists
            ? current.map((item) => (item.id === mapped.id ? mapped : item))
            : [mapped, ...current];
        });
      }),
      catchError(() => of(this.findById(String(id)))),
    );
  }

  createPublication(payload: CreatePublicationRequestDto): Observable<CreatedPublicationResponseDto> {
    return this.http.post<CreatedPublicationResponseDto>(this.baseUrl, payload).pipe(
      tap(() => {
        this.getPublications({ page: 0, size: 50 }).subscribe();
      }),
    );
  }

  findById(id: string | null | undefined): MarketplaceMaterial | undefined {
    if (!id) return undefined;
    return this.publicationsSignal().find((item) => item.id === id);
  }

  findPublicById(id: string | null | undefined): MarketplaceMaterial | undefined {
    const found = this.findById(id);
    return found && (found.publicationStatus ?? 'Activa') === 'Activa' ? found : undefined;
  }

  toCategoryId(category: MaterialCategory | string): number | undefined {
    switch (normalizeFilterText(category)) {
      case 'libros':
      case 'libro':
        return 1;
      case 'apuntes':
      case 'apunte':
        return 2;
      case 'equipos':
      case 'equipo':
        return 3;
      case 'materiales':
      case 'material':
        return 4;
      case 'otros':
      case 'otro':
        return 5;
      default:
        return undefined;
    }
  }

  toCategorySlug(category: MaterialCategory | string): string | undefined {
    const normalized = normalizeFilterText(category);
    if (!normalized || normalized === 'todos' || normalized === 'all') {
      return undefined;
    }
    return normalized;
  }

  toBackendCondition(condition: MaterialCondition | BackendCondition | string): BackendCondition {
    switch (normalizeFilterText(condition).replace(/[_-]/g, ' ')) {
      case 'nuevo':
        return 'NUEVO';
      case 'seminuevo':
        return 'SEMINUEVO';
      case 'bueno':
      case 'en buen estado':
        return 'BUENO';
      case 'aceptable':
        return 'ACEPTABLE';
      case 'scrap':
      case 'repuestos / scrap':
      case 'repuestos / scrap (raee)':
        return 'SCRAP';
      default:
        return 'BUENO';
    }
  }

  fromBackendCondition(condition: BackendCondition | string): MaterialCondition {
    switch (normalizeFilterText(condition).replace(/[_-]/g, ' ')) {
      case 'nuevo':
        return 'Nuevo';
      case 'seminuevo':
        return 'Seminuevo';
      case 'bueno':
      case 'en buen estado':
        return 'En buen estado';
      case 'aceptable':
        return 'Aceptable';
      case 'scrap':
      case 'repuestos / scrap':
      case 'repuestos / scrap (raee)':
        return 'Repuestos / Scrap';
      default:
        return 'En buen estado';
    }
  }

  toBackendModality(mode: ExchangeMode | BackendModality | string): BackendModality {
    switch (normalizeFilterText(mode).replace(/[_-]/g, ' ')) {
      case 'trueque':
      case 'intercambio':
        return 'TRUEQUE';
      case 'donacion':
        return 'DONACION';
      case 'venta solidaria':
      case 'precio solidario':
        return 'VENTA_SOLIDARIA';
      default:
        return 'TRUEQUE';
    }
  }

  fromBackendModality(modality: BackendModality | string): ExchangeMode {
    switch (normalizeFilterText(modality).replace(/[_-]/g, ' ')) {
      case 'trueque':
      case 'intercambio':
        return 'Trueque';
      case 'donacion':
        return 'Donación';
      case 'venta solidaria':
      case 'precio solidario':
        return 'Precio solidario';
      default:
        return 'Trueque';
    }
  }

  fromBackendCategory(rawCategory: string | null | undefined, categoriaId?: number): MaterialCategory {
    const normalized = normalizeFilterText(rawCategory);
    if (normalized.includes('libro') || categoriaId === 1) return 'Libros';
    if (normalized.includes('apunte') || categoriaId === 2) return 'Apuntes';
    if (
      normalized.includes('equipo') ||
      normalized.includes('electr') ||
      normalized.includes('microcontrolador') ||
      normalized.includes('red') ||
      normalized.includes('instrumentacion') ||
      normalized.includes('periferico') ||
      categoriaId === 3
    ) {
      return 'Equipos';
    }
    if (
      normalized.includes('material') ||
      normalized.includes('arquitectura') ||
      normalized.includes('textil') ||
      categoriaId === 4
    ) {
      return 'Materiales';
    }
    return 'Otros';
  }

  private mapToMarketplaceMaterial(dto: PublicationResponseDto): MarketplaceMaterial {
    const category = this.fromBackendCategory(dto.categoria, dto.categoriaId);
    const mode = this.fromBackendModality(dto.modalidad);
    const condition = this.fromBackendCondition(dto.condicion);
    const createdTimestamp = dto.fechaCreacion ? Date.parse(dto.fechaCreacion) : Date.now();
    const ownerEmail = dto.propietarioCorreo?.trim();
    const ownerLabel = ownerEmail || `Usuario #${dto.usuarioId}`;
    const initials = ownerEmail
      ? ownerEmail.slice(0, 2).toUpperCase()
      : `U${dto.usuarioId}`;

    const resolvedImages: string[] = [];
    if (Array.isArray(dto.imagenes)) {
      for (const img of dto.imagenes) {
        if (img && img.trim()) {
          resolvedImages.push(img.trim());
        }
      }
    }
    if (resolvedImages.length === 0 && dto.imagenUrl && dto.imagenUrl.trim()) {
      resolvedImages.push(dto.imagenUrl.trim());
    }

    return {
      id: String(dto.id),
      title: dto.titulo,
      category,
      career: dto.carrera || 'Ingeniería de Sistemas',
      condition,
      mode,
      owner: ownerLabel,
      initials,
      ...(dto.precioSolidario !== null && dto.precioSolidario !== undefined
        ? { price: Number(dto.precioSolidario) }
        : {}),
      art: this.artForCategory(category),
      background: this.backgroundForCategory(category),
      publishedAt: Number.isNaN(createdTimestamp) ? Date.now() : createdTimestamp,
      publishedLabel: this.formatRelativeDate(createdTimestamp),
      campus: 'Campus UPN',
      publisher: ownerLabel,
      description: dto.descripcion,
      rating: 5,
      ratingCount: 1,
      offeredExamples: mode === 'Trueque' ? ['Material académico equivalente'] : [],
      ...(resolvedImages.length > 0 ? { images: resolvedImages } : {}),
      publicationStatus: dto.estado === 'DISPONIBLE' ? 'Activa' : 'Oculta',
      ownerId: dto.usuarioId,
      backendModality: dto.modalidad,
      backendStatus: dto.estado,
    };
  }

  private formatRelativeDate(timestamp: number): string {
    if (Number.isNaN(timestamp)) return 'reciente';
    return new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(timestamp);
  }

  private artForCategory(category: MaterialCategory): MaterialArt {
    switch (category) {
      case 'Libros':
        return 'calculus';
      case 'Apuntes':
        return 'notes';
      case 'Equipos':
        return 'calculator';
      case 'Materiales':
        return 'backpack';
      case 'Otros':
        return 'arduino';
    }
  }

  private backgroundForCategory(category: MaterialCategory): string {
    switch (category) {
      case 'Libros':
        return '#f0f2f4';
      case 'Apuntes':
        return '#f4f2ec';
      case 'Equipos':
        return '#eef1f4';
      case 'Materiales':
        return '#edf1e7';
      case 'Otros':
        return '#f2f0e8';
    }
  }
}

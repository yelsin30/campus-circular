import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ExchangeMode,
  MATERIAL_CATALOG,
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
  titulo: string;
  descripcion: string;
  condicion: BackendCondition;
  modalidad: BackendModality;
  estado: BackendPublicationStatus;
  precioSolidario: number | null;
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
}

export interface CreatedPublicationResponseDto {
  id: number;
  estado: BackendPublicationStatus;
  createdAt: string;
}

export interface PublicationQueryParams {
  carrera?: string;
  category?: number;
  condition?: BackendCondition;
  modality?: BackendModality;
  q?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class PublicationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/publications`;

  private readonly publicationsSignal = signal<MarketplaceMaterial[]>([...MATERIAL_CATALOG]);
  readonly publications = this.publicationsSignal.asReadonly();
  readonly publicMaterials = computed(() =>
    this.publicationsSignal().filter((item) => (item.publicationStatus ?? 'Activa') === 'Activa'),
  );

  getPublications(filters: PublicationQueryParams = {}): Observable<MarketplaceMaterial[]> {
    let params = new HttpParams();

    if (filters.carrera && filters.carrera !== 'Todas las carreras') {
      params = params.set('carrera', filters.carrera);
    }
    if (filters.category !== undefined && filters.category !== null) {
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
      catchError(() => {
        return of(this.filterFallbackCatalog(filters));
      }),
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
    return (
      this.publicationsSignal().find((item) => item.id === id) ??
      MATERIAL_CATALOG.find((item) => item.id === id)
    );
  }

  findPublicById(id: string | null | undefined): MarketplaceMaterial | undefined {
    const found = this.findById(id);
    return found && (found.publicationStatus ?? 'Activa') === 'Activa' ? found : undefined;
  }

  toCategoryId(category: MaterialCategory | string): number | undefined {
    switch (category) {
      case 'Libros':
        return 1;
      case 'Apuntes':
        return 2;
      case 'Equipos':
        return 3;
      case 'Materiales':
        return 4;
      case 'Otros':
        return 5;
      default:
        return undefined;
    }
  }

  toBackendCondition(condition: MaterialCondition | BackendCondition | string): BackendCondition {
    switch (condition.trim().toUpperCase()) {
      case 'NUEVO':
        return 'NUEVO';
      case 'SEMINUEVO':
        return 'SEMINUEVO';
      case 'BUENO':
      case 'EN BUEN ESTADO':
        return 'BUENO';
      case 'ACEPTABLE':
        return 'ACEPTABLE';
      case 'SCRAP':
      case 'REPUESTOS / SCRAP':
      case 'REPUESTOS / SCRAP (RAEE)':
        return 'SCRAP';
      default:
        return 'BUENO';
    }
  }

  fromBackendCondition(condition: BackendCondition | string): MaterialCondition {
    switch (condition.trim().toUpperCase()) {
      case 'NUEVO':
        return 'Nuevo';
      case 'SEMINUEVO':
        return 'Seminuevo';
      case 'BUENO':
      case 'EN BUEN ESTADO':
        return 'En buen estado';
      case 'ACEPTABLE':
        return 'Aceptable';
      case 'SCRAP':
      case 'REPUESTOS / SCRAP':
      case 'REPUESTOS / SCRAP (RAEE)':
        return 'Repuestos / Scrap';
      default:
        return 'En buen estado';
    }
  }

  toBackendModality(mode: ExchangeMode | BackendModality | string): BackendModality {
    switch (mode.trim().toUpperCase()) {
      case 'TRUEQUE':
      case 'INTERCAMBIO':
        return 'TRUEQUE';
      case 'DONACION':
      case 'DONACIÓN':
        return 'DONACION';
      case 'VENTA_SOLIDARIA':
      case 'PRECIO SOLIDARIO':
        return 'VENTA_SOLIDARIA';
      default:
        return 'TRUEQUE';
    }
  }

  fromBackendModality(modality: BackendModality | string): ExchangeMode {
    switch (modality.trim().toUpperCase()) {
      case 'TRUEQUE':
      case 'INTERCAMBIO':
        return 'Trueque';
      case 'DONACION':
      case 'DONACIÓN':
        return 'Donación';
      case 'VENTA_SOLIDARIA':
      case 'PRECIO SOLIDARIO':
        return 'Precio solidario';
      default:
        return 'Trueque';
    }
  }

  fromBackendCategory(rawCategory: string | null | undefined, categoriaId?: number): MaterialCategory {
    const normalized = (rawCategory ?? '').toLowerCase();
    if (normalized.includes('libro') || categoriaId === 1) return 'Libros';
    if (normalized.includes('apunte') || categoriaId === 2) return 'Apuntes';
    if (normalized.includes('equipo') || normalized.includes('electr') || categoriaId === 3) return 'Equipos';
    if (normalized.includes('material') || normalized.includes('arquitectura') || categoriaId === 4) return 'Materiales';
    return 'Otros';
  }

  private mapToMarketplaceMaterial(dto: PublicationResponseDto): MarketplaceMaterial {
    const category = this.fromBackendCategory(dto.categoria, dto.categoriaId);
    const mode = this.fromBackendModality(dto.modalidad);
    const condition = this.fromBackendCondition(dto.condicion);
    const createdTimestamp = dto.fechaCreacion ? Date.parse(dto.fechaCreacion) : Date.now();
    const ownerLabel = `Usuario #${dto.usuarioId}`;

    return {
      id: String(dto.id),
      title: dto.titulo,
      category,
      career: dto.carrera || 'Ingeniería de Sistemas',
      condition,
      mode,
      owner: ownerLabel,
      initials: `U${dto.usuarioId}`,
      ...(dto.precioSolidario !== null && dto.precioSolidario !== undefined
        ? { price: Number(dto.precioSolidario) }
        : {}),
      art: this.artForCategory(category),
      background: this.backgroundForCategory(category),
      publishedAt: Number.isNaN(createdTimestamp) ? Date.now() : createdTimestamp,
      publishedLabel: 'reciente',
      campus: 'Campus UPN',
      publisher: ownerLabel,
      description: dto.descripcion,
      rating: 5,
      ratingCount: 1,
      offeredExamples: mode === 'Trueque' ? ['Material académico equivalente'] : [],
      publicationStatus: dto.estado === 'DISPONIBLE' ? 'Activa' : 'Oculta',
      ownerId: dto.usuarioId,
      backendModality: dto.modalidad,
      backendStatus: dto.estado,
    };
  }

  private filterFallbackCatalog(filters: PublicationQueryParams): MarketplaceMaterial[] {
    return MATERIAL_CATALOG.filter((item) => {
      if ((item.publicationStatus ?? 'Activa') !== 'Activa') return false;
      if (filters.carrera && !item.career.toLowerCase().includes(filters.carrera.toLowerCase())) {
        return false;
      }
      if (filters.category !== undefined && this.toCategoryId(item.category) !== filters.category) {
        return false;
      }
      if (filters.condition && this.toBackendCondition(item.condition) !== filters.condition) {
        return false;
      }
      if (filters.modality && this.toBackendModality(item.mode) !== filters.modality) {
        return false;
      }
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const haystack = `${item.title} ${item.description} ${item.category} ${item.owner}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
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

import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ExchangeService } from './exchange.service';
import { IMPACT_DEMO_ASSUMPTIONS } from './impact-demo-assumptions';
import { MaterialCatalogService } from './material-catalog.service';

export interface MonthlyImpactPoint {
  month: string;
  count: number;
}

export interface CategoryImpactPoint {
  category: string;
  count: number;
  percentage: number;
}

export interface ImpactMetricsResponseDto {
  completedTransactions: number;
  articlesReinserted: number;
  avoidedRaeeKg: number;
  estimatedSavingsPen: number;
}

export interface ImpactMetrics {
  completedTransactions: number;
  articlesReinserted: number;
  reusedMaterialCount: number;
  avoidedRaeeKg: number;
  estimatedRaeeKg: number;
  estimatedSavingsPen: number;
  estimatedSavingsSoles: number;
  monthlyActivity: MonthlyImpactPoint[];
  categoryDistribution: CategoryImpactPoint[];
  reusedMaterialsAreDemo: boolean;
  raeeAreEstimated: boolean;
  savingsAreEstimated: boolean;
}

@Injectable({ providedIn: 'root' })
export class ImpactMetricsService {
  private readonly http = inject(HttpClient);
  private readonly exchanges = inject(ExchangeService);
  private readonly catalog = inject(MaterialCatalogService);
  private readonly apiUrl = `${environment.apiUrl}/metrics/impact`;

  private readonly backendMetricsSignal = signal<ImpactMetricsResponseDto>({
    completedTransactions: 0,
    articlesReinserted: 0,
    avoidedRaeeKg: 0,
    estimatedSavingsPen: 0,
  });

  readonly metrics = computed<ImpactMetrics>(() => {
    const kpi = this.backendMetricsSignal();
    const completed = this.exchanges.requests().filter((request) => request.status === 'Completado');

    const monthCounts = new Map<string, number>();
    for (const request of completed) {
      const date = new Date(request.completedAt ?? request.requestedAt);
      const month = `${date.getFullYear()}-${date.getMonth()}`;
      monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
    }
    const currentYear = new Date().getFullYear();
    const monthlyActivity = Array.from({ length: 12 }, (_, monthIndex) => {
      const date = new Date(currentYear, monthIndex, 1);
      const month = `${currentYear}-${monthIndex}`;
      const count = monthCounts.get(month) ?? (monthIndex === new Date().getMonth() ? kpi.completedTransactions : 0);
      return {
        month: new Intl.DateTimeFormat('es-PE', { month: 'short' }).format(date).replace('.', ''),
        count,
      };
    });

    const categoryCounts = new Map<string, number>();
    for (const request of completed) {
      const category =
        request.materialCategory ??
        this.catalog.findById(request.materialId)?.category ??
        'Equipos';
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
    if (categoryCounts.size === 0 && kpi.articlesReinserted > 0) {
      categoryCounts.set('Equipos', kpi.articlesReinserted);
    }

    const totalMaterials = Math.max(kpi.articlesReinserted, [...categoryCounts.values()].reduce((a, b) => a + b, 0));
    const categoryDistribution = IMPACT_DEMO_ASSUMPTIONS.categoryOrder.map((category) => {
      const count = categoryCounts.get(category) ?? 0;
      return {
        category,
        count,
        percentage: totalMaterials ? Math.round((count / totalMaterials) * 100) : 0,
      };
    });

    const completedTransactions = Math.max(kpi.completedTransactions, completed.length);
    const articlesReinserted = kpi.articlesReinserted;
    const avoidedRaeeKg = Number(kpi.avoidedRaeeKg ?? 0);
    const estimatedSavingsPen = Number(kpi.estimatedSavingsPen ?? 0);

    return {
      completedTransactions,
      articlesReinserted,
      reusedMaterialCount: articlesReinserted,
      avoidedRaeeKg,
      estimatedRaeeKg: avoidedRaeeKg,
      estimatedSavingsPen,
      estimatedSavingsSoles: estimatedSavingsPen,
      monthlyActivity,
      categoryDistribution,
      reusedMaterialsAreDemo: false,
      raeeAreEstimated: true,
      savingsAreEstimated: true,
    };
  });

  loadImpactMetrics(): Observable<ImpactMetricsResponseDto> {
    return this.http.get<ImpactMetricsResponseDto>(this.apiUrl).pipe(
      tap((res) => {
        if (res) {
          this.backendMetricsSignal.set({
            completedTransactions: Number(res.completedTransactions ?? 0),
            articlesReinserted: Number(res.articlesReinserted ?? 0),
            avoidedRaeeKg: Number(res.avoidedRaeeKg ?? 0),
            estimatedSavingsPen: Number(res.estimatedSavingsPen ?? 0),
          });
        }
      }),
      catchError(() => of(this.backendMetricsSignal())),
    );
  }
}

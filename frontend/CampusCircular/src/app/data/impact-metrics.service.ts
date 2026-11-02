import { computed, inject, Injectable } from '@angular/core';
import { ExchangeRequest, ExchangeService } from './exchange.service';
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

export interface ImpactMetrics {
  completedTransactions: number;
  reusedMaterialCount: number;
  estimatedRaeeKg: number | null;
  estimatedSavingsSoles: number | null;
  monthlyActivity: MonthlyImpactPoint[];
  categoryDistribution: CategoryImpactPoint[];
  reusedMaterialsAreDemo: boolean;
  raeeAreEstimated: boolean;
  savingsAreEstimated: boolean;
}

@Injectable({ providedIn: 'root' })
export class ImpactMetricsService {
  private readonly exchanges = inject(ExchangeService);
  private readonly catalog = inject(MaterialCatalogService);

  readonly metrics = computed<ImpactMetrics>(() => {
    const catalog = this.catalog.materials();
    const completed = this.exchanges.requests().filter((request) => request.status === 'Completado');
    const completedMaterialIds = new Set<string>();
    for (const request of completed) {
      const materialIds = new Set([request.materialId, ...(request.exchangedMaterialIds ?? [])]);
      for (const id of materialIds) {
        completedMaterialIds.add(id);
      }
    }

    const completedMaterials = [...completedMaterialIds]
      .map((id) => catalog.find((material) => material.id === id))
      .filter((material) => material !== undefined);

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
      return {
        month: new Intl.DateTimeFormat('es-PE', { month: 'short' }).format(date).replace('.', ''),
        count: monthCounts.get(month) ?? 0,
      };
    });

    const categoryCounts = new Map<string, number>();
    for (const material of completedMaterials) {
      categoryCounts.set(material.category, (categoryCounts.get(material.category) ?? 0) + 1);
    }
    const totalMaterials = completedMaterials.length;
    const categoryDistribution = IMPACT_DEMO_ASSUMPTIONS.categoryOrder.map((category) => {
      const count = categoryCounts.get(category) ?? 0;
      return { category, count, percentage: totalMaterials ? Math.round((count / totalMaterials) * 100) : 0 };
    });

    const estimatedRaeeKg = this.calculateEstimatedRaeeKg(completedMaterials.map((material) => material.id));
    const estimatedSavingsSoles = this.calculateSavings(completed);

    return {
      completedTransactions: completed.length,
      reusedMaterialCount: totalMaterials,
      estimatedRaeeKg,
      estimatedSavingsSoles,
      monthlyActivity,
      categoryDistribution,
      reusedMaterialsAreDemo: completed.some((request) => request.demo),
      raeeAreEstimated: estimatedRaeeKg !== null,
      savingsAreEstimated: estimatedSavingsSoles !== null,
    };
  });

  private calculateEstimatedRaeeKg(materialIds: string[]): number | null {
    const weights = IMPACT_DEMO_ASSUMPTIONS.estimatedElectronicWeightKgByMaterialId as Record<string, number>;
    let estimatedTotal = 0;
    let hasElectronicEstimate = false;

    for (const id of materialIds) {
      const material = this.catalog.findById(id);
      const estimatedWeight = weights[id];
      if (material?.category === 'Equipos' && estimatedWeight !== undefined) {
        estimatedTotal += estimatedWeight;
        hasElectronicEstimate = true;
      }
    }

    return hasElectronicEstimate ? Number(estimatedTotal.toFixed(1)) : null;
  }

  private calculateSavings(completed: ExchangeRequest[]): number | null {
    const referenceValues = IMPACT_DEMO_ASSUMPTIONS.estimatedReferenceValueSolesByMaterialId as Record<string, number>;
    let totalSavings = 0;
    let hasSufficientData = false;

    for (const request of completed) {
      const referenceValue = request.referenceValueSoles ?? referenceValues[request.materialId];
      if (referenceValue === undefined) continue;

      if (request.mode === 'Donación') {
        totalSavings += referenceValue;
        hasSufficientData = true;
      } else if (request.mode === 'Precio solidario' && request.paidAmount !== undefined) {
        totalSavings += Math.max(0, referenceValue - request.paidAmount);
        hasSufficientData = true;
      }
    }

    return hasSufficientData ? Number(totalSavings.toFixed(2)) : null;
  }
}

import { TestBed } from '@angular/core/testing';
import { ExchangeService } from './exchange.service';
import { ImpactMetricsService } from './impact-metrics.service';
import { MaterialCatalogService } from './material-catalog.service';

describe('ImpactMetricsService', () => {
  let metrics: ImpactMetricsService;
  let exchanges: ExchangeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MaterialCatalogService, ExchangeService, ImpactMetricsService] });
    metrics = TestBed.inject(ImpactMetricsService);
    exchanges = TestBed.inject(ExchangeService);
  });

  it('calculates reused unique materials and estimates from completed demo transactions only', () => {
    const result = metrics.metrics();
    expect(result.completedTransactions).toBe(5);
    expect(result.reusedMaterialCount).toBe(5);
    expect(result.estimatedRaeeKg).toBe(0.8);
    expect(result.estimatedSavingsSoles).toBe(285);
    expect(result.categoryDistribution.reduce((total, category) => total + category.count, 0)).toBe(5);
  });

  it('does not count pending transactions and updates reactively after bilateral completion', () => {
    const initialItems = metrics.metrics().reusedMaterialCount;
    const pending = exchanges.findRequest('demo-received-algorithms');
    expect(pending).toBeDefined();
    if (!pending) return;

    expect(exchanges.createRequest('calculadora-cientifica').success).toBe(true);
    expect(metrics.metrics().reusedMaterialCount).toBe(initialItems);

    exchanges.accept(pending.id, pending.owner);
    exchanges.confirmDelivery(pending.id, pending.owner, 'owner', exchanges.demoOtp);
    exchanges.confirmDelivery(pending.id, pending.requester, 'requester', exchanges.demoOtp);

    expect(metrics.metrics().completedTransactions).toBe(6);
    expect(metrics.metrics().reusedMaterialCount).toBe(initialItems + 1);
  });
});

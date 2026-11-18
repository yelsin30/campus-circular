import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ExchangeService } from './exchange.service';
import { ImpactMetricsService } from './impact-metrics.service';
import { MaterialCatalogService } from './material-catalog.service';

describe('ImpactMetricsService', () => {
  let metrics: ImpactMetricsService;
  let httpMock: HttpTestingController;
  const impactUrl = `${environment.apiUrl}/metrics/impact`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MaterialCatalogService,
        ExchangeService,
        ImpactMetricsService,
      ],
    });
    metrics = TestBed.inject(ImpactMetricsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches real KPI metrics from GET /api/v1/metrics/impact', () => {
    expect(metrics.metrics().completedTransactions).toBe(0);

    metrics.loadImpactMetrics().subscribe();
    const req = httpMock.expectOne(impactUrl);
    expect(req.request.method).toBe('GET');
    req.flush({
      completedTransactions: 125,
      articlesReinserted: 125,
      avoidedRaeeKg: 86.45,
      estimatedSavingsPen: 18420.0,
    });

    expect(metrics.metrics().completedTransactions).toBe(125);
    expect(metrics.metrics().articlesReinserted).toBe(125);
    expect(metrics.metrics().avoidedRaeeKg).toBe(86.45);
    expect(metrics.metrics().estimatedSavingsPen).toBe(18420);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ExchangeService } from './exchange.service';
import { ImpactMetricsService } from './impact-metrics.service';
import { MaterialCatalogService } from './material-catalog.service';

describe('ImpactMetricsService', () => {
  let metrics: ImpactMetricsService;
  let exchanges: ExchangeService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/transactions`;

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
    exchanges = TestBed.inject(ExchangeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts empty without demo transactions and updates reactively when a transaction is completed', () => {
    expect(metrics.metrics().completedTransactions).toBe(0);

    exchanges.loadMyTransactions().subscribe();
    httpMock.expectOne(baseUrl).flush([
      {
        idTransaccion: 10,
        idPublicacion: 1,
        idPublicacionOfrecida: 2,
        idSolicitante: 2,
        idPropietario: 1,
        tipo: 'TRUEQUE',
        estado: 'COMPLETADA',
        fechaCierre: '2026-11-17T11:55:00',
      },
    ]);

    expect(metrics.metrics().completedTransactions).toBe(1);
  });
});

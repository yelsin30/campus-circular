import { TestBed } from '@angular/core/testing';
import { ExchangeService } from './exchange.service';
import { MaterialCatalogService } from './material-catalog.service';

describe('ExchangeService', () => {
  let service: ExchangeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MaterialCatalogService, ExchangeService] });
    service = TestBed.inject(ExchangeService);
  });

  it('creates a sent request and prevents an active duplicate', () => {
    const first = service.createRequest('calculadora-cientifica', 'Hola');
    expect(first.success).toBe(true);
    expect(service.getRequests('sent').some((request) => request.id === (first.success ? first.request.id : ''))).toBe(true);
    expect(service.createRequest('calculadora-cientifica').success).toBe(false);
  });

  it('requires valid OTP confirmation from both participants to complete', () => {
    const request = service.getRequests('received').find((item) => item.id === 'demo-received-algorithms');
    expect(request).toBeDefined();
    if (!request) return;

    expect(service.confirmDelivery(request.id, request.owner, 'owner', '000000').success).toBe(false);
    expect(service.confirmDelivery(request.id, request.owner, 'owner', service.demoOtp).success).toBe(true);
    expect(service.findRequest(request.id)?.status).toBe('Aceptado');
    expect(service.confirmDelivery(request.id, request.requester, 'requester', service.demoOtp).success).toBe(true);
    expect(service.findRequest(request.id)?.status).toBe('Completado');
    expect(service.confirmDelivery(request.id, request.requester, 'requester', service.demoOtp).success).toBe(false);
  });

  it('only permits one rating per user for a completed transaction', () => {
    const request = service.getRequests('completed')[0];
    expect(request).toBeDefined();
    if (!request) return;
    expect(service.rate(request.id, request.owner, 5, 'Excelente')).toBe(true);
    expect(service.rate(request.id, request.owner, 4, 'Duplicada')).toBe(false);
  });
});

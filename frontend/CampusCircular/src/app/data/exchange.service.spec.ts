import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ExchangeService } from './exchange.service';

describe('ExchangeService', () => {
  let service: ExchangeService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/transactions`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ExchangeService],
    });
    service = TestBed.inject(ExchangeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads user transactions and transitions through accept, delivery-code, confirm-delivery and rating', () => {
    service.loadMyTransactions().subscribe();
    const listReq = httpMock.expectOne(baseUrl);
    expect(listReq.request.method).toBe('GET');
    listReq.flush([
      {
        idTransaccion: 10,
        idPublicacion: 1,
        idPublicacionOfrecida: 2,
        idSolicitante: 2,
        idPropietario: 1,
        tipo: 'TRUEQUE',
        estado: 'PENDIENTE',
        tituloPublicacion: 'Diagrama de conexiones',
      },
    ]);

    expect(service.findRequest('10')?.status).toBe('Pendiente');

    service.acceptTransaction(10).subscribe();
    const acceptReq = httpMock.expectOne(`${baseUrl}/10/accept`);
    expect(acceptReq.request.method).toBe('POST');
    acceptReq.flush({
      idTransaccion: 10,
      idPublicacion: 1,
      idPublicacionOfrecida: 2,
      idSolicitante: 2,
      idPropietario: 1,
      tipo: 'TRUEQUE',
      estado: 'EN_NEGOCIACION',
    });
    expect(service.findRequest('10')?.status).toBe('En negociación');

    service.generateDeliveryCode(10).subscribe((codeRes) => {
      expect(codeRes.code).toBe('A7B9X2');
    });
    const codeReq = httpMock.expectOne(`${baseUrl}/10/delivery-code`);
    expect(codeReq.request.method).toBe('POST');
    codeReq.flush({ code: 'A7B9X2', expiresAt: '2026-11-17T12:00:00' });

    service.confirmDeliveryWithOtp(10, 'A7B9X2').subscribe();
    const confirmReq = httpMock.expectOne(`${baseUrl}/10/confirm-delivery`);
    expect(confirmReq.request.method).toBe('POST');
    expect(confirmReq.request.body).toEqual({ code: 'A7B9X2' });
    confirmReq.flush({
      idTransaccion: 10,
      idPublicacion: 1,
      idPublicacionOfrecida: 2,
      idSolicitante: 2,
      idPropietario: 1,
      tipo: 'TRUEQUE',
      estado: 'COMPLETADA',
      fechaCierre: '2026-11-17T11:55:00',
    });
    expect(service.findRequest('10')?.status).toBe('Completado');

    service.rateTransaction(10, 5, 'Excelente').subscribe();
    const rateReq = httpMock.expectOne(`${baseUrl}/10/ratings`);
    expect(rateReq.request.method).toBe('POST');
    expect(rateReq.request.body).toEqual({ score: 5, comment: 'Excelente' });
    rateReq.flush({
      idCalificacion: 1,
      idTransaccion: 10,
      idEmisor: 1,
      idReceptor: 2,
      score: 5,
      comment: 'Excelente',
      receptorReputacionPromedio: 5.0,
      fechaCreacion: '2026-11-17T11:56:00',
    });
    expect(service.findRequest('10')?.alreadyRated).toBe(true);
  });

  it('sends rejection reason and moves rejected requests into rejected tab', () => {
    service.loadMyTransactions().subscribe();
    const listReq = httpMock.expectOne(baseUrl);
    listReq.flush([
      {
        idTransaccion: 20,
        idPublicacion: 3,
        idSolicitante: 5,
        idPropietario: 1,
        tipo: 'DONACION',
        estado: 'PENDIENTE',
        tituloPublicacion: 'Apuntes Java',
      },
    ]);

    service.rejectTransaction(20, 'Ya acordé el intercambio con otro estudiante').subscribe();
    const rejectReq = httpMock.expectOne(`${baseUrl}/20/reject`);
    expect(rejectReq.request.method).toBe('POST');
    expect(rejectReq.request.body).toEqual({
      reason: 'Ya acordé el intercambio con otro estudiante',
    });
    rejectReq.flush({
      idTransaccion: 20,
      idPublicacion: 3,
      idSolicitante: 5,
      idPropietario: 1,
      tipo: 'DONACION',
      estado: 'RECHAZADA',
      tituloPublicacion: 'Apuntes Java',
      motivoRechazo: 'Ya acordé el intercambio con otro estudiante',
    });

    const rejected = service.getRequests('rejected');
    expect(rejected.length).toBe(1);
    expect(rejected[0].rejectionReason).toBe('Ya acordé el intercambio con otro estudiante');
    expect(service.getRequests('received').length).toBe(0);
    expect(service.getRequests('sent').length).toBe(0);
  });
});

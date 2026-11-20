import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  let moderation: ModerationService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ModerationService],
    });
    moderation = TestBed.inject(ModerationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads real admin overview, publications, reports and users from backend', () => {
    moderation.loadAdminOverview().subscribe();
    const overviewReq = httpMock.expectOne(`${apiUrl}/admin/overview`);
    expect(overviewReq.request.method).toBe('GET');
    overviewReq.flush({
      totalUsers: 5,
      activeUsers: 4,
      suspendedUsers: 1,
      inactiveUsers: 0,
      totalPublications: 10,
      activePublications: 7,
      inNegotiationPublications: 1,
      suspendedPublications: 1,
      retiredPublications: 0,
      transferredPublications: 1,
      pendingReports: 2,
      resolvedReports: 3,
      totalReports: 5,
      completedTransactions: 1,
      activeTransactions: 2,
      recentActivity: [],
    });
    expect(moderation.overview().activeUsers).toBe(4);
    expect(moderation.overview().pendingReports).toBe(2);

    moderation.loadAdminPublications().subscribe();
    const pubsReq = httpMock.expectOne(`${apiUrl}/admin/publications`);
    expect(pubsReq.request.method).toBe('GET');
    pubsReq.flush([
      {
        id: 10,
        categoriaId: 1,
        categoria: 'Libros',
        carrera: 'Ingeniería de Sistemas',
        usuarioId: 2,
        propietarioCorreo: 'ana@upn.pe',
        titulo: 'Cálculo I',
        descripcion: 'Buen estado',
        condicion: 'BUENO',
        modalidad: 'DONACION',
        estado: 'SUSPENDIDO',
        precioSolidario: null,
        imagenUrl: 'data:image/jpeg;base64,abc',
        imagenes: ['data:image/jpeg;base64,abc'],
        fechaCreacion: '2026-11-20T10:00:00',
      },
    ]);
    expect(moderation.adminPublications().length).toBe(1);
    expect(moderation.adminPublications()[0].backendStatus).toBe('SUSPENDIDO');

    moderation.activatePublicationByAdmin(10).subscribe();
    const activateReq = httpMock.expectOne(`${apiUrl}/admin/publications/10/activate`);
    expect(activateReq.request.method).toBe('POST');
    activateReq.flush({
      id: 10,
      categoriaId: 1,
      categoria: 'Libros',
      carrera: 'Ingeniería de Sistemas',
      usuarioId: 2,
      propietarioCorreo: 'ana@upn.pe',
      titulo: 'Cálculo I',
      descripcion: 'Buen estado',
      condicion: 'BUENO',
      modalidad: 'DONACION',
      estado: 'DISPONIBLE',
      precioSolidario: null,
      imagenUrl: 'data:image/jpeg;base64,abc',
      imagenes: ['data:image/jpeg;base64,abc'],
      fechaCreacion: '2026-11-20T10:00:00',
    });
    expect(moderation.findPublicationById('10')?.backendStatus).toBe('DISPONIBLE');
  });

  it('loads real users and toggles user status via backend', () => {
    moderation.loadAdminUsers().subscribe();
    const usersReq = httpMock.expectOne(`${apiUrl}/admin/users`);
    expect(usersReq.request.method).toBe('GET');
    usersReq.flush([
      {
        idUsuario: 2,
        nombres: 'Ana',
        apellidos: 'Torres',
        correoInstitucional: 'ana@upn.pe',
        rol: 'USUARIO',
        estado: 'ACTIVO',
        reputacionPromedio: 4.8,
        fechaCreacion: '2026-11-10T09:00:00',
      },
    ]);
    expect(moderation.users().length).toBe(1);
    expect(moderation.users()[0].fullName).toBe('Ana Torres');

    moderation.toggleUserStatusByAdmin(2).subscribe();
    const toggleReq = httpMock.expectOne(`${apiUrl}/admin/users/2/toggle-status`);
    expect(toggleReq.request.method).toBe('POST');
    toggleReq.flush({
      idUsuario: 2,
      nombres: 'Ana',
      apellidos: 'Torres',
      correoInstitucional: 'ana@upn.pe',
      rol: 'USUARIO',
      estado: 'SUSPENDIDO',
      reputacionPromedio: 4.8,
      fechaCreacion: '2026-11-10T09:00:00',
    });
    expect(moderation.userById(2)?.estado).toBe('SUSPENDIDO');
  });
});

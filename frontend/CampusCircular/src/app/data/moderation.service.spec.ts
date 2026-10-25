import { TestBed } from '@angular/core/testing';
import { MaterialCatalogService } from './material-catalog.service';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  let moderation: ModerationService;
  let catalog: MaterialCatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MaterialCatalogService, ModerationService] });
    moderation = TestBed.inject(ModerationService);
    catalog = TestBed.inject(MaterialCatalogService);
  });

  it('hides and restores a publication in the public catalog without removing its record', () => {
    expect(catalog.findPublicById('calculo-diferencial')).toBeDefined();
    expect(moderation.moderatePublication('calculo-diferencial', 'Oculta')).toBe(true);
    expect(catalog.findPublicById('calculo-diferencial')).toBeUndefined();
    expect(catalog.findById('calculo-diferencial')).toBeDefined();
    expect(moderation.moderatePublication('calculo-diferencial', 'Oculta')).toBe(false);
    expect(moderation.moderatePublication('calculo-diferencial', 'Activa')).toBe(true);
    expect(catalog.findPublicById('calculo-diferencial')).toBeDefined();
  });

  it('creates one report per material, reporter, and reason and records moderation actions', () => {
    const first = moderation.createReport('tablet-apuntes', 'María Pérez', 'Información falsa', 'Demo');
    const repeated = moderation.createReport('tablet-apuntes', 'María Pérez', 'Información falsa', 'Demo again');
    expect(first?.created).toBe(true);
    expect(repeated?.created).toBe(false);
    if (!first) return;

    expect(moderation.reviewReport(first.report.id)).toBe(true);
    expect(moderation.resolveReport(first.report.id)).toBe(true);
    expect(moderation.logs().map((entry) => entry.action)).toEqual(['Reporte resuelto', 'Reporte revisado']);
    const afterResolution = moderation.createReport('tablet-apuntes', 'María Pérez', 'Información falsa');
    expect(afterResolution?.created).toBe(false);
    expect(afterResolution?.report.id).toBe(first.report.id);
    expect(moderation.reports().filter((report) => report.materialId === 'tablet-apuntes' && report.reporter === 'María Pérez').length).toBe(1);
  });

  it('rejects reports for hidden publications and accepts reports for active ones once', () => {
    expect(moderation.createReport('calculadora-cientifica', 'Estudiante UPN', 'Información falsa')?.created).toBe(true);
    expect(moderation.createReport('calculadora-cientifica', 'Estudiante UPN', 'Información falsa')?.created).toBe(false);
    moderation.moderatePublication('calculadora-cientifica', 'Oculta');
    expect(moderation.createReport('calculadora-cientifica', 'Otra persona', 'Información falsa')).toBeNull();
  });

  it('suspends a student but never the demo administrator', () => {
    expect(moderation.suspendUser('admin-upn')).toBe(false);
    expect(moderation.suspendUser('user-maria')).toBe(true);
    expect(moderation.isUserSuspended('María Pérez')).toBe(true);
    expect(moderation.reactivateUser('user-maria')).toBe(true);
    expect(moderation.isUserSuspended('María Pérez')).toBe(false);
  });
});

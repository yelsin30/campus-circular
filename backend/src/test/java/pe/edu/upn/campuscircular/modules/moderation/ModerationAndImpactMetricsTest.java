package pe.edu.upn.campuscircular.modules.moderation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;
import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;
import pe.edu.upn.campuscircular.modules.auth.repository.UsuarioRepository;
import pe.edu.upn.campuscircular.modules.catalog.domain.Categoria;
import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
import pe.edu.upn.campuscircular.modules.catalog.repository.PublicacionRepository;
import pe.edu.upn.campuscircular.modules.metrics.controller.MetricsController;
import pe.edu.upn.campuscircular.modules.metrics.repository.MetricaImpactoRepository;
import pe.edu.upn.campuscircular.modules.metrics.service.ImpactMetricsService;
import pe.edu.upn.campuscircular.modules.moderation.controller.ReportController;
import pe.edu.upn.campuscircular.modules.moderation.domain.EstadoReporte;
import pe.edu.upn.campuscircular.modules.moderation.domain.Reporte;
import pe.edu.upn.campuscircular.modules.moderation.dto.CreateReportRequest;
import pe.edu.upn.campuscircular.modules.moderation.repository.ReporteRepository;
import pe.edu.upn.campuscircular.modules.moderation.service.ReportService;

class ModerationAndImpactMetricsTest {

    @Test
    void calculatesRaeeWeightsPerCategoryAndSolidarityPriceSavings() {
        Publicacion micro = pubWithCategory("Microcontroladores", null);
        Publicacion redes = pubWithCategory("Redes", new BigDecimal("30.00"));
        Publicacion instrumentacion = pubWithCategory("Instrumentación", null);
        Publicacion perifericos = pubWithCategory("Periféricos", new BigDecimal("20.00"));
        Publicacion libros = pubWithCategory("Libros", null);

        assertEquals(new BigDecimal("0.050"), ImpactMetricsService.calculateRaeeKg(micro));
        assertEquals(new BigDecimal("0.800"), ImpactMetricsService.calculateRaeeKg(redes));
        assertEquals(new BigDecimal("0.350"), ImpactMetricsService.calculateRaeeKg(instrumentacion));
        assertEquals(new BigDecimal("0.150"), ImpactMetricsService.calculateRaeeKg(perifericos));
        assertEquals(new BigDecimal("0.000"), ImpactMetricsService.calculateRaeeKg(libros));

        assertEquals(new BigDecimal("80.00"), ImpactMetricsService.calculateSavingsPen(micro));
        assertEquals(new BigDecimal("50.00"), ImpactMetricsService.calculateSavingsPen(redes));
        assertEquals(new BigDecimal("60.00"), ImpactMetricsService.calculateSavingsPen(perifericos));
    }

    @Test
    void metricsControllerReturnsAggregatedKpis() {
        MetricaImpactoRepository repository = mock(MetricaImpactoRepository.class);
        when(repository.countCompletedTransactions()).thenReturn(125L);
        when(repository.sumArticulosReinsertados()).thenReturn(125L);
        when(repository.sumRaeeKg()).thenReturn(new BigDecimal("86.450"));
        when(repository.sumAhorroPen()).thenReturn(new BigDecimal("18420.00"));

        MetricsController controller = new MetricsController(new ImpactMetricsService(repository));
        var response = controller.getImpactMetrics().getBody();

        assertEquals(125L, response.completedTransactions());
        assertEquals(125L, response.articlesReinserted());
        assertEquals(new BigDecimal("86.450"), response.avoidedRaeeKg());
        assertEquals(new BigDecimal("18420.00"), response.estimatedSavingsPen());
    }

    @Test
    void reportControllerCreatesReportRejectsDuplicatesAndSuspendsPublication() {
        ReporteRepository reporteRepository = mock(ReporteRepository.class);
        PublicacionRepository publicacionRepository = mock(PublicacionRepository.class);
        UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
        ReportService reportService = new ReportService(
            reporteRepository, publicacionRepository, usuarioRepository);
        ReportController controller = new ReportController(reportService);

        Usuario reporter = new Usuario();
        ReflectionTestUtils.setField(reporter, "idUsuario", 2L);
        reporter.setCorreoInstitucional("estudiante@upn.pe");
        reporter.setEstado(EstadoUsuario.ACTIVO);

        Publicacion publicacion = pubWithCategory("Libros", null);
        ReflectionTestUtils.setField(publicacion, "idPublicacion", 10L);
        publicacion.setTitulo("Cálculo Diferencial");
        publicacion.setEstado(EstadoPublicacion.DISPONIBLE);

        when(usuarioRepository.findByCorreoInstitucional("estudiante@upn.pe"))
            .thenReturn(Optional.of(reporter));
        when(publicacionRepository.findById(10L)).thenReturn(Optional.of(publicacion));
        when(reporteRepository.existsByPublicacionIdPublicacionAndReportanteIdUsuarioAndEstado(
                10L, 2L, EstadoReporte.PENDIENTE))
            .thenReturn(false)
            .thenReturn(true);
        when(reporteRepository.save(any(Reporte.class))).thenAnswer(inv -> {
            Reporte r = inv.getArgument(0);
            ReflectionTestUtils.setField(r, "idReporte", 99L);
            return r;
        });

        var auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
            "estudiante@upn.pe", null);
        var created = controller.createReport(
            10L, new CreateReportRequest("Contenido inapropiado"), auth);
        assertEquals(201, created.getStatusCode().value());
        assertEquals(EstadoReporte.PENDIENTE, created.getBody().estado());

        ResponseStatusException duplicateEx = assertThrows(
            ResponseStatusException.class,
            () -> controller.createReport(
                10L, new CreateReportRequest("Contenido inapropiado"), auth));
        assertEquals(409, duplicateEx.getStatusCode().value());

        Reporte pendingReport = new Reporte();
        ReflectionTestUtils.setField(pendingReport, "idReporte", 99L);
        pendingReport.setPublicacion(publicacion);
        pendingReport.setReportante(reporter);
        pendingReport.setMotivo("Contenido inapropiado");
        pendingReport.setEstado(EstadoReporte.PENDIENTE);
        when(reporteRepository.findByPublicacionIdPublicacionAndEstado(10L, EstadoReporte.PENDIENTE))
            .thenReturn(List.of(pendingReport));

        var suspended = controller.suspendPublication(10L).getBody();
        assertEquals(EstadoPublicacion.SUSPENDIDO, suspended.estadoPublicacion());
        assertEquals(1, suspended.reportesAtendidos());
        assertEquals(EstadoReporte.ATENDIDO, pendingReport.getEstado());
        verify(publicacionRepository).save(publicacion);
    }

    private static Publicacion pubWithCategory(String categoryName, BigDecimal precio) {
        Categoria categoria = new Categoria();
        categoria.setNombre(categoryName);
        Publicacion pub = new Publicacion();
        pub.setCategoria(categoria);
        pub.setPrecioSolidario(precio);
        return pub;
    }
}

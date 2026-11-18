package pe.edu.upn.campuscircular.modules.moderation.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;
import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;
import pe.edu.upn.campuscircular.modules.auth.repository.UsuarioRepository;
import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
import pe.edu.upn.campuscircular.modules.catalog.repository.PublicacionRepository;
import pe.edu.upn.campuscircular.modules.moderation.domain.EstadoReporte;
import pe.edu.upn.campuscircular.modules.moderation.domain.Reporte;
import pe.edu.upn.campuscircular.modules.moderation.dto.CreateReportRequest;
import pe.edu.upn.campuscircular.modules.moderation.dto.ReportResponse;
import pe.edu.upn.campuscircular.modules.moderation.dto.SuspendPublicationResponse;
import pe.edu.upn.campuscircular.modules.moderation.repository.ReporteRepository;

@Service
public class ReportService {

    private final ReporteRepository reporteRepository;
    private final PublicacionRepository publicacionRepository;
    private final UsuarioRepository usuarioRepository;

    public ReportService(
            ReporteRepository reporteRepository,
            PublicacionRepository publicacionRepository,
            UsuarioRepository usuarioRepository) {
        this.reporteRepository = reporteRepository;
        this.publicacionRepository = publicacionRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public ReportResponse createReport(
            String email, Long idPublicacion, CreateReportRequest request) {
        Usuario reportante = usuarioRepository.findByCorreoInstitucional(email)
            .filter(usuario -> usuario.getEstado() == EstadoUsuario.ACTIVO)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "La sesión no corresponde a una cuenta activa"));

        Publicacion publicacion = publicacionRepository.findById(idPublicacion)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "La publicación indicada no existe"));

        if (publicacion.getEstado() == EstadoPublicacion.SUSPENDIDO) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Esta publicación ya fue suspendida por moderación");
        }

        if (reporteRepository.existsByPublicacionIdPublicacionAndReportanteIdUsuarioAndEstado(
                idPublicacion, reportante.getIdUsuario(), EstadoReporte.PENDIENTE)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Ya registraste un reporte pendiente para esta publicación");
        }

        Reporte reporte = new Reporte();
        reporte.setPublicacion(publicacion);
        reporte.setReportante(reportante);
        reporte.setMotivo(request.motivo().trim());
        reporte.setEstado(EstadoReporte.PENDIENTE);
        reporte.setFechaCreacion(LocalDateTime.now());

        return ReportResponse.from(reporteRepository.save(reporte));
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> listPendingReports( boolean includeResolved) {
        List<Reporte> items = includeResolved
            ? reporteRepository.findAllByOrderByFechaCreacionDesc()
            : reporteRepository.findByEstadoOrderByFechaCreacionDesc(EstadoReporte.PENDIENTE);
        return items.stream().map(ReportResponse::from).toList();
    }

    @Transactional
    public SuspendPublicationResponse suspendPublication(Long idPublicacion) {
        Publicacion publicacion = publicacionRepository.findById(idPublicacion)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "La publicación indicada no existe"));

        publicacion.setEstado(EstadoPublicacion.SUSPENDIDO);
        publicacionRepository.save(publicacion);

        LocalDateTime now = LocalDateTime.now();
        List<Reporte> pendingReports = reporteRepository.findByPublicacionIdPublicacionAndEstado(
            idPublicacion, EstadoReporte.PENDIENTE);
        for (Reporte reporte : pendingReports) {
            reporte.setEstado(EstadoReporte.ATENDIDO);
            reporte.setFechaResolucion(now);
        }
        if (!pendingReports.isEmpty()) {
            reporteRepository.saveAll(pendingReports);
        }

        return new SuspendPublicationResponse(
            publicacion.getIdPublicacion(),
            publicacion.getEstado(),
            pendingReports.size(),
            now);
    }
}

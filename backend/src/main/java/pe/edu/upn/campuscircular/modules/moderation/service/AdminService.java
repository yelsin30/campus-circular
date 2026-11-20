package pe.edu.upn.campuscircular.modules.moderation.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;
import pe.edu.upn.campuscircular.modules.auth.domain.RolUsuario;
import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;
import pe.edu.upn.campuscircular.modules.auth.repository.UsuarioRepository;
import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
import pe.edu.upn.campuscircular.modules.catalog.dto.PublicationResponse;
import pe.edu.upn.campuscircular.modules.catalog.repository.PublicacionRepository;
import pe.edu.upn.campuscircular.modules.moderation.domain.EstadoReporte;
import pe.edu.upn.campuscircular.modules.moderation.domain.Reporte;
import pe.edu.upn.campuscircular.modules.moderation.dto.AdminOverviewResponse;
import pe.edu.upn.campuscircular.modules.moderation.dto.AdminOverviewResponse.AdminActivityItem;
import pe.edu.upn.campuscircular.modules.moderation.dto.AdminUserResponse;
import pe.edu.upn.campuscircular.modules.moderation.dto.ReportResponse;
import pe.edu.upn.campuscircular.modules.moderation.repository.ReporteRepository;
import pe.edu.upn.campuscircular.modules.transaction.domain.EstadoTransaccion;
import pe.edu.upn.campuscircular.modules.transaction.domain.Transaccion;
import pe.edu.upn.campuscircular.modules.transaction.repository.TransaccionRepository;

@Service
public class AdminService {

    private final UsuarioRepository usuarioRepository;
    private final PublicacionRepository publicacionRepository;
    private final ReporteRepository reporteRepository;
    private final TransaccionRepository transaccionRepository;

    public AdminService(
            UsuarioRepository usuarioRepository,
            PublicacionRepository publicacionRepository,
            ReporteRepository reporteRepository,
            TransaccionRepository transaccionRepository) {
        this.usuarioRepository = usuarioRepository;
        this.publicacionRepository = publicacionRepository;
        this.reporteRepository = reporteRepository;
        this.transaccionRepository = transaccionRepository;
    }

    @Transactional(readOnly = true)
    public AdminOverviewResponse getOverview() {
        long activeUsers = usuarioRepository.countByEstado(EstadoUsuario.ACTIVO);
        long suspendedUsers = usuarioRepository.countByEstado(EstadoUsuario.SUSPENDIDO);
        long inactiveUsers = usuarioRepository.countByEstado(EstadoUsuario.INACTIVO);
        long totalUsers = activeUsers + suspendedUsers + inactiveUsers;

        long activePublications = publicacionRepository.countByEstado(EstadoPublicacion.DISPONIBLE);
        long inNegotiationPublications = publicacionRepository.countByEstado(EstadoPublicacion.EN_NEGOCIACION);
        long suspendedPublications = publicacionRepository.countByEstado(EstadoPublicacion.SUSPENDIDO);
        long retiredPublications = publicacionRepository.countByEstado(EstadoPublicacion.RETIRADA);
        long transferredPublications = publicacionRepository.countByEstado(EstadoPublicacion.TRANSFERIDO);
        long totalPublications = activePublications + inNegotiationPublications
            + suspendedPublications + retiredPublications + transferredPublications;

        long pendingReports = reporteRepository.countByEstado(EstadoReporte.PENDIENTE);
        long resolvedReports = reporteRepository.countByEstadoIn(
            List.of(EstadoReporte.ATENDIDO, EstadoReporte.DESESTIMADO));
        long totalReports = pendingReports + resolvedReports;

        long completedTransactions = transaccionRepository.countByEstado(EstadoTransaccion.COMPLETADA);
        long activeTransactions = transaccionRepository.countByEstadoIn(
            List.of(EstadoTransaccion.PENDIENTE, EstadoTransaccion.EN_NEGOCIACION));

        List<AdminActivityItem> activity = buildRecentActivity();

        return new AdminOverviewResponse(
            totalUsers,
            activeUsers,
            suspendedUsers,
            inactiveUsers,
            totalPublications,
            activePublications,
            inNegotiationPublications,
            suspendedPublications,
            retiredPublications,
            transferredPublications,
            pendingReports,
            resolvedReports,
            totalReports,
            completedTransactions,
            activeTransactions,
            activity);
    }

    @Transactional(readOnly = true)
    public List<PublicationResponse> listAllPublications() {
        return publicacionRepository.findAllByOrderByFechaCreacionDesc()
            .stream()
            .map(PublicationResponse::from)
            .toList();
    }

    @Transactional
    public PublicationResponse activatePublication(Long idPublicacion) {
        Publicacion publicacion = publicacionRepository.findById(idPublicacion)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "La publicación indicada no existe"));

        publicacion.setEstado(EstadoPublicacion.DISPONIBLE);
        Publicacion saved = publicacionRepository.save(publicacion);
        return PublicationResponse.from(saved);
    }

    @Transactional
    public PublicationResponse retirePublication(Long idPublicacion) {
        Publicacion publicacion = publicacionRepository.findById(idPublicacion)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "La publicación indicada no existe"));

        publicacion.setEstado(EstadoPublicacion.RETIRADA);
        Publicacion saved = publicacionRepository.save(publicacion);

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

        return PublicationResponse.from(saved);
    }

    @Transactional
    public ReportResponse dismissReport(Long idReporte) {
        Reporte reporte = reporteRepository.findById(idReporte)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "El reporte indicado no existe"));

        reporte.setEstado(EstadoReporte.DESESTIMADO);
        reporte.setFechaResolucion(LocalDateTime.now());
        return ReportResponse.from(reporteRepository.save(reporte));
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listAllUsers() {
        return usuarioRepository.findAllByOrderByIdUsuarioDesc()
            .stream()
            .map(AdminUserResponse::from)
            .toList();
    }

    @Transactional
    public AdminUserResponse toggleUserStatus(String adminEmail, Long idUsuario) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "El usuario indicado no existe"));

        if (usuario.getRol() == RolUsuario.ADMIN
                || (adminEmail != null
                    && adminEmail.equalsIgnoreCase(usuario.getCorreoInstitucional()))) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "No se puede modificar el estado de una cuenta administradora");
        }

        if (usuario.getEstado() == EstadoUsuario.ACTIVO) {
            usuario.setEstado(EstadoUsuario.SUSPENDIDO);
        } else {
            usuario.setEstado(EstadoUsuario.ACTIVO);
        }

        return AdminUserResponse.from(usuarioRepository.save(usuario));
    }

    private List<AdminActivityItem> buildRecentActivity() {
        List<AdminActivityItem> items = new ArrayList<>();

        List<Reporte> recentReports = reporteRepository.findTop10ByOrderByFechaCreacionDesc();
        if (recentReports != null) {
            for (Reporte r : recentReports) {
                String title = r.getPublicacion() != null ? r.getPublicacion().getTitulo() : "Publicación";
                String actor = r.getReportante() != null
                    ? r.getReportante().getCorreoInstitucional()
                    : "Usuario UPN";
                String action = switch (r.getEstado()) {
                    case ATENDIDO -> "Reporte atendido";
                    case DESESTIMADO -> "Reporte desestimado";
                    default -> "Reporte registrado";
                };
                LocalDateTime when = r.getFechaResolucion() != null
                    ? r.getFechaResolucion()
                    : r.getFechaCreacion();
                items.add(new AdminActivityItem(
                    "R-" + r.getIdReporte(),
                    "REPORTE",
                    action,
                    actor,
                    title,
                    r.getMotivo(),
                    when));
            }
        }

        List<Publicacion> recentPubs = publicacionRepository.findTop10ByOrderByFechaCreacionDesc();
        if (recentPubs != null) {
            for (Publicacion p : recentPubs) {
                String actor = p.getUsuario() != null
                    ? p.getUsuario().getCorreoInstitucional()
                    : "Estudiante UPN";
                String action = switch (p.getEstado()) {
                    case SUSPENDIDO -> "Publicación suspendida";
                    case RETIRADA -> "Publicación retirada";
                    case TRANSFERIDO -> "Publicación transferida";
                    default -> "Nueva publicación";
                };
                items.add(new AdminActivityItem(
                    "P-" + p.getIdPublicacion(),
                    "PUBLICACION",
                    action,
                    actor,
                    p.getTitulo(),
                    "Estado actual: " + p.getEstado() + " · Modalidad: " + p.getModalidad(),
                    p.getFechaCreacion()));
            }
        }

        List<Transaccion> recentTxs = transaccionRepository.findTop10ByOrderByFechaCreacionDesc();
        if (recentTxs != null) {
            for (Transaccion tx : recentTxs) {
                String title = tx.getPublicacion() != null ? tx.getPublicacion().getTitulo() : "Material";
                String actor = tx.getSolicitante() != null
                    ? tx.getSolicitante().getCorreoInstitucional()
                    : "Estudiante UPN";
                String action = switch (tx.getEstado()) {
                    case COMPLETADA -> "Intercambio completado";
                    case RECHAZADA -> "Solicitud rechazada";
                    case EN_NEGOCIACION -> "Intercambio en negociación";
                    default -> "Nueva solicitud";
                };
                LocalDateTime when = tx.getFechaCierre() != null
                    ? tx.getFechaCierre()
                    : tx.getFechaCreacion();
                items.add(new AdminActivityItem(
                    "T-" + tx.getIdTransaccion(),
                    "TRANSACCION",
                    action,
                    actor,
                    title,
                    "Transacción #" + tx.getIdTransaccion() + " (" + tx.getTipo() + ")",
                    when));
            }
        }

        return items.stream()
            .sorted(Comparator.comparing(
                AdminActivityItem::createdAt,
                Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(12)
            .toList();
    }
}

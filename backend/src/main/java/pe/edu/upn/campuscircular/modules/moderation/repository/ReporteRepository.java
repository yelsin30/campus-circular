package pe.edu.upn.campuscircular.modules.moderation.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import pe.edu.upn.campuscircular.modules.moderation.domain.EstadoReporte;
import pe.edu.upn.campuscircular.modules.moderation.domain.Reporte;

public interface ReporteRepository extends JpaRepository<Reporte, Long> {

    boolean existsByPublicacionIdPublicacionAndReportanteIdUsuarioAndEstado(
        Long idPublicacion, Long idReportante, EstadoReporte estado);

    List<Reporte> findByEstadoOrderByFechaCreacionDesc(EstadoReporte estado);

    List<Reporte> findAllByOrderByFechaCreacionDesc();

    List<Reporte> findByPublicacionIdPublicacionAndEstado(
        Long idPublicacion, EstadoReporte estado);
}

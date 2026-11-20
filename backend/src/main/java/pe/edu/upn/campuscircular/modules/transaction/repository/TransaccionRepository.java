package pe.edu.upn.campuscircular.modules.transaction.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import pe.edu.upn.campuscircular.modules.transaction.domain.EstadoTransaccion;
import pe.edu.upn.campuscircular.modules.transaction.domain.Transaccion;

public interface TransaccionRepository extends JpaRepository<Transaccion, Long> {

    List<Transaccion> findByPropietarioIdUsuarioOrSolicitanteIdUsuarioOrderByFechaCreacionDesc(
        Long idPropietario, Long idSolicitante);

    boolean existsByPublicacionIdPublicacionAndSolicitanteIdUsuarioAndEstadoIn(
        Long idPublicacion, Long idSolicitante, List<EstadoTransaccion> estados);

    long countByEstado(EstadoTransaccion estado);

    long countByEstadoIn(List<EstadoTransaccion> estados);

    List<Transaccion> findTop10ByOrderByFechaCreacionDesc();
}

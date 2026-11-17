package pe.edu.upn.campuscircular.modules.transaction.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import pe.edu.upn.campuscircular.modules.transaction.domain.Calificacion;

public interface CalificacionRepository extends JpaRepository<Calificacion, Long> {

    boolean existsByTransaccionIdTransaccionAndEmisorIdUsuario(Long idTransaccion, Long idEmisor);

    @Query("SELECT AVG(c.puntuacion) FROM Calificacion c WHERE c.receptor.idUsuario = :idReceptor")
    Double calculateAverageByReceptorId(@Param("idReceptor") Long idReceptor);
}

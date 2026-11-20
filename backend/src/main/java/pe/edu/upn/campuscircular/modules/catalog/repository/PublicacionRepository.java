package pe.edu.upn.campuscircular.modules.catalog.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;

public interface PublicacionRepository
        extends JpaRepository<Publicacion, Long>, JpaSpecificationExecutor<Publicacion> {

    List<Publicacion> findAllByOrderByFechaCreacionDesc();

    List<Publicacion> findTop10ByOrderByFechaCreacionDesc();

    long countByEstado(EstadoPublicacion estado);
}

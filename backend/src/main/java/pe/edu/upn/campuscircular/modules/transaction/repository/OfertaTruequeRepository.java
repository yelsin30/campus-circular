package pe.edu.upn.campuscircular.modules.transaction.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import pe.edu.upn.campuscircular.modules.transaction.domain.OfertaTrueque;

public interface OfertaTruequeRepository extends JpaRepository<OfertaTrueque, Long> {

    Optional<OfertaTrueque> findFirstByTransaccionIdTransaccion(Long idTransaccion);
}

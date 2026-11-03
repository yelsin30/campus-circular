package pe.edu.upn.campuscircular.modules.transaction.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import pe.edu.upn.campuscircular.modules.transaction.domain.Transaccion;

public interface TransaccionRepository extends JpaRepository<Transaccion, Long> {}

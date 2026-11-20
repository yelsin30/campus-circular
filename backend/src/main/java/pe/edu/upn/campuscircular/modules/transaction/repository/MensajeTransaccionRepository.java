package pe.edu.upn.campuscircular.modules.transaction.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import pe.edu.upn.campuscircular.modules.transaction.domain.MensajeTransaccion;

public interface MensajeTransaccionRepository extends JpaRepository<MensajeTransaccion, Long> {

    List<MensajeTransaccion> findByTransaccionIdTransaccionOrderByFechaEnvioAscIdMensajeAsc(
        Long idTransaccion);
}

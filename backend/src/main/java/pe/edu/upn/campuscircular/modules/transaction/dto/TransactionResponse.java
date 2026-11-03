package pe.edu.upn.campuscircular.modules.transaction.dto;

import java.time.LocalDateTime;

import pe.edu.upn.campuscircular.modules.transaction.domain.EstadoTransaccion;
import pe.edu.upn.campuscircular.modules.transaction.domain.TipoTransaccion;
import pe.edu.upn.campuscircular.modules.transaction.domain.Transaccion;

public record TransactionResponse(
    Long idTransaccion,
    Long idPublicacion,
    Long idPublicacionOfrecida,
    Long idSolicitante,
    Long idPropietario,
    TipoTransaccion tipo,
    EstadoTransaccion estado,
    LocalDateTime fechaCreacion
) {
    public static TransactionResponse from(Transaccion transaccion, Long idPublicacionOfrecida) {
        return new TransactionResponse(
            transaccion.getIdTransaccion(),
            transaccion.getPublicacion().getIdPublicacion(),
            idPublicacionOfrecida,
            transaccion.getSolicitante().getIdUsuario(),
            transaccion.getPropietario().getIdUsuario(),
            transaccion.getTipo(),
            transaccion.getEstado(),
            transaccion.getFechaCreacion());
    }
}

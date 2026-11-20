package pe.edu.upn.campuscircular.modules.transaction.dto;

import java.time.LocalDateTime;

import pe.edu.upn.campuscircular.modules.transaction.domain.MensajeTransaccion;

public record TransactionMessageResponse(
    Long idMensaje,
    Long idTransaccion,
    Long idEmisor,
    String correoEmisor,
    String contenido,
    LocalDateTime fechaEnvio
) {
    public static TransactionMessageResponse from(MensajeTransaccion message) {
        return new TransactionMessageResponse(
            message.getIdMensaje(),
            message.getTransaccion() != null ? message.getTransaccion().getIdTransaccion() : null,
            message.getEmisor() != null ? message.getEmisor().getIdUsuario() : null,
            message.getEmisor() != null ? message.getEmisor().getCorreoInstitucional() : null,
            message.getContenido(),
            message.getFechaEnvio());
    }
}

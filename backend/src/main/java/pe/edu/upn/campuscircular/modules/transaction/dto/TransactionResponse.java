package pe.edu.upn.campuscircular.modules.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
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
    LocalDateTime fechaCreacion,
    String tituloPublicacion,
    String categoriaPublicacion,
    String condicionPublicacion,
    BigDecimal precioSolidario,
    String tituloPublicacionOfrecida,
    String correoSolicitante,
    String correoPropietario,
    LocalDateTime otpExpiraEn,
    LocalDateTime fechaCierre,
    Boolean yaCalificada
) {
    public static TransactionResponse from(Transaccion transaccion, Long idPublicacionOfrecida) {
        return from(transaccion, null, idPublicacionOfrecida, false);
    }

    public static TransactionResponse from(
            Transaccion transaccion,
            Publicacion publicacionOfrecida,
            Long idPublicacionOfrecida,
            boolean yaCalificada) {
        Publicacion solicitada = transaccion.getPublicacion();
        Long resolvedOfferedId = publicacionOfrecida != null
            ? publicacionOfrecida.getIdPublicacion()
            : idPublicacionOfrecida;
        return new TransactionResponse(
            transaccion.getIdTransaccion(),
            solicitada != null ? solicitada.getIdPublicacion() : null,
            resolvedOfferedId,
            transaccion.getSolicitante() != null ? transaccion.getSolicitante().getIdUsuario() : null,
            transaccion.getPropietario() != null ? transaccion.getPropietario().getIdUsuario() : null,
            transaccion.getTipo(),
            transaccion.getEstado(),
            transaccion.getFechaCreacion(),
            solicitada != null ? solicitada.getTitulo() : null,
            solicitada != null && solicitada.getCategoria() != null
                ? solicitada.getCategoria().getNombre()
                : null,
            solicitada != null && solicitada.getCondicion() != null
                ? solicitada.getCondicion().name()
                : null,
            solicitada != null ? solicitada.getPrecioSolidario() : null,
            publicacionOfrecida != null ? publicacionOfrecida.getTitulo() : null,
            transaccion.getSolicitante() != null
                ? transaccion.getSolicitante().getCorreoInstitucional()
                : null,
            transaccion.getPropietario() != null
                ? transaccion.getPropietario().getCorreoInstitucional()
                : null,
            transaccion.getOtpExpiraEn(),
            transaccion.getFechaCierre(),
            yaCalificada);
    }
}

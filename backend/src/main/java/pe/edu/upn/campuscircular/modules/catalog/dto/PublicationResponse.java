package pe.edu.upn.campuscircular.modules.catalog.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import pe.edu.upn.campuscircular.modules.catalog.domain.CondicionPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.ModalidadPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;

public record PublicationResponse(
    Long id,
    Long categoriaId,
    String categoria,
    String carrera,
    Long usuarioId,
    String titulo,
    String descripcion,
    CondicionPublicacion condicion,
    ModalidadPublicacion modalidad,
    EstadoPublicacion estado,
    BigDecimal precioSolidario,
    LocalDateTime fechaCreacion
) {
    public static PublicationResponse from(Publicacion publication) {
        return new PublicationResponse(
            publication.getIdPublicacion(),
            publication.getCategoria().getIdCategoria(),
            publication.getCategoria().getNombre(),
            publication.getCategoria().getCarrera(),
            publication.getUsuario().getIdUsuario(),
            publication.getTitulo(),
            publication.getDescripcion(),
            publication.getCondicion(),
            publication.getModalidad(),
            publication.getEstado(),
            publication.getPrecioSolidario(),
            publication.getFechaCreacion());
    }
}

package pe.edu.upn.campuscircular.modules.catalog.dto;

import java.time.LocalDateTime;

import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;

public record CreatedPublicationResponse(
    Long id,
    EstadoPublicacion estado,
    LocalDateTime createdAt
) {
    public static CreatedPublicationResponse from(Publicacion publication) {
        return new CreatedPublicationResponse(
            publication.getIdPublicacion(),
            publication.getEstado(),
            publication.getFechaCreacion());
    }
}

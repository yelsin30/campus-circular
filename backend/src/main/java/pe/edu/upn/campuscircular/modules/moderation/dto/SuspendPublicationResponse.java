package pe.edu.upn.campuscircular.modules.moderation.dto;

import java.time.LocalDateTime;

import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;

public record SuspendPublicationResponse(
    Long idPublicacion,
    EstadoPublicacion estadoPublicacion,
    int reportesAtendidos,
    LocalDateTime fechaResolucion
) {}

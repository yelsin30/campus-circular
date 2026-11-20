package pe.edu.upn.campuscircular.modules.catalog.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

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
    String propietarioCorreo,
    String titulo,
    String descripcion,
    CondicionPublicacion condicion,
    ModalidadPublicacion modalidad,
    EstadoPublicacion estado,
    BigDecimal precioSolidario,
    String imagenUrl,
    List<String> imagenes,
    LocalDateTime fechaCreacion
) {
    public static PublicationResponse from(Publicacion publication) {
        List<String> resolvedImages = resolveImages(publication);
        String primaryImage = publication.getImagenUrl();
        if ((primaryImage == null || primaryImage.isBlank()) && !resolvedImages.isEmpty()) {
            primaryImage = resolvedImages.get(0);
        }
        String resolvedCareer = publication.getCarrera() != null && !publication.getCarrera().isBlank()
            ? publication.getCarrera()
            : publication.getCategoria().getCarrera();
        String ownerEmail = publication.getUsuario() != null
            ? publication.getUsuario().getCorreoInstitucional()
            : null;

        return new PublicationResponse(
            publication.getIdPublicacion(),
            publication.getCategoria().getIdCategoria(),
            publication.getCategoria().getNombre(),
            resolvedCareer,
            publication.getUsuario().getIdUsuario(),
            ownerEmail,
            publication.getTitulo(),
            publication.getDescripcion(),
            publication.getCondicion(),
            publication.getModalidad(),
            publication.getEstado(),
            publication.getPrecioSolidario(),
            primaryImage,
            resolvedImages,
            publication.getFechaCreacion());
    }

    private static List<String> resolveImages(Publicacion publication) {
        String raw = publication.getImagenesJson();
        if (raw != null && !raw.isBlank()) {
            List<String> parsed = Arrays.stream(raw.split("\\R"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
            if (!parsed.isEmpty()) {
                return parsed;
            }
        }
        if (publication.getImagenUrl() != null && !publication.getImagenUrl().isBlank()) {
            return List.of(publication.getImagenUrl().trim());
        }
        return List.of();
    }
}

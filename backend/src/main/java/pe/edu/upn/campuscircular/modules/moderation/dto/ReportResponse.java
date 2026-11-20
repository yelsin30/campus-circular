package pe.edu.upn.campuscircular.modules.moderation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.ModalidadPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
import pe.edu.upn.campuscircular.modules.moderation.domain.EstadoReporte;
import pe.edu.upn.campuscircular.modules.moderation.domain.Reporte;

public record ReportResponse(
    Long idReporte,
    Long idPublicacion,
    String tituloPublicacion,
    String descripcionPublicacion,
    String categoriaPublicacion,
    EstadoPublicacion estadoPublicacion,
    ModalidadPublicacion modalidadPublicacion,
    BigDecimal precioSolidarioPublicacion,
    String imagenUrlPublicacion,
    List<String> imagenesPublicacion,
    Long idPropietario,
    String correoPropietario,
    Long idReportante,
    String correoReportante,
    String motivo,
    EstadoReporte estado,
    LocalDateTime fechaCreacion,
    LocalDateTime fechaResolucion
) {
    public static ReportResponse from(Reporte reporte) {
        Publicacion pub = reporte.getPublicacion();
        List<String> resolvedImages = resolveImages(pub);
        String primaryImage = pub != null ? pub.getImagenUrl() : null;
        if ((primaryImage == null || primaryImage.isBlank()) && !resolvedImages.isEmpty()) {
            primaryImage = resolvedImages.get(0);
        }

        return new ReportResponse(
            reporte.getIdReporte(),
            pub != null ? pub.getIdPublicacion() : null,
            pub != null ? pub.getTitulo() : null,
            pub != null ? pub.getDescripcion() : null,
            pub != null && pub.getCategoria() != null ? pub.getCategoria().getNombre() : null,
            pub != null ? pub.getEstado() : null,
            pub != null ? pub.getModalidad() : null,
            pub != null ? pub.getPrecioSolidario() : null,
            primaryImage,
            resolvedImages,
            pub != null && pub.getUsuario() != null ? pub.getUsuario().getIdUsuario() : null,
            pub != null && pub.getUsuario() != null ? pub.getUsuario().getCorreoInstitucional() : null,
            reporte.getReportante() != null ? reporte.getReportante().getIdUsuario() : null,
            reporte.getReportante() != null ? reporte.getReportante().getCorreoInstitucional() : null,
            reporte.getMotivo(),
            reporte.getEstado(),
            reporte.getFechaCreacion(),
            reporte.getFechaResolucion());
    }

    private static List<String> resolveImages(Publicacion publication) {
        if (publication == null) {
            return List.of();
        }
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

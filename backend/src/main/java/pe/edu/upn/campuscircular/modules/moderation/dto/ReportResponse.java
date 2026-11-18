package pe.edu.upn.campuscircular.modules.moderation.dto;

import java.time.LocalDateTime;

import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
import pe.edu.upn.campuscircular.modules.moderation.domain.EstadoReporte;
import pe.edu.upn.campuscircular.modules.moderation.domain.Reporte;

public record ReportResponse(
    Long idReporte,
    Long idPublicacion,
    String tituloPublicacion,
    String categoriaPublicacion,
    EstadoPublicacion estadoPublicacion,
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
        return new ReportResponse(
            reporte.getIdReporte(),
            pub != null ? pub.getIdPublicacion() : null,
            pub != null ? pub.getTitulo() : null,
            pub != null && pub.getCategoria() != null ? pub.getCategoria().getNombre() : null,
            pub != null ? pub.getEstado() : null,
            pub != null && pub.getUsuario() != null ? pub.getUsuario().getIdUsuario() : null,
            pub != null && pub.getUsuario() != null ? pub.getUsuario().getCorreoInstitucional() : null,
            reporte.getReportante() != null ? reporte.getReportante().getIdUsuario() : null,
            reporte.getReportante() != null ? reporte.getReportante().getCorreoInstitucional() : null,
            reporte.getMotivo(),
            reporte.getEstado(),
            reporte.getFechaCreacion(),
            reporte.getFechaResolucion());
    }
}

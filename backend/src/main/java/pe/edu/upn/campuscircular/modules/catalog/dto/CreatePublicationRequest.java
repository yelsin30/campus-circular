package pe.edu.upn.campuscircular.modules.catalog.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import pe.edu.upn.campuscircular.modules.catalog.domain.CondicionPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.ModalidadPublicacion;

public record CreatePublicationRequest(
    @NotNull Long categoryId,
    @NotBlank @Size(max = 200) String titulo,
    @NotBlank String descripcion,
    @NotNull CondicionPublicacion condicion,
    @NotNull ModalidadPublicacion modalidad,
    @DecimalMin("0.00") @DecimalMax("80.00") BigDecimal precioSolidario,
    String imagenUrl,
    List<String> imagenes,
    @Size(max = 100) String carrera
) {
    public CreatePublicationRequest(
            Long categoryId,
            String titulo,
            String descripcion,
            CondicionPublicacion condicion,
            ModalidadPublicacion modalidad,
            BigDecimal precioSolidario) {
        this(categoryId, titulo, descripcion, condicion, modalidad, precioSolidario, null, null, null);
    }
}

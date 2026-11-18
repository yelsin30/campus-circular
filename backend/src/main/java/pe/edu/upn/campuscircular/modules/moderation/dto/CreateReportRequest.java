package pe.edu.upn.campuscircular.modules.moderation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateReportRequest(
    @NotBlank @Size(max = 500) String motivo
) {}

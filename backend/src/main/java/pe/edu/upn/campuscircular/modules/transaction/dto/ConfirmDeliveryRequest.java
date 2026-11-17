package pe.edu.upn.campuscircular.modules.transaction.dto;

import jakarta.validation.constraints.NotBlank;

public record ConfirmDeliveryRequest(
    @NotBlank String code
) {}

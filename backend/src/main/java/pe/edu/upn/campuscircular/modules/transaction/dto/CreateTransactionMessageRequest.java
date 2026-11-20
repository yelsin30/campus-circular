package pe.edu.upn.campuscircular.modules.transaction.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTransactionMessageRequest(
    @NotBlank @Size(max = 1000) String contenido
) {}

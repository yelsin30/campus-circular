package pe.edu.upn.campuscircular.modules.transaction.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateTransactionRequest(
    @NotNull @Positive Long idPublicacion,
    @NotNull @Positive Long idPublicacionOfrecida
) {}

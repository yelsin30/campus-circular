package pe.edu.upn.campuscircular.modules.transaction.dto;

import jakarta.validation.constraints.Size;

public record RejectTransactionRequest(
    @Size(max = 300, message = "El motivo de rechazo no puede superar los 300 caracteres")
    String reason
) {}

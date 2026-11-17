package pe.edu.upn.campuscircular.modules.transaction.dto;

import java.time.LocalDateTime;

public record DeliveryCodeResponse(
    String code,
    LocalDateTime expiresAt
) {}

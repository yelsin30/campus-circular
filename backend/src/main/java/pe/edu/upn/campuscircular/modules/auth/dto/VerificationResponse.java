package pe.edu.upn.campuscircular.modules.auth.dto;

import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;

public record VerificationResponse(
    Long userId,
    String email,
    EstadoUsuario estado,
    String message
) {}

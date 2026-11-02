package pe.edu.upn.campuscircular.modules.auth.dto;

import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;

public record RegistrationResponse(
    Long userId,
    String email,
    EstadoUsuario estado,
    String message
) {}

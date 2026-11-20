package pe.edu.upn.campuscircular.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResendCodeRequest(
    @NotBlank
    @Email
    @Pattern(regexp = "^[A-Za-z0-9._%+-]+@upn\\.pe$", message = "Debe usar un correo institucional @upn.pe")
    String email
) {}

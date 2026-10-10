
package pe.edu.upn.campuscircular.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyRequest(

    @NotBlank(message = "El correo es obligatorio")
    @Pattern(
        regexp = "(?i)^[A-Z0-9._%+-]+@upn\\.pe$",
        message = "Debe ingresar un correo institucional @upn.pe"
    )
    String email,

    @NotBlank(message = "El token es obligatorio")
    @Pattern(
        regexp = "^[0-9]{6}$",
        message = "El token debe contener exactamente 6 digitos"
    )
    String token

) {}


package pe.edu.upn.campuscircular.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;

public record LoginRequest(

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "El correo no tiene un formato valido")
    String email,

    @NotBlank(message = "La contrasena es obligatoria")
    String password

) {}

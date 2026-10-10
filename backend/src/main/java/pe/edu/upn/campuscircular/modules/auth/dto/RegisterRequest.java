
package pe.edu.upn.campuscircular.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

    @NotBlank(message = "Los nombres son obligatorios")
    String nombres,

    @NotBlank(message = "Los apellidos son obligatorios")
    String apellidos,

    @NotBlank(message = "El codigo de alumno es obligatorio")
    String codigoAlumno,

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "El correo no tiene un formato valido")
    @Pattern(
        regexp = "(?i)^[A-Z0-9._%+-]+@upn\\.pe$",
        message = "El correo debe pertenecer al dominio @upn.pe"
    )
    String email,

    @NotBlank(message = "La contrasena es obligatoria")
    @Size(
        min = 8,
        message = "La contrasena debe tener al menos 8 caracteres"
    )
    String password

) {}

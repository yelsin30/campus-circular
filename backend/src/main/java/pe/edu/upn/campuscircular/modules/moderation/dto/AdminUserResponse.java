package pe.edu.upn.campuscircular.modules.moderation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;
import pe.edu.upn.campuscircular.modules.auth.domain.RolUsuario;
import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;

public record AdminUserResponse(
    Long idUsuario,
    String nombres,
    String apellidos,
    String correoInstitucional,
    RolUsuario rol,
    EstadoUsuario estado,
    BigDecimal reputacionPromedio,
    LocalDateTime fechaCreacion
) {
    public static AdminUserResponse from(Usuario usuario) {
        return new AdminUserResponse(
            usuario.getIdUsuario(),
            usuario.getNombres(),
            usuario.getApellidos(),
            usuario.getCorreoInstitucional(),
            usuario.getRol(),
            usuario.getEstado(),
            usuario.getReputacionPromedio(),
            usuario.getFechaCreacion());
    }
}

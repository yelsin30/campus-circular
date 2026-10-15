
package pe.edu.upn.campuscircular.modules.auth.service;

import org.springframework.stereotype.Service;

import pe.edu.upn.campuscircular.modules.auth.dto.RegisterRequest;
import pe.edu.upn.campuscircular.modules.auth.dto.VerifyRequest;
import pe.edu.upn.campuscircular.modules.auth.dto.LoginRequest;

@Service
public class AuthService {

    // Registro de estudiantes
    public void register(RegisterRequest request) {

        // Pendiente: validar usuario existente
        // Pendiente: cifrar password con BCrypt
        // Pendiente: guardar usuario INACTIVO
        // Pendiente: generar token y enviar correo

        throw new UnsupportedOperationException(
            "Registro pendiente de implementacion"
        );
    }

    // Verificacion del correo institucional
    public void verify(VerifyRequest request) {

        // Pendiente: buscar token almacenado
        // Pendiente: comprobar expiracion
        // Pendiente: activar la cuenta
        // Pendiente: invalidar el token utilizado

        throw new UnsupportedOperationException(
            "Verificacion pendiente de implementacion"
        );
    }

    // Inicio de sesion
    public void login(LoginRequest request) {

        // Pendiente: buscar usuario por correo
        // Pendiente: verificar password con BCrypt
        // Pendiente: comprobar estado ACTIVO
        // Pendiente: generar JWT

        throw new UnsupportedOperationException(
            "Login pendiente de implementacion"
        );
    }
}

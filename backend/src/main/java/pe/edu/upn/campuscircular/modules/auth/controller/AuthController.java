
package pe.edu.upn.campuscircular.modules.auth.controller;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import pe.edu.upn.campuscircular.common.ApiError;
import pe.edu.upn.campuscircular.modules.auth.dto.RegisterRequest;
import pe.edu.upn.campuscircular.modules.auth.dto.VerifyRequest;
import pe.edu.upn.campuscircular.modules.auth.dto.LoginRequest;
import pe.edu.upn.campuscircular.modules.auth.service.AuthService;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    // Inyeccion de dependencias por constructor
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public void register(
            @Valid @RequestBody RegisterRequest request) {

        authService.register(request);
    }

    @PostMapping("/verify")
    public void verify(
            @Valid @RequestBody VerifyRequest request) {

        authService.verify(request);
    }

    @PostMapping("/login")
    public void login(
            @Valid @RequestBody LoginRequest request) {

        authService.login(request);
    }

    // Manejo temporal de funcionalidades pendientes
    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<ApiError> handleNotImplemented(
            UnsupportedOperationException ex,
            HttpServletRequest request) {

        ApiError error = new ApiError(
            Instant.now(),
            HttpStatus.NOT_IMPLEMENTED.value(),
            "NOT_IMPLEMENTED",
            ex.getMessage(),
            request.getRequestURI(),
            List.of()
        );

        return ResponseEntity
            .status(HttpStatus.NOT_IMPLEMENTED)
            .body(error);
    }
}


package pe.edu.upn.campuscircular.modules.auth.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import pe.edu.upn.campuscircular.modules.auth.dto.RegisterRequest;
import pe.edu.upn.campuscircular.modules.auth.dto.VerifyRequest;
import pe.edu.upn.campuscircular.modules.auth.dto.LoginRequest;
import pe.edu.upn.campuscircular.modules.auth.dto.AuthResponse;
import pe.edu.upn.campuscircular.modules.auth.dto.RegistrationResponse;
import pe.edu.upn.campuscircular.modules.auth.dto.VerificationResponse;
import pe.edu.upn.campuscircular.modules.auth.service.AuthService;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegistrationResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        return ResponseEntity.status(201).body(authService.register(request));
    }

    @PostMapping("/verify")
    public ResponseEntity<VerificationResponse> verify(
            @Valid @RequestBody VerifyRequest request) {

        return ResponseEntity.ok(authService.verify(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {

        return ResponseEntity.ok(authService.login(request));
    }
}

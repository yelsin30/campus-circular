
package pe.edu.upn.campuscircular.modules.auth.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import pe.edu.upn.campuscircular.modules.auth.domain.TokenVerificacion;
import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;
import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;
import pe.edu.upn.campuscircular.modules.auth.domain.RolUsuario;
import pe.edu.upn.campuscircular.modules.auth.dto.AuthResponse;
import pe.edu.upn.campuscircular.modules.auth.dto.RegistrationResponse;
import pe.edu.upn.campuscircular.modules.auth.dto.VerificationResponse;
import pe.edu.upn.campuscircular.modules.auth.dto.RegisterRequest;
import pe.edu.upn.campuscircular.modules.auth.dto.VerifyRequest;
import pe.edu.upn.campuscircular.modules.auth.dto.LoginRequest;
import pe.edu.upn.campuscircular.modules.auth.repository.TokenVerificacionRepository;
import pe.edu.upn.campuscircular.modules.auth.repository.UsuarioRepository;
import pe.edu.upn.campuscircular.modules.auth.security.JwtService;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final long TOKEN_TTL_MINUTES = 15;

    private final UsuarioRepository usuarioRepository;
    private final TokenVerificacionRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final JwtService jwtService;

    public AuthService(
            UsuarioRepository usuarioRepository,
            TokenVerificacionRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            JavaMailSender mailSender,
            JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
        this.jwtService = jwtService;
    }

    @Transactional
    public RegistrationResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (usuarioRepository.findByCorreoInstitucional(email).isPresent()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Ya existe una cuenta con ese correo");
        }

        Usuario usuario = new Usuario();
        usuario.setCorreoInstitucional(email);
        usuario.setPasswordHash(passwordEncoder.encode(request.password()));
        usuario.setRol(RolUsuario.USUARIO);
        usuario.setEstado(EstadoUsuario.INACTIVO);
        usuario = usuarioRepository.save(usuario);

        String token = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        TokenVerificacion tokenVerificacion = new TokenVerificacion();
        tokenVerificacion.setUsuario(usuario);
        tokenVerificacion.setTokenHash(passwordEncoder.encode(token));
        tokenVerificacion.setExpiraEn(LocalDateTime.now().plusMinutes(TOKEN_TTL_MINUTES));
        tokenVerificacion.setUsado(false);
        tokenRepository.save(tokenVerificacion);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("no-reply@upn.pe");
        message.setTo(email);
        message.setSubject("Verifica tu cuenta de Campus Circular");
        message.setText("Tu código de verificación es " + token
            + ". Vence en " + TOKEN_TTL_MINUTES + " minutos.");
        try {
            mailSender.send(message);
        } catch (MailException ex) {
            log.error("No se pudo enviar el correo de verificación a {}: {}",
                usuario.getCorreoInstitucional(), ex.getMessage());
        }
        return new RegistrationResponse(
            usuario.getIdUsuario(),
            usuario.getCorreoInstitucional(),
            usuario.getEstado(),
            "Token de verificación enviado");
    }

    @Transactional
    public VerificationResponse verify(VerifyRequest request) {
        Usuario usuario = findUser(request.email(), invalidVerificationToken());
        TokenVerificacion token = tokenRepository
            .findFirstByUsuarioAndUsadoFalseOrderByIdTokenDesc(usuario)
            .orElseThrow(() -> invalidVerificationToken());

        if (!token.getExpiraEn().isAfter(LocalDateTime.now())
                || !passwordEncoder.matches(request.token(), token.getTokenHash())) {
            throw invalidVerificationToken();
        }

        token.setUsado(true);
        usuario.setEstado(EstadoUsuario.ACTIVO);
        return new VerificationResponse(
            usuario.getIdUsuario(),
            usuario.getCorreoInstitucional(),
            usuario.getEstado(),
            "Cuenta verificada y activada exitosamente");
    }

    public AuthResponse login(LoginRequest request) {
        Usuario usuario = findUser(
            request.email(),
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Correo o contraseña inválidos"));
        if (usuario.getEstado() != EstadoUsuario.ACTIVO
                || !passwordEncoder.matches(request.password(), usuario.getPasswordHash())) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Correo o contraseña inválidos");
        }

        return new AuthResponse(
            jwtService.generateToken(
                usuario.getIdUsuario(),
                usuario.getCorreoInstitucional(),
                usuario.getRol().name()),
            "Bearer",
            JwtService.TOKEN_TTL_SECONDS,
            new AuthResponse.UserSummary(
                usuario.getIdUsuario(), usuario.getRol().name(),
                usuario.getReputacionPromedio()));
    }

    private Usuario findUser(String email, ResponseStatusException exception) {
        return usuarioRepository.findByCorreoInstitucional(normalizeEmail(email))
            .orElseThrow(() -> exception);
    }

    private static ResponseStatusException invalidVerificationToken() {
        return new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "El token de verificación no es válido o expiró");
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}

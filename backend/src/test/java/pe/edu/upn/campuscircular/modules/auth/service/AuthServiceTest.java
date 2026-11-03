package pe.edu.upn.campuscircular.modules.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;
import pe.edu.upn.campuscircular.modules.auth.dto.RegisterRequest;
import pe.edu.upn.campuscircular.modules.auth.repository.TokenVerificacionRepository;
import pe.edu.upn.campuscircular.modules.auth.repository.UsuarioRepository;
import pe.edu.upn.campuscircular.modules.auth.security.JwtService;

class AuthServiceTest {

    @Test
    void registrationContinuesWhenVerificationEmailCannotBeSent() {
        UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
        TokenVerificacionRepository tokenRepository = mock(TokenVerificacionRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        JavaMailSender mailSender = mock(JavaMailSender.class);
        JwtService jwtService = mock(JwtService.class);
        AuthService service = new AuthService(
            usuarioRepository, tokenRepository, passwordEncoder, mailSender, jwtService);

        when(usuarioRepository.findByCorreoInstitucional("ana@upn.pe"))
            .thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            ReflectionTestUtils.setField(usuario, "idUsuario", 7L);
            return usuario;
        });
        when(passwordEncoder.encode(any())).thenReturn("hashed-value");
        doThrow(new MailSendException("Mail service unavailable"))
            .when(mailSender).send(any(SimpleMailMessage.class));

        var response = service.register(new RegisterRequest(
            "Ana", "Estudiante", "123", "ANA@UPN.PE", "password123"));

        assertEquals(7L, response.userId());
        assertEquals("ana@upn.pe", response.email());
        verify(tokenRepository).save(any());
        var messageCaptor = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        assertEquals("no-reply@upn.pe", messageCaptor.getValue().getFrom());
    }
}

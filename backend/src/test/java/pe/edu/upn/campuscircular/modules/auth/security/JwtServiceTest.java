package pe.edu.upn.campuscircular.modules.auth.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRET = "campus-circular-test-secret-key-at-least-32-bytes";

    private final JwtService jwtService = new JwtService(new ObjectMapper(), SECRET);

    @Test
    void generatesAndValidatesBearerTokenClaims() {
        String token = jwtService.generateToken(105L, "ana@upn.pe", "USUARIO");

        assertEquals(3, token.split("\\.").length);
        assertEquals(
            new JwtService.JwtIdentity("ana@upn.pe", 105L, "USUARIO"),
            jwtService.validateToken(token).orElseThrow());
    }

    @Test
    void rejectsTamperedToken() {
        String token = jwtService.generateToken(105L, "ana@upn.pe", "USUARIO");
        String[] parts = token.split("\\.");
        parts[1] = (parts[1].startsWith("a") ? "b" : "a") + parts[1].substring(1);

        assertTrue(jwtService.validateToken(String.join(".", parts)).isEmpty());
    }

    @Test
    void requiresASecretWithAtLeast32Bytes() {
        assertThrows(
            IllegalStateException.class,
            () -> new JwtService(new ObjectMapper(), "too-short"));
    }
}

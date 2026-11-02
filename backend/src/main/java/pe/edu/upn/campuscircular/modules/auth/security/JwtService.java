package pe.edu.upn.campuscircular.modules.auth.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    public static final long TOKEN_TTL_SECONDS = 3600;

    private static final String ISSUER = "campus-circular";
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final byte[] secret;

    public JwtService(
            ObjectMapper objectMapper,
            @Value("${JWT_SECRET:}") String secret) {
        this.objectMapper = objectMapper;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        if (this.secret.length < 32) {
            throw new IllegalStateException(
                "JWT_SECRET debe contener al menos 32 bytes UTF-8");
        }
    }

    public String generateToken(Long userId, String email, String role) {
        try {
            String header = ENCODER.encodeToString(objectMapper.writeValueAsBytes(
                Map.of("alg", "HS256", "typ", "JWT")));
            long now = Instant.now().getEpochSecond();
            String payload = ENCODER.encodeToString(objectMapper.writeValueAsBytes(
                Map.of(
                    "iss", ISSUER,
                    "sub", email,
                    "uid", userId,
                    "role", role,
                    "iat", now,
                    "exp", now + TOKEN_TTL_SECONDS)));
            String content = header + "." + payload;
            return content + "." + ENCODER.encodeToString(sign(content));
        } catch (IOException | GeneralSecurityException ex) {
            throw new IllegalStateException("No se pudo emitir el token JWT", ex);
        }
    }

    public Optional<JwtIdentity> validateToken(String token) {
        try {
            String[] parts = token.split("\\.", -1);
            if (parts.length != 3) {
                return Optional.empty();
            }

            JsonNode header = objectMapper.readTree(DECODER.decode(parts[0]));
            if (!"HS256".equals(header.path("alg").asText())
                    || !"JWT".equals(header.path("typ").asText())) {
                return Optional.empty();
            }

            byte[] expected = sign(parts[0] + "." + parts[1]);
            byte[] actual = DECODER.decode(parts[2]);
            if (!MessageDigest.isEqual(expected, actual)) {
                return Optional.empty();
            }

            JsonNode claims = objectMapper.readTree(DECODER.decode(parts[1]));
            long expiresAt = claims.path("exp").asLong(0);
            String issuer = claims.path("iss").asText();
            String email = claims.path("sub").asText();
            long userId = claims.path("uid").asLong(0);
            String role = claims.path("role").asText();
            if (!ISSUER.equals(issuer) || expiresAt <= Instant.now().getEpochSecond()
                    || email.isBlank() || userId <= 0 || role.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(new JwtIdentity(email, userId, role));
        } catch (IllegalArgumentException | IOException | GeneralSecurityException ex) {
            return Optional.empty();
        }
    }

    private byte[] sign(String content) throws GeneralSecurityException {
        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
        return mac.doFinal(content.getBytes(StandardCharsets.US_ASCII));
    }

    public record JwtIdentity(String email, long userId, String role) {}
}

package pe.edu.upn.campuscircular.modules.auth.dto;

public record AuthResponse(
    String accessToken,
    String tokenType,
    long expiresIn,
    UserSummary user
) {
    public record UserSummary(Long id, String rol, java.math.BigDecimal reputacion) {}
}

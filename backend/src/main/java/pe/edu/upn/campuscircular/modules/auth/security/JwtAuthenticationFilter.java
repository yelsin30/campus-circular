package pe.edu.upn.campuscircular.modules.auth.security;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            try {
                String rawToken = authorization.substring(7).trim();
                var identity = jwtService.validateToken(rawToken);
                if (identity.isPresent()) {
                    var user = identity.get();
                    var authentication = new UsernamePasswordAuthenticationToken(
                        user.email(),
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.role())));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else {
                    log.debug(
                        "Token JWT expirado o inválido en {}: continuando como petición anónima",
                        request.getRequestURI());
                    SecurityContextHolder.clearContext();
                }
            } catch (IllegalArgumentException ex) {
                log.debug(
                    "Token JWT malformado en {}: {}",
                    request.getRequestURI(),
                    ex.getMessage());
                SecurityContextHolder.clearContext();
            } catch (Exception ex) {
                log.debug(
                    "No se pudo procesar el token JWT en {}: {}",
                    request.getRequestURI(),
                    ex.getMessage());
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}

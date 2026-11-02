package pe.edu.upn.campuscircular.modules.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import pe.edu.upn.campuscircular.modules.auth.domain.TokenVerificacion;
import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;

public interface TokenVerificacionRepository
        extends JpaRepository<TokenVerificacion, Long> {
    Optional<TokenVerificacion> findFirstByUsuarioAndUsadoFalseOrderByIdTokenDesc(
        Usuario usuario);
}

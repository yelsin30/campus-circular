package pe.edu.upn.campuscircular.modules.transaction.service;

import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;
import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;
import pe.edu.upn.campuscircular.modules.auth.repository.UsuarioRepository;
import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.ModalidadPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
import pe.edu.upn.campuscircular.modules.catalog.repository.PublicacionRepository;
import pe.edu.upn.campuscircular.modules.transaction.domain.EstadoTransaccion;
import pe.edu.upn.campuscircular.modules.transaction.domain.OfertaTrueque;
import pe.edu.upn.campuscircular.modules.transaction.domain.TipoTransaccion;
import pe.edu.upn.campuscircular.modules.transaction.domain.Transaccion;
import pe.edu.upn.campuscircular.modules.transaction.dto.CreateTransactionRequest;
import pe.edu.upn.campuscircular.modules.transaction.dto.TransactionResponse;
import pe.edu.upn.campuscircular.modules.transaction.repository.OfertaTruequeRepository;
import pe.edu.upn.campuscircular.modules.transaction.repository.TransaccionRepository;

@Service
public class TransactionService {

    private static final String PENDING_OFFER_STATUS = "PENDIENTE";

    private final TransaccionRepository transaccionRepository;
    private final OfertaTruequeRepository ofertaTruequeRepository;
    private final PublicacionRepository publicacionRepository;
    private final UsuarioRepository usuarioRepository;

    public TransactionService(
            TransaccionRepository transaccionRepository,
            OfertaTruequeRepository ofertaTruequeRepository,
            PublicacionRepository publicacionRepository,
            UsuarioRepository usuarioRepository) {
        this.transaccionRepository = transaccionRepository;
        this.ofertaTruequeRepository = ofertaTruequeRepository;
        this.publicacionRepository = publicacionRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public TransactionResponse create(String email, CreateTransactionRequest request) {
        Usuario solicitante = usuarioRepository.findByCorreoInstitucional(email)
            .filter(usuario -> usuario.getEstado() == EstadoUsuario.ACTIVO)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "La sesión no corresponde a una cuenta activa"));

        Publicacion solicitada = publicacionRepository.findById(request.idPublicacion())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "La publicación solicitada no existe"));
        Publicacion ofrecida = publicacionRepository.findById(request.idPublicacionOfrecida())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "La publicación ofrecida no existe"));

        if (solicitada.getIdPublicacion().equals(ofrecida.getIdPublicacion())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Las publicaciones solicitada y ofrecida deben ser distintas");
        }
        if (solicitada.getUsuario().getIdUsuario().equals(solicitante.getIdUsuario())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "No se puede solicitar una publicación propia");
        }
        if (!ofrecida.getUsuario().getIdUsuario().equals(solicitante.getIdUsuario())) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "La publicación ofrecida debe pertenecer al usuario autenticado");
        }
        requireAvailableTrade(solicitada, "solicitada");
        requireAvailableTrade(ofrecida, "ofrecida");

        Transaccion transaccion = new Transaccion();
        transaccion.setPublicacion(solicitada);
        transaccion.setSolicitante(solicitante);
        transaccion.setPropietario(solicitada.getUsuario());
        transaccion.setTipo(TipoTransaccion.TRUEQUE);
        transaccion.setEstado(EstadoTransaccion.PENDIENTE);
        transaccion.setFechaCreacion(LocalDateTime.now());
        transaccion = transaccionRepository.save(transaccion);

        OfertaTrueque oferta = new OfertaTrueque();
        oferta.setTransaccion(transaccion);
        oferta.setPublicacionOfrecida(ofrecida);
        oferta.setEstado(PENDING_OFFER_STATUS);
        ofertaTruequeRepository.save(oferta);

        return TransactionResponse.from(transaccion, ofrecida.getIdPublicacion());
    }

    private static void requireAvailableTrade(Publicacion publicacion, String role) {
        if (publicacion.getEstado() != EstadoPublicacion.DISPONIBLE
                || publicacion.getModalidad() != ModalidadPublicacion.TRUEQUE) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La publicación " + role + " no está disponible para trueque");
        }
    }
}

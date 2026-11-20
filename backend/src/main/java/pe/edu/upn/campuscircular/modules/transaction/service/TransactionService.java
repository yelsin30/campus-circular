package pe.edu.upn.campuscircular.modules.transaction.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
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
import pe.edu.upn.campuscircular.modules.metrics.service.ImpactMetricsService;
import pe.edu.upn.campuscircular.modules.transaction.domain.Calificacion;
import pe.edu.upn.campuscircular.modules.transaction.domain.EstadoTransaccion;
import pe.edu.upn.campuscircular.modules.transaction.domain.MensajeTransaccion;
import pe.edu.upn.campuscircular.modules.transaction.domain.OfertaTrueque;
import pe.edu.upn.campuscircular.modules.transaction.domain.TipoTransaccion;
import pe.edu.upn.campuscircular.modules.transaction.domain.Transaccion;
import pe.edu.upn.campuscircular.modules.transaction.dto.ConfirmDeliveryRequest;
import pe.edu.upn.campuscircular.modules.transaction.dto.CreateRatingRequest;
import pe.edu.upn.campuscircular.modules.transaction.dto.CreateTransactionMessageRequest;
import pe.edu.upn.campuscircular.modules.transaction.dto.CreateTransactionRequest;
import pe.edu.upn.campuscircular.modules.transaction.dto.DeliveryCodeResponse;
import pe.edu.upn.campuscircular.modules.transaction.dto.RatingResponse;
import pe.edu.upn.campuscircular.modules.transaction.dto.TransactionMessageResponse;
import pe.edu.upn.campuscircular.modules.transaction.dto.TransactionResponse;
import pe.edu.upn.campuscircular.modules.transaction.repository.CalificacionRepository;
import pe.edu.upn.campuscircular.modules.transaction.repository.MensajeTransaccionRepository;
import pe.edu.upn.campuscircular.modules.transaction.repository.OfertaTruequeRepository;
import pe.edu.upn.campuscircular.modules.transaction.repository.TransaccionRepository;

@Service
public class TransactionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionService.class);
    private static final String PENDING_OFFER_STATUS = "PENDIENTE";
    private static final String ACCEPTED_OFFER_STATUS = "ACEPTADA";
    private static final String REJECTED_OFFER_STATUS = "RECHAZADA";
    private static final String OTP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int OTP_LENGTH = 6;
    private static final long OTP_TTL_MINUTES = 15;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final TransaccionRepository transaccionRepository;
    private final OfertaTruequeRepository ofertaTruequeRepository;
    private final PublicacionRepository publicacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final CalificacionRepository calificacionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final ImpactMetricsService impactMetricsService;
    private final MensajeTransaccionRepository mensajeTransaccionRepository;

    public TransactionService(
            TransaccionRepository transaccionRepository,
            OfertaTruequeRepository ofertaTruequeRepository,
            PublicacionRepository publicacionRepository,
            UsuarioRepository usuarioRepository) {
        this(
            transaccionRepository,
            ofertaTruequeRepository,
            publicacionRepository,
            usuarioRepository,
            null,
            new BCryptPasswordEncoder(),
            null,
            null,
            null);
    }

    public TransactionService(
            TransaccionRepository transaccionRepository,
            OfertaTruequeRepository ofertaTruequeRepository,
            PublicacionRepository publicacionRepository,
            UsuarioRepository usuarioRepository,
            CalificacionRepository calificacionRepository,
            PasswordEncoder passwordEncoder,
            JavaMailSender mailSender) {
        this(
            transaccionRepository,
            ofertaTruequeRepository,
            publicacionRepository,
            usuarioRepository,
            calificacionRepository,
            passwordEncoder,
            mailSender,
            null,
            null);
    }

    public TransactionService(
            TransaccionRepository transaccionRepository,
            OfertaTruequeRepository ofertaTruequeRepository,
            PublicacionRepository publicacionRepository,
            UsuarioRepository usuarioRepository,
            CalificacionRepository calificacionRepository,
            PasswordEncoder passwordEncoder,
            JavaMailSender mailSender,
            ImpactMetricsService impactMetricsService) {
        this(
            transaccionRepository,
            ofertaTruequeRepository,
            publicacionRepository,
            usuarioRepository,
            calificacionRepository,
            passwordEncoder,
            mailSender,
            impactMetricsService,
            null);
    }

    @Autowired
    public TransactionService(
            TransaccionRepository transaccionRepository,
            OfertaTruequeRepository ofertaTruequeRepository,
            PublicacionRepository publicacionRepository,
            UsuarioRepository usuarioRepository,
            CalificacionRepository calificacionRepository,
            PasswordEncoder passwordEncoder,
            JavaMailSender mailSender,
            ImpactMetricsService impactMetricsService,
            MensajeTransaccionRepository mensajeTransaccionRepository) {
        this.transaccionRepository = transaccionRepository;
        this.ofertaTruequeRepository = ofertaTruequeRepository;
        this.publicacionRepository = publicacionRepository;
        this.usuarioRepository = usuarioRepository;
        this.calificacionRepository = calificacionRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
        this.impactMetricsService = impactMetricsService;
        this.mensajeTransaccionRepository = mensajeTransaccionRepository;
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> findByUser(String email) {
        Usuario usuario = requireActiveUser(email);
        Long userId = usuario.getIdUsuario();
        return transaccionRepository
            .findByPropietarioIdUsuarioOrSolicitanteIdUsuarioOrderByFechaCreacionDesc(userId, userId)
            .stream()
            .map(tx -> toResponse(tx, userId))
            .toList();
    }

    @Transactional
    public TransactionResponse create(String email, CreateTransactionRequest request) {
        Usuario solicitante = requireActiveUser(email);

        Publicacion solicitada = publicacionRepository.findById(request.idPublicacion())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "La publicación solicitada no existe"));
        if (solicitada.getUsuario().getIdUsuario().equals(solicitante.getIdUsuario())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "No puedes solicitar un trueque sobre tu propia publicación");
        }

        ModalidadPublicacion modalidad = solicitada.getModalidad();
        Publicacion ofrecida = null;

        if (modalidad == ModalidadPublicacion.TRUEQUE) {
            if (request.idPublicacionOfrecida() == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Para un trueque debes seleccionar la publicación que ofreces a cambio");
            }
            ofrecida = publicacionRepository.findById(request.idPublicacionOfrecida())
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "La publicación ofrecida no existe"));

            if (solicitada.getIdPublicacion().equals(ofrecida.getIdPublicacion())) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Las publicaciones solicitada y ofrecida deben ser distintas");
            }
            if (!ofrecida.getUsuario().getIdUsuario().equals(solicitante.getIdUsuario())) {
                throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "La publicación ofrecida debe pertenecer al usuario autenticado");
            }
            requireAvailableTrade(solicitada, "solicitada");
            requireAvailableTrade(ofrecida, "ofrecida");
        } else {
            if (request.idPublicacionOfrecida() != null) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La publicación solicitada no permite trueque porque su modalidad es "
                        + modalidad + " (se requiere TRUEQUE)");
            }
            if (solicitada.getEstado() != EstadoPublicacion.DISPONIBLE) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La publicación solicitada no está disponible porque su estado es "
                        + solicitada.getEstado() + " (se requiere DISPONIBLE)");
            }
        }

        TipoTransaccion tipoTransaccion = switch (modalidad) {
            case VENTA_SOLIDARIA -> TipoTransaccion.VENTA_SOLIDARIA;
            case DONACION -> TipoTransaccion.DONACION;
            case TRUEQUE -> TipoTransaccion.TRUEQUE;
        };

        Transaccion transaccion = new Transaccion();
        transaccion.setPublicacion(solicitada);
        transaccion.setSolicitante(solicitante);
        transaccion.setPropietario(solicitada.getUsuario());
        transaccion.setTipo(tipoTransaccion);
        transaccion.setEstado(EstadoTransaccion.PENDIENTE);
        transaccion.setFechaCreacion(LocalDateTime.now());
        transaccion = transaccionRepository.save(transaccion);

        if (ofrecida != null) {
            OfertaTrueque oferta = new OfertaTrueque();
            oferta.setTransaccion(transaccion);
            oferta.setPublicacionOfrecida(ofrecida);
            oferta.setEstado(PENDING_OFFER_STATUS);
            ofertaTruequeRepository.save(oferta);
        }

        if (mensajeTransaccionRepository != null
                && request.mensajeInicial() != null
                && !request.mensajeInicial().isBlank()) {
            MensajeTransaccion mensaje = new MensajeTransaccion();
            mensaje.setTransaccion(transaccion);
            mensaje.setEmisor(solicitante);
            mensaje.setContenido(request.mensajeInicial().trim());
            mensaje.setFechaEnvio(LocalDateTime.now());
            mensajeTransaccionRepository.save(mensaje);
        }

        return TransactionResponse.from(
            transaccion,
            ofrecida,
            ofrecida != null ? ofrecida.getIdPublicacion() : null,
            false);
    }

    @Transactional(readOnly = true)
    public List<TransactionMessageResponse> getMessages(String email, Long idTransaccion) {
        Usuario usuario = requireActiveUser(email);
        Transaccion transaccion = findTransaction(idTransaccion);

        if (!isParticipant(transaccion, usuario)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Solo los participantes de la transacción pueden consultar los mensajes");
        }
        if (mensajeTransaccionRepository == null) {
            return List.of();
        }
        return mensajeTransaccionRepository
            .findByTransaccionIdTransaccionOrderByFechaEnvioAscIdMensajeAsc(idTransaccion)
            .stream()
            .map(TransactionMessageResponse::from)
            .toList();
    }

    @Transactional
    public TransactionMessageResponse sendMessage(
            String email, Long idTransaccion, CreateTransactionMessageRequest request) {
        Usuario usuario = requireActiveUser(email);
        Transaccion transaccion = findTransaction(idTransaccion);

        if (!isParticipant(transaccion, usuario)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Solo los participantes de la transacción pueden enviar mensajes");
        }
        if (transaccion.getEstado() != EstadoTransaccion.PENDIENTE
                && transaccion.getEstado() != EstadoTransaccion.EN_NEGOCIACION
                && transaccion.getEstado() != EstadoTransaccion.ACEPTADA) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Solo se pueden enviar mensajes en transacciones activas (PENDIENTE o EN_NEGOCIACION)");
        }
        if (request == null || request.contenido() == null || request.contenido().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "El mensaje no puede estar vacío");
        }

        MensajeTransaccion mensaje = new MensajeTransaccion();
        mensaje.setTransaccion(transaccion);
        mensaje.setEmisor(usuario);
        mensaje.setContenido(request.contenido().trim());
        mensaje.setFechaEnvio(LocalDateTime.now());
        if (mensajeTransaccionRepository != null) {
            mensaje = mensajeTransaccionRepository.save(mensaje);
        }
        return TransactionMessageResponse.from(mensaje);
    }

    @Transactional
    public TransactionResponse accept(String email, Long idTransaccion) {
        Usuario usuario = requireActiveUser(email);
        Transaccion transaccion = findTransaction(idTransaccion);

        if (!isOwner(transaccion, usuario)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Solo el propietario de la publicación solicitada puede aceptar la transacción");
        }
        if (transaccion.getEstado() != EstadoTransaccion.PENDIENTE) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Solo se pueden aceptar transacciones en estado PENDIENTE");
        }

        transaccion.setEstado(EstadoTransaccion.EN_NEGOCIACION);
        Publicacion solicitada = transaccion.getPublicacion();
        if (solicitada != null) {
            solicitada.setEstado(EstadoPublicacion.EN_NEGOCIACION);
            publicacionRepository.save(solicitada);
        }

        Optional<OfertaTrueque> ofertaOpt = ofertaTruequeRepository
            .findFirstByTransaccionIdTransaccion(idTransaccion);
        Publicacion ofrecida = null;
        if (ofertaOpt.isPresent()) {
            OfertaTrueque oferta = ofertaOpt.get();
            ofrecida = oferta.getPublicacionOfrecida();
            if (ofrecida != null) {
                ofrecida.setEstado(EstadoPublicacion.EN_NEGOCIACION);
                publicacionRepository.save(ofrecida);
            }
        }

        transaccion = transaccionRepository.save(transaccion);
        return TransactionResponse.from(
            transaccion,
            ofrecida,
            ofrecida != null ? ofrecida.getIdPublicacion() : null,
            false);
    }

    @Transactional
    public TransactionResponse reject(String email, Long idTransaccion) {
        Usuario usuario = requireActiveUser(email);
        Transaccion transaccion = findTransaction(idTransaccion);

        if (!isOwner(transaccion, usuario)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Solo el propietario de la publicación solicitada puede rechazar la transacción");
        }
        if (transaccion.getEstado() != EstadoTransaccion.PENDIENTE) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Solo se pueden rechazar transacciones en estado PENDIENTE");
        }

        transaccion.setEstado(EstadoTransaccion.RECHAZADA);
        Publicacion solicitada = transaccion.getPublicacion();
        if (solicitada != null) {
            solicitada.setEstado(EstadoPublicacion.DISPONIBLE);
            publicacionRepository.save(solicitada);
        }

        Optional<OfertaTrueque> ofertaOpt = ofertaTruequeRepository
            .findFirstByTransaccionIdTransaccion(idTransaccion);
        Publicacion ofrecida = null;
        if (ofertaOpt.isPresent()) {
            OfertaTrueque oferta = ofertaOpt.get();
            oferta.setEstado(REJECTED_OFFER_STATUS);
            ofertaTruequeRepository.save(oferta);
            ofrecida = oferta.getPublicacionOfrecida();
            if (ofrecida != null) {
                ofrecida.setEstado(EstadoPublicacion.DISPONIBLE);
                publicacionRepository.save(ofrecida);
            }
        }

        transaccion = transaccionRepository.save(transaccion);
        return TransactionResponse.from(
            transaccion,
            ofrecida,
            ofrecida != null ? ofrecida.getIdPublicacion() : null,
            false);
    }

    @Transactional
    public DeliveryCodeResponse generateDeliveryCode(String email, Long idTransaccion) {
        Usuario usuario = requireActiveUser(email);
        Transaccion transaccion = findTransaction(idTransaccion);

        if (!isParticipant(transaccion, usuario)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "No eres participante autorizado de esta transacción");
        }
        if (transaccion.getEstado() != EstadoTransaccion.EN_NEGOCIACION) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Solo se puede generar código de entrega para transacciones EN_NEGOCIACION");
        }

        String code = generateRandomAlphanumericCode();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES);
        transaccion.setOtpHash(passwordEncoder.encode(code));
        transaccion.setOtpExpiraEn(expiresAt);
        transaccionRepository.save(transaccion);

        if (mailSender != null && transaccion.getPropietario() != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom("no-reply@upn.pe");
                message.setTo(transaccion.getPropietario().getCorreoInstitucional());
                message.setSubject("Código OTP de entrega - Campus Circular");
                message.setText(
                    "Tu código OTP de entrega para la transacción #"
                        + transaccion.getIdTransaccion()
                        + " es: "
                        + code
                        + ". Expira en "
                        + OTP_TTL_MINUTES
                        + " minutos.");
                mailSender.send(message);
            } catch (Exception ex) {
                log.warn("No se pudo enviar correo con el código OTP para transacción #{}: {}",
                    transaccion.getIdTransaccion(), ex.getMessage());
            }
        }

        return new DeliveryCodeResponse(code, expiresAt);
    }

    @Transactional
    public TransactionResponse confirmDelivery(
            String email, Long idTransaccion, ConfirmDeliveryRequest request) {
        Usuario usuario = requireActiveUser(email);
        Transaccion transaccion = findTransaction(idTransaccion);

        if (!isParticipant(transaccion, usuario)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "No eres participante autorizado de esta transacción");
        }
        if (transaccion.getEstado() != EstadoTransaccion.EN_NEGOCIACION) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Solo se puede confirmar la entrega de transacciones EN_NEGOCIACION");
        }
        if (transaccion.getOtpHash() == null || transaccion.getOtpExpiraEn() == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Aún no se ha generado un código OTP para esta transacción");
        }
        if (LocalDateTime.now().isAfter(transaccion.getOtpExpiraEn())) {
            throw new ResponseStatusException(
                HttpStatus.GONE,
                "El código OTP de entrega ha expirado. Solicita un nuevo código.");
        }

        String normalizedCode = request == null || request.code() == null
            ? ""
            : request.code().trim().toUpperCase(Locale.ROOT);
        if (normalizedCode.isEmpty()
                || !passwordEncoder.matches(normalizedCode, transaccion.getOtpHash())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "El código OTP ingresado es incorrecto");
        }

        transaccion.setEstado(EstadoTransaccion.COMPLETADA);
        transaccion.setFechaCierre(LocalDateTime.now());
        transaccion.setOtpHash(null);
        transaccion.setOtpExpiraEn(null);

        Publicacion solicitada = transaccion.getPublicacion();
        if (solicitada != null) {
            solicitada.setEstado(EstadoPublicacion.TRANSFERIDO);
            publicacionRepository.save(solicitada);
        }

        Optional<OfertaTrueque> ofertaOpt = ofertaTruequeRepository
            .findFirstByTransaccionIdTransaccion(idTransaccion);
        Publicacion ofrecida = null;
        if (ofertaOpt.isPresent()) {
            OfertaTrueque oferta = ofertaOpt.get();
            oferta.setEstado(ACCEPTED_OFFER_STATUS);
            ofertaTruequeRepository.save(oferta);
            ofrecida = oferta.getPublicacionOfrecida();
            if (ofrecida != null) {
                ofrecida.setEstado(EstadoPublicacion.TRANSFERIDO);
                publicacionRepository.save(ofrecida);
            }
        }

        transaccion = transaccionRepository.save(transaccion);
        if (impactMetricsService != null) {
            impactMetricsService.recordTransactionImpact(transaccion, solicitada, ofrecida);
        }
        return toResponse(transaccion, usuario.getIdUsuario(), ofrecida);
    }

    @Transactional
    public RatingResponse rate(String email, Long idTransaccion, CreateRatingRequest request) {
        Usuario emisor = requireActiveUser(email);
        if (request == null || request.score() == null || request.score() < 1 || request.score() > 5) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "La puntuación debe estar entre 1 y 5");
        }

        Transaccion transaccion = findTransaction(idTransaccion);
        if (transaccion.getEstado() != EstadoTransaccion.COMPLETADA) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Solo se pueden calificar transacciones en estado COMPLETADA");
        }
        if (!isParticipant(transaccion, emisor)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "No eres participante autorizado de esta transacción");
        }
        if (calificacionRepository != null
                && calificacionRepository.existsByTransaccionIdTransaccionAndEmisorIdUsuario(
                    idTransaccion, emisor.getIdUsuario())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Ya calificaste esta transacción");
        }

        Usuario receptor = isOwner(transaccion, emisor)
            ? transaccion.getSolicitante()
            : transaccion.getPropietario();

        Calificacion calificacion = new Calificacion();
        calificacion.setTransaccion(transaccion);
        calificacion.setEmisor(emisor);
        calificacion.setReceptor(receptor);
        calificacion.setPuntuacion(request.score());
        calificacion.setComentario(
            request.comment() != null && !request.comment().isBlank()
                ? request.comment().trim()
                : null);
        calificacion.setFechaCreacion(LocalDateTime.now());
        if (calificacionRepository != null) {
            calificacion = calificacionRepository.save(calificacion);
        }

        Double avg = calificacionRepository != null
            ? calificacionRepository.calculateAverageByReceptorId(receptor.getIdUsuario())
            : null;
        BigDecimal promedio = BigDecimal
            .valueOf(avg != null ? avg : request.score().doubleValue())
            .setScale(2, RoundingMode.HALF_UP);
        receptor.setReputacionPromedio(promedio);
        usuarioRepository.save(receptor);

        return new RatingResponse(
            calificacion.getIdCalificacion(),
            transaccion.getIdTransaccion(),
            emisor.getIdUsuario(),
            receptor.getIdUsuario(),
            calificacion.getPuntuacion(),
            calificacion.getComentario(),
            promedio,
            calificacion.getFechaCreacion());
    }

    private TransactionResponse toResponse(Transaccion transaccion, Long currentUserId) {
        Publicacion ofrecida = ofertaTruequeRepository
            .findFirstByTransaccionIdTransaccion(transaccion.getIdTransaccion())
            .map(OfertaTrueque::getPublicacionOfrecida)
            .orElse(null);
        return toResponse(transaccion, currentUserId, ofrecida);
    }

    private TransactionResponse toResponse(
            Transaccion transaccion, Long currentUserId, Publicacion ofrecida) {
        boolean yaCalificada = calificacionRepository != null
            && currentUserId != null
            && transaccion.getIdTransaccion() != null
            && calificacionRepository.existsByTransaccionIdTransaccionAndEmisorIdUsuario(
                transaccion.getIdTransaccion(), currentUserId);
        return TransactionResponse.from(
            transaccion,
            ofrecida,
            ofrecida != null ? ofrecida.getIdPublicacion() : null,
            yaCalificada);
    }

    private Usuario requireActiveUser(String email) {
        return usuarioRepository.findByCorreoInstitucional(email)
            .filter(usuario -> usuario.getEstado() == EstadoUsuario.ACTIVO)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "La sesión no corresponde a una cuenta activa"));
    }

    private Transaccion findTransaction(Long idTransaccion) {
        return transaccionRepository.findById(idTransaccion)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "La transacción indicada no existe"));
    }

    private static boolean isOwner(Transaccion transaccion, Usuario usuario) {
        if (transaccion.getPropietario() != null
                && transaccion.getPropietario().getIdUsuario().equals(usuario.getIdUsuario())) {
            return true;
        }
        return transaccion.getPublicacion() != null
            && transaccion.getPublicacion().getUsuario() != null
            && transaccion.getPublicacion().getUsuario().getIdUsuario().equals(usuario.getIdUsuario());
    }

    private static boolean isParticipant(Transaccion transaccion, Usuario usuario) {
        return isOwner(transaccion, usuario)
            || (transaccion.getSolicitante() != null
                && transaccion.getSolicitante().getIdUsuario().equals(usuario.getIdUsuario()));
    }

    private static String generateRandomAlphanumericCode() {
        StringBuilder sb = new StringBuilder(OTP_LENGTH);
        for (int i = 0; i < OTP_LENGTH; i++) {
            sb.append(OTP_ALPHABET.charAt(SECURE_RANDOM.nextInt(OTP_ALPHABET.length())));
        }
        return sb.toString();
    }

    private static void requireAvailableTrade(Publicacion publicacion, String role) {
        if (publicacion.getEstado() != EstadoPublicacion.DISPONIBLE) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La publicación " + role + " no está disponible para trueque porque su estado es "
                    + publicacion.getEstado() + " (se requiere DISPONIBLE)");
        }
        if (publicacion.getModalidad() != ModalidadPublicacion.TRUEQUE) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La publicación " + role + " no permite trueque porque su modalidad es "
                    + publicacion.getModalidad() + " (se requiere TRUEQUE)");
        }
    }
}

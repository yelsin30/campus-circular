package pe.edu.upn.campuscircular.modules.transaction.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;
import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;
import pe.edu.upn.campuscircular.modules.auth.repository.UsuarioRepository;
import pe.edu.upn.campuscircular.modules.catalog.domain.Categoria;
import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.ModalidadPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
import pe.edu.upn.campuscircular.modules.catalog.repository.PublicacionRepository;
import pe.edu.upn.campuscircular.modules.metrics.domain.MetricaImpacto;
import pe.edu.upn.campuscircular.modules.metrics.repository.MetricaImpactoRepository;
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
import pe.edu.upn.campuscircular.modules.transaction.repository.CalificacionRepository;
import pe.edu.upn.campuscircular.modules.transaction.repository.MensajeTransaccionRepository;
import pe.edu.upn.campuscircular.modules.transaction.repository.OfertaTruequeRepository;
import pe.edu.upn.campuscircular.modules.transaction.repository.TransaccionRepository;

class TransactionServiceTest {

    @Test
    void createsPendingTradeLinkingBothPublications() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository);

        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Publicacion requested = publication(101L, owner);
        Publicacion offered = publication(202L, requester);
        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(publicationRepository.findById(101L)).thenReturn(Optional.of(requested));
        when(publicationRepository.findById(202L)).thenReturn(Optional.of(offered));
        when(transactionRepository.save(any(Transaccion.class))).thenAnswer(invocation -> {
            Transaccion transaction = invocation.getArgument(0);
            ReflectionTestUtils.setField(transaction, "idTransaccion", 301L);
            return transaction;
        });

        var response = service.create(
            "solicitante@upn.pe", new CreateTransactionRequest(101L, 202L));

        assertEquals(101L, response.idPublicacion());
        assertEquals(202L, response.idPublicacionOfrecida());
        assertEquals(11L, response.idSolicitante());
        assertEquals(22L, response.idPropietario());
        assertEquals(TipoTransaccion.TRUEQUE, response.tipo());
        assertEquals(EstadoTransaccion.PENDIENTE, response.estado());
        var transactionCaptor = org.mockito.ArgumentCaptor
            .forClass(Transaccion.class);
        var offerCaptor = org.mockito.ArgumentCaptor.forClass(OfertaTrueque.class);
        verify(transactionRepository).save(transactionCaptor.capture());
        verify(offerRepository).save(offerCaptor.capture());
        assertEquals(requested, transactionCaptor.getValue().getPublicacion());
        assertEquals(requester, transactionCaptor.getValue().getSolicitante());
        assertEquals(owner, transactionCaptor.getValue().getPropietario());
        assertEquals(transactionCaptor.getValue(), offerCaptor.getValue().getTransaccion());
        assertEquals(offered, offerCaptor.getValue().getPublicacionOfrecida());
        assertEquals("PENDIENTE", offerCaptor.getValue().getEstado());
    }

    @Test
    void rejectsTradeWhenOfferedPublicationBelongsToAnotherUser() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository);
        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Usuario otherOwner = user(33L, EstadoUsuario.ACTIVO);
        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(publicationRepository.findById(101L))
            .thenReturn(Optional.of(publication(101L, owner)));
        when(publicationRepository.findById(202L))
            .thenReturn(Optional.of(publication(202L, otherOwner)));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.create(
                "solicitante@upn.pe", new CreateTransactionRequest(101L, 202L)));

        assertEquals(403, exception.getStatusCode().value());
        verifyNoInteractions(transactionRepository, offerRepository);
    }

    @Test
    void rejectsTradeWhenRequestingOwnPublication() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository);
        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(publicationRepository.findById(101L))
            .thenReturn(Optional.of(publication(101L, requester)));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.create(
                "solicitante@upn.pe", new CreateTransactionRequest(101L, 101L)));

        assertEquals(400, exception.getStatusCode().value());
        assertEquals("No puedes solicitar un trueque sobre tu propia publicación", exception.getReason());
        verifyNoInteractions(transactionRepository, offerRepository);
    }

    @Test
    void rejectsTradeWithSpecificMessageWhenRequestedModalityIsNotTrueque() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository);
        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Publicacion requested = publication(101L, owner);
        requested.setModalidad(ModalidadPublicacion.VENTA_SOLIDARIA);
        Publicacion offered = publication(202L, requester);
        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(publicationRepository.findById(101L)).thenReturn(Optional.of(requested));
        when(publicationRepository.findById(202L)).thenReturn(Optional.of(offered));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.create(
                "solicitante@upn.pe", new CreateTransactionRequest(101L, 202L)));

        assertEquals(409, exception.getStatusCode().value());
        assertEquals(
            "La publicación solicitada no permite trueque porque su modalidad es VENTA_SOLIDARIA (se requiere TRUEQUE)",
            exception.getReason());
        verifyNoInteractions(transactionRepository, offerRepository);
    }

    @Test
    void rejectsTradeWithSpecificMessageWhenPublicationStatusIsNotDisponible() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository);
        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Publicacion requested = publication(101L, owner);
        requested.setEstado(EstadoPublicacion.EN_NEGOCIACION);
        Publicacion offered = publication(202L, requester);
        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(publicationRepository.findById(101L)).thenReturn(Optional.of(requested));
        when(publicationRepository.findById(202L)).thenReturn(Optional.of(offered));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.create(
                "solicitante@upn.pe", new CreateTransactionRequest(101L, 202L)));

        assertEquals(409, exception.getStatusCode().value());
        assertEquals(
            "La publicación solicitada no está disponible para trueque porque su estado es EN_NEGOCIACION (se requiere DISPONIBLE)",
            exception.getReason());
        verifyNoInteractions(transactionRepository, offerRepository);
    }

    @Test
    void acceptsPendingTransactionAndBlocksInvolvedPublications() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        CalificacionRepository calificacionRepository = mock(CalificacionRepository.class);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        JavaMailSender mailSender = mock(JavaMailSender.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository,
            calificacionRepository, passwordEncoder, mailSender);

        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Publicacion requested = publication(101L, owner);
        Publicacion offered = publication(202L, requester);
        Transaccion tx = transaction(301L, requested, requester, owner, EstadoTransaccion.PENDIENTE);
        OfertaTrueque oferta = new OfertaTrueque();
        oferta.setTransaccion(tx);
        oferta.setPublicacionOfrecida(offered);
        oferta.setEstado("PENDIENTE");

        when(userRepository.findByCorreoInstitucional("propietario@upn.pe"))
            .thenReturn(Optional.of(owner));
        when(transactionRepository.findById(301L)).thenReturn(Optional.of(tx));
        when(offerRepository.findFirstByTransaccionIdTransaccion(301L))
            .thenReturn(Optional.of(oferta));
        when(transactionRepository.save(any(Transaccion.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.accept("propietario@upn.pe", 301L);

        assertEquals(EstadoTransaccion.EN_NEGOCIACION, response.estado());
        assertEquals(EstadoPublicacion.EN_NEGOCIACION, requested.getEstado());
        assertEquals(EstadoPublicacion.EN_NEGOCIACION, offered.getEstado());
    }

    @Test
    void rejectsConfirmDeliveryWithGoneWhenOtpExpired() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        CalificacionRepository calificacionRepository = mock(CalificacionRepository.class);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        JavaMailSender mailSender = mock(JavaMailSender.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository,
            calificacionRepository, passwordEncoder, mailSender);

        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Publicacion requested = publication(101L, owner);
        Transaccion tx = transaction(
            301L, requested, requester, owner, EstadoTransaccion.EN_NEGOCIACION);
        tx.setOtpHash(passwordEncoder.encode("A7B9X2"));
        tx.setOtpExpiraEn(LocalDateTime.now().minusMinutes(1));

        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(transactionRepository.findById(301L)).thenReturn(Optional.of(tx));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.confirmDelivery(
                "solicitante@upn.pe", 301L, new ConfirmDeliveryRequest("A7B9X2")));

        assertEquals(410, exception.getStatusCode().value());
    }

    @Test
    void rejectsConfirmDeliveryWithBadRequestWhenOtpIsInvalid() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        CalificacionRepository calificacionRepository = mock(CalificacionRepository.class);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        JavaMailSender mailSender = mock(JavaMailSender.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository,
            calificacionRepository, passwordEncoder, mailSender);

        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Publicacion requested = publication(101L, owner);
        Transaccion tx = transaction(
            301L, requested, requester, owner, EstadoTransaccion.EN_NEGOCIACION);
        tx.setOtpHash(passwordEncoder.encode("A7B9X2"));
        tx.setOtpExpiraEn(LocalDateTime.now().plusMinutes(10));

        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(transactionRepository.findById(301L)).thenReturn(Optional.of(tx));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.confirmDelivery(
                "solicitante@upn.pe", 301L, new ConfirmDeliveryRequest("ZZZZZZ")));

        assertEquals(400, exception.getStatusCode().value());
    }

    @Test
    void completesTransactionAndMarksPublicationsTransferredOnValidOtp() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        CalificacionRepository calificacionRepository = mock(CalificacionRepository.class);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        JavaMailSender mailSender = mock(JavaMailSender.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository,
            calificacionRepository, passwordEncoder, mailSender);

        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Publicacion requested = publication(101L, owner);
        requested.setEstado(EstadoPublicacion.EN_NEGOCIACION);
        Publicacion offered = publication(202L, requester);
        offered.setEstado(EstadoPublicacion.EN_NEGOCIACION);
        Transaccion tx = transaction(
            301L, requested, requester, owner, EstadoTransaccion.EN_NEGOCIACION);
        OfertaTrueque oferta = new OfertaTrueque();
        oferta.setTransaccion(tx);
        oferta.setPublicacionOfrecida(offered);
        oferta.setEstado("PENDIENTE");

        when(userRepository.findByCorreoInstitucional("propietario@upn.pe"))
            .thenReturn(Optional.of(owner));
        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(transactionRepository.findById(301L)).thenReturn(Optional.of(tx));
        when(offerRepository.findFirstByTransaccionIdTransaccion(301L))
            .thenReturn(Optional.of(oferta));
        when(transactionRepository.save(any(Transaccion.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        var codeResponse = service.generateDeliveryCode("propietario@upn.pe", 301L);
        assertEquals(6, codeResponse.code().length());
        assertNotNull(tx.getOtpHash());

        var completed = service.confirmDelivery(
            "solicitante@upn.pe", 301L, new ConfirmDeliveryRequest(codeResponse.code()));

        assertEquals(EstadoTransaccion.COMPLETADA, completed.estado());
        assertNotNull(tx.getFechaCierre());
        assertNull(tx.getOtpHash());
        assertEquals(EstadoPublicacion.TRANSFERIDO, requested.getEstado());
        assertEquals(EstadoPublicacion.TRANSFERIDO, offered.getEstado());
        assertEquals("ACEPTADA", oferta.getEstado());
    }

    @Test
    void ratesCompletedTransactionUpdatesReputationAndRejectsDuplicateWithConflict() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        CalificacionRepository calificacionRepository = mock(CalificacionRepository.class);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        JavaMailSender mailSender = mock(JavaMailSender.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository,
            calificacionRepository, passwordEncoder, mailSender);

        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Publicacion requested = publication(101L, owner);
        Transaccion tx = transaction(
            301L, requested, requester, owner, EstadoTransaccion.COMPLETADA);

        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(transactionRepository.findById(301L)).thenReturn(Optional.of(tx));
        when(calificacionRepository.existsByTransaccionIdTransaccionAndEmisorIdUsuario(301L, 11L))
            .thenReturn(false)
            .thenReturn(true);
        when(calificacionRepository.save(any(Calificacion.class))).thenAnswer(invocation -> {
            Calificacion c = invocation.getArgument(0);
            ReflectionTestUtils.setField(c, "idCalificacion", 501L);
            return c;
        });
        when(calificacionRepository.calculateAverageByReceptorId(22L)).thenReturn(4.5);

        var ratingResponse = service.rate(
            "solicitante@upn.pe", 301L, new CreateRatingRequest(5, "Excelente intercambio"));

        assertEquals(501L, ratingResponse.idCalificacion());
        assertEquals(new BigDecimal("4.50"), owner.getReputacionPromedio());
        verify(userRepository).save(owner);

        ResponseStatusException duplicateEx = assertThrows(
            ResponseStatusException.class,
            () -> service.rate(
                "solicitante@upn.pe", 301L, new CreateRatingRequest(4, "Duplicada")));

        assertEquals(409, duplicateEx.getStatusCode().value());
    }

    @Test
    void recordsImpactMetricsWithRaeeAndSavingsWhenConfirmingDelivery() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        CalificacionRepository calificacionRepository = mock(CalificacionRepository.class);
        MetricaImpactoRepository metricaRepository = mock(MetricaImpactoRepository.class);
        ImpactMetricsService impactMetricsService = new ImpactMetricsService(metricaRepository);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        JavaMailSender mailSender = mock(JavaMailSender.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository,
            calificacionRepository, passwordEncoder, mailSender, impactMetricsService);

        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Categoria catRedes = new Categoria();
        catRedes.setNombre("Redes");
        Categoria catMicro = new Categoria();
        catMicro.setNombre("Microcontroladores");

        Publicacion requested = publication(101L, owner);
        requested.setCategoria(catRedes);
        requested.setEstado(EstadoPublicacion.EN_NEGOCIACION);

        Publicacion offered = publication(202L, requester);
        offered.setCategoria(catMicro);
        offered.setEstado(EstadoPublicacion.EN_NEGOCIACION);

        Transaccion tx = transaction(
            301L, requested, requester, owner, EstadoTransaccion.EN_NEGOCIACION);
        tx.setOtpHash(passwordEncoder.encode("K9M2P4"));
        tx.setOtpExpiraEn(LocalDateTime.now().plusMinutes(10));

        OfertaTrueque oferta = new OfertaTrueque();
        oferta.setTransaccion(tx);
        oferta.setPublicacionOfrecida(offered);
        oferta.setEstado("PENDIENTE");

        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(transactionRepository.findById(301L)).thenReturn(Optional.of(tx));
        when(offerRepository.findFirstByTransaccionIdTransaccion(301L))
            .thenReturn(Optional.of(oferta));
        when(transactionRepository.save(any(Transaccion.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(metricaRepository.findByTransaccionIdTransaccion(301L))
            .thenReturn(Optional.empty());
        when(metricaRepository.save(any(MetricaImpacto.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        service.confirmDelivery(
            "solicitante@upn.pe", 301L, new ConfirmDeliveryRequest("K9M2P4"));

        var metricaCaptor = org.mockito.ArgumentCaptor.forClass(MetricaImpacto.class);
        verify(metricaRepository).save(metricaCaptor.capture());
        MetricaImpacto saved = metricaCaptor.getValue();
        assertEquals(2, saved.getArticulosReinsertados());
        assertEquals(new BigDecimal("0.850"), saved.getRaeeKg());
        assertEquals(new BigDecimal("160.00"), saved.getAhorroPen());
    }

    @Test
    void createsVentaSolidariaWithoutOfferedPublicationAndSavesInitialMessage() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        CalificacionRepository calificacionRepository = mock(CalificacionRepository.class);
        MensajeTransaccionRepository messageRepository = mock(MensajeTransaccionRepository.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository,
            calificacionRepository, new BCryptPasswordEncoder(), null, null, messageRepository);

        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Publicacion requested = publication(101L, owner);
        requested.setModalidad(ModalidadPublicacion.VENTA_SOLIDARIA);
        requested.setPrecioSolidario(new BigDecimal("35.00"));

        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(publicationRepository.findById(101L)).thenReturn(Optional.of(requested));
        when(transactionRepository.save(any(Transaccion.class))).thenAnswer(invocation -> {
            Transaccion tx = invocation.getArgument(0);
            ReflectionTestUtils.setField(tx, "idTransaccion", 401L);
            return tx;
        });

        var response = service.create(
            "solicitante@upn.pe",
            new CreateTransactionRequest(101L, null, "Nos vemos mañana en biblioteca a las 3pm"));

        assertEquals(TipoTransaccion.VENTA_SOLIDARIA, response.tipo());
        assertEquals(EstadoTransaccion.PENDIENTE, response.estado());
        assertNull(response.idPublicacionOfrecida());
        verifyNoInteractions(offerRepository);
        verify(messageRepository).save(any(MensajeTransaccion.class));
    }

    @Test
    void participantsCanSendAndReadMessagesWhileOutsidersAreForbidden() {
        TransaccionRepository transactionRepository = mock(TransaccionRepository.class);
        OfertaTruequeRepository offerRepository = mock(OfertaTruequeRepository.class);
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        UsuarioRepository userRepository = mock(UsuarioRepository.class);
        CalificacionRepository calificacionRepository = mock(CalificacionRepository.class);
        MensajeTransaccionRepository messageRepository = mock(MensajeTransaccionRepository.class);
        TransactionService service = new TransactionService(
            transactionRepository, offerRepository, publicationRepository, userRepository,
            calificacionRepository, new BCryptPasswordEncoder(), null, null, messageRepository);

        Usuario requester = user(11L, EstadoUsuario.ACTIVO);
        Usuario owner = user(22L, EstadoUsuario.ACTIVO);
        Usuario outsider = user(99L, EstadoUsuario.ACTIVO);
        Publicacion requested = publication(101L, owner);
        Transaccion tx = transaction(301L, requested, requester, owner, EstadoTransaccion.EN_NEGOCIACION);

        when(userRepository.findByCorreoInstitucional("solicitante@upn.pe"))
            .thenReturn(Optional.of(requester));
        when(userRepository.findByCorreoInstitucional("externo@upn.pe"))
            .thenReturn(Optional.of(outsider));
        when(transactionRepository.findById(301L)).thenReturn(Optional.of(tx));
        when(messageRepository.save(any(MensajeTransaccion.class))).thenAnswer(invocation -> {
            MensajeTransaccion msg = invocation.getArgument(0);
            ReflectionTestUtils.setField(msg, "idMensaje", 701L);
            return msg;
        });
        when(messageRepository.findByTransaccionIdTransaccionOrderByFechaEnvioAscIdMensajeAsc(301L))
            .thenReturn(List.of());

        var sent = service.sendMessage(
            "solicitante@upn.pe", 301L, new CreateTransactionMessageRequest("Te espero en puerta 1"));
        assertEquals(701L, sent.idMensaje());
        assertEquals("Te espero en puerta 1", sent.contenido());

        ResponseStatusException forbidden = assertThrows(
            ResponseStatusException.class,
            () -> service.getMessages("externo@upn.pe", 301L));
        assertEquals(403, forbidden.getStatusCode().value());
    }

    private static Usuario user(long id, EstadoUsuario estado) {
        Usuario usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "idUsuario", id);
        usuario.setCorreoInstitucional("user" + id + "@upn.pe");
        usuario.setEstado(estado);
        return usuario;
    }

    private static Publicacion publication(long id, Usuario owner) {
        Publicacion publicacion = new Publicacion();
        ReflectionTestUtils.setField(publicacion, "idPublicacion", id);
        publicacion.setUsuario(owner);
        publicacion.setTitulo("Material #" + id);
        publicacion.setModalidad(ModalidadPublicacion.TRUEQUE);
        ReflectionTestUtils.setField(publicacion, "estado", EstadoPublicacion.DISPONIBLE);
        return publicacion;
    }

    private static Transaccion transaction(
            long id,
            Publicacion publicacion,
            Usuario solicitante,
            Usuario propietario,
            EstadoTransaccion estado) {
        Transaccion tx = new Transaccion();
        ReflectionTestUtils.setField(tx, "idTransaccion", id);
        tx.setPublicacion(publicacion);
        tx.setSolicitante(solicitante);
        tx.setPropietario(propietario);
        tx.setTipo(TipoTransaccion.TRUEQUE);
        tx.setEstado(estado);
        tx.setFechaCreacion(LocalDateTime.now());
        return tx;
    }
}

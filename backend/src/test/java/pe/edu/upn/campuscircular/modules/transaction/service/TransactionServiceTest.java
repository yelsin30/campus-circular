package pe.edu.upn.campuscircular.modules.transaction.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;
import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;
import pe.edu.upn.campuscircular.modules.auth.repository.UsuarioRepository;
import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.ModalidadPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
import pe.edu.upn.campuscircular.modules.catalog.repository.PublicacionRepository;
import pe.edu.upn.campuscircular.modules.transaction.domain.OfertaTrueque;
import pe.edu.upn.campuscircular.modules.transaction.domain.EstadoTransaccion;
import pe.edu.upn.campuscircular.modules.transaction.domain.Transaccion;
import pe.edu.upn.campuscircular.modules.transaction.domain.TipoTransaccion;
import pe.edu.upn.campuscircular.modules.transaction.dto.CreateTransactionRequest;
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

    private static Usuario user(long id, EstadoUsuario estado) {
        Usuario usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "idUsuario", id);
        usuario.setEstado(estado);
        return usuario;
    }

    private static Publicacion publication(long id, Usuario owner) {
        Publicacion publicacion = new Publicacion();
        ReflectionTestUtils.setField(publicacion, "idPublicacion", id);
        publicacion.setUsuario(owner);
        publicacion.setModalidad(ModalidadPublicacion.TRUEQUE);
        ReflectionTestUtils.setField(publicacion, "estado", EstadoPublicacion.DISPONIBLE);
        return publicacion;
    }
}

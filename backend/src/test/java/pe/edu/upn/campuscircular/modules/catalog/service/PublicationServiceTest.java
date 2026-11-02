package pe.edu.upn.campuscircular.modules.catalog.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import pe.edu.upn.campuscircular.modules.catalog.domain.CondicionPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.ModalidadPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.dto.CreatePublicationRequest;
import pe.edu.upn.campuscircular.modules.catalog.repository.CategoriaRepository;
import pe.edu.upn.campuscircular.modules.catalog.repository.PublicacionRepository;
import pe.edu.upn.campuscircular.modules.auth.repository.UsuarioRepository;

class PublicationServiceTest {

    @Test
    void rejectsPricesAboveEightyBeforeDatabaseAccess() {
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        CategoriaRepository categoriaRepository = mock(CategoriaRepository.class);
        UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
        PublicationService service = new PublicationService(
            publicationRepository, categoriaRepository, usuarioRepository);
        CreatePublicationRequest request = new CreatePublicationRequest(
            3L,
            "Kit Arduino",
            "Operativo",
            CondicionPublicacion.SEMINUEVO,
            ModalidadPublicacion.VENTA_SOLIDARIA,
            new BigDecimal("80.01"));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.create("ana@upn.pe", request));

        assertEquals(400, exception.getStatusCode().value());
        verifyNoInteractions(publicationRepository, categoriaRepository, usuarioRepository);
    }
}

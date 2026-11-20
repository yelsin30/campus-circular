package pe.edu.upn.campuscircular.modules.catalog.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;
import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;
import pe.edu.upn.campuscircular.modules.catalog.domain.Categoria;
import pe.edu.upn.campuscircular.modules.catalog.domain.CondicionPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.ModalidadPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
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

    @Test
    void persistsCompressedDataUrlImagesAndCareerWhenCreatingPublication() {
        PublicacionRepository publicationRepository = mock(PublicacionRepository.class);
        CategoriaRepository categoriaRepository = mock(CategoriaRepository.class);
        UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
        PublicationService service = new PublicationService(
            publicationRepository, categoriaRepository, usuarioRepository);

        Usuario usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "idUsuario", 5L);
        usuario.setCorreoInstitucional("ana@upn.pe");
        usuario.setEstado(EstadoUsuario.ACTIVO);

        Categoria categoria = new Categoria();
        ReflectionTestUtils.setField(categoria, "idCategoria", 1L);
        categoria.setNombre("Libros");
        categoria.setCarrera("Ingeniería de Sistemas");

        when(usuarioRepository.findByCorreoInstitucional("ana@upn.pe"))
            .thenReturn(Optional.of(usuario));
        when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
        when(publicationRepository.save(any(Publicacion.class))).thenAnswer(invocation -> {
            Publicacion p = invocation.getArgument(0);
            ReflectionTestUtils.setField(p, "idPublicacion", 42L);
            return p;
        });

        String dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD";
        CreatePublicationRequest request = new CreatePublicationRequest(
            1L,
            "Libro de Cálculo",
            "En excelente estado",
            CondicionPublicacion.SEMINUEVO,
            ModalidadPublicacion.DONACION,
            null,
            dataUrl,
            List.of(dataUrl),
            "Arquitectura");

        var created = service.create("ana@upn.pe", request);

        assertEquals(42L, created.id());
        ArgumentCaptor<Publicacion> captor = ArgumentCaptor.forClass(Publicacion.class);
        verify(publicationRepository).save(captor.capture());
        assertEquals(dataUrl, captor.getValue().getImagenUrl());
        assertEquals("Arquitectura", captor.getValue().getCarrera());
    }
}

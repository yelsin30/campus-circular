package pe.edu.upn.campuscircular.modules.catalog.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Locale;

import jakarta.persistence.criteria.Predicate;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import pe.edu.upn.campuscircular.modules.auth.domain.EstadoUsuario;
import pe.edu.upn.campuscircular.modules.auth.repository.UsuarioRepository;
import pe.edu.upn.campuscircular.modules.catalog.domain.Categoria;
import pe.edu.upn.campuscircular.modules.catalog.domain.CondicionPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.EstadoPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.ModalidadPublicacion;
import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
import pe.edu.upn.campuscircular.modules.catalog.dto.CreatePublicationRequest;
import pe.edu.upn.campuscircular.modules.catalog.dto.CreatedPublicationResponse;
import pe.edu.upn.campuscircular.modules.catalog.dto.PublicationResponse;
import pe.edu.upn.campuscircular.modules.catalog.repository.CategoriaRepository;
import pe.edu.upn.campuscircular.modules.catalog.repository.PublicacionRepository;

@Service
public class PublicationService {

    private static final BigDecimal MAX_SOLIDARITY_PRICE = new BigDecimal("80.00");

    private final PublicacionRepository publicacionRepository;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;

    public PublicationService(
            PublicacionRepository publicacionRepository,
            CategoriaRepository categoriaRepository,
            UsuarioRepository usuarioRepository) {
        this.publicacionRepository = publicacionRepository;
        this.categoriaRepository = categoriaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public Page<PublicationResponse> search(
            String carrera,
            Long category,
            String condition,
            String modality,
            String query,
            Pageable pageable) {
        CondicionPublicacion parsedCondition = parseFilter(
            condition, CondicionPublicacion.class, "condition");
        ModalidadPublicacion parsedModality = parseFilter(
            modality, ModalidadPublicacion.class, "modality");

        Specification<Publicacion> specification = (root, criteriaQuery, builder) -> {
            var predicates = new ArrayList<Predicate>();
            predicates.add(builder.equal(root.get("estado"), EstadoPublicacion.DISPONIBLE));

            if (carrera != null && !carrera.isBlank()) {
                predicates.add(builder.equal(
                    builder.lower(root.get("categoria").get("carrera")),
                    carrera.trim().toLowerCase(Locale.ROOT)));
            }
            if (category != null) {
                predicates.add(builder.equal(root.get("categoria").get("idCategoria"), category));
            }
            if (parsedCondition != null) {
                predicates.add(builder.equal(root.get("condicion"), parsedCondition));
            }
            if (parsedModality != null) {
                predicates.add(builder.equal(root.get("modalidad"), parsedModality));
            }
            if (query != null && !query.isBlank()) {
                String pattern = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(builder.or(
                    builder.like(builder.lower(root.get("titulo")), pattern),
                    builder.like(builder.lower(root.get("descripcion")), pattern)));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };

        return publicacionRepository.findAll(specification, pageable)
            .map(PublicationResponse::from);
    }

    @Transactional
    public CreatedPublicationResponse create(String email, CreatePublicationRequest request) {
        if (request.precioSolidario() != null
                && request.precioSolidario().compareTo(MAX_SOLIDARITY_PRICE) > 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "El precio solidario no puede superar S/ 80.00");
        }

        var usuario = usuarioRepository.findByCorreoInstitucional(email)
            .filter(found -> found.getEstado() == EstadoUsuario.ACTIVO)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "La sesión no corresponde a una cuenta activa"));
        Categoria categoria = categoriaRepository.findById(request.categoryId())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "La categoría indicada no existe"));

        Publicacion publication = new Publicacion();
        publication.setUsuario(usuario);
        publication.setCategoria(categoria);
        publication.setTitulo(request.titulo().trim());
        publication.setDescripcion(request.descripcion().trim());
        publication.setCondicion(request.condicion());
        publication.setModalidad(request.modalidad());
        publication.setPrecioSolidario(request.precioSolidario());
        return CreatedPublicationResponse.from(publicacionRepository.save(publication));
    }

    private static <T extends Enum<T>> T parseFilter(
            String value, Class<T> enumType, String parameterName) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(enumType, value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Valor no válido para el filtro " + parameterName);
        }
    }
}

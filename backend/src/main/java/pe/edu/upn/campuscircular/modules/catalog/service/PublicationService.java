package pe.edu.upn.campuscircular.modules.catalog.service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
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
    private static final int MAX_IMAGES_PER_PUBLICATION = 3;

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
            String category,
            String condition,
            String modality,
            String query,
            Pageable pageable) {
        CondicionPublicacion parsedCondition = parseConditionFilter(condition);
        ModalidadPublicacion parsedModality = parseModalityFilter(modality);

        Specification<Publicacion> specification = (root, criteriaQuery, builder) -> {
            var predicates = new ArrayList<Predicate>();
            predicates.add(builder.equal(root.get("estado"), EstadoPublicacion.DISPONIBLE));

            if (carrera != null && !carrera.isBlank()
                    && !normalizeSlug(carrera).equals("todas las carreras")) {
                String pattern = "%" + carrera.trim().toLowerCase(Locale.ROOT) + "%";
                String asciiPattern = "%" + normalizeSlug(carrera) + "%";
                predicates.add(builder.or(
                    builder.like(builder.lower(root.get("carrera")), pattern),
                    builder.like(builder.lower(root.get("carrera")), asciiPattern),
                    builder.like(builder.lower(root.get("categoria").get("carrera")), pattern),
                    builder.like(builder.lower(root.get("categoria").get("carrera")), asciiPattern)
                ));
            }
            if (category != null && !category.isBlank()) {
                String normalizedCat = normalizeSlug(category);
                if (!normalizedCat.equals("todos") && !normalizedCat.equals("all")) {
                    Long numericId = tryParseLong(category.trim());
                    if (numericId != null) {
                        List<String> groupNames = categoryGroupNamesById(numericId);
                        if (!groupNames.isEmpty()) {
                            predicates.add(builder.or(
                                builder.equal(root.get("categoria").get("idCategoria"), numericId),
                                builder.lower(root.get("categoria").get("nombre")).in(groupNames)
                            ));
                        } else {
                            predicates.add(builder.equal(
                                root.get("categoria").get("idCategoria"), numericId));
                        }
                    } else {
                        List<String> groupNames = categoryGroupNamesBySlug(normalizedCat);
                        if (!groupNames.isEmpty()) {
                            predicates.add(builder.lower(
                                root.get("categoria").get("nombre")).in(groupNames));
                        } else {
                            predicates.add(builder.like(
                                builder.lower(root.get("categoria").get("nombre")),
                                "%" + normalizedCat + "%"));
                        }
                    }
                }
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
                    builder.like(builder.lower(root.get("descripcion")), pattern),
                    builder.like(builder.lower(root.get("categoria").get("nombre")), pattern)));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };

        return publicacionRepository.findAll(specification, pageable)
            .map(PublicationResponse::from);
    }

    @Transactional(readOnly = true)
    public PublicationResponse findById(Long id) {
        Publicacion publication = publicacionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "La publicación solicitada no existe"));
        return PublicationResponse.from(publication);
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

        List<String> validImages = sanitizeImages(request.imagenUrl(), request.imagenes());

        Publicacion publication = new Publicacion();
        publication.setUsuario(usuario);
        publication.setCategoria(categoria);
        publication.setTitulo(request.titulo().trim());
        publication.setDescripcion(request.descripcion().trim());
        publication.setCondicion(request.condicion());
        publication.setModalidad(request.modalidad());
        publication.setEstado(EstadoPublicacion.DISPONIBLE);
        publication.setPrecioSolidario(request.precioSolidario());
        if (request.carrera() != null && !request.carrera().isBlank()) {
            publication.setCarrera(request.carrera().trim());
        } else {
            publication.setCarrera(categoria.getCarrera());
        }
        if (!validImages.isEmpty()) {
            publication.setImagenUrl(validImages.get(0));
            publication.setImagenesJson(String.join("\n", validImages));
        }
        return CreatedPublicationResponse.from(publicacionRepository.save(publication));
    }

    private static List<String> sanitizeImages(String primaryImage, List<String> images) {
        List<String> collected = new ArrayList<>();
        if (images != null) {
            for (String candidate : images) {
                addIfValidImage(collected, candidate);
                if (collected.size() >= MAX_IMAGES_PER_PUBLICATION) {
                    break;
                }
            }
        }
        if (collected.isEmpty()) {
            addIfValidImage(collected, primaryImage);
        }
        return collected;
    }

    private static void addIfValidImage(List<String> target, String candidate) {
        if (candidate == null || candidate.isBlank()) {
            return;
        }
        String trimmed = candidate.trim();
        boolean allowedPrefix = trimmed.startsWith("data:image/")
            || trimmed.startsWith("https://")
            || trimmed.startsWith("http://");
        if (!allowedPrefix) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Formato de imagen no válido");
        }
        if (!target.contains(trimmed)) {
            target.add(trimmed);
        }
    }

    private static CondicionPublicacion parseConditionFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = normalizeSlug(value).replace('-', ' ').replace('_', ' ');
        return switch (normalized) {
            case "nuevo" -> CondicionPublicacion.NUEVO;
            case "seminuevo" -> CondicionPublicacion.SEMINUEVO;
            case "bueno", "en buen estado" -> CondicionPublicacion.BUENO;
            case "aceptable" -> CondicionPublicacion.ACEPTABLE;
            case "scrap", "repuestos / scrap", "repuestos / scrap (raee)", "repuestos" ->
                CondicionPublicacion.SCRAP;
            default -> throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Valor no válido para el filtro condition");
        };
    }

    private static ModalidadPublicacion parseModalityFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = normalizeSlug(value).replace('-', ' ').replace('_', ' ');
        return switch (normalized) {
            case "trueque", "intercambio" -> ModalidadPublicacion.TRUEQUE;
            case "donacion" -> ModalidadPublicacion.DONACION;
            case "venta solidaria", "precio solidario" -> ModalidadPublicacion.VENTA_SOLIDARIA;
            default -> throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Valor no válido para el filtro modality");
        };
    }

    private static List<String> categoryGroupNamesById(Long id) {
        if (id == 1L) return List.of("libros");
        if (id == 2L) return List.of("apuntes");
        if (id == 3L) return List.of("equipos", "microcontroladores", "redes", "instrumentación", "instrumentacion", "periféricos", "perifericos");
        if (id == 4L) return List.of("materiales", "textil");
        if (id == 5L) return List.of("otros");
        return List.of();
    }

    private static List<String> categoryGroupNamesBySlug(String slug) {
        return switch (slug) {
            case "libros", "libro" -> List.of("libros");
            case "apuntes", "apunte" -> List.of("apuntes");
            case "equipos", "equipo" -> List.of("equipos", "microcontroladores", "redes", "instrumentación", "instrumentacion", "periféricos", "perifericos");
            case "materiales", "material" -> List.of("materiales", "textil");
            case "otros", "otro" -> List.of("otros");
            default -> List.of();
        };
    }

    private static Long tryParseLong(String raw) {
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String normalizeSlug(String input) {
        if (input == null) {
            return "";
        }
        String decomposed = Normalizer.normalize(input, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        return decomposed.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}

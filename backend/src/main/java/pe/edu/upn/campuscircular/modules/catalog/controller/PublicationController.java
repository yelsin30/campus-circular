package pe.edu.upn.campuscircular.modules.catalog.controller;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.upn.campuscircular.modules.catalog.dto.CreatePublicationRequest;
import pe.edu.upn.campuscircular.modules.catalog.dto.CreatedPublicationResponse;
import pe.edu.upn.campuscircular.modules.catalog.dto.PageResponse;
import pe.edu.upn.campuscircular.modules.catalog.dto.PublicationResponse;
import pe.edu.upn.campuscircular.modules.catalog.service.PublicationService;

@RestController
@RequestMapping("/api/v1/publications")
public class PublicationController {

    private final PublicationService publicationService;

    public PublicationController(PublicationService publicationService) {
        this.publicationService = publicationService;
    }

    @GetMapping
    public PageResponse<PublicationResponse> search(
            @RequestParam(required = false) String carrera,
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) String condition,
            @RequestParam(required = false) String modality,
            @RequestParam(required = false, name = "q") String query,
            @PageableDefault(size = 20, sort = "fechaCreacion", direction = Sort.Direction.DESC)
            Pageable pageable) {
        Page<PublicationResponse> result = publicationService.search(
            carrera, category, condition, modality, query, pageable);
        return PageResponse.from(result);
    }

    @PostMapping
    public ResponseEntity<CreatedPublicationResponse> create(
            @Valid @RequestBody CreatePublicationRequest request,
            Authentication authentication) {
        CreatedPublicationResponse response = publicationService.create(
            authentication.getName(), request);
        return ResponseEntity.status(201).body(response);
    }
}

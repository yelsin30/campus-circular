package pe.edu.upn.campuscircular.modules.moderation.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pe.edu.upn.campuscircular.modules.catalog.dto.PublicationResponse;
import pe.edu.upn.campuscircular.modules.moderation.dto.AdminOverviewResponse;
import pe.edu.upn.campuscircular.modules.moderation.dto.AdminUserResponse;
import pe.edu.upn.campuscircular.modules.moderation.dto.ReportResponse;
import pe.edu.upn.campuscircular.modules.moderation.service.AdminService;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/overview")
    public ResponseEntity<AdminOverviewResponse> getOverview() {
        return ResponseEntity.ok(adminService.getOverview());
    }

    @GetMapping("/publications")
    public ResponseEntity<List<PublicationResponse>> listAllPublications() {
        return ResponseEntity.ok(adminService.listAllPublications());
    }

    @PostMapping("/publications/{id}/activate")
    public ResponseEntity<PublicationResponse> activatePublication(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.activatePublication(id));
    }

    @PostMapping("/publications/{id}/retire")
    public ResponseEntity<PublicationResponse> retirePublication(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.retirePublication(id));
    }

    @PostMapping("/reports/{id}/dismiss")
    public ResponseEntity<ReportResponse> dismissReport(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.dismissReport(id));
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> listAllUsers() {
        return ResponseEntity.ok(adminService.listAllUsers());
    }

    @PostMapping("/users/{id}/toggle-status")
    public ResponseEntity<AdminUserResponse> toggleUserStatus(
            @PathVariable Long id,
            Authentication authentication) {
        String adminEmail = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(adminService.toggleUserStatus(adminEmail, id));
    }
}

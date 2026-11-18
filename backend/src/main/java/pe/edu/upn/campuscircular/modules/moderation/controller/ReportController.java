package pe.edu.upn.campuscircular.modules.moderation.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import pe.edu.upn.campuscircular.modules.moderation.dto.CreateReportRequest;
import pe.edu.upn.campuscircular.modules.moderation.dto.ReportResponse;
import pe.edu.upn.campuscircular.modules.moderation.dto.SuspendPublicationResponse;
import pe.edu.upn.campuscircular.modules.moderation.service.ReportService;

@RestController
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/api/v1/publications/{id}/reports")
    public ResponseEntity<ReportResponse> createReport(
            @PathVariable Long id,
            @Valid @RequestBody CreateReportRequest request,
            Authentication authentication) {
        ReportResponse response = reportService.createReport(
            authentication.getName(), id, request);
        return ResponseEntity.status(201).body(response);
    }

    @GetMapping("/api/v1/admin/reports")
    public ResponseEntity<List<ReportResponse>> listReports(
            @RequestParam(defaultValue = "false") boolean includeResolved) {
        return ResponseEntity.ok(reportService.listPendingReports(includeResolved));
    }

    @PostMapping("/api/v1/admin/publications/{id}/suspend")
    public ResponseEntity<SuspendPublicationResponse> suspendPublication(
            @PathVariable Long id) {
        return ResponseEntity.ok(reportService.suspendPublication(id));
    }
}

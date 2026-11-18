package pe.edu.upn.campuscircular.modules.metrics.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pe.edu.upn.campuscircular.modules.metrics.dto.ImpactMetricsResponse;
import pe.edu.upn.campuscircular.modules.metrics.service.ImpactMetricsService;

@RestController
@RequestMapping("/api/v1/metrics")
public class MetricsController {

    private final ImpactMetricsService impactMetricsService;

    public MetricsController(ImpactMetricsService impactMetricsService) {
        this.impactMetricsService = impactMetricsService;
    }

    @GetMapping("/impact")
    public ResponseEntity<ImpactMetricsResponse> getImpactMetrics() {
        return ResponseEntity.ok(impactMetricsService.getImpactMetrics());
    }
}

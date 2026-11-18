package pe.edu.upn.campuscircular.modules.metrics.dto;

import java.math.BigDecimal;

public record ImpactMetricsResponse(
    long completedTransactions,
    long articlesReinserted,
    BigDecimal avoidedRaeeKg,
    BigDecimal estimatedSavingsPen
) {}

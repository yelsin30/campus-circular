package pe.edu.upn.campuscircular.modules.metrics.repository;

import java.math.BigDecimal;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import pe.edu.upn.campuscircular.modules.metrics.domain.MetricaImpacto;

public interface MetricaImpactoRepository extends JpaRepository<MetricaImpacto, Long> {

    Optional<MetricaImpacto> findByTransaccionIdTransaccion(Long idTransaccion);

    @Query("SELECT COALESCE(COUNT(m), 0) FROM MetricaImpacto m")
    long countCompletedTransactions();

    @Query("SELECT COALESCE(SUM(m.articulosReinsertados), 0) FROM MetricaImpacto m")
    long sumArticulosReinsertados();

    @Query("SELECT COALESCE(SUM(m.raeeKg), 0) FROM MetricaImpacto m")
    BigDecimal sumRaeeKg();

    @Query("SELECT COALESCE(SUM(m.ahorroPen), 0) FROM MetricaImpacto m")
    BigDecimal sumAhorroPen();
}

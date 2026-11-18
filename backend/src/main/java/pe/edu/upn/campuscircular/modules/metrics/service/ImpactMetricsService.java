package pe.edu.upn.campuscircular.modules.metrics.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;
import pe.edu.upn.campuscircular.modules.metrics.domain.MetricaImpacto;
import pe.edu.upn.campuscircular.modules.metrics.dto.ImpactMetricsResponse;
import pe.edu.upn.campuscircular.modules.metrics.repository.MetricaImpactoRepository;
import pe.edu.upn.campuscircular.modules.transaction.domain.Transaccion;

@Service
public class ImpactMetricsService {

    public static final BigDecimal DEFAULT_REFERENCE_MARKET_PRICE = new BigDecimal("80.00");

    private final MetricaImpactoRepository metricaImpactoRepository;

    public ImpactMetricsService(MetricaImpactoRepository metricaImpactoRepository) {
        this.metricaImpactoRepository = metricaImpactoRepository;
    }

    @Transactional(readOnly = true)
    public ImpactMetricsResponse getImpactMetrics() {
        long completedTransactions = metricaImpactoRepository.countCompletedTransactions();
        long articlesReinserted = metricaImpactoRepository.sumArticulosReinsertados();
        BigDecimal avoidedRaeeKg = metricaImpactoRepository.sumRaeeKg()
            .setScale(3, RoundingMode.HALF_UP);
        BigDecimal estimatedSavingsPen = metricaImpactoRepository.sumAhorroPen()
            .setScale(2, RoundingMode.HALF_UP);

        return new ImpactMetricsResponse(
            completedTransactions,
            articlesReinserted,
            avoidedRaeeKg,
            estimatedSavingsPen);
    }

    @Transactional
    public MetricaImpacto recordTransactionImpact(
            Transaccion transaccion,
            Publicacion solicitada,
            Publicacion ofrecida) {
        MetricaImpacto metrica = metricaImpactoRepository
            .findByTransaccionIdTransaccion(transaccion.getIdTransaccion())
            .orElseGet(MetricaImpacto::new);

        int articulosReinsertados = ofrecida != null ? 2 : 1;
        BigDecimal ahorroPen = calculateSavingsPen(solicitada)
            .add(ofrecida != null ? calculateSavingsPen(ofrecida) : BigDecimal.ZERO)
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal raeeKg = calculateRaeeKg(solicitada)
            .add(ofrecida != null ? calculateRaeeKg(ofrecida) : BigDecimal.ZERO)
            .setScale(3, RoundingMode.HALF_UP);

        metrica.setTransaccion(transaccion);
        metrica.setArticulosReinsertados(articulosReinsertados);
        metrica.setAhorroPen(ahorroPen);
        metrica.setRaeeKg(raeeKg);
        metrica.setFechaRegistro(LocalDateTime.now());

        return metricaImpactoRepository.save(metrica);
    }

    public static BigDecimal calculateSavingsPen(Publicacion publicacion) {
        if (publicacion == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal referencePrice = referenceMarketPriceFor(publicacion);
        BigDecimal paidPrice = publicacion.getPrecioSolidario();
        if (paidPrice == null || paidPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return referencePrice.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal diff = referencePrice.subtract(paidPrice);
        return diff.compareTo(BigDecimal.ZERO) > 0
            ? diff.setScale(2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal calculateRaeeKg(Publicacion publicacion) {
        if (publicacion == null) {
            return BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        }
        String categoryName = publicacion.getCategoria() != null
            ? normalize(publicacion.getCategoria().getNombre())
            : "";

        if (categoryName.contains("microcontrolador")) {
            return new BigDecimal("0.050");
        }
        if (categoryName.contains("red")) {
            return new BigDecimal("0.800");
        }
        if (categoryName.contains("instrumentacion")) {
            return new BigDecimal("0.350");
        }
        if (categoryName.contains("periferico")) {
            return new BigDecimal("0.150");
        }
        if (categoryName.contains("equipo")) {
            String title = normalize(publicacion.getTitulo());
            if (title.contains("microcontrolador") || title.contains("arduino")) {
                return new BigDecimal("0.050");
            }
            if (title.contains("red") || title.contains("router") || title.contains("switch")) {
                return new BigDecimal("0.800");
            }
            if (title.contains("periferico") || title.contains("teclado") || title.contains("mouse")) {
                return new BigDecimal("0.150");
            }
            return new BigDecimal("0.350");
        }
        return BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
    }

    private static BigDecimal referenceMarketPriceFor(Publicacion publicacion) {
        return DEFAULT_REFERENCE_MARKET_PRICE;
    }

    private static String normalize(String input) {
        if (input == null) {
            return "";
        }
        String decomposed = Normalizer.normalize(input, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        return decomposed.trim().toLowerCase(Locale.ROOT);
    }
}

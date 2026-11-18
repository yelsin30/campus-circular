package pe.edu.upn.campuscircular.modules.metrics.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import pe.edu.upn.campuscircular.modules.transaction.domain.Transaccion;

@Entity
@Table(name = "metrica_impacto")
public class MetricaImpacto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_metrica")
    private Long idMetrica;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_transaccion", nullable = false, unique = true)
    private Transaccion transaccion;

    @Column(name = "ahorro_pen", nullable = false, precision = 10, scale = 2)
    private BigDecimal ahorroPen;

    @Column(name = "raee_kg", nullable = false, precision = 10, scale = 3)
    private BigDecimal raeeKg;

    @Column(name = "articulos_reinsertados", nullable = false)
    private Integer articulosReinsertados;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro;

    public MetricaImpacto() {}

    @PrePersist
    void setDefaults() {
        if (fechaRegistro == null) {
            fechaRegistro = LocalDateTime.now();
        }
    }

    public Long getIdMetrica() {
        return idMetrica;
    }

    public Transaccion getTransaccion() {
        return transaccion;
    }

    public void setTransaccion(Transaccion transaccion) {
        this.transaccion = transaccion;
    }

    public BigDecimal getAhorroPen() {
        return ahorroPen;
    }

    public void setAhorroPen(BigDecimal ahorroPen) {
        this.ahorroPen = ahorroPen;
    }

    public BigDecimal getRaeeKg() {
        return raeeKg;
    }

    public void setRaeeKg(BigDecimal raeeKg) {
        this.raeeKg = raeeKg;
    }

    public Integer getArticulosReinsertados() {
        return articulosReinsertados;
    }

    public void setArticulosReinsertados(Integer articulosReinsertados) {
        this.articulosReinsertados = articulosReinsertados;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDateTime fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }
}

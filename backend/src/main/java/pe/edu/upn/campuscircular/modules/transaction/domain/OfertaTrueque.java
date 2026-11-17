package pe.edu.upn.campuscircular.modules.transaction.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import pe.edu.upn.campuscircular.modules.catalog.domain.Publicacion;

@Entity
@Table(name = "oferta_trueque")
public class OfertaTrueque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_oferta")
    private Long idOferta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_transaccion", nullable = false)
    private Transaccion transaccion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_publicacion_ofrecida", nullable = false)
    private Publicacion publicacionOfrecida;

    @Column(name = "estado", nullable = false, length = 25)
    private String estado;

    public OfertaTrueque() {}

    public Long getIdOferta() {
        return idOferta;
    }

    public Transaccion getTransaccion() {
        return transaccion;
    }

    public void setTransaccion(Transaccion transaccion) {
        this.transaccion = transaccion;
    }

    public Publicacion getPublicacionOfrecida() {
        return publicacionOfrecida;
    }

    public void setPublicacionOfrecida(Publicacion publicacionOfrecida) {
        this.publicacionOfrecida = publicacionOfrecida;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }
}

package pe.edu.upn.campuscircular.modules.catalog.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import pe.edu.upn.campuscircular.modules.auth.domain.Usuario;

@Entity
@Table(name = "publicacion")
public class Publicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_publicacion")
    private Long idPublicacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "id_categoria", nullable = false)
    private Categoria categoria;

    @Column(name = "titulo", nullable = false, length = 200)
    private String titulo;

    @Column(name = "descripcion", nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(name = "condicion", nullable = false, length = 30)
    private CondicionPublicacion condicion;

    @Enumerated(EnumType.STRING)
    @Column(name = "modalidad", nullable = false, length = 25)
    private ModalidadPublicacion modalidad;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 25)
    private EstadoPublicacion estado;

    @Column(name = "precio_solidario", precision = 10, scale = 2)
    private BigDecimal precioSolidario;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    public Publicacion() {}

    @PrePersist
    void setDefaults() {
        if (estado == null) {
            estado = EstadoPublicacion.DISPONIBLE;
        }
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now();
        }
    }

    public Long getIdPublicacion() {
        return idPublicacion;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public Categoria getCategoria() {
        return categoria;
    }

    public void setCategoria(Categoria categoria) {
        this.categoria = categoria;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public CondicionPublicacion getCondicion() {
        return condicion;
    }

    public void setCondicion(CondicionPublicacion condicion) {
        this.condicion = condicion;
    }

    public ModalidadPublicacion getModalidad() {
        return modalidad;
    }

    public void setModalidad(ModalidadPublicacion modalidad) {
        this.modalidad = modalidad;
    }

    public EstadoPublicacion getEstado() {
        return estado;
    }

    public BigDecimal getPrecioSolidario() {
        return precioSolidario;
    }

    public void setPrecioSolidario(BigDecimal precioSolidario) {
        this.precioSolidario = precioSolidario;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }
}

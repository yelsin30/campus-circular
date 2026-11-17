package pe.edu.upn.campuscircular.modules.auth.domain;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long idUsuario;

    @Column(name = "correo_institucional", nullable = false, length = 150, unique = true)
    private String correoInstitucional;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "rol", nullable = false, length = 20)
    private RolUsuario rol;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoUsuario estado;

    @Column(name = "reputacion_promedio", precision = 3, scale = 2)
    private BigDecimal reputacionPromedio;

    @PrePersist
    void setDefaults() {
        if (rol == null) {
            rol = RolUsuario.USUARIO;
        }
        if (estado == null) {
            estado = EstadoUsuario.INACTIVO;
        }
    }

    public Long getIdUsuario() {
        return idUsuario;
    }

    public String getCorreoInstitucional() {
        return correoInstitucional;
    }

    public void setCorreoInstitucional(String correoInstitucional) {
        this.correoInstitucional = correoInstitucional;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public RolUsuario getRol() {
        return rol;
    }

    public void setRol(RolUsuario rol) {
        this.rol = rol;
    }

    public EstadoUsuario getEstado() {
        return estado;
    }

    public void setEstado(EstadoUsuario estado) {
        this.estado = estado;
    }

    public BigDecimal getReputacionPromedio() {
        return reputacionPromedio;
    }

    public void setReputacionPromedio(BigDecimal reputacionPromedio) {
        this.reputacionPromedio = reputacionPromedio;
    }
}

-- =============================================================================
-- Campus Circular - APS-2026-CC01
-- Script DDL inicial (schema.sql)
-- Referencia: Entregable 1.2.2 - Especificacion Arquitectonica y Modelo de Datos
--             Figura 3 (DER_4), Seccion 3.2 (Diccionario) y 3.3 (Indices/Restricciones)
-- Motor: MySQL 8.0.16+ (necesario para que los CHECK se apliquen)
-- Base de datos: campus_circular_db  |  Codificacion: utf8mb4
--
-- Convenciones:
--   * Los estados/roles se guardan como VARCHAR (segun diccionario) y se
--     restringen con CHECK. En JPA mapear con @Enumerated(EnumType.STRING).
--   * Todas las FK usan ON DELETE RESTRICT / ON UPDATE RESTRICT.
--   * Script idempotente (IF NOT EXISTS) y ordenado por dependencias.
--   * No usar punto y coma dentro de los comentarios (el ejecutor de Spring
--     divide las sentencias por punto y coma).
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1. usuario
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario           BIGINT        NOT NULL AUTO_INCREMENT,
    correo_institucional VARCHAR(150)  NOT NULL,
    password_hash        VARCHAR(255)  NOT NULL,
    rol                  VARCHAR(20)   NOT NULL DEFAULT 'USUARIO',
    estado               VARCHAR(20)   NOT NULL DEFAULT 'INACTIVO',
    reputacion_promedio  DECIMAL(3,2)  NULL,
    CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuario_correo UNIQUE (correo_institucional),
    CONSTRAINT chk_usuario_correo CHECK (correo_institucional LIKE '%@upn.pe'),
    CONSTRAINT chk_usuario_rol CHECK (rol IN ('USUARIO', 'ADMIN', 'ADMIN_AUDITOR')),
    CONSTRAINT chk_usuario_estado CHECK (estado IN ('INACTIVO', 'ACTIVO', 'SUSPENDIDO')),
    CONSTRAINT chk_usuario_reputacion CHECK (reputacion_promedio IS NULL OR reputacion_promedio BETWEEN 1 AND 5)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. categoria
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categoria (
    id_categoria BIGINT       NOT NULL AUTO_INCREMENT,
    nombre       VARCHAR(100) NOT NULL,
    carrera      VARCHAR(100) NULL,
    CONSTRAINT pk_categoria PRIMARY KEY (id_categoria),
    CONSTRAINT uq_categoria_nombre UNIQUE (nombre)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. token_verificacion (activacion de cuenta, token de 6 digitos, 15 min)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS token_verificacion (
    id_token   BIGINT       NOT NULL AUTO_INCREMENT,
    id_usuario BIGINT       NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expira_en  DATETIME     NOT NULL,
    usado      BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_token_verificacion PRIMARY KEY (id_token),
    CONSTRAINT fk_token_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX idx_token_usuario_usado (id_usuario, usado)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. publicacion
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publicacion (
    id_publicacion   BIGINT        NOT NULL AUTO_INCREMENT,
    id_usuario       BIGINT        NOT NULL,
    id_categoria     BIGINT        NOT NULL,
    titulo           VARCHAR(200)  NOT NULL,
    descripcion      TEXT          NOT NULL,
    condicion        VARCHAR(30)   NOT NULL,
    modalidad        VARCHAR(25)   NOT NULL,
    estado           VARCHAR(25)   NOT NULL DEFAULT 'DISPONIBLE',
    precio_solidario DECIMAL(10,2) NULL,
    fecha_creacion   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_publicacion PRIMARY KEY (id_publicacion),
    CONSTRAINT fk_publicacion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_publicacion_categoria FOREIGN KEY (id_categoria)
        REFERENCES categoria (id_categoria) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_publicacion_condicion CHECK (condicion IN ('NUEVO', 'SEMINUEVO', 'BUENO', 'ACEPTABLE', 'SCRAP')),
    CONSTRAINT chk_publicacion_modalidad CHECK (modalidad IN ('TRUEQUE', 'DONACION', 'VENTA_SOLIDARIA')),
    CONSTRAINT chk_publicacion_estado CHECK (estado IN ('DISPONIBLE', 'EN_NEGOCIACION', 'TRANSFERIDO', 'SUSPENDIDO')),
    -- Seccion 12.1: tope maximo estricto de S/ 80.00 para venta solidaria
    CONSTRAINT chk_publicacion_precio CHECK (precio_solidario IS NULL OR (precio_solidario >= 0 AND precio_solidario <= 80.00)),
    -- Seccion 3.3: filtros frecuentes del catalogo
    INDEX idx_publicacion_catalogo (estado, id_categoria, condicion),
    -- Seccion 3.3: publicaciones por propietario (tambien respalda la FK id_usuario)
    INDEX idx_publicacion_usuario_estado (id_usuario, estado),
    -- Respaldo de la FK id_categoria
    INDEX idx_publicacion_categoria (id_categoria)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. imagen_publicacion (maximo 3 por publicacion, URL publica HTTPS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS imagen_publicacion (
    id_imagen      BIGINT       NOT NULL AUTO_INCREMENT,
    id_publicacion BIGINT       NOT NULL,
    url            VARCHAR(255) NOT NULL,
    orden          INT          NOT NULL,
    CONSTRAINT pk_imagen_publicacion PRIMARY KEY (id_imagen),
    CONSTRAINT fk_imagen_publicacion FOREIGN KEY (id_publicacion)
        REFERENCES publicacion (id_publicacion) ON DELETE RESTRICT ON UPDATE RESTRICT,
    -- CU02 y seccion 12.5: maximo 3 imagenes, posiciones 1 a 3 sin repetir
    CONSTRAINT chk_imagen_orden CHECK (orden BETWEEN 1 AND 3),
    CONSTRAINT chk_imagen_url_https CHECK (url LIKE 'https://%'),
    CONSTRAINT uq_imagen_publicacion_orden UNIQUE (id_publicacion, orden)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. transaccion
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaccion (
    id_transaccion BIGINT       NOT NULL AUTO_INCREMENT,
    id_publicacion BIGINT       NOT NULL,
    id_solicitante BIGINT       NOT NULL,
    id_propietario BIGINT       NOT NULL,
    tipo           VARCHAR(25)  NOT NULL,
    estado         VARCHAR(25)  NOT NULL DEFAULT 'PENDIENTE',
    otp_hash       VARCHAR(255) NULL,
    otp_expira_en  DATETIME     NULL,
    fecha_creacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre   DATETIME     NULL,
    CONSTRAINT pk_transaccion PRIMARY KEY (id_transaccion),
    CONSTRAINT fk_transaccion_publicacion FOREIGN KEY (id_publicacion)
        REFERENCES publicacion (id_publicacion) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_transaccion_solicitante FOREIGN KEY (id_solicitante)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_transaccion_propietario FOREIGN KEY (id_propietario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_transaccion_tipo CHECK (tipo IN ('TRUEQUE', 'DONACION', 'VENTA_SOLIDARIA')),
    CONSTRAINT chk_transaccion_estado CHECK (estado IN ('PENDIENTE', 'EN_NEGOCIACION', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'COMPLETADA')),
    CONSTRAINT chk_transaccion_participantes CHECK (id_solicitante <> id_propietario),
    -- Seccion 3.3: operaciones activas por articulo
    INDEX idx_transaccion_publicacion_estado (id_publicacion, estado),
    -- Seccion 3.3: historial del usuario
    INDEX idx_transaccion_solicitante_estado (id_solicitante, estado),
    -- Respaldo de la FK id_propietario
    INDEX idx_transaccion_propietario (id_propietario)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. oferta_trueque
--    TODO: el documento no define los valores de estado_oferta. Cuando se
--    cierren, agregar CHECK (estado IN (...)).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oferta_trueque (
    id_oferta                BIGINT      NOT NULL AUTO_INCREMENT,
    id_transaccion           BIGINT      NOT NULL,
    id_publicacion_ofrecida  BIGINT      NOT NULL,
    estado                   VARCHAR(25) NOT NULL,
    CONSTRAINT pk_oferta_trueque PRIMARY KEY (id_oferta),
    CONSTRAINT fk_oferta_transaccion FOREIGN KEY (id_transaccion)
        REFERENCES transaccion (id_transaccion) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_oferta_publicacion_ofrecida FOREIGN KEY (id_publicacion_ofrecida)
        REFERENCES publicacion (id_publicacion) ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX idx_oferta_transaccion (id_transaccion),
    INDEX idx_oferta_publicacion_ofrecida (id_publicacion_ofrecida)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. calificacion
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calificacion (
    id_calificacion BIGINT     NOT NULL AUTO_INCREMENT,
    id_transaccion  BIGINT     NOT NULL,
    emisor          BIGINT     NOT NULL,
    receptor        BIGINT     NOT NULL,
    puntuacion      TINYINT    NOT NULL,
    comentario      TEXT       NULL,
    CONSTRAINT pk_calificacion PRIMARY KEY (id_calificacion),
    CONSTRAINT fk_calificacion_transaccion FOREIGN KEY (id_transaccion)
        REFERENCES transaccion (id_transaccion) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_calificacion_emisor FOREIGN KEY (emisor)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_calificacion_receptor FOREIGN KEY (receptor)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_calificacion_puntuacion CHECK (puntuacion BETWEEN 1 AND 5),
    CONSTRAINT chk_calificacion_emisor_receptor CHECK (emisor <> receptor),
    -- Seccion 3.3: una calificacion por participante en cada transaccion
    CONSTRAINT uq_calificacion_transaccion_emisor_receptor UNIQUE (id_transaccion, emisor, receptor),
    INDEX idx_calificacion_emisor (emisor),
    INDEX idx_calificacion_receptor (receptor)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. reporte
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reporte (
    id_reporte     BIGINT       NOT NULL AUTO_INCREMENT,
    id_publicacion BIGINT       NOT NULL,
    id_reportante  BIGINT       NOT NULL,
    motivo         VARCHAR(250) NOT NULL,
    estado         VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT pk_reporte PRIMARY KEY (id_reporte),
    CONSTRAINT fk_reporte_publicacion FOREIGN KEY (id_publicacion)
        REFERENCES publicacion (id_publicacion) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_reporte_reportante FOREIGN KEY (id_reportante)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_reporte_estado CHECK (estado IN ('PENDIENTE', 'ATENDIDO', 'DESESTIMADO')),
    INDEX idx_reporte_publicacion (id_publicacion),
    INDEX idx_reporte_reportante (id_reportante),
    INDEX idx_reporte_estado (estado)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. metrica_impacto (relacion 1 a 1 con transaccion, segun DER)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metrica_impacto (
    id_metrica             BIGINT        NOT NULL AUTO_INCREMENT,
    id_transaccion         BIGINT        NOT NULL,
    ahorro_pen             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    raee_kg                DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    articulos_reinsertados INT           NOT NULL DEFAULT 1,
    CONSTRAINT pk_metrica_impacto PRIMARY KEY (id_metrica),
    CONSTRAINT uq_metrica_transaccion UNIQUE (id_transaccion),
    CONSTRAINT fk_metrica_transaccion FOREIGN KEY (id_transaccion)
        REFERENCES transaccion (id_transaccion) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_metrica_valores CHECK (ahorro_pen >= 0 AND raee_kg >= 0 AND articulos_reinsertados >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. notificacion
--     TODO: el documento no define los valores de tipo_notificacion. Cuando se
--     cierren, agregar CHECK (tipo IN (...)).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion BIGINT      NOT NULL AUTO_INCREMENT,
    id_usuario      BIGINT      NOT NULL,
    tipo            VARCHAR(30) NOT NULL,
    mensaje         TEXT        NOT NULL,
    leida           BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_notificacion PRIMARY KEY (id_notificacion),
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX idx_notificacion_usuario_leida (id_usuario, leida)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
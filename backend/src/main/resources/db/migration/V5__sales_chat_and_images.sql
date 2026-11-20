-- =============================================================================
-- Campus Circular - Migracion V5: Chat de Transacciones e Imagenes de Publicacion
-- =============================================================================

ALTER TABLE publicacion
    ADD COLUMN imagen_url LONGTEXT NULL,
    ADD COLUMN imagenes_json LONGTEXT NULL,
    ADD COLUMN carrera VARCHAR(100) NULL;

CREATE TABLE IF NOT EXISTS mensaje_transaccion (
    id_mensaje      BIGINT   NOT NULL AUTO_INCREMENT,
    id_transaccion  BIGINT   NOT NULL,
    id_emisor       BIGINT   NOT NULL,
    contenido       TEXT     NOT NULL,
    fecha_envio     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_mensaje_transaccion PRIMARY KEY (id_mensaje),
    CONSTRAINT fk_mensaje_transaccion FOREIGN KEY (id_transaccion)
        REFERENCES transaccion (id_transaccion) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_mensaje_emisor FOREIGN KEY (id_emisor)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX idx_mensaje_transaccion_fecha (id_transaccion, fecha_envio)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

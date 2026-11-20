-- =============================================================================
-- Campus Circular - Migracion V6: Motivo de rechazo y sincronizacion Admin
-- =============================================================================

ALTER TABLE transaccion
    ADD COLUMN motivo_rechazo VARCHAR(300) NULL;

ALTER TABLE publicacion
    DROP CHECK chk_publicacion_estado;

ALTER TABLE publicacion
    ADD CONSTRAINT chk_publicacion_estado
        CHECK (estado IN ('DISPONIBLE', 'EN_NEGOCIACION', 'TRANSFERIDO', 'SUSPENDIDO', 'RETIRADA'));

ALTER TABLE usuario
    ADD COLUMN nombres VARCHAR(100) NULL,
    ADD COLUMN apellidos VARCHAR(100) NULL,
    ADD COLUMN fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

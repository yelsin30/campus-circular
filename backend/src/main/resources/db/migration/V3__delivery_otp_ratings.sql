-- =============================================================================
-- Campus Circular - Migracion V3: Validacion de Entrega Presencial (OTP) y Reputacion
-- =============================================================================

ALTER TABLE transaccion
    MODIFY COLUMN otp_hash VARCHAR(255) NULL,
    MODIFY COLUMN otp_expira_en DATETIME NULL,
    MODIFY COLUMN fecha_cierre DATETIME NULL;

ALTER TABLE calificacion
    MODIFY COLUMN puntuacion INT NOT NULL,
    ADD COLUMN fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

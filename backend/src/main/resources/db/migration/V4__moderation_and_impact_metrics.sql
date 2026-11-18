-- =============================================================================
-- Campus Circular - Migracion V4: Moderacion de Reportes y Metricas de Impacto
-- =============================================================================

ALTER TABLE reporte
    MODIFY COLUMN motivo VARCHAR(500) NOT NULL,
    ADD COLUMN fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN fecha_resolucion DATETIME NULL;

ALTER TABLE metrica_impacto
    MODIFY COLUMN ahorro_pen DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    MODIFY COLUMN raee_kg DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    MODIFY COLUMN articulos_reinsertados INT NOT NULL DEFAULT 1,
    ADD COLUMN fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

INSERT IGNORE INTO categoria (nombre, carrera) VALUES
    ('Microcontroladores', 'Ingeniería de Sistemas'),
    ('Redes', 'Ingeniería de Sistemas'),
    ('Instrumentación', 'Ingeniería Industrial'),
    ('Periféricos', 'Ingeniería de Sistemas'),
    ('Textil', 'Arquitectura');

UPDATE usuario
SET rol = 'ADMIN'
WHERE correo_institucional = 'n00329443@upn.pe';

INSERT IGNORE INTO metrica_impacto (id_transaccion, ahorro_pen, raee_kg, articulos_reinsertados, fecha_registro)
SELECT
    t.id_transaccion,
    CASE WHEN o.id_oferta IS NOT NULL THEN 160.00 ELSE 80.00 END,
    0.800,
    CASE WHEN o.id_oferta IS NOT NULL THEN 2 ELSE 1 END,
    COALESCE(t.fecha_cierre, CURRENT_TIMESTAMP)
FROM transaccion t
LEFT JOIN oferta_trueque o ON o.id_transaccion = t.id_transaccion
WHERE t.estado = 'COMPLETADA';

-- Nombre del cónyuge cuando estado civil es Casado o Unido (Solicitud de Inspección).
-- Ejecutar en MySQL si la columna aún no existe.

SET @db := DATABASE();
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'inspection_requests' AND COLUMN_NAME = 'spouse_name'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE inspection_requests ADD COLUMN spouse_name VARCHAR(200) NULL AFTER marital_status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

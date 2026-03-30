-- =============================================================================
-- Tabla `service_types` + columna `inspection_requests.service_type_id` (MySQL)
-- =============================================================================
-- Idempotente: puedes ejecutar el archivo completo varias veces.
-- Uso: misma base que DATABASE_URL (ej. alara_insp).
-- =============================================================================

DROP PROCEDURE IF EXISTS `alara_sync_service_types`;

DELIMITER $$

CREATE PROCEDURE `alara_sync_service_types`()
BEGIN
  DECLARE dbn VARCHAR(128);
  SET dbn = DATABASE();

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'service_types'
  ) THEN
    CREATE TABLE `service_types` (
      `id` BIGINT NOT NULL AUTO_INCREMENT,
      `name` VARCHAR(120) NOT NULL,
      `sort_order` INT NOT NULL DEFAULT 0,
      `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
      `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (`id`),
      UNIQUE KEY `service_types_name_key` (`name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  INSERT INTO `service_types` (`name`, `sort_order`) VALUES
    ('Reporte de Inspeccion Regular', 1),
    ('Reporte Inspeccion Regular +TMU', 2),
    ('Back grownd check', 3),
    ('TMU', 4),
    ('TMU Plus', 5),
    ('Siniestro', 6)
  ON DUPLICATE KEY UPDATE `sort_order` = VALUES(`sort_order`);

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'inspection_requests' AND COLUMN_NAME = 'service_type_id'
  ) THEN
    ALTER TABLE `inspection_requests`
      ADD COLUMN `service_type_id` BIGINT NULL;
  END IF;

  IF (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'inspection_requests' AND INDEX_NAME = 'inspection_requests_service_type_id_idx'
  ) = 0 THEN
    CREATE INDEX `inspection_requests_service_type_id_idx` ON `inspection_requests` (`service_type_id`);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'inspection_requests'
      AND CONSTRAINT_NAME = 'inspection_requests_service_type_id_fkey'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE `inspection_requests`
      ADD CONSTRAINT `inspection_requests_service_type_id_fkey`
      FOREIGN KEY (`service_type_id`) REFERENCES `service_types` (`id`)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$

DELIMITER ;

CALL alara_sync_service_types();

DROP PROCEDURE IF EXISTS `alara_sync_service_types`;

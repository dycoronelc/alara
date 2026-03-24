-- =============================================================================
-- Sincronización idempotente: columnas que Prisma espera y a veces faltan en BD
-- =============================================================================
-- Errores típicos en logs:
--   The column `inspection_requests.amount_in_force` does not exist
--   The column `clients.address_line` does not exist
--
-- Este script comprueba information_schema y solo ejecuta ALTER si falta la
-- columna (puedes ejecutarlo entero varias veces sin error 1060).
--
-- Uso: conectar a la misma base que DATABASE_URL (ej. alara_insp) y ejecutar
-- todo el archivo en el cliente MySQL.
-- =============================================================================

DROP PROCEDURE IF EXISTS `alara_sync_prisma_columns`;

DELIMITER $$

CREATE PROCEDURE `alara_sync_prisma_columns`()
BEGIN
  DECLARE dbn VARCHAR(128);
  SET dbn = DATABASE();

  -- inspection_requests
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'inspection_requests' AND COLUMN_NAME = 'amount_in_force'
  ) THEN
    ALTER TABLE `inspection_requests` ADD COLUMN `amount_in_force` DECIMAL(18, 2) NULL;
  END IF;

  -- clients (incluye las que suelen faltar tras deploy sin migración completa)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'phone_work'
  ) THEN
    ALTER TABLE `clients` ADD COLUMN `phone_work` VARCHAR(30) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'employer_tax_id'
  ) THEN
    ALTER TABLE `clients` ADD COLUMN `employer_tax_id` VARCHAR(50) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'profession'
  ) THEN
    ALTER TABLE `clients` ADD COLUMN `profession` VARCHAR(150) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'address_line'
  ) THEN
    ALTER TABLE `clients` ADD COLUMN `address_line` VARCHAR(255) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'city'
  ) THEN
    ALTER TABLE `clients` ADD COLUMN `city` VARCHAR(120) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'country'
  ) THEN
    ALTER TABLE `clients` ADD COLUMN `country` VARCHAR(80) NULL;
  END IF;

  -- users (recuperación de contraseña)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_reset_token'
  ) THEN
    ALTER TABLE `users` ADD COLUMN `password_reset_token` VARCHAR(128) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_reset_expires_at'
  ) THEN
    ALTER TABLE `users` ADD COLUMN `password_reset_expires_at` DATETIME(3) NULL;
  END IF;

  -- índice único para token (solo si no existe)
  IF (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = dbn AND TABLE_NAME = 'users' AND INDEX_NAME = 'users_password_reset_token_key'
  ) = 0 THEN
    CREATE UNIQUE INDEX `users_password_reset_token_key` ON `users` (`password_reset_token`);
  END IF;
END$$

DELIMITER ;

CALL alara_sync_prisma_columns();

DROP PROCEDURE IF EXISTS `alara_sync_prisma_columns`;

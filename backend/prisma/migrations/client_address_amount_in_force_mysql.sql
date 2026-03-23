-- =============================================================================
-- Migración MySQL: alinear BD con prisma/schema.prisma
-- =============================================================================
-- Si en logs aparece:
--   The column `inspection_requests.amount_in_force` does not exist
-- entonces DEBES ejecutar este script en la base de producción (Railway, etc.).
-- Sin esto, GET /api/inspection-requests y el dashboard devuelven 500.
--
-- Ejecución (ejemplo):
--   mysql -h HOST -u USER -p alara_insp < client_address_amount_in_force_mysql.sql
--   O desde Railway: Query / conectar al MySQL y pegar el SQL.
-- =============================================================================

-- 1) Solicitudes: columna que falta y rompe Prisma (prioridad)
ALTER TABLE `inspection_requests`
  ADD COLUMN `amount_in_force` DECIMAL(18, 2) NULL;

-- 2) Cliente: dirección en tabla clients (si ya existen las columnas, ignorar error 1060)
ALTER TABLE `clients`
  ADD COLUMN `address_line` VARCHAR(255) NULL;

ALTER TABLE `clients`
  ADD COLUMN `city` VARCHAR(120) NULL;

ALTER TABLE `clients`
  ADD COLUMN `country` VARCHAR(80) NULL;

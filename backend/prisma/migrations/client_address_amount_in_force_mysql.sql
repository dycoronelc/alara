-- Dirección en cliente + monto en vigencia en solicitud (MySQL)
-- Ejecutar manualmente o vía migración si aplica.

ALTER TABLE `clients`
  ADD COLUMN `address_line` VARCHAR(255) NULL AFTER `profession`,
  ADD COLUMN `city` VARCHAR(120) NULL AFTER `address_line`,
  ADD COLUMN `country` VARCHAR(80) NULL AFTER `city`;

ALTER TABLE `inspection_requests`
  ADD COLUMN `amount_in_force` DECIMAL(18, 2) NULL AFTER `has_amount_in_force`;

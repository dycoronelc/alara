-- MySQL (Railway): columnas añadidas al modelo User para recuperación de contraseña.
-- Si ya existen, este script fallará en esas líneas; puedes ignorar o comentarlas.
-- Ejecutar en el cliente MySQL conectado a la misma base que DATABASE_URL.

ALTER TABLE `users`
  ADD COLUMN `password_reset_token` VARCHAR(128) NULL,
  ADD COLUMN `password_reset_expires_at` DATETIME(3) NULL;

-- Índice único (MySQL permite varios NULL en columna única nullable)
CREATE UNIQUE INDEX `users_password_reset_token_key` ON `users` (`password_reset_token`);

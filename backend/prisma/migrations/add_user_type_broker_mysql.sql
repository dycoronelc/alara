-- Idempotente: añade BROKER al ENUM user_type de users (MySQL).
-- Ejecutar manualmente si no usas `prisma migrate` con DATABASE_URL.

ALTER TABLE users
  MODIFY COLUMN user_type ENUM('INSURER', 'ALARA', 'BROKER') NOT NULL;

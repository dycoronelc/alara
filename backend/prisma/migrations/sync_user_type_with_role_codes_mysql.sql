-- Sincroniza `users.user_type` con los códigos de `roles` (INSURER_USER, ALARA_USER, ADMIN, BROKER_USER).
-- Ejecutar manualmente en MySQL si la BD ya tenía el enum antiguo (INSURER, ALARA, BROKER).
--
-- 1) Mapear valores viejos → nuevos
UPDATE users SET user_type = 'INSURER_USER' WHERE user_type = 'INSURER';
UPDATE users SET user_type = 'ALARA_USER' WHERE user_type = 'ALARA';
UPDATE users SET user_type = 'BROKER_USER' WHERE user_type = 'BROKER';
-- Usuarios administrativos que solo tenían user_type ALARA y rol ADMIN: ajustar manualmente si aplica:
-- UPDATE users u INNER JOIN user_roles ur ON ur.user_id = u.id INNER JOIN roles r ON r.id = ur.role_id
-- SET u.user_type = 'ADMIN' WHERE r.code = 'ADMIN' AND u.user_type = 'ALARA_USER';

-- 2) Sustituir el ENUM de la columna (ajustar si MySQL ya tiene otros valores)
ALTER TABLE users
  MODIFY COLUMN user_type ENUM('INSURER_USER', 'ALARA_USER', 'ADMIN', 'BROKER_USER') NOT NULL;

-- 3) Opcional: alinear filas en `roles` con los mismos códigos
-- UPDATE roles SET code = 'INSURER_USER' WHERE code IN ('INSURER', 'INSURER_USER');
-- (etc., según datos existentes)

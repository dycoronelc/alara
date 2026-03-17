-- Hacer nullable created_by_user_id en inspection_requests para evitar FK cuando el usuario no se resuelve
ALTER TABLE inspection_requests
  MODIFY COLUMN created_by_user_id BIGINT UNSIGNED NULL;

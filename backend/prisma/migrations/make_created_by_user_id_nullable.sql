-- Hacer nullable created_by_user_id en inspection_requests para evitar FK cuando el usuario no se resuelve
ALTER TABLE inspection_requests
  MODIFY COLUMN created_by_user_id BIGINT UNSIGNED NULL;

-- Hacer nullable created_by_user_id en inspection_reports y changed_by_user_id en inspection_request_status_history
ALTER TABLE inspection_reports
  MODIFY COLUMN created_by_user_id BIGINT UNSIGNED NULL;

ALTER TABLE inspection_request_status_history
  MODIFY COLUMN changed_by_user_id BIGINT UNSIGNED NULL;

-- Hacer nullable uploaded_by_user_id en documents
ALTER TABLE documents
  MODIFY COLUMN uploaded_by_user_id BIGINT UNSIGNED NULL;

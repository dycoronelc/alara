ALTER TABLE inspection_requests
  ADD COLUMN report_shared_at DATETIME NULL,
  ADD COLUMN report_shared_by_user_id BIGINT UNSIGNED NULL;

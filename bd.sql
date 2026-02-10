SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ================================
-- 1) Tenancy
-- ================================
CREATE TABLE insurers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  legal_id VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_insurers_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE alara_offices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Panama',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_alara_offices_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 2) Usuarios / Roles
-- ================================
CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,  -- INSURER_USER, ALARA_USER, ADMIN, SUPERVISOR, etc.
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_type ENUM('INSURER','ALARA') NOT NULL,
  insurer_id BIGINT UNSIGNED NULL,
  alara_office_id BIGINT UNSIGNED NULL,

  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  full_name VARCHAR(200) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  KEY ix_users_insurer (insurer_id),
  KEY ix_users_office (alara_office_id),
  CONSTRAINT fk_users_insurer FOREIGN KEY (insurer_id) REFERENCES insurers(id),
  CONSTRAINT fk_users_office  FOREIGN KEY (alara_office_id) REFERENCES alara_offices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 3) Cliente (GLOBAL, no por aseguradora)
-- ================================
CREATE TABLE clients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  dob DATE NULL,
  id_type ENUM('CEDULA','PASSPORT','OTRO') NULL,
  id_number VARCHAR(50) NULL,

  email VARCHAR(255) NULL,
  phone_mobile VARCHAR(30) NULL,
  phone_home VARCHAR(30) NULL,

  employer_name VARCHAR(200) NULL,
  employer_tax_id VARCHAR(50) NULL,
  profession VARCHAR(150) NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- Esto evita duplicados globales cuando hay id_type + id_number
  UNIQUE KEY uk_clients_identity (id_type, id_number),
  KEY ix_clients_name (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE client_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  address_type ENUM('HOME','WORK','OTHER') NOT NULL DEFAULT 'HOME',
  country VARCHAR(80) NULL,
  city VARCHAR(120) NULL,
  address_line VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_client_addresses_client (client_id),
  CONSTRAINT fk_client_addresses_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Asociación Cliente <-> Aseguradora (porque el mismo cliente puede existir en varias)
CREATE TABLE insurer_clients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  insurer_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NOT NULL,

  -- Datos "propios" de la aseguradora (opcional)
  insurer_client_ref VARCHAR(80) NULL, -- ID interno del cliente en la aseguradora
  notes TEXT NULL,
  is_vip TINYINT(1) NOT NULL DEFAULT 1,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_insurer_clients (insurer_id, client_id),
  KEY ix_insurer_clients_client (client_id),
  CONSTRAINT fk_ic_insurer FOREIGN KEY (insurer_id) REFERENCES insurers(id),
  CONSTRAINT fk_ic_client FOREIGN KEY (client_id) REFERENCES clients(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 4) Solicitudes de Inspección (core)
-- ================================
CREATE TABLE inspection_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  insurer_id BIGINT UNSIGNED NOT NULL,
  insurer_client_id BIGINT UNSIGNED NOT NULL, -- vínculo directo a (aseguradora,cliente)
  client_id BIGINT UNSIGNED NOT NULL,         -- redundante útil para queries (consistencia con FK)

  -- Datos del formulario (Solicitud de Inspección)
  request_number VARCHAR(60) NOT NULL,
  agent_name VARCHAR(200) NULL,
  insured_amount DECIMAL(18,2) NULL,
  has_amount_in_force TINYINT(1) NOT NULL DEFAULT 0,

  responsible_name VARCHAR(200) NOT NULL,
  responsible_phone VARCHAR(30) NULL,
  responsible_email VARCHAR(255) NULL,

  marital_status VARCHAR(50) NULL,
  comments TEXT NULL,
  client_notified TINYINT(1) NOT NULL DEFAULT 0,
  interview_language VARCHAR(50) NULL,

  -- Estado
  status ENUM('SOLICITADA','AGENDADA','REALIZADA','CANCELADA','APROBADA','RECHAZADA') NOT NULL DEFAULT 'SOLICITADA',

  -- Asignación ALARA
  assigned_investigator_user_id BIGINT UNSIGNED NULL,
  assigned_at DATETIME NULL,

  -- Fechas clave
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scheduled_start_at DATETIME NULL,
  scheduled_end_at DATETIME NULL,
  completed_at DATETIME NULL,
  closed_at DATETIME NULL,

  priority ENUM('NORMAL','ALTA') NOT NULL DEFAULT 'NORMAL',
  cancellation_reason VARCHAR(255) NULL,

  -- Decisión final (IMPORTANTE: la decide la ASEGURADORA)
  insurer_decision ENUM('PENDIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  insurer_decision_reason VARCHAR(255) NULL,
  insurer_decision_notes TEXT NULL,
  insurer_decided_by_user_id BIGINT UNSIGNED NULL,
  insurer_decided_at DATETIME NULL,

  created_by_user_id BIGINT UNSIGNED NOT NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- request_number único por aseguradora
  UNIQUE KEY uk_ir_request_number (insurer_id, request_number),

  KEY ix_ir_status (status),
  KEY ix_ir_insurer (insurer_id),
  KEY ix_ir_client (client_id),
  KEY ix_ir_insurer_client (insurer_client_id),
  KEY ix_ir_assigned (assigned_investigator_user_id),
  KEY ix_ir_scheduled (scheduled_start_at),

  CONSTRAINT fk_ir_insurer FOREIGN KEY (insurer_id) REFERENCES insurers(id),
  CONSTRAINT fk_ir_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_ir_insurer_client FOREIGN KEY (insurer_client_id) REFERENCES insurer_clients(id),
  CONSTRAINT fk_ir_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_ir_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_ir_assigned_investigator FOREIGN KEY (assigned_investigator_user_id) REFERENCES users(id),
  CONSTRAINT fk_ir_insurer_decided_by FOREIGN KEY (insurer_decided_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inspection_request_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inspection_request_id BIGINT UNSIGNED NOT NULL,
  old_status ENUM('SOLICITADA','AGENDADA','REALIZADA','CANCELADA','APROBADA','RECHAZADA') NULL,
  new_status ENUM('SOLICITADA','AGENDADA','REALIZADA','CANCELADA','APROBADA','RECHAZADA') NOT NULL,
  note VARCHAR(255) NULL,
  changed_by_user_id BIGINT UNSIGNED NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_irsh_request (inspection_request_id),
  KEY ix_irsh_changed_at (changed_at),
  CONSTRAINT fk_irsh_request FOREIGN KEY (inspection_request_id) REFERENCES inspection_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_irsh_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 5) Agenda + Google Calendar
-- ================================
CREATE TABLE calendar_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inspection_request_id BIGINT UNSIGNED NOT NULL,
  investigator_user_id BIGINT UNSIGNED NOT NULL,

  provider ENUM('INTERNAL','GOOGLE') NOT NULL DEFAULT 'INTERNAL',
  provider_event_id VARCHAR(200) NULL,

  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  location VARCHAR(200) NULL,

  status ENUM('TENTATIVE','CONFIRMED','CANCELLED') NOT NULL DEFAULT 'CONFIRMED',

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY ix_ce_request (inspection_request_id),
  KEY ix_ce_investigator (investigator_user_id),
  KEY ix_ce_provider (provider, provider_event_id),
  KEY ix_ce_start (start_at),

  CONSTRAINT fk_ce_request FOREIGN KEY (inspection_request_id) REFERENCES inspection_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_ce_investigator FOREIGN KEY (investigator_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 6) Documentos (metadatos)
-- ================================
CREATE TABLE documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  insurer_id BIGINT UNSIGNED NOT NULL,
  inspection_request_id BIGINT UNSIGNED NULL,
  client_id BIGINT UNSIGNED NULL,

  doc_type ENUM(
    'SOLICITUD_PDF',
    'REPORTE_PDF',
    'AUTORIZACION',
    'INVESTIGACION',
    'EVIDENCIA',
    'OTRO'
  ) NOT NULL,

  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  file_size_bytes BIGINT UNSIGNED NOT NULL,
  storage_provider ENUM('S3','MINIO','LOCAL') NOT NULL DEFAULT 'S3',
  storage_key VARCHAR(512) NOT NULL,
  storage_url VARCHAR(1024) NULL,
  sha256 CHAR(64) NULL,

  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY ix_docs_insurer (insurer_id),
  KEY ix_docs_request (inspection_request_id),
  KEY ix_docs_client (client_id),
  KEY ix_docs_type (doc_type),

  CONSTRAINT fk_docs_insurer FOREIGN KEY (insurer_id) REFERENCES insurers(id),
  CONSTRAINT fk_docs_request FOREIGN KEY (inspection_request_id) REFERENCES inspection_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_docs_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  CONSTRAINT fk_docs_user FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 7) Reporte estructurado (captura) + outcome
-- ================================
CREATE TABLE inspection_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inspection_request_id BIGINT UNSIGNED NOT NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,

  interview_started_at DATETIME NULL,
  interview_ended_at DATETIME NULL,
  concluded_at DATETIME NULL,

  summary TEXT NULL,
  additional_comments TEXT NULL,

  outcome ENUM('PENDIENTE','FAVORABLE','NO_FAVORABLE','INCONCLUSO') NOT NULL DEFAULT 'PENDIENTE',

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_reports_request (inspection_request_id),
  CONSTRAINT fk_reports_request FOREIGN KEY (inspection_request_id) REFERENCES inspection_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_sections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inspection_report_id BIGINT UNSIGNED NOT NULL,
  section_code VARCHAR(60) NOT NULL,
  section_title VARCHAR(120) NOT NULL,
  section_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_report_sections (inspection_report_id, section_code),
  CONSTRAINT fk_rs_report FOREIGN KEY (inspection_report_id) REFERENCES inspection_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_fields (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_section_id BIGINT UNSIGNED NOT NULL,
  field_key VARCHAR(80) NOT NULL,
  field_label VARCHAR(150) NULL,
  field_type ENUM('TEXT','NUMBER','DATE','BOOL','ENUM','JSON') NOT NULL DEFAULT 'TEXT',
  field_value TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_report_fields (report_section_id, field_key),
  CONSTRAINT fk_rf_section FOREIGN KEY (report_section_id) REFERENCES report_sections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 8) Investigaciones
-- ================================
CREATE TABLE investigations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inspection_request_id BIGINT UNSIGNED NOT NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  source_type ENUM('PUBLIC_RECORD','SANCTIONS','PEP','NEWS','CREDIT','OTHER') NOT NULL DEFAULT 'OTHER',
  source_name VARCHAR(200) NULL,
  finding_summary TEXT NOT NULL,
  risk_level ENUM('BAJO','MEDIO','ALTO') NOT NULL DEFAULT 'BAJO',
  is_adverse_record TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_inv_request (inspection_request_id),
  CONSTRAINT fk_inv_request FOREIGN KEY (inspection_request_id) REFERENCES inspection_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 9) n8n runs
-- ================================
CREATE TABLE workflow_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inspection_request_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('N8N') NOT NULL DEFAULT 'N8N',
  external_run_id VARCHAR(200) NULL,
  status ENUM('STARTED','SUCCESS','FAILED') NOT NULL DEFAULT 'STARTED',
  request_payload JSON NULL,
  response_payload JSON NULL,
  error_message TEXT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY ix_wr_request (inspection_request_id),
  KEY ix_wr_status (status),
  CONSTRAINT fk_wr_request FOREIGN KEY (inspection_request_id) REFERENCES inspection_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- 10) Notificaciones
-- ================================
CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  insurer_id BIGINT UNSIGNED NULL,
  inspection_request_id BIGINT UNSIGNED NULL,
  recipient_user_id BIGINT UNSIGNED NULL,

  channel ENUM('IN_APP','EMAIL','SMS','WHATSAPP') NOT NULL DEFAULT 'IN_APP',
  template_code VARCHAR(80) NULL,
  subject VARCHAR(200) NULL,
  message TEXT NOT NULL,

  status ENUM('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  provider_message_id VARCHAR(200) NULL,
  error_message TEXT NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,

  PRIMARY KEY (id),
  KEY ix_notif_request (inspection_request_id),
  KEY ix_notif_recipient (recipient_user_id),
  KEY ix_notif_status (status),

  CONSTRAINT fk_notif_insurer FOREIGN KEY (insurer_id) REFERENCES insurers(id),
  CONSTRAINT fk_notif_request FOREIGN KEY (inspection_request_id) REFERENCES inspection_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_user FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

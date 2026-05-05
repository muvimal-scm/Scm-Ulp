-- =====================================================================
-- M21 Document Management — 14 tables (Tier-A, country-aware classification)
-- Strictly per docs/lld/M21_DocManagement_v1.0.md (matches DBD §4 = 14 tables).
-- =====================================================================
-- Idempotent: CREATE TABLE IF NOT EXISTS + INSERT IGNORE.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- 3.2 m21_document_class — created BEFORE m21_document because m21_document FKs to it.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_document_class (
  id                         BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id                  INT NOT NULL,
  country_code               CHAR(2) NOT NULL,
  code                       VARCHAR(50) NOT NULL,
  name                       VARCHAR(150) NOT NULL,
  description                TEXT,
  default_storage_container  VARCHAR(50) NOT NULL,
  default_immutable          TINYINT(1) DEFAULT 0,
  default_retain_years       TINYINT,
  ocr_enabled                TINYINT(1) DEFAULT 0,
  ai_classify                TINYINT(1) DEFAULT 0,
  is_active                  TINYINT(1) DEFAULT 1,
  UNIQUE KEY uq_tenant_country_code (tenant_id, country_code, code),
  CONSTRAINT fk_docclass_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.1 m21_document — universal document.
-- current_version_id is nullable + intentionally not FK-enforced
-- (m21_document_version references m21_document, creating a cycle).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_document (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  ulid                VARCHAR(26) NOT NULL,
  document_class_id   BIGINT NOT NULL,
  module_code         VARCHAR(10) NOT NULL,
  module_entity_type  VARCHAR(50),
  module_entity_id    BIGINT,
  filename            VARCHAR(255) NOT NULL,
  content_type        VARCHAR(100) NOT NULL,
  size_bytes          BIGINT NOT NULL,
  checksum_sha256     VARCHAR(64) NOT NULL,
  storage_container   VARCHAR(50) NOT NULL,
  storage_object_key  VARCHAR(500) NOT NULL,
  current_version_id  BIGINT,
  is_immutable        TINYINT(1) DEFAULT 0,
  retain_until_utc    DATETIME(3),
  is_deleted          TINYINT(1) DEFAULT 0,
  deleted_at_utc      DATETIME(3),
  deleted_by          BIGINT,
  created_at_utc      DATETIME(3) NOT NULL,
  created_by          BIGINT NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  modified_by         BIGINT NOT NULL,
  UNIQUE KEY uq_ulid (ulid),
  INDEX idx_tenant_module (tenant_id, module_code, module_entity_type, module_entity_id),
  INDEX idx_tenant_class (tenant_id, document_class_id),
  INDEX idx_tenant_deleted (tenant_id, is_deleted),
  CONSTRAINT fk_doc_class FOREIGN KEY (document_class_id) REFERENCES m21_document_class(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.3 m21_document_version
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_document_version (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  document_id         BIGINT NOT NULL,
  version_number      INT NOT NULL,
  filename            VARCHAR(255) NOT NULL,
  content_type        VARCHAR(100) NOT NULL,
  size_bytes          BIGINT NOT NULL,
  checksum_sha256     VARCHAR(64) NOT NULL,
  storage_object_key  VARCHAR(500) NOT NULL,
  uploaded_by         BIGINT NOT NULL,
  uploaded_at_utc     DATETIME(3) NOT NULL,
  comment             VARCHAR(500),
  UNIQUE KEY uq_doc_version (document_id, version_number),
  CONSTRAINT fk_docver_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.4 m21_document_tag
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_document_tag (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  document_id     BIGINT NOT NULL,
  tag_name        VARCHAR(50) NOT NULL,
  tag_value       VARCHAR(255),
  created_at_utc  DATETIME(3) NOT NULL,
  UNIQUE KEY uq_doc_tag (document_id, tag_name),
  CONSTRAINT fk_doctag_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.5 m21_document_acl
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_document_acl (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  document_id     BIGINT NOT NULL,
  principal_type  ENUM('USER','ROLE','GROUP','TENANT') NOT NULL,
  principal_id    BIGINT NOT NULL,
  permission      ENUM('READ','WRITE','DELETE','SHARE') NOT NULL,
  granted_by      BIGINT NOT NULL,
  granted_at_utc  DATETIME(3) NOT NULL,
  expires_at_utc  DATETIME(3),
  UNIQUE KEY uq_doc_principal_perm (document_id, principal_type, principal_id, permission),
  CONSTRAINT fk_docacl_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.6 m21_document_share
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_document_share (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  document_id     BIGINT NOT NULL,
  share_token     VARCHAR(64) NOT NULL,
  recipient_email VARCHAR(255),
  expires_at_utc  DATETIME(3) NOT NULL,
  max_downloads   INT,
  download_count  INT DEFAULT 0,
  is_revoked      TINYINT(1) DEFAULT 0,
  created_by      BIGINT NOT NULL,
  created_at_utc  DATETIME(3) NOT NULL,
  UNIQUE KEY uq_share_token (share_token),
  INDEX idx_tenant_doc (tenant_id, document_id),
  CONSTRAINT fk_docshare_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.7 m21_document_audit (append-only)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_document_audit (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  document_id      BIGINT NOT NULL,
  user_id          BIGINT,
  action           ENUM('UPLOAD','DOWNLOAD','VIEW','UPDATE','DELETE','SHARE','RESTORE') NOT NULL,
  ip_address       VARCHAR(45),
  user_agent       VARCHAR(500),
  occurred_at_utc  DATETIME(3) NOT NULL,
  details          JSON,
  INDEX idx_doc_time (document_id, occurred_at_utc),
  INDEX idx_tenant_user_time (tenant_id, user_id, occurred_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.8 m21_extracted_field (OCR/AI output; populated by M28 in Phase 2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_extracted_field (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  document_id      BIGINT NOT NULL,
  field_name       VARCHAR(100) NOT NULL,
  field_value      TEXT,
  confidence       DECIMAL(5,4),
  source           ENUM('OCR','AI','HUMAN') NOT NULL,
  page_number      INT,
  bbox_json        JSON,
  extracted_at_utc DATETIME(3) NOT NULL,
  reviewed_by      BIGINT,
  reviewed_at_utc  DATETIME(3),
  INDEX idx_doc_field (document_id, field_name),
  CONSTRAINT fk_extr_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.9 m21_signature_request (Phase 2 — provider integration deferred)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_signature_request (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  document_id       BIGINT NOT NULL,
  provider          ENUM('NATIVE','DOCUSIGN','ADOBE_SIGN','OTHER') NOT NULL,
  external_ref      VARCHAR(255),
  status            ENUM('Draft','Sent','Viewed','Signed','Declined','Expired','Voided') NOT NULL,
  initiated_by      BIGINT NOT NULL,
  initiated_at_utc  DATETIME(3) NOT NULL,
  completed_at_utc  DATETIME(3),
  expires_at_utc    DATETIME(3),
  CONSTRAINT fk_sigreq_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.10 m21_signature_signer
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_signature_signer (
  id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id             INT NOT NULL,
  signature_request_id  BIGINT NOT NULL,
  email                 VARCHAR(255) NOT NULL,
  name                  VARCHAR(255),
  signing_order         INT,
  status                ENUM('Pending','Notified','Signed','Declined') NOT NULL,
  signed_at_utc         DATETIME(3),
  ip_address            VARCHAR(45),
  CONSTRAINT fk_signer_req FOREIGN KEY (signature_request_id) REFERENCES m21_signature_request(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.11 m21_retention_policy
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_retention_policy (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2),
  document_class_id   BIGINT,
  retain_years        TINYINT NOT NULL,
  worm                TINYINT(1) DEFAULT 0,
  legal_hold          TINYINT(1) DEFAULT 0,
  effective_from_utc  DATETIME(3) NOT NULL,
  CONSTRAINT fk_retpolicy_country FOREIGN KEY (country_code) REFERENCES m1_country(code),
  CONSTRAINT fk_retpolicy_class   FOREIGN KEY (document_class_id) REFERENCES m21_document_class(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.12 m21_legal_hold
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_legal_hold (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  hold_name       VARCHAR(150) NOT NULL,
  reason          TEXT,
  scope_module    VARCHAR(10),
  scope_class_id  BIGINT,
  scope_query     JSON,
  is_active       TINYINT(1) DEFAULT 1,
  applied_at_utc  DATETIME(3) NOT NULL,
  released_at_utc DATETIME(3),
  applied_by      BIGINT NOT NULL,
  released_by     BIGINT
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.13 m21_document_legal_hold
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_document_legal_hold (
  document_id     BIGINT NOT NULL,
  legal_hold_id   BIGINT NOT NULL,
  applied_at_utc  DATETIME(3) NOT NULL,
  PRIMARY KEY (document_id, legal_hold_id),
  CONSTRAINT fk_dlh_doc  FOREIGN KEY (document_id)   REFERENCES m21_document(id)   ON DELETE CASCADE,
  CONSTRAINT fk_dlh_hold FOREIGN KEY (legal_hold_id) REFERENCES m21_legal_hold(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.14 m21_storage_quota
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m21_storage_quota (
  tenant_id            INT PRIMARY KEY,
  bytes_used           BIGINT NOT NULL DEFAULT 0,
  bytes_quota          BIGINT NOT NULL,
  documents_count      BIGINT NOT NULL DEFAULT 0,
  last_recomputed_utc  DATETIME(3) NOT NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- Per-tenant document class seeds (LLD §10)
-- =====================================================================

-- Universal classes (both tenants)
INSERT IGNORE INTO m21_document_class
  (tenant_id, country_code, code, name, default_storage_container, default_immutable, default_retain_years, ocr_enabled, ai_classify) VALUES
  (1001, 'IN', 'AUDIT_REPORT', 'Audit Report',          'AuditLogs',   1, NULL, 0, 0),
  (1001, 'IN', 'EXPORT',       'Report Export',         'Exports',     0, NULL, 0, 0),
  (1001, 'IN', 'SCAN',         'Scanned Document',      'UserUploads', 0, NULL, 1, 1),
  (1001, 'IN', 'AGREEMENT',    'Agreement / Contract',  'UserUploads', 0, NULL, 0, 0),
  -- IN-specific
  (1001, 'IN', 'INVOICE',      'Tax Invoice (GST)',     'Invoices',    1, 8,    1, 1),
  (1001, 'IN', 'BOE',          'Bill of Entry',         'CustomsDocuments', 1, 5, 1, 1),
  (1001, 'IN', 'SB',           'Shipping Bill',         'CustomsDocuments', 1, 5, 1, 1),
  (1001, 'IN', 'IGM',          'Import General Manifest','CustomsDocuments', 1, 5, 0, 0),
  (1001, 'IN', 'EWB',          'e-Way Bill',            'CustomsDocuments', 0, 1, 0, 0),
  (1001, 'IN', 'IRN',          'Invoice Registration Number','Invoices', 1, 8, 0, 0),
  (1001, 'IN', 'GSTR1',        'GSTR-1 Return',         'Invoices',    1, 8,    0, 0),
  (1001, 'IN', 'GSTR3B',       'GSTR-3B Return',        'Invoices',    1, 8,    0, 0),
  (1001, 'IN', 'TDS_CERT',     'TDS Certificate',       'Invoices',    1, 8,    1, 0),
  (1001, 'IN', 'FORM_16A',     'Form 16A',              'Invoices',    1, 8,    1, 0),
  (1001, 'IN', 'POD',          'Proof of Delivery',     'PodPhotos',   0, 1,    0, 0);

-- US tenant classes
INSERT IGNORE INTO m21_document_class
  (tenant_id, country_code, code, name, default_storage_container, default_immutable, default_retain_years, ocr_enabled, ai_classify) VALUES
  (2001, 'US', 'AUDIT_REPORT', 'Audit Report',          'AuditLogs',   1, NULL, 0, 0),
  (2001, 'US', 'EXPORT',       'Report Export',         'Exports',     0, NULL, 0, 0),
  (2001, 'US', 'SCAN',         'Scanned Document',      'UserUploads', 0, NULL, 1, 1),
  (2001, 'US', 'AGREEMENT',    'Agreement / Contract',  'UserUploads', 0, NULL, 0, 0),
  (2001, 'US', 'INVOICE',      'Sales Tax Invoice',     'Invoices',    1, 7,    1, 1),
  (2001, 'US', '7501',         'CBP Form 7501 — Entry Summary','CustomsDocuments', 1, 5, 1, 1),
  (2001, 'US', 'ATM',          'CBP Air Manifest',      'CustomsDocuments', 1, 5, 0, 0),
  (2001, 'US', 'ITN',          'AES ITN',               'CustomsDocuments', 1, 5, 0, 0),
  (2001, 'US', 'AES',          'AES Filing',            'CustomsDocuments', 1, 5, 0, 0),
  (2001, 'US', 'ISF',          'Importer Security Filing','CustomsDocuments', 1, 5, 0, 0),
  (2001, 'US', '1099_NEC',     '1099-NEC',              'Invoices',    1, 7,    1, 0),
  (2001, 'US', '1099_MISC',    '1099-MISC',             'Invoices',    1, 7,    1, 0),
  (2001, 'US', 'W2',           'W-2 Wage Statement',    'Invoices',    1, 7,    1, 0),
  (2001, 'US', '941',          'Form 941',              'Invoices',    1, 7,    0, 0),
  (2001, 'US', 'POD',          'Proof of Delivery',     'PodPhotos',   0, 1,    0, 0);

-- Storage quotas (Phase 1 default: 10 GB per tenant)
INSERT IGNORE INTO m21_storage_quota
  (tenant_id, bytes_used, bytes_quota, documents_count, last_recomputed_utc) VALUES
  (1001, 0, 10737418240, 0, CURRENT_TIMESTAMP(3)),
  (2001, 0, 10737418240, 0, CURRENT_TIMESTAMP(3));

-- Mark version
INSERT INTO _ulp_schema_version (version, source, notes)
VALUES ('m21-tables', 'db/m21/01-m21-tables.sql', 'M21 14 tables + per-tenant doc-class seeds')
ON DUPLICATE KEY UPDATE applied_at_utc = CURRENT_TIMESTAMP(3);

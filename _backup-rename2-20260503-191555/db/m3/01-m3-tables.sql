-- =====================================================================
-- M3 Vendor Management — 9 tables (Tier-A, country-aware vendor records)
-- Strictly per docs/lld/M3_VendorManagement_v1.0.md (matches DBD §4 = 9 tables).
-- =====================================================================
-- Vendors extend M1.Party (party_type='Vendor'); M3 stores satellite data only.
-- Idempotent: CREATE TABLE IF NOT EXISTS.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- 3.1 m3_vendor — vendor satellite over m1_party
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m3_vendor (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  party_id          BIGINT NOT NULL,
  country_code      CHAR(2) NOT NULL,
  vendor_code       VARCHAR(50) NOT NULL,
  status            ENUM('Prospect','OnboardingInProgress','Active','Suspended','Blacklisted','Closed') NOT NULL,
  onboarding_started_at_utc DATETIME(3),
  activated_at_utc  DATETIME(3),
  preferred_language VARCHAR(10),
  tds_applicable    TINYINT(1) DEFAULT 0,
  tds_section       VARCHAR(20),
  is_msme           TINYINT(1) DEFAULT 0,
  msme_udyam_number VARCHAR(50),
  is_1099_reportable TINYINT(1) DEFAULT 0,
  w9_on_file        TINYINT(1) DEFAULT 0,
  risk_tier         ENUM('Low','Medium','High','Critical') DEFAULT 'Low',
  sanctions_clear   TINYINT(1) DEFAULT 0,
  sanctions_checked_at_utc DATETIME(3),
  created_at_utc    DATETIME(3) NOT NULL,
  modified_at_utc   DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_code (tenant_id, vendor_code),
  UNIQUE KEY uq_tenant_party (tenant_id, party_id),
  INDEX idx_status (tenant_id, status),
  INDEX idx_tenant_country (tenant_id, country_code),
  CONSTRAINT fk_vendor_party   FOREIGN KEY (party_id)     REFERENCES m1_party(id),
  CONSTRAINT fk_vendor_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.2 m3_vendor_category — multiple per vendor
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m3_vendor_category (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id   INT NOT NULL,
  vendor_id   BIGINT NOT NULL,
  category    ENUM('CARRIER_SEA','CARRIER_AIR','CARRIER_ROAD','CARRIER_RAIL',
                   'BROKER_CHA','BROKER_NVOCC','FREIGHT_FORWARDER',
                   'WAREHOUSE_3PL','WAREHOUSE_BONDED',
                   'BANK','PAYMENT_PROCESSOR','GOVERNMENT_AGENCY',
                   'IT_SOFTWARE','IT_HARDWARE','UTILITY','PROFESSIONAL_SERVICES',
                   'INSURANCE','SURVEY','TRADE_INTELLIGENCE','OTHER') NOT NULL,
  is_primary  TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_vendor_cat (vendor_id, category),
  CONSTRAINT fk_vc_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.3 m3_vendor_service — services this vendor offers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m3_vendor_service (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     INT NOT NULL,
  vendor_id     BIGINT NOT NULL,
  service_code  VARCHAR(50) NOT NULL,
  service_name  VARCHAR(150) NOT NULL,
  module_code   VARCHAR(10),
  description   TEXT,
  is_active     TINYINT(1) DEFAULT 1,
  UNIQUE KEY uq_vendor_service (vendor_id, service_code),
  CONSTRAINT fk_vs_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.4 m3_agreement — contracts (MSA/SOW/etc) — links to m21_document
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m3_agreement (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  vendor_id           BIGINT NOT NULL,
  agreement_type      ENUM('MSA','SOW','SLA','NDA','RATE_CARD','OTHER') NOT NULL,
  agreement_number    VARCHAR(80) NOT NULL,
  title               VARCHAR(255) NOT NULL,
  start_date          DATE NOT NULL,
  end_date            DATE,
  auto_renewal        TINYINT(1) DEFAULT 0,
  renewal_notice_days INT,
  status              ENUM('Draft','UnderReview','Signed','Active','Expiring','Expired','Terminated') NOT NULL,
  document_id         BIGINT,
  signed_at_utc       DATETIME(3),
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_agreement (tenant_id, agreement_number),
  INDEX idx_vendor_status (vendor_id, status),
  INDEX idx_expiring (status, end_date),
  CONSTRAINT fk_agr_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.5 m3_onboarding_step — workflow checklist
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m3_onboarding_step (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  vendor_id        BIGINT NOT NULL,
  step_code        VARCHAR(50) NOT NULL,
  step_name        VARCHAR(150) NOT NULL,
  status           ENUM('Pending','InProgress','Completed','Skipped','Failed') NOT NULL DEFAULT 'Pending',
  required         TINYINT(1) DEFAULT 1,
  result_json      JSON,
  performed_by     BIGINT,
  performed_at_utc DATETIME(3),
  notes            TEXT,
  UNIQUE KEY uq_vendor_step (vendor_id, step_code),
  CONSTRAINT fk_step_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.6 m3_performance_score — periodic scorecards
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m3_performance_score (
  id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id             INT NOT NULL,
  vendor_id             BIGINT NOT NULL,
  period_start          DATE NOT NULL,
  period_end            DATE NOT NULL,
  on_time_delivery_pct  DECIMAL(5,2),
  quality_score         DECIMAL(5,2),
  sla_breach_count      INT DEFAULT 0,
  ncr_count             INT DEFAULT 0,
  invoice_dispute_count INT DEFAULT 0,
  overall_score         DECIMAL(5,2),
  rating                ENUM('A','B','C','D','F'),
  computed_at_utc       DATETIME(3) NOT NULL,
  computed_by           ENUM('SYSTEM','MANUAL') NOT NULL DEFAULT 'SYSTEM',
  notes                 TEXT,
  UNIQUE KEY uq_vendor_period (vendor_id, period_start, period_end),
  INDEX idx_tenant_rating (tenant_id, rating),
  CONSTRAINT fk_score_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.7 m3_ncr — Non-Conformance Reports
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m3_ncr (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  vendor_id         BIGINT NOT NULL,
  ncr_number        VARCHAR(50) NOT NULL,
  raised_at_utc     DATETIME(3) NOT NULL,
  raised_by         BIGINT NOT NULL,
  related_module    VARCHAR(10),
  related_entity_id BIGINT,
  severity          ENUM('Low','Medium','High','Critical') NOT NULL,
  category          VARCHAR(80),
  description       TEXT NOT NULL,
  root_cause        TEXT,
  corrective_action TEXT,
  status            ENUM('Open','InvestigationStarted','VendorResponded','Resolved','Closed') NOT NULL,
  closed_at_utc     DATETIME(3),
  closed_by         BIGINT,
  UNIQUE KEY uq_tenant_ncr (tenant_id, ncr_number),
  INDEX idx_vendor_status (vendor_id, status),
  CONSTRAINT fk_ncr_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.8 m3_vendor_contact
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m3_vendor_contact (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id    INT NOT NULL,
  vendor_id    BIGINT NOT NULL,
  contact_role ENUM('PRIMARY','BILLING','OPERATIONS','LEGAL','COMPLIANCE','EMERGENCY','OTHER') NOT NULL,
  full_name    VARCHAR(150) NOT NULL,
  designation  VARCHAR(100),
  email        VARCHAR(255),
  phone        VARCHAR(30),
  language     VARCHAR(10),
  is_primary   TINYINT(1) DEFAULT 0,
  is_active    TINYINT(1) DEFAULT 1,
  INDEX idx_vendor_role (vendor_id, contact_role),
  CONSTRAINT fk_vcontact_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.9 m3_vendor_audit
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m3_vendor_audit (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  vendor_id        BIGINT NOT NULL,
  action           ENUM('CREATED','ONBOARDED','ACTIVATED','SUSPENDED','BLACKLISTED','REINSTATED','CLOSED',
                        'CATEGORY_CHANGED','RISK_REASSESSED','SCORE_RECOMPUTED','NCR_RAISED','NCR_CLOSED') NOT NULL,
  performed_by     BIGINT NOT NULL,
  performed_at_utc DATETIME(3) NOT NULL,
  details          JSON,
  INDEX idx_vendor_time (vendor_id, performed_at_utc),
  CONSTRAINT fk_audit_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Mark version
INSERT INTO _ulp_schema_version (version, source, notes)
VALUES ('m3-tables', 'db/m3/01-m3-tables.sql', 'M3 9 tables — vendor satellite over m1_party')
ON DUPLICATE KEY UPDATE applied_at_utc = CURRENT_TIMESTAMP(3);

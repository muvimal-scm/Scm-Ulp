-- =====================================================================
-- M14 Pricing & Quotation — 15 tables (Phase 2)
-- Strictly per docs/lld/M14_Pricing_v1.0.md (DBD §4 = 15 tables, +country_code on rate cards).
-- The LLD details 7 tables explicitly; the remaining 8 follow the same conventions.
-- Idempotent: CREATE TABLE IF NOT EXISTS.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- 2.1 m14_rate_card  (+country_code per DBD §4)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m14_rate_card (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  card_number         VARCHAR(50) NOT NULL,
  card_type           ENUM('SELL','BUY','INTERNAL_TRANSFER') NOT NULL,
  scope               ENUM('GENERAL','CUSTOMER','VENDOR','LANE','SERVICE') NOT NULL,
  party_id            BIGINT,
  origin_port_id      BIGINT,
  destination_port_id BIGINT,
  service_type        VARCHAR(50),
  valid_from          DATE NOT NULL,
  valid_to            DATE,
  currency            CHAR(3) NOT NULL,
  status              ENUM('Draft','Approved','Active','Expired','Cancelled') NOT NULL,
  approved_by         BIGINT,
  approved_at_utc     DATETIME(3),
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_card (tenant_id, card_number),
  INDEX idx_tenant_active (tenant_id, status, valid_from, valid_to),
  CONSTRAINT fk_rc_country  FOREIGN KEY (country_code) REFERENCES m1_country(code),
  CONSTRAINT fk_rc_currency FOREIGN KEY (currency)     REFERENCES m1_currency(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 2.2 m14_rate_card_line
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m14_rate_card_line (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  rate_card_id    BIGINT NOT NULL,
  line_number     INT NOT NULL,
  charge_code     VARCHAR(50) NOT NULL,
  description     VARCHAR(255),
  uom_code        VARCHAR(10) NOT NULL,
  rate_amount     DECIMAL(18,4) NOT NULL,
  rate_currency   CHAR(3) NOT NULL,
  min_amount      DECIMAL(18,4),
  max_amount      DECIMAL(18,4),
  is_taxable      TINYINT(1) DEFAULT 1,
  tax_class       VARCHAR(50),
  UNIQUE KEY uq_card_line (rate_card_id, line_number),
  CONSTRAINT fk_rcl_card FOREIGN KEY (rate_card_id) REFERENCES m14_rate_card(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 2.3 m14_rate_breakpoint
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m14_rate_breakpoint (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  rate_line_id    BIGINT NOT NULL,
  from_qty        DECIMAL(12,4) NOT NULL,
  to_qty          DECIMAL(12,4),
  rate_amount     DECIMAL(18,4) NOT NULL,
  rate_currency   CHAR(3) NOT NULL,
  CONSTRAINT fk_rb_line FOREIGN KEY (rate_line_id) REFERENCES m14_rate_card_line(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 2.4 m14_surcharge
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m14_surcharge (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  code                VARCHAR(50) NOT NULL,
  name                VARCHAR(150) NOT NULL,
  surcharge_type      ENUM('FIXED','PERCENT_FREIGHT','PER_UNIT') NOT NULL,
  amount              DECIMAL(18,4),
  currency            CHAR(3),
  percent             DECIMAL(7,4),
  valid_from          DATE NOT NULL,
  valid_to            DATE,
  origin_port_id      BIGINT,
  destination_port_id BIGINT,
  is_active           TINYINT(1) DEFAULT 1,
  UNIQUE KEY uq_tenant_code_from (tenant_id, code, valid_from)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 2.5 m14_quote
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m14_quote (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  quote_number        VARCHAR(50) NOT NULL,
  customer_party_id   BIGINT NOT NULL,
  enquiry_ref         VARCHAR(50),
  status              ENUM('Draft','Sent','Accepted','Rejected','Expired','Converted') NOT NULL,
  origin_port_id      BIGINT,
  destination_port_id BIGINT,
  service_type        VARCHAR(50),
  total_amount        DECIMAL(18,4),
  total_currency      CHAR(3),
  valid_until         DATE,
  document_id         BIGINT,
  notes               TEXT,
  created_by          BIGINT NOT NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_quote (tenant_id, quote_number),
  INDEX idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 2.6 m14_quote_line
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m14_quote_line (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  quote_id        BIGINT NOT NULL,
  line_number     INT NOT NULL,
  charge_code     VARCHAR(50) NOT NULL,
  description     VARCHAR(255),
  quantity        DECIMAL(12,4),
  uom_code        VARCHAR(10),
  unit_price      DECIMAL(18,4),
  amount          DECIMAL(18,4),
  currency        CHAR(3),
  rate_card_id    BIGINT,
  UNIQUE KEY uq_quote_line (quote_id, line_number),
  CONSTRAINT fk_ql_quote FOREIGN KEY (quote_id) REFERENCES m14_quote(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 2.7 m14_contract
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m14_contract (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  contract_number   VARCHAR(50) NOT NULL,
  customer_party_id BIGINT NOT NULL,
  rate_card_id      BIGINT,
  start_date        DATE NOT NULL,
  end_date          DATE,
  auto_renew        TINYINT(1) DEFAULT 0,
  payment_terms     VARCHAR(50),
  status            ENUM('Draft','Active','Expiring','Expired','Terminated') NOT NULL,
  document_id       BIGINT,
  created_at_utc    DATETIME(3) NOT NULL,
  modified_at_utc   DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_contract (tenant_id, contract_number),
  INDEX idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- Supporting tables (LLD §2.8-2.15) — drafted to LLD pattern.
-- =====================================================================

-- 2.8 m14_lane — origin→destination operating lane master
CREATE TABLE IF NOT EXISTS m14_lane (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  origin_port_id      BIGINT NOT NULL,
  destination_port_id BIGINT NOT NULL,
  mode                ENUM('OCEAN_FCL','OCEAN_LCL','AIR','ROAD','RAIL','MULTIMODAL') NOT NULL,
  transit_days        INT,
  frequency           VARCHAR(50),
  is_active           TINYINT(1) DEFAULT 1,
  created_at_utc      DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_lane (tenant_id, origin_port_id, destination_port_id, mode)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.9 m14_zone — postal-code zones for domestic/courier rates
CREATE TABLE IF NOT EXISTS m14_zone (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  country_code    CHAR(2) NOT NULL,
  code            VARCHAR(50) NOT NULL,
  name            VARCHAR(150) NOT NULL,
  postal_pattern  VARCHAR(255),
  is_active       TINYINT(1) DEFAULT 1,
  UNIQUE KEY uq_tenant_zone (tenant_id, country_code, code),
  CONSTRAINT fk_zone_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.10 m14_currency_factor — per-quote FX override
CREATE TABLE IF NOT EXISTS m14_currency_factor (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  base_currency   CHAR(3) NOT NULL,
  quote_currency  CHAR(3) NOT NULL,
  factor          DECIMAL(18,8) NOT NULL,
  valid_from      DATE NOT NULL,
  valid_to        DATE,
  source          VARCHAR(50),
  UNIQUE KEY uq_tenant_pair_from (tenant_id, base_currency, quote_currency, valid_from)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.11 m14_quote_revision — quote history snapshot
CREATE TABLE IF NOT EXISTS m14_quote_revision (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  quote_id        BIGINT NOT NULL,
  revision_no     INT NOT NULL,
  snapshot_json   JSON NOT NULL,
  created_by      BIGINT NOT NULL,
  created_at_utc  DATETIME(3) NOT NULL,
  notes           TEXT,
  UNIQUE KEY uq_quote_rev (quote_id, revision_no),
  CONSTRAINT fk_qr_quote FOREIGN KEY (quote_id) REFERENCES m14_quote(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.12 m14_negotiation_round — back-and-forth on a quote
CREATE TABLE IF NOT EXISTS m14_negotiation_round (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  quote_id          BIGINT NOT NULL,
  round_no          INT NOT NULL,
  party_id          BIGINT NOT NULL,
  action            ENUM('Offer','CounterOffer','Accept','Reject','Withdraw') NOT NULL,
  amount_offered    DECIMAL(18,4),
  currency          CHAR(3),
  notes             TEXT,
  occurred_at_utc   DATETIME(3) NOT NULL,
  UNIQUE KEY uq_quote_round (quote_id, round_no),
  CONSTRAINT fk_nr_quote FOREIGN KEY (quote_id) REFERENCES m14_quote(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.13 m14_rate_request — buy-side RFQ to vendors
CREATE TABLE IF NOT EXISTS m14_rate_request (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  request_number      VARCHAR(50) NOT NULL,
  customer_party_id   BIGINT,
  origin_port_id      BIGINT,
  destination_port_id BIGINT,
  service_type        VARCHAR(50),
  cargo_description   VARCHAR(500),
  requested_at_utc    DATETIME(3) NOT NULL,
  due_date            DATE,
  status              ENUM('Open','Closed','Cancelled') NOT NULL,
  created_by          BIGINT NOT NULL,
  UNIQUE KEY uq_tenant_request (tenant_id, request_number),
  INDEX idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.14 m14_rate_response — vendor reply to a rate request
CREATE TABLE IF NOT EXISTS m14_rate_response (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  rate_request_id   BIGINT NOT NULL,
  vendor_party_id   BIGINT NOT NULL,
  response_amount   DECIMAL(18,4) NOT NULL,
  response_currency CHAR(3) NOT NULL,
  valid_until       DATE,
  notes             TEXT,
  received_at_utc   DATETIME(3) NOT NULL,
  is_winner         TINYINT(1) DEFAULT 0,
  CONSTRAINT fk_rr_request FOREIGN KEY (rate_request_id) REFERENCES m14_rate_request(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.15 m14_audit
CREATE TABLE IF NOT EXISTS m14_audit (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  entity_type       VARCHAR(50) NOT NULL,
  entity_id         BIGINT NOT NULL,
  action            VARCHAR(50) NOT NULL,
  performed_by      BIGINT NOT NULL,
  performed_at_utc  DATETIME(3) NOT NULL,
  details           JSON,
  INDEX idx_entity_time (entity_type, entity_id, performed_at_utc),
  INDEX idx_tenant_time (tenant_id, performed_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Mark version
INSERT INTO _ulp_schema_version (version, source, notes)
VALUES ('m14-tables', 'db/m14/01-m14-tables.sql', 'M14 Pricing — 15 tables (Phase 2)')
ON DUPLICATE KEY UPDATE applied_at_utc = CURRENT_TIMESTAMP(3);

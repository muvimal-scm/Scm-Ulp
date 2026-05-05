-- =====================================================================
-- M2 Sales / CRM — 12 tables (Phase 4 first module)
-- Source: docs/lld/M2_SalesCRM_v1.0.md
-- Customer-side CRM (M3 = vendor-side). Lead → Opp → Quote → Customer.
-- Idempotent: CREATE TABLE IF NOT EXISTS.
-- =====================================================================

USE ulp_dev;

-- 2.1 Lead
CREATE TABLE IF NOT EXISTS m2_lead (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id          INT NOT NULL,
  country_code       CHAR(2) NOT NULL,
  lead_number        VARCHAR(50) NOT NULL,
  source             ENUM('WEB','REFERRAL','COLD_CALL','EVENT','PARTNER','EXISTING_CUSTOMER','OTHER') NOT NULL,
  contact_name       VARCHAR(150) NOT NULL,
  company_name       VARCHAR(200),
  email              VARCHAR(255),
  phone              VARCHAR(30),
  industry           VARCHAR(100),
  estimated_volume   VARCHAR(100),
  stage              ENUM('New','Contacted','Qualified','Disqualified','Converted') NOT NULL DEFAULT 'New',
  owner_user_id      BIGINT,
  converted_party_id BIGINT,
  created_at_utc     DATETIME(3) NOT NULL,
  modified_at_utc    DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_lead (tenant_id, lead_number),
  INDEX idx_tenant_stage (tenant_id, stage),
  CONSTRAINT fk_lead_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.2 Opportunity
CREATE TABLE IF NOT EXISTS m2_opportunity (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id          INT NOT NULL,
  country_code       CHAR(2) NOT NULL,
  opp_number         VARCHAR(50) NOT NULL,
  party_id           BIGINT NOT NULL,
  title              VARCHAR(255) NOT NULL,
  estimated_value    DECIMAL(18,4),
  estimated_currency CHAR(3),
  expected_close     DATE,
  probability_pct    DECIMAL(5,2),
  stage              ENUM('Prospecting','Qualification','Proposal','Negotiation','ClosedWon','ClosedLost') NOT NULL,
  owner_user_id      BIGINT,
  created_at_utc     DATETIME(3) NOT NULL,
  modified_at_utc    DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_opp (tenant_id, opp_number),
  INDEX idx_tenant_stage_close (tenant_id, stage, expected_close),
  CONSTRAINT fk_opp_party FOREIGN KEY (party_id) REFERENCES m1_party(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.3 Activity (calls, emails, meetings, notes, tasks against lead/opp/party)
CREATE TABLE IF NOT EXISTS m2_activity (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  related_to      ENUM('LEAD','OPP','PARTY') NOT NULL,
  related_id      BIGINT NOT NULL,
  activity_type   ENUM('CALL','EMAIL','MEETING','NOTE','TASK') NOT NULL,
  subject         VARCHAR(255),
  occurred_at_utc DATETIME(3) NOT NULL,
  owner_user_id   BIGINT,
  details         JSON,
  INDEX idx_related (related_to, related_id, occurred_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.4 Campaign
CREATE TABLE IF NOT EXISTS m2_campaign (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  name             VARCHAR(200) NOT NULL,
  channel          ENUM('EMAIL','SMS','WHATSAPP') NOT NULL,
  audience_filter  JSON,
  template_code    VARCHAR(80),
  scheduled_at_utc DATETIME(3),
  status           ENUM('Draft','Scheduled','Sending','Sent','Cancelled') NOT NULL,
  sent_count       INT DEFAULT 0,
  delivered_count  INT DEFAULT 0,
  created_at_utc   DATETIME(3) NOT NULL,
  INDEX idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.5 Campaign target
CREATE TABLE IF NOT EXISTS m2_campaign_target (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  campaign_id BIGINT NOT NULL,
  party_id    BIGINT NOT NULL,
  status      ENUM('Pending','Sent','Delivered','Bounced','Failed') NOT NULL DEFAULT 'Pending',
  sent_at_utc DATETIME(3),
  INDEX idx_campaign (campaign_id),
  CONSTRAINT fk_ct_campaign FOREIGN KEY (campaign_id) REFERENCES m2_campaign(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.6 RFQ request
CREATE TABLE IF NOT EXISTS m2_rfq_request (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  rfq_number       VARCHAR(50) NOT NULL,
  party_id         BIGINT NOT NULL,
  requested_at_utc DATETIME(3) NOT NULL,
  due_date         DATE,
  status           ENUM('Open','InResponse','Closed','Cancelled') NOT NULL,
  notes            TEXT,
  UNIQUE KEY uq_tenant_rfq (tenant_id, rfq_number),
  INDEX idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.7 RFQ line
CREATE TABLE IF NOT EXISTS m2_rfq_line (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  rfq_request_id  BIGINT NOT NULL,
  line_number     INT NOT NULL,
  description     VARCHAR(500) NOT NULL,
  quantity        DECIMAL(12,4),
  uom_code        VARCHAR(10),
  INDEX idx_rfq (rfq_request_id, line_number),
  CONSTRAINT fk_rfqline_rfq FOREIGN KEY (rfq_request_id) REFERENCES m2_rfq_request(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.8 RFQ response
CREATE TABLE IF NOT EXISTS m2_rfq_response (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  rfq_request_id    BIGINT NOT NULL,
  vendor_party_id   BIGINT NOT NULL,
  response_amount   DECIMAL(18,4),
  response_currency CHAR(3),
  valid_until       DATE,
  notes             TEXT,
  received_at_utc   DATETIME(3) NOT NULL,
  is_winner         TINYINT(1) DEFAULT 0,
  INDEX idx_rfq_resp (rfq_request_id),
  CONSTRAINT fk_rfqresp_rfq FOREIGN KEY (rfq_request_id) REFERENCES m2_rfq_request(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.9 Quote link (cross-module — references m14_quote.id)
CREATE TABLE IF NOT EXISTS m2_quote_link (
  quote_id        BIGINT NOT NULL,
  opportunity_id  BIGINT NOT NULL,
  PRIMARY KEY (quote_id, opportunity_id),
  CONSTRAINT fk_ql_opp FOREIGN KEY (opportunity_id) REFERENCES m2_opportunity(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.10 Pipeline stage definition
CREATE TABLE IF NOT EXISTS m2_pipeline_stage (
  id                       BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id                INT NOT NULL,
  code                     VARCHAR(30) NOT NULL,
  name                     VARCHAR(100) NOT NULL,
  sequence                 INT NOT NULL,
  default_probability_pct  DECIMAL(5,2),
  UNIQUE KEY uq_tenant_stage_code (tenant_id, code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.11 Forecast snapshot
CREATE TABLE IF NOT EXISTS m2_forecast_snapshot (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  owner_user_id   BIGINT,
  period          VARCHAR(20) NOT NULL,
  snapshot_json   JSON NOT NULL,
  taken_at_utc    DATETIME(3) NOT NULL,
  INDEX idx_tenant_period (tenant_id, period)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.12 Audit
CREATE TABLE IF NOT EXISTS m2_audit (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  entity_type      ENUM('LEAD','OPP','ACTIVITY','CAMPAIGN','RFQ') NOT NULL,
  entity_id        BIGINT NOT NULL,
  action           VARCHAR(50) NOT NULL,
  performed_by     BIGINT NOT NULL,
  performed_at_utc DATETIME(3) NOT NULL,
  details          JSON,
  INDEX idx_entity_time (entity_type, entity_id, performed_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

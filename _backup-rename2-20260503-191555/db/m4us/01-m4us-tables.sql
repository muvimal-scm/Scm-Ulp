-- =====================================================================
-- M4-US Customs (CBP/ABI) — per sealed LLD ULP_LLD_M4_US_CBP_ABI_v1.0.docx
--
-- US compliance plugin for ULP M4 (CHA / Customs).
-- Closes the M1 air-shipment customs items (Authority to Make Entry, Turnover/
-- Release Order, IT, US Customs Hold/Exam) AND the M2 customs items (7501
-- duty per product, PGA/FDA holds) from the SCM client milestone.
--
-- Tables explicitly DDL'd in LLD: m4us_entry (§3.1), m4us_entry_line (§3.2),
--                                 m4us_aes_eei (§8.2), m4us_hts_pga_mapping (§7.2)
-- Derived from LLD workflow descriptions: m4us_bond, m4us_isf, m4us_pga_hold,
--                                          m4us_atm, m4us_abi_message, m4us_cbp_status_log,
--                                          m4us_mpf_rate, m4us_add_cvd_case
--
-- Conventions (CLAUDE.md): tenant_id INT + country_code CHAR(2) on top-level entities,
-- module-prefixed FK/UNIQUE/INDEX names (db-global namespace in MySQL),
-- idempotent CREATE TABLE IF NOT EXISTS, DATETIME(3) UTC suffix _utc.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- 3.1 m4us_entry — CBP entry header (LLD §3.1 verbatim shape)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_entry (
  id                       BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id                INT NOT NULL,
  shipment_id              BIGINT NULL,
  entry_number             CHAR(11) NULL,
  filer_code               CHAR(3) NOT NULL,
  entry_type               CHAR(2) NOT NULL,
  entry_type_description   VARCHAR(50) NULL,
  importer_of_record_id    BIGINT NOT NULL,
  importer_ein             VARCHAR(20) NOT NULL,
  consignee_id             BIGINT NULL,
  ultimate_consignee_id    BIGINT NULL,
  bond_id                  BIGINT NULL,
  carrier_scac             CHAR(4) NOT NULL,
  vessel_name              VARCHAR(100) NULL,
  voyage_number            VARCHAR(20) NULL,
  port_of_unlading_code    CHAR(4) NOT NULL,
  port_of_entry_code       CHAR(4) NOT NULL,
  firms_code               CHAR(4) NULL,
  entry_date               DATE NOT NULL,
  import_date              DATE NOT NULL,
  estimated_arrival_date   DATE NULL,
  release_date             DATE NULL,
  bill_of_lading           VARCHAR(50) NULL,
  scac_bill_id             VARCHAR(60) NULL,
  in_bond_number           VARCHAR(20) NULL,
  abi_status               ENUM('Draft','Submitted','Accepted','Rejected','Released','Hold','Exam','Liquidated','Cancelled') NOT NULL DEFAULT 'Draft',
  cbp_status_message       TEXT NULL,
  pga_hold_flag            TINYINT(1) NOT NULL DEFAULT 0,
  exam_type                ENUM('NIL','XRAY','INTENSIVE','CET','TAILGATE') NOT NULL DEFAULT 'NIL',
  total_value_usd          DECIMAL(18,2) NULL,
  duty_amount_usd          DECIMAL(18,2) NULL,
  mpf_usd                  DECIMAL(18,2) NULL,
  hmf_usd                  DECIMAL(18,2) NULL,
  total_fees_usd           DECIMAL(18,2) NULL,
  created_at_utc           DATETIME(3) NOT NULL,
  created_by               BIGINT NOT NULL,
  submitted_at_utc         DATETIME(3) NULL,
  released_at_utc          DATETIME(3) NULL,
  liquidated_at_utc        DATETIME(3) NULL,
  modified_at_utc          DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m4us_entry_tenant_num (tenant_id, entry_number),
  INDEX idx_m4us_entry_tenant_status (tenant_id, abi_status),
  INDEX idx_m4us_entry_importer (tenant_id, importer_of_record_id),
  INDEX idx_m4us_entry_dates (tenant_id, entry_date),
  CONSTRAINT fk_m4us_entry_importer FOREIGN KEY (importer_of_record_id) REFERENCES m1_party(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.2 m4us_entry_line — entry line items (HTS classification, LLD §3.2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_entry_line (
  id                          BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id                   INT NOT NULL,
  entry_id                    BIGINT NOT NULL,
  line_number                 INT NOT NULL,
  hts_number                  VARCHAR(15) NOT NULL,
  description                 VARCHAR(255) NOT NULL,
  country_of_origin           CHAR(2) NOT NULL,
  quantity                    DECIMAL(18,4) NOT NULL,
  unit_of_measure             VARCHAR(10) NOT NULL,
  net_weight_kg               DECIMAL(18,4) NULL,
  invoice_value_usd           DECIMAL(18,2) NOT NULL,
  invoice_currency            CHAR(3) NOT NULL,
  invoice_value_orig          DECIMAL(18,2) NOT NULL,
  fx_rate                     DECIMAL(18,8) NULL,
  duty_rate_pct               DECIMAL(8,4) NULL,
  duty_specific               DECIMAL(18,4) NULL,
  duty_amount_usd             DECIMAL(18,2) NULL,
  add_case_number             VARCHAR(20) NULL,
  cvd_case_number             VARCHAR(20) NULL,
  add_rate_pct                DECIMAL(8,4) NULL,
  cvd_rate_pct                DECIMAL(8,4) NULL,
  special_program             CHAR(2) NULL,
  preferential_treatment_pct  DECIMAL(8,4) NULL,
  fda_required                TINYINT(1) NOT NULL DEFAULT 0,
  usda_required               TINYINT(1) NOT NULL DEFAULT 0,
  epa_required                TINYINT(1) NOT NULL DEFAULT 0,
  fcc_required                TINYINT(1) NOT NULL DEFAULT 0,
  manufacturer_id_code        VARCHAR(15) NULL,
  UNIQUE KEY uq_m4us_el_entry_line (entry_id, line_number),
  INDEX idx_m4us_el_hts (hts_number),
  CONSTRAINT fk_m4us_el_entry FOREIGN KEY (entry_id) REFERENCES m4us_entry(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_bond — Single Transaction Bond + Continuous Bond (LLD §1.2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_bond (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  bond_number         VARCHAR(30) NOT NULL,
  bond_type           ENUM('SingleTransaction','Continuous') NOT NULL,
  surety_code         VARCHAR(10) NOT NULL,
  surety_name         VARCHAR(150) NOT NULL,
  importer_party_id   BIGINT NOT NULL,
  amount_usd          DECIMAL(18,2) NOT NULL,
  effective_from      DATE NOT NULL,
  effective_to        DATE NULL,
  status              ENUM('Active','Expired','Cancelled') NOT NULL DEFAULT 'Active',
  utilization_pct     DECIMAL(5,2) NOT NULL DEFAULT 0,
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m4us_bond_tenant_num (tenant_id, bond_number),
  INDEX idx_m4us_bond_importer (tenant_id, importer_party_id, status),
  CONSTRAINT fk_m4us_bond_importer FOREIGN KEY (importer_party_id) REFERENCES m1_party(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_isf — Importer Security Filing (10+2) per LLD §9
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_isf (
  id                          BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id                   INT NOT NULL,
  shipment_id                 BIGINT NOT NULL,
  importer_of_record_id       BIGINT NOT NULL,
  importer_number             VARCHAR(20) NOT NULL,
  consignee_number            VARCHAR(20) NULL,
  seller_name                 VARCHAR(255) NULL,
  seller_address              VARCHAR(500) NULL,
  buyer_name                  VARCHAR(255) NULL,
  buyer_address               VARCHAR(500) NULL,
  ship_to_name                VARCHAR(255) NULL,
  ship_to_address             VARCHAR(500) NULL,
  manufacturer_name           VARCHAR(255) NULL,
  manufacturer_address        VARCHAR(500) NULL,
  country_of_origin           CHAR(2) NULL,
  hts_6                       VARCHAR(7) NULL,
  container_stuffing_location VARCHAR(255) NULL,
  consolidator_name           VARCHAR(255) NULL,
  filing_status               ENUM('Draft','Filed','Match','NoMatch','Late','Amended','Cancelled') NOT NULL DEFAULT 'Draft',
  filed_at_utc                DATETIME(3) NULL,
  vessel_load_cutoff_utc      DATETIME(3) NULL,
  bond_id                     BIGINT NULL,
  notes                       VARCHAR(500) NULL,
  created_at_utc              DATETIME(3) NOT NULL,
  modified_at_utc             DATETIME(3) NOT NULL,
  INDEX idx_m4us_isf_tenant_status (tenant_id, filing_status),
  INDEX idx_m4us_isf_shipment (shipment_id),
  CONSTRAINT fk_m4us_isf_importer FOREIGN KEY (importer_of_record_id) REFERENCES m1_party(id),
  CONSTRAINT fk_m4us_isf_bond     FOREIGN KEY (bond_id) REFERENCES m4us_bond(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_pga_hold — PGA holds tracked per entry (LLD §7.3)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_pga_hold (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  entry_id            BIGINT NOT NULL,
  pga_code            ENUM('FDA','USDA-APHIS','USDA-FSIS','EPA-TSCA','EPA-FIFRA',
                           'FCC','FWS','CPSC','ATF','DOT-NHTSA') NOT NULL,
  hold_reason_code    VARCHAR(20) NULL,
  hold_reason_text    VARCHAR(500) NULL,
  status              ENUM('Active','Released','Refused','Withdrawn') NOT NULL DEFAULT 'Active',
  raised_at_utc       DATETIME(3) NOT NULL,
  released_at_utc     DATETIME(3) NULL,
  released_by         BIGINT NULL,
  resolution_note     VARCHAR(500) NULL,
  INDEX idx_m4us_pga_entry (entry_id, status),
  INDEX idx_m4us_pga_tenant (tenant_id, status),
  CONSTRAINT fk_m4us_pga_entry FOREIGN KEY (entry_id) REFERENCES m4us_entry(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_atm — Authority to Make Entry / Power of Attorney (LLD §10.1)
-- Closes the M1 "Authority to Make Entry" item.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_atm (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  importer_party_id   BIGINT NOT NULL,
  broker_filer_code   CHAR(3) NOT NULL,
  combined_with_poa   TINYINT(1) NOT NULL DEFAULT 1,
  signed_at           DATE NOT NULL,
  effective_from      DATE NOT NULL,
  effective_to        DATE NULL,
  signer_name         VARCHAR(255) NOT NULL,
  signer_title        VARCHAR(100) NULL,
  document_id         BIGINT NULL,                       -- FK m21_document (signed PDF)
  status              ENUM('Active','Expired','Revoked') NOT NULL DEFAULT 'Active',
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  INDEX idx_m4us_atm_tenant_importer (tenant_id, importer_party_id, status),
  CONSTRAINT fk_m4us_atm_importer FOREIGN KEY (importer_party_id) REFERENCES m1_party(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_release_order — Turnover / Release Order (M1 client item)
-- LLD §10.1 "Delivery Order / Release Instructions"
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_release_order (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  entry_id            BIGINT NOT NULL,
  order_type          ENUM('TurnoverOrder','DeliveryOrder','ReleaseInstruction','LetterOfGuarantee') NOT NULL,
  reference_number    VARCHAR(40) NOT NULL,
  carrier_party_id    BIGINT NULL,
  warehouse_party_id  BIGINT NULL,
  issued_at           DATE NOT NULL,
  cargo_pickup_at     DATE NULL,
  status              ENUM('Draft','Issued','Picked','Cancelled') NOT NULL DEFAULT 'Draft',
  document_id         BIGINT NULL,                       -- FK m21_document
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m4us_ro_tenant_ref (tenant_id, reference_number),
  INDEX idx_m4us_ro_entry (entry_id),
  CONSTRAINT fk_m4us_ro_entry FOREIGN KEY (entry_id) REFERENCES m4us_entry(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_in_bond — Immediate Transportation (I.T.) per LLD §1.2 + §10.1
-- Closes the M1 "I.T." client item.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_in_bond (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  entry_id            BIGINT NULL,
  in_bond_number      VARCHAR(20) NOT NULL,
  in_bond_type        ENUM('IT','TE','WD') NOT NULL,            -- IT=Immediate Transportation, TE=Transportation+Exportation, WD=Warehouse Withdrawal
  carrier_scac        CHAR(4) NOT NULL,
  origin_port_code    CHAR(4) NOT NULL,
  destination_port_code CHAR(4) NOT NULL,
  bonded_carrier_id   BIGINT NULL,
  initiated_at        DATE NOT NULL,
  arrived_at          DATE NULL,
  status              ENUM('Open','InTransit','Arrived','Closed','Cancelled') NOT NULL DEFAULT 'Open',
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m4us_ib_tenant_num (tenant_id, in_bond_number),
  INDEX idx_m4us_ib_entry (entry_id),
  CONSTRAINT fk_m4us_ib_entry FOREIGN KEY (entry_id) REFERENCES m4us_entry(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_customs_hold_exam — US Customs Hold / Exam Notice (M1 client item)
-- LLD §11.3 + §10.1
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_customs_hold_exam (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  entry_id            BIGINT NOT NULL,
  notice_type         ENUM('Hold','Exam','Both') NOT NULL,
  exam_type           ENUM('NIL','XRAY','INTENSIVE','CET','TAILGATE') NOT NULL DEFAULT 'NIL',
  hold_reason_code    VARCHAR(20) NULL,
  hold_reason_text    VARCHAR(500) NULL,
  exam_site           VARCHAR(150) NULL,
  exam_appointment_at DATETIME(3) NULL,
  status              ENUM('Open','Resolved','Released','Refused') NOT NULL DEFAULT 'Open',
  raised_at_utc       DATETIME(3) NOT NULL,
  resolved_at_utc     DATETIME(3) NULL,
  resolution_note     VARCHAR(500) NULL,
  document_id         BIGINT NULL,                       -- FK m21_document (notice PDF)
  INDEX idx_m4us_che_entry (entry_id, status),
  INDEX idx_m4us_che_tenant (tenant_id, status),
  CONSTRAINT fk_m4us_che_entry FOREIGN KEY (entry_id) REFERENCES m4us_entry(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_aes_eei — Electronic Export Information (LLD §8.2 verbatim)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_aes_eei (
  id                          BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id                   INT NOT NULL,
  shipment_id                 BIGINT NULL,
  itn                         VARCHAR(20) NULL,
  shipment_reference_number   VARCHAR(35) NOT NULL,
  usppi_id                    BIGINT NOT NULL,
  usppi_ein                   VARCHAR(20) NOT NULL,
  ultimate_consignee_id       BIGINT NOT NULL,
  intermediate_consignee_id   BIGINT NULL,
  forwarding_agent_id         BIGINT NULL,
  mode_of_transport           ENUM('10','11','12','20','21','40','41','30','31','32','33') NOT NULL,
  carrier_scac                CHAR(4) NULL,
  conveyance_name             VARCHAR(100) NULL,
  port_of_export              CHAR(4) NOT NULL,
  port_of_unlading            CHAR(4) NULL,
  country_of_destination      CHAR(2) NOT NULL,
  date_of_export              DATE NOT NULL,
  filing_status               ENUM('Draft','Submitted','Accepted','Rejected','Cancelled','Replaced') NOT NULL DEFAULT 'Draft',
  filing_option               ENUM('1','2','3','4') NOT NULL DEFAULT '1',
  filed_at_utc                DATETIME(3) NULL,
  filed_by                    BIGINT NULL,
  created_at_utc              DATETIME(3) NOT NULL,
  modified_at_utc             DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m4us_aes_tenant_ref (tenant_id, shipment_reference_number),
  INDEX idx_m4us_aes_status (tenant_id, filing_status),
  CONSTRAINT fk_m4us_aes_usppi FOREIGN KEY (usppi_id) REFERENCES m1_party(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_hts_pga_mapping — HTS prefix → required PGA (LLD §7.2 verbatim)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_hts_pga_mapping (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  hts_prefix          VARCHAR(15) NOT NULL,
  pga_code            ENUM('FDA','USDA-APHIS','USDA-FSIS','EPA-TSCA','EPA-FIFRA',
                           'FCC','FWS','CPSC','ATF','DOT-NHTSA') NOT NULL,
  is_required         TINYINT(1) NOT NULL DEFAULT 1,
  pga_message_type    VARCHAR(20) NULL,
  effective_from      DATE NOT NULL,
  effective_to        DATE NULL,
  UNIQUE KEY uq_m4us_hpm (hts_prefix, pga_code, effective_from)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_mpf_rate — Merchandise Processing Fee rate table (LLD §5.3 — annual)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_mpf_rate (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  fiscal_year         INT NOT NULL,
  entry_class         ENUM('Formal','Informal','DeMinimis') NOT NULL,
  rate_pct            DECIMAL(8,4) NULL,
  flat_amount_usd     DECIMAL(8,2) NULL,
  min_amount_usd      DECIMAL(8,2) NULL,
  max_amount_usd      DECIMAL(8,2) NULL,
  effective_from      DATE NOT NULL,
  effective_to        DATE NULL,
  UNIQUE KEY uq_m4us_mpf_year_class (fiscal_year, entry_class)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_add_cvd_case — Anti-Dumping / Countervailing case master (LLD §5.5)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_add_cvd_case (
  id                      BIGINT PRIMARY KEY AUTO_INCREMENT,
  case_number             VARCHAR(20) NOT NULL,
  case_type               ENUM('ADD','CVD') NOT NULL,
  product_description     VARCHAR(255) NOT NULL,
  country_code            CHAR(2) NOT NULL,
  manufacturer_id         VARCHAR(15) NULL,                  -- MID; NULL = applies to all manufacturers
  rate_pct                DECIMAL(8,4) NOT NULL,
  cash_deposit_pct        DECIMAL(8,4) NULL,
  effective_from          DATE NOT NULL,
  effective_to            DATE NULL,
  status                  ENUM('Active','Suspended','Revoked','Liquidated') NOT NULL DEFAULT 'Active',
  hts_pattern             VARCHAR(15) NULL,
  UNIQUE KEY uq_m4us_acc_case_mid (case_number, manufacturer_id, effective_from),
  INDEX idx_m4us_acc_country_status (country_code, status),
  INDEX idx_m4us_acc_hts (hts_pattern)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m4us_abi_message — Outbox / inbox for ABI EDI (LLD §6.4 reliability)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m4us_abi_message (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  entry_id            BIGINT NULL,
  message_code        VARCHAR(4) NOT NULL,                   -- SE, SO, SI, SX, UC, US, UR, CD, QP
  direction           ENUM('Out','In') NOT NULL,
  payload_redacted    TEXT NULL,                             -- payload with EIN/sensitive redacted
  status              ENUM('Pending','Sent','AckReceived','Rejected','Failed') NOT NULL DEFAULT 'Pending',
  attempt_count       INT NOT NULL DEFAULT 0,
  cbp_reference       VARCHAR(40) NULL,
  acknowledged_at_utc DATETIME(3) NULL,
  failure_reason      VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  sent_at_utc         DATETIME(3) NULL,
  INDEX idx_m4us_abi_entry (entry_id, message_code),
  INDEX idx_m4us_abi_pending (tenant_id, status, created_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

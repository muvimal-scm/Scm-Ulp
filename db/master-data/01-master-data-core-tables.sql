-- =====================================================================
-- M1 Master Data — Core tables (Tier-A, country-agnostic)
-- =====================================================================
-- Strictly derived from ulpReq/ULP_LLD_M1_v2.0_MasterData.docx
-- Country/state/currency tables already exist in ulpReq/ULP_DBD_v2.0_Schema.sql
-- This file adds the 9 remaining M1-Core tables that the LLD specifies.
--
-- Phase 1 scope (per Shankar checkpoint 2026-05-02):
--   Q1 → option (b): 6 core tables now. Others (bank-branch, bank-account,
--                    holiday) DDL written here for forward-compat but the
--                    .NET / UI work for them is deferred to Phase 1.1.
--   Q2 → option (a): identifiers stored as Pending; validators wire in Phase 3.
--   Q4 → option (b): m1_fx_rate stored manually; auto-fetch deferred.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- m1_party — universal party (customer / vendor / carrier / etc.)
-- LLD §3
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_party (
  id                       BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id                INT NOT NULL,
  country_code             CHAR(2) NOT NULL,
  party_type               ENUM('CUSTOMER','VENDOR','CARRIER','BROKER','BANK',
                                'GOVERNMENT_AGENCY','EMPLOYEE','OTHER') NOT NULL,
  legal_name               VARCHAR(255) NOT NULL,
  trade_name               VARCHAR(255),
  parent_party_id          BIGINT,
  is_active                TINYINT(1) DEFAULT 1,
  preferred_locale         VARCHAR(10),
  preferred_currency       CHAR(3),
  default_payment_terms    VARCHAR(50),
  credit_limit             DECIMAL(18,4),
  credit_currency          CHAR(3),
  tax_status               VARCHAR(50),
  sanctions_screened       TINYINT(1) DEFAULT 0,
  sanctions_screened_at_utc DATETIME(3),
  created_at_utc           DATETIME(3) NOT NULL,
  modified_at_utc          DATETIME(3) NOT NULL,

  INDEX idx_type    (tenant_id, party_type),
  INDEX idx_country (tenant_id, country_code),
  FULLTEXT idx_name (legal_name, trade_name),
  CONSTRAINT fk_party_country  FOREIGN KEY (country_code)        REFERENCES m1_country(code),
  CONSTRAINT fk_party_currency FOREIGN KEY (preferred_currency)  REFERENCES m1_currency(code),
  CONSTRAINT fk_party_credit_currency FOREIGN KEY (credit_currency) REFERENCES m1_currency(code),
  CONSTRAINT fk_party_parent   FOREIGN KEY (parent_party_id)     REFERENCES m1_party(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m1_party_identifier — pluggable per-country identifiers
-- LLD §3.1
-- Examples:
--   IN: PAN, GSTIN, TAN, CIN, IEC, AADHAAR
--   US: EIN, SSN_LAST4, DUNS, ITIN, TIN
--   Universal: DUNS, VAT, SCAC
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_party_identifier (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  party_id            BIGINT NOT NULL,
  identifier_type     VARCHAR(30) NOT NULL,
  identifier_value    VARCHAR(50) NOT NULL,
  is_primary          TINYINT(1) DEFAULT 0,
  validated_at_utc    DATETIME(3),
  validation_source   VARCHAR(50),
  validation_status   ENUM('Pending','Valid','Invalid','Expired') DEFAULT 'Pending',
  expires_at_utc      DATETIME(3),
  encrypted_value     VARBINARY(255),

  INDEX idx_party_type (party_id, identifier_type),
  INDEX idx_lookup     (tenant_id, identifier_type, identifier_value),
  CONSTRAINT fk_identifier_party FOREIGN KEY (party_id) REFERENCES m1_party(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m1_address — universal address
-- LLD §4
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_address (
  id                       BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id                INT NOT NULL,
  party_id                 BIGINT,
  country_code             CHAR(2) NOT NULL,
  line1                    VARCHAR(255) NOT NULL,
  line2                    VARCHAR(255),
  line3                    VARCHAR(255),
  city                     VARCHAR(100) NOT NULL,
  state_or_province        VARCHAR(100) NOT NULL,
  state_or_province_code   VARCHAR(10),
  postal_code              VARCHAR(20),
  county_or_district       VARCHAR(100),
  latitude                 DECIMAL(10,7),
  longitude                DECIMAL(10,7),
  geocode_source           VARCHAR(50),
  geocode_quality          VARCHAR(20),
  verified_at_utc          DATETIME(3),
  verification_source      VARCHAR(50),
  address_type             ENUM('BILLING','SHIPPING','OFFICE','WAREHOUSE',
                                'MAILING','TAX_REGISTERED') NOT NULL,
  is_primary               TINYINT(1) DEFAULT 0,
  created_at_utc           DATETIME(3) NOT NULL,
  modified_at_utc          DATETIME(3) NOT NULL,

  INDEX idx_party  (party_id, address_type),
  INDEX idx_postal (country_code, postal_code),
  CONSTRAINT fk_address_country FOREIGN KEY (country_code) REFERENCES m1_country(code),
  CONSTRAINT fk_address_party   FOREIGN KEY (party_id)     REFERENCES m1_party(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m1_product — product master
-- LLD §5
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_product (
  id                          BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id                   INT NOT NULL,
  country_code                CHAR(2),
  product_code                VARCHAR(50) NOT NULL,
  product_name                VARCHAR(255) NOT NULL,
  product_description         TEXT,
  product_type                ENUM('GOODS','SERVICE','BUNDLE') NOT NULL,
  uom_code                    VARCHAR(10) NOT NULL,
  weight_kg                   DECIMAL(10,3),
  volume_cbm                  DECIMAL(10,4),
  hs_code                     VARCHAR(15),
  hsn_code                    VARCHAR(15),
  htsus_code                  VARCHAR(15),
  schedule_b_code             VARCHAR(15),
  tax_class                   VARCHAR(50),
  country_of_origin           CHAR(2),
  is_hazmat                   TINYINT(1) DEFAULT 0,
  is_perishable               TINYINT(1) DEFAULT 0,
  is_temperature_controlled   TINYINT(1) DEFAULT 0,
  is_dual_use                 TINYINT(1) DEFAULT 0,
  created_at_utc              DATETIME(3) NOT NULL,
  modified_at_utc             DATETIME(3) NOT NULL,

  UNIQUE KEY uq_tenant_code (tenant_id, product_code),
  INDEX idx_tenant_country (tenant_id, country_code),
  CONSTRAINT fk_product_country FOREIGN KEY (country_code)      REFERENCES m1_country(code),
  CONSTRAINT fk_product_origin  FOREIGN KEY (country_of_origin) REFERENCES m1_country(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m1_uom — unit of measure (universal)
-- LLD §8.3
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_uom (
  code           VARCHAR(10) NOT NULL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  category       ENUM('LENGTH','WEIGHT','VOLUME','CONTAINER','COUNT','TIME','OTHER') NOT NULL,
  base_factor    DECIMAL(18,8),
  base_uom_code  VARCHAR(10),
  is_active      TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- LLD §8.3 lists the canonical UoMs:
INSERT INTO m1_uom (code, name, category, base_factor, base_uom_code) VALUES
  -- Length
  ('M',   'Metre',          'LENGTH', 1,        'M'),
  ('CM',  'Centimetre',     'LENGTH', 0.01,     'M'),
  ('MM',  'Millimetre',     'LENGTH', 0.001,    'M'),
  ('IN',  'Inch',           'LENGTH', 0.0254,   'M'),
  ('FT',  'Foot',           'LENGTH', 0.3048,   'M'),
  ('YD',  'Yard',           'LENGTH', 0.9144,   'M'),
  -- Weight
  ('KG',  'Kilogram',       'WEIGHT', 1,        'KG'),
  ('G',   'Gram',           'WEIGHT', 0.001,    'KG'),
  ('MG',  'Milligram',      'WEIGHT', 0.000001, 'KG'),
  ('LB',  'Pound',          'WEIGHT', 0.453592, 'KG'),
  ('OZ',  'Ounce',          'WEIGHT', 0.0283495,'KG'),
  ('TONM','Metric Ton',     'WEIGHT', 1000,     'KG'),
  ('TONU','US Ton',         'WEIGHT', 907.185,  'KG'),
  -- Volume
  ('L',   'Litre',          'VOLUME', 1,        'L'),
  ('ML',  'Millilitre',     'VOLUME', 0.001,    'L'),
  ('GALU','US Gallon',      'VOLUME', 3.78541,  'L'),
  ('GALI','Imperial Gallon','VOLUME', 4.54609,  'L'),
  ('M3',  'Cubic Metre',    'VOLUME', 1000,     'L'),
  ('FT3', 'Cubic Foot',     'VOLUME', 28.3168,  'L'),
  -- Container
  ('TEU', 'TEU',            'CONTAINER', NULL, NULL),
  ('FEU', 'FEU',            'CONTAINER', NULL, NULL),
  ('20DC','20ft Dry',       'CONTAINER', NULL, NULL),
  ('40DC','40ft Dry',       'CONTAINER', NULL, NULL),
  ('40HC','40ft High Cube', 'CONTAINER', NULL, NULL),
  ('45HC','45ft High Cube', 'CONTAINER', NULL, NULL),
  -- Generic
  ('EA',  'Each',           'COUNT',  NULL, NULL),
  ('PCS', 'Pieces',         'COUNT',  NULL, NULL),
  ('PK',  'Pack',           'COUNT',  NULL, NULL),
  ('CTN', 'Carton',         'COUNT',  NULL, NULL),
  ('PLT', 'Pallet',         'COUNT',  NULL, NULL)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Now that m1_uom exists, add the FK on m1_product.uom_code (deferred until here to avoid FK-before-table).
-- Idempotent: drop-then-add so re-runs don't fail on duplicate-constraint name.
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'm1_product'
    AND constraint_name = 'fk_product_uom'
);
SET @sql := IF(@fk_exists > 0,
  'ALTER TABLE m1_product DROP FOREIGN KEY fk_product_uom',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE m1_product
  ADD CONSTRAINT fk_product_uom FOREIGN KEY (uom_code) REFERENCES m1_uom(code);

-- ---------------------------------------------------------------------
-- m1_port — universal port master
-- LLD §8.2 (UN/LOCODE-based; Indian + US ports listed in LLD)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_port (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  un_locode       VARCHAR(10) NOT NULL,
  country_code    CHAR(2) NOT NULL,
  name            VARCHAR(150) NOT NULL,
  port_type       ENUM('SEA','AIR','LAND','RAIL','MULTIMODAL') NOT NULL,
  cbp_schedule_d  VARCHAR(10),
  is_active       TINYINT(1) DEFAULT 1,

  UNIQUE KEY uq_un_locode (un_locode),
  INDEX idx_country_type (country_code, port_type),
  CONSTRAINT fk_port_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed Indian ports (LLD §8.2: JNPT, Mundra, Chennai, Kolkata, Mumbai, Cochin, Tuticorin, Vizag)
INSERT INTO m1_port (un_locode, country_code, name, port_type) VALUES
  ('INNSA','IN','Nhava Sheva (JNPT)','SEA'),
  ('INMUN','IN','Mundra','SEA'),
  ('INMAA','IN','Chennai','SEA'),
  ('INCCU','IN','Kolkata','SEA'),
  ('INBOM','IN','Mumbai','SEA'),
  ('INCOK','IN','Cochin','SEA'),
  ('INTUT','IN','Tuticorin','SEA'),
  ('INVTZ','IN','Visakhapatnam','SEA'),
  ('INDEL','IN','Delhi (IGI)','AIR'),
  ('INMAA','IN','Chennai (MAA)','AIR'),
  ('INBLR','IN','Bengaluru (BLR)','AIR'),
  ('INHYD','IN','Hyderabad (HYD)','AIR')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Seed US ports (LLD §8.2: LA/Long Beach, NY/NJ, Savannah, Houston, Seattle/Tacoma, Norfolk)
INSERT INTO m1_port (un_locode, country_code, name, port_type, cbp_schedule_d) VALUES
  ('USLAX','US','Los Angeles / Long Beach','SEA','2704'),
  ('USNYC','US','New York / New Jersey','SEA','1001'),
  ('USSAV','US','Savannah','SEA','1703'),
  ('USHOU','US','Houston','SEA','5301'),
  ('USSEA','US','Seattle / Tacoma','SEA','3001'),
  ('USORF','US','Norfolk','SEA','1401'),
  ('USJFK','US','New York (JFK)','AIR','4701'),
  ('USORD','US','Chicago (ORD)','AIR','3901'),
  ('USDFW','US','Dallas / Fort Worth','AIR','5501'),
  ('USATL','US','Atlanta','AIR','1704')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ---------------------------------------------------------------------
-- m1_bank — universal bank master (BIC, name, country)
-- LLD §8.1
-- Bank-branch + bank-account tables created but tenant-scoped flesh
-- belongs to a later wave.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_bank (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  bic             VARCHAR(11),
  country_code    CHAR(2) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  short_name      VARCHAR(100),
  is_active       TINYINT(1) DEFAULT 1,

  UNIQUE KEY uq_bic (bic),
  INDEX idx_country_name (country_code, name),
  CONSTRAINT fk_bank_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m1_bank_branch (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  bank_id         BIGINT NOT NULL,
  country_code    CHAR(2) NOT NULL,
  branch_code     VARCHAR(20) NOT NULL,    -- IN: IFSC; US: ABA
  branch_name     VARCHAR(200),
  city            VARCHAR(100),
  state_code      VARCHAR(10),
  is_active       TINYINT(1) DEFAULT 1,

  INDEX idx_bank          (bank_id),
  INDEX idx_country_code  (country_code, branch_code),
  CONSTRAINT fk_branch_bank    FOREIGN KEY (bank_id)      REFERENCES m1_bank(id) ON DELETE CASCADE,
  CONSTRAINT fk_branch_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m1_bank_account (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  party_id        BIGINT,
  bank_branch_id  BIGINT NOT NULL,
  account_number  VARCHAR(50) NOT NULL,
  account_holder  VARCHAR(255) NOT NULL,
  currency        CHAR(3) NOT NULL,
  account_type    ENUM('SAVINGS','CURRENT','OD','LOAN','OTHER') DEFAULT 'CURRENT',
  is_active       TINYINT(1) DEFAULT 1,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,

  INDEX idx_tenant_party (tenant_id, party_id),
  CONSTRAINT fk_account_branch   FOREIGN KEY (bank_branch_id) REFERENCES m1_bank_branch(id),
  CONSTRAINT fk_account_currency FOREIGN KEY (currency)       REFERENCES m1_currency(code),
  CONSTRAINT fk_account_party    FOREIGN KEY (party_id)       REFERENCES m1_party(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m1_holiday — country-specific holiday calendar
-- LLD §8.4
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_holiday (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  country_code    CHAR(2) NOT NULL,
  state_code      VARCHAR(10),         -- nullable; NULL = country-wide
  holiday_date    DATE NOT NULL,
  name            VARCHAR(150) NOT NULL,
  is_observed     TINYINT(1) DEFAULT 1,

  UNIQUE KEY uq_country_state_date (country_code, state_code, holiday_date),
  INDEX idx_date (country_code, holiday_date),
  CONSTRAINT fk_holiday_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m1_fx_rate — FX rates
-- LLD §7
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_fx_rate (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  base_currency   CHAR(3) NOT NULL,
  quote_currency  CHAR(3) NOT NULL,
  rate            DECIMAL(18,8) NOT NULL,
  rate_date       DATE NOT NULL,
  rate_type       ENUM('SPOT','FORWARD','AVERAGE_MONTHLY','PERIOD_END') NOT NULL,
  source          VARCHAR(50) NOT NULL,
  fetched_at_utc  DATETIME(3) NOT NULL,

  UNIQUE KEY uq_tenant_pair_date_type (tenant_id, base_currency, quote_currency, rate_date, rate_type),
  INDEX idx_lookup (tenant_id, base_currency, quote_currency, rate_date),
  CONSTRAINT fk_fx_base  FOREIGN KEY (base_currency)  REFERENCES m1_currency(code),
  CONSTRAINT fk_fx_quote FOREIGN KEY (quote_currency) REFERENCES m1_currency(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- Dev tenant fixtures: now seeded by db/baseline/01-v1-baseline.sql
-- (m_tenant requires fiscal_year_start_month + region + compliance_plugins
-- which are cross-cutting concerns. M1 SQL no longer reseeds m_tenant.)
-- =====================================================================

-- Mark version
INSERT INTO _ulp_schema_version (version, source, notes)
VALUES ('m1-core-tables', 'db/m1/01-m1-core-tables.sql', 'M1 core tables created (Phase 1)')
ON DUPLICATE KEY UPDATE applied_at_utc = CURRENT_TIMESTAMP(3);

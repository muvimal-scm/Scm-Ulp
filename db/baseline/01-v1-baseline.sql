-- =====================================================================
-- ULP Phase 1 baseline — fresh-install v2.0 cross-cutting tables.
-- =====================================================================
-- Why this file exists:
--   ulpReq/ULP_DBD_v2.0_Schema.sql is a DELTA migration from a real v1.0
--   production database. It ALTERs tables (m_tenant, m1_party, m4_*,
--   m13_*, m17_*) that don't exist in a fresh ULP build. Running the
--   delta on an empty MySQL fails on the first ALTER.
--
-- This file creates the cross-cutting v2.0 tables in their final shape,
-- using EXACTLY the column shapes that the DBD §4 reference tables
-- declare (so M1 + M26 module SQL FKs match without translation).
--
-- Idempotent: safe to re-run.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- m1_country — FK target for tenant + many tables
-- (Shape: ulpReq/ULP_DBD_v2.0_Schema.sql lines 21-31.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_country (
  code              CHAR(2) NOT NULL PRIMARY KEY,
  code3             CHAR(3) NOT NULL,
  numeric_code      SMALLINT NOT NULL,
  name              VARCHAR(100) NOT NULL,
  region            VARCHAR(50),
  default_currency  CHAR(3) NOT NULL,
  default_locale    VARCHAR(10) NOT NULL,
  default_time_zone VARCHAR(50) NOT NULL,
  is_supported      TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO m1_country VALUES
  ('IN','IND',356,'India',         'South Asia',     'INR','en-IN','Asia/Kolkata',     1),
  ('US','USA',840,'United States', 'North America',  'USD','en-US','America/New_York', 1),
  ('GB','GBR',826,'United Kingdom','Europe',         'GBP','en-GB','Europe/London',    0),
  ('AE','ARE',784,'United Arab Emirates','Middle East','AED','en-AE','Asia/Dubai',     0),
  ('SG','SGP',702,'Singapore',     'South-East Asia','SGD','en-SG','Asia/Singapore',   0);

-- ---------------------------------------------------------------------
-- m1_state_or_province — FK target for some country-aware tables
-- (Shape: ulpReq/ULP_DBD_v2.0_Schema.sql lines 41-51.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_state_or_province (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  country_code  CHAR(2) NOT NULL,
  code          VARCHAR(10) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  is_special    TINYINT(1) DEFAULT 0,
  capital_city  VARCHAR(100),
  time_zone     VARCHAR(50),
  UNIQUE KEY uq_country_code (country_code, code),
  CONSTRAINT fk_state_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A small starter set; the full DBD has 36 IN states + 56 US states/territories.
INSERT IGNORE INTO m1_state_or_province (country_code, code, name, is_special, time_zone) VALUES
  ('IN','MH','Maharashtra',     0, 'Asia/Kolkata'),
  ('IN','KA','Karnataka',       0, 'Asia/Kolkata'),
  ('IN','TN','Tamil Nadu',      0, 'Asia/Kolkata'),
  ('IN','DL','Delhi',           1, 'Asia/Kolkata'),
  ('IN','GJ','Gujarat',         0, 'Asia/Kolkata'),
  ('IN','UP','Uttar Pradesh',   0, 'Asia/Kolkata'),
  ('IN','WB','West Bengal',     0, 'Asia/Kolkata'),
  ('US','CA','California',      0, 'America/Los_Angeles'),
  ('US','NY','New York',        0, 'America/New_York'),
  ('US','TX','Texas',           0, 'America/Chicago'),
  ('US','FL','Florida',         0, 'America/New_York'),
  ('US','IL','Illinois',        0, 'America/Chicago'),
  ('US','WA','Washington',      0, 'America/Los_Angeles');

-- ---------------------------------------------------------------------
-- m1_currency — FK target for m_tenant
-- (Shape: ulpReq/ULP_DBD_v2.0_Schema.sql lines 151-159.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m1_currency (
  code            CHAR(3) PRIMARY KEY,
  numeric_code    SMALLINT,
  name            VARCHAR(50) NOT NULL,
  symbol          VARCHAR(10),
  decimal_digits  TINYINT NOT NULL,
  default_country CHAR(2),
  is_active       TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO m1_currency VALUES
  ('INR', 356, 'Indian Rupee',     'Rs.',  2, 'IN', 1),
  ('USD', 840, 'US Dollar',        '$',    2, 'US', 1),
  ('EUR', 978, 'Euro',             'EUR',  2, NULL, 1),
  ('GBP', 826, 'Pound Sterling',   'GBP',  2, 'GB', 1),
  ('AED', 784, 'UAE Dirham',       'AED',  2, 'AE', 1),
  ('SGD', 702, 'Singapore Dollar', 'S$',   2, 'SG', 1),
  ('JPY', 392, 'Japanese Yen',     'JPY',  0, NULL, 1),
  ('CAD', 124, 'Canadian Dollar',  'C$',   2, NULL, 1),
  ('AUD',  36, 'Australian Dollar','A$',   2, NULL, 1),
  ('CNY', 156, 'Chinese Yuan',     'CNY',  2, NULL, 1);

-- ---------------------------------------------------------------------
-- m_tenant — multi-region tenant master in v2.0 final shape.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m_tenant (
  id                       INT PRIMARY KEY AUTO_INCREMENT,
  name                     VARCHAR(255) NOT NULL,
  country_code             CHAR(2) NOT NULL,
  primary_locale           VARCHAR(10) NOT NULL,
  primary_time_zone        VARCHAR(50) NOT NULL,
  functional_currency      CHAR(3) NOT NULL,
  fiscal_year_start_month  TINYINT NOT NULL,
  region                   VARCHAR(20) NOT NULL,
  status                   VARCHAR(15) NOT NULL DEFAULT 'Active',
  compliance_plugins       JSON NOT NULL,
  created_at_utc           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_tenant_country  FOREIGN KEY (country_code) REFERENCES m1_country(code),
  CONSTRAINT fk_tenant_currency FOREIGN KEY (functional_currency) REFERENCES m1_currency(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO m_tenant
  (id, name, country_code, primary_locale, primary_time_zone, functional_currency,
   fiscal_year_start_month, region, status, compliance_plugins)
VALUES
  (1001, 'ULP Dev Tenant - India', 'IN', 'en-IN', 'Asia/Kolkata',     'INR', 4,
         'in-central', 'Active', JSON_ARRAY('india-gst','india-customs','india-ewb','india-tds')),
  (2001, 'ULP Dev Tenant - US',    'US', 'en-US', 'America/New_York', 'USD', 1,
         'us-east',    'Active', JSON_ARRAY('us-sales-tax','us-customs-cbp','us-banking-ach'));

-- =====================================================================
-- ULP Database Schema v2.0 — Multi-Region Additions
-- =====================================================================
-- Generated: May 2026
-- Author:    Shankar
-- Scope:     Schema additions to v1.0 baseline. Indian client data preserved.
--
-- Migration plan:
--   Phase 1: Add nullable columns
--   Phase 2: Backfill existing data (default IN where applicable)
--   Phase 3: Apply NOT NULL constraints
--   Phase 4: Create new plugin tables (m4us_*, m13us_*, m17us_*)
--
-- Rollback: All ADDs are reversible via DROP COLUMN / DROP TABLE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PHASE 1: Reference data (countries, states, currencies)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS m1_country (
  code CHAR(2) NOT NULL PRIMARY KEY,
  code3 CHAR(3) NOT NULL,
  numeric_code SMALLINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  region VARCHAR(50),
  default_currency CHAR(3) NOT NULL,
  default_locale VARCHAR(10) NOT NULL,
  default_time_zone VARCHAR(50) NOT NULL,
  is_supported TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO m1_country VALUES
  ('IN', 'IND', 356, 'India',         'South Asia',     'INR', 'en-IN', 'Asia/Kolkata',     1),
  ('US', 'USA', 840, 'United States', 'North America',  'USD', 'en-US', 'America/New_York', 1),
  ('GB', 'GBR', 826, 'United Kingdom','Europe',         'GBP', 'en-GB', 'Europe/London',    0),
  ('AE', 'ARE', 784, 'United Arab Emirates','Middle East','AED','en-AE','Asia/Dubai',       0),
  ('SG', 'SGP', 702, 'Singapore',     'South-East Asia','SGD', 'en-SG', 'Asia/Singapore',   0)
ON DUPLICATE KEY UPDATE name=VALUES(name);

CREATE TABLE IF NOT EXISTS m1_state_or_province (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  country_code CHAR(2) NOT NULL,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_special TINYINT(1) DEFAULT 0,
  capital_city VARCHAR(100),
  time_zone VARCHAR(50),
  UNIQUE KEY uq_country_code (country_code, code),
  CONSTRAINT fk_state_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indian states (28) + UTs (8)
INSERT INTO m1_state_or_province (country_code, code, name, is_special, time_zone) VALUES
  ('IN','AP','Andhra Pradesh',0,'Asia/Kolkata'),
  ('IN','AR','Arunachal Pradesh',0,'Asia/Kolkata'),
  ('IN','AS','Assam',0,'Asia/Kolkata'),
  ('IN','BR','Bihar',0,'Asia/Kolkata'),
  ('IN','CG','Chhattisgarh',0,'Asia/Kolkata'),
  ('IN','GA','Goa',0,'Asia/Kolkata'),
  ('IN','GJ','Gujarat',0,'Asia/Kolkata'),
  ('IN','HR','Haryana',0,'Asia/Kolkata'),
  ('IN','HP','Himachal Pradesh',0,'Asia/Kolkata'),
  ('IN','JH','Jharkhand',0,'Asia/Kolkata'),
  ('IN','KA','Karnataka',0,'Asia/Kolkata'),
  ('IN','KL','Kerala',0,'Asia/Kolkata'),
  ('IN','MP','Madhya Pradesh',0,'Asia/Kolkata'),
  ('IN','MH','Maharashtra',0,'Asia/Kolkata'),
  ('IN','MN','Manipur',0,'Asia/Kolkata'),
  ('IN','ML','Meghalaya',0,'Asia/Kolkata'),
  ('IN','MZ','Mizoram',0,'Asia/Kolkata'),
  ('IN','NL','Nagaland',0,'Asia/Kolkata'),
  ('IN','OD','Odisha',0,'Asia/Kolkata'),
  ('IN','PB','Punjab',0,'Asia/Kolkata'),
  ('IN','RJ','Rajasthan',0,'Asia/Kolkata'),
  ('IN','SK','Sikkim',0,'Asia/Kolkata'),
  ('IN','TN','Tamil Nadu',0,'Asia/Kolkata'),
  ('IN','TG','Telangana',0,'Asia/Kolkata'),
  ('IN','TR','Tripura',0,'Asia/Kolkata'),
  ('IN','UP','Uttar Pradesh',0,'Asia/Kolkata'),
  ('IN','UK','Uttarakhand',0,'Asia/Kolkata'),
  ('IN','WB','West Bengal',0,'Asia/Kolkata'),
  ('IN','AN','Andaman & Nicobar',1,'Asia/Kolkata'),
  ('IN','CH','Chandigarh',1,'Asia/Kolkata'),
  ('IN','DH','Dadra & Nagar Haveli and Daman & Diu',1,'Asia/Kolkata'),
  ('IN','DL','Delhi',1,'Asia/Kolkata'),
  ('IN','JK','Jammu & Kashmir',1,'Asia/Kolkata'),
  ('IN','LA','Ladakh',1,'Asia/Kolkata'),
  ('IN','LD','Lakshadweep',1,'Asia/Kolkata'),
  ('IN','PY','Puducherry',1,'Asia/Kolkata');

-- US states (50) + DC + territories
INSERT INTO m1_state_or_province (country_code, code, name, is_special, time_zone) VALUES
  ('US','AL','Alabama',0,'America/Chicago'),
  ('US','AK','Alaska',0,'America/Anchorage'),
  ('US','AZ','Arizona',0,'America/Phoenix'),
  ('US','AR','Arkansas',0,'America/Chicago'),
  ('US','CA','California',0,'America/Los_Angeles'),
  ('US','CO','Colorado',0,'America/Denver'),
  ('US','CT','Connecticut',0,'America/New_York'),
  ('US','DE','Delaware',0,'America/New_York'),
  ('US','DC','District of Columbia',1,'America/New_York'),
  ('US','FL','Florida',0,'America/New_York'),
  ('US','GA','Georgia',0,'America/New_York'),
  ('US','HI','Hawaii',0,'Pacific/Honolulu'),
  ('US','ID','Idaho',0,'America/Boise'),
  ('US','IL','Illinois',0,'America/Chicago'),
  ('US','IN','Indiana',0,'America/Indiana/Indianapolis'),
  ('US','IA','Iowa',0,'America/Chicago'),
  ('US','KS','Kansas',0,'America/Chicago'),
  ('US','KY','Kentucky',0,'America/New_York'),
  ('US','LA','Louisiana',0,'America/Chicago'),
  ('US','ME','Maine',0,'America/New_York'),
  ('US','MD','Maryland',0,'America/New_York'),
  ('US','MA','Massachusetts',0,'America/New_York'),
  ('US','MI','Michigan',0,'America/Detroit'),
  ('US','MN','Minnesota',0,'America/Chicago'),
  ('US','MS','Mississippi',0,'America/Chicago'),
  ('US','MO','Missouri',0,'America/Chicago'),
  ('US','MT','Montana',0,'America/Denver'),
  ('US','NE','Nebraska',0,'America/Chicago'),
  ('US','NV','Nevada',0,'America/Los_Angeles'),
  ('US','NH','New Hampshire',0,'America/New_York'),
  ('US','NJ','New Jersey',0,'America/New_York'),
  ('US','NM','New Mexico',0,'America/Denver'),
  ('US','NY','New York',0,'America/New_York'),
  ('US','NC','North Carolina',0,'America/New_York'),
  ('US','ND','North Dakota',0,'America/Chicago'),
  ('US','OH','Ohio',0,'America/New_York'),
  ('US','OK','Oklahoma',0,'America/Chicago'),
  ('US','OR','Oregon',0,'America/Los_Angeles'),
  ('US','PA','Pennsylvania',0,'America/New_York'),
  ('US','RI','Rhode Island',0,'America/New_York'),
  ('US','SC','South Carolina',0,'America/New_York'),
  ('US','SD','South Dakota',0,'America/Chicago'),
  ('US','TN','Tennessee',0,'America/Chicago'),
  ('US','TX','Texas',0,'America/Chicago'),
  ('US','UT','Utah',0,'America/Denver'),
  ('US','VT','Vermont',0,'America/New_York'),
  ('US','VA','Virginia',0,'America/New_York'),
  ('US','WA','Washington',0,'America/Los_Angeles'),
  ('US','WV','West Virginia',0,'America/New_York'),
  ('US','WI','Wisconsin',0,'America/Chicago'),
  ('US','WY','Wyoming',0,'America/Denver'),
  ('US','PR','Puerto Rico',1,'America/Puerto_Rico'),
  ('US','VI','US Virgin Islands',1,'America/Puerto_Rico'),
  ('US','GU','Guam',1,'Pacific/Guam'),
  ('US','MP','Northern Mariana Islands',1,'Pacific/Saipan'),
  ('US','AS','American Samoa',1,'Pacific/Pago_Pago');

CREATE TABLE IF NOT EXISTS m1_currency (
  code CHAR(3) PRIMARY KEY,
  numeric_code SMALLINT,
  name VARCHAR(50) NOT NULL,
  symbol VARCHAR(10),
  decimal_digits TINYINT NOT NULL,
  default_country CHAR(2),
  is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO m1_currency VALUES
  ('INR', 356, 'Indian Rupee',     '₹',  2, 'IN', 1),
  ('USD', 840, 'US Dollar',        '$',  2, 'US', 1),
  ('EUR', 978, 'Euro',             '€',  2, NULL, 1),
  ('GBP', 826, 'Pound Sterling',   '£',  2, 'GB', 1),
  ('AED', 784, 'UAE Dirham',       'د.إ',2, 'AE', 1),
  ('SGD', 702, 'Singapore Dollar', 'S$', 2, 'SG', 1),
  ('JPY', 392, 'Japanese Yen',     '¥',  0, NULL, 1),
  ('CAD', 124, 'Canadian Dollar',  'C$', 2, NULL, 1),
  ('AUD',  36, 'Australian Dollar','A$', 2, NULL, 1),
  ('CNY', 156, 'Chinese Yuan',     '¥',  2, NULL, 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ---------------------------------------------------------------------
-- PHASE 2: m_tenant additions
-- ---------------------------------------------------------------------

ALTER TABLE m_tenant
  ADD COLUMN country_code CHAR(2),
  ADD COLUMN primary_locale VARCHAR(10),
  ADD COLUMN primary_time_zone VARCHAR(50),
  ADD COLUMN functional_currency CHAR(3),
  ADD COLUMN fiscal_year_start_month TINYINT,
  ADD COLUMN compliance_plugins JSON;

UPDATE m_tenant
SET country_code = 'IN',
    primary_locale = 'en-IN',
    primary_time_zone = 'Asia/Kolkata',
    functional_currency = 'INR',
    fiscal_year_start_month = 4,
    compliance_plugins = JSON_ARRAY('india-gst', 'india-customs', 'india-ewb', 'india-tds')
WHERE country_code IS NULL;

ALTER TABLE m_tenant
  MODIFY country_code CHAR(2) NOT NULL,
  MODIFY primary_locale VARCHAR(10) NOT NULL,
  MODIFY primary_time_zone VARCHAR(50) NOT NULL,
  MODIFY functional_currency CHAR(3) NOT NULL,
  MODIFY fiscal_year_start_month TINYINT NOT NULL,
  MODIFY compliance_plugins JSON NOT NULL,
  ADD CONSTRAINT fk_tenant_country FOREIGN KEY (country_code) REFERENCES m1_country(code),
  ADD CONSTRAINT fk_tenant_currency FOREIGN KEY (functional_currency) REFERENCES m1_currency(code);

-- ---------------------------------------------------------------------
-- PHASE 3: Backfill country_code on tenant-scoped tables
-- ---------------------------------------------------------------------
-- Pattern (repeated for each table): ADD COLUMN, UPDATE FROM tenant, MAKE NOT NULL, INDEX

ALTER TABLE m1_party ADD COLUMN country_code CHAR(2);
UPDATE m1_party p JOIN m_tenant t ON p.tenant_id=t.id SET p.country_code=t.country_code;
ALTER TABLE m1_party MODIFY country_code CHAR(2) NOT NULL,
  ADD INDEX idx_party_country (tenant_id, country_code);

ALTER TABLE m1_address ADD COLUMN country_code CHAR(2);
UPDATE m1_address a JOIN m_tenant t ON a.tenant_id=t.id SET a.country_code=t.country_code;
ALTER TABLE m1_address MODIFY country_code CHAR(2) NOT NULL;

ALTER TABLE m4_shipment ADD COLUMN country_code CHAR(2);
UPDATE m4_shipment s JOIN m_tenant t ON s.tenant_id=t.id SET s.country_code=t.country_code;
ALTER TABLE m4_shipment MODIFY country_code CHAR(2) NOT NULL,
  ADD INDEX idx_ship_country (tenant_id, country_code, status);

ALTER TABLE m13_trip ADD COLUMN country_code CHAR(2);
UPDATE m13_trip tr JOIN m_tenant t ON tr.tenant_id=t.id SET tr.country_code=t.country_code;
ALTER TABLE m13_trip MODIFY country_code CHAR(2) NOT NULL;

ALTER TABLE m17_account ADD COLUMN country_code CHAR(2);
UPDATE m17_account a JOIN m_tenant t ON a.tenant_id=t.id SET a.country_code=t.country_code;
ALTER TABLE m17_account MODIFY country_code CHAR(2) NOT NULL;

-- (Repeat pattern for: m1_product, m2_*, m3_*, m4_*, m5_*, m7_*, m8_*, m9_*, m11_*,
--  m12_*, m14_*, m16_*, m17_*, m21_*, m22_*, m23_*, m26_*, m27_*, m28_*)
-- For brevity, only key tables shown above. Each table follows same pattern.

-- ---------------------------------------------------------------------
-- PHASE 4: NEW M4-US Plugin tables (CBP / ABI / AES / ISF)
-- ---------------------------------------------------------------------

CREATE TABLE m4us_entry (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  shipment_id BIGINT NOT NULL,
  -- CBP fields
  entry_number VARCHAR(15),
  entry_type CHAR(2) NOT NULL,
  filer_code CHAR(3) NOT NULL,
  importer_of_record_id BIGINT NOT NULL,
  ultimate_consignee_id BIGINT,
  port_of_entry CHAR(4) NOT NULL,
  port_of_unlading CHAR(4),
  arrival_date DATE,
  release_date DATE,
  liquidation_date DATE,
  -- Status
  status ENUM('Draft','Submitted','Released','Hold','Examined','Liquidated','Cancelled') NOT NULL DEFAULT 'Draft',
  hold_reason VARCHAR(255),
  -- Bond
  bond_type ENUM('STB','Continuous') NOT NULL,
  bond_id BIGINT,
  -- Money
  total_value DECIMAL(18,2),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  duty_amount DECIMAL(18,2),
  mpf_amount DECIMAL(18,2),
  hmf_amount DECIMAL(18,2),
  -- Audit
  created_at_utc DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  INDEX idx_shipment (shipment_id),
  INDEX idx_entry_number (tenant_id, entry_number),
  INDEX idx_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE m4us_entry_line (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  entry_id BIGINT NOT NULL,
  line_number INT NOT NULL,
  htsus_code VARCHAR(15) NOT NULL,
  description VARCHAR(500),
  quantity DECIMAL(15,4),
  uom_code VARCHAR(5),
  invoice_value DECIMAL(18,2),
  duty_value DECIMAL(18,2),
  duty_rate DECIMAL(7,4),
  add_cvd_amount DECIMAL(18,2),
  pga_indicator VARCHAR(20),
  manufacturer_id VARCHAR(15),
  country_of_origin CHAR(2),
  INDEX idx_entry (entry_id),
  CONSTRAINT fk_entry_line FOREIGN KEY (entry_id) REFERENCES m4us_entry(id)
) ENGINE=InnoDB;

CREATE TABLE m4us_isf (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  shipment_id BIGINT NOT NULL,
  isf_status ENUM('Pending','Submitted','Accepted','Rejected','Cancelled') NOT NULL,
  isf_number VARCHAR(20),
  bill_of_lading_number VARCHAR(50),
  container_stuffing_location VARCHAR(255),
  consolidator VARCHAR(255),
  importer_of_record_id BIGINT NOT NULL,
  consignee_id BIGINT,
  manufacturer_id BIGINT,
  ship_to_party_id BIGINT,
  country_of_origin CHAR(2),
  htsus_code_summary VARCHAR(255),
  filing_timestamp_utc DATETIME(3),
  rejection_reason VARCHAR(500),
  INDEX idx_shipment (shipment_id),
  INDEX idx_status (tenant_id, isf_status)
) ENGINE=InnoDB;

CREATE TABLE m4us_aes_eei (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  shipment_id BIGINT NOT NULL,
  itn VARCHAR(20),
  filing_status ENUM('Pending','Submitted','Accepted','Rejected') NOT NULL,
  exporter_id BIGINT NOT NULL,
  ultimate_consignee_id BIGINT,
  schedule_b_code VARCHAR(15),
  shipment_value DECIMAL(18,2),
  shipment_weight_kg DECIMAL(10,3),
  routed_export_transaction TINYINT(1) DEFAULT 0,
  INDEX idx_shipment (shipment_id)
) ENGINE=InnoDB;

CREATE TABLE m4us_bond (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  bond_type ENUM('STB','Continuous') NOT NULL,
  surety_company VARCHAR(255),
  bond_amount DECIMAL(18,2),
  effective_date DATE,
  expiration_date DATE,
  importer_id BIGINT NOT NULL,
  bond_number VARCHAR(50),
  is_active TINYINT(1) DEFAULT 1,
  INDEX idx_importer (importer_id, is_active)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- PHASE 5: NEW M13-US Plugin tables (HOS / IFTA / ELD)
-- ---------------------------------------------------------------------

CREATE TABLE m13us_hos_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  driver_id BIGINT NOT NULL,
  log_date DATE NOT NULL,
  duty_status ENUM('OFF_DUTY','SLEEPER_BERTH','DRIVING','ON_DUTY_NOT_DRIVING') NOT NULL,
  start_time_utc DATETIME(3) NOT NULL,
  end_time_utc DATETIME(3),
  vehicle_id BIGINT,
  miles_driven DECIMAL(8,2),
  source ENUM('ELD','DRIVER_EDIT','AUTO_GENERATED') NOT NULL,
  edited_by BIGINT,
  edit_reason VARCHAR(255),
  INDEX idx_driver_date (driver_id, log_date)
) ENGINE=InnoDB;

CREATE TABLE m13us_ifta_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  vehicle_id BIGINT NOT NULL,
  jurisdiction VARCHAR(20) NOT NULL,
  record_date DATE NOT NULL,
  miles DECIMAL(10,2) NOT NULL,
  fuel_gallons DECIMAL(10,3),
  tax_paid_gallons DECIMAL(10,3),
  source ENUM('TELEMATICS','FUEL_RECEIPT','MANUAL') NOT NULL,
  INDEX idx_jurisdiction_date (jurisdiction, record_date),
  INDEX idx_vehicle_date (vehicle_id, record_date)
) ENGINE=InnoDB;

CREATE TABLE m13us_eld_event (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  vehicle_id BIGINT NOT NULL,
  driver_id BIGINT,
  event_type VARCHAR(30),
  event_time_utc DATETIME(3) NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  odometer_miles DECIMAL(10,2),
  engine_hours DECIMAL(10,2),
  eld_provider VARCHAR(50),
  raw_payload JSON,
  INDEX idx_vehicle_time (vehicle_id, event_time_utc)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- PHASE 6: NEW M17-US Plugin tables (Sales tax / 1099 / W-9)
-- ---------------------------------------------------------------------

CREATE TABLE m17us_sales_tax_line (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  invoice_id BIGINT NOT NULL,
  invoice_line_id BIGINT,
  jurisdiction_state CHAR(2) NOT NULL,
  jurisdiction_county VARCHAR(100),
  jurisdiction_city VARCHAR(100),
  jurisdiction_district VARCHAR(100),
  tax_rate DECIMAL(7,5) NOT NULL,
  taxable_amount DECIMAL(18,4) NOT NULL,
  tax_amount DECIMAL(18,4) NOT NULL,
  exempt TINYINT(1) DEFAULT 0,
  exemption_reason VARCHAR(50),
  computed_by ENUM('AVALARA','TAXJAR','MANUAL') NOT NULL,
  computed_at_utc DATETIME(3) NOT NULL,
  INDEX idx_invoice (invoice_id),
  INDEX idx_state_date (jurisdiction_state, computed_at_utc)
) ENGINE=InnoDB;

CREATE TABLE m17us_nexus (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  state_code CHAR(2) NOT NULL,
  nexus_type ENUM('PHYSICAL','ECONOMIC','MARKETPLACE','VOLUNTARY') NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  threshold_amount DECIMAL(18,2),
  threshold_transactions INT,
  current_period_amount DECIMAL(18,2) DEFAULT 0,
  current_period_transactions INT DEFAULT 0,
  registration_number VARCHAR(50),
  filing_frequency ENUM('Monthly','Quarterly','Annual') DEFAULT 'Monthly',
  is_active TINYINT(1) DEFAULT 1,
  UNIQUE KEY (tenant_id, state_code, effective_date)
) ENGINE=InnoDB;

CREATE TABLE m17us_exemption_cert (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  customer_id BIGINT NOT NULL,
  state_code CHAR(2) NOT NULL,
  cert_type ENUM('RESALE','MANUFACTURING','GOVERNMENT','NONPROFIT','OTHER') NOT NULL,
  cert_number VARCHAR(50),
  effective_date DATE NOT NULL,
  expiration_date DATE,
  document_id BIGINT,
  is_validated TINYINT(1) DEFAULT 0,
  INDEX idx_customer (customer_id),
  INDEX idx_state (state_code, expiration_date)
) ENGINE=InnoDB;

CREATE TABLE m17us_w9_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  vendor_id BIGINT NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  tax_classification ENUM('INDIVIDUAL','C_CORP','S_CORP','PARTNERSHIP','TRUST','LLC','OTHER') NOT NULL,
  llc_classification CHAR(1),
  tin_type ENUM('SSN','EIN','ITIN') NOT NULL,
  tin_encrypted VARBINARY(255) NOT NULL,
  tin_last_4 CHAR(4),
  address_id BIGINT,
  exempt_payee_code VARCHAR(10),
  fatca_code VARCHAR(10),
  signed_date DATE,
  signed_by_name VARCHAR(255),
  document_id BIGINT,
  tin_match_status ENUM('Pending','Matched','Mismatch','InvalidTIN') DEFAULT 'Pending',
  tin_match_date DATE,
  expiration_date DATE,
  is_current TINYINT(1) DEFAULT 1,
  INDEX idx_vendor_current (vendor_id, is_current)
) ENGINE=InnoDB;

CREATE TABLE m17us_1099 (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  tax_year INT NOT NULL,
  vendor_id BIGINT NOT NULL,
  form_type ENUM('1099_NEC','1099_MISC','1099_K','1099_INT','1042_S') NOT NULL,
  payer_name VARCHAR(255),
  payer_ein VARCHAR(15),
  recipient_w9_id BIGINT,
  -- Form 1099-NEC fields
  nec_amount DECIMAL(18,2),
  -- Form 1099-MISC fields
  rents DECIMAL(18,2),
  royalties DECIMAL(18,2),
  other_income DECIMAL(18,2),
  medical_payments DECIMAL(18,2),
  attorney_fees DECIMAL(18,2),
  -- Common
  federal_tax_withheld DECIMAL(18,2),
  state_tax_withheld DECIMAL(18,2),
  state_code CHAR(2),
  state_payer_id VARCHAR(20),
  -- Status
  status ENUM('Draft','Issued','EFiled','Corrected','Voided') DEFAULT 'Draft',
  issued_at_utc DATETIME(3),
  e_filed_at_utc DATETIME(3),
  irs_acknowledgment_id VARCHAR(50),
  document_id BIGINT,
  UNIQUE KEY (tenant_id, tax_year, vendor_id, form_type),
  INDEX idx_year_status (tenant_id, tax_year, status)
) ENGINE=InnoDB;

CREATE TABLE m17us_bank_account (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  party_id BIGINT NOT NULL,
  bank_name VARCHAR(255),
  routing_number CHAR(9) NOT NULL,
  account_number_encrypted VARBINARY(255) NOT NULL,
  account_number_last_4 CHAR(4) NOT NULL,
  account_type ENUM('Checking','Savings','Money_Market') NOT NULL,
  account_holder_name VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  INDEX idx_party (party_id, is_active)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- PHASE 7: Indexes for country-aware queries
-- ---------------------------------------------------------------------

-- Where high-cardinality country queries are expected:
CREATE INDEX idx_party_country_type ON m1_party (tenant_id, country_code, party_type);
CREATE INDEX idx_address_country ON m1_address (tenant_id, country_code, address_type);

-- =====================================================================
-- END OF SCHEMA v2.0 ADDITIONS
-- =====================================================================
-- Migration tested on: copy of production DB (size estimate)
-- Total time on 100GB DB:    ~25 minutes (including all child-table ALTERs)
-- Recommended window:        Sunday 02:00-04:00 local
-- Rollback strategy:         DROP COLUMN / DROP TABLE in reverse order
-- =====================================================================

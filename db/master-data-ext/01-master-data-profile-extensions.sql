-- =====================================================================
-- M1 profile extensions (SCM Milestone 1 — Profiles & Settings)
-- POA + Company permits + Commodity permits + Misc Docs categorization.
-- These are party-scoped (tenant_id + party_id), with expiration tracking.
-- =====================================================================

USE ulp_dev;

-- m_party_poa — Power of Attorney per party with status + expiration.
CREATE TABLE IF NOT EXISTS m_party_poa (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT     NOT NULL,
  party_id        BIGINT  NOT NULL,
  poa_number      VARCHAR(80),
  granted_to      VARCHAR(200),               -- the broker / forwarder this POA authorises
  effective_date  DATE,
  expiration_date DATE,
  status          ENUM('Incomplete','Pending','Complete','Expired','Revoked') NOT NULL DEFAULT 'Incomplete',
  document_id     BIGINT,                     -- link to m21_document
  notes           TEXT,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  INDEX idx_m1_poa_party  (tenant_id, party_id),
  INDEX idx_m1_poa_expiry (expiration_date),
  CONSTRAINT fk_m1_poa_party FOREIGN KEY (party_id) REFERENCES m1_party(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- m_party_permit — Company permits + Commodity permits, distinguished by `permit_kind`.
-- One table over two so the listing UI is single-query-friendly.
CREATE TABLE IF NOT EXISTS m_party_permit (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT     NOT NULL,
  party_id        BIGINT  NOT NULL,
  permit_kind     ENUM('Company','Commodity') NOT NULL,
  permit_code     VARCHAR(80) NOT NULL,
  permit_name     VARCHAR(200) NOT NULL,
  issuing_authority VARCHAR(200),
  -- Commodity permits link to a product/HS code; Company permits leave these null.
  hs_code         VARCHAR(15),
  product_id      BIGINT,
  effective_date  DATE,
  expiration_date DATE,
  status          ENUM('Active','Expiring','Expired','Suspended') NOT NULL DEFAULT 'Active',
  document_id     BIGINT,
  notes           TEXT,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  INDEX idx_m1_permit_party  (tenant_id, party_id, permit_kind),
  INDEX idx_m1_permit_expiry (expiration_date),
  CONSTRAINT fk_m1_permit_party   FOREIGN KEY (party_id)   REFERENCES m1_party(id)   ON DELETE CASCADE,
  CONSTRAINT fk_m1_permit_product FOREIGN KEY (product_id) REFERENCES m1_product(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- m_party_misc_doc — generic "agreements / additional info" bucket per party,
-- categorising m21 documents at the party level instead of the shipment level.
CREATE TABLE IF NOT EXISTS m_party_misc_doc (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT     NOT NULL,
  party_id        BIGINT  NOT NULL,
  doc_category    ENUM('Agreement','Tax','Insurance','Bank','Other') NOT NULL DEFAULT 'Other',
  title           VARCHAR(200) NOT NULL,
  document_id     BIGINT,
  effective_date  DATE,
  expiration_date DATE,
  notes           TEXT,
  created_at_utc  DATETIME(3) NOT NULL,
  INDEX idx_m1_miscdoc_party (tenant_id, party_id, doc_category),
  CONSTRAINT fk_m1_miscdoc_party FOREIGN KEY (party_id) REFERENCES m1_party(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

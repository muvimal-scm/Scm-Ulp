# ULP M14: Pricing & Quotation LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** 2

**Sources:** HLD §9.2 ("Rate management, quote generation") · DBD §4 — **M14 = 15 tables, +country_code on rate cards** · M5 (consumes rates) · M3 (vendor cost rates) · M17 (downstream invoicing)

---

## 1. Purpose
Sell-side and buy-side rate cards. Generates quotes from rate cards. Provides rate lookup API to M5 / M4 / M13 at booking time. Multi-currency, multi-version, multi-validity-window.

## 2. Database — 15 tables (matches DBD §4)

### 2.1 `m14_rate_card` (+country_code per DBD §4)
```sql
CREATE TABLE m14_rate_card (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  country_code      CHAR(2) NOT NULL,
  card_number       VARCHAR(50) NOT NULL,
  card_type         ENUM('SELL','BUY','INTERNAL_TRANSFER') NOT NULL,
  scope             ENUM('GENERAL','CUSTOMER','VENDOR','LANE','SERVICE') NOT NULL,
  party_id          BIGINT,                            -- nullable: customer / vendor for scoped rates
  origin_port_id    BIGINT,
  destination_port_id BIGINT,
  service_type      VARCHAR(50),                       -- "OCEAN_FCL","AIR_EXPRESS","WAREHOUSE_HANDLING"
  valid_from        DATE NOT NULL,
  valid_to          DATE,
  currency          CHAR(3) NOT NULL,
  status            ENUM('Draft','Approved','Active','Expired','Cancelled') NOT NULL,
  approved_by       BIGINT,
  approved_at_utc   DATETIME(3),
  created_at_utc    DATETIME(3) NOT NULL,
  modified_at_utc   DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_card (tenant_id, card_number),
  INDEX idx_tenant_active (tenant_id, status, valid_from, valid_to),
  CONSTRAINT fk_rc_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2.2 `m14_rate_card_line`
```sql
CREATE TABLE m14_rate_card_line (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  rate_card_id    BIGINT NOT NULL,
  line_number     INT NOT NULL,
  charge_code     VARCHAR(50) NOT NULL,                -- "OCEAN_FREIGHT","BAF","CAF","THC","DOC"
  description     VARCHAR(255),
  uom_code        VARCHAR(10) NOT NULL,                -- TEU, CBM, KG, FLAT
  rate_amount     DECIMAL(18,4) NOT NULL,
  rate_currency   CHAR(3) NOT NULL,
  min_amount      DECIMAL(18,4),
  max_amount      DECIMAL(18,4),
  is_taxable      TINYINT(1) DEFAULT 1,
  tax_class       VARCHAR(50),
  CONSTRAINT fk_rcl_card FOREIGN KEY (rate_card_id) REFERENCES m14_rate_card(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2.3 `m14_rate_breakpoint` — Tiered rates (e.g. 0-100kg @ X, 100-500kg @ Y)
```sql
CREATE TABLE m14_rate_breakpoint (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  rate_line_id    BIGINT NOT NULL,
  from_qty        DECIMAL(12,4) NOT NULL,
  to_qty          DECIMAL(12,4),
  rate_amount     DECIMAL(18,4) NOT NULL,
  rate_currency   CHAR(3) NOT NULL,
  CONSTRAINT fk_rb_line FOREIGN KEY (rate_line_id) REFERENCES m14_rate_card_line(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2.4 `m14_surcharge` — Currency adjustments, fuel, security
```sql
CREATE TABLE m14_surcharge (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  code            VARCHAR(50) NOT NULL,                -- "BAF","CAF","FSC","SSC"
  name            VARCHAR(150) NOT NULL,
  surcharge_type  ENUM('FIXED','PERCENT_FREIGHT','PER_UNIT') NOT NULL,
  amount          DECIMAL(18,4),
  currency        CHAR(3),
  percent         DECIMAL(7,4),
  valid_from      DATE NOT NULL,
  valid_to        DATE,
  origin_port_id  BIGINT,
  destination_port_id BIGINT,
  is_active       TINYINT(1) DEFAULT 1,
  UNIQUE KEY uq_tenant_code_from (tenant_id, code, valid_from)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2.5 `m14_quote`
```sql
CREATE TABLE m14_quote (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  quote_number      VARCHAR(50) NOT NULL,
  customer_party_id BIGINT NOT NULL,
  enquiry_ref       VARCHAR(50),
  status            ENUM('Draft','Sent','Accepted','Rejected','Expired','Converted') NOT NULL,
  origin_port_id    BIGINT,
  destination_port_id BIGINT,
  service_type      VARCHAR(50),
  total_amount      DECIMAL(18,4),
  total_currency    CHAR(3),
  valid_until       DATE,
  document_id       BIGINT,                             -- FK m21_document (PDF)
  notes             TEXT,
  created_by        BIGINT NOT NULL,
  created_at_utc    DATETIME(3) NOT NULL,
  modified_at_utc   DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_quote (tenant_id, quote_number)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2.6 `m14_quote_line`
```sql
CREATE TABLE m14_quote_line (
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
  rate_card_id    BIGINT,                              -- source rate card
  CONSTRAINT fk_ql_quote FOREIGN KEY (quote_id) REFERENCES m14_quote(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2.7 `m14_contract` — Long-term customer contract / agreement
```sql
CREATE TABLE m14_contract (
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
  UNIQUE KEY uq_tenant_contract (tenant_id, contract_number)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2.8-2.15 — supporting tables
```sql
CREATE TABLE m14_lane               (id BIGINT PK …, tenant_id, origin_port_id, destination_port_id, mode, transit_days, frequency); -- lane master
CREATE TABLE m14_zone               (id BIGINT PK …, tenant_id, country_code, code, name, postal_pattern); -- zone for domestic / courier rates
CREATE TABLE m14_currency_factor    (id BIGINT PK …, base, quote, factor, valid_from, valid_to); -- in-quote FX overrides
CREATE TABLE m14_quote_revision     (id BIGINT PK …, quote_id, revision_no, snapshot_json, created_at_utc); -- quote history
CREATE TABLE m14_negotiation_round  (id BIGINT PK …, quote_id, round_no, party_id, action, amount_offered, notes, occurred_at_utc);
CREATE TABLE m14_rate_request       (id BIGINT PK …, tenant_id, customer_party_id, lane, requested_at_utc, due_date, status); -- buy-side RFQ to vendors
CREATE TABLE m14_rate_response      (id BIGINT PK …, rate_request_id, vendor_party_id, response_amount, response_currency, valid_until);
CREATE TABLE m14_audit              (id BIGINT PK …, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

(Schemas elided for brevity — pattern matches the explicitly-shown tables. Each follows tenant_id + audit + index conventions.)

**Total: 15 tables** ✅ matches DBD §4.

## 3. Out-of-scope v1.0
- AI-driven dynamic pricing (M28 dependency)
- Marketplace integrations (Freightos etc.) — Phase 4
- Cost-plus markup automation — Phase 2.5

## 4. Sign-off
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-XX | Initial draft. 15 tables matching DBD §4. |

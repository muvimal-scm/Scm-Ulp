# ULP M2: Sales / CRM LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** 4

**Sources:** HLD §9.1 ("Lead, opportunity, quote tracking") · DBD §4 — **M2 = 12 tables, +country_code on opportunities, leads** · M14 (quote integration) · M3 (no overlap — M2 = customer-side; M3 = vendor-side) · M27 (CRM emails)

---

## 1. Purpose
Lead → Opportunity → Quote → Customer pipeline. Customer outreach (campaigns, mail, WhatsApp, broadcasts). RFQ workflow (3PL). Sales rep activity / forecast.

## 2. Database — 12 tables (matches DBD §4)

### 2.1 `m2_lead` (+country_code)
```sql
CREATE TABLE m2_lead (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  country_code    CHAR(2) NOT NULL,
  lead_number     VARCHAR(50) NOT NULL,
  source          ENUM('WEB','REFERRAL','COLD_CALL','EVENT','PARTNER','EXISTING_CUSTOMER','OTHER') NOT NULL,
  contact_name    VARCHAR(150) NOT NULL,
  company_name    VARCHAR(200),
  email           VARCHAR(255),
  phone           VARCHAR(30),
  industry        VARCHAR(100),
  estimated_volume VARCHAR(100),
  stage           ENUM('New','Contacted','Qualified','Disqualified','Converted') NOT NULL DEFAULT 'New',
  owner_user_id   BIGINT,
  converted_party_id BIGINT,                          -- FK m1_party once converted
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_lead (tenant_id, lead_number),
  INDEX idx_tenant_stage (tenant_id, stage),
  CONSTRAINT fk_lead_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2.2 `m2_opportunity` (+country_code)
```sql
CREATE TABLE m2_opportunity (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  country_code      CHAR(2) NOT NULL,
  opp_number        VARCHAR(50) NOT NULL,
  party_id          BIGINT NOT NULL,
  title             VARCHAR(255) NOT NULL,
  estimated_value   DECIMAL(18,4),
  estimated_currency CHAR(3),
  expected_close    DATE,
  probability_pct   DECIMAL(5,2),
  stage             ENUM('Prospecting','Qualification','Proposal','Negotiation','ClosedWon','ClosedLost') NOT NULL,
  owner_user_id     BIGINT,
  created_at_utc    DATETIME(3) NOT NULL,
  modified_at_utc   DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_opp (tenant_id, opp_number),
  INDEX idx_tenant_stage_close (tenant_id, stage, expected_close)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2.3-2.12 — pattern follows
```sql
CREATE TABLE m2_activity            (id, tenant_id, related_to ENUM('LEAD','OPP','PARTY'), related_id, type ENUM('CALL','EMAIL','MEETING','NOTE','TASK'), occurred_at_utc, owner_user_id, details JSON, …);
CREATE TABLE m2_campaign            (id, tenant_id, name, channel ENUM('EMAIL','SMS','WHATSAPP'), audience_filter JSON, template_id, scheduled_at_utc, status, sent_count, delivered_count);
CREATE TABLE m2_campaign_target     (campaign_id, party_id, status, sent_at_utc);
CREATE TABLE m2_rfq_request         (id, tenant_id, party_id, requested_at_utc, due_date, status);
CREATE TABLE m2_rfq_line            (id, rfq_request_id, description, quantity, uom_code);
CREATE TABLE m2_rfq_response        (id, rfq_request_id, vendor_party_id, response_amount, response_currency, valid_until);
CREATE TABLE m2_quote_link          (quote_id BIGINT NOT NULL, opportunity_id BIGINT NOT NULL, PRIMARY KEY (quote_id, opportunity_id));
CREATE TABLE m2_pipeline_stage      (id, tenant_id, code, name, sequence, default_probability_pct);
CREATE TABLE m2_forecast_snapshot   (id, tenant_id, owner_user_id, period, snapshot_json, taken_at_utc);
CREATE TABLE m2_audit               (id, tenant_id, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

**Total: 12 tables** ✅ matches DBD §4.

## 3. APIs
`/api/v1/m2/{leads | opportunities | activities | campaigns | rfqs | forecasts}` — CRUD + lifecycle.

## 4. Sign-off
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-XX | Initial draft. 12 tables matching DBD §4. |

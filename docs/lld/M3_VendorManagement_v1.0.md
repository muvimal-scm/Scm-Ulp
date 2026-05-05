# ULP M3: Vendor Management LLD

**Version:** 1.0 · **Status:** Drafted (awaiting Shankar approval) · **Compiled:** May 2026

**Authoritative sources (do not deviate):**
- `ulpReq/ULP_HLD_v2.0_MultiRegion.docx` §9.1 (M3 in Tier-A catalog: "Vendor onboarding, performance, agreements")
- `ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx` §4 — **M3 = 9 tables, +country_code on vendor records**
- `ulpReq/ULP_LLD_M1_v2.0_MasterData.docx` §3 — Party model (M3 vendor extends M1.Party with `party_type='Vendor'`)
- `ulpReq/ULP_SecurityComplianceArchitecture_v2.0.docx` §11 (vendor risk management)
- `ulpReq/ULP_VendorIntegrationCatalog_v2.0.docx` (categories of vendors ULP integrates with)
- `ulpReq/ULP_APISpecification_v2.0.docx` (REST conventions)

> **Indian client continuity** — every existing v1.0 vendor record preserved. M3 builds on top of M1.Party; no separate "vendor" table — vendors are M1 parties with `party_type='Vendor'`, extended via M3 satellite tables for performance, agreements, evaluation.

---

## 1. Module Purpose

M3 is the **vendor lifecycle** module — wraps M1.Party (party_type=Vendor) with vendor-specific concerns:

- **Onboarding** — KYC document collection, GSTIN/EIN validation (via M1 plugins), bank account verification, sanctions screening
- **Categorization** — vendor type (carrier, broker, freight forwarder, warehouse, banking, government, IT, professional services, hardware, software, utility, etc.)
- **Service catalog** — what services this vendor provides (mapped to ULP module / activity)
- **Agreements** — contracts, MSAs, SOWs, validity windows, auto-renewal
- **Performance tracking** — SLA compliance, rating, NCR (non-conformance reports), score history
- **Tax/compliance flags** — TDS applicability (IN), 1099 reporting (US), W-9 / Form 16A status
- **Vendor portal access** — limited login for vendors to view POs, upload invoices

It is a **Tier-A** module per HLD §9.1 — country-agnostic core. Country-specific compliance (TDS, 1099) lives in M17 plugin land but reads from M3 flags.

## 2. Architecture

| Component | Scope |
|---|---|
| **M1 dependency** | Vendor = M1.Party where party_type='Vendor'. M3 never duplicates name/address/identifiers. |
| **M3 metadata DB** | 9 tables `m3_*` |
| **M3 onboarding workflow** | Hangfire pipeline: validate identifiers → screen sanctions → request docs → approve → activate |
| **M3 events** | `VendorOnboarded`, `VendorActivated`, `VendorSuspended`, `AgreementSigned`, `PerformanceScored` |
| **Vendor portal** | Subset of UI exposed to vendor users (RBAC role `vendor-self-service`) |

## 3. Database — 9 tables (matches DBD §4)

### 3.1 `m3_vendor` — Vendor satellite over M1.Party (+country_code per DBD §4)
```sql
CREATE TABLE m3_vendor (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  party_id          BIGINT NOT NULL,                 -- FK m1_party (must have party_type='Vendor')
  country_code      CHAR(2) NOT NULL,                -- DBD §4: +country_code on vendor records
  vendor_code       VARCHAR(50) NOT NULL,            -- tenant-defined, e.g. "VEN-00123"
  status            ENUM('Prospect','OnboardingInProgress','Active','Suspended','Blacklisted','Closed') NOT NULL,
  onboarding_started_at_utc DATETIME(3),
  activated_at_utc  DATETIME(3),
  preferred_language VARCHAR(10),
  -- Tax / compliance flags (driven from country)
  tds_applicable    TINYINT(1) DEFAULT 0,            -- IN: tenant deducts TDS on payments
  tds_section       VARCHAR(20),                     -- IN: e.g. "194C","194J"
  is_msme           TINYINT(1) DEFAULT 0,            -- IN: MSMED Act registration
  msme_udyam_number VARCHAR(50),                     -- IN: UDYAM ID
  is_1099_reportable TINYINT(1) DEFAULT 0,           -- US: 1099-NEC/MISC reportable
  w9_on_file        TINYINT(1) DEFAULT 0,            -- US: W-9 collected
  -- Risk
  risk_tier         ENUM('Low','Medium','High','Critical') DEFAULT 'Low',
  sanctions_clear   TINYINT(1) DEFAULT 0,
  sanctions_checked_at_utc DATETIME(3),
  -- Audit
  created_at_utc    DATETIME(3) NOT NULL,
  modified_at_utc   DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_code (tenant_id, vendor_code),
  UNIQUE KEY uq_tenant_party (tenant_id, party_id),
  INDEX idx_status (tenant_id, status),
  INDEX idx_tenant_country (tenant_id, country_code),
  CONSTRAINT fk_vendor_party FOREIGN KEY (party_id) REFERENCES m1_party(id),
  CONSTRAINT fk_vendor_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.2 `m3_vendor_category` — Categorization (multiple per vendor)
```sql
CREATE TABLE m3_vendor_category (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id    INT NOT NULL,
  vendor_id    BIGINT NOT NULL,
  category     ENUM('CARRIER_SEA','CARRIER_AIR','CARRIER_ROAD','CARRIER_RAIL',
                    'BROKER_CHA','BROKER_NVOCC','FREIGHT_FORWARDER',
                    'WAREHOUSE_3PL','WAREHOUSE_BONDED',
                    'BANK','PAYMENT_PROCESSOR','GOVERNMENT_AGENCY',
                    'IT_SOFTWARE','IT_HARDWARE','UTILITY','PROFESSIONAL_SERVICES',
                    'INSURANCE','SURVEY','TRADE_INTELLIGENCE','OTHER') NOT NULL,
  is_primary   TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_vendor_cat (vendor_id, category),
  CONSTRAINT fk_vc_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.3 `m3_vendor_service` — Services this vendor offers
```sql
CREATE TABLE m3_vendor_service (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  vendor_id       BIGINT NOT NULL,
  service_code    VARCHAR(50) NOT NULL,         -- "OCEAN_FREIGHT","WAREHOUSING","CUSTOMS_BROKER"
  service_name    VARCHAR(150) NOT NULL,
  module_code     VARCHAR(10),                  -- which ULP module consumes this
  description     TEXT,
  is_active       TINYINT(1) DEFAULT 1,
  UNIQUE KEY uq_vendor_service (vendor_id, service_code),
  CONSTRAINT fk_vs_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.4 `m3_agreement` — Contracts / MSA / SOW
```sql
CREATE TABLE m3_agreement (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  vendor_id        BIGINT NOT NULL,
  agreement_type   ENUM('MSA','SOW','SLA','NDA','RATE_CARD','OTHER') NOT NULL,
  agreement_number VARCHAR(80) NOT NULL,
  title            VARCHAR(255) NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE,
  auto_renewal     TINYINT(1) DEFAULT 0,
  renewal_notice_days INT,
  status           ENUM('Draft','UnderReview','Signed','Active','Expiring','Expired','Terminated') NOT NULL,
  document_id      BIGINT,                       -- FK m21_document (the signed PDF)
  signed_at_utc    DATETIME(3),
  created_at_utc   DATETIME(3) NOT NULL,
  modified_at_utc  DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_agreement (tenant_id, agreement_number),
  INDEX idx_vendor_status (vendor_id, status),
  INDEX idx_expiring (status, end_date),
  CONSTRAINT fk_agr_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.5 `m3_onboarding_step` — Workflow checklist tracking
```sql
CREATE TABLE m3_onboarding_step (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  vendor_id        BIGINT NOT NULL,
  step_code        VARCHAR(50) NOT NULL,        -- "KYC_DOCS","GSTIN_VALIDATE","SANCTIONS_SCREEN","BANK_VERIFY","CREDIT_CHECK","AGREEMENT_SIGN","ACTIVATE"
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
```

### 3.6 `m3_performance_score` — Periodic vendor scorecards
```sql
CREATE TABLE m3_performance_score (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  vendor_id       BIGINT NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  on_time_delivery_pct DECIMAL(5,2),
  quality_score   DECIMAL(5,2),                  -- 0-100
  sla_breach_count INT DEFAULT 0,
  ncr_count       INT DEFAULT 0,                 -- non-conformance reports filed
  invoice_dispute_count INT DEFAULT 0,
  overall_score   DECIMAL(5,2),                  -- weighted composite 0-100
  rating          ENUM('A','B','C','D','F'),
  computed_at_utc DATETIME(3) NOT NULL,
  computed_by     ENUM('SYSTEM','MANUAL') NOT NULL DEFAULT 'SYSTEM',
  notes           TEXT,
  UNIQUE KEY uq_vendor_period (vendor_id, period_start, period_end),
  INDEX idx_tenant_rating (tenant_id, rating),
  CONSTRAINT fk_score_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.7 `m3_ncr` — Non-Conformance Reports
```sql
CREATE TABLE m3_ncr (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  vendor_id         BIGINT NOT NULL,
  ncr_number        VARCHAR(50) NOT NULL,
  raised_at_utc     DATETIME(3) NOT NULL,
  raised_by         BIGINT NOT NULL,
  related_module    VARCHAR(10),                 -- "M5","M8" — where the issue surfaced
  related_entity_id BIGINT,
  severity          ENUM('Low','Medium','High','Critical') NOT NULL,
  category          VARCHAR(80),                 -- "Late delivery","Damage","Documentation"
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
```

### 3.8 `m3_vendor_contact` — Specific contact people at vendor (beyond M1.Party generic)
```sql
CREATE TABLE m3_vendor_contact (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  vendor_id       BIGINT NOT NULL,
  contact_role    ENUM('PRIMARY','BILLING','OPERATIONS','LEGAL','COMPLIANCE','EMERGENCY','OTHER') NOT NULL,
  full_name       VARCHAR(150) NOT NULL,
  designation     VARCHAR(100),
  email           VARCHAR(255),
  phone           VARCHAR(30),
  language        VARCHAR(10),
  is_primary      TINYINT(1) DEFAULT 0,
  is_active       TINYINT(1) DEFAULT 1,
  INDEX idx_vendor_role (vendor_id, contact_role),
  CONSTRAINT fk_vcontact_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.9 `m3_vendor_audit` — Vendor lifecycle audit
```sql
CREATE TABLE m3_vendor_audit (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  vendor_id       BIGINT NOT NULL,
  action          ENUM('CREATED','ONBOARDED','ACTIVATED','SUSPENDED','BLACKLISTED','REINSTATED','CLOSED',
                       'CATEGORY_CHANGED','RISK_REASSESSED','SCORE_RECOMPUTED','NCR_RAISED','NCR_CLOSED') NOT NULL,
  performed_by    BIGINT NOT NULL,
  performed_at_utc DATETIME(3) NOT NULL,
  details         JSON,
  INDEX idx_vendor_time (vendor_id, performed_at_utc),
  CONSTRAINT fk_audit_vendor FOREIGN KEY (vendor_id) REFERENCES m3_vendor(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Total: 9 tables** ✅ matches `ULP_DBD_v2.0_DatabaseDesign.docx §4`.

## 4. Onboarding workflow (Hangfire)

Steps from `m3_onboarding_step` enum, run sequentially:

1. **`KYC_DOCS`** — request company registration cert, address proof; recipient uploads via M21 share link
2. **`IDENTIFIER_VALIDATE`** — validate GSTIN/PAN (IN) or EIN/W-9 (US) via M1 plugin (Phase 3) — Phase 1 = `Pending`
3. **`SANCTIONS_SCREEN`** — call EximCube RPS endpoint (M15-US dependency) — Phase 1 = manual flag
4. **`BANK_VERIFY`** — penny-test or paper bank certificate; record in M1.BankAccount
5. **`CREDIT_CHECK`** — optional; integration with credit bureau (deferred)
6. **`AGREEMENT_SIGN`** — generate MSA from template via M6 (deferred); track in `m3_agreement`
7. **`ACTIVATE`** — flip `m3_vendor.status` to `Active`, emit `VendorActivated`

## 5. APIs

All under `/api/v1/m3`:

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/vendors` | `m3.vendor.read` | List with filters (status, category, country) |
| `GET` | `/vendors/{id}` | `m3.vendor.read` | Detail incl. M1.Party data + categories + agreements |
| `POST` | `/vendors` | `m3.vendor.write` | Create (chains M1.Party create with party_type=Vendor) |
| `PUT` | `/vendors/{id}` | `m3.vendor.write` | Update vendor satellite fields |
| `POST` | `/vendors/{id}/onboarding/start` | `m3.vendor.write` | Kicks off Hangfire onboarding |
| `POST` | `/vendors/{id}/onboarding/{step}/complete` | `m3.vendor.write` | Mark step complete |
| `POST` | `/vendors/{id}/activate` | `m3.vendor.approve` | Manual activation |
| `POST` | `/vendors/{id}/suspend` | `m3.vendor.approve` | Suspend with reason |
| `GET` | `/vendors/{id}/agreements` | `m3.vendor.read` | List agreements |
| `POST` | `/vendors/{id}/agreements` | `m3.vendor.write` | Create agreement (links to M21 doc) |
| `GET` | `/vendors/{id}/performance` | `m3.vendor.read` | Score history |
| `POST` | `/vendors/{id}/score/recompute` | `m3.vendor.write` | Recompute score for a period |
| `GET` | `/vendors/{id}/ncrs` | `m3.vendor.read` | NCRs for this vendor |
| `POST` | `/ncrs` | `m3.ncr.write` | Raise NCR |
| `PUT` | `/ncrs/{id}` | `m3.ncr.write` | Update NCR (responses, closure) |

## 6. Events

Published:
- `VendorCreated` — on initial M3.Vendor row insert
- `VendorOnboarded` — when all required onboarding steps complete
- `VendorActivated` — status → Active
- `VendorSuspended` — status → Suspended (with reason)
- `AgreementSigned` — agreement signed via DocuSign callback (M21)
- `NcrRaised` — new NCR (M27 emails compliance team)
- `NcrClosed` — NCR closed
- `PerformanceScored` — new score row (M24 dashboards aggregate)

Subscribed:
- `M21.DocumentUploaded` — if doc class = AGREEMENT, link to vendor
- `M5.ShipmentDelivered` (when implemented) — feed into on_time_delivery_pct
- `M8.GrnFiled` (when implemented) — feed into quality_score

## 7. Compliance flags driving downstream behaviour

- `m3_vendor.tds_applicable=1` + `tds_section` → M17 Indian plugin auto-deducts TDS at payment time
- `m3_vendor.is_1099_reportable=1` → M17 US plugin includes vendor in annual 1099 generation
- `m3_vendor.is_msme=1` → MSMED Act 45-day payment compliance flag for IN tenants
- `m3_vendor.risk_tier='Critical'` → blocks any new PO without explicit override + audit row

## 8. NFR / Performance

- Onboarding workflow end-to-end: target ≤ 5 business days for happy path
- Vendor list query: p95 < 200 ms for 10k vendors per tenant
- Performance score recompute: nightly Hangfire job; p95 < 30s per tenant for 1k vendors

## 9. Migration / Init

- New tables only
- Existing v1.0 vendor data: party_type='Vendor' rows in m1_party get auto-shadowed with `m3_vendor` rows on first M3 deploy (default status=Active, country_code from tenant)
- No data loss

## 10. Out of scope for v1.0

- Vendor self-service portal UI (data + APIs ready; UI lands Phase 4 with M28 / Control Tower)
- Credit-bureau integration
- AI-driven vendor risk scoring (M28 hook)
- Multi-tenant master vendor catalog (each tenant owns its own vendor records — no cross-tenant sharing)

## 11. Sign-off

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-XX | Initial draft. 9 tables matching DBD §4 (incl. country_code on m3_vendor). Builds on M1.Party — does not duplicate identity. |

# ULP M21: Document Management LLD

**Version:** 1.0 · **Status:** Drafted (awaiting Shankar approval) · **Compiled:** May 2026

**Authoritative sources (do not deviate):**
- `ulpReq/ULP_HLD_v2.0_MultiRegion.docx` §7 (cross-cutting storage), §9.1 (M21 in Tier-A module catalog), §10.4 (compliance), §10.5 (jurisdiction-specific data residency)
- `ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx` §4 (M21 = 14 tables, +country_code on document classification)
- `ulpReq/ULP_SecurityComplianceArchitecture_v2.0.docx` §2 (encryption at rest), §7 (PII handling), §8 (data retention)
- `ulpReq/ULP_APISpecification_v2.0.docx` §3 (REST conventions), §6 (Idempotency-Key)
- `ulpReq/ULP_NonFunctionalRequirements_v2.0.docx` (storage/throughput targets)
- `.claude/skills/minio-blob-storage/SKILL.md` — `IStorageProvider` abstraction, MinIO MVP → Azure Blob prod swap
- `ulpReq/ULP_DBD_v2.0_Schema.sql` — schema conventions (tenant_id, country_code, _utc suffix, m_/m1_ prefixes)

> **Indian client continuity** — every existing v1.0 document workflow remains. `country_code` added only to classification/template tables; document data itself is country-agnostic.

---

## 1. Module Purpose

M21 is the **centralized document store** for the entire platform. Every module that produces or consumes a file (invoices, BOE, BL, AWB, POD photos, PDF exports, OCR'd scans, audit trails) goes through M21. M21 owns:

- Upload / download with pre-signed URLs (no direct bucket access)
- Versioning (immutable predecessors; new version = new row)
- Tenant-scoped object key namespacing (cross-tenant access impossible by construction)
- Classification (per LLD §3 — country-aware)
- WORM (Write-Once-Read-Many) retention for compliance buckets (invoices 8yr, customs 5yr, audit permanent)
- OCR ingestion + content-extraction fields (consumed by M28 AI for HS-code suggestion)
- Per-document ACL beyond the tenant-scope filter

It is a **Tier-A** module per HLD §9.1 — country-agnostic core. Country-specific document templates live in M6 (Doc Generation), not M21.

## 2. Architecture

| Component | Scope |
|---|---|
| **M21 storage adapter** | `IStorageProvider` from `Ulp.Core.Infrastructure` — MinIO in dev, Azure Blob in prod. Single swap point per `minio-blob-storage` skill. |
| **M21 metadata DB** | 14 tables in `ulp_dev` MySQL: `m21_*` prefix |
| **M21 ingestion worker** | Hangfire job — runs OCR on uploads with `auto_ocr=1` flag; output written to `m21_extracted_field` |
| **M21 events** | MassTransit publishers — `DocumentUploaded`, `DocumentVersioned`, `DocumentDeleted` events |

## 3. Database — 14 tables (matches DBD §4 count)

> Conventions per `ULP_DBD_v2.0_Schema.sql`:
> - All money via `DECIMAL(18,4)` paired with `CHAR(3)` currency (no Money in M21 — informational only)
> - All instant times `DATETIME(3) UTC`, suffix `_utc`
> - All tenant-scoped tables: `tenant_id INT NOT NULL`, indexed
> - `country_code` only where the LLD specifies (per DBD §4 line: "M21 + country_code on document classification")

### 3.1 `m21_document` — Universal document
```sql
CREATE TABLE m21_document (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id          INT NOT NULL,
  ulid               CHAR(26) NOT NULL,           -- public document id (URL-safe, sortable)
  document_class_id  BIGINT NOT NULL,             -- FK m21_document_class
  module_code        VARCHAR(10) NOT NULL,        -- "M4", "M5", "M17" — owner module
  module_entity_type VARCHAR(50),                 -- "Invoice", "BillOfEntry", "POD"
  module_entity_id   BIGINT,                      -- FK into the owner module's table
  filename           VARCHAR(255) NOT NULL,
  content_type       VARCHAR(100) NOT NULL,
  size_bytes         BIGINT NOT NULL,
  checksum_sha256    CHAR(64) NOT NULL,
  storage_container  VARCHAR(50) NOT NULL,        -- "Invoices" | "AuditLogs" | "PodPhotos" …
  storage_object_key VARCHAR(500) NOT NULL,       -- "tenant-1001/m17/invoice/2026/04/15/INV-001234.pdf"
  current_version_id BIGINT,                      -- FK m21_document_version (nullable while uploading)
  is_immutable       TINYINT(1) DEFAULT 0,        -- WORM
  retain_until_utc   DATETIME(3),                 -- WORM retention end
  is_deleted         TINYINT(1) DEFAULT 0,        -- soft-delete
  deleted_at_utc     DATETIME(3),
  deleted_by         BIGINT,
  created_at_utc     DATETIME(3) NOT NULL,
  created_by         BIGINT NOT NULL,
  modified_at_utc    DATETIME(3) NOT NULL,
  modified_by        BIGINT NOT NULL,
  UNIQUE KEY uq_ulid (ulid),
  INDEX idx_tenant_module (tenant_id, module_code, module_entity_type, module_entity_id),
  INDEX idx_tenant_class (tenant_id, document_class_id),
  INDEX idx_tenant_deleted (tenant_id, is_deleted)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.2 `m21_document_class` — Classification (country-aware per DBD §4)
```sql
CREATE TABLE m21_document_class (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  country_code    CHAR(2) NOT NULL,             -- DBD §4: M21 +country_code on classification
  code            VARCHAR(50) NOT NULL,         -- "INVOICE", "BOE", "BL", "AWB", "POD"
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  default_storage_container VARCHAR(50) NOT NULL,
  default_immutable TINYINT(1) DEFAULT 0,
  default_retain_years TINYINT,                  -- 8 for invoices, 5 for customs, NULL = none
  ocr_enabled     TINYINT(1) DEFAULT 0,
  ai_classify     TINYINT(1) DEFAULT 0,         -- M28 picks up if true
  is_active       TINYINT(1) DEFAULT 1,
  UNIQUE KEY uq_tenant_country_code (tenant_id, country_code, code),
  CONSTRAINT fk_docclass_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.3 `m21_document_version` — Immutable version history
```sql
CREATE TABLE m21_document_version (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id          INT NOT NULL,
  document_id        BIGINT NOT NULL,
  version_number     INT NOT NULL,             -- 1, 2, 3 …
  filename           VARCHAR(255) NOT NULL,
  content_type       VARCHAR(100) NOT NULL,
  size_bytes         BIGINT NOT NULL,
  checksum_sha256    CHAR(64) NOT NULL,
  storage_object_key VARCHAR(500) NOT NULL,    -- versions stored as separate keys
  uploaded_by        BIGINT NOT NULL,
  uploaded_at_utc    DATETIME(3) NOT NULL,
  comment            VARCHAR(500),
  UNIQUE KEY uq_doc_version (document_id, version_number),
  CONSTRAINT fk_docver_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.4 `m21_document_tag` — Free-form tagging
```sql
CREATE TABLE m21_document_tag (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id    INT NOT NULL,
  document_id  BIGINT NOT NULL,
  tag_name     VARCHAR(50) NOT NULL,           -- "draft" | "approved" | "expiring-soon"
  tag_value    VARCHAR(255),
  created_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_doc_tag (document_id, tag_name),
  CONSTRAINT fk_doctag_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.5 `m21_document_acl` — Per-document override of tenant RBAC
```sql
CREATE TABLE m21_document_acl (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  document_id     BIGINT NOT NULL,
  principal_type  ENUM('USER','ROLE','GROUP','TENANT') NOT NULL,
  principal_id    BIGINT NOT NULL,             -- FK m26_user / m26_role / m26_group / m_tenant
  permission      ENUM('READ','WRITE','DELETE','SHARE') NOT NULL,
  granted_by      BIGINT NOT NULL,
  granted_at_utc  DATETIME(3) NOT NULL,
  expires_at_utc  DATETIME(3),
  UNIQUE KEY uq_doc_principal_perm (document_id, principal_type, principal_id, permission),
  CONSTRAINT fk_docacl_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.6 `m21_document_share` — Time-limited external share
```sql
CREATE TABLE m21_document_share (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  document_id     BIGINT NOT NULL,
  share_token     CHAR(64) NOT NULL,           -- random secret; URL = /share/{token}
  recipient_email VARCHAR(255),
  expires_at_utc  DATETIME(3) NOT NULL,
  max_downloads   INT,
  download_count  INT DEFAULT 0,
  is_revoked      TINYINT(1) DEFAULT 0,
  created_by      BIGINT NOT NULL,
  created_at_utc  DATETIME(3) NOT NULL,
  UNIQUE KEY uq_share_token (share_token),
  INDEX idx_tenant_doc (tenant_id, document_id),
  CONSTRAINT fk_docshare_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.7 `m21_document_audit` — Append-only access log
```sql
CREATE TABLE m21_document_audit (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     INT NOT NULL,
  document_id   BIGINT NOT NULL,
  user_id       BIGINT,
  action        ENUM('UPLOAD','DOWNLOAD','VIEW','UPDATE','DELETE','SHARE','RESTORE') NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    VARCHAR(500),
  occurred_at_utc DATETIME(3) NOT NULL,
  details       JSON,                          -- per-action context
  INDEX idx_doc_time (document_id, occurred_at_utc),
  INDEX idx_tenant_user_time (tenant_id, user_id, occurred_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- Partitioned monthly per DBD §5.1
```

### 3.8 `m21_extracted_field` — OCR / AI extraction output
```sql
CREATE TABLE m21_extracted_field (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     INT NOT NULL,
  document_id   BIGINT NOT NULL,
  field_name    VARCHAR(100) NOT NULL,         -- "invoice_number", "vendor_gstin"
  field_value   TEXT,
  confidence    DECIMAL(5,4),                  -- 0.0000 - 1.0000
  source        ENUM('OCR','AI','HUMAN') NOT NULL,
  page_number   INT,
  bbox_json     JSON,                          -- bounding box on page
  extracted_at_utc DATETIME(3) NOT NULL,
  reviewed_by   BIGINT,
  reviewed_at_utc DATETIME(3),
  INDEX idx_doc_field (document_id, field_name),
  CONSTRAINT fk_extr_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.9 `m21_signature_request` — DocuSign / Adobe Sign / native sig flow
```sql
CREATE TABLE m21_signature_request (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  document_id     BIGINT NOT NULL,
  provider        ENUM('NATIVE','DOCUSIGN','ADOBE_SIGN','OTHER') NOT NULL,
  external_ref    VARCHAR(255),                -- envelope ID at provider
  status          ENUM('Draft','Sent','Viewed','Signed','Declined','Expired','Voided') NOT NULL,
  initiated_by    BIGINT NOT NULL,
  initiated_at_utc DATETIME(3) NOT NULL,
  completed_at_utc DATETIME(3),
  expires_at_utc  DATETIME(3),
  CONSTRAINT fk_sigreq_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.10 `m21_signature_signer`
```sql
CREATE TABLE m21_signature_signer (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id          INT NOT NULL,
  signature_request_id BIGINT NOT NULL,
  email              VARCHAR(255) NOT NULL,
  name               VARCHAR(255),
  signing_order      INT,
  status             ENUM('Pending','Notified','Signed','Declined') NOT NULL,
  signed_at_utc      DATETIME(3),
  ip_address         VARCHAR(45),
  CONSTRAINT fk_signer_req FOREIGN KEY (signature_request_id) REFERENCES m21_signature_request(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.11 `m21_retention_policy` — Per-class retention rules
```sql
CREATE TABLE m21_retention_policy (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  country_code    CHAR(2),                     -- nullable for tenant-wide
  document_class_id BIGINT,                    -- nullable for catch-all
  retain_years    TINYINT NOT NULL,
  worm            TINYINT(1) DEFAULT 0,
  legal_hold      TINYINT(1) DEFAULT 0,        -- if set, blocks deletion regardless of expiry
  effective_from_utc DATETIME(3) NOT NULL,
  CONSTRAINT fk_retpolicy_country FOREIGN KEY (country_code) REFERENCES m1_country(code),
  CONSTRAINT fk_retpolicy_class FOREIGN KEY (document_class_id) REFERENCES m21_document_class(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.12 `m21_legal_hold` — Litigation hold (overrides any deletion)
```sql
CREATE TABLE m21_legal_hold (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  hold_name       VARCHAR(150) NOT NULL,
  reason          TEXT,
  scope_module    VARCHAR(10),                 -- limit to a module's docs
  scope_class_id  BIGINT,
  scope_query     JSON,                        -- additional filter expression
  is_active       TINYINT(1) DEFAULT 1,
  applied_at_utc  DATETIME(3) NOT NULL,
  released_at_utc DATETIME(3),
  applied_by      BIGINT NOT NULL,
  released_by     BIGINT
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.13 `m21_document_legal_hold` — Doc-to-hold N:N
```sql
CREATE TABLE m21_document_legal_hold (
  document_id    BIGINT NOT NULL,
  legal_hold_id  BIGINT NOT NULL,
  applied_at_utc DATETIME(3) NOT NULL,
  PRIMARY KEY (document_id, legal_hold_id),
  CONSTRAINT fk_dlh_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE,
  CONSTRAINT fk_dlh_hold FOREIGN KEY (legal_hold_id) REFERENCES m21_legal_hold(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.14 `m21_storage_quota` — Per-tenant quota tracking
```sql
CREATE TABLE m21_storage_quota (
  tenant_id           INT PRIMARY KEY,
  bytes_used          BIGINT NOT NULL DEFAULT 0,
  bytes_quota         BIGINT NOT NULL,         -- per plan
  documents_count     BIGINT NOT NULL DEFAULT 0,
  last_recomputed_utc DATETIME(3) NOT NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Total: 14 tables** ✅ matches `ULP_DBD_v2.0_DatabaseDesign.docx §4`.

## 4. Storage Containers (per `minio-blob-storage` skill)

| Container | Retention | Class examples |
|---|---|---|
| `ulp-invoices` | WORM 8 years | INVOICE, CREDIT_NOTE, DEBIT_NOTE, BOS |
| `ulp-customs-documents` | WORM 5 years | BOE, SB, 7501, ATM, ITN, AES |
| `ulp-audit-logs` | WORM permanent | AUDIT_REPORT, COMPLIANCE_LOG |
| `ulp-pod-photos` | 1 year lifecycle | POD, DELIVERY_PHOTO |
| `ulp-exports` | 30 day lifecycle | REPORT_EXPORT, CSV, EXCEL |
| `ulp-user-uploads` | tenant-controlled | scans, agreements, generic uploads |

Object key naming (per skill):
```
tenant-{tenantId}/{moduleCode}/{entityType}/{yyyy}/{MM}/{dd}/{ulid}_{purpose}.{ext}
```
Example: `tenant-1001/m17/invoice/2026/04/15/01HQX5G2J7Y_original.pdf`

## 5. APIs

All under `/api/v1/m21`. RBAC: `document.read`, `document.write`, `document.delete`, `document.share` permissions.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/documents/upload-init` | Returns pre-signed PUT URL + ulid |
| `POST` | `/documents/{ulid}/upload-complete` | Confirms upload (validates checksum + size); creates row |
| `GET` | `/documents` | List by module/entity/class with pagination |
| `GET` | `/documents/{ulid}` | Metadata + version list |
| `GET` | `/documents/{ulid}/download` | Returns pre-signed GET URL (5-min expiry default) |
| `POST` | `/documents/{ulid}/versions` | New version of existing document |
| `POST` | `/documents/{ulid}/tags` | Tag/untag |
| `POST` | `/documents/{ulid}/acl` | Grant/revoke per-doc permissions |
| `POST` | `/documents/{ulid}/shares` | Create time-limited share link |
| `GET` | `/share/{token}` | Public download via share token (no auth) |
| `DELETE` | `/documents/{ulid}` | Soft-delete (legal-hold blocks) |
| `POST` | `/documents/{ulid}/restore` | Undo soft-delete within 30 days |
| `GET` | `/documents/{ulid}/audit` | Access log |
| `GET` | `/storage/quota` | Tenant quota usage |

API conventions per `ULP_APISpecification_v2.0.docx` §3 + §6:
- All mutating verbs accept `Idempotency-Key` header
- All payloads include `Correlation-Id` propagation
- Money never appears in M21 (no monetary fields)
- Pagination: `?page=&pageSize=` envelope `PagedList<T>`

## 6. Events (MassTransit)

| Event | When | Consumers (anticipated) |
|---|---|---|
| `DocumentUploaded` | Row inserted with version 1 | M28 AI (OCR), M27 Notifications (email confirmation) |
| `DocumentVersioned` | New version row inserted | M27 (notify watchers) |
| `DocumentDeleted` | Soft-delete | M24 Dashboards (recompute counts) |
| `DocumentRestored` | Soft-delete reversed | M24 |
| `RetentionApplied` | WORM lock applied | (audit-only) |
| `LegalHoldApplied` / `LegalHoldReleased` | Hold lifecycle | M27 (notify legal team) |

## 7. Security & Compliance (per Security doc §2 + §7)

- **Encryption at rest**: MinIO/Azure Blob server-side encryption with CMK in Key Vault (per region)
- **Encryption in transit**: TLS 1.3 only (Azure Front Door + Kestrel)
- **PII redaction**: documents with `pii=true` in `m21_document_tag` get extra access logging
- **Pre-signed URLs ONLY**: never expose direct bucket URLs (per skill)
- **Tenant scope**: object key always prefixed `tenant-{id}/`; EF Core query filter on `tenant_id`
- **WORM**: `is_immutable=1` blocks DELETE at the API + at the storage backend (Azure immutability policy)
- **Legal hold**: rows in `m21_legal_hold` with `is_active=1` block soft-delete on referenced docs

## 8. Non-functional targets (per NFR doc + HLD §10.1)

| Metric | Target |
|---|---|
| Upload throughput | 50 MB/s per pod sustained; 200 MB/s burst |
| Pre-signed URL generation | p95 < 50 ms |
| Download initiation | p95 < 100 ms |
| Concurrent uploads per tenant | 50 in-flight; queue beyond |
| Quota recompute | nightly Hangfire job per tenant |
| Audit log retention | 13 months online, 7 years cold |

## 9. Observability (per `serilog-logging` skill)

Every M21 operation emits Serilog event with mandatory v2.0 fields: `tenantId`, `countryCode`, `region`, `correlationId`, `userId`, `documentId`, `action`, `bytes`, `duration_ms`. PII-tagged docs additionally log `pii=true` + redact filename suffix in logs.

## 10. Migration / Init

- New tables only; no v1.0 data migration
- `m21_document_class` seeded per tenant on first activation:
  - IN tenants: INVOICE / BOE / SB / IGM / EWB / IRN / GSTR-1 / GSTR-3B / TDS_CERT / FORM_16A / POD
  - US tenants: INVOICE / 7501 / ATM / ITN / AES / ISF / 1099_NEC / 1099_MISC / W2 / 941 / POD
  - Universal: AUDIT_REPORT / EXPORT / SCAN / AGREEMENT
- Default retention policies seeded per class

## 11. Out of scope for v1.0

- E-signature provider integration (table shape included; provider connectors land Phase 2)
- AI auto-classification (M28 dependency; the table shape supports it; logic lives in M28)
- Doc preview rendering (frontend renders PDFs via browser; Office docs via web Office viewer in Phase 4)
- Cross-region document replication (region-pinning is mandatory; reconsider in v2.0)

## 12. Sign-off

Drafted by Claude (May 2026) from authoritative sources listed at the top of this document. Awaiting Shankar review/lock per `docs/lld/README.md` lifecycle.

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-XX | Initial draft. 14 tables matching DBD §4 count. |

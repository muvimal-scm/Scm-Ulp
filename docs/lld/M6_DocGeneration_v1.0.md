# ULP M6: Document Generation LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** 2

**Authoritative sources:** HLD §9.2 ("Templates, PDF rendering, e-signatures") · DBD §4 — **M6 = 8 tables, no country_code change** · M21 (output goes here) · M5 (consumer) · M17 (consumer)

---

## 1. Purpose
Render documents from templates (BL, AWB, manifest, invoice, packing list, COO, etc.). Templates are tenant-customisable; output is stored in M21. M6 owns the rendering engine; the **content** lives in source modules; M21 owns the **storage**.

## 2. Architecture
- Template engine: Scriban (already in tech stack) for text-based templates; QuestPDF for PDF rendering
- Country variants: same template can have IN/US versions (e.g., invoice template differs for GST vs sales tax)
- Async rendering via Hangfire for heavy templates (>1MB output)

## 3. Database — 8 tables (matches DBD §4)

### 3.1 `m6_template`
```sql
CREATE TABLE m6_template (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT,                                -- NULL = system template
  code            VARCHAR(80) NOT NULL,               -- "INVOICE","HBL","MANIFEST","COO"
  country_code    CHAR(2),                            -- nullable; tenant variants
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  template_type   ENUM('PDF','HTML','DOCX','TEXT') NOT NULL,
  rendering_engine ENUM('SCRIBAN','QUESTPDF','HANDLEBARS') NOT NULL,
  is_active       TINYINT(1) DEFAULT 1,
  version         INT DEFAULT 1,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_code_country (tenant_id, code, country_code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.2 `m6_template_version` — Immutable history
```sql
CREATE TABLE m6_template_version (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  template_id     BIGINT NOT NULL,
  version_number  INT NOT NULL,
  body            LONGTEXT NOT NULL,
  layout_json     JSON,                                -- styling, margins, header/footer
  created_by      BIGINT NOT NULL,
  created_at_utc  DATETIME(3) NOT NULL,
  comment         VARCHAR(500),
  UNIQUE KEY uq_template_version (template_id, version_number),
  CONSTRAINT fk_tv_template FOREIGN KEY (template_id) REFERENCES m6_template(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.3 `m6_template_field` — Required input fields per template
```sql
CREATE TABLE m6_template_field (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  template_id     BIGINT NOT NULL,
  field_name      VARCHAR(100) NOT NULL,
  field_type      ENUM('TEXT','NUMBER','DATE','MONEY','BOOLEAN','LIST','OBJECT') NOT NULL,
  is_required     TINYINT(1) DEFAULT 0,
  default_value   VARCHAR(255),
  source_module   VARCHAR(10),                         -- where the data is auto-fetched from
  source_path     VARCHAR(255),                        -- JSON path
  CONSTRAINT fk_tf_template FOREIGN KEY (template_id) REFERENCES m6_template(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.4 `m6_render_request` — Render job queue
```sql
CREATE TABLE m6_render_request (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  ulid            CHAR(26) NOT NULL,
  template_id     BIGINT NOT NULL,
  template_version INT NOT NULL,
  source_module   VARCHAR(10) NOT NULL,                -- "M5","M17","M4"
  source_entity_id BIGINT,
  payload         JSON NOT NULL,
  output_format   ENUM('PDF','HTML','DOCX','TEXT') NOT NULL,
  status          ENUM('Queued','Rendering','Completed','Failed') NOT NULL,
  document_id     BIGINT,                              -- FK m21_document on success
  error_message   TEXT,
  requested_at_utc DATETIME(3) NOT NULL,
  completed_at_utc DATETIME(3),
  duration_ms     INT,
  UNIQUE KEY uq_ulid (ulid),
  INDEX idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.5 `m6_template_asset` — Logos, signatures, watermarks
```sql
CREATE TABLE m6_template_asset (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  asset_type      ENUM('LOGO','SIGNATURE','STAMP','WATERMARK','HEADER_IMG','FOOTER_IMG') NOT NULL,
  name            VARCHAR(150) NOT NULL,
  document_id     BIGINT NOT NULL,                     -- FK m21_document (image)
  is_default      TINYINT(1) DEFAULT 0,
  CONSTRAINT fk_ta_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.6 `m6_text_overlay` — Stamps / text overlays applied at print
```sql
CREATE TABLE m6_text_overlay (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  template_id     BIGINT NOT NULL,
  text            VARCHAR(255) NOT NULL,
  page            INT,
  position_x      DECIMAL(8,4),                        -- pt
  position_y      DECIMAL(8,4),
  font_size       DECIMAL(5,2),
  font_color      CHAR(7),                             -- hex
  rotation_deg    DECIMAL(5,2),
  opacity         DECIMAL(3,2),
  CONSTRAINT fk_to_template FOREIGN KEY (template_id) REFERENCES m6_template(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.7 `m6_print_log` — Audit of every render + print
```sql
CREATE TABLE m6_print_log (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  document_id     BIGINT NOT NULL,
  printed_by      BIGINT NOT NULL,
  printed_at_utc  DATETIME(3) NOT NULL,
  copies          INT DEFAULT 1,
  printer_name    VARCHAR(100),
  ip_address      VARCHAR(45),
  INDEX idx_doc_time (document_id, printed_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.8 `m6_email_batch` — Bulk doc-email batches
```sql
CREATE TABLE m6_email_batch (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  template_code   VARCHAR(80),
  batch_size      INT,
  status          ENUM('Queued','Sending','Completed','Failed') NOT NULL,
  created_at_utc  DATETIME(3) NOT NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Total: 8 tables** ✅ matches DBD §4.

## 4. APIs
`/api/v1/m6/{templates | render | assets}` — render, browse templates, manage assets.

## 5. Sign-off
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-XX | Initial draft. 8 tables matching DBD §4. |

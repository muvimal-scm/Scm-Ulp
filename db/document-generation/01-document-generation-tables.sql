-- =====================================================================
-- M6 Document Generation — 8 tables (Phase 2)
-- Strictly per docs/lld/M6_DocGeneration_v1.0.md (DBD §4 = 8 tables, no country_code change).
-- Idempotent: CREATE TABLE IF NOT EXISTS.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- 3.1 m6_template
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m6_template (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT,                              -- NULL = system default
  code              VARCHAR(80) NOT NULL,
  country_code      CHAR(2),
  name              VARCHAR(150) NOT NULL,
  description       TEXT,
  template_type     ENUM('PDF','HTML','DOCX','TEXT') NOT NULL,
  rendering_engine  ENUM('SCRIBAN','QUESTPDF','HANDLEBARS') NOT NULL,
  is_active         TINYINT(1) DEFAULT 1,
  version           INT DEFAULT 1,
  created_at_utc    DATETIME(3) NOT NULL,
  modified_at_utc   DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_code_country (tenant_id, code, country_code),
  CONSTRAINT fk_m6tpl_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.2 m6_template_version
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m6_template_version (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  template_id     BIGINT NOT NULL,
  version_number  INT NOT NULL,
  body            LONGTEXT NOT NULL,
  layout_json     JSON,
  created_by      BIGINT NOT NULL,
  created_at_utc  DATETIME(3) NOT NULL,
  comment         VARCHAR(500),
  UNIQUE KEY uq_template_version (template_id, version_number),
  CONSTRAINT fk_tv_template FOREIGN KEY (template_id) REFERENCES m6_template(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.3 m6_template_field
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m6_template_field (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  template_id     BIGINT NOT NULL,
  field_name      VARCHAR(100) NOT NULL,
  field_type      ENUM('TEXT','NUMBER','DATE','MONEY','BOOLEAN','LIST','OBJECT') NOT NULL,
  is_required     TINYINT(1) DEFAULT 0,
  default_value   VARCHAR(255),
  source_module   VARCHAR(10),
  source_path     VARCHAR(255),
  UNIQUE KEY uq_template_field (template_id, field_name),
  CONSTRAINT fk_tf_template FOREIGN KEY (template_id) REFERENCES m6_template(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.4 m6_render_request
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m6_render_request (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  ulid              VARCHAR(26) NOT NULL,
  template_id       BIGINT NOT NULL,
  template_version  INT NOT NULL,
  source_module     VARCHAR(10) NOT NULL,
  source_entity_id  BIGINT,
  payload           JSON NOT NULL,
  output_format     ENUM('PDF','HTML','DOCX','TEXT') NOT NULL,
  status            ENUM('Queued','Rendering','Completed','Failed') NOT NULL,
  document_id       BIGINT,
  rendered_body     LONGTEXT,                     -- inline rendered output (for non-document-store flows)
  error_message     TEXT,
  requested_at_utc  DATETIME(3) NOT NULL,
  completed_at_utc  DATETIME(3),
  duration_ms       INT,
  UNIQUE KEY uq_ulid (ulid),
  INDEX idx_tenant_status (tenant_id, status),
  INDEX idx_template (template_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.5 m6_template_asset
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m6_template_asset (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  asset_type      ENUM('LOGO','SIGNATURE','STAMP','WATERMARK','HEADER_IMG','FOOTER_IMG') NOT NULL,
  name            VARCHAR(150) NOT NULL,
  document_id     BIGINT NOT NULL,
  is_default      TINYINT(1) DEFAULT 0,
  CONSTRAINT fk_ta_doc FOREIGN KEY (document_id) REFERENCES m21_document(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.6 m6_text_overlay
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m6_text_overlay (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  template_id     BIGINT NOT NULL,
  text            VARCHAR(255) NOT NULL,
  page            INT,
  position_x      DECIMAL(8,4),
  position_y      DECIMAL(8,4),
  font_size       DECIMAL(5,2),
  font_color      VARCHAR(7),
  rotation_deg    DECIMAL(5,2),
  opacity         DECIMAL(3,2),
  CONSTRAINT fk_to_template FOREIGN KEY (template_id) REFERENCES m6_template(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.7 m6_print_log
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m6_print_log (
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

-- ---------------------------------------------------------------------
-- 3.8 m6_email_batch
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m6_email_batch (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  template_code   VARCHAR(80),
  batch_size      INT,
  status          ENUM('Queued','Sending','Completed','Failed') NOT NULL,
  created_at_utc  DATETIME(3) NOT NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- System template seeds — minimal HTML templates for Phase 2.0.
-- Real PDF rendering via QuestPDF lands Phase 2.1.
-- =====================================================================
INSERT IGNORE INTO m6_template
  (id, tenant_id, code, country_code, name, description, template_type, rendering_engine,
   is_active, version, created_at_utc, modified_at_utc) VALUES
  (1, NULL, 'INVOICE',  'IN', 'Tax Invoice (GST)',     'GST tax invoice for India tenants',          'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, NULL, 'INVOICE',  'US', 'Sales Invoice',         'Sales tax invoice for US tenants',           'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, NULL, 'HBL',      NULL, 'House Bill of Lading',  'HBL — ocean export, country-agnostic shell', 'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (4, NULL, 'AWB',      NULL, 'Air Waybill',           'AWB shell',                                  'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (5, NULL, 'PACKING_LIST', NULL, 'Packing List',      'Cargo packing list',                         'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (6, NULL, 'COO',      NULL, 'Certificate of Origin', 'COO certificate shell',                      'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (7, NULL, 'QUOTE',    NULL, 'Customer Quotation',    'Quote rendered from M14',                    'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- Template bodies — Scriban-compatible {{ var }} placeholders.
INSERT IGNORE INTO m6_template_version (template_id, version_number, body, created_by, created_at_utc, comment) VALUES
  (1, 1,
'<!DOCTYPE html><html><head><style>
body{font-family:Arial,sans-serif;color:#1a1a33;padding:32px;}
h1{color:#3F2D7C;border-bottom:3px solid #5B3FA0;padding-bottom:8px;}
table{width:100%;border-collapse:collapse;margin-top:16px;}
th{background:#F5F2FB;color:#3F2D7C;padding:10px;text-align:left;}
td{padding:10px;border-bottom:1px solid #E8E2F4;}
.totals{text-align:right;margin-top:16px;font-size:14px;}
.totals strong{color:#3F2D7C;}
.gstin{font-family:monospace;font-size:13px;}
</style></head><body>
<h1>Tax Invoice</h1>
<p><strong>{{ tenant_name }}</strong> · GSTIN: <span class="gstin">{{ tenant_gstin }}</span></p>
<p>Invoice #: <strong>{{ invoice_number }}</strong> · Date: {{ invoice_date }} · IRN: {{ irn }}</p>
<p><strong>Bill to:</strong> {{ customer_name }} · GSTIN {{ customer_gstin }}</p>
<table><thead><tr><th>HSN</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
{{~ for line in lines ~}}
<tr><td>{{ line.hsn }}</td><td>{{ line.description }}</td><td>{{ line.qty }}</td><td>{{ line.rate }}</td><td>{{ line.amount }}</td></tr>
{{~ end ~}}
</tbody></table>
<div class="totals">
Subtotal: {{ subtotal }} {{ currency }}<br/>
CGST: {{ cgst }} · SGST: {{ sgst }} · IGST: {{ igst }}<br/>
<strong>Total: {{ total }} {{ currency }}</strong>
</div></body></html>',
  0, CURRENT_TIMESTAMP(3), 'system v1 IN GST invoice'),
  (2, 1,
'<!DOCTYPE html><html><head><style>
body{font-family:Arial,sans-serif;color:#1a1a33;padding:32px;}
h1{color:#3F2D7C;border-bottom:3px solid #5B3FA0;padding-bottom:8px;}
table{width:100%;border-collapse:collapse;margin-top:16px;}
th{background:#F5F2FB;color:#3F2D7C;padding:10px;text-align:left;}
td{padding:10px;border-bottom:1px solid #E8E2F4;}
.totals{text-align:right;margin-top:16px;font-size:14px;}
.totals strong{color:#3F2D7C;}
</style></head><body>
<h1>Sales Invoice</h1>
<p><strong>{{ tenant_name }}</strong> · EIN: {{ tenant_ein }}</p>
<p>Invoice #: <strong>{{ invoice_number }}</strong> · Date: {{ invoice_date }}</p>
<p><strong>Bill to:</strong> {{ customer_name }}</p>
<table><thead><tr><th>SKU</th><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>
{{~ for line in lines ~}}
<tr><td>{{ line.sku }}</td><td>{{ line.description }}</td><td>{{ line.qty }}</td><td>{{ line.unit_price }}</td><td>{{ line.amount }}</td></tr>
{{~ end ~}}
</tbody></table>
<div class="totals">
Subtotal: {{ subtotal }} {{ currency }}<br/>
Sales tax: {{ sales_tax }}<br/>
<strong>Total: {{ total }} {{ currency }}</strong>
</div></body></html>',
  0, CURRENT_TIMESTAMP(3), 'system v1 US sales invoice'),
  (3, 1,
'<!DOCTYPE html><html><head><style>
body{font-family:Arial,sans-serif;color:#1a1a33;padding:24px;}
h1{color:#3F2D7C;text-align:center;}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;}
.box{border:1px solid #C9BEEC;padding:12px;border-radius:6px;}
.box h3{margin:0 0 6px;color:#3F2D7C;font-size:11px;text-transform:uppercase;}
table{width:100%;border-collapse:collapse;margin-top:16px;}
th{background:#F5F2FB;color:#3F2D7C;padding:8px;text-align:left;font-size:12px;}
td{padding:8px;border-bottom:1px solid #E8E2F4;font-size:12px;}
</style></head><body>
<h1>HOUSE BILL OF LADING</h1>
<p style="text-align:center;font-size:13px;">B/L No: <strong>{{ bl_number }}</strong> · Booking: {{ booking_ref }}</p>
<div class="grid">
<div class="box"><h3>Shipper</h3>{{ shipper_name }}<br/>{{ shipper_address }}</div>
<div class="box"><h3>Consignee</h3>{{ consignee_name }}<br/>{{ consignee_address }}</div>
<div class="box"><h3>Vessel / voyage</h3>{{ vessel }} / {{ voyage }}</div>
<div class="box"><h3>Port of loading → discharge</h3>{{ pol }} → {{ pod }}</div>
</div>
<table><thead><tr><th>Marks</th><th>Pkgs</th><th>Description</th><th>Gross wt (kg)</th><th>Vol (CBM)</th></tr></thead><tbody>
{{~ for c in cargo ~}}
<tr><td>{{ c.marks }}</td><td>{{ c.pkgs }}</td><td>{{ c.description }}</td><td>{{ c.weight }}</td><td>{{ c.volume }}</td></tr>
{{~ end ~}}
</tbody></table>
<p style="margin-top:24px;font-size:11px;color:#6B5BA0;">Issued at {{ place_of_issue }} on {{ issue_date }}</p>
</body></html>',
  0, CURRENT_TIMESTAMP(3), 'system v1 HBL'),
  (4, 1,
'<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;">
<h1 style="color:#3F2D7C;text-align:center;">AIR WAYBILL</h1>
<p style="text-align:center;">AWB No: <strong>{{ awb_number }}</strong></p>
<p>Shipper: {{ shipper_name }}</p>
<p>Consignee: {{ consignee_name }}</p>
<p>Airport of departure: {{ origin_airport }} → arrival: {{ dest_airport }}</p>
<p>Pieces: {{ pieces }} · Gross weight: {{ weight }} kg</p>
<p>Goods: {{ description }}</p>
</body></html>',
  0, CURRENT_TIMESTAMP(3), 'system v1 AWB'),
  (5, 1,
'<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;">
<h1 style="color:#3F2D7C;">Packing List</h1>
<p>Shipment: <strong>{{ shipment_ref }}</strong></p>
<table style="width:100%;border-collapse:collapse;">
<thead><tr style="background:#F5F2FB;"><th>Pkg #</th><th>Contents</th><th>Qty</th><th>Net wt</th><th>Gross wt</th></tr></thead>
<tbody>
{{~ for p in packages ~}}
<tr><td>{{ p.number }}</td><td>{{ p.contents }}</td><td>{{ p.qty }}</td><td>{{ p.net }}</td><td>{{ p.gross }}</td></tr>
{{~ end ~}}
</tbody></table>
</body></html>',
  0, CURRENT_TIMESTAMP(3), 'system v1 packing list'),
  (6, 1,
'<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;text-align:center;">
<h1 style="color:#3F2D7C;">Certificate of Origin</h1>
<p>Goods described herein are of <strong>{{ origin_country }}</strong> origin.</p>
<p>Exporter: {{ exporter_name }}</p>
<p>Consignee: {{ consignee_name }}</p>
<p>Description: {{ description }}</p>
<p>HS code: {{ hs_code }}</p>
<p style="margin-top:32px;">Signature ____________________</p>
</body></html>',
  0, CURRENT_TIMESTAMP(3), 'system v1 COO'),
  (7, 1,
'<!DOCTYPE html><html><head><style>
body{font-family:Arial,sans-serif;color:#1a1a33;padding:32px;}
h1{background:linear-gradient(90deg,#E54A8A,#5B3FA0,#3F2D7C);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
table{width:100%;border-collapse:collapse;margin-top:16px;}
th{background:#F5F2FB;color:#3F2D7C;padding:10px;text-align:left;}
td{padding:10px;border-bottom:1px solid #E8E2F4;}
.total{text-align:right;font-size:18px;color:#3F2D7C;font-weight:700;margin-top:16px;}
</style></head><body>
<h1>Quotation</h1>
<p>Quote #: <strong>{{ quote_number }}</strong> · Date: {{ quote_date }} · Valid until: {{ valid_until }}</p>
<p><strong>To:</strong> {{ customer_name }}</p>
<p><strong>Service:</strong> {{ service_type }} · {{ origin }} → {{ destination }}</p>
<table><thead><tr><th>Charge</th><th>Description</th><th>Qty</th><th>UoM</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>
{{~ for l in lines ~}}
<tr><td>{{ l.charge_code }}</td><td>{{ l.description }}</td><td>{{ l.qty }}</td><td>{{ l.uom }}</td><td>{{ l.unit_price }}</td><td>{{ l.amount }}</td></tr>
{{~ end ~}}
</tbody></table>
<div class="total">Total: {{ total }} {{ currency }}</div>
<p style="margin-top:32px;font-size:11px;color:#6B5BA0;">{{ notes }}</p>
</body></html>',
  0, CURRENT_TIMESTAMP(3), 'system v1 quotation');

-- Template fields for INVOICE (IN) — what the source module must supply.
INSERT IGNORE INTO m6_template_field (template_id, field_name, field_type, is_required, source_module) VALUES
  (1, 'tenant_name',    'TEXT',   1, 'M26'),
  (1, 'tenant_gstin',   'TEXT',   1, 'M1'),
  (1, 'invoice_number', 'TEXT',   1, 'M17'),
  (1, 'invoice_date',   'DATE',   1, 'M17'),
  (1, 'irn',            'TEXT',   0, 'M17'),
  (1, 'customer_name',  'TEXT',   1, 'M1'),
  (1, 'customer_gstin', 'TEXT',   0, 'M1'),
  (1, 'lines',          'LIST',   1, 'M17'),
  (1, 'subtotal',       'MONEY',  1, 'M17'),
  (1, 'cgst',           'MONEY',  1, 'M17'),
  (1, 'sgst',           'MONEY',  1, 'M17'),
  (1, 'igst',           'MONEY',  1, 'M17'),
  (1, 'total',          'MONEY',  1, 'M17'),
  (1, 'currency',       'TEXT',   1, 'M17');

-- Mark version
INSERT INTO _ulp_schema_version (version, source, notes)
VALUES ('m6-tables', 'db/m6/01-m6-tables.sql', 'M6 Doc Generation — 8 tables + 7 system templates (HTML/Scriban)')
ON DUPLICATE KEY UPDATE applied_at_utc = CURRENT_TIMESTAMP(3);

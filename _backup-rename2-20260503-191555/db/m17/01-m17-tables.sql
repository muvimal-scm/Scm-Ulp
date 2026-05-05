-- =====================================================================
-- M17 Accounts (Core + India Plugin) — per sealed LLD ULP_LLD_M17_v2.0_Accounts.docx
--
-- Architecture (LLD §1.2):
--   M17-Core         : universal GL/AR/AP/period-close/multi-currency/audit
--   M17-IN-Plugin    : GST, IRN, e-Invoice, TDS/TCS, GSTR returns, NACH (India)
--   M17-US-Plugin    : separate LLD (ULP_LLD_M17_US_Accounts_GAAP_v1.0.docx) — not in this file
--
-- Tables explicitly DDL'd in LLD: m17_account (§3.1), m17_journal + m17_journal_line (§3.2),
--                                 m17_period (§3.3), m17_audit_log (§8.2)
-- Tables derived from LLD workflow descriptions (AR §5, AP §6, IN-Plugin §12):
--                                 m17_invoice + m17_invoice_line, m17_bill + m17_bill_line,
--                                 m17_receipt + m17_receipt_match, m17_payment + m17_payment_alloc,
--                                 m17_fx_rate, m17_close_checklist + m17_close_checklist_item,
--                                 m17in_invoice_ext, m17in_bill_ext, m17in_gst_rate,
--                                 m17in_irn, m17in_tds_section, m17in_gstr_run
--
-- Conventions (CLAUDE.md): tenant_id INT + country_code CHAR(2) on top-level entities,
-- Money = (DECIMAL(18,4) amount + CHAR(3) currency), DATETIME(3) UTC suffix _utc,
-- module-prefixed FK/UNIQUE/INDEX names (db-global namespace in MySQL),
-- idempotent CREATE TABLE IF NOT EXISTS.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- 3.1 m17_account — Chart of Accounts (LLD §3.1, verbatim shape + module-prefixed names)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_account (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  account_code        VARCHAR(20) NOT NULL,
  account_name        VARCHAR(150) NOT NULL,
  account_class       ENUM('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE') NOT NULL,
  parent_account_id   BIGINT NULL,
  is_control_account  TINYINT(1) NOT NULL DEFAULT 0,
  is_postable         TINYINT(1) NOT NULL DEFAULT 1,
  default_currency    CHAR(3) NOT NULL,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at_utc      DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_account_tenant_code (tenant_id, account_code),
  INDEX idx_m17_account_class (tenant_id, account_class, is_active),
  CONSTRAINT fk_m17_account_country  FOREIGN KEY (country_code)     REFERENCES m1_country(code),
  CONSTRAINT fk_m17_account_currency FOREIGN KEY (default_currency) REFERENCES m1_currency(code),
  CONSTRAINT fk_m17_account_parent   FOREIGN KEY (parent_account_id) REFERENCES m17_account(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.3 m17_period — Period management (LLD §3.3)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_period (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  fiscal_year         INT NOT NULL,
  period_number       INT NOT NULL,
  period_name         VARCHAR(20) NOT NULL,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  status              ENUM('Future','Open','SoftClose','Closed') NOT NULL DEFAULT 'Future',
  closed_at_utc       DATETIME(3) NULL,
  closed_by           BIGINT NULL,
  reopened_count      INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_m17_period_tenant_yp (tenant_id, fiscal_year, period_number),
  INDEX idx_m17_period_dates (tenant_id, start_date, end_date),
  INDEX idx_m17_period_status (tenant_id, status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m17_fx_rate — Multi-currency FX rates (LLD §4.2 — RBI/Federal Reserve sources)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_fx_rate (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  from_currency       CHAR(3) NOT NULL,
  to_currency         CHAR(3) NOT NULL,
  rate_date           DATE NOT NULL,
  rate                DECIMAL(18,8) NOT NULL,
  rate_source         VARCHAR(30) NOT NULL,                   -- "RBI", "FED", "MANUAL"
  is_period_end       TINYINT(1) NOT NULL DEFAULT 0,          -- closing rate flag
  created_at_utc      DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_fx_pair_date (tenant_id, from_currency, to_currency, rate_date),
  INDEX idx_m17_fx_lookup (tenant_id, from_currency, to_currency, rate_date DESC),
  CONSTRAINT fk_m17_fx_from FOREIGN KEY (from_currency) REFERENCES m1_currency(code),
  CONSTRAINT fk_m17_fx_to   FOREIGN KEY (to_currency)   REFERENCES m1_currency(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.2 m17_journal — Journal header (LLD §3.2, verbatim shape + module-prefixed names)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_journal (
  id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id             INT NOT NULL,
  journal_number        VARCHAR(30) NOT NULL,
  journal_type          ENUM('GENERAL','AR_INVOICE','AP_BILL','PAYMENT','RECEIPT',
                             'PERIOD_CLOSE','FX_REVAL','OPENING_BALANCE','ADJUSTMENT') NOT NULL,
  posting_date          DATE NOT NULL,
  period_id             BIGINT NOT NULL,
  description           VARCHAR(255) NULL,
  source_module         VARCHAR(20) NULL,
  source_record_id      BIGINT NULL,
  is_posted             TINYINT(1) NOT NULL DEFAULT 0,
  is_reversed           TINYINT(1) NOT NULL DEFAULT 0,
  reversal_journal_id   BIGINT NULL,
  created_at_utc        DATETIME(3) NOT NULL,
  created_by            BIGINT NOT NULL,
  posted_at_utc         DATETIME(3) NULL,
  posted_by             BIGINT NULL,
  UNIQUE KEY uq_m17_journal_tenant_num (tenant_id, journal_number),
  INDEX idx_m17_journal_period (tenant_id, period_id, is_posted),
  INDEX idx_m17_journal_source (source_module, source_record_id),
  INDEX idx_m17_journal_posting (tenant_id, posting_date),
  CONSTRAINT fk_m17_journal_period   FOREIGN KEY (period_id)           REFERENCES m17_period(id),
  CONSTRAINT fk_m17_journal_reversal FOREIGN KEY (reversal_journal_id) REFERENCES m17_journal(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m17_journal_line (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  journal_id          BIGINT NOT NULL,
  line_number         INT NOT NULL,
  account_id          BIGINT NOT NULL,
  amount_orig         DECIMAL(18,4) NOT NULL,
  currency_orig       CHAR(3) NOT NULL,
  amount_func         DECIMAL(18,4) NOT NULL,
  currency_func       CHAR(3) NOT NULL,
  fx_rate             DECIMAL(18,8) NOT NULL,
  fx_rate_date        DATE NOT NULL,
  debit_credit        ENUM('DR','CR') NOT NULL,
  cost_center_id      BIGINT NULL,
  project_id          BIGINT NULL,
  party_id            BIGINT NULL,
  reference           VARCHAR(100) NULL,
  description         VARCHAR(255) NULL,
  UNIQUE KEY uq_m17_jl_journal_line (journal_id, line_number),
  INDEX idx_m17_jl_journal (journal_id),
  INDEX idx_m17_jl_account (account_id, journal_id),
  INDEX idx_m17_jl_party (party_id, account_id),
  CONSTRAINT fk_m17_jl_journal FOREIGN KEY (journal_id) REFERENCES m17_journal(id) ON DELETE CASCADE,
  CONSTRAINT fk_m17_jl_account FOREIGN KEY (account_id) REFERENCES m17_account(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 5.x m17_invoice + m17_invoice_line — AR (derived from LLD §5 workflow + fields)
-- State machine §5.1: Draft → PendingApproval → Approved → Posted → PartiallyPaid/Paid → Overdue → Written-off (or Void terminal pre-post)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_invoice (
  id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id             INT NOT NULL,
  country_code          CHAR(2) NOT NULL,
  invoice_number        VARCHAR(40) NOT NULL,
  invoice_date          DATE NOT NULL,                          -- tenant local
  due_date              DATE NOT NULL,
  customer_party_id     BIGINT NOT NULL,
  bill_to_address       VARCHAR(500) NULL,
  ship_to_address       VARCHAR(500) NULL,
  currency              CHAR(3) NOT NULL,                       -- transaction currency
  func_currency         CHAR(3) NOT NULL,                       -- functional (tenant)
  fx_rate               DECIMAL(18,8) NOT NULL DEFAULT 1,
  subtotal_amount       DECIMAL(18,4) NOT NULL DEFAULT 0,
  tax_amount            DECIMAL(18,4) NOT NULL DEFAULT 0,
  discount_amount       DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_amount          DECIMAL(18,4) NOT NULL DEFAULT 0,
  paid_amount           DECIMAL(18,4) NOT NULL DEFAULT 0,
  payment_terms         VARCHAR(50) NULL,
  notes                 TEXT NULL,
  status                ENUM('Draft','PendingApproval','Approved','Posted',
                             'PartiallyPaid','Paid','Overdue','WrittenOff','Void') NOT NULL DEFAULT 'Draft',
  posted_journal_id     BIGINT NULL,
  posted_at_utc         DATETIME(3) NULL,
  posted_by             BIGINT NULL,
  void_reason           VARCHAR(500) NULL,
  source_module         VARCHAR(20) NULL,                       -- "M5", "M14", "manual"
  source_record_id      BIGINT NULL,
  created_at_utc        DATETIME(3) NOT NULL,
  modified_at_utc       DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_invoice_tenant_num (tenant_id, invoice_number),
  INDEX idx_m17_invoice_customer (tenant_id, customer_party_id, status),
  INDEX idx_m17_invoice_status (tenant_id, status, due_date),
  INDEX idx_m17_invoice_due (tenant_id, due_date),
  CONSTRAINT fk_m17_inv_country  FOREIGN KEY (country_code)     REFERENCES m1_country(code),
  CONSTRAINT fk_m17_inv_currency FOREIGN KEY (currency)         REFERENCES m1_currency(code),
  CONSTRAINT fk_m17_inv_func     FOREIGN KEY (func_currency)    REFERENCES m1_currency(code),
  CONSTRAINT fk_m17_inv_customer FOREIGN KEY (customer_party_id) REFERENCES m1_party(id),
  CONSTRAINT fk_m17_inv_journal  FOREIGN KEY (posted_journal_id) REFERENCES m17_journal(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m17_invoice_line (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  invoice_id          BIGINT NOT NULL,
  line_number         INT NOT NULL,
  description         VARCHAR(255) NOT NULL,
  hsn_code            VARCHAR(20) NULL,                         -- used by India tax provider
  quantity            DECIMAL(12,4) NOT NULL DEFAULT 1,
  uom_code            VARCHAR(10) NULL,
  unit_price_amount   DECIMAL(18,4) NOT NULL,
  unit_price_currency CHAR(3) NOT NULL,
  line_amount         DECIMAL(18,4) NOT NULL,
  tax_class           VARCHAR(50) NULL,
  tax_rate_pct        DECIMAL(7,4) NULL,
  tax_amount          DECIMAL(18,4) NOT NULL DEFAULT 0,
  account_id          BIGINT NULL,                              -- revenue account override
  cost_center_id      BIGINT NULL,
  project_id          BIGINT NULL,
  UNIQUE KEY uq_m17_il_invoice_line (invoice_id, line_number),
  INDEX idx_m17_il_account (account_id),
  CONSTRAINT fk_m17_il_invoice  FOREIGN KEY (invoice_id) REFERENCES m17_invoice(id) ON DELETE CASCADE,
  CONSTRAINT fk_m17_il_account  FOREIGN KEY (account_id) REFERENCES m17_account(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 5.3 m17_receipt + m17_receipt_match — Receipts and matching (AR)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_receipt (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  receipt_number      VARCHAR(40) NOT NULL,
  receipt_date        DATE NOT NULL,
  customer_party_id   BIGINT NOT NULL,
  amount              DECIMAL(18,4) NOT NULL,
  currency            CHAR(3) NOT NULL,
  payment_method      ENUM('Cash','Cheque','BankTransfer','Card','UPI','NEFT','RTGS','IMPS','ACH','Wire','Other') NOT NULL,
  bank_reference      VARCHAR(100) NULL,
  unmatched_amount    DECIMAL(18,4) NOT NULL DEFAULT 0,
  status              ENUM('Received','PartiallyMatched','Matched','Refunded') NOT NULL DEFAULT 'Received',
  posted_journal_id   BIGINT NULL,
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_receipt_tenant_num (tenant_id, receipt_number),
  INDEX idx_m17_receipt_customer (tenant_id, customer_party_id, receipt_date),
  CONSTRAINT fk_m17_receipt_country  FOREIGN KEY (country_code)      REFERENCES m1_country(code),
  CONSTRAINT fk_m17_receipt_currency FOREIGN KEY (currency)          REFERENCES m1_currency(code),
  CONSTRAINT fk_m17_receipt_customer FOREIGN KEY (customer_party_id) REFERENCES m1_party(id),
  CONSTRAINT fk_m17_receipt_journal  FOREIGN KEY (posted_journal_id) REFERENCES m17_journal(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m17_receipt_match (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  receipt_id        BIGINT NOT NULL,
  invoice_id        BIGINT NOT NULL,
  matched_amount    DECIMAL(18,4) NOT NULL,
  matched_at_utc    DATETIME(3) NOT NULL,
  matched_by        BIGINT NULL,
  is_auto           TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_m17_rm_receipt_invoice (receipt_id, invoice_id),
  INDEX idx_m17_rm_invoice (invoice_id),
  CONSTRAINT fk_m17_rm_receipt FOREIGN KEY (receipt_id) REFERENCES m17_receipt(id) ON DELETE CASCADE,
  CONSTRAINT fk_m17_rm_invoice FOREIGN KEY (invoice_id) REFERENCES m17_invoice(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 6.x m17_bill + m17_bill_line — AP (derived from LLD §6 workflow + fields)
-- State machine §6.1: Draft → PendingApproval → Approved → Posted → PartiallyPaid/Paid
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_bill (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  bill_number         VARCHAR(40) NOT NULL,                     -- vendor's invoice ref
  internal_number     VARCHAR(40) NOT NULL,                     -- our internal AP ref
  bill_date           DATE NOT NULL,
  due_date            DATE NOT NULL,
  vendor_party_id     BIGINT NOT NULL,
  currency            CHAR(3) NOT NULL,
  func_currency       CHAR(3) NOT NULL,
  fx_rate             DECIMAL(18,8) NOT NULL DEFAULT 1,
  subtotal_amount     DECIMAL(18,4) NOT NULL DEFAULT 0,
  tax_amount          DECIMAL(18,4) NOT NULL DEFAULT 0,
  withholding_amount  DECIMAL(18,4) NOT NULL DEFAULT 0,         -- TDS in IN, backup withholding in US
  total_amount        DECIMAL(18,4) NOT NULL DEFAULT 0,
  paid_amount         DECIMAL(18,4) NOT NULL DEFAULT 0,
  notes               TEXT NULL,
  status              ENUM('Draft','PendingApproval','Approved','Posted',
                           'PartiallyPaid','Paid','Overdue','Disputed','Cancelled') NOT NULL DEFAULT 'Draft',
  posted_journal_id   BIGINT NULL,
  posted_at_utc       DATETIME(3) NULL,
  posted_by           BIGINT NULL,
  source_module       VARCHAR(20) NULL,
  source_record_id    BIGINT NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_bill_tenant_num (tenant_id, internal_number),
  INDEX idx_m17_bill_vendor (tenant_id, vendor_party_id, status),
  INDEX idx_m17_bill_status (tenant_id, status, due_date),
  CONSTRAINT fk_m17_bill_country  FOREIGN KEY (country_code)    REFERENCES m1_country(code),
  CONSTRAINT fk_m17_bill_currency FOREIGN KEY (currency)        REFERENCES m1_currency(code),
  CONSTRAINT fk_m17_bill_func     FOREIGN KEY (func_currency)   REFERENCES m1_currency(code),
  CONSTRAINT fk_m17_bill_vendor   FOREIGN KEY (vendor_party_id) REFERENCES m1_party(id),
  CONSTRAINT fk_m17_bill_journal  FOREIGN KEY (posted_journal_id) REFERENCES m17_journal(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m17_bill_line (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  bill_id             BIGINT NOT NULL,
  line_number         INT NOT NULL,
  description         VARCHAR(255) NOT NULL,
  hsn_code            VARCHAR(20) NULL,
  quantity            DECIMAL(12,4) NOT NULL DEFAULT 1,
  uom_code            VARCHAR(10) NULL,
  unit_price_amount   DECIMAL(18,4) NOT NULL,
  line_amount         DECIMAL(18,4) NOT NULL,
  tax_class           VARCHAR(50) NULL,
  tax_rate_pct        DECIMAL(7,4) NULL,
  tax_amount          DECIMAL(18,4) NOT NULL DEFAULT 0,
  account_id          BIGINT NULL,                              -- expense account assignment
  cost_center_id      BIGINT NULL,
  project_id          BIGINT NULL,
  UNIQUE KEY uq_m17_bl_bill_line (bill_id, line_number),
  CONSTRAINT fk_m17_bl_bill    FOREIGN KEY (bill_id) REFERENCES m17_bill(id) ON DELETE CASCADE,
  CONSTRAINT fk_m17_bl_account FOREIGN KEY (account_id) REFERENCES m17_account(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 6.3 m17_payment + m17_payment_alloc — AP payments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_payment (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  payment_number      VARCHAR(40) NOT NULL,
  payment_date        DATE NOT NULL,
  vendor_party_id     BIGINT NOT NULL,
  amount              DECIMAL(18,4) NOT NULL,
  currency            CHAR(3) NOT NULL,
  withholding_amount  DECIMAL(18,4) NOT NULL DEFAULT 0,
  net_amount          DECIMAL(18,4) NOT NULL,                   -- amount - withholding
  payment_method      ENUM('Cash','Cheque','BankTransfer','Card','UPI','NEFT','RTGS','IMPS','NACH','ACH','Wire','Other') NOT NULL,
  bank_reference      VARCHAR(100) NULL,
  status              ENUM('Pending','Approved','Sent','Cleared','Failed','Cancelled') NOT NULL DEFAULT 'Pending',
  approved_by         BIGINT NULL,
  approved_at_utc     DATETIME(3) NULL,
  posted_journal_id   BIGINT NULL,
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_payment_tenant_num (tenant_id, payment_number),
  INDEX idx_m17_payment_vendor (tenant_id, vendor_party_id, payment_date),
  INDEX idx_m17_payment_status (tenant_id, status),
  CONSTRAINT fk_m17_pay_country  FOREIGN KEY (country_code)    REFERENCES m1_country(code),
  CONSTRAINT fk_m17_pay_currency FOREIGN KEY (currency)        REFERENCES m1_currency(code),
  CONSTRAINT fk_m17_pay_vendor   FOREIGN KEY (vendor_party_id) REFERENCES m1_party(id),
  CONSTRAINT fk_m17_pay_journal  FOREIGN KEY (posted_journal_id) REFERENCES m17_journal(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m17_payment_alloc (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  payment_id      BIGINT NOT NULL,
  bill_id         BIGINT NOT NULL,
  allocated_amount DECIMAL(18,4) NOT NULL,
  allocated_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_pa_payment_bill (payment_id, bill_id),
  INDEX idx_m17_pa_bill (bill_id),
  CONSTRAINT fk_m17_pa_payment FOREIGN KEY (payment_id) REFERENCES m17_payment(id) ON DELETE CASCADE,
  CONSTRAINT fk_m17_pa_bill    FOREIGN KEY (bill_id)    REFERENCES m17_bill(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 7.x m17_close_checklist + m17_close_checklist_item — Period close (LLD §7.2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_close_checklist (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  period_id           BIGINT NOT NULL,
  status              ENUM('NotStarted','InProgress','Completed','Cancelled') NOT NULL DEFAULT 'NotStarted',
  started_at_utc      DATETIME(3) NULL,
  completed_at_utc    DATETIME(3) NULL,
  started_by          BIGINT NULL,
  completed_by        BIGINT NULL,
  UNIQUE KEY uq_m17_cc_period (tenant_id, period_id),
  CONSTRAINT fk_m17_cc_period FOREIGN KEY (period_id) REFERENCES m17_period(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m17_close_checklist_item (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  checklist_id        BIGINT NOT NULL,
  seq_no              INT NOT NULL,
  item_code           VARCHAR(50) NOT NULL,                     -- e.g. "AR_INVOICES_POSTED"
  item_label          VARCHAR(255) NOT NULL,
  is_plugin_injected  TINYINT(1) NOT NULL DEFAULT 0,            -- IN/US plugin items
  status              ENUM('Pending','Done','Skipped') NOT NULL DEFAULT 'Pending',
  done_at_utc         DATETIME(3) NULL,
  done_by             BIGINT NULL,
  notes               VARCHAR(500) NULL,
  UNIQUE KEY uq_m17_cci_checklist_seq (checklist_id, seq_no),
  CONSTRAINT fk_m17_cci_checklist FOREIGN KEY (checklist_id) REFERENCES m17_close_checklist(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 8.2 m17_audit_log — Append-only audit trail (LLD §8.2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_audit_log (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  occurred_at_utc     DATETIME(3) NOT NULL,
  user_id             BIGINT NOT NULL,
  action              ENUM('CREATE','UPDATE','POST','REVERSE','VOID','DELETE',
                           'CLOSE_PERIOD','REOPEN_PERIOD','MATCH','UNMATCH','APPROVE','REJECT') NOT NULL,
  entity_type         VARCHAR(50) NOT NULL,
  entity_id           BIGINT NOT NULL,
  before_json         JSON NULL,
  after_json          JSON NULL,
  reason              VARCHAR(500) NULL,
  ip_address          VARCHAR(45) NULL,
  user_agent          VARCHAR(255) NULL,
  INDEX idx_m17_audit_entity (entity_type, entity_id),
  INDEX idx_m17_audit_user_time (user_id, occurred_at_utc),
  INDEX idx_m17_audit_time (occurred_at_utc),
  INDEX idx_m17_audit_tenant (tenant_id, occurred_at_utc)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- 12.x  M17-IN PLUGIN TABLES (India compliance — preserved from v1.0)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 12.2 m17in_gst_rate — HSN/SAC code → GST rate cache (loaded from CBIC master)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17in_gst_rate (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  hsn_code            VARCHAR(20) NOT NULL,
  description         VARCHAR(255) NULL,
  cgst_rate_pct       DECIMAL(5,2) NOT NULL,
  sgst_rate_pct       DECIMAL(5,2) NOT NULL,
  igst_rate_pct       DECIMAL(5,2) NOT NULL,
  cess_rate_pct       DECIMAL(5,2) NOT NULL DEFAULT 0,
  effective_from      DATE NOT NULL,
  effective_to        DATE NULL,
  UNIQUE KEY uq_m17in_gst_hsn_from (hsn_code, effective_from),
  INDEX idx_m17in_gst_hsn (hsn_code, effective_from)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 12.x m17in_invoice_ext — India-specific invoice extensions (LLD §5.2 plugin storage)
-- Stores GST split + IRN reference for IN-tenant invoices.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17in_invoice_ext (
  invoice_id          BIGINT PRIMARY KEY,
  place_of_supply     VARCHAR(2) NULL,                          -- state code
  is_intra_state      TINYINT(1) NOT NULL DEFAULT 0,
  cgst_amount         DECIMAL(18,4) NOT NULL DEFAULT 0,
  sgst_amount         DECIMAL(18,4) NOT NULL DEFAULT 0,
  igst_amount         DECIMAL(18,4) NOT NULL DEFAULT 0,
  cess_amount         DECIMAL(18,4) NOT NULL DEFAULT 0,
  reverse_charge      TINYINT(1) NOT NULL DEFAULT 0,
  is_export           TINYINT(1) NOT NULL DEFAULT 0,
  export_type         ENUM('LUT','WPAY','None') NOT NULL DEFAULT 'None',
  CONSTRAINT fk_m17in_iext_inv FOREIGN KEY (invoice_id) REFERENCES m17_invoice(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 12.3 m17in_irn — IRN issued by IRP for B2B invoices > threshold
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17in_irn (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  invoice_id          BIGINT NOT NULL,
  irn                 CHAR(64) NOT NULL,
  ack_no              VARCHAR(30) NOT NULL,
  ack_date            DATETIME(3) NOT NULL,
  qr_code_b64         MEDIUMTEXT NULL,
  signed_invoice_b64  MEDIUMTEXT NULL,
  irp_provider        VARCHAR(20) NOT NULL,                     -- "NIC1", "NIC2", "IRIS", "GSTHero"
  status              ENUM('Generated','Cancelled','Failed') NOT NULL DEFAULT 'Generated',
  cancelled_at_utc    DATETIME(3) NULL,
  cancel_reason       VARCHAR(255) NULL,
  failure_count       INT NOT NULL DEFAULT 0,
  last_error          VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17in_irn_invoice (invoice_id),
  UNIQUE KEY uq_m17in_irn_value (irn),
  CONSTRAINT fk_m17in_irn_invoice FOREIGN KEY (invoice_id) REFERENCES m17_invoice(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 12.4 m17in_tds_section — TDS sections + rate matrix (LLD §12.4)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17in_tds_section (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  section_code        VARCHAR(20) NOT NULL,                     -- "194C", "194I", "194J", "194Q", "194O", "195", "206C"
  description         VARCHAR(255) NOT NULL,
  payee_type          ENUM('Individual','HUF','Company','Firm','Other') NOT NULL,
  rate_pct            DECIMAL(5,2) NOT NULL,
  threshold_amount    DECIMAL(18,4) NOT NULL DEFAULT 0,
  effective_from      DATE NOT NULL,
  effective_to        DATE NULL,
  UNIQUE KEY uq_m17in_tds_section_payee_from (section_code, payee_type, effective_from)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 12.x m17in_bill_ext — TDS section attached to a bill (per LLD §6.2 plugin extension)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17in_bill_ext (
  bill_id             BIGINT PRIMARY KEY,
  tds_section_code    VARCHAR(20) NULL,                         -- "194C" etc.
  tds_rate_pct        DECIMAL(5,2) NULL,
  tds_amount          DECIMAL(18,4) NOT NULL DEFAULT 0,
  vendor_pan          VARCHAR(10) NULL,
  vendor_gstin        VARCHAR(15) NULL,
  is_reverse_charge   TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_m17in_bext_bill FOREIGN KEY (bill_id) REFERENCES m17_bill(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 12.5 m17in_gstr_run — GSTR-1 / 3B / 9 / 9C preparation runs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17in_gstr_run (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  return_type         ENUM('GSTR1','GSTR3B','GSTR9','GSTR9C') NOT NULL,
  period_id           BIGINT NOT NULL,
  prep_date           DATE NOT NULL,
  status              ENUM('Draft','Prepared','Filed','Failed') NOT NULL DEFAULT 'Draft',
  total_taxable       DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_cgst          DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_sgst          DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_igst          DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_cess          DECIMAL(18,4) NOT NULL DEFAULT 0,
  output_json         JSON NULL,
  filed_at_utc        DATETIME(3) NULL,
  ack_reference       VARCHAR(50) NULL,
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17in_gstr_tenant_period_type (tenant_id, period_id, return_type),
  CONSTRAINT fk_m17in_gstr_period FOREIGN KEY (period_id) REFERENCES m17_period(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- End of M17 schema (Core 14 tables + India plugin 5 tables = 19 tables total)
-- ---------------------------------------------------------------------

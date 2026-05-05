-- =====================================================================
-- M17 finish — closes SCM client Milestone 3 gaps on top of M17 base.
--
-- New tables:
--   m17_settlement_link           — invoice ↔ bill cross-link (LLD §11 settlement spec)
--   m17_settlement_reversal       — reverse a posted settlement
--   m17_deposit                   — A/R check deposits + standalone "deposit without A/R"
--   m17_bank_account              — operating bank accounts
--   m17_bank_statement            — monthly bank statement header
--   m17_bank_statement_line       — individual statement lines
--   m17_bank_recon                — reconciliation run header
--   m17_bank_recon_match          — statement-line ↔ payment/receipt matches
--   m17_fund_transfer             — bank→bank transfers
--   m17_voided_check              — voided check tracking
--   m17_check_print_batch         — multi-check print batches
--   m17_invoice_print_batch       — multi-invoice print batches
--   m17_past_due_notice           — past-due dunning notices
--   m17_email_template            — custom + predefined outbound email templates
--   m17_credit_card_payment       — credit-card receipt with photo proof reference
--   m17_general_expense           — general + fixed general expense
--
-- Conventions (CLAUDE.md): tenant_id INT + country_code CHAR(2),
-- module-prefixed FK/UNIQUE/INDEX names, idempotent CREATE TABLE IF NOT EXISTS.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- Settlement link — connects an invoice line (A/R) to a bill line (A/P)
-- so receivable can be tracked even after the receivable is paid/logged.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_settlement_link (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  invoice_line_id     BIGINT NOT NULL,                       -- FK m17_invoice_line
  bill_line_id        BIGINT NOT NULL,                       -- FK m17_bill_line
  linked_amount       DECIMAL(18,4) NOT NULL,
  currency            CHAR(3) NOT NULL,
  notes               VARCHAR(500) NULL,
  status              ENUM('Active','Reversed') NOT NULL DEFAULT 'Active',
  created_at_utc      DATETIME(3) NOT NULL,
  created_by          BIGINT NOT NULL,
  reversed_at_utc     DATETIME(3) NULL,
  reversed_by         BIGINT NULL,
  reversal_reason     VARCHAR(500) NULL,
  UNIQUE KEY uq_m17_sl_inv_bill (invoice_line_id, bill_line_id),
  INDEX idx_m17_sl_tenant_status (tenant_id, status),
  CONSTRAINT fk_m17_sl_inv_line  FOREIGN KEY (invoice_line_id) REFERENCES m17_invoice_line(id) ON DELETE CASCADE,
  CONSTRAINT fk_m17_sl_bill_line FOREIGN KEY (bill_line_id)    REFERENCES m17_bill_line(id)    ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Bank accounts — multiple operating accounts per tenant
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_bank_account (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  account_code        VARCHAR(20) NOT NULL,                  -- internal code: e.g. "BANK-OPER-USD"
  bank_name           VARCHAR(150) NOT NULL,
  account_number_masked VARCHAR(30) NOT NULL,                -- last-4 + masked rest
  account_type        ENUM('Checking','Savings','Money Market','CD','Credit Line') NOT NULL DEFAULT 'Checking',
  currency            CHAR(3) NOT NULL,
  ledger_account_id   BIGINT NULL,                           -- FK m17_account
  routing_number      VARCHAR(20) NULL,
  swift_code          VARCHAR(20) NULL,
  iban                VARCHAR(34) NULL,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  current_balance     DECIMAL(18,2) NOT NULL DEFAULT 0,
  last_recon_date     DATE NULL,
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_ba_tenant_code (tenant_id, account_code),
  INDEX idx_m17_ba_tenant_active (tenant_id, is_active),
  CONSTRAINT fk_m17_ba_currency FOREIGN KEY (currency)         REFERENCES m1_currency(code),
  CONSTRAINT fk_m17_ba_account  FOREIGN KEY (ledger_account_id) REFERENCES m17_account(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Deposit — A/R deposits (when payment_method = check) + standalone
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_deposit (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  deposit_number      VARCHAR(40) NOT NULL,
  deposit_date        DATE NOT NULL,
  bank_account_id     BIGINT NOT NULL,
  amount              DECIMAL(18,2) NOT NULL,
  currency            CHAR(3) NOT NULL,
  source              ENUM('FromAR','Standalone') NOT NULL,  -- "Deposit from A/R" vs "Deposit without A/R"
  receipt_id          BIGINT NULL,                           -- FK m17_receipt when source=FromAR
  customer_party_id   BIGINT NULL,
  check_number        VARCHAR(30) NULL,
  notes               VARCHAR(500) NULL,
  status              ENUM('Pending','Cleared','Reversed','Bounced') NOT NULL DEFAULT 'Pending',
  reversed_at_utc     DATETIME(3) NULL,
  reversal_reason     VARCHAR(500) NULL,
  cleared_at_utc      DATETIME(3) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_dep_tenant_num (tenant_id, deposit_number),
  INDEX idx_m17_dep_tenant_bank (tenant_id, bank_account_id, deposit_date),
  CONSTRAINT fk_m17_dep_bank     FOREIGN KEY (bank_account_id) REFERENCES m17_bank_account(id),
  CONSTRAINT fk_m17_dep_receipt  FOREIGN KEY (receipt_id)      REFERENCES m17_receipt(id),
  CONSTRAINT fk_m17_dep_currency FOREIGN KEY (currency)        REFERENCES m1_currency(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Bank statement (monthly + reconciliation)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_bank_statement (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  bank_account_id     BIGINT NOT NULL,
  statement_period    VARCHAR(7) NOT NULL,                   -- "2026-05" — YYYY-MM
  statement_date      DATE NOT NULL,
  opening_balance     DECIMAL(18,2) NOT NULL,
  closing_balance     DECIMAL(18,2) NOT NULL,
  total_debits        DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_credits       DECIMAL(18,2) NOT NULL DEFAULT 0,
  source              ENUM('Manual','BAI2','OFX','CSV','MT940') NOT NULL DEFAULT 'Manual',
  document_id         BIGINT NULL,                           -- FK m21_document
  uploaded_at_utc     DATETIME(3) NOT NULL,
  uploaded_by         BIGINT NOT NULL,
  UNIQUE KEY uq_m17_bs_acct_period (bank_account_id, statement_period),
  INDEX idx_m17_bs_tenant_date (tenant_id, statement_date),
  CONSTRAINT fk_m17_bs_bank FOREIGN KEY (bank_account_id) REFERENCES m17_bank_account(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m17_bank_statement_line (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  statement_id        BIGINT NOT NULL,
  line_date           DATE NOT NULL,
  description         VARCHAR(255) NOT NULL,
  reference           VARCHAR(100) NULL,
  amount              DECIMAL(18,2) NOT NULL,                -- negative for debits, positive for credits
  running_balance     DECIMAL(18,2) NULL,
  is_matched          TINYINT(1) NOT NULL DEFAULT 0,
  match_confidence    DECIMAL(5,2) NULL,                     -- 0-100 for auto-match suggestions
  INDEX idx_m17_bsl_stmt (statement_id),
  INDEX idx_m17_bsl_unmatched (statement_id, is_matched),
  CONSTRAINT fk_m17_bsl_stmt FOREIGN KEY (statement_id) REFERENCES m17_bank_statement(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m17_bank_recon (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  bank_account_id     BIGINT NOT NULL,
  statement_id        BIGINT NOT NULL,
  recon_date          DATE NOT NULL,
  status              ENUM('Draft','InProgress','Completed','Discrepancy') NOT NULL DEFAULT 'Draft',
  book_balance        DECIMAL(18,2) NOT NULL,
  bank_balance        DECIMAL(18,2) NOT NULL,
  difference          DECIMAL(18,2) NOT NULL,
  matched_count       INT NOT NULL DEFAULT 0,
  unmatched_count     INT NOT NULL DEFAULT 0,
  notes               VARCHAR(500) NULL,
  completed_at_utc    DATETIME(3) NULL,
  completed_by        BIGINT NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_br_acct_stmt (bank_account_id, statement_id),
  INDEX idx_m17_br_tenant_date (tenant_id, recon_date),
  CONSTRAINT fk_m17_br_bank FOREIGN KEY (bank_account_id) REFERENCES m17_bank_account(id),
  CONSTRAINT fk_m17_br_stmt FOREIGN KEY (statement_id)    REFERENCES m17_bank_statement(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m17_bank_recon_match (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  recon_id            BIGINT NOT NULL,
  statement_line_id   BIGINT NOT NULL,
  match_target_kind   ENUM('Receipt','Payment','Deposit','Transfer','VoidedCheck','Adjustment') NOT NULL,
  match_target_id     BIGINT NOT NULL,
  matched_amount      DECIMAL(18,2) NOT NULL,
  is_auto             TINYINT(1) NOT NULL DEFAULT 0,
  matched_at_utc      DATETIME(3) NOT NULL,
  matched_by          BIGINT NULL,
  UNIQUE KEY uq_m17_brm_recon_line (recon_id, statement_line_id),
  INDEX idx_m17_brm_target (match_target_kind, match_target_id),
  CONSTRAINT fk_m17_brm_recon FOREIGN KEY (recon_id)          REFERENCES m17_bank_recon(id) ON DELETE CASCADE,
  CONSTRAINT fk_m17_brm_line  FOREIGN KEY (statement_line_id) REFERENCES m17_bank_statement_line(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Fund transfer between bank accounts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_fund_transfer (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  transfer_number     VARCHAR(40) NOT NULL,
  transfer_date       DATE NOT NULL,
  from_bank_id        BIGINT NOT NULL,
  to_bank_id          BIGINT NOT NULL,
  amount              DECIMAL(18,2) NOT NULL,
  currency            CHAR(3) NOT NULL,
  fx_rate             DECIMAL(18,8) NOT NULL DEFAULT 1,
  to_amount           DECIMAL(18,2) NOT NULL,                -- amount * fx_rate
  bank_reference      VARCHAR(100) NULL,
  notes               VARCHAR(500) NULL,
  status              ENUM('Pending','Sent','Cleared','Failed','Cancelled') NOT NULL DEFAULT 'Pending',
  posted_journal_id   BIGINT NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_ft_tenant_num (tenant_id, transfer_number),
  INDEX idx_m17_ft_tenant_date (tenant_id, transfer_date),
  CONSTRAINT fk_m17_ft_from FOREIGN KEY (from_bank_id) REFERENCES m17_bank_account(id),
  CONSTRAINT fk_m17_ft_to   FOREIGN KEY (to_bank_id)   REFERENCES m17_bank_account(id),
  CONSTRAINT fk_m17_ft_currency FOREIGN KEY (currency) REFERENCES m1_currency(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Voided checks (without A/P)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_voided_check (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  bank_account_id     BIGINT NOT NULL,
  check_number        VARCHAR(30) NOT NULL,
  void_date           DATE NOT NULL,
  original_payment_id BIGINT NULL,                           -- FK m17_payment if it was originally for an AP bill
  amount              DECIMAL(18,2) NULL,                    -- nullable for "print check without A/P" case
  payee               VARCHAR(255) NULL,
  void_reason         ENUM('Misprint','Lost','Stale','PrintTest','UserVoid','Other') NOT NULL DEFAULT 'Other',
  notes               VARCHAR(500) NULL,
  voided_by           BIGINT NOT NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_vc_bank_check (bank_account_id, check_number),
  INDEX idx_m17_vc_tenant_date (tenant_id, void_date),
  CONSTRAINT fk_m17_vc_bank    FOREIGN KEY (bank_account_id)     REFERENCES m17_bank_account(id),
  CONSTRAINT fk_m17_vc_payment FOREIGN KEY (original_payment_id) REFERENCES m17_payment(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Multi-print batches (checks + invoices)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_check_print_batch (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  batch_number        VARCHAR(40) NOT NULL,
  bank_account_id     BIGINT NOT NULL,
  print_date          DATE NOT NULL,
  starting_check_no   VARCHAR(30) NOT NULL,
  check_count         INT NOT NULL,
  total_amount        DECIMAL(18,2) NOT NULL,
  payment_ids_json    JSON NOT NULL,                         -- list of m17_payment IDs in batch
  status              ENUM('Pending','Printed','Cancelled') NOT NULL DEFAULT 'Pending',
  printed_at_utc      DATETIME(3) NULL,
  printed_by          BIGINT NULL,
  document_id         BIGINT NULL,                           -- FK m21_document for the printed PDF
  created_at_utc      DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_cpb_tenant_num (tenant_id, batch_number),
  CONSTRAINT fk_m17_cpb_bank FOREIGN KEY (bank_account_id) REFERENCES m17_bank_account(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m17_invoice_print_batch (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  batch_number        VARCHAR(40) NOT NULL,
  print_date          DATE NOT NULL,
  invoice_count       INT NOT NULL,
  invoice_ids_json    JSON NOT NULL,                         -- list of m17_invoice IDs
  status              ENUM('Pending','Printed','Sent','Cancelled') NOT NULL DEFAULT 'Pending',
  delivery_method     ENUM('Print','Email','Both') NOT NULL DEFAULT 'Print',
  printed_at_utc      DATETIME(3) NULL,
  document_id         BIGINT NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_ipb_tenant_num (tenant_id, batch_number)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Past-due notice (dunning)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_past_due_notice (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  notice_number       VARCHAR(40) NOT NULL,
  customer_party_id   BIGINT NOT NULL,
  notice_level        ENUM('First','Second','Final','LegalAction') NOT NULL DEFAULT 'First',
  total_overdue_amount DECIMAL(18,2) NOT NULL,
  currency            CHAR(3) NOT NULL,
  invoice_count       INT NOT NULL,
  invoice_ids_json    JSON NOT NULL,
  generated_at        DATE NOT NULL,
  sent_at_utc         DATETIME(3) NULL,
  delivery_method     ENUM('Email','Print','Both') NOT NULL DEFAULT 'Email',
  status              ENUM('Draft','Sent','Acknowledged','Resolved') NOT NULL DEFAULT 'Draft',
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_pdn_tenant_num (tenant_id, notice_number),
  INDEX idx_m17_pdn_customer (tenant_id, customer_party_id, generated_at),
  CONSTRAINT fk_m17_pdn_customer FOREIGN KEY (customer_party_id) REFERENCES m1_party(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Email templates (custom + predefined)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_email_template (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  template_code       VARCHAR(50) NOT NULL,
  template_name       VARCHAR(150) NOT NULL,
  category            ENUM('Invoice','PastDue','Statement','Receipt','PaymentRemittance','Custom') NOT NULL,
  subject_template    VARCHAR(255) NOT NULL,                 -- supports {{ placeholder }}
  body_template       MEDIUMTEXT NOT NULL,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  is_predefined       TINYINT(1) NOT NULL DEFAULT 0,
  available_placeholders_json JSON NULL,                     -- list of supported {{ }} keys
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_et_tenant_code (tenant_id, template_code),
  INDEX idx_m17_et_tenant_cat (tenant_id, category, is_active)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Credit card payment with photo proof
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_credit_card_payment (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  receipt_id          BIGINT NULL,                           -- FK m17_receipt (when AR) or NULL when standalone
  payment_id          BIGINT NULL,                           -- FK m17_payment (when AP)
  card_brand          ENUM('Visa','MasterCard','Amex','Discover','Other') NOT NULL,
  last_four           CHAR(4) NOT NULL,
  authorization_code  VARCHAR(30) NULL,
  transaction_id      VARCHAR(60) NOT NULL,
  amount              DECIMAL(18,2) NOT NULL,
  currency            CHAR(3) NOT NULL,
  proof_kind          ENUM('PhotoFromApp','OnlineDocument','PhysicalSlip') NOT NULL DEFAULT 'OnlineDocument',
  proof_document_id   BIGINT NULL,                           -- FK m21_document
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_ccp_txn (tenant_id, transaction_id),
  INDEX idx_m17_ccp_receipt (receipt_id),
  INDEX idx_m17_ccp_payment (payment_id),
  CONSTRAINT fk_m17_ccp_receipt FOREIGN KEY (receipt_id) REFERENCES m17_receipt(id),
  CONSTRAINT fk_m17_ccp_payment FOREIGN KEY (payment_id) REFERENCES m17_payment(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- General + Fixed General Expense
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m17_general_expense (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  expense_number      VARCHAR(40) NOT NULL,
  expense_date        DATE NOT NULL,
  expense_kind        ENUM('General','FixedGeneral') NOT NULL,
  description         VARCHAR(255) NOT NULL,
  expense_account_id  BIGINT NOT NULL,                       -- FK m17_account
  amount              DECIMAL(18,2) NOT NULL,
  currency            CHAR(3) NOT NULL,
  recurrence          ENUM('OneTime','Monthly','Quarterly','Yearly') NOT NULL DEFAULT 'OneTime',
  next_recur_date     DATE NULL,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  notes               VARCHAR(500) NULL,
  posted_journal_id   BIGINT NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m17_ge_tenant_num (tenant_id, expense_number),
  INDEX idx_m17_ge_tenant_date (tenant_id, expense_date),
  CONSTRAINT fk_m17_ge_account FOREIGN KEY (expense_account_id) REFERENCES m17_account(id),
  CONSTRAINT fk_m17_ge_currency FOREIGN KEY (currency)          REFERENCES m1_currency(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

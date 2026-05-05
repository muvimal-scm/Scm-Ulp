-- =====================================================================
-- M17 finish — dev fixtures
-- Tenant 1001 (IN). 3 bank accounts, 1 monthly statement w/ 5 lines,
-- 1 reconciliation in-progress, 2 deposits, 1 fund transfer, 1 voided
-- check, 1 multi-check print batch, 1 multi-invoice print batch,
-- 2 past-due notices, 5 email templates, 1 credit-card payment, 3
-- general expenses (1 fixed monthly, 2 one-time), 1 settlement link.
-- Idempotent: INSERT IGNORE.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- Bank accounts (link to existing m17_account ledger accounts)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_bank_account
  (id, tenant_id, account_code, bank_name, account_number_masked, account_type,
   currency, ledger_account_id, routing_number, swift_code, is_active,
   current_balance, last_recon_date, notes, created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'BANK-HDFC-INR', 'HDFC Bank',  'XXXX-XXXX-1234', 'Checking', 'INR', 1002, 'HDFC0000123', 'HDFCINBB',  1, 8500000.00, '2026-04-30', 'Primary INR operating', '2026-01-01 00:00:00', '2026-05-01 00:00:00'),
  (2, 1001, 'BANK-ICICI-USD','ICICI Bank', 'XXXX-XXXX-5678', 'Checking', 'USD', 1003, 'ICIC0000456', 'ICICINBB',  1,   65000.00, '2026-04-30', 'USD nostro for foreign vendors', '2026-01-01 00:00:00', '2026-05-01 00:00:00'),
  (3, 1001, 'BANK-HDFC-SAV', 'HDFC Bank',  'XXXX-XXXX-9999', 'Savings',  'INR', 1002, 'HDFC0000123', 'HDFCINBB',  1, 1500000.00, '2026-04-30', 'Reserves',                       '2026-01-01 00:00:00', '2026-05-01 00:00:00');

-- ---------------------------------------------------------------------
-- Bank statement (April 2026 for primary HDFC account)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_bank_statement
  (id, tenant_id, bank_account_id, statement_period, statement_date,
   opening_balance, closing_balance, total_debits, total_credits,
   source, uploaded_at_utc, uploaded_by) VALUES
  (1, 1001, 1, '2026-04', '2026-04-30',
   8200000.00, 8500000.00, 450000.00, 750000.00,
   'CSV', '2026-05-01 09:00:00', 1);

INSERT IGNORE INTO m17_bank_statement_line
  (id, statement_id, line_date, description, reference, amount, running_balance) VALUES
  (1, 1, '2026-04-02', 'IMPS-CR FROM RELIANCE',     'IMPS-N0402-12345',   30000.00, 8230000.00),
  (2, 1, '2026-04-15', 'NEFT-DR TO MAERSK',         'NEFT-N0415-67890',  -82400.00, 8147600.00),
  (3, 1, '2026-04-20', 'CHEQUE DEPOSIT TATA STEEL', 'CHQ-DEP-100501',    300000.00, 8447600.00),
  (4, 1, '2026-04-25', 'BANK CHARGES',              'CHG-2604',            -250.00, 8447350.00),
  (5, 1, '2026-04-29', 'INTEREST CREDIT',           'INT-APR',             52650.00, 8500000.00);

-- Reconciliation run (Apr 2026)
INSERT IGNORE INTO m17_bank_recon
  (id, tenant_id, bank_account_id, statement_id, recon_date, status,
   book_balance, bank_balance, difference, matched_count, unmatched_count, notes,
   created_at_utc, modified_at_utc) VALUES
  (1, 1001, 1, 1, '2026-05-01', 'InProgress',
   8500000.00, 8500000.00, 0.00, 3, 2, 'Auto-matched 3/5 lines; 2 need manual match',
   '2026-05-01 10:00:00', '2026-05-01 10:00:00');

-- Sample matches (rows 1, 2, 3 auto-matched; 4 + 5 unmatched for demo)
INSERT IGNORE INTO m17_bank_recon_match
  (recon_id, statement_line_id, match_target_kind, match_target_id, matched_amount, is_auto, matched_at_utc) VALUES
  (1, 1, 'Receipt',  6001, 30000.00, 1, '2026-05-01 10:01:00'),
  (1, 2, 'Payment',  8001, 82400.00, 1, '2026-05-01 10:01:00'),
  (1, 3, 'Deposit',  1,    300000.00, 1, '2026-05-01 10:02:00');

-- ---------------------------------------------------------------------
-- Deposits — 1 from A/R (check from Tata), 1 standalone
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_deposit
  (id, tenant_id, deposit_number, deposit_date, bank_account_id,
   amount, currency, source, receipt_id, customer_party_id, check_number,
   notes, status, cleared_at_utc, created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'DEP-2026-000001', '2026-04-20', 1,
   300000.00, 'INR', 'FromAR', NULL, 101, 'CHQ-100501',
   'Tata Steel cheque deposit', 'Cleared', '2026-04-22 16:00:00', '2026-04-20 11:00:00', '2026-04-22 16:00:00'),
  (2, 1001, 'DEP-2026-000002', '2026-05-02', 1,
    50000.00, 'INR', 'Standalone', NULL, NULL, NULL,
   'Initial owner equity capital injection', 'Pending', NULL, '2026-05-02 14:00:00', '2026-05-02 14:00:00');

-- ---------------------------------------------------------------------
-- Fund transfer (HDFC checking → HDFC savings)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_fund_transfer
  (id, tenant_id, transfer_number, transfer_date, from_bank_id, to_bank_id,
   amount, currency, fx_rate, to_amount, bank_reference, notes, status,
   created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'FT-2026-000001', '2026-05-01', 1, 3,
   500000.00, 'INR', 1.0, 500000.00, 'INTRA-HDFC-2605', 'Move surplus from operating to savings',
   'Cleared', '2026-05-01 11:00:00', '2026-05-01 11:30:00');

-- ---------------------------------------------------------------------
-- Voided check (misprint)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_voided_check
  (id, tenant_id, bank_account_id, check_number, void_date,
   original_payment_id, amount, payee, void_reason, notes, voided_by,
   created_at_utc) VALUES
  (1, 1001, 1, 'CHK-100051', '2026-05-02',
   NULL, 25000.00, 'Misprint - test alignment',
   'Misprint', 'Printer alignment test; check invalidated', 1,
   '2026-05-02 09:30:00');

-- ---------------------------------------------------------------------
-- Print batches (multi-check + multi-invoice)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_check_print_batch
  (id, tenant_id, batch_number, bank_account_id, print_date, starting_check_no,
   check_count, total_amount, payment_ids_json, status, printed_at_utc,
   printed_by, created_at_utc) VALUES
  (1, 1001, 'CPB-2026-000001', 1, '2026-05-02', 'CHK-100052',
   1, 82400.00, JSON_ARRAY(8001), 'Printed', '2026-05-02 11:00:00',
   1, '2026-05-02 10:30:00');

INSERT IGNORE INTO m17_invoice_print_batch
  (id, tenant_id, batch_number, print_date, invoice_count, invoice_ids_json,
   status, delivery_method, printed_at_utc, created_at_utc) VALUES
  (1, 1001, 'IPB-2026-000001', '2026-05-02', 3, JSON_ARRAY(5001, 5002, 5003),
   'Sent', 'Both', '2026-05-02 15:00:00', '2026-05-02 14:30:00');

-- ---------------------------------------------------------------------
-- Past-due notices (Tata + Reliance)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_past_due_notice
  (id, tenant_id, notice_number, customer_party_id, notice_level,
   total_overdue_amount, currency, invoice_count, invoice_ids_json,
   generated_at, sent_at_utc, delivery_method, status,
   notes, created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'PDN-2026-000001', 101, 'First',
   29500.00, 'INR', 1, JSON_ARRAY(5003),
   '2026-05-03', '2026-05-03 09:00:00', 'Email', 'Sent',
   'Invoice INV-2026-000003 overdue by 3 days', '2026-05-03 09:00:00', '2026-05-03 09:00:00'),
  (2, 1001, 'PDN-2026-000002', 102, 'First',
   29000.00, 'INR', 1, JSON_ARRAY(5002),
   '2026-05-03', NULL, 'Email', 'Draft',
   'Reliance partial payment outstanding', '2026-05-03 09:30:00', '2026-05-03 09:30:00');

-- ---------------------------------------------------------------------
-- Email templates (5 predefined + 1 custom)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_email_template
  (tenant_id, template_code, template_name, category, subject_template, body_template,
   is_active, is_predefined, available_placeholders_json, created_at_utc, modified_at_utc) VALUES
  (1001, 'INVOICE_DEFAULT', 'Invoice (default)', 'Invoice',
   'Invoice {{ invoice_number }} from {{ tenant_name }}',
   'Dear {{ customer_name }},\n\nPlease find attached invoice {{ invoice_number }} for {{ currency }} {{ total_amount }}.\nDue date: {{ due_date }}.\n\nRegards,\n{{ tenant_name }}',
   1, 1, JSON_ARRAY('invoice_number','customer_name','currency','total_amount','due_date','tenant_name'),
   '2026-05-03 00:00:00', '2026-05-03 00:00:00'),
  (1001, 'PAST_DUE_FIRST', 'Past Due — first reminder', 'PastDue',
   'Past due reminder — {{ invoice_count }} invoice(s) outstanding',
   'Dear {{ customer_name }},\n\nOur records show that {{ invoice_count }} invoice(s) totaling {{ currency }} {{ total_overdue }} are past due.\nPlease arrange payment at your earliest convenience.\n\nRegards,\nAccounts Receivable',
   1, 1, JSON_ARRAY('customer_name','invoice_count','currency','total_overdue'),
   '2026-05-03 00:00:00', '2026-05-03 00:00:00'),
  (1001, 'PAST_DUE_FINAL', 'Past Due — final notice', 'PastDue',
   'FINAL NOTICE — {{ invoice_count }} invoice(s) past due',
   'Dear {{ customer_name }},\n\nThis is a FINAL NOTICE for overdue amount {{ currency }} {{ total_overdue }}.\nPlease remit immediately to avoid further action.\n\nRegards,\nAccounts Receivable',
   1, 1, JSON_ARRAY('customer_name','invoice_count','currency','total_overdue'),
   '2026-05-03 00:00:00', '2026-05-03 00:00:00'),
  (1001, 'STATEMENT_MONTHLY', 'Statement of Account (monthly)', 'Statement',
   'Statement of Account — {{ period }}',
   'Dear {{ customer_name }},\n\nAttached is your statement of account for {{ period }}.\nOpening balance: {{ opening_balance }}\nClosing balance: {{ closing_balance }}\n\nRegards,\nAccounts Receivable',
   1, 1, JSON_ARRAY('customer_name','period','opening_balance','closing_balance'),
   '2026-05-03 00:00:00', '2026-05-03 00:00:00'),
  (1001, 'RECEIPT_ACK', 'Receipt acknowledgement', 'Receipt',
   'Payment received — {{ receipt_number }}',
   'Dear {{ customer_name }},\n\nWe acknowledge receipt of {{ currency }} {{ amount }} via {{ payment_method }}.\nReceipt number: {{ receipt_number }}.\n\nThank you,\nAccounts',
   1, 1, JSON_ARRAY('customer_name','currency','amount','payment_method','receipt_number'),
   '2026-05-03 00:00:00', '2026-05-03 00:00:00'),
  (1001, 'CUSTOM_FESTIVE', 'Festive greeting (custom)', 'Custom',
   'Wishing you a happy {{ festival_name }}!',
   'Dear {{ customer_name }},\n\nOn behalf of {{ tenant_name }}, wishing you a wonderful {{ festival_name }}!\n\nRegards,\n{{ tenant_name }}',
   1, 0, JSON_ARRAY('customer_name','tenant_name','festival_name'),
   '2026-05-03 00:00:00', '2026-05-03 00:00:00');

-- ---------------------------------------------------------------------
-- Credit card payment (with photo proof reference)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_credit_card_payment
  (id, tenant_id, receipt_id, payment_id, card_brand, last_four,
   authorization_code, transaction_id, amount, currency,
   proof_kind, proof_document_id, notes, created_at_utc) VALUES
  (1, 1001, NULL, NULL, 'Visa', '4242',
   'AUTH-XYZ-12345', 'TXN-RZP-00067890', 15000.00, 'INR',
   'PhotoFromApp', NULL, 'Captured via mobile app — photo of POS receipt',
   '2026-05-02 16:00:00');

-- ---------------------------------------------------------------------
-- Settlement link — INV-2026-000001 line linked to BILL-2026-000001 line
-- (receivable from Tata cross-linked to payable to Maersk for the same shipment)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_settlement_link
  (tenant_id, invoice_line_id, bill_line_id, linked_amount, currency, notes,
   status, created_at_utc, created_by) VALUES
  (1001, 1, 1, 80000.00, 'INR', 'Cross-link: Tata invoice line 1 ↔ Maersk bill line 1 (same shipment 1)',
   'Active', '2026-05-03 10:00:00', 1);

-- ---------------------------------------------------------------------
-- General expenses (3 — 1 fixed monthly rent, 2 one-time)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_general_expense
  (tenant_id, expense_number, expense_date, expense_kind, description,
   expense_account_id, amount, currency, recurrence, next_recur_date, is_active,
   notes, created_at_utc, modified_at_utc) VALUES
  (1001, 'GE-2026-000001', '2026-05-01', 'FixedGeneral', 'Office rent (monthly)',
   1042, 75000.00, 'INR', 'Monthly', '2026-06-01', 1,
   'Mumbai office rent', '2026-05-01 09:00:00', '2026-05-01 09:00:00'),
  (1001, 'GE-2026-000002', '2026-05-02', 'General', 'Stationery purchase',
   1044, 5000.00, 'INR', 'OneTime', NULL, 1,
   'Q2 office supplies', '2026-05-02 11:00:00', '2026-05-02 11:00:00'),
  (1001, 'GE-2026-000003', '2026-05-02', 'General', 'Professional fees - tax consultant',
   1043, 25000.00, 'INR', 'OneTime', NULL, 1,
   'Q4 GST advisory', '2026-05-02 14:00:00', '2026-05-02 14:00:00');

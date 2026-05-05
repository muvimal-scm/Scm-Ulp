-- =====================================================================
-- M17 Accounts — Dev fixtures
--   Tenant 1001 (IN, INR functional, fiscal Apr-Mar)
--   Tenant 2001 (US, USD functional, fiscal Jan-Dec)
--
-- Includes: chart of accounts (universal + IN/US specifics), open period
-- for current fiscal month, FX rates, sample AR invoice (with India GST split
-- + IRN), sample AP bill (with TDS), sample receipt match, sample bill payment,
-- TDS section + GST rate reference data.
-- Idempotent: INSERT IGNORE.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- 1) Chart of Accounts — minimum viable per tenant
--    Account codes follow Ind AS / US GAAP style: 1xxx Assets, 2xxx Liabilities,
--    3xxx Equity, 4xxx Revenue, 5xxx-7xxx Expense, 8xxx Other Income, 9xxx Other Expense.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_account (id, tenant_id, country_code, account_code, account_name, account_class, parent_account_id, is_control_account, is_postable, default_currency, is_active, created_at_utc) VALUES
  -- Tenant 1001 (IN)
  (1001, 1001, 'IN', '1000', 'Cash & Bank',                  'ASSET',     NULL, 0, 0, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1002, 1001, 'IN', '1010', 'Bank — HDFC Current A/c',      'ASSET',     1001, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1003, 1001, 'IN', '1020', 'Bank — ICICI USD A/c',         'ASSET',     1001, 0, 1, 'USD', 1, CURRENT_TIMESTAMP(3)),
  (1004, 1001, 'IN', '1100', 'Accounts Receivable (Trade)',  'ASSET',     NULL, 1, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1005, 1001, 'IN', '1200', 'Input GST',                    'ASSET',     NULL, 0, 0, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1006, 1001, 'IN', '1210', 'Input CGST',                   'ASSET',     1005, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1007, 1001, 'IN', '1220', 'Input SGST',                   'ASSET',     1005, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1008, 1001, 'IN', '1230', 'Input IGST',                   'ASSET',     1005, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1010, 1001, 'IN', '2100', 'Accounts Payable (Trade)',     'LIABILITY', NULL, 1, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1011, 1001, 'IN', '2200', 'Output GST',                   'LIABILITY', NULL, 0, 0, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1012, 1001, 'IN', '2210', 'Output CGST',                  'LIABILITY', 1011, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1013, 1001, 'IN', '2220', 'Output SGST',                  'LIABILITY', 1011, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1014, 1001, 'IN', '2230', 'Output IGST',                  'LIABILITY', 1011, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1015, 1001, 'IN', '2300', 'TDS Payable',                  'LIABILITY', NULL, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1020, 1001, 'IN', '3000', 'Equity',                       'EQUITY',    NULL, 0, 0, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1021, 1001, 'IN', '3100', 'Retained Earnings',            'EQUITY',    1020, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1030, 1001, 'IN', '4000', 'Revenue — Freight Forwarding', 'REVENUE',   NULL, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1031, 1001, 'IN', '4100', 'Revenue — Customs Brokerage',  'REVENUE',   NULL, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1032, 1001, 'IN', '4200', 'Revenue — Other Services',     'REVENUE',   NULL, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1040, 1001, 'IN', '5000', 'COGS — Freight Bought',        'EXPENSE',   NULL, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1041, 1001, 'IN', '6000', 'Salaries & Wages',             'EXPENSE',   NULL, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1042, 1001, 'IN', '6100', 'Rent',                         'EXPENSE',   NULL, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1043, 1001, 'IN', '6200', 'Professional Fees',            'EXPENSE',   NULL, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1044, 1001, 'IN', '6300', 'Office Expenses',              'EXPENSE',   NULL, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1050, 1001, 'IN', '8020', 'FX Gain (Other Income)',       'REVENUE',   NULL, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),
  (1051, 1001, 'IN', '9020', 'FX Loss (Other Expense)',      'EXPENSE',   NULL, 0, 1, 'INR', 1, CURRENT_TIMESTAMP(3)),

  -- Tenant 2001 (US)
  (2001, 2001, 'US', '1000', 'Cash & Bank',                  'ASSET',     NULL, 0, 0, 'USD', 1, CURRENT_TIMESTAMP(3)),
  (2002, 2001, 'US', '1010', 'Bank — Wells Fargo Operating', 'ASSET',     2001, 0, 1, 'USD', 1, CURRENT_TIMESTAMP(3)),
  (2003, 2001, 'US', '1100', 'Accounts Receivable (Trade)',  'ASSET',     NULL, 1, 1, 'USD', 1, CURRENT_TIMESTAMP(3)),
  (2010, 2001, 'US', '2100', 'Accounts Payable (Trade)',     'LIABILITY', NULL, 1, 1, 'USD', 1, CURRENT_TIMESTAMP(3)),
  (2011, 2001, 'US', '2300', 'Sales Tax Payable',            'LIABILITY', NULL, 0, 1, 'USD', 1, CURRENT_TIMESTAMP(3)),
  (2020, 2001, 'US', '3000', 'Equity',                       'EQUITY',    NULL, 0, 0, 'USD', 1, CURRENT_TIMESTAMP(3)),
  (2030, 2001, 'US', '4000', 'Revenue — Freight Forwarding', 'REVENUE',   NULL, 0, 1, 'USD', 1, CURRENT_TIMESTAMP(3)),
  (2040, 2001, 'US', '5000', 'COGS — Freight Bought',        'EXPENSE',   NULL, 0, 1, 'USD', 1, CURRENT_TIMESTAMP(3)),
  (2041, 2001, 'US', '6000', 'Payroll',                      'EXPENSE',   NULL, 0, 1, 'USD', 1, CURRENT_TIMESTAMP(3)),
  (2050, 2001, 'US', '8020', 'FX Gain',                      'REVENUE',   NULL, 0, 1, 'USD', 1, CURRENT_TIMESTAMP(3)),
  (2051, 2001, 'US', '9020', 'FX Loss',                      'EXPENSE',   NULL, 0, 1, 'USD', 1, CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------
-- 2) Periods — IN fiscal Apr 2026 - Mar 2027, US calendar 2026
--    Current period (May 2026 for IN, May 2026 for US) = Open. Earlier = Closed. Later = Future.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_period (id, tenant_id, fiscal_year, period_number, period_name, start_date, end_date, status, closed_at_utc, closed_by, reopened_count) VALUES
  -- IN tenant 1001 — FY 2026-27 starting Apr 2026
  (1101, 1001, 2026,  1, 'Apr-2026', '2026-04-01', '2026-04-30', 'Closed', '2026-05-05 18:30:00', 1, 0),
  (1102, 1001, 2026,  2, 'May-2026', '2026-05-01', '2026-05-31', 'Open',   NULL, NULL, 0),
  (1103, 1001, 2026,  3, 'Jun-2026', '2026-06-01', '2026-06-30', 'Future', NULL, NULL, 0),
  (1104, 1001, 2026,  4, 'Jul-2026', '2026-07-01', '2026-07-31', 'Future', NULL, NULL, 0),
  (1105, 1001, 2026,  5, 'Aug-2026', '2026-08-01', '2026-08-31', 'Future', NULL, NULL, 0),
  (1106, 1001, 2026,  6, 'Sep-2026', '2026-09-01', '2026-09-30', 'Future', NULL, NULL, 0),
  (1107, 1001, 2026,  7, 'Oct-2026', '2026-10-01', '2026-10-31', 'Future', NULL, NULL, 0),
  (1108, 1001, 2026,  8, 'Nov-2026', '2026-11-01', '2026-11-30', 'Future', NULL, NULL, 0),
  (1109, 1001, 2026,  9, 'Dec-2026', '2026-12-01', '2026-12-31', 'Future', NULL, NULL, 0),
  (1110, 1001, 2026, 10, 'Jan-2027', '2027-01-01', '2027-01-31', 'Future', NULL, NULL, 0),
  (1111, 1001, 2026, 11, 'Feb-2027', '2027-02-01', '2027-02-28', 'Future', NULL, NULL, 0),
  (1112, 1001, 2026, 12, 'Mar-2027', '2027-03-01', '2027-03-31', 'Future', NULL, NULL, 0),

  -- US tenant 2001 — calendar year 2026
  (2101, 2001, 2026,  1, 'Jan-2026', '2026-01-01', '2026-01-31', 'Closed', '2026-02-10 23:59:00', 1, 0),
  (2102, 2001, 2026,  2, 'Feb-2026', '2026-02-01', '2026-02-28', 'Closed', '2026-03-10 23:59:00', 1, 0),
  (2103, 2001, 2026,  3, 'Mar-2026', '2026-03-01', '2026-03-31', 'Closed', '2026-04-10 23:59:00', 1, 0),
  (2104, 2001, 2026,  4, 'Apr-2026', '2026-04-01', '2026-04-30', 'Closed', '2026-05-08 23:59:00', 1, 0),
  (2105, 2001, 2026,  5, 'May-2026', '2026-05-01', '2026-05-31', 'Open',   NULL, NULL, 0),
  (2106, 2001, 2026,  6, 'Jun-2026', '2026-06-01', '2026-06-30', 'Future', NULL, NULL, 0),
  (2107, 2001, 2026,  7, 'Jul-2026', '2026-07-01', '2026-07-31', 'Future', NULL, NULL, 0),
  (2108, 2001, 2026,  8, 'Aug-2026', '2026-08-01', '2026-08-31', 'Future', NULL, NULL, 0),
  (2109, 2001, 2026,  9, 'Sep-2026', '2026-09-01', '2026-09-30', 'Future', NULL, NULL, 0),
  (2110, 2001, 2026, 10, 'Oct-2026', '2026-10-01', '2026-10-31', 'Future', NULL, NULL, 0),
  (2111, 2001, 2026, 11, 'Nov-2026', '2026-11-01', '2026-11-30', 'Future', NULL, NULL, 0),
  (2112, 2001, 2026, 12, 'Dec-2026', '2026-12-01', '2026-12-31', 'Future', NULL, NULL, 0);

-- ---------------------------------------------------------------------
-- 3) FX rates — May 2026 spot rates (RBI for IN tenant)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_fx_rate (tenant_id, from_currency, to_currency, rate_date, rate, rate_source, is_period_end, created_at_utc) VALUES
  (1001, 'USD', 'INR', '2026-05-01', 83.40000000, 'RBI', 0, CURRENT_TIMESTAMP(3)),
  (1001, 'USD', 'INR', '2026-05-03', 83.55000000, 'RBI', 0, CURRENT_TIMESTAMP(3)),
  (1001, 'EUR', 'INR', '2026-05-01', 90.20000000, 'RBI', 0, CURRENT_TIMESTAMP(3)),
  (1001, 'INR', 'USD', '2026-05-01',  0.01199041, 'RBI', 0, CURRENT_TIMESTAMP(3)),
  (1001, 'INR', 'INR', '2026-05-03',  1.00000000, 'MANUAL', 0, CURRENT_TIMESTAMP(3)),
  (2001, 'USD', 'USD', '2026-05-03',  1.00000000, 'MANUAL', 0, CURRENT_TIMESTAMP(3)),
  (2001, 'EUR', 'USD', '2026-05-01',  1.08000000, 'FED',    0, CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------
-- 4) GST rate reference (HSN/SAC) — common logistics SAC codes
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17in_gst_rate (hsn_code, description, cgst_rate_pct, sgst_rate_pct, igst_rate_pct, cess_rate_pct, effective_from, effective_to) VALUES
  ('996511', 'Road transport of goods',                      2.50, 2.50,  5.00, 0, '2024-04-01', NULL),
  ('996521', 'Coastal & transoceanic water transport (FCL)', 2.50, 2.50,  5.00, 0, '2024-04-01', NULL),
  ('996531', 'Air transport of goods',                       9.00, 9.00, 18.00, 0, '2024-04-01', NULL),
  ('996713', 'Customs house agent services',                 9.00, 9.00, 18.00, 0, '2024-04-01', NULL),
  ('996721', 'Cargo handling — port and airport',            9.00, 9.00, 18.00, 0, '2024-04-01', NULL),
  ('996791', 'Freight forwarding services',                  9.00, 9.00, 18.00, 0, '2024-04-01', NULL),
  ('996799', 'Other supporting transport services',          9.00, 9.00, 18.00, 0, '2024-04-01', NULL);

-- ---------------------------------------------------------------------
-- 5) TDS sections (LLD §12.4)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17in_tds_section (id, section_code, description, payee_type, rate_pct, threshold_amount, effective_from, effective_to) VALUES
  (1,  '194C', 'Contractor payments',                           'Individual', 1.00,  30000.00, '2024-04-01', NULL),
  (2,  '194C', 'Contractor payments',                           'Company',    2.00,  30000.00, '2024-04-01', NULL),
  (3,  '194I', 'Rent — land/building',                          'Other',     10.00, 240000.00, '2024-04-01', NULL),
  (4,  '194I', 'Rent — plant/machinery',                        'Other',      2.00, 240000.00, '2024-04-01', NULL),
  (5,  '194J', 'Professional services / technical fees',        'Other',     10.00,  30000.00, '2024-04-01', NULL),
  (6,  '194Q', 'Purchase of goods > 50L',                       'Other',      0.10,5000000.00, '2024-04-01', NULL),
  (7,  '194O', 'E-commerce operator',                           'Other',      1.00,      0.00, '2024-04-01', NULL),
  (8,  '195',  'Foreign payments',                              'Other',     20.00,      0.00, '2024-04-01', NULL),
  (9,  '206C', 'TCS on collection (sale of goods)',             'Other',      0.10,5000000.00, '2024-04-01', NULL);

-- ---------------------------------------------------------------------
-- 6) Sample AR invoice (IN, intra-state Maharashtra → Maharashtra, freight forwarding @ 18% IGST split)
--    Tata Steel (party 101) — INR 100,000 + 18% GST split (CGST 9% + SGST 9% = 18,000) = 118,000.
--    Posted, journal not yet created (journal_id NULL keeps it minimal — the post action would create).
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_invoice
  (id, tenant_id, country_code, invoice_number, invoice_date, due_date,
   customer_party_id, currency, func_currency, fx_rate,
   subtotal_amount, tax_amount, discount_amount, total_amount, paid_amount,
   payment_terms, notes, status, posted_at_utc, posted_by,
   source_module, source_record_id, created_at_utc, modified_at_utc) VALUES
  (5001, 1001, 'IN', 'INV-2026-000001', '2026-05-02', '2026-06-01',
   101, 'INR', 'INR', 1.00000000,
   100000.0000, 18000.0000, 0.0000, 118000.0000, 0.0000,
   'NET 30', 'Freight forwarding — Mumbai to Pune (5 shipments)', 'Posted',
   '2026-05-02 14:30:00', 1, 'M5', 1, '2026-05-02 14:00:00', '2026-05-02 14:30:00');

INSERT IGNORE INTO m17_invoice_line
  (invoice_id, line_number, description, hsn_code, quantity, uom_code,
   unit_price_amount, unit_price_currency, line_amount, tax_class, tax_rate_pct, tax_amount, account_id) VALUES
  (5001, 1, 'Freight forwarding — Mumbai to Pune', '996791', 5, 'SHIPMENT',
   20000.0000, 'INR', 100000.0000, 'GST_18', 18.00, 18000.0000, 1030);

INSERT IGNORE INTO m17in_invoice_ext
  (invoice_id, place_of_supply, is_intra_state, cgst_amount, sgst_amount, igst_amount, cess_amount, reverse_charge, is_export, export_type) VALUES
  (5001, '27', 1, 9000.0000, 9000.0000, 0.0000, 0.0000, 0, 0, 'None');

INSERT IGNORE INTO m17in_irn
  (id, invoice_id, irn, ack_no, ack_date, irp_provider, status, created_at_utc) VALUES
  (1, 5001,
   '5e6b3a9c4d7f2e1b8c0a9d5f6e3b1a2c4d7f9e8b6c5a3d1f2e4b7c9a8d6f5e3b',
   '112526051234567', '2026-05-02 14:31:00', 'NIC1', 'Generated', '2026-05-02 14:31:00');

-- ---------------------------------------------------------------------
-- 7) Sample AR invoice — inter-state (Maharashtra → Karnataka) → IGST 18%
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_invoice
  (id, tenant_id, country_code, invoice_number, invoice_date, due_date,
   customer_party_id, currency, func_currency, fx_rate,
   subtotal_amount, tax_amount, discount_amount, total_amount, paid_amount,
   payment_terms, notes, status, posted_at_utc, posted_by,
   source_module, source_record_id, created_at_utc, modified_at_utc) VALUES
  (5002, 1001, 'IN', 'INV-2026-000002', '2026-04-25', '2026-05-25',
   102, 'INR', 'INR', 1.00000000,
    50000.0000,  9000.0000, 0.0000,  59000.0000, 30000.0000,
   'NET 30', 'Customs brokerage — JNPT clearance', 'PartiallyPaid',
   '2026-04-25 11:00:00', 1, 'M5', 2, '2026-04-25 10:30:00', '2026-04-30 16:00:00');

INSERT IGNORE INTO m17_invoice_line
  (invoice_id, line_number, description, hsn_code, quantity, uom_code,
   unit_price_amount, unit_price_currency, line_amount, tax_class, tax_rate_pct, tax_amount, account_id) VALUES
  (5002, 1, 'Customs house agent service', '996713', 1, 'JOB',
   50000.0000, 'INR', 50000.0000, 'GST_18', 18.00, 9000.0000, 1031);

INSERT IGNORE INTO m17in_invoice_ext
  (invoice_id, place_of_supply, is_intra_state, cgst_amount, sgst_amount, igst_amount, cess_amount, reverse_charge, is_export, export_type) VALUES
  (5002, '29', 0, 0.0000, 0.0000, 9000.0000, 0.0000, 0, 0, 'None');

-- ---------------------------------------------------------------------
-- 8) Receipt for invoice 5002 — partial 30,000 received
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_receipt
  (id, tenant_id, country_code, receipt_number, receipt_date, customer_party_id,
   amount, currency, payment_method, bank_reference, unmatched_amount, status,
   notes, created_at_utc, modified_at_utc) VALUES
  (6001, 1001, 'IN', 'RCT-2026-000001', '2026-04-30', 102,
   30000.0000, 'INR', 'NEFT', 'NEFT-N0430202612345', 0.0000, 'Matched',
   'Partial payment from Reliance', '2026-04-30 15:30:00', '2026-04-30 16:00:00');

INSERT IGNORE INTO m17_receipt_match
  (receipt_id, invoice_id, matched_amount, matched_at_utc, matched_by, is_auto) VALUES
  (6001, 5002, 30000.0000, '2026-04-30 16:00:00', 1, 1);

-- ---------------------------------------------------------------------
-- 9) AR invoice — overdue (older period, fully unpaid)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_invoice
  (id, tenant_id, country_code, invoice_number, invoice_date, due_date,
   customer_party_id, currency, func_currency, fx_rate,
   subtotal_amount, tax_amount, discount_amount, total_amount, paid_amount,
   payment_terms, notes, status, posted_at_utc, posted_by,
   source_module, source_record_id, created_at_utc, modified_at_utc) VALUES
  (5003, 1001, 'IN', 'INV-2026-000003', '2026-04-01', '2026-04-30',
   101, 'INR', 'INR', 1.00000000,
    25000.0000,  4500.0000, 0.0000,  29500.0000, 0.0000,
   'NET 30', 'Cargo handling — JNPT (3 containers)', 'Overdue',
   '2026-04-01 10:00:00', 1, 'M5', 3, '2026-04-01 09:30:00', '2026-05-01 00:00:00');

INSERT IGNORE INTO m17_invoice_line
  (invoice_id, line_number, description, hsn_code, quantity, uom_code,
   unit_price_amount, unit_price_currency, line_amount, tax_class, tax_rate_pct, tax_amount, account_id) VALUES
  (5003, 1, 'Cargo handling — JNPT', '996721', 3, 'CONTAINER',
    8333.3333, 'INR', 25000.0000, 'GST_18', 18.00, 4500.0000, 1032);

INSERT IGNORE INTO m17in_invoice_ext
  (invoice_id, place_of_supply, is_intra_state, cgst_amount, sgst_amount, igst_amount, cess_amount, reverse_charge, is_export, export_type) VALUES
  (5003, '27', 1, 2250.0000, 2250.0000, 0.0000, 0.0000, 0, 0, 'None');

-- ---------------------------------------------------------------------
-- 10) AP bill — Maersk India (vendor 103) for ocean freight buy
--     INR 80,000 + 5% IGST = 84,000; TDS 194C (company) 2% on 80,000 = 1,600
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_bill
  (id, tenant_id, country_code, bill_number, internal_number, bill_date, due_date,
   vendor_party_id, currency, func_currency, fx_rate,
   subtotal_amount, tax_amount, withholding_amount, total_amount, paid_amount,
   notes, status, posted_at_utc, posted_by, source_module, source_record_id,
   created_at_utc, modified_at_utc) VALUES
  (7001, 1001, 'IN', 'MIN/2026/04/0089', 'BILL-2026-000001', '2026-04-28', '2026-05-28',
   103, 'INR', 'INR', 1.00000000,
   80000.0000, 4000.0000, 1600.0000, 84000.0000, 0.0000,
   'Ocean freight — JNPT to Singapore (5 TEU)', 'Posted',
   '2026-04-29 10:00:00', 1, 'M5', 1, '2026-04-29 09:30:00', '2026-04-29 10:00:00');

INSERT IGNORE INTO m17_bill_line
  (bill_id, line_number, description, hsn_code, quantity, uom_code,
   unit_price_amount, line_amount, tax_class, tax_rate_pct, tax_amount, account_id) VALUES
  (7001, 1, 'Ocean freight buy — Maersk', '996521', 5, 'TEU',
   16000.0000, 80000.0000, 'GST_5', 5.00, 4000.0000, 1040);

INSERT IGNORE INTO m17in_bill_ext
  (bill_id, tds_section_code, tds_rate_pct, tds_amount, vendor_pan, vendor_gstin, is_reverse_charge) VALUES
  (7001, '194C', 2.00, 1600.0000, 'AABCM1234D', '27AABCM1234D1Z5', 0);

-- ---------------------------------------------------------------------
-- 11) AP bill — Blue Dart courier (vendor 104), small amount, draft
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_bill
  (id, tenant_id, country_code, bill_number, internal_number, bill_date, due_date,
   vendor_party_id, currency, func_currency, fx_rate,
   subtotal_amount, tax_amount, withholding_amount, total_amount, paid_amount,
   notes, status, source_module, source_record_id, created_at_utc, modified_at_utc) VALUES
  (7002, 1001, 'IN', 'BD/2026/05/01122', 'BILL-2026-000002', '2026-05-01', '2026-05-31',
   104, 'INR', 'INR', 1.00000000,
    5000.0000,  900.0000,    0.0000,  5900.0000, 0.0000,
   'Express courier — branch documents', 'Draft', 'manual', NULL,
   '2026-05-01 16:00:00', '2026-05-01 16:00:00');

INSERT IGNORE INTO m17_bill_line
  (bill_id, line_number, description, hsn_code, quantity, uom_code,
   unit_price_amount, line_amount, tax_class, tax_rate_pct, tax_amount, account_id) VALUES
  (7002, 1, 'Express courier shipments', '996791', 10, 'PARCEL',
   500.0000, 5000.0000, 'GST_18', 18.00, 900.0000, 1044);

-- ---------------------------------------------------------------------
-- 12) Payment against bill 7001 — pay 82,400 (= total 84,000 - TDS 1,600 retained)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_payment
  (id, tenant_id, country_code, payment_number, payment_date, vendor_party_id,
   amount, currency, withholding_amount, net_amount, payment_method, bank_reference,
   status, approved_by, approved_at_utc, notes, created_at_utc, modified_at_utc) VALUES
  (8001, 1001, 'IN', 'PAY-2026-000001', '2026-05-02', 103,
   84000.0000, 'INR', 1600.0000, 82400.0000, 'RTGS', 'RTGS-R0502202698765',
   'Sent', 1, '2026-05-02 11:00:00', 'Payment to Maersk net of TDS 194C',
   '2026-05-02 10:30:00', '2026-05-02 11:30:00');

INSERT IGNORE INTO m17_payment_alloc
  (payment_id, bill_id, allocated_amount, allocated_at_utc) VALUES
  (8001, 7001, 84000.0000, '2026-05-02 11:30:00');

-- ---------------------------------------------------------------------
-- 13) Sample US invoice (tenant 2001) — Walmart, USD 25,000, posted, paid
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_invoice
  (id, tenant_id, country_code, invoice_number, invoice_date, due_date,
   customer_party_id, currency, func_currency, fx_rate,
   subtotal_amount, tax_amount, discount_amount, total_amount, paid_amount,
   payment_terms, notes, status, posted_at_utc, posted_by,
   source_module, source_record_id, created_at_utc, modified_at_utc) VALUES
  (5101, 2001, 'US', 'INV-US-2026-00001', '2026-05-01', '2026-06-30',
   201, 'USD', 'USD', 1.00000000,
   25000.0000, 0.0000, 0.0000, 25000.0000, 0.0000,
   'NET 60', 'Freight forwarding — LAX to Chicago', 'Posted',
   '2026-05-01 09:00:00', 1, 'M5', 4, '2026-05-01 08:30:00', '2026-05-01 09:00:00');

INSERT IGNORE INTO m17_invoice_line
  (invoice_id, line_number, description, hsn_code, quantity, uom_code,
   unit_price_amount, unit_price_currency, line_amount, tax_class, tax_rate_pct, tax_amount, account_id) VALUES
  (5101, 1, 'Freight forwarding — LAX to Chicago', NULL, 1, 'JOB',
   25000.0000, 'USD', 25000.0000, 'EXEMPT', 0.00, 0.0000, 2030);

-- ---------------------------------------------------------------------
-- 14) Period close checklist — pre-populated for current open period 1102 (May 2026 IN)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_close_checklist
  (id, tenant_id, period_id, status, started_at_utc, started_by) VALUES
  (1, 1001, 1102, 'NotStarted', NULL, NULL);

INSERT IGNORE INTO m17_close_checklist_item
  (checklist_id, seq_no, item_code, item_label, is_plugin_injected, status) VALUES
  (1,  1, 'AR_INVOICES_POSTED',     'All AR invoices for the month posted',         0, 'Pending'),
  (1,  2, 'AP_BILLS_POSTED',        'All AP bills for the month posted',            0, 'Pending'),
  (1,  3, 'BANK_RECON_COMPLETE',    'Bank reconciliations complete',                0, 'Pending'),
  (1,  4, 'INVENTORY_ADJUSTMENTS',  'Inventory adjustments posted',                 0, 'Pending'),
  (1,  5, 'DEPRECIATION_POSTED',    'Depreciation posted',                          0, 'Pending'),
  (1,  6, 'ACCRUALS_POSTED',        'Accruals posted',                              0, 'Pending'),
  (1,  7, 'PREPAID_AMORTIZATION',   'Prepaid amortization posted',                  0, 'Pending'),
  (1,  8, 'FX_REVALUATION',         'FX revaluation posted (multi-currency)',       0, 'Pending'),
  (1,  9, 'TRIAL_BALANCE_REVIEWED', 'Trial balance reviewed',                       0, 'Pending'),
  (1, 10, 'GST_RECON',              'GST reconciliation (M17-IN plugin)',           1, 'Pending'),
  (1, 11, 'TDS_DEPOSITED',          'TDS deposited per section (M17-IN plugin)',    1, 'Pending'),
  (1, 12, 'GSTR1_PREPARED',         'GSTR-1 prepared (M17-IN plugin)',              1, 'Pending');

-- ---------------------------------------------------------------------
-- End of M17 fixtures
-- ---------------------------------------------------------------------

-- =====================================================================
-- Dev fixtures — dummy data so every Phase 1 UI page has something to show.
-- Idempotent: INSERT IGNORE everywhere.
-- Tenant 1001 (IN) gets the bulk; tenant 2001 (US) gets a smaller mirror.
-- Apply via:
--   docker exec -i ulp-mysql mysql -uroot -pdev_password ulp_dev < db\dev-fixtures\01-dev-fixtures.sql
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- M1 — parties (so M3 vendors have something to attach to)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m1_party
  (id, tenant_id, country_code, party_type, legal_name, trade_name, is_active,
   preferred_locale, preferred_currency, default_payment_terms, tax_status,
   created_at_utc, modified_at_utc) VALUES
  (101, 1001, 'IN', 'CUSTOMER', 'Tata Steel Ltd',          'Tata Steel',     1, 'en-IN', 'INR', 'NET 30', 'Regular GST', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (102, 1001, 'IN', 'CUSTOMER', 'Reliance Industries Ltd', 'Reliance',       1, 'en-IN', 'INR', 'NET 45', 'Regular GST', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (103, 1001, 'IN', 'VENDOR',   'Maersk India Pvt Ltd',    'Maersk IN',      1, 'en-IN', 'USD', 'NET 30', 'Regular GST', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (104, 1001, 'IN', 'VENDOR',   'Blue Dart Express Ltd',   'Blue Dart',      1, 'en-IN', 'INR', 'NET 30', 'Regular GST', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (105, 1001, 'IN', 'VENDOR',   'TVS Logistics Services',  'TVS Logistics',  1, 'en-IN', 'INR', 'NET 60', 'Regular GST', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (106, 1001, 'IN', 'VENDOR',   'DHL Supply Chain India',  'DHL IN',         1, 'en-IN', 'USD', 'NET 30', 'Regular GST', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (107, 1001, 'IN', 'CARRIER',  'Concor — Container Corp', 'CONCOR',         1, 'en-IN', 'INR', 'NET 15', 'Regular GST', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (201, 2001, 'US', 'CUSTOMER', 'Walmart Inc',             'Walmart',        1, 'en-US', 'USD', 'NET 60', 'Tax Exempt',  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (202, 2001, 'US', 'VENDOR',   'FedEx Corporation',       'FedEx',          1, 'en-US', 'USD', 'NET 30', 'Taxable',     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (203, 2001, 'US', 'VENDOR',   'CH Robinson Worldwide',   'CHR',            1, 'en-US', 'USD', 'NET 45', 'Taxable',     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------
-- M3 — vendors (satellite over m1_party)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m3_vendor
  (id, tenant_id, party_id, country_code, vendor_code, status,
   tds_applicable, tds_section, is_msme, is_1099_reportable, w9_on_file,
   risk_tier, sanctions_clear, created_at_utc, modified_at_utc, activated_at_utc) VALUES
  (1, 1001, 103, 'IN', 'VEN-IN-0001', 'Active',                1, '194C', 0, 0, 0, 'Low',      1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, 1001, 104, 'IN', 'VEN-IN-0002', 'Active',                1, '194C', 1, 0, 0, 'Low',      1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, 1001, 105, 'IN', 'VEN-IN-0003', 'OnboardingInProgress',  0, NULL,   1, 0, 0, 'Medium',   0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), NULL),
  (4, 1001, 106, 'IN', 'VEN-IN-0004', 'Suspended',             1, '194J', 0, 0, 0, 'High',     1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (5, 1001, 107, 'IN', 'VEN-IN-0005', 'Active',                1, '194C', 0, 0, 0, 'Low',      1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (6, 2001, 202, 'US', 'VEN-US-0001', 'Active',                0, NULL,   0, 1, 1, 'Low',      1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (7, 2001, 203, 'US', 'VEN-US-0002', 'OnboardingInProgress',  0, NULL,   0, 1, 0, 'Medium',   0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), NULL);

-- M3 categories
INSERT IGNORE INTO m3_vendor_category (tenant_id, vendor_id, category, is_primary) VALUES
  (1001, 1, 'CARRIER_SEA', 1), (1001, 1, 'FREIGHT_FORWARDER', 0),
  (1001, 2, 'CARRIER_AIR', 1), (1001, 2, 'CARRIER_ROAD', 0),
  (1001, 3, 'WAREHOUSE_3PL', 1),
  (1001, 4, 'WAREHOUSE_BONDED', 1), (1001, 4, 'CARRIER_AIR', 0),
  (1001, 5, 'CARRIER_RAIL', 1),
  (2001, 6, 'CARRIER_AIR', 1), (2001, 6, 'CARRIER_ROAD', 0),
  (2001, 7, 'BROKER_NVOCC', 1);

-- M3 onboarding steps for vendor #3 (mid-onboarding)
INSERT IGNORE INTO m3_onboarding_step (tenant_id, vendor_id, step_code, step_name, status, required, performed_at_utc, notes) VALUES
  (1001, 3, 'KYC_DOCS',            'Collect KYC documents',           'Completed', 1, CURRENT_TIMESTAMP(3), 'CIN + GST cert collected'),
  (1001, 3, 'IDENTIFIER_VALIDATE', 'Validate GSTIN/PAN or EIN/W-9',   'Completed', 1, CURRENT_TIMESTAMP(3), 'GSTIN matches PAN'),
  (1001, 3, 'SANCTIONS_SCREEN',    'Sanctions screening',             'InProgress', 1, NULL, NULL),
  (1001, 3, 'BANK_VERIFY',         'Bank account verification',       'Pending',   1, NULL, NULL),
  (1001, 3, 'CREDIT_CHECK',        'Credit bureau check',             'Pending',   0, NULL, NULL),
  (1001, 3, 'AGREEMENT_SIGN',      'MSA / agreement signed',          'Pending',   1, NULL, NULL),
  (1001, 3, 'ACTIVATE',            'Activate vendor',                 'Pending',   1, NULL, NULL);

-- M3 agreements for vendor #1
INSERT IGNORE INTO m3_agreement (tenant_id, vendor_id, agreement_type, agreement_number, title, start_date, end_date, auto_renewal, status, created_at_utc, modified_at_utc, signed_at_utc) VALUES
  (1001, 1, 'MSA',       'MSA-2026-0001', 'Master Services Agreement — Maersk', '2026-01-01', '2027-12-31', 1, 'Active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 1, 'RATE_CARD', 'RC-2026-Q2-001','Q2 2026 Ocean Rate Card',             '2026-04-01', '2026-06-30', 0, 'Active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 2, 'MSA',       'MSA-2025-0011', 'Master Services Agreement — Blue Dart','2025-04-01','2026-03-31',  0, 'Expiring', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- M3 NCRs
INSERT IGNORE INTO m3_ncr (tenant_id, vendor_id, ncr_number, raised_at_utc, raised_by, severity, category, description, status) VALUES
  (1001, 4, 'NCR-2026-001', DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 14 DAY), 1, 'High',     'Late delivery',      'Container DRYU1234567 arrived 6 days late at Mumbai',                       'Open'),
  (1001, 4, 'NCR-2026-002', DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL  7 DAY), 1, 'Medium',   'Documentation',      'BL copy not sent within 24h of vessel sailing — repeat offence',           'InvestigationStarted'),
  (1001, 1, 'NCR-2026-003', DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY), 1, 'Low',      'Damage',             'Minor scuff on case marks; no cargo damage',                                'Closed');

-- M3 performance scores
INSERT IGNORE INTO m3_performance_score (tenant_id, vendor_id, period_start, period_end, on_time_delivery_pct, quality_score, sla_breach_count, ncr_count, overall_score, rating, computed_at_utc, computed_by) VALUES
  (1001, 1, '2026-01-01', '2026-03-31', 96.50, 94.20, 1, 1, 95.10, 'A', CURRENT_TIMESTAMP(3), 'SYSTEM'),
  (1001, 2, '2026-01-01', '2026-03-31', 91.20, 88.40, 3, 0, 89.80, 'B', CURRENT_TIMESTAMP(3), 'SYSTEM'),
  (1001, 4, '2026-01-01', '2026-03-31', 71.50, 78.00, 8, 2, 74.10, 'D', CURRENT_TIMESTAMP(3), 'SYSTEM');

-- ---------------------------------------------------------------------
-- M21 — sample documents pointing at the bucket key namespace.
-- (These won't have real bytes in MinIO, but the table will render.)
-- Need a class id for FK — pick INVOICE (1001 IN) and POD (1001 IN).
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m21_document
  (id, tenant_id, ulid, document_class_id, module_code, module_entity_type, module_entity_id,
   filename, content_type, size_bytes, checksum_sha256,
   storage_container, storage_object_key,
   is_immutable, retain_until_utc, is_deleted,
   created_at_utc, created_by, modified_at_utc, modified_by)
SELECT 1001, t.id, '01HQX5G2J7Y0000000000000A', cls.id, 'M17', 'Invoice', 9001,
       'INV-2026-0001.pdf', 'application/pdf', 184320,
       '0000000000000000000000000000000000000000000000000000000000000000',
       'Invoices', 'tenant-1001/m17/invoice/2026/04/15/01HQX5G2J7Y0000000000000A_INV-2026-0001.pdf',
       1, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 8 YEAR), 0,
       CURRENT_TIMESTAMP(3), 1, CURRENT_TIMESTAMP(3), 1
FROM (SELECT 1001 AS id) t
JOIN m21_document_class cls ON cls.tenant_id = 1001 AND cls.country_code = 'IN' AND cls.code = 'INVOICE'
LIMIT 1;

INSERT IGNORE INTO m21_document
  (id, tenant_id, ulid, document_class_id, module_code, module_entity_type, module_entity_id,
   filename, content_type, size_bytes, checksum_sha256,
   storage_container, storage_object_key,
   is_immutable, retain_until_utc, is_deleted,
   created_at_utc, created_by, modified_at_utc, modified_by)
SELECT 1002, t.id, '01HQX5G2J7Y0000000000000B', cls.id, 'M13', 'Trip', 7001,
       'pod-trip-7001.jpg', 'image/jpeg', 524288,
       '1111111111111111111111111111111111111111111111111111111111111111',
       'PodPhotos', 'tenant-1001/m13/trip/2026/04/20/01HQX5G2J7Y0000000000000B_pod.jpg',
       0, NULL, 0,
       CURRENT_TIMESTAMP(3), 1, CURRENT_TIMESTAMP(3), 1
FROM (SELECT 1001 AS id) t
JOIN m21_document_class cls ON cls.tenant_id = 1001 AND cls.country_code = 'IN' AND cls.code = 'POD'
LIMIT 1;

INSERT IGNORE INTO m21_document
  (id, tenant_id, ulid, document_class_id, module_code, module_entity_type, module_entity_id,
   filename, content_type, size_bytes, checksum_sha256,
   storage_container, storage_object_key,
   is_immutable, retain_until_utc, is_deleted, deleted_at_utc, deleted_by,
   created_at_utc, created_by, modified_at_utc, modified_by)
SELECT 1003, t.id, '01HQX5G2J7Y0000000000000C', cls.id, 'M21', NULL, NULL,
       'old-scan.pdf', 'application/pdf', 65536,
       '2222222222222222222222222222222222222222222222222222222222222222',
       'UserUploads', 'tenant-1001/m21/2026/03/01/01HQX5G2J7Y0000000000000C_old-scan.pdf',
       0, NULL, 1, DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 2 DAY), 1,
       DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY), 1, DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 2 DAY), 1
FROM (SELECT 1001 AS id) t
JOIN m21_document_class cls ON cls.tenant_id = 1001 AND cls.country_code = 'IN' AND cls.code = 'SCAN'
LIMIT 1;

-- Bump quota counters
UPDATE m21_storage_quota
SET bytes_used = (SELECT IFNULL(SUM(size_bytes), 0) FROM m21_document WHERE tenant_id = 1001 AND is_deleted = 0),
    documents_count = (SELECT COUNT(*) FROM m21_document WHERE tenant_id = 1001 AND is_deleted = 0),
    last_recomputed_utc = CURRENT_TIMESTAMP(3)
WHERE tenant_id = 1001;

-- ---------------------------------------------------------------------
-- M27 — preferences + inbox messages (for in-admin@ulp.local user_id=1)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m27_recipient_preference
  (tenant_id, user_id, category, channel, is_subscribed, digest_frequency, created_at_utc, modified_at_utc) VALUES
  (1001, 1, 'shipment',   'EMAIL',  1, 'IMMEDIATE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 1, 'shipment',   'IN_APP', 1, 'IMMEDIATE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 1, 'invoice',    'EMAIL',  1, 'DAILY',     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 1, 'invoice',    'IN_APP', 1, 'IMMEDIATE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 1, 'compliance', 'EMAIL',  1, 'IMMEDIATE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 1, 'system',     'EMAIL',  1, 'WEEKLY',    CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 1, 'system',     'IN_APP', 1, 'IMMEDIATE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m27_in_app_inbox
  (id, tenant_id, user_id, title, body, link_url, icon, category, is_read, created_at_utc) VALUES
  (1, 1001, 1, 'Welcome to ULP', 'Your tenant <b>ULP Dev Tenant — India</b> is now active. Explore the sidebar to get started.', '/app/m26/me', 'check_circle', 'system', 0, DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 HOUR)),
  (2, 1001, 1, 'Vendor VEN-IN-0003 onboarding paused', 'Sanctions screening is in progress. The bank-verify step will start once cleared.', '/app/m3/3', 'pending', 'compliance', 0, DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 30 MINUTE)),
  (3, 1001, 1, 'Invoice INV-2026-0001 issued', 'Tata Steel — INR 12,40,000 — due 2026-05-15.', '/app/m21', 'receipt', 'invoice', 0, DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 15 MINUTE)),
  (4, 1001, 1, 'NCR-2026-001 raised against VEN-IN-0004', 'Severity High · Late delivery · Container 6 days late at Mumbai.', '/app/m3/4', 'warning', 'compliance', 1, DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 2 DAY)),
  (5, 1001, 1, 'Storage quota at 0.07%', 'You have used 0.7 MB of 10 GB. Plenty of headroom.', '/app/m21', 'cloud', 'system', 1, DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 4 DAY));

-- ---------------------------------------------------------------------
-- M14 — sample rate cards, lines, surcharges, contracts, quotes
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m14_rate_card
  (id, tenant_id, country_code, card_number, card_type, scope, party_id,
   service_type, valid_from, valid_to, currency, status, created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'IN', 'RC-2026-Q2-OCEAN',   'SELL', 'GENERAL', NULL, 'OCEAN_FCL',   '2026-04-01', '2026-06-30', 'USD', 'Active',   CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, 1001, 'IN', 'RC-2026-Q2-AIR',     'SELL', 'GENERAL', NULL, 'AIR_EXPRESS', '2026-04-01', '2026-06-30', 'USD', 'Active',   CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, 1001, 'IN', 'RC-MAERSK-BUY-2026', 'BUY',  'VENDOR',  103,  'OCEAN_FCL',   '2026-04-01', '2027-03-31', 'USD', 'Approved', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (4, 1001, 'IN', 'RC-2025-Q4-OCEAN',   'SELL', 'GENERAL', NULL, 'OCEAN_FCL',   '2025-10-01', '2025-12-31', 'USD', 'Expired',  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (5, 2001, 'US', 'RC-US-2026-AIR',     'SELL', 'GENERAL', NULL, 'AIR_EXPRESS', '2026-04-01', '2026-12-31', 'USD', 'Active',   CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m14_rate_card_line
  (rate_card_id, line_number, charge_code, description, uom_code, rate_amount, rate_currency, is_taxable) VALUES
  (1, 1, 'OCEAN_FREIGHT',     'Ocean freight (FCL 20ft)',          'TEU', 1850.00, 'USD', 1),
  (1, 2, 'OCEAN_FREIGHT_40',  'Ocean freight (FCL 40ft)',          'TEU', 2950.00, 'USD', 1),
  (1, 3, 'BAF',               'Bunker adjustment factor',           'TEU',  185.00, 'USD', 1),
  (1, 4, 'THC_ORIGIN',        'Terminal handling - origin',         'TEU',  120.00, 'USD', 1),
  (1, 5, 'THC_DEST',          'Terminal handling - destination',    'TEU',  140.00, 'USD', 1),
  (1, 6, 'DOC_FEE',           'Documentation fee',                  'FLAT',  60.00, 'USD', 1),
  (2, 1, 'AIR_FREIGHT',       'Air freight (general cargo)',        'KG',     4.85, 'USD', 1),
  (2, 2, 'FUEL_SURCHARGE',    'Fuel surcharge',                     'KG',     0.55, 'USD', 1),
  (2, 3, 'SECURITY',          'Security surcharge',                 'KG',     0.18, 'USD', 1),
  (2, 4, 'AWB_FEE',           'Airway bill fee',                    'FLAT',  35.00, 'USD', 1),
  (3, 1, 'OCEAN_FREIGHT',     'Maersk FCL 20ft (buy)',              'TEU', 1480.00, 'USD', 0),
  (3, 2, 'OCEAN_FREIGHT_40',  'Maersk FCL 40ft (buy)',              'TEU', 2380.00, 'USD', 0);

INSERT IGNORE INTO m14_rate_breakpoint (rate_line_id, from_qty, to_qty, rate_amount, rate_currency)
SELECT l.id, 0,   100,  5.20, 'USD' FROM m14_rate_card_line l WHERE l.rate_card_id = 2 AND l.charge_code = 'AIR_FREIGHT';
INSERT IGNORE INTO m14_rate_breakpoint (rate_line_id, from_qty, to_qty, rate_amount, rate_currency)
SELECT l.id, 100, 500,  4.85, 'USD' FROM m14_rate_card_line l WHERE l.rate_card_id = 2 AND l.charge_code = 'AIR_FREIGHT';
INSERT IGNORE INTO m14_rate_breakpoint (rate_line_id, from_qty, to_qty, rate_amount, rate_currency)
SELECT l.id, 500, NULL, 4.40, 'USD' FROM m14_rate_card_line l WHERE l.rate_card_id = 2 AND l.charge_code = 'AIR_FREIGHT';

INSERT IGNORE INTO m14_surcharge (tenant_id, code, name, surcharge_type, amount, currency, percent, valid_from, valid_to, is_active) VALUES
  (1001, 'BAF',  'Bunker Adjustment Factor',  'PER_UNIT',         185.00, 'USD', NULL,    '2026-04-01', '2026-06-30', 1),
  (1001, 'CAF',  'Currency Adjustment Factor','PERCENT_FREIGHT',  NULL,    NULL, 4.5000, '2026-04-01', '2026-06-30', 1),
  (1001, 'WAR',  'War risk surcharge',        'PERCENT_FREIGHT',  NULL,    NULL, 1.2500, '2026-01-01',  NULL,        1),
  (1001, 'PEAK', 'Peak season surcharge',     'FIXED',            250.00, 'USD', NULL,    '2026-06-01', '2026-09-30', 0);

INSERT IGNORE INTO m14_contract
  (tenant_id, contract_number, customer_party_id, rate_card_id, start_date, end_date, auto_renew, payment_terms, status, created_at_utc, modified_at_utc) VALUES
  (1001, 'CON-TATA-2026-001',     101, 1, '2026-04-01', '2027-03-31', 1, 'NET 30', 'Active',   CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 'CON-RELIANCE-2026-002', 102, 1, '2026-01-01', '2026-12-31', 0, 'NET 45', 'Expiring', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m14_quote
  (id, tenant_id, quote_number, customer_party_id, enquiry_ref, status,
   service_type, total_amount, total_currency, valid_until, notes,
   created_by, created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'Q-2026-04-0001', 101, 'ENQ-001', 'Sent',     'OCEAN_FCL',  6620.00, 'USD', '2026-05-15', 'Mumbai - Rotterdam, 2 x 40ft FCL', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, 1001, 'Q-2026-04-0002', 102, 'ENQ-002', 'Draft',    'AIR_EXPRESS',1430.00, 'USD', '2026-05-20', 'Bengaluru - JFK, 250kg',           1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, 1001, 'Q-2026-03-0099', 101, 'ENQ-098', 'Accepted', 'OCEAN_FCL',  5800.00, 'USD', '2026-04-10', 'Mumbai - Hamburg, 1 x 40ft FCL',   1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m14_quote_line (quote_id, line_number, charge_code, description, quantity, uom_code, unit_price, amount, currency, rate_card_id) VALUES
  (1, 1, 'OCEAN_FREIGHT_40', '40ft FCL Mumbai - Rotterdam', 2,   'TEU',  2950.00, 5900.00, 'USD', 1),
  (1, 2, 'BAF',              'Bunker adjustment',            2,   'TEU',   185.00,  370.00, 'USD', 1),
  (1, 3, 'DOC_FEE',          'Documentation',                1,   'FLAT',   60.00,   60.00, 'USD', 1),
  (1, 4, 'THC_ORIGIN',       'THC origin',                   2,   'TEU',   120.00,  240.00, 'USD', 1),
  (1, 5, 'THC_DEST',         'THC destination',              0.36,'TEU',   140.00,   50.00, 'USD', 1),
  (2, 1, 'AIR_FREIGHT',      'Air freight 250kg',            250, 'KG',      4.85, 1212.50, 'USD', 2),
  (2, 2, 'FUEL_SURCHARGE',   'Fuel surcharge',               250, 'KG',      0.55,  137.50, 'USD', 2),
  (2, 3, 'AWB_FEE',          'AWB fee',                      1,   'FLAT',   35.00,   35.00, 'USD', 2),
  (2, 4, 'SECURITY',         'Security surcharge',           250, 'KG',      0.18,   45.00, 'USD', 2);

-- ---------------------------------------------------------------------
-- M5 Freight Forwarding fixtures
-- 4 bookings (2 IN ocean + 1 IN air + 1 US ocean), 4 shipments, MBL/HBL/AWB,
-- 4 containers, milestones spanning the lifecycle, charge ledger.
-- Carrier party_id 107 = CONCOR (IN), 202 = FedEx (US), 103 = Maersk India.
-- Customer party_id 101 = Tata Steel (IN), 102 = Reliance (IN), 201 = Walmart (US).
-- Ports: 1=INNSA, 5=INBOM, 9=INDEL, 13=USLAX, 14=USNYC, 19=USJFK
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m5_booking
  (id, tenant_id, country_code, booking_number, customer_party_id,
   shipper_party_id, consignee_party_id,
   trade_direction, mode, service_type, incoterm,
   origin_port_id, destination_port_id,
   expected_pickup_date, expected_delivery_date, status,
   total_pieces, total_gross_weight_kg, total_volume_cbm,
   declared_value_amount, declared_value_currency, remarks,
   created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'IN', 'BK-2026-04-0001', 101, 101, NULL,
     'EXPORT', 'OCEAN_FCL', 'PORT_PORT', 'FOB', 1, 13,
     '2026-04-15','2026-05-12','Confirmed',
     480, 21500.000, 132.0000, 240000.0000,'USD','Tata Steel coils Mumbai → LA',
     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, 1001, 'IN', 'BK-2026-04-0002', 102, 102, NULL,
     'EXPORT', 'OCEAN_FCL', 'DOOR_PORT', 'CIF', 5, 14,
     '2026-04-20','2026-05-18','InTransit',
     320, 18200.000, 124.0000, 195000.0000,'USD','Reliance polymer Mumbai → NY',
     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, 1001, 'IN', 'BK-2026-04-0003', 102, 102, NULL,
     'EXPORT', 'AIR', 'DOOR_DOOR', 'DAP', 9, 19,
     '2026-04-22','2026-04-25','Delivered',
     12, 850.500, 4.2000, 48000.0000,'USD','Reliance specialty chemicals DEL → JFK',
     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (4, 2001, 'US', 'BK-2026-04-0010', 201, NULL, 201,
     'IMPORT', 'OCEAN_FCL', 'PORT_DOOR', 'CIF', 14, 13,
     '2026-04-18','2026-05-25','Confirmed',
     720, 28000.000, 195.0000, 380000.0000,'USD','Walmart consumer goods NY → LA inland',
     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m5_booking_line
  (id, tenant_id, booking_id, line_number, description, hs_code, pieces, packaging_type, gross_weight_kg, volume_cbm, is_hazmat) VALUES
  (1, 1001, 1, 1, 'Hot-rolled steel coils 2.0mm',     '7208.39', 240, 'COIL',   10800.000,  68.0000, 0),
  (2, 1001, 1, 2, 'Hot-rolled steel coils 3.0mm',     '7208.39', 240, 'COIL',   10700.000,  64.0000, 0),
  (3, 1001, 2, 1, 'PE granules — bag',                '3901.10', 320, 'BAG',    18200.000, 124.0000, 0),
  (4, 1001, 3, 1, 'Reagent class 9 (specialty)',      '3823.90',  12, 'DRUM',     850.500,   4.2000, 1),
  (5, 2001, 4, 1, 'Mixed retail merchandise',         '9999.00', 720, 'PALLET', 28000.000, 195.0000, 0);

INSERT IGNORE INTO m5_shipment
  (id, tenant_id, country_code, shipment_number, booking_id, mode, carrier_party_id,
   vessel_or_flight, voyage_or_flight_no, etd, eta, atd, ata,
   origin_port_id, destination_port_id, status, remarks,
   created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'IN', 'SH-2026-04-0001', 1, 'OCEAN_FCL', 107,
     'MV ATLANTIC GLORY','SEA-2604W',
     '2026-04-20 08:00:00.000','2026-05-10 16:00:00.000',
     '2026-04-20 09:30:00.000', NULL,
     1, 13, 'Departed','Vessel sailed from JNPT',
     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, 1001, 'IN', 'SH-2026-04-0002', 2, 'OCEAN_FCL', 103,
     'MV PACIFIC STAR','SEA-2604E',
     '2026-04-25 12:00:00.000','2026-05-16 18:00:00.000',
     '2026-04-25 13:00:00.000', NULL,
     5, 14, 'InTransit','Mid-ocean',
     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, 1001, 'IN', 'SH-2026-04-0003', 3, 'AIR', 107,
     'AI 102','AI102-26APR',
     '2026-04-23 23:00:00.000','2026-04-24 07:30:00.000',
     '2026-04-23 23:25:00.000','2026-04-24 07:45:00.000',
     9, 19, 'Delivered','Cleared customs same day',
     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (4, 2001, 'US', 'SH-2026-04-0010', 4, 'OCEAN_FCL', 202,
     'MV ATLANTIC PIONEER','SEA-2604CC',
     '2026-04-28 06:00:00.000','2026-05-22 20:00:00.000',
     NULL, NULL,
     14, 13, 'Booked','Awaiting vessel berthing',
     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m5_mbl
  (id, tenant_id, country_code, shipment_id, mbl_number, bl_type,
   issued_by_carrier_party_id, release_type, issue_date, on_board_date, status) VALUES
  (1, 1001, 'IN', 1, 'CONU-MUM-2604001', 'OCEAN', 107, 'ORIGINAL', '2026-04-20', '2026-04-20', 'Issued'),
  (2, 1001, 'IN', 2, 'MAEU-MUM-2604002', 'OCEAN', 103, 'TELEX',    '2026-04-25', '2026-04-25', 'Released');

INSERT IGNORE INTO m5_hbl
  (id, tenant_id, country_code, mbl_id, hbl_number, shipper_party_id, consignee_party_id,
   release_type, issue_date, status) VALUES
  (1, 1001, 'IN', 1, 'HBL-2026-04-001', 101, NULL, 'ORIGINAL', '2026-04-20', 'Issued'),
  (2, 1001, 'IN', 2, 'HBL-2026-04-002', 102, NULL, 'TELEX',    '2026-04-25', 'Released');

INSERT IGNORE INTO m5_awb
  (id, tenant_id, shipment_id, awb_type, awb_number, parent_awb_id,
   iata_carrier_code, flight_number, status) VALUES
  (1, 1001, 3, 'MASTER', '098-12345678', NULL, 'AI', 'AI102', 'Issued'),
  (2, 1001, 3, 'HOUSE',  '098-87654321', 1,    'AI', 'AI102', 'Issued');

INSERT IGNORE INTO m5_container
  (id, tenant_id, shipment_id, container_number, container_type, seal_number,
   tare_weight_kg, cargo_weight_kg, packed_at_utc, loaded_at_utc,
   discharged_at_utc, gate_out_at_utc, free_days, status) VALUES
  (1, 1001, 1, 'TCKU1234567', '40HC', 'SL12345', 3850.00, 10800.000,
     '2026-04-19 14:00:00.000','2026-04-20 06:00:00.000',
     NULL, NULL, 14, 'OnVessel'),
  (2, 1001, 1, 'TCKU7654321', '40HC', 'SL12346', 3850.00, 10700.000,
     '2026-04-19 16:00:00.000','2026-04-20 06:30:00.000',
     NULL, NULL, 14, 'OnVessel'),
  (3, 1001, 2, 'MAEU2345678', '20DC', 'SL22345', 2200.00,  9100.000,
     '2026-04-24 11:00:00.000','2026-04-25 08:00:00.000',
     NULL, NULL, 10, 'OnVessel'),
  (4, 1001, 2, 'MAEU8765432', '20DC', 'SL22346', 2200.00,  9100.000,
     '2026-04-24 12:30:00.000','2026-04-25 08:30:00.000',
     NULL, NULL, 10, 'OnVessel');

INSERT IGNORE INTO m5_milestone
  (tenant_id, shipment_id, milestone_code, occurred_at_utc, location_port_id, source, remarks) VALUES
  (1001, 1, 'BOOKED',     '2026-04-15 10:00:00.000', 1,  'SYSTEM', 'Booking confirmed'),
  (1001, 1, 'LOADED',     '2026-04-19 17:00:00.000', 1,  'MANUAL', 'Both containers loaded onto MV ATLANTIC GLORY'),
  (1001, 1, 'DEPARTED',   '2026-04-20 09:30:00.000', 1,  'CARRIER_API', 'ATD recorded by carrier'),
  (1001, 2, 'BOOKED',     '2026-04-18 09:00:00.000', 5,  'SYSTEM', 'Booking confirmed'),
  (1001, 2, 'LOADED',     '2026-04-24 14:00:00.000', 5,  'MANUAL', 'Containers stuffed at CFS'),
  (1001, 2, 'DEPARTED',   '2026-04-25 13:00:00.000', 5,  'CARRIER_API', 'Vessel departed'),
  (1001, 3, 'BOOKED',     '2026-04-22 10:00:00.000', 9,  'SYSTEM', 'Booking confirmed'),
  (1001, 3, 'LOADED',     '2026-04-23 19:00:00.000', 9,  'MANUAL', 'Cargo accepted'),
  (1001, 3, 'DEPARTED',   '2026-04-23 23:25:00.000', 9,  'CARRIER_API','AI 102 wheels-up'),
  (1001, 3, 'ARRIVED',    '2026-04-24 07:45:00.000', 19, 'CARRIER_API','Touchdown JFK'),
  (1001, 3, 'DELIVERED',  '2026-04-24 16:30:00.000', 19, 'MANUAL',     'Door delivery to consignee');

INSERT IGNORE INTO m5_charge_line
  (tenant_id, shipment_id, charge_code, rate_card_id, quantity, uom_code,
   unit_price_amount, unit_price_currency, amount_amount, amount_currency,
   is_billable, invoice_status) VALUES
  (1001, 1, 'OCEAN_FREIGHT_40', 1, 2, 'TEU', 2950.0000, 'USD',  5900.0000, 'USD', 1, 'Pending'),
  (1001, 1, 'BAF',              1, 2, 'TEU',  185.0000, 'USD',   370.0000, 'USD', 1, 'Pending'),
  (1001, 1, 'THC_ORIGIN',       1, 2, 'TEU',  120.0000, 'USD',   240.0000, 'USD', 1, 'Pending'),
  (1001, 1, 'DOC_FEE',          1, 1, 'FLAT',  60.0000, 'USD',    60.0000, 'USD', 1, 'Pending'),
  (1001, 2, 'OCEAN_FREIGHT_20', NULL, 2, 'TEU', 2200.0000,'USD', 4400.0000,'USD', 1, 'Invoiced'),
  (1001, 2, 'BAF',              NULL, 2, 'TEU',  185.0000,'USD',  370.0000,'USD', 1, 'Invoiced'),
  (1001, 3, 'AIR_FREIGHT',      2, 850, 'KG',     4.8500, 'USD', 4122.5000,'USD', 1, 'Paid'),
  (1001, 3, 'FUEL_SURCHARGE',   2, 850, 'KG',     0.5500, 'USD',  467.5000,'USD', 1, 'Paid'),
  (1001, 3, 'AWB_FEE',          2, 1, 'FLAT',    35.0000, 'USD',   35.0000,'USD', 1, 'Paid');

INSERT IGNORE INTO m5_party_role
  (tenant_id, shipment_id, party_id, role, contact_name, contact_email, contact_phone) VALUES
  (1001, 1, 107, 'CARRIER',           'Vishal Kumar',  'vishal@concor.in',     '+91-22-2200-1234'),
  (1001, 1, 103, 'ORIGIN_AGENT',      'Maersk India',  'export@maersk.in',     '+91-22-6660-9000'),
  (1001, 2, 103, 'CARRIER',           'Maersk India',  'export@maersk.in',     '+91-22-6660-9000'),
  (1001, 3, 107, 'CARRIER',           'AirIndia Cargo','cargo@ai.in',          '+91-11-2400-5500');

INSERT IGNORE INTO m5_consol
  (id, tenant_id, consol_number, consol_type, master_shipment_id, status, created_at_utc) VALUES
  (1, 1001, 'CON-2026-04-001', 'AIR_CONSOL', 3, 'Closed', CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m5_consol_member (consol_id, hbl_id) VALUES (1, 1);

INSERT IGNORE INTO m5_demurrage_event
  (tenant_id, container_id, event_type, start_date, end_date, days,
   rate_amount, rate_currency, total_amount, total_currency, status) VALUES
  (1001, 3, 'DETENTION', '2026-04-30', NULL, 3, 75.0000, 'USD', 225.0000, 'USD', 'Accruing');

-- ---------------------------------------------------------------------
-- M2 Sales / CRM fixtures
-- 5 leads (4 IN + 1 US, mixed stages), 4 opportunities (linked to existing
-- parties Tata/Reliance/Walmart), 6 activities, 2 campaigns, 2 RFQs.
-- Pipeline stages bootstrap the default tenant funnel.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m2_lead
  (id, tenant_id, country_code, lead_number, source, contact_name, company_name,
   email, phone, industry, estimated_volume, stage,
   created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'IN', 'L-2026-04-001', 'WEB',         'Anil Mehta',     'Mahindra Logistics Pvt Ltd', 'anil.mehta@mahindralogistics.in', '+91-22-2856-7890', 'Logistics',     '500 TEU/yr', 'Qualified',  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, 1001, 'IN', 'L-2026-04-002', 'REFERRAL',    'Priya Sharma',   'Hindustan Unilever',         'priya.sharma@hul.com',           '+91-22-3983-2400', 'FMCG',          '200 TEU/yr', 'Contacted',  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, 1001, 'IN', 'L-2026-04-003', 'EVENT',       'Rajesh Iyer',    'Maruti Suzuki India',        'rajesh.iyer@maruti.co.in',       '+91-124-419-7000', 'Automotive',    '1200 TEU/yr','New',        CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (4, 1001, 'IN', 'L-2026-04-004', 'COLD_CALL',   'Sunita Rao',     'Asian Paints Ltd',           'sunita.rao@asianpaints.com',     '+91-22-6218-1000', 'Paints/Chemicals','350 TEU/yr','Disqualified',CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (5, 2001, 'US', 'L-2026-04-100', 'PARTNER',     'Jennifer Lopez', 'Target Corporation',         'j.lopez@target.com',             '+1-612-304-6073',  'Retail',        '800 TEU/yr', 'Qualified',  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- Opportunities reference existing m1_party rows (101 Tata, 102 Reliance, 201 Walmart)
INSERT IGNORE INTO m2_opportunity
  (id, tenant_id, country_code, opp_number, party_id, title,
   estimated_value, estimated_currency, expected_close, probability_pct, stage,
   created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'IN', 'OPP-2026-Q2-001', 101, 'Tata Steel — Mumbai/Rotterdam ocean lane (FY26)',
     2400000.0000, 'USD', '2026-06-30', 65.00, 'Negotiation',  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, 1001, 'IN', 'OPP-2026-Q2-002', 102, 'Reliance — DEL/JFK air express (recurring)',
      850000.0000, 'USD', '2026-05-31', 80.00, 'Proposal',     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, 1001, 'IN', 'OPP-2026-Q2-003', 101, 'Tata — multimodal pilot India to GCC',
      450000.0000, 'USD', '2026-08-15', 30.00, 'Qualification',CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (4, 2001, 'US', 'OPP-2026-Q2-010', 201, 'Walmart — NY/LA inland freight (Q3)',
     1800000.0000, 'USD', '2026-07-15', 50.00, 'Proposal',     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m2_activity
  (tenant_id, related_to, related_id, activity_type, subject, occurred_at_utc, owner_user_id, details) VALUES
  (1001, 'OPP',  1, 'CALL',    'Initial discovery call',         '2026-04-22 10:00:00.000', 1, JSON_OBJECT('outcome','positive','duration_min',45)),
  (1001, 'OPP',  1, 'EMAIL',   'Sent proposal v2',                '2026-04-26 14:30:00.000', 1, JSON_OBJECT('attachments',1)),
  (1001, 'OPP',  1, 'MEETING', 'On-site walkthrough Mumbai',      '2026-04-30 11:00:00.000', 1, JSON_OBJECT('location','Tata Mumbai HQ')),
  (1001, 'OPP',  2, 'CALL',    'Qualification call',              '2026-04-23 16:00:00.000', 1, JSON_OBJECT('outcome','qualified')),
  (1001, 'OPP',  2, 'EMAIL',   'Sent quote Q-2026-04-0002',       '2026-04-25 09:15:00.000', 1, NULL),
  (1001, 'LEAD', 1, 'NOTE',    'Lead converted from web form',    '2026-04-21 08:00:00.000', 1, NULL);

INSERT IGNORE INTO m2_campaign
  (id, tenant_id, name, channel, audience_filter, template_code, scheduled_at_utc, status, sent_count, delivered_count, created_at_utc) VALUES
  (1, 1001, 'Q2 RoDTEP eligibility outreach',     'EMAIL',    JSON_OBJECT('industry','export','country','IN'), 'INVOICE', '2026-05-05 08:00:00.000', 'Scheduled', 0,   0,  CURRENT_TIMESTAMP(3)),
  (2, 1001, 'Container rate reduction — APR/MAY', 'WHATSAPP', JSON_OBJECT('segment','tier-1-customers'),       NULL,      NULL,                     'Sent',     142, 138, CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m2_campaign_target (campaign_id, party_id, status, sent_at_utc) VALUES
  (2, 101, 'Delivered', '2026-04-15 10:00:00.000'),
  (2, 102, 'Delivered', '2026-04-15 10:00:01.000');

INSERT IGNORE INTO m2_rfq_request
  (id, tenant_id, rfq_number, party_id, requested_at_utc, due_date, status, notes) VALUES
  (1, 1001, 'RFQ-2026-04-001', 101, '2026-04-20 09:00:00.000', '2026-04-30', 'InResponse', '5 vendor 3PL bids requested for Tata Q3 FCL block'),
  (2, 1001, 'RFQ-2026-04-002', 102, '2026-04-22 11:00:00.000', '2026-05-05', 'Open',       'Reliance air express alternative carriers');

INSERT IGNORE INTO m2_rfq_line (rfq_request_id, line_number, description, quantity, uom_code) VALUES
  (1, 1, 'Mumbai → Hamburg 40HC FCL',        50, 'TEU'),
  (1, 2, 'Mumbai → Rotterdam 40HC FCL',      30, 'TEU'),
  (2, 1, 'DEL → JFK air express 250kg/wk',  250, 'KG');

INSERT IGNORE INTO m2_rfq_response
  (rfq_request_id, vendor_party_id, response_amount, response_currency, valid_until, notes, received_at_utc, is_winner) VALUES
  (1, 103, 4750.0000, 'USD', '2026-05-15', 'Maersk India — block deal',       '2026-04-25 14:00:00.000', 0),
  (1, 107, 4920.0000, 'USD', '2026-05-15', 'CONCOR — multimodal alternative', '2026-04-26 11:30:00.000', 0);

INSERT IGNORE INTO m2_pipeline_stage (tenant_id, code, name, sequence, default_probability_pct) VALUES
  (1001, 'PROSPECTING',   'Prospecting',   1, 10.00),
  (1001, 'QUALIFICATION', 'Qualification', 2, 25.00),
  (1001, 'PROPOSAL',      'Proposal',      3, 50.00),
  (1001, 'NEGOTIATION',   'Negotiation',   4, 75.00),
  (1001, 'CLOSED_WON',    'Closed-Won',    5, 100.00),
  (1001, 'CLOSED_LOST',   'Closed-Lost',   6, 0.00);

-- ---------------------------------------------------------------------
-- M7 Procurement fixtures
-- 3 PRs with lines, 2 vendor RFQs with recipients & responses, 4 POs
-- with lines (multi-stage: Draft, Approved, Sent, PartialReceipt), 3 GRNs
-- with lines, 3 invoice matches (matched, price-variance, qty-variance).
-- Vendors: 103=Maersk India, 104=Blue Dart, 105=TVS Logistics, 106=DHL, 107=CONCOR.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m7_purchase_request
  (id, tenant_id, country_code, pr_number, requested_by, department, status, needed_by, notes,
   created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'IN', 'PR-2026-04-001', 1, 'Operations', 'Approved',  '2026-05-15', 'Spare container fittings for Q2 FCL bookings', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, 1001, 'IN', 'PR-2026-04-002', 1, 'Logistics',  'Submitted', '2026-05-30', 'Last-mile bike fleet replenishment',           CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, 1001, 'IN', 'PR-2026-04-003', 1, 'IT',         'Draft',     '2026-06-15', 'Office network gear refresh',                  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m7_purchase_request_line
  (pr_id, line_no, description, quantity, uom_code, estimated_unit_price_amount, estimated_unit_price_currency) VALUES
  (1, 1, '40HC seal kit (50 ct)',          200, 'BOX',  45.0000,  'USD'),
  (1, 2, 'Container lashing strap',        500, 'EA',    8.5000,  'USD'),
  (2, 1, 'Electric delivery bike',          25, 'EA', 1850.0000,  'USD'),
  (2, 2, 'Helmet (last-mile)',              50, 'EA',   42.0000,  'USD'),
  (3, 1, 'Aruba 24-port PoE switch',         8, 'EA', 1450.0000,  'USD');

INSERT IGNORE INTO m7_rfq
  (id, tenant_id, country_code, rfq_number, due_date, status, scope_pr_id, notes, created_at_utc) VALUES
  (1, 1001, 'IN', 'RFQ-PROC-2026-04-001', '2026-04-30', 'InResponse', 1,    'Container fittings — bid by 30 Apr', CURRENT_TIMESTAMP(3)),
  (2, 1001, 'IN', 'RFQ-PROC-2026-04-002', '2026-05-10', 'Open',       2,    'Bike fleet — open to all vendors',   CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m7_rfq_recipient
  (rfq_id, vendor_party_id, sent_at_utc, response_status) VALUES
  (1, 103, '2026-04-22 09:00:00.000', 'Responded'),
  (1, 105, '2026-04-22 09:00:01.000', 'Responded'),
  (1, 107, '2026-04-22 09:00:02.000', 'Acknowledged'),
  (2, 104, '2026-04-25 10:00:00.000', 'Sent'),
  (2, 106, '2026-04-25 10:00:01.000', 'Sent');

INSERT IGNORE INTO m7_rfq_response
  (rfq_id, vendor_party_id, total_amount, total_currency, valid_until, notes, received_at_utc, is_winner) VALUES
  (1, 103, 12750.0000, 'USD', '2026-05-15', 'Maersk — package deal incl. shipping', '2026-04-26 14:30:00.000', 1),
  (1, 105, 13200.0000, 'USD', '2026-05-15', 'TVS — separate shipping cost',         '2026-04-27 11:00:00.000', 0);

-- Note: PO 1 is sourced from RFQ 1 (Maersk won) — multi-line PO with 2 lines completed
INSERT IGNORE INTO m7_purchase_order
  (id, tenant_id, country_code, po_number, vendor_party_id, rfq_id, status,
   total_amount, total_currency, expected_delivery_date, payment_terms, notes,
   created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'IN', 'PO-2026-04-001', 103, 1,    'PartialReceipt', 12750.0000, 'USD', '2026-05-12', 'NET 30',  'Maersk container fittings batch 1', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, 1001, 'IN', 'PO-2026-04-002', 107, NULL, 'Sent',            8400.0000, 'USD', '2026-05-08', 'NET 15',  'CONCOR rail transfer slot booking', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, 1001, 'IN', 'PO-2026-04-003', 104, NULL, 'Approved',        2100.0000, 'USD', '2026-05-20', 'NET 30',  'Blue Dart courier credits',         CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (4, 1001, 'IN', 'PO-2026-04-004', 106, NULL, 'Draft',           5800.0000, 'USD', '2026-06-01', 'NET 45',  'DHL air-freight prepay buffer',     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m7_purchase_order_line
  (po_id, line_no, description, quantity_ordered, quantity_received, uom_code, unit_price_amount, unit_price_currency) VALUES
  (1, 1, '40HC seal kit (50 ct)',          200, 200, 'BOX',  45.0000, 'USD'),
  (1, 2, 'Container lashing strap',        500, 250, 'EA',    8.5000, 'USD'),
  (2, 1, 'CONCOR rail slot — JNPT to Tughlakabad', 4, 0, 'BOOKING', 2100.0000, 'USD'),
  (3, 1, 'Blue Dart prepaid courier voucher', 100, 0, 'EA',  21.0000, 'USD'),
  (4, 1, 'DHL air-freight prepay credit',     1,   0, 'BLOCK', 5800.0000, 'USD');

INSERT IGNORE INTO m7_goods_receipt
  (id, tenant_id, po_id, grn_number, received_at_utc, received_by, status, remarks) VALUES
  (1, 1001, 1, 'GRN-2026-04-001', '2026-04-29 11:00:00.000', 1, 'Posted', 'Full kit batch + half lashing straps; rest backordered'),
  (2, 1001, 1, 'GRN-2026-04-002', '2026-05-02 09:30:00.000', 1, 'Posted', 'Lashing straps received in damaged carton — 50 short'),
  (3, 1001, 2, 'GRN-2026-04-003', '2026-04-30 14:00:00.000', 1, 'Posted', 'CONCOR rail slot booking confirmation');

INSERT IGNORE INTO m7_goods_receipt_line
  (gr_id, po_line_id, quantity_received, cond, remarks) VALUES
  (1, 1, 200, 'Good',    'All seal kits as ordered'),
  (1, 2, 200, 'Good',    'Partial straps batch 1'),
  (2, 2,  50, 'Damaged', 'Carton water-damage; 50 EA written off'),
  (3, 3,   4, 'Good',    'Slot codes received via email');

INSERT IGNORE INTO m7_invoice_match
  (tenant_id, po_id, vendor_invoice_no, match_status, variance_amount, variance_currency, matched_by, matched_at_utc, notes) VALUES
  (1001, 1, 'MAERSK-INV-26-04-9001', 'PriceVariance',  150.0000, 'USD', 1, '2026-05-03 10:00:00.000', 'Vendor invoiced $12,900 vs PO $12,750 — pricing dispute open'),
  (1001, 1, 'MAERSK-INV-26-04-9002', 'QtyVariance',     -2125.0000, 'USD', 1, '2026-05-04 11:00:00.000', '50 lashing straps short — credit note pending'),
  (1001, 2, 'CONCOR-INV-26-04-7700', 'ThreeWayMatched', 0.0000,    'USD', 1, '2026-05-01 16:00:00.000', 'PO+GRN+Invoice match clean');

-- ---------------------------------------------------------------------
-- M9 Last-Mile Delivery fixtures
-- 5 courier bookings (mix domestic/international + COD), 2 routes,
-- 2 manifests (linked to routes), 3 PODs, 2 COD collections,
-- 4 delivery attempts (success + failure path), 6 zone rates, 5 pincodes.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m9_courier_booking
  (id, tenant_id, country_code, booking_number, courier_type,
   shipper_party_id, consignee_party_id,
   weight_kg, pieces, service_level,
   declared_value_amount, declared_value_currency,
   cod_amount, cod_currency, status,
   created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'IN', 'CB-DOM-2026-04-001', 'DOMESTIC',      101, NULL, 2.500,  1, 'NEXT_DAY',  1500.0000, 'INR', NULL,    NULL,  'Delivered',     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2, 1001, 'IN', 'CB-DOM-2026-04-002', 'DOMESTIC',      102, NULL, 0.850,  1, 'STANDARD',   850.0000, 'INR',  599.0000,'INR', 'OutForDelivery',CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (3, 1001, 'IN', 'CB-DOM-2026-04-003', 'DOMESTIC',      101, NULL, 5.200,  3, 'STANDARD',  3200.0000, 'INR', NULL,    NULL,  'InTransit',     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (4, 1001, 'IN', 'CB-INT-2026-04-100', 'INTERNATIONAL', 102, NULL, 1.200,  1, 'EXPRESS',    450.0000, 'USD', NULL,    NULL,  'PickedUp',      CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (5, 2001, 'US', 'CB-DOM-2026-04-200', 'DOMESTIC',      201, NULL, 1.800,  1, 'GROUND',     250.0000, 'USD', NULL,    NULL,  'Created',       CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m9_route
  (id, tenant_id, country_code, route_code, name, route_type, planned_date, status, vehicle_no) VALUES
  (1, 1001, 'IN', 'RT-MUM-2026-04-29', 'Mumbai South delivery', 'DELIVERY', '2026-04-29', 'InProgress', 'MH-01-AB-1234'),
  (2, 1001, 'IN', 'RT-DEL-2026-04-30', 'Delhi NCR mixed',       'MIXED',    '2026-04-30', 'Planned',    'DL-3C-XY-5678');

INSERT IGNORE INTO m9_route_stop
  (route_id, sequence, country_code, stop_type, party_id, booking_id, expected_arrival, status) VALUES
  (1, 1, 'IN', 'DELIVERY', 101, 1, '2026-04-29 10:00:00.000', 'Completed'),
  (1, 2, 'IN', 'DELIVERY', 102, 2, '2026-04-29 11:30:00.000', 'Pending'),
  (1, 3, 'IN', 'DELIVERY', 101, 3, '2026-04-29 13:00:00.000', 'Pending'),
  (2, 1, 'IN', 'PICKUP',   102, 4, '2026-04-30 09:00:00.000', 'Pending');

INSERT IGNORE INTO m9_manifest
  (id, tenant_id, manifest_number, route_id, courier_type, total_pieces, total_weight_kg, generated_at_utc) VALUES
  (1, 1001, 'MAN-2026-04-29-001', 1, 'DOMESTIC',      5,  8.550, '2026-04-29 08:30:00.000'),
  (2, 1001, 'MAN-2026-04-30-002', 2, 'INTERNATIONAL', 1,  1.200, '2026-04-30 07:30:00.000');

INSERT IGNORE INTO m9_manifest_line (manifest_id, booking_id, awb_number, weight_kg, pieces) VALUES
  (1, 1, 'DOMAWB-001', 2.500, 1),
  (1, 2, 'DOMAWB-002', 0.850, 1),
  (1, 3, 'DOMAWB-003', 5.200, 3),
  (2, 4, 'INTAWB-100', 1.200, 1);

INSERT IGNORE INTO m9_awb (tenant_id, awb_number, booking_id, awb_type, status) VALUES
  (1001, 'DOMAWB-001', 1, 'DOMESTIC',      'Delivered'),
  (1001, 'DOMAWB-002', 2, 'DOMESTIC',      'InTransit'),
  (1001, 'DOMAWB-003', 3, 'DOMESTIC',      'InTransit'),
  (1001, 'INTAWB-100', 4, 'INTERNATIONAL', 'InTransit');

INSERT IGNORE INTO m9_pod
  (tenant_id, booking_id, signed_by, gps_lat, gps_lng, captured_at_utc, captured_by_user_id) VALUES
  (1001, 1, 'Mr. Anand (recipient)',  19.0760000, 72.8777000, '2026-04-29 10:15:00.000', 1),
  (1001, 3, 'Office reception',       19.0825000, 72.8800000, '2026-04-29 13:25:00.000', 1);

INSERT IGNORE INTO m9_cod_collection
  (tenant_id, booking_id, amount_collected, currency, payment_method, collected_at_utc, settled_status, reference_no) VALUES
  (1001, 2, 599.0000, 'INR', 'UPI',  '2026-04-29 11:45:00.000', 'Pending',    'UPI-tx-ABCD1234'),
  (1001, 1, 0.0000,   'INR', 'CASH', '2026-04-29 10:15:00.000', 'Settled',    NULL);

INSERT IGNORE INTO m9_delivery_attempt
  (tenant_id, booking_id, attempt_no, attempted_at_utc, status, failure_reason, next_attempt_date) VALUES
  (1001, 1, 1, '2026-04-29 10:15:00.000', 'Delivered',          NULL,                            NULL),
  (1001, 2, 1, '2026-04-29 11:35:00.000', 'Failed',             'Customer not at address',       '2026-04-30'),
  (1001, 3, 1, '2026-04-29 13:25:00.000', 'PartiallyDelivered', '2 of 3 pieces accepted',        '2026-04-30'),
  (1001, 4, 1, '2026-04-30 14:00:00.000', 'Delivered',          NULL,                            NULL);

INSERT IGNORE INTO m9_zone_rate
  (tenant_id, country_code, zone_code, courier_type, weight_slab_from_kg, weight_slab_to_kg, rate_amount, rate_currency, valid_from) VALUES
  (1001, 'IN', 'A',       'DOMESTIC',      0.000,  0.500,   55.0000, 'INR', '2026-01-01'),
  (1001, 'IN', 'A',       'DOMESTIC',      0.501,  2.000,   85.0000, 'INR', '2026-01-01'),
  (1001, 'IN', 'A',       'DOMESTIC',      2.001, 10.000,  165.0000, 'INR', '2026-01-01'),
  (1001, 'IN', 'B',       'DOMESTIC',      0.000,  0.500,   75.0000, 'INR', '2026-01-01'),
  (1001, 'IN', 'B',       'DOMESTIC',      0.501,  2.000,  120.0000, 'INR', '2026-01-01'),
  (1001, 'IN', 'INTL_AS', 'INTERNATIONAL', 0.000,  1.000, 1850.0000, 'INR', '2026-01-01');

INSERT IGNORE INTO m9_pincode_zone (country_code, pincode, zone_code) VALUES
  ('IN', '400001', 'A'),
  ('IN', '400023', 'A'),
  ('IN', '110001', 'A'),
  ('IN', '560001', 'B'),
  ('IN', '700001', 'B');

-- ---------------------------------------------------------------------
-- SCM Milestone 1 fixtures — POAs, permits, misc docs, shipment memos
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m_party_poa
  (tenant_id, party_id, poa_number, granted_to, effective_date, expiration_date, status, notes,
   created_at_utc, modified_at_utc) VALUES
  (1001, 101, 'POA-TATA-2025-01',     'Acme Logistics India Pvt Ltd', '2025-04-01', '2026-03-31', 'Complete',  'Annual POA for customs', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 101, 'POA-TATA-2026-01',     'Acme Logistics India Pvt Ltd', '2026-04-01', '2027-03-31', 'Pending',   'Renewal in process',     CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 102, 'POA-RELIANCE-2026-01', 'Acme Logistics India Pvt Ltd', '2026-01-01', '2026-05-25', 'Complete',  'Expiring soon',          CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2001, 201, NULL,                   'ULP US Logistics LLC',         '2026-01-15', NULL,         'Incomplete','Awaiting client signature', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m_party_permit
  (tenant_id, party_id, permit_kind, permit_code, permit_name, issuing_authority,
   hs_code, effective_date, expiration_date, status, notes,
   created_at_utc, modified_at_utc) VALUES
  (1001, 101, 'Company',   'IEC-AABCT3825P', 'Importer-Exporter Code',   'DGFT India',  NULL,     '2024-06-01', NULL,         'Active',   NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 101, 'Company',   'AEO-T2-IN-1234', 'AEO Tier-2 certificate',   'CBIC India',  NULL,     '2025-01-01', '2028-01-01', 'Active',   NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 102, 'Commodity', 'PESO-RC-9911',   'PESO licence — petroleum', 'PESO India',  '2710.19','2025-08-01', '2026-05-30', 'Expiring', 'Renew before expiry', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2001, 201, 'Company',   'EIN-91-1234567', 'EIN registration',         'IRS US',      NULL,     '2018-09-01', NULL,         'Active',   NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m_party_misc_doc
  (tenant_id, party_id, doc_category, title, effective_date, expiration_date, notes, created_at_utc) VALUES
  (1001, 101, 'Agreement', 'Master Service Agreement (3-year)',     '2025-04-01', '2028-03-31', '3-year MSA',                       CURRENT_TIMESTAMP(3)),
  (1001, 101, 'Insurance', 'Cargo insurance certificate',           '2026-01-01', '2026-12-31', 'Open policy via New India Assr.', CURRENT_TIMESTAMP(3)),
  (1001, 102, 'Bank',      'Authorised dealer (AD) code letter',    '2025-01-01', NULL,         'For RBI compliance',               CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m5_memo
  (tenant_id, shipment_id, author_user_id, body, is_pinned, created_at_utc) VALUES
  (1001, 1, 1, 'Customer requested daily ETA refresh; assigned to Vinod.',                              1, '2026-04-22 10:00:00.000'),
  (1001, 1, 1, 'Carrier confirmed schedule reliability above 90%.',                                     0, '2026-04-23 11:30:00.000'),
  (1001, 2, 1, 'Watch closely — Reliance is escalating polymer line stockouts at Hamburg DC.',          1, '2026-04-25 09:15:00.000'),
  (1001, 3, 1, 'POD scanned at JFK; cleared customs same day; door delivered by 16:30 local.',          0, '2026-04-24 17:00:00.000');

-- Mark version
INSERT INTO _ulp_schema_version (version, source, notes)
VALUES ('dev-fixtures-v7', 'db/dev-fixtures/01-dev-fixtures.sql',
  'v6 + SCM Milestone 1 profile + memo fixtures: 4 POAs, 4 permits, 3 misc docs, 4 shipment memos')
ON DUPLICATE KEY UPDATE applied_at_utc = CURRENT_TIMESTAMP(3);

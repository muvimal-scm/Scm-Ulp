-- =====================================================================
-- M4-US Customs — Dev fixtures
-- Tenant 2001 (US, USD). Fixtures cover the demo flows: ATM on file,
-- continuous bond, MPF rate table, PGA HTS mapping, 3 sample entries
-- (1 released, 1 on PGA hold, 1 with customs exam), 2 ISFs, 1 in-bond move,
-- 1 release order, 1 customs hold notice.
-- Idempotent: INSERT IGNORE.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- 1) Bond — Continuous bond for Walmart (party 201)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_bond
  (id, tenant_id, bond_number, bond_type, surety_code, surety_name,
   importer_party_id, amount_usd, effective_from, effective_to, status, utilization_pct,
   notes, created_at_utc, modified_at_utc) VALUES
  (1, 2001, 'CB-2026-WMT-0001', 'Continuous', 'STR-001', 'Hartford Surety',
   201, 500000.00, '2026-01-01', '2026-12-31', 'Active', 12.50,
   'Continuous bond for Walmart Inc — covers all entries 2026', '2026-01-01 00:00:00', '2026-05-03 00:00:00');

-- ---------------------------------------------------------------------
-- 2) ATM (Authority to Make Entry) — closes M1 client item
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_atm
  (id, tenant_id, importer_party_id, broker_filer_code, combined_with_poa,
   signed_at, effective_from, effective_to, signer_name, signer_title,
   status, notes, created_at_utc, modified_at_utc) VALUES
  (1, 2001, 201, 'ABC', 1, '2026-01-15', '2026-01-15', '2027-01-14',
   'John Smith', 'CFO', 'Active',
   'Combined ATM + POA on file for Walmart; valid 1 year', '2026-01-15 10:00:00', '2026-01-15 10:00:00');

-- ---------------------------------------------------------------------
-- 3) MPF rates (FY2026 — Federal Register annual update)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_mpf_rate
  (fiscal_year, entry_class, rate_pct, flat_amount_usd, min_amount_usd, max_amount_usd, effective_from, effective_to) VALUES
  (2026, 'Formal',     0.3464, NULL,  32.71,  634.62, '2025-10-01', '2026-09-30'),
  (2026, 'Informal',   NULL,    2.62,   NULL,    NULL, '2025-10-01', '2026-09-30'),
  (2026, 'DeMinimis',  NULL,    0.00,   NULL,    NULL, '2025-10-01', '2026-09-30');

-- ---------------------------------------------------------------------
-- 4) HTS → PGA mapping (sampler — production loads thousands)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_hts_pga_mapping
  (hts_prefix, pga_code, is_required, pga_message_type, effective_from) VALUES
  -- FDA: food, drugs, devices, cosmetics
  ('0703.10', 'FDA',        1, 'PGA_FD2', '2024-01-01'),  -- Onions, garlic
  ('1604.20', 'FDA',        1, 'PGA_FD2', '2024-01-01'),  -- Prepared fish
  ('3004.10', 'FDA',        1, 'PGA_FD3', '2024-01-01'),  -- Antibiotic medicines
  ('3304.99', 'FDA',        1, 'PGA_FD2', '2024-01-01'),  -- Cosmetics
  ('9018.90', 'FDA',        1, 'PGA_DV1', '2024-01-01'),  -- Medical devices
  -- USDA APHIS: plants
  ('0601.10', 'USDA-APHIS', 1, 'PGA_AP1', '2024-01-01'),  -- Bulbs
  ('0602.30', 'USDA-APHIS', 1, 'PGA_AP1', '2024-01-01'),  -- Live plants
  -- USDA FSIS: meat
  ('0202.10', 'USDA-FSIS',  1, 'PGA_FS1', '2024-01-01'),  -- Frozen beef
  ('0207.14', 'USDA-FSIS',  1, 'PGA_FS1', '2024-01-01'),  -- Frozen chicken cuts
  -- EPA TSCA: chemicals
  ('2902.30', 'EPA-TSCA',   1, 'PGA_EP1', '2024-01-01'),  -- Toluene
  -- EPA FIFRA: pesticides
  ('3808.91', 'EPA-FIFRA',  1, 'PGA_EP2', '2024-01-01'),
  -- FCC: radio frequency devices
  ('8517.62', 'FCC',        1, 'PGA_FC1', '2024-01-01'),  -- WiFi/BT
  ('8525.50', 'FCC',        1, 'PGA_FC1', '2024-01-01'),  -- Transmitters
  -- DOT NHTSA: motor vehicles
  ('8703.23', 'DOT-NHTSA',  1, 'PGA_DT1', '2024-01-01');  -- Cars 1500-3000cc

-- ---------------------------------------------------------------------
-- 5) ADD/CVD active cases (sampler)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_add_cvd_case
  (case_number, case_type, product_description, country_code, manufacturer_id,
   rate_pct, cash_deposit_pct, effective_from, effective_to, status, hts_pattern) VALUES
  ('A-570-001', 'ADD', 'Steel hot-rolled coil',     'CN', NULL, 35.00, 35.00, '2024-01-01', NULL, 'Active', '7208.10'),
  ('C-570-002', 'CVD', 'Steel hot-rolled coil',     'CN', NULL,  5.50,  5.50, '2024-01-01', NULL, 'Active', '7208.10'),
  ('A-570-101', 'ADD', 'Aluminum extrusions',       'CN', NULL, 86.01, 86.01, '2024-06-01', NULL, 'Active', '7604.21'),
  ('A-588-202', 'ADD', 'Wooden bedroom furniture',  'VN', NULL, 22.30, 22.30, '2025-01-01', NULL, 'Active', '9403.50');

-- ---------------------------------------------------------------------
-- 6) Sample entry 1 — RELEASED (Type 01 Consumption, ocean)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_entry
  (id, tenant_id, shipment_id, entry_number, filer_code, entry_type, entry_type_description,
   importer_of_record_id, importer_ein, consignee_id, ultimate_consignee_id, bond_id,
   carrier_scac, vessel_name, voyage_number,
   port_of_unlading_code, port_of_entry_code, firms_code,
   entry_date, import_date, estimated_arrival_date, release_date,
   bill_of_lading, abi_status, cbp_status_message,
   total_value_usd, duty_amount_usd, mpf_usd, hmf_usd, total_fees_usd,
   created_at_utc, created_by, submitted_at_utc, released_at_utc, modified_at_utc) VALUES
  (1001, 2001, NULL, 'ABC0000001X', 'ABC', '01', 'Consumption Entry',
   201, '13-1145430', 201, 201, 1,
   'MAEU', 'MAERSK ESSEX', 'V245N',
   'USLAX', 'USLAX', 'A123',
   '2026-04-20', '2026-04-22', '2026-04-22', '2026-04-23',
   'MAEU123456789', 'Released', 'Cargo released — no exam',
   125000.00, 8500.00, 432.99, 156.25, 9089.24,
   '2026-04-20 10:00:00', 1, '2026-04-22 14:30:00', '2026-04-23 09:15:00', '2026-04-23 09:15:00');

INSERT IGNORE INTO m4us_entry_line
  (tenant_id, entry_id, line_number, hts_number, description, country_of_origin,
   quantity, unit_of_measure, net_weight_kg,
   invoice_value_usd, invoice_currency, invoice_value_orig, fx_rate,
   duty_rate_pct, duty_amount_usd, manufacturer_id_code) VALUES
  (2001, 1001, 1, '6204.62.4011', 'Cotton trousers women',  'BD', 5000, 'PCS', 1500.00,  75000.00, 'USD',  75000.00, 1.0,  16.6000, 12450.00, 'BDXYZTRADCO'),
  (2001, 1001, 2, '6109.10.0040', 'Cotton t-shirts',        'IN', 8000, 'PCS', 1200.00,  50000.00, 'USD',  50000.00, 1.0,   8.4000,  4200.00, 'INMUMTEXLTD');

-- Recompute duty (16.6% of 75k = 12450, but we used 8500 above as illustrative; align below)
UPDATE m4us_entry SET duty_amount_usd = 16650.00 WHERE id = 1001;

-- ---------------------------------------------------------------------
-- 7) Sample entry 2 — ON PGA HOLD (FDA — frozen fish, prior notice required)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_entry
  (id, tenant_id, shipment_id, entry_number, filer_code, entry_type, entry_type_description,
   importer_of_record_id, importer_ein, bond_id,
   carrier_scac, vessel_name, voyage_number,
   port_of_unlading_code, port_of_entry_code, firms_code,
   entry_date, import_date, estimated_arrival_date,
   bill_of_lading, abi_status, cbp_status_message,
   pga_hold_flag, exam_type,
   total_value_usd, duty_amount_usd, mpf_usd, hmf_usd, total_fees_usd,
   created_at_utc, created_by, submitted_at_utc, modified_at_utc) VALUES
  (1002, 2001, NULL, 'ABC0000002X', 'ABC', '01', 'Consumption Entry',
   201, '13-1145430', 1,
   'COSU', 'COSCO PACIFIC', 'V312E',
   'USNYC', 'USNYC', 'B445',
   '2026-04-25', '2026-04-26', '2026-04-26',
   'COSU987654321', 'Hold', 'PGA HOLD — FDA Prior Notice missing',
   1, 'NIL',
   45000.00, 0.00, 155.88, 56.25, 212.13,
   '2026-04-25 11:00:00', 1, '2026-04-26 08:00:00', '2026-05-03 00:00:00');

INSERT IGNORE INTO m4us_entry_line
  (tenant_id, entry_id, line_number, hts_number, description, country_of_origin,
   quantity, unit_of_measure, net_weight_kg,
   invoice_value_usd, invoice_currency, invoice_value_orig, fx_rate,
   duty_rate_pct, duty_amount_usd, fda_required, manufacturer_id_code) VALUES
  (2001, 1002, 1, '1604.20.5010', 'Frozen prepared fish', 'TH', 12000, 'KG', 12000.00, 45000.00, 'USD', 45000.00, 1.0, 0.0, 0.00, 1, 'THBKKFISHCO');

INSERT IGNORE INTO m4us_pga_hold
  (tenant_id, entry_id, pga_code, hold_reason_code, hold_reason_text, status,
   raised_at_utc) VALUES
  (2001, 1002, 'FDA', 'PN_MISSING', 'FDA Prior Notice not on file. Submit PN via FDA Industry Systems before release.', 'Active', '2026-04-26 09:30:00');

INSERT IGNORE INTO m4us_customs_hold_exam
  (tenant_id, entry_id, notice_type, exam_type, hold_reason_code, hold_reason_text, status, raised_at_utc) VALUES
  (2001, 1002, 'Hold', 'NIL', 'PN_MISSING', 'PGA Hold issued by FDA — Prior Notice required for fish products', 'Open', '2026-04-26 09:30:00');

-- ---------------------------------------------------------------------
-- 8) Sample entry 3 — CUSTOMS EXAM (XRAY) — closes M1 "US Customs Hold/Exam Notice" item
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_entry
  (id, tenant_id, shipment_id, entry_number, filer_code, entry_type,
   importer_of_record_id, importer_ein, bond_id,
   carrier_scac, vessel_name, voyage_number,
   port_of_unlading_code, port_of_entry_code, firms_code,
   entry_date, import_date, estimated_arrival_date,
   bill_of_lading, abi_status, cbp_status_message,
   exam_type,
   total_value_usd, duty_amount_usd, mpf_usd, hmf_usd, total_fees_usd,
   created_at_utc, created_by, submitted_at_utc, modified_at_utc) VALUES
  (1003, 2001, NULL, 'ABC0000003X', 'ABC', '01', 201, '13-1145430', 1,
   'EGLV', 'EVER GIVEN', 'V120W',
   'USLAX', 'USLAX', 'A123',
   '2026-05-01', '2026-05-02', '2026-05-02',
   'EGLV555444333', 'Exam', 'CBP X-Ray exam ordered — random selection',
   'XRAY',
   88000.00, 4400.00, 304.93, 110.00, 4814.93,
   '2026-05-01 10:00:00', 1, '2026-05-02 14:00:00', '2026-05-03 00:00:00');

INSERT IGNORE INTO m4us_entry_line
  (tenant_id, entry_id, line_number, hts_number, description, country_of_origin,
   quantity, unit_of_measure, invoice_value_usd, invoice_currency, invoice_value_orig, fx_rate,
   duty_rate_pct, duty_amount_usd, manufacturer_id_code) VALUES
  (2001, 1003, 1, '8517.62.0090', 'WiFi network equipment', 'CN', 1000, 'PCS', 88000.00, 'USD', 88000.00, 1.0, 5.0000, 4400.00, 'CNSHELECCOLTD');

INSERT IGNORE INTO m4us_customs_hold_exam
  (tenant_id, entry_id, notice_type, exam_type, hold_reason_code, hold_reason_text,
   exam_site, exam_appointment_at, status, raised_at_utc) VALUES
  (2001, 1003, 'Exam', 'XRAY', 'RANDOM_SELECT', 'CBP random X-Ray exam selection',
   'LAX CES Facility', '2026-05-04 10:00:00', 'Open', '2026-05-02 14:30:00');

-- FCC PGA mapping triggers — WiFi equipment
INSERT IGNORE INTO m4us_pga_hold
  (tenant_id, entry_id, pga_code, hold_reason_code, hold_reason_text, status,
   raised_at_utc) VALUES
  (2001, 1003, 'FCC', 'EQAUTH_PENDING', 'FCC equipment authorization pending', 'Active', '2026-05-02 14:35:00');

-- ---------------------------------------------------------------------
-- 9) Sample ISF (Importer Security Filing) — filed for entry 1001
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_isf
  (id, tenant_id, shipment_id, importer_of_record_id, importer_number,
   consignee_number, seller_name, seller_address, buyer_name, buyer_address,
   ship_to_name, ship_to_address, manufacturer_name, manufacturer_address,
   country_of_origin, hts_6, container_stuffing_location, consolidator_name,
   filing_status, filed_at_utc, vessel_load_cutoff_utc, bond_id,
   created_at_utc, modified_at_utc) VALUES
  (1, 2001, NULL, 201, '13-1145430',
   '13-1145430', 'Bangladesh Trading Co Ltd', '12 Dhaka Industrial Estate, Dhaka', 'Walmart Inc', '702 SW 8th St, Bentonville AR',
   'Walmart DC #6020', '2001 SE 10th St, Bentonville AR', 'BD-XYZ Trading Co', '12 Dhaka Industrial Estate, Dhaka',
   'BD', '620462', 'Chittagong Port Container Yard', 'Bangladesh Logistics LLC',
   'Match', '2026-04-15 14:00:00', '2026-04-16 18:00:00', 1,
   '2026-04-15 13:30:00', '2026-04-22 10:00:00');

-- ---------------------------------------------------------------------
-- 10) Sample I.T. (Immediate Transportation) move — closes M1 "I.T." item
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_in_bond
  (id, tenant_id, entry_id, in_bond_number, in_bond_type, carrier_scac,
   origin_port_code, destination_port_code, initiated_at, status,
   notes, created_at_utc, modified_at_utc) VALUES
  (1, 2001, 1001, 'IT-2026-LAX-0001', 'IT', 'MAEU',
   'USLAX', 'USDFW', '2026-04-23', 'InTransit',
   'Move from LAX to Dallas-Fort Worth bonded warehouse', '2026-04-23 10:00:00', '2026-04-23 10:00:00');

-- ---------------------------------------------------------------------
-- 11) Sample Release Order / Turnover — closes M1 "Turnover/Release Order" item
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_release_order
  (id, tenant_id, entry_id, order_type, reference_number, carrier_party_id,
   issued_at, status, notes, created_at_utc, modified_at_utc) VALUES
  (1, 2001, 1001, 'TurnoverOrder',     'TO-2026-WMT-0001', 202,
   '2026-04-23', 'Issued', 'Turnover to FedEx for inland delivery to Walmart DC', '2026-04-23 11:00:00', '2026-04-23 11:00:00'),
  (2, 2001, 1001, 'DeliveryOrder',     'DO-2026-WMT-0001', NULL,
   '2026-04-23', 'Issued', 'Delivery order to LAX warehouse FIRMS A123', '2026-04-23 11:30:00', '2026-04-23 11:30:00'),
  (3, 2001, 1001, 'ReleaseInstruction','RI-2026-WMT-0001', 202,
   '2026-04-23', 'Issued', 'Carrier release instructions — original B/L surrendered', '2026-04-23 12:00:00', '2026-04-23 12:00:00'),
  (4, 2001, 1002, 'LetterOfGuarantee', 'LG-2026-WMT-0002', NULL,
   '2026-04-26', 'Issued', 'Letter of guarantee — cargo not yet released, broker guarantees payment', '2026-04-26 10:00:00', '2026-04-26 10:00:00');

-- ---------------------------------------------------------------------
-- 12) ABI message log (sample inbound + outbound)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m4us_abi_message
  (tenant_id, entry_id, message_code, direction, status, attempt_count,
   cbp_reference, acknowledged_at_utc, created_at_utc, sent_at_utc) VALUES
  (2001, 1001, 'SE', 'Out', 'AckReceived', 1, 'CBP-REF-001', '2026-04-22 14:32:00', '2026-04-22 14:30:00', '2026-04-22 14:30:00'),
  (2001, 1001, 'UR', 'In',  'AckReceived', 1, 'CBP-REF-002', '2026-04-23 09:15:00', '2026-04-23 09:15:00', '2026-04-23 09:15:00'),
  (2001, 1002, 'SE', 'Out', 'AckReceived', 1, 'CBP-REF-003', '2026-04-26 08:05:00', '2026-04-26 08:00:00', '2026-04-26 08:00:00'),
  (2001, 1002, 'UC', 'In',  'AckReceived', 1, 'CBP-REF-004', '2026-04-26 09:30:00', '2026-04-26 09:30:00', '2026-04-26 09:30:00'),
  (2001, 1003, 'SE', 'Out', 'AckReceived', 1, 'CBP-REF-005', '2026-05-02 14:02:00', '2026-05-02 14:00:00', '2026-05-02 14:00:00'),
  (2001, 1003, 'UC', 'In',  'AckReceived', 1, 'CBP-REF-006', '2026-05-02 14:30:00', '2026-05-02 14:30:00', '2026-05-02 14:30:00');

-- =====================================================================
-- End of M4-US fixtures
-- =====================================================================

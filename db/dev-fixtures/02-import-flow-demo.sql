-- =====================================================================
-- CP17 import-flow demo seed — one realistic in-flight ocean import,
-- end-to-end through the Milestone-1 module set.
--
-- Story: Tata Steel (customer 101) imports steel coils from Maersk China
-- via Singapore (transit) into Mumbai. Booking → Shipment → 2 containers →
-- 4 milestones (booked, departed, in-transit, arrived) → 6 charges (ocean
-- freight, BAF, fuel, brokerage, duty, accessorial) → 1 invoice → 0 holds.
--
-- All IDs in the 9000–9099 range to avoid collision with manual test rows
-- (which usually fall in 1–999) or other seed scripts.
--
-- Idempotent: INSERT IGNORE on every row. Re-running is a no-op.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- Demo customer parties — extend the existing M1 fixture set with one
-- known-id row that the import flow narrates around.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m1_party
  (id, tenant_id, country_code, party_type, legal_name, trade_name, is_active,
   preferred_locale, preferred_currency, default_payment_terms, tax_status,
   created_at_utc, modified_at_utc) VALUES
  -- Demo carrier (Maersk Line) — issuer of the MBL
  (9001, 1001, 'IN', 'CARRIER', 'Maersk Line Singapore', 'Maersk Line',    1, 'en-IN', 'USD', 'NET 30', 'Regular GST', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  -- Demo broker — files the customs entry on importer's behalf
  (9002, 1001, 'IN', 'BROKER',  'JP Customs Services',  'JP CHA',          1, 'en-IN', 'INR', 'NET 15', 'Regular GST', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------
-- Demo product — what's on the shipment
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m1_product
  (id, tenant_id, country_code, product_code, product_name, product_description,
   product_type, uom_code, weight_kg, volume_cbm, hs_code, hsn_code,
   country_of_origin, is_hazmat, is_perishable, is_temperature_controlled, is_dual_use,
   created_at_utc, modified_at_utc) VALUES
  (9001, 1001, 'IN', 'STEEL-COIL-HR', 'Hot-Rolled Steel Coils',
   'Hot-rolled carbon steel coils, 2mm thickness, 1500mm wide, mill-finished.',
   'GOODS', 'TON', 1000.000, 0.127, '7208.39', '72083900',
   'CN', 0, 0, 0, 0,
   CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------
-- M5 — Booking
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m5_booking
  (id, tenant_id, country_code, booking_number, customer_party_id,
   shipper_party_id, consignee_party_id, notify_party_id,
   trade_direction, mode, service_type, incoterm,
   origin_port_id, destination_port_id,
   expected_pickup_date, expected_delivery_date,
   declared_value_amount, declared_value_currency,
   ff_assigned_party_id, status, remarks, estimated_crd,
   created_at_utc, modified_at_utc) VALUES
  (9001, 1001, 'IN', 'BKG-DEMO-IMPORT-001', 101,
   9001, 101, 101,
   'IMPORT', 'OCEAN_FCL', 'PORT_PORT', 'CFR',
   1, 2,  -- Origin SGSIN, destination INNSA (Nhava Sheva)
   '2026-04-15', '2026-05-08',
   45000.00, 'USD',
   103, 'CONFIRMED', 'Demo seed — agent-driven import scenario.', '2026-04-12',
   CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------
-- M5 — Shipment (linked to the booking + CP13 trade_direction backfilled)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m5_shipment
  (id, tenant_id, country_code, shipment_number, booking_id,
   mode, trade_direction,
   carrier_party_id, vessel_or_flight, voyage_or_flight_no,
   etd, eta, atd, ata,
   origin_port_id, destination_port_id, status, remarks,
   created_at_utc, modified_at_utc) VALUES
  (9001, 1001, 'IN', 'SHP-DEMO-IMPORT-001', 9001,
   'OCEAN_FCL', 'IMPORT',
   9001, 'MV Maersk Stadelhorn', '0428E',
   '2026-04-22 18:00:00.000', '2026-05-05 06:00:00.000',
   '2026-04-22 19:30:00.000', NULL,  -- departed, not yet arrived
   1, 2, 'IN_TRANSIT', 'In transit — vessel passed Colombo 2026-04-29.',
   CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------
-- M5 — Containers (2 × 40HC)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m5_container
  (id, tenant_id, shipment_id, container_number, container_type,
   seal_number, tare_weight_kg, cargo_weight_kg, free_days, status,
   created_at_utc, modified_at_utc) VALUES
  (9001, 1001, 9001, 'MAEU 7654321', '40HC', 'SEAL-001A', 3900.000, 22500.000, 7, 'IN_TRANSIT', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (9002, 1001, 9001, 'MAEU 7654322', '40HC', 'SEAL-001B', 3900.000, 22500.000, 7, 'IN_TRANSIT', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------
-- M5 — Milestones (4 events showing the in-transit progression)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m5_milestone
  (id, tenant_id, shipment_id, milestone_code, occurred_at_utc, location_port_id,
   source, remarks, created_at_utc) VALUES
  (9001, 1001, 9001, 'BOOKING_CONFIRMED', '2026-04-12 09:00:00.000',    1, 'MANUAL', 'Booking confirmed by Maersk', CURRENT_TIMESTAMP(3)),
  (9002, 1001, 9001, 'GATE_IN',           '2026-04-21 14:00:00.000',    1, 'CARRIER_API', 'Containers gated in at SGSIN', CURRENT_TIMESTAMP(3)),
  (9003, 1001, 9001, 'VESSEL_DEPARTED',   '2026-04-22 19:30:00.000',    1, 'CARRIER_API', 'MV Maersk Stadelhorn departed Singapore',  CURRENT_TIMESTAMP(3)),
  (9004, 1001, 9001, 'IN_TRANSIT',        '2026-04-29 02:15:00.000', NULL, 'GPS', 'Vessel position update — passed Colombo',          CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------
-- M5 — Charges (drives CP13 landed-cost calc)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m5_charge_line
  (id, tenant_id, shipment_id, charge_code, rate_card_id,
   quantity, uom_code, unit_price_amount, unit_price_currency,
   amount_amount, amount_currency, is_billable,
   created_at_utc, modified_at_utc) VALUES
  (9001, 1001, 9001, 'OCEAN_FREIGHT',     NULL, 2, 'CONT_40HC',  3500.00, 'USD',  7000.00, 'USD', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (9002, 1001, 9001, 'FUEL',              NULL, 2, 'CONT_40HC',   450.00, 'USD',   900.00, 'USD', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (9003, 1001, 9001, 'BROKERAGE',         NULL, 1, 'EACH',        250.00, 'USD',   250.00, 'USD', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (9004, 1001, 9001, 'CUSTOMS_CLEARANCE', NULL, 1, 'EACH',        150.00, 'USD',   150.00, 'USD', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (9005, 1001, 9001, 'DUTY',              NULL, 1, 'EACH',       4500.00, 'USD',  4500.00, 'USD', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (9006, 1001, 9001, 'HANDLING',          NULL, 2, 'CONT_40HC',   180.00, 'USD',   360.00, 'USD', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- Expected landed-cost rollup (CP13 GET /shipments/9001/landed-cost):
--   freight     = 7000 + 900    = 7900   (OCEAN_FREIGHT + FUEL)
--   brokerage   = 250  + 150    = 400    (BROKERAGE + CUSTOMS_CLEARANCE)
--   duty        = 4500           = 4500   (DUTY)
--   accessorial = 360            = 360    (HANDLING)
--   other       = 0
--   total       = 13160 USD

-- ---------------------------------------------------------------------
-- M5 — Memo (becomes the first row of the v2 task-history timeline)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m5_shipment_memo
  (id, tenant_id, shipment_id, body, is_pinned, author_user_id,
   created_at_utc) VALUES
  (9001, 1001, 9001, 'Demo seed: customer confirmed 8 May ETA acceptable. Track demurrage closely — last shipment incurred 5 days.', 1, NULL, CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------
-- Milestone 3 mirror — Invoice referencing the shipment (CP13 FK)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m17_invoice
  (id, tenant_id, country_code, invoice_number, invoice_date, due_date,
   customer_party_id, shipment_id,
   currency, func_currency, fx_rate,
   subtotal_amount, tax_amount, total_amount, paid_amount,
   payment_terms, notes, status,
   created_at_utc, modified_at_utc) VALUES
  (9001, 1001, 'IN', 'INV-DEMO-IMPORT-001', '2026-05-01', '2026-05-31',
   101, 9001,
   'USD', 'INR', 83.50,
   13160.00, 2369.00, 15529.00, 0.00,
   'NET 30', 'Demo seed — invoice for the in-flight import scenario. Posted, not yet paid (so it appears in the In-Transit Tab 5).',
   'POSTED',
   CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- ---------------------------------------------------------------------
-- M2 — Lead + Opportunity (so Sales/CRM has something for beta users)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m2_lead
  (id, tenant_id, country_code, lead_number, source,
   contact_name, company_name, email, phone, industry, estimated_volume,
   stage, owner_user_id, converted_party_id,
   created_at_utc, modified_at_utc) VALUES
  (9001, 1001, 'IN', 'LEAD-DEMO-001', 'WEB',
   'Priya Sharma', 'Coastal Bulk Traders', 'priya@coastalbulk.example', '+91 22 5555 0001',
   'Steel & Metals', '40 TEUs / month',
   'QUALIFIED', NULL, NULL,
   CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO m2_opportunity
  (id, tenant_id, country_code, opp_number, party_id, title,
   estimated_value, estimated_currency, expected_close, probability_pct,
   stage, owner_user_id,
   created_at_utc, modified_at_utc) VALUES
  (9001, 1001, 'IN', 'OPP-DEMO-001', 101, 'Annual freight contract — Tata Steel imports',
   2400000.00, 'USD', '2026-06-30', 65.0,
   'PROPOSAL', NULL,
   CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- =====================================================================
-- End of CP17 import-flow demo seed.
-- =====================================================================

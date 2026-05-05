-- =====================================================================
-- M10 Trucking — dev fixtures (tenant 1001 IN + tenant 2001 US)
-- 6 drivers (mix of company + owner-op), 5 trucks, 8 chassis, 2 maint windows,
-- 8 accessorials, 7 jobs across all status states, status events, 4 appointments,
-- 3 PODs, 5 job-accessorial entries.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- Drivers
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m10_driver
  (id, tenant_id, driver_code, full_name, driver_type, license_number, license_class,
   license_expiry, twic_card_expiry, medical_card_expiry, phone, email,
   availability, hire_date, notes, is_active, created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'DR-IN-001', 'Ramesh Patel',     'CompanyEmployee', 'MH-12-345678', 'HMV',  '2027-06-30', NULL,        '2026-09-30', '+91-98765-43210', 'ramesh@ulp.in',  'OnLoad',     '2024-01-15', NULL, 1, '2024-01-15 09:00:00', '2026-05-03 09:00:00'),
  (2, 1001, 'DR-IN-002', 'Suresh Kumar',     'CompanyEmployee', 'MH-12-345679', 'HMV',  '2026-12-31', NULL,        '2026-08-15', '+91-98765-43211', 'suresh@ulp.in',  'Available',  '2024-03-01', NULL, 1, '2024-03-01 09:00:00', '2026-05-03 09:00:00'),
  (3, 1001, 'DR-IN-003', 'Vijay Singh',      'OwnerOperator',   'MH-12-345680', 'HMV',  '2027-03-31', NULL,        '2026-11-20', '+91-98765-43212', NULL,             'OffDuty',    '2024-06-01', 'Owner-operator with own truck', 1, '2024-06-01 09:00:00', '2026-05-03 09:00:00'),
  (4, 2001, 'DR-US-001', 'John Anderson',    'CompanyEmployee', 'CA-D9876543',  'CDL-A','2027-01-15', '2026-12-31','2026-10-31', '+1-310-555-0101', 'janderson@ulp.us','OnLoad',    '2023-08-10', NULL, 1, '2023-08-10 09:00:00', '2026-05-03 09:00:00'),
  (5, 2001, 'DR-US-002', 'Maria Rodriguez',  'CompanyEmployee', 'CA-D9876544',  'CDL-A','2027-04-22', '2027-02-15','2026-09-15', '+1-310-555-0102', 'mrodriguez@ulp.us','Available', '2024-02-01', NULL, 1, '2024-02-01 09:00:00', '2026-05-03 09:00:00'),
  (6, 2001, 'DR-US-003', 'Bob Williams',     'OwnerOperator',   'CA-D9876545',  'CDL-A','2026-08-01', '2026-07-30','2026-08-01', '+1-310-555-0103', NULL,             'Available',  '2024-09-15', 'Has own tractor + reefer chassis', 1, '2024-09-15 09:00:00', '2026-05-03 09:00:00');

-- ---------------------------------------------------------------------
-- Trucks
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m10_truck
  (id, tenant_id, truck_number, vin, license_plate, make, model, year,
   ownership, owner_party_id, status, registration_expiry, insurance_expiry, notes,
   created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'TRK-IN-101', '1FTRX18W23NA12345', 'MH-12-AB-1234', 'Tata',     'Prima 4928', 2023, 'CompanyOwned',   NULL, 'InService',     '2027-06-30', '2026-12-31', NULL,             '2023-06-01 00:00:00', '2026-05-03 00:00:00'),
  (2, 1001, 'TRK-IN-102', '1FTRX18W23NA12346', 'MH-12-AB-1235', 'Ashok Leyland', 'AVTR 4023', 2024, 'CompanyOwned', NULL, 'InService',  '2027-08-15', '2027-01-31', NULL,             '2024-02-15 00:00:00', '2026-05-03 00:00:00'),
  (3, 1001, 'TRK-IN-103', '1FTRX18W23NA12347', 'MH-12-AB-1236', 'Volvo',    'FH 460',     2022, 'OwnerOperator',  103,  'InMaintenance', '2027-04-30', '2026-11-30', 'Owner: Maersk', '2022-09-01 00:00:00', '2026-05-02 00:00:00'),
  (4, 2001, 'TRK-US-201', '1HTMMAAR3JH123456', 'CA-7XYZ123',    'Freightliner', 'Cascadia', 2024, 'CompanyOwned', NULL, 'InService',  '2027-12-31', '2027-03-31', NULL,             '2024-01-10 00:00:00', '2026-05-03 00:00:00'),
  (5, 2001, 'TRK-US-202', '1HTMMAAR3JH123457', 'CA-7XYZ124',    'Peterbilt','389',        2023, 'OwnerOperator',  202,  'InService',     '2027-09-30', '2026-12-31', 'Owner: FedEx',  '2023-09-15 00:00:00', '2026-05-03 00:00:00');

-- ---------------------------------------------------------------------
-- Chassis (8 mixed types/ownership)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m10_chassis
  (id, tenant_id, chassis_number, chassis_type, ownership, pool_provider, status,
   current_container, current_location, registration_expiry, notes, created_at_utc, modified_at_utc) VALUES
  (1, 1001, 'CHS-IN-001', 'Standard40', 'CompanyOwned', NULL,        'InUse',         'TCLU1234567', 'JNPT Yard A',         '2027-06-30', NULL, '2023-06-01 00:00:00', '2026-05-03 09:00:00'),
  (2, 1001, 'CHS-IN-002', 'Standard40', 'CompanyOwned', NULL,        'Available',     NULL,          'Pune Depot',          '2027-06-30', NULL, '2023-06-01 00:00:00', '2026-05-03 09:00:00'),
  (3, 1001, 'CHS-IN-003', 'Standard20', 'CompanyOwned', NULL,        'Available',     NULL,          'JNPT Yard A',         '2027-06-30', NULL, '2023-06-01 00:00:00', '2026-05-03 09:00:00'),
  (4, 1001, 'CHS-IN-004', 'Tri-Axle',   'Pool',         'TRAC',      'InMaintenance', NULL,          'TRAC Pool JNPT',      '2027-06-30', 'Bearing replacement', '2024-01-01 00:00:00', '2026-05-02 00:00:00'),
  (5, 2001, 'CHS-US-001', 'Standard40', 'CompanyOwned', NULL,        'InUse',         'MAEU8888888', 'LAX Pier A',          '2027-12-31', NULL, '2023-08-10 00:00:00', '2026-05-03 09:00:00'),
  (6, 2001, 'CHS-US-002', 'Standard20', 'Pool',         'FLEXI-VAN', 'Available',     NULL,          'FLEXI Pool LAX',      '2027-12-31', NULL, '2024-01-01 00:00:00', '2026-05-03 09:00:00'),
  (7, 2001, 'CHS-US-003', 'Reefer',     'CompanyOwned', NULL,        'Available',     NULL,          'LAX Cold Yard',       '2027-12-31', '40HC reefer chassis', '2023-12-01 00:00:00', '2026-05-03 09:00:00'),
  (8, 2001, 'CHS-US-004', 'Standard40', 'Leased',       'XTRA Lease','OutOfService',  NULL,          'XTRA Lease Yard',     '2026-08-31', 'Returned to lessor 2026-04', '2024-03-01 00:00:00', '2026-04-30 00:00:00');

-- ---------------------------------------------------------------------
-- Equipment maintenance
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m10_equipment_maint
  (tenant_id, equipment_kind, equipment_id, maint_type, description,
   start_date, end_date, cost_amount, vendor_party_id, notes, status, created_at_utc) VALUES
  (1001, 'Truck',   3, 'PMI',           'Quarterly preventive maintenance',  '2026-05-01', '2026-05-05', 12500.00, NULL, '50,000 km service',  'InProgress', '2026-05-01 09:00:00'),
  (1001, 'Chassis', 4, 'RepairBreakdown','Bearing replacement on tri-axle', '2026-04-28', NULL,         8500.00,  NULL, 'Awaiting parts',     'InProgress', '2026-04-28 14:00:00');

-- ---------------------------------------------------------------------
-- Accessorials (8 — common drayage charges)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m10_accessorial
  (id, tenant_id, code, name, category, default_rate, currency, uom, free_units, is_active, notes) VALUES
  (1,  1001, 'DET-DRV',  'Driver detention',          'Detention',     500.00,  'INR', 'PerHour', 2,    1, 'After 2 free hours at facility'),
  (2,  1001, 'CHS-DD',   'Chassis per diem',          'PerDiem',       350.00,  'INR', 'PerDay',  NULL, 1, 'Per day chassis usage'),
  (3,  1001, 'TONU',     'TONU / dry run',            'TonuDryRun',    2500.00, 'INR', 'Flat',    NULL, 1, 'Truck arrived, no load to pick'),
  (4,  1001, 'PRECOOL',  'Reefer pre-cool',           'PreCool',       1000.00, 'INR', 'Flat',    NULL, 1, 'Reefer pre-cooling charge'),
  (11, 2001, 'DET-DRV',  'Driver detention',          'Detention',     75.00,   'USD', 'PerHour', 2,    1, 'After 2 free hours at facility'),
  (12, 2001, 'CHS-DD',   'Chassis per diem',          'PerDiem',       40.00,   'USD', 'PerDay',  NULL, 1, 'Per day chassis usage'),
  (13, 2001, 'TONU',     'TONU / dry run',            'TonuDryRun',    250.00,  'USD', 'Flat',    NULL, 1, 'Truck arrived, no load to pick'),
  (14, 2001, 'PORT-FEE', 'Port traffic mitigation',   'PortFee',       35.00,   'USD', 'Flat',    NULL, 1, 'POLA / POLB PTM fee');

-- ---------------------------------------------------------------------
-- Jobs (7 jobs spanning all status states)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m10_job
  (id, tenant_id, country_code, job_number, customer_party_id, cust_ref, move_type, notes,
   bl_number, ssl_code, container_number, container_size, weight_kg,
   pu_location, pu_date, pu_time, pu_appointment_required,
   del_location, del_date, del_time, del_appointment_required,
   eta_date, lfd_date, empty_ready_date,
   return_location, return_date, return_time, return_number,
   driver_id, truck_id, chassis_id, chassis_owned, chassis_type,
   availability_status, hold_reason,
   created_at_utc, modified_at_utc, dispatched_at_utc, outgated_at_utc, completed_at_utc) VALUES
  -- 1) NotReadyForPickup (with hold)
  (1, 1001, 'IN', 'JOB-2026-IN-0001', 101, 'TATA-PO-99001', 'FCL', 'Steel coils — 28T heavy',
   'MAEU123456789', 'MAEU', 'TCLU1234567', '40FT', 28000.00,
   'JNPT Pier 5', '2026-05-04', '14:00:00', 1,
   'Tata Pune Plant', '2026-05-05', '10:00:00', 1,
   '2026-05-03', '2026-05-08', NULL,
   'JNPT Yard A', NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL,
   'NotReadyForPickup', 'Customs hold pending PGA release',
   '2026-05-02 09:00:00', '2026-05-03 09:00:00', NULL, NULL, NULL),
  -- 2) AvailablePendingAppointment (no driver yet)
  (2, 1001, 'IN', 'JOB-2026-IN-0002', 102, 'REL-PO-44002', 'FCL', NULL,
   'COSU987654321', 'COSU', 'COSU2345678', '40HC', 22000.00,
   'JNPT Pier 3', '2026-05-04', NULL, 1,
   'Reliance Mumbai Warehouse', '2026-05-05', NULL, 1,
   '2026-05-03', '2026-05-09', NULL,
   'JNPT Yard A', NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL,
   'AvailablePendingAppointment', NULL,
   '2026-05-02 10:00:00', '2026-05-03 10:00:00', NULL, NULL, NULL),
  -- 3) Dispatched (driver + chassis assigned, ready to roll)
  (3, 1001, 'IN', 'JOB-2026-IN-0003', 101, 'TATA-PO-99002', 'FCL', NULL,
   'EGLV555111222', 'EGLV', 'EGLU3344556', '20FT', 18000.00,
   'JNPT Pier 7', '2026-05-03', '11:00:00', 1,
   'Tata Mumbai Plant', '2026-05-03', '15:00:00', 1,
   '2026-05-02', '2026-05-07', NULL,
   'JNPT Yard B', NULL, NULL, NULL,
   1, 1, 3, 1, 'Standard20',
   'Dispatched', NULL,
   '2026-05-02 11:00:00', '2026-05-03 09:30:00', '2026-05-03 09:30:00', NULL, NULL),
  -- 4) OutGated (driver picked up; en route)
  (4, 1001, 'IN', 'JOB-2026-IN-0004', 102, 'REL-PO-44003', 'FCL', NULL,
   'MAEU123456788', 'MAEU', 'TCLU1234566', '40FT', 25000.00,
   'JNPT Pier 5', '2026-05-02', '09:00:00', 0,
   'Reliance Pune Plant', '2026-05-03', NULL, 1,
   '2026-05-01', '2026-05-06', NULL,
   'JNPT Yard A', NULL, NULL, NULL,
   1, 1, 1, 1, 'Standard40',
   'OutGated', NULL,
   '2026-05-01 14:00:00', '2026-05-02 12:00:00', '2026-05-02 08:00:00', '2026-05-02 11:00:00', NULL),
  -- 5) WaitingReturnNotify (delivered; awaiting cnee empty notify)
  (5, 1001, 'IN', 'JOB-2026-IN-0005', 101, 'TATA-PO-99003', 'FCL', NULL,
   'COSU987654322', 'COSU', 'COSU2345677', '40HC', 27000.00,
   'JNPT Pier 4', '2026-04-28', '10:00:00', 0,
   'Tata Pune Plant', '2026-04-29', '14:00:00', 1,
   '2026-04-27', '2026-05-02', NULL,
   'JNPT Yard A', NULL, NULL, NULL,
   2, 2, 2, 1, 'Standard40',
   'WaitingReturnNotify', NULL,
   '2026-04-26 14:00:00', '2026-04-29 17:00:00', '2026-04-28 08:00:00', '2026-04-28 09:30:00', NULL),
  -- 6) Completed (full lifecycle done; container returned)
  (6, 1001, 'IN', 'JOB-2026-IN-0006', 102, 'REL-PO-44001', 'FCL', NULL,
   'EGLV555111111', 'EGLV', 'EGLU3344555', '40FT', 24000.00,
   'JNPT Pier 6', '2026-04-25', '08:00:00', 0,
   'Reliance Mumbai Warehouse', '2026-04-25', '14:00:00', 1,
   '2026-04-24', '2026-04-30', '2026-04-26',
   'JNPT Yard B', '2026-04-27', '10:00:00', 'RTN-EGLV-2026-001122',
   2, 2, 1, 1, 'Standard40',
   'Completed', NULL,
   '2026-04-24 09:00:00', '2026-04-27 11:00:00', '2026-04-25 07:00:00', '2026-04-25 08:30:00', '2026-04-27 11:00:00'),
  -- 7) US Dispatched
  (7, 2001, 'US', 'JOB-2026-US-0001', 201, 'WMT-PO-77001', 'FCL', 'High value — door-door',
   'MAEU8888888888', 'MAEU', 'MAEU8888888', '40HC', 26000.00,
   'LAX Pier A', '2026-05-04', '09:00:00', 1,
   'Walmart DC #6020 Bentonville', '2026-05-08', '12:00:00', 1,
   '2026-05-03', '2026-05-10', NULL,
   'LAX Pier A', NULL, NULL, NULL,
   4, 4, 5, 1, 'Standard40',
   'Dispatched', NULL,
   '2026-05-02 16:00:00', '2026-05-03 09:00:00', '2026-05-03 09:00:00', NULL, NULL);

-- ---------------------------------------------------------------------
-- Job status events (audit trail for jobs 4, 5, 6)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m10_job_status_event
  (tenant_id, job_id, from_status, to_status, occurred_at_utc, occurred_by, driver_id, location_text, notes) VALUES
  (1001, 4, 'AvailablePendingAppointment', 'Dispatched',         '2026-05-02 08:00:00', 1, 1, 'JNPT Yard A',           'Driver arrived for pickup'),
  (1001, 4, 'Dispatched',                  'OutGated',           '2026-05-02 11:00:00', 1, 1, 'JNPT Gate 3',           'Container outgated successfully'),
  (1001, 5, 'Dispatched',                  'OutGated',           '2026-04-28 09:30:00', 1, 2, 'JNPT Gate 2',           'Outgated for delivery'),
  (1001, 5, 'OutGated',                    'WaitingReturnNotify','2026-04-29 17:00:00', 1, 2, 'Tata Pune Plant',       'Delivered, awaiting empty notify'),
  (1001, 6, 'WaitingReturnNotify',         'Completed',          '2026-04-27 11:00:00', 1, 2, 'JNPT Yard B',           'Empty returned'),
  (2001, 7, 'AvailablePendingAppointment', 'Dispatched',         '2026-05-03 09:00:00', 1, 4, 'LAX Pier A Dispatch',   'Assigned John Anderson + truck TRK-US-201');

-- ---------------------------------------------------------------------
-- Job accessorials (real-world: detention + chassis per-diem on a few jobs)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m10_job_accessorial
  (tenant_id, job_id, accessorial_id, occurred_at, quantity, rate, amount, currency, notes,
   added_by, source, created_at_utc) VALUES
  -- Job 4 — driver waited 4 hrs at delivery, billed for 2 chargeable hours (4 - 2 free)
  (1001, 4, 1, '2026-05-03', 2,  500.00, 1000.00, 'INR', 'Wait at Reliance facility', 1, 'Manual',    '2026-05-03 12:00:00'),
  -- Job 5 — chassis per diem (3 days)
  (1001, 5, 2, '2026-05-02', 3,  350.00, 1050.00, 'INR', 'Chassis pending return',     1, 'Suggested', '2026-05-02 10:00:00'),
  -- Job 6 — completed, all charges in
  (1001, 6, 1, '2026-04-25', 1,  500.00,  500.00, 'INR', 'Wait at Reliance Mumbai',   1, 'Manual',    '2026-04-25 16:00:00'),
  (1001, 6, 2, '2026-04-25', 2,  350.00,  700.00, 'INR', 'Chassis 2 days',            1, 'Suggested', '2026-04-27 11:30:00'),
  -- Job 7 (US) — port fee
  (2001, 7, 14,'2026-05-04', 1,   35.00,   35.00, 'USD', 'POLA PTM',                  1, 'Suggested', '2026-05-03 10:00:00');

-- ---------------------------------------------------------------------
-- PODs (3 — covering jobs 5, 6, and partial)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m10_pod
  (tenant_id, job_id, pod_kind, signed_by_name, signed_at_utc, signature_ref,
   document_id, uploaded_by_driver, geo_lat, geo_lon, notes, created_at_utc) VALUES
  (1001, 5, 'GateReceiptOut', 'Gate Officer Pier 4',        '2026-04-28 09:30:00', 'sig://gate-jnpt-2026042809',  NULL, 2, 18.94560, 72.83300, 'Out gate JNPT', '2026-04-28 09:30:00'),
  (1001, 5, 'SignedPOD',      'Suresh Pawar (Tata Pune)',   '2026-04-29 14:25:00', 'sig://customer-tata-pune-220', NULL, 2, 18.51960, 73.85530, 'Signed at Tata Pune Plant gate', '2026-04-29 14:25:00'),
  (1001, 6, 'EmptyReceipt',   'JNPT Empty Return Office',   '2026-04-27 11:00:00', 'sig://empty-return-2026042711', NULL, 2, 18.94560, 72.83300, 'Empty container returned', '2026-04-27 11:00:00');

-- ---------------------------------------------------------------------
-- Appointments (4 — covering jobs 1, 2, 3, 7)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO m10_appointment
  (tenant_id, job_id, appointment_kind, appointment_dt, duration_min,
   facility_name, confirmation_number, status, notes, created_at_utc, modified_at_utc) VALUES
  (1001, 2, 'Pickup',      '2026-05-04 11:00:00', 60,  'JNPT Pier 3',           'JNPT-APPT-205501', 'Confirmed', NULL, '2026-05-03 09:00:00', '2026-05-03 09:00:00'),
  (1001, 3, 'Pickup',      '2026-05-03 11:00:00', 30,  'JNPT Pier 7',           'JNPT-APPT-205502', 'Completed', 'Successful pickup', '2026-05-02 14:00:00', '2026-05-03 09:30:00'),
  (1001, 3, 'Delivery',    '2026-05-03 15:00:00', 60,  'Tata Mumbai Plant',     'TATA-APPT-100123', 'Confirmed', NULL, '2026-05-02 14:30:00', '2026-05-02 14:30:00'),
  (2001, 7, 'Pickup',      '2026-05-04 09:00:00', 60,  'LAX Pier A Gate 3',     'LAX-APPT-700123',  'Confirmed', NULL, '2026-05-02 16:00:00', '2026-05-02 16:00:00');

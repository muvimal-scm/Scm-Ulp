-- =====================================================================
-- M10 Trucking — closes SCM client Milestone 4 (Trucking).
--
-- Tables:
--   m10_driver           — driver master (company employees + owner-operators)
--   m10_truck            — truck master (company-owned + owner-operator)
--   m10_chassis          — chassis master (owned + leased)
--   m10_equipment_maint  — maintenance windows for trucks + chassis
--   m10_job              — job header (one per move)
--   m10_job_status_event — status change history
--   m10_accessorial      — accessorial master (rate card)
--   m10_job_accessorial  — accessorials applied to a job
--   m10_pod              — Proof of Delivery (driver app upload)
--   m10_appointment      — pickup/delivery/return appointments
--
-- Conventions (CLAUDE.md): tenant_id INT + country_code CHAR(2) on top-level entities,
-- module-prefixed FK/UNIQUE/INDEX names, idempotent CREATE TABLE IF NOT EXISTS.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- m10_driver — drivers (company employees + owner-operators)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m10_driver (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  driver_code         VARCHAR(20) NOT NULL,
  full_name           VARCHAR(150) NOT NULL,
  driver_type         ENUM('CompanyEmployee','OwnerOperator') NOT NULL DEFAULT 'CompanyEmployee',
  license_number      VARCHAR(30) NULL,
  license_class       VARCHAR(10) NULL,                       -- A, B, CDL-A, etc.
  license_expiry      DATE NULL,
  twic_card_expiry    DATE NULL,
  medical_card_expiry DATE NULL,
  phone               VARCHAR(20) NULL,
  email               VARCHAR(150) NULL,
  current_truck_id    BIGINT NULL,
  availability        ENUM('Available','OnLoad','OffDuty','Sick','Vacation','OutOfService') NOT NULL DEFAULT 'Available',
  hire_date           DATE NULL,
  notes               VARCHAR(500) NULL,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m10_driver_tenant_code (tenant_id, driver_code),
  INDEX idx_m10_driver_avail (tenant_id, availability, is_active)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m10_truck — trucks (company-owned + owner-operator)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m10_truck (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  truck_number        VARCHAR(20) NOT NULL,
  vin                 VARCHAR(17) NULL,
  license_plate       VARCHAR(15) NULL,
  make                VARCHAR(50) NULL,
  model               VARCHAR(50) NULL,
  year                INT NULL,
  ownership           ENUM('CompanyOwned','OwnerOperator','Leased') NOT NULL DEFAULT 'CompanyOwned',
  owner_party_id      BIGINT NULL,                            -- FK m1_party for owner-operator
  status              ENUM('InService','InMaintenance','OutOfService','Sold') NOT NULL DEFAULT 'InService',
  registration_expiry DATE NULL,
  insurance_expiry    DATE NULL,
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m10_truck_tenant_num (tenant_id, truck_number),
  INDEX idx_m10_truck_status (tenant_id, status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m10_chassis — chassis (owned + leased + pool)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m10_chassis (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  chassis_number      VARCHAR(20) NOT NULL,
  chassis_type        ENUM('Standard20','Standard40','Tri-Axle','Light','Gooseneck','Reefer','Other') NOT NULL,
  ownership           ENUM('CompanyOwned','Leased','Pool') NOT NULL DEFAULT 'CompanyOwned',
  pool_provider       VARCHAR(100) NULL,                      -- e.g. "TRAC", "FLEXI-VAN"
  status              ENUM('Available','InUse','InMaintenance','OutOfService') NOT NULL DEFAULT 'Available',
  current_container   VARCHAR(15) NULL,                       -- container # currently mounted, NULL when idle
  current_location    VARCHAR(100) NULL,
  registration_expiry DATE NULL,
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m10_chassis_tenant_num (tenant_id, chassis_number),
  INDEX idx_m10_chassis_status (tenant_id, status, chassis_type)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m10_equipment_maint — maintenance windows for trucks + chassis
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m10_equipment_maint (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  equipment_kind      ENUM('Truck','Chassis') NOT NULL,
  equipment_id        BIGINT NOT NULL,
  maint_type          ENUM('PMI','RepairBreakdown','Inspection','TireService','BodyRepair','Other') NOT NULL,
  description         VARCHAR(255) NOT NULL,
  start_date          DATE NOT NULL,
  end_date            DATE NULL,
  cost_amount         DECIMAL(12,2) NULL,
  vendor_party_id     BIGINT NULL,
  notes               VARCHAR(500) NULL,
  status              ENUM('Scheduled','InProgress','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
  created_at_utc      DATETIME(3) NOT NULL,
  INDEX idx_m10_em_equipment (equipment_kind, equipment_id, status),
  INDEX idx_m10_em_tenant_window (tenant_id, start_date, end_date)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m10_job — trucking job header (one per container move)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m10_job (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  job_number          VARCHAR(30) NOT NULL,
  customer_party_id   BIGINT NOT NULL,
  cust_ref            VARCHAR(60) NULL,
  move_type           ENUM('FCL','LTL','FTL','Drayage','LiveUnload','DropAndPick') NOT NULL DEFAULT 'FCL',
  notes               VARCHAR(1000) NULL,                     -- "special equipment" etc.
  -- Container/manifest refs
  bl_number           VARCHAR(50) NULL,
  ssl_code            VARCHAR(20) NULL,                       -- Steamship Line code (carrier SCAC) — `ssl` is MySQL reserved
  container_number    VARCHAR(15) NULL,
  container_size      ENUM('20FT','40FT','40HC','45HC','53FT','Other') NULL,
  weight_kg           DECIMAL(12,2) NULL,
  -- Pickup
  pu_location         VARCHAR(255) NULL,
  pu_date             DATE NULL,
  pu_time             TIME NULL,
  pu_appointment_required TINYINT(1) NOT NULL DEFAULT 0,
  -- Delivery
  del_location        VARCHAR(255) NULL,
  del_date            DATE NULL,
  del_time            TIME NULL,
  del_appointment_required TINYINT(1) NOT NULL DEFAULT 0,
  -- Container availability dates
  eta_date            DATE NULL,
  lfd_date            DATE NULL,                              -- Last Free Day
  empty_ready_date    DATE NULL,                              -- cnee notifies when container is empty
  -- Return
  return_location     VARCHAR(255) NULL,
  return_date         DATE NULL,
  return_time         TIME NULL,
  return_number       VARCHAR(40) NULL,
  -- Equipment + driver
  driver_id           BIGINT NULL,
  truck_id            BIGINT NULL,
  chassis_id          BIGINT NULL,
  chassis_owned       TINYINT(1) NULL,                        -- copied flag for quick reference
  chassis_type        VARCHAR(50) NULL,
  -- Status
  availability_status ENUM('NotReadyForPickup','AvailablePendingAppointment','Dispatched','OutGated','WaitingReturnNotify','Completed','Cancelled') NOT NULL DEFAULT 'NotReadyForPickup',
  hold_reason         VARCHAR(255) NULL,
  -- Audit
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  dispatched_at_utc   DATETIME(3) NULL,
  outgated_at_utc     DATETIME(3) NULL,
  completed_at_utc    DATETIME(3) NULL,
  UNIQUE KEY uq_m10_job_tenant_num (tenant_id, job_number),
  INDEX idx_m10_job_status (tenant_id, availability_status, pu_date),
  INDEX idx_m10_job_driver (driver_id, pu_date),
  INDEX idx_m10_job_customer (tenant_id, customer_party_id, pu_date),
  CONSTRAINT fk_m10_job_country  FOREIGN KEY (country_code)      REFERENCES m1_country(code),
  CONSTRAINT fk_m10_job_customer FOREIGN KEY (customer_party_id) REFERENCES m1_party(id),
  CONSTRAINT fk_m10_job_driver   FOREIGN KEY (driver_id)         REFERENCES m10_driver(id),
  CONSTRAINT fk_m10_job_truck    FOREIGN KEY (truck_id)          REFERENCES m10_truck(id),
  CONSTRAINT fk_m10_job_chassis  FOREIGN KEY (chassis_id)        REFERENCES m10_chassis(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m10_job_status_event — status change history per job (for audit + dispatcher view)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m10_job_status_event (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  job_id              BIGINT NOT NULL,
  from_status         VARCHAR(40) NULL,
  to_status           VARCHAR(40) NOT NULL,
  occurred_at_utc     DATETIME(3) NOT NULL,
  occurred_by         BIGINT NULL,
  driver_id           BIGINT NULL,
  location_text       VARCHAR(255) NULL,
  notes               VARCHAR(500) NULL,
  INDEX idx_m10_jse_job (job_id, occurred_at_utc),
  CONSTRAINT fk_m10_jse_job FOREIGN KEY (job_id) REFERENCES m10_job(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m10_accessorial — accessorial fee master (rate card per tenant)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m10_accessorial (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  code                VARCHAR(20) NOT NULL,
  name                VARCHAR(150) NOT NULL,
  category            ENUM('Detention','Demurrage','Chassis','PerDiem','PreCool','TonuDryRun','LayoverWaitTime','PortFee','OtherSurcharge') NOT NULL,
  default_rate        DECIMAL(12,2) NOT NULL,
  currency            CHAR(3) NOT NULL,
  uom                 ENUM('Flat','PerHour','PerDay','PerMile','PerKg','Other') NOT NULL DEFAULT 'Flat',
  free_units          DECIMAL(8,2) NULL,                      -- e.g., 2 free hours of detention
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  notes               VARCHAR(500) NULL,
  UNIQUE KEY uq_m10_acc_tenant_code (tenant_id, code),
  INDEX idx_m10_acc_active (tenant_id, is_active)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m10_job_accessorial — accessorials applied to a specific job
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m10_job_accessorial (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  job_id              BIGINT NOT NULL,
  accessorial_id      BIGINT NOT NULL,
  occurred_at         DATE NOT NULL,
  quantity            DECIMAL(8,2) NOT NULL DEFAULT 1,
  rate                DECIMAL(12,2) NOT NULL,
  amount              DECIMAL(12,2) NOT NULL,
  currency            CHAR(3) NOT NULL,
  notes               VARCHAR(500) NULL,
  added_by            BIGINT NULL,
  is_billed           TINYINT(1) NOT NULL DEFAULT 0,          -- flipped when invoice generated
  invoice_line_id     BIGINT NULL,                            -- FK m17_invoice_line when billed
  source              ENUM('Manual','Suggested','Imported') NOT NULL DEFAULT 'Manual',
  created_at_utc      DATETIME(3) NOT NULL,
  INDEX idx_m10_ja_job (job_id),
  INDEX idx_m10_ja_billed (tenant_id, is_billed),
  CONSTRAINT fk_m10_ja_job FOREIGN KEY (job_id) REFERENCES m10_job(id) ON DELETE CASCADE,
  CONSTRAINT fk_m10_ja_acc FOREIGN KEY (accessorial_id) REFERENCES m10_accessorial(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m10_pod — Proof of Delivery (driver app upload)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m10_pod (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  job_id              BIGINT NOT NULL,
  pod_kind            ENUM('SignedPOD','GateReceiptOut','GateReceiptIn','EmptyReceipt','PhotoEvidence','Other') NOT NULL,
  signed_by_name      VARCHAR(150) NULL,
  signed_at_utc       DATETIME(3) NOT NULL,
  signature_ref       VARCHAR(255) NULL,                       -- url or storage key for sig image
  document_id         BIGINT NULL,                             -- FK m21_document
  uploaded_by_driver  BIGINT NULL,
  geo_lat             DECIMAL(9,6) NULL,
  geo_lon             DECIMAL(9,6) NULL,
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  INDEX idx_m10_pod_job (job_id, pod_kind),
  CONSTRAINT fk_m10_pod_job FOREIGN KEY (job_id) REFERENCES m10_job(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m10_appointment — pickup/delivery/return appointments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m10_appointment (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  job_id              BIGINT NOT NULL,
  appointment_kind    ENUM('Pickup','Delivery','EmptyReturn') NOT NULL,
  appointment_dt      DATETIME NOT NULL,                       -- in tenant local
  duration_min        INT NULL,
  facility_name       VARCHAR(150) NULL,
  confirmation_number VARCHAR(60) NULL,
  status              ENUM('Requested','Confirmed','Missed','Rescheduled','Cancelled','Completed') NOT NULL DEFAULT 'Requested',
  notes               VARCHAR(500) NULL,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  INDEX idx_m10_appt_job (job_id, appointment_kind),
  INDEX idx_m10_appt_tenant_dt (tenant_id, appointment_dt),
  CONSTRAINT fk_m10_appt_job FOREIGN KEY (job_id) REFERENCES m10_job(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

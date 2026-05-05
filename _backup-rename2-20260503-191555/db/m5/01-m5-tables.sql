-- =====================================================================
-- M5 Freight Forwarding — 17 tables (Phase 2 closer)
-- Source: docs/lld/M5_FreightForwarding_v1.0.md
-- Tier-A core; country plugins (IN BOE/SB, US 7501/AES) live in M4.
-- Idempotent: CREATE TABLE IF NOT EXISTS.
-- =====================================================================

USE ulp_dev;

-- 3.1 Booking
CREATE TABLE IF NOT EXISTS m5_booking (
  id                      BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id               INT NOT NULL,
  country_code            CHAR(2) NOT NULL,
  booking_number          VARCHAR(50) NOT NULL,
  customer_party_id       BIGINT NOT NULL,
  shipper_party_id        BIGINT,
  consignee_party_id      BIGINT,
  notify_party_id         BIGINT,
  trade_direction         ENUM('IMPORT','EXPORT','CROSS_TRADE','DOMESTIC') NOT NULL,
  mode                    ENUM('AIR','OCEAN_FCL','OCEAN_LCL','ROAD','RAIL','MULTIMODAL') NOT NULL,
  service_type            ENUM('DOOR_DOOR','DOOR_PORT','PORT_DOOR','PORT_PORT') NOT NULL,
  incoterm                VARCHAR(10),
  origin_port_id          BIGINT NOT NULL,
  destination_port_id     BIGINT NOT NULL,
  pickup_address_id       BIGINT,
  delivery_address_id     BIGINT,
  expected_pickup_date    DATE,
  expected_delivery_date  DATE,
  status                  ENUM('Draft','OrderConfirmed','BookingRequested','PendingBooking','Confirmed','InTransit','Discharged','Delivered','Cancelled','Closed') NOT NULL,
  total_pieces            INT,
  total_gross_weight_kg   DECIMAL(12,3),
  total_volume_cbm        DECIMAL(12,4),
  declared_value_amount   DECIMAL(18,4),
  declared_value_currency CHAR(3),
  -- SCM Milestone 2 columns (added 2026-05-03):
  estimated_crd           DATE,                -- Estimated Cargo Ready Date — mandatory once status >= OrderConfirmed
  ff_assigned_party_id    BIGINT,              -- Freight Forwarder assigned (party master); separate from carrier
  remarks                 TEXT,
  created_at_utc          DATETIME(3) NOT NULL,
  modified_at_utc         DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_booking (tenant_id, booking_number),
  INDEX idx_tenant_status (tenant_id, status),
  INDEX idx_customer (tenant_id, customer_party_id),
  CONSTRAINT fk_b_country  FOREIGN KEY (country_code)        REFERENCES m1_country(code),
  CONSTRAINT fk_b_customer FOREIGN KEY (customer_party_id)   REFERENCES m1_party(id),
  CONSTRAINT fk_b_origin   FOREIGN KEY (origin_port_id)      REFERENCES m1_port(id),
  CONSTRAINT fk_b_dest     FOREIGN KEY (destination_port_id) REFERENCES m1_port(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.2 Booking line items
CREATE TABLE IF NOT EXISTS m5_booking_line (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  booking_id      BIGINT NOT NULL,
  line_number     INT NOT NULL,
  product_id      BIGINT,
  description     VARCHAR(500) NOT NULL,
  hs_code         VARCHAR(15),
  pieces          INT,
  packaging_type  VARCHAR(50),
  gross_weight_kg DECIMAL(12,3),
  volume_cbm      DECIMAL(12,4),
  is_hazmat       TINYINT(1) DEFAULT 0,
  is_perishable   TINYINT(1) DEFAULT 0,
  INDEX idx_booking_line (booking_id, line_number),
  CONSTRAINT fk_bl_booking FOREIGN KEY (booking_id) REFERENCES m5_booking(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.3 Shipment
CREATE TABLE IF NOT EXISTS m5_shipment (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  shipment_number     VARCHAR(50) NOT NULL,
  booking_id          BIGINT,
  mode                ENUM('AIR','OCEAN_FCL','OCEAN_LCL','ROAD','RAIL','MULTIMODAL') NOT NULL,
  carrier_party_id    BIGINT NOT NULL,
  vessel_or_flight    VARCHAR(50),
  voyage_or_flight_no VARCHAR(30),
  etd                 DATETIME(3),
  eta                 DATETIME(3),
  atd                 DATETIME(3),
  ata                 DATETIME(3),
  origin_port_id      BIGINT NOT NULL,
  destination_port_id BIGINT NOT NULL,
  status              ENUM('Booked','Loaded','Departed','InTransit','Arrived','AtPOD','Discharged','InboundArrival','GateOut','EmptyReturn','Delivered','Cancelled') NOT NULL,
  remarks             TEXT,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_shipment (tenant_id, shipment_number),
  INDEX idx_tenant_status_s (tenant_id, status),
  INDEX idx_booking (booking_id),
  CONSTRAINT fk_s_country FOREIGN KEY (country_code) REFERENCES m1_country(code),
  CONSTRAINT fk_s_booking FOREIGN KEY (booking_id)   REFERENCES m5_booking(id) ON DELETE SET NULL,
  CONSTRAINT fk_s_carrier FOREIGN KEY (carrier_party_id) REFERENCES m1_party(id),
  CONSTRAINT fk_s_origin  FOREIGN KEY (origin_port_id) REFERENCES m1_port(id),
  CONSTRAINT fk_s_dest    FOREIGN KEY (destination_port_id) REFERENCES m1_port(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.4 MBL
CREATE TABLE IF NOT EXISTS m5_mbl (
  id                          BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id                   INT NOT NULL,
  country_code                CHAR(2) NOT NULL,
  shipment_id                 BIGINT NOT NULL,
  mbl_number                  VARCHAR(50) NOT NULL,
  bl_type                     ENUM('OCEAN','AIR','ROAD','RAIL') NOT NULL,
  issued_by_carrier_party_id  BIGINT NOT NULL,
  release_type                ENUM('ORIGINAL','TELEX','SEAWAY','EXPRESS','SURRENDER') NOT NULL,
  issue_date                  DATE,
  on_board_date               DATE,
  document_id                 BIGINT,
  status                      ENUM('Draft','Issued','Released','Cancelled') NOT NULL,
  UNIQUE KEY uq_tenant_mbl (tenant_id, mbl_number),
  INDEX idx_mbl_shipment (shipment_id),
  CONSTRAINT fk_mbl_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_mbl_country  FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.5 HBL
CREATE TABLE IF NOT EXISTS m5_hbl (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  mbl_id              BIGINT,
  hbl_number          VARCHAR(50) NOT NULL,
  shipper_party_id    BIGINT,
  consignee_party_id  BIGINT,
  notify_party_id     BIGINT,
  release_type        ENUM('ORIGINAL','TELEX','SEAWAY','EXPRESS','SURRENDER') NOT NULL,
  issue_date          DATE,
  document_id         BIGINT,
  status              ENUM('Draft','Issued','Released','Cancelled') NOT NULL,
  UNIQUE KEY uq_tenant_hbl (tenant_id, hbl_number),
  INDEX idx_hbl_mbl (mbl_id),
  CONSTRAINT fk_hbl_mbl     FOREIGN KEY (mbl_id) REFERENCES m5_mbl(id) ON DELETE SET NULL,
  CONSTRAINT fk_hbl_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.6 AWB
CREATE TABLE IF NOT EXISTS m5_awb (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  shipment_id       BIGINT NOT NULL,
  awb_type          ENUM('MASTER','HOUSE') NOT NULL,
  awb_number        VARCHAR(20) NOT NULL,
  parent_awb_id     BIGINT,
  iata_carrier_code CHAR(3),
  flight_number     VARCHAR(10),
  document_id       BIGINT,
  status            ENUM('Draft','Issued','Cancelled') NOT NULL,
  UNIQUE KEY uq_tenant_awb (tenant_id, awb_number),
  INDEX idx_awb_shipment (shipment_id),
  CONSTRAINT fk_awb_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_awb_parent   FOREIGN KEY (parent_awb_id) REFERENCES m5_awb(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.7 Container
CREATE TABLE IF NOT EXISTS m5_container (
  id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id             INT NOT NULL,
  shipment_id           BIGINT NOT NULL,
  container_number      VARCHAR(20) NOT NULL,
  container_type        VARCHAR(10) NOT NULL,
  seal_number           VARCHAR(30),
  tare_weight_kg        DECIMAL(10,2),
  cargo_weight_kg       DECIMAL(12,3),
  packed_at_utc         DATETIME(3),
  loaded_at_utc         DATETIME(3),
  discharged_at_utc     DATETIME(3),
  gate_out_at_utc       DATETIME(3),
  empty_returned_at_utc DATETIME(3),
  free_days             INT,
  per_diem_starts       DATE,
  status                ENUM('Empty','Loading','Loaded','OnVessel','Discharged','GatedOut','Returned') NOT NULL,
  INDEX idx_tenant_container (tenant_id, container_number),
  INDEX idx_container_shipment (shipment_id),
  CONSTRAINT fk_c_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.8 Container packing
CREATE TABLE IF NOT EXISTS m5_container_packing (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  container_id BIGINT NOT NULL,
  hbl_id       BIGINT,
  description  VARCHAR(500),
  pieces       INT,
  weight_kg    DECIMAL(12,3),
  volume_cbm   DECIMAL(12,4),
  INDEX idx_pack_container (container_id),
  CONSTRAINT fk_pack_container FOREIGN KEY (container_id) REFERENCES m5_container(id) ON DELETE CASCADE,
  CONSTRAINT fk_pack_hbl       FOREIGN KEY (hbl_id) REFERENCES m5_hbl(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.9 Milestone
CREATE TABLE IF NOT EXISTS m5_milestone (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  shipment_id      BIGINT NOT NULL,
  milestone_code   VARCHAR(50) NOT NULL,
  occurred_at_utc  DATETIME(3) NOT NULL,
  location_port_id BIGINT,
  source           ENUM('SYSTEM','EDI','MANUAL','CARRIER_API','GPS') NOT NULL,
  remarks          TEXT,
  INDEX idx_shipment_time (shipment_id, occurred_at_utc),
  CONSTRAINT fk_ms_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_port     FOREIGN KEY (location_port_id) REFERENCES m1_port(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.10 Charge line
CREATE TABLE IF NOT EXISTS m5_charge_line (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  shipment_id         BIGINT NOT NULL,
  charge_code         VARCHAR(50) NOT NULL,
  rate_card_id        BIGINT,
  quantity            DECIMAL(12,4),
  uom_code            VARCHAR(10),
  unit_price_amount   DECIMAL(18,4),
  unit_price_currency CHAR(3),
  amount_amount       DECIMAL(18,4),
  amount_currency     CHAR(3),
  is_billable         TINYINT(1) DEFAULT 1,
  invoice_status      ENUM('Pending','Invoiced','Paid','Disputed') DEFAULT 'Pending',
  INDEX idx_charge_shipment (shipment_id),
  CONSTRAINT fk_charge_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.11 Party role
CREATE TABLE IF NOT EXISTS m5_party_role (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     INT NOT NULL,
  shipment_id   BIGINT NOT NULL,
  party_id      BIGINT NOT NULL,
  role          ENUM('CARRIER','ORIGIN_AGENT','DESTINATION_AGENT','TRUCKER','SURVEYOR','BROKER','BANK') NOT NULL,
  contact_name  VARCHAR(150),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(30),
  INDEX idx_pr_shipment (shipment_id),
  CONSTRAINT fk_pr_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_pr_party    FOREIGN KEY (party_id) REFERENCES m1_party(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.12 Routing
CREATE TABLE IF NOT EXISTS m5_routing (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  shipment_id         BIGINT NOT NULL,
  leg_sequence        INT NOT NULL,
  origin_port_id      BIGINT NOT NULL,
  dest_port_id        BIGINT NOT NULL,
  mode                ENUM('AIR','OCEAN','ROAD','RAIL') NOT NULL,
  vessel_or_flight    VARCHAR(50),
  voyage_or_flight_no VARCHAR(30),
  etd                 DATETIME(3),
  eta                 DATETIME(3),
  INDEX idx_route_shipment (shipment_id, leg_sequence),
  CONSTRAINT fk_route_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_route_origin   FOREIGN KEY (origin_port_id) REFERENCES m1_port(id),
  CONSTRAINT fk_route_dest     FOREIGN KEY (dest_port_id) REFERENCES m1_port(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.13 Consol
CREATE TABLE IF NOT EXISTS m5_consol (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id          INT NOT NULL,
  consol_number      VARCHAR(50) NOT NULL,
  consol_type        ENUM('AIR_CONSOL','SEA_LCL','ROAD_CONSOL') NOT NULL,
  master_shipment_id BIGINT NOT NULL,
  status             ENUM('Open','Sealed','Departed','Closed') NOT NULL,
  created_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_consol (tenant_id, consol_number),
  INDEX idx_consol_master (master_shipment_id),
  CONSTRAINT fk_consol_master FOREIGN KEY (master_shipment_id) REFERENCES m5_shipment(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.14 Consol member
CREATE TABLE IF NOT EXISTS m5_consol_member (
  consol_id BIGINT NOT NULL,
  hbl_id    BIGINT NOT NULL,
  PRIMARY KEY (consol_id, hbl_id),
  CONSTRAINT fk_cm_consol FOREIGN KEY (consol_id) REFERENCES m5_consol(id) ON DELETE CASCADE,
  CONSTRAINT fk_cm_hbl    FOREIGN KEY (hbl_id) REFERENCES m5_hbl(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.15 Demurrage event
CREATE TABLE IF NOT EXISTS m5_demurrage_event (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  container_id    BIGINT NOT NULL,
  event_type      ENUM('DEMURRAGE','DETENTION','PER_DIEM') NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE,
  days            INT,
  rate_amount     DECIMAL(18,4),
  rate_currency   CHAR(3),
  total_amount    DECIMAL(18,4),
  total_currency  CHAR(3),
  status          ENUM('Accruing','Settled','Disputed') NOT NULL,
  INDEX idx_demu_container (container_id),
  CONSTRAINT fk_demu_container FOREIGN KEY (container_id) REFERENCES m5_container(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.16 Pre-alert
CREATE TABLE IF NOT EXISTS m5_pre_alert (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  shipment_id         BIGINT NOT NULL,
  recipient_party_id  BIGINT NOT NULL,
  sent_at_utc         DATETIME(3),
  document_id         BIGINT,
  status              ENUM('Pending','Sent','Acknowledged','Failed') NOT NULL,
  INDEX idx_prealert_shipment (shipment_id),
  CONSTRAINT fk_prealert_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_prealert_party    FOREIGN KEY (recipient_party_id) REFERENCES m1_party(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.17 Audit
CREATE TABLE IF NOT EXISTS m5_audit (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  entity_type      ENUM('BOOKING','SHIPMENT','MBL','HBL','AWB','CONTAINER','CONSOL') NOT NULL,
  entity_id        BIGINT NOT NULL,
  action           VARCHAR(50) NOT NULL,
  performed_by     BIGINT NOT NULL,
  performed_at_utc DATETIME(3) NOT NULL,
  details          JSON,
  INDEX idx_entity_time (entity_type, entity_id, performed_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- 2026-05-03: M2-milestone enum + column extensions.
-- These ALTERs are idempotent — MySQL ENUM modify is non-destructive
-- when expanding the value set; ADD COLUMN IF NOT EXISTS guards re-runs.
-- (For tables created above with the old enum, this brings them in sync.)
-- =====================================================================
ALTER TABLE m5_booking
  MODIFY COLUMN status ENUM('Draft','OrderConfirmed','BookingRequested','PendingBooking','Confirmed','InTransit','Discharged','Delivered','Cancelled','Closed') NOT NULL;

-- MySQL 8.0 has no `ADD COLUMN IF NOT EXISTS`, so we gate on information_schema to stay re-runnable.
SET @col_exists := (SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_schema = DATABASE() AND table_name = 'm5_booking' AND column_name = 'estimated_crd');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE m5_booking ADD COLUMN estimated_crd DATE AFTER declared_value_currency',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_schema = DATABASE() AND table_name = 'm5_booking' AND column_name = 'ff_assigned_party_id');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE m5_booking ADD COLUMN ff_assigned_party_id BIGINT AFTER estimated_crd',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE m5_shipment
  MODIFY COLUMN status ENUM('Booked','Loaded','Departed','InTransit','Arrived','AtPOD','Discharged','InboundArrival','GateOut','EmptyReturn','Delivered','Cancelled') NOT NULL;

-- =====================================================================
-- M9 Last-Mile Delivery — 14 tables (Phase 4 third module)
-- Source: docs/lld/M9_LastMile_v1.0.md
-- All constraint/index names m9_-prefixed (lesson from M7 collision).
-- =====================================================================

USE ulp_dev;

-- 2.1 Courier booking
CREATE TABLE IF NOT EXISTS m9_courier_booking (
  id                      BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id               INT NOT NULL,
  country_code            CHAR(2) NOT NULL,
  booking_number          VARCHAR(50) NOT NULL,
  courier_type            ENUM('DOMESTIC','INTERNATIONAL') NOT NULL,
  shipper_party_id        BIGINT,
  consignee_party_id      BIGINT,
  pickup_address_id       BIGINT,
  delivery_address_id     BIGINT,
  weight_kg               DECIMAL(10,3),
  declared_value_amount   DECIMAL(18,4),
  declared_value_currency CHAR(3),
  status                  ENUM('Created','Scheduled','PickedUp','InTransit','OutForDelivery','Delivered','Failed','Returned','Cancelled') NOT NULL,
  pieces                  INT,
  service_level           VARCHAR(50),
  cod_amount              DECIMAL(18,4),
  cod_currency            CHAR(3),
  created_at_utc          DATETIME(3) NOT NULL,
  modified_at_utc         DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m9_tenant_booking (tenant_id, booking_number),
  INDEX idx_m9_booking_status (tenant_id, status),
  CONSTRAINT fk_m9_booking_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.2 Pickup schedule
CREATE TABLE IF NOT EXISTS m9_pickup_schedule (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  booking_id          BIGINT NOT NULL,
  scheduled_date      DATE NOT NULL,
  time_window         VARCHAR(20),
  assigned_to_user_id BIGINT,
  status              ENUM('Planned','Dispatched','Completed','Failed','Rescheduled') NOT NULL,
  attempted_count     INT DEFAULT 0,
  INDEX idx_m9_pickup_booking (booking_id),
  CONSTRAINT fk_m9_pickup_booking FOREIGN KEY (booking_id) REFERENCES m9_courier_booking(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.3 Route
CREATE TABLE IF NOT EXISTS m9_route (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     INT NOT NULL,
  country_code  CHAR(2) NOT NULL,
  route_code    VARCHAR(50) NOT NULL,
  name          VARCHAR(150),
  route_type    ENUM('PICKUP','DELIVERY','MIXED') NOT NULL,
  planned_date  DATE NOT NULL,
  status        ENUM('Planned','InProgress','Completed','Cancelled') NOT NULL,
  driver_user_id BIGINT,
  vehicle_no    VARCHAR(20),
  UNIQUE KEY uq_m9_tenant_route (tenant_id, route_code),
  INDEX idx_m9_route_status (tenant_id, status, planned_date),
  CONSTRAINT fk_m9_route_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.4 Route stop
CREATE TABLE IF NOT EXISTS m9_route_stop (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  route_id         BIGINT NOT NULL,
  sequence         INT NOT NULL,
  country_code     CHAR(2) NOT NULL,
  stop_type        ENUM('PICKUP','DELIVERY') NOT NULL,
  address_id       BIGINT,
  party_id         BIGINT,
  booking_id       BIGINT,
  expected_arrival DATETIME(3),
  actual_arrival   DATETIME(3),
  status           ENUM('Pending','Arrived','Completed','Skipped','Failed') NOT NULL,
  INDEX idx_m9_stop_route (route_id, sequence),
  CONSTRAINT fk_m9_stop_route   FOREIGN KEY (route_id) REFERENCES m9_route(id) ON DELETE CASCADE,
  CONSTRAINT fk_m9_stop_country FOREIGN KEY (country_code) REFERENCES m1_country(code),
  CONSTRAINT fk_m9_stop_booking FOREIGN KEY (booking_id) REFERENCES m9_courier_booking(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.5 Manifest
CREATE TABLE IF NOT EXISTS m9_manifest (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  manifest_number  VARCHAR(50) NOT NULL,
  route_id         BIGINT,
  courier_type     ENUM('DOMESTIC','INTERNATIONAL') NOT NULL,
  total_pieces     INT,
  total_weight_kg  DECIMAL(12,3),
  generated_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m9_tenant_manifest (tenant_id, manifest_number),
  INDEX idx_m9_manifest_route (route_id),
  CONSTRAINT fk_m9_manifest_route FOREIGN KEY (route_id) REFERENCES m9_route(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.6 Manifest line
CREATE TABLE IF NOT EXISTS m9_manifest_line (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  manifest_id BIGINT NOT NULL,
  booking_id  BIGINT NOT NULL,
  awb_number  VARCHAR(50),
  weight_kg   DECIMAL(10,3),
  pieces      INT,
  INDEX idx_m9_mline_manifest (manifest_id),
  CONSTRAINT fk_m9_mline_manifest FOREIGN KEY (manifest_id) REFERENCES m9_manifest(id) ON DELETE CASCADE,
  CONSTRAINT fk_m9_mline_booking  FOREIGN KEY (booking_id) REFERENCES m9_courier_booking(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.7 AWB (domestic + international courier waybills)
CREATE TABLE IF NOT EXISTS m9_awb (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id   INT NOT NULL,
  awb_number  VARCHAR(50) NOT NULL,
  booking_id  BIGINT NOT NULL,
  awb_type    ENUM('DOMESTIC','INTERNATIONAL') NOT NULL,
  status      ENUM('Generated','InTransit','Delivered','Cancelled','Returned') NOT NULL,
  UNIQUE KEY uq_m9_tenant_awb (tenant_id, awb_number),
  INDEX idx_m9_awb_booking (booking_id),
  CONSTRAINT fk_m9_awb_booking FOREIGN KEY (booking_id) REFERENCES m9_courier_booking(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.8 POD (proof of delivery)
CREATE TABLE IF NOT EXISTS m9_pod (
  id                     BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id              INT NOT NULL,
  booking_id             BIGINT NOT NULL,
  signed_by              VARCHAR(150),
  signature_image_doc_id BIGINT,
  photo_doc_id           BIGINT,
  gps_lat                DECIMAL(10,7),
  gps_lng                DECIMAL(10,7),
  captured_at_utc        DATETIME(3) NOT NULL,
  captured_by_user_id    BIGINT,
  INDEX idx_m9_pod_booking (booking_id),
  CONSTRAINT fk_m9_pod_booking FOREIGN KEY (booking_id) REFERENCES m9_courier_booking(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.9 COD collection
CREATE TABLE IF NOT EXISTS m9_cod_collection (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  booking_id       BIGINT NOT NULL,
  amount_collected DECIMAL(18,4) NOT NULL,
  currency         CHAR(3) NOT NULL,
  payment_method   ENUM('CASH','CARD','UPI','OTHER') NOT NULL,
  collected_at_utc DATETIME(3) NOT NULL,
  settled_status   ENUM('Pending','Deposited','Settled','Disputed') NOT NULL DEFAULT 'Pending',
  reference_no     VARCHAR(80),
  INDEX idx_m9_cod_booking (booking_id),
  CONSTRAINT fk_m9_cod_booking FOREIGN KEY (booking_id) REFERENCES m9_courier_booking(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.10 Weight correction
CREATE TABLE IF NOT EXISTS m9_weight_correction (
  id                       BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id                INT NOT NULL,
  booking_id               BIGINT NOT NULL,
  original_weight_kg       DECIMAL(10,3) NOT NULL,
  corrected_weight_kg      DECIMAL(10,3) NOT NULL,
  correction_reason        VARCHAR(255),
  corrected_by             BIGINT,
  corrected_at_utc         DATETIME(3) NOT NULL,
  billing_impact_amount    DECIMAL(18,4),
  billing_impact_currency  CHAR(3),
  INDEX idx_m9_wc_booking (booking_id),
  CONSTRAINT fk_m9_wc_booking FOREIGN KEY (booking_id) REFERENCES m9_courier_booking(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.11 Zone rate
CREATE TABLE IF NOT EXISTS m9_zone_rate (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  zone_code           VARCHAR(20) NOT NULL,
  courier_type        ENUM('DOMESTIC','INTERNATIONAL') NOT NULL,
  weight_slab_from_kg DECIMAL(8,3) NOT NULL,
  weight_slab_to_kg   DECIMAL(8,3) NOT NULL,
  rate_amount         DECIMAL(18,4) NOT NULL,
  rate_currency       CHAR(3) NOT NULL,
  valid_from          DATE NOT NULL,
  valid_to            DATE,
  INDEX idx_m9_zone (country_code, zone_code, courier_type),
  CONSTRAINT fk_m9_zone_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.12 Pincode → zone (composite PK)
CREATE TABLE IF NOT EXISTS m9_pincode_zone (
  country_code CHAR(2)     NOT NULL,
  pincode      VARCHAR(20) NOT NULL,
  zone_code    VARCHAR(20) NOT NULL,
  PRIMARY KEY (country_code, pincode),
  CONSTRAINT fk_m9_pinzone_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.13 Delivery attempt
CREATE TABLE IF NOT EXISTS m9_delivery_attempt (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id          INT NOT NULL,
  booking_id         BIGINT NOT NULL,
  attempt_no         INT NOT NULL,
  attempted_at_utc   DATETIME(3) NOT NULL,
  status             ENUM('Delivered','Failed','PartiallyDelivered','Refused') NOT NULL,
  failure_reason     VARCHAR(255),
  next_attempt_date  DATE,
  INDEX idx_m9_attempt_booking (booking_id, attempt_no),
  CONSTRAINT fk_m9_attempt_booking FOREIGN KEY (booking_id) REFERENCES m9_courier_booking(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.14 Audit
CREATE TABLE IF NOT EXISTS m9_audit (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  entity_type      ENUM('BOOKING','ROUTE','MANIFEST','POD','COD','AWB') NOT NULL,
  entity_id        BIGINT NOT NULL,
  action           VARCHAR(50) NOT NULL,
  performed_by     BIGINT NOT NULL,
  performed_at_utc DATETIME(3) NOT NULL,
  details          JSON,
  INDEX idx_m9_entity_time (entity_type, entity_id, performed_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

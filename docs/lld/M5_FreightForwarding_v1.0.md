# ULP M5: Freight Forwarding LLD

**Version:** 1.0 · **Status:** Drafted (awaiting Shankar approval) · **Compiled:** May 2026
**Phase:** 2 (Operations Core)

**Authoritative sources:**
- HLD §9.2 (M5 in Tier-A: "Shipment lifecycle, MBL/HBL, manifests")
- DBD §4 — **M5 = 17 tables, +country_code on bookings, MBL, HBL**
- M4 LLD (CHA — references M5.shipment via `m4_shipment_id`)
- M21 LLD (M5 produces docs — BL, AWB, manifest)
- M27 LLD (M5 emits domain events for shipment milestones)
- API Spec §3
- `.claude/skills/efcore-mysql-pomelo/SKILL.md`

> **Indian client continuity** — every existing v1.0 booking, MBL, HBL preserved. `country_code` added per DBD §4.

---

## 1. Module Purpose

End-to-end freight forwarding lifecycle:
- **Booking** — customer-driven request: origin, destination, cargo, mode (air/ocean/multimodal)
- **Shipment** — from booking confirmation through gate-out at destination
- **Manifests** — MBL (Master), HBL (House), AWB (HAWB/MAWB)
- **Container management** — for ocean (FCL/LCL allocation, stuffing, sealing)
- **Milestone tracking** — vessel departure, arrival, discharge, gate-out
- **Document generation triggers** — emits events; M6 produces the actual PDFs; M21 stores them

**Tier-A** core. Country-specific compliance filings (BOE/SB for IN, 7501/AES for US) live in M4 plugins.

## 2. Architecture

| Component | Scope |
|---|---|
| **M5 core** | Universal shipment / booking / manifest / container schema |
| **M5 events** | `BookingConfirmed`, `ShipmentDispatched`, `VesselDeparted`, `ShipmentArrived`, `ShipmentDelivered` |
| **M4 dependency** | Customs filing trigger; M5 publishes; M4 consumes |
| **M14 dependency** | Rate lookup at booking creation |
| **M21 dependency** | Doc storage for BL/AWB PDFs |

## 3. Database — 17 tables (matches DBD §4)

### 3.1 `m5_booking` (+country_code)
```sql
CREATE TABLE m5_booking (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  booking_number      VARCHAR(50) NOT NULL,
  customer_party_id   BIGINT NOT NULL,
  shipper_party_id    BIGINT,
  consignee_party_id  BIGINT,
  notify_party_id     BIGINT,
  trade_direction     ENUM('IMPORT','EXPORT','CROSS_TRADE','DOMESTIC') NOT NULL,
  mode                ENUM('AIR','OCEAN_FCL','OCEAN_LCL','ROAD','RAIL','MULTIMODAL') NOT NULL,
  service_type        ENUM('DOOR_DOOR','DOOR_PORT','PORT_DOOR','PORT_PORT') NOT NULL,
  incoterm            VARCHAR(10),                   -- "FOB","CIF","EXW",…
  origin_port_id      BIGINT NOT NULL,               -- FK m1_port
  destination_port_id BIGINT NOT NULL,
  pickup_address_id   BIGINT,                        -- FK m1_address
  delivery_address_id BIGINT,
  expected_pickup_date DATE,
  expected_delivery_date DATE,
  status              ENUM('Draft','Confirmed','InTransit','Discharged','Delivered','Cancelled','Closed') NOT NULL,
  total_pieces        INT,
  total_gross_weight_kg DECIMAL(12,3),
  total_volume_cbm    DECIMAL(12,4),
  declared_value_amount DECIMAL(18,4),
  declared_value_currency CHAR(3),
  remarks             TEXT,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_booking (tenant_id, booking_number),
  INDEX idx_tenant_status (tenant_id, status),
  INDEX idx_customer (tenant_id, customer_party_id),
  CONSTRAINT fk_b_country FOREIGN KEY (country_code) REFERENCES m1_country(code),
  CONSTRAINT fk_b_customer FOREIGN KEY (customer_party_id) REFERENCES m1_party(id),
  CONSTRAINT fk_b_origin   FOREIGN KEY (origin_port_id) REFERENCES m1_port(id),
  CONSTRAINT fk_b_dest     FOREIGN KEY (destination_port_id) REFERENCES m1_port(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.2 `m5_booking_line` — Cargo line items
```sql
CREATE TABLE m5_booking_line (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  booking_id        BIGINT NOT NULL,
  line_number       INT NOT NULL,
  product_id        BIGINT,                          -- FK m1_product (optional)
  description       VARCHAR(500) NOT NULL,
  hs_code           VARCHAR(15),
  pieces            INT,
  packaging_type    VARCHAR(50),
  gross_weight_kg   DECIMAL(12,3),
  volume_cbm        DECIMAL(12,4),
  is_hazmat         TINYINT(1) DEFAULT 0,
  is_perishable     TINYINT(1) DEFAULT 0,
  CONSTRAINT fk_bl_booking FOREIGN KEY (booking_id) REFERENCES m5_booking(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.3 `m5_shipment` (+country_code) — Confirmed shipment
```sql
CREATE TABLE m5_shipment (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  shipment_number     VARCHAR(50) NOT NULL,
  booking_id          BIGINT,                        -- nullable for ad-hoc shipments
  mode                ENUM('AIR','OCEAN_FCL','OCEAN_LCL','ROAD','RAIL','MULTIMODAL') NOT NULL,
  carrier_party_id    BIGINT NOT NULL,               -- FK m1_party (a carrier)
  vessel_or_flight    VARCHAR(50),
  voyage_or_flight_no VARCHAR(30),
  etd                 DATETIME(3),
  eta                 DATETIME(3),
  atd                 DATETIME(3),                   -- actual times
  ata                 DATETIME(3),
  origin_port_id      BIGINT NOT NULL,
  destination_port_id BIGINT NOT NULL,
  status              ENUM('Booked','Loaded','Departed','InTransit','Arrived','Discharged','GateOut','Delivered','Cancelled') NOT NULL,
  remarks             TEXT,
  created_at_utc      DATETIME(3) NOT NULL,
  modified_at_utc     DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_shipment (tenant_id, shipment_number),
  INDEX idx_tenant_status (tenant_id, status),
  INDEX idx_booking (booking_id),
  CONSTRAINT fk_s_country FOREIGN KEY (country_code) REFERENCES m1_country(code),
  CONSTRAINT fk_s_booking FOREIGN KEY (booking_id) REFERENCES m5_booking(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.4 `m5_mbl` (+country_code) — Master Bill of Lading
```sql
CREATE TABLE m5_mbl (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  shipment_id         BIGINT NOT NULL,
  mbl_number          VARCHAR(50) NOT NULL,
  bl_type             ENUM('OCEAN','AIR','ROAD','RAIL') NOT NULL,
  issued_by_carrier_party_id BIGINT NOT NULL,
  release_type        ENUM('ORIGINAL','TELEX','SEAWAY','EXPRESS','SURRENDER') NOT NULL,
  issue_date          DATE,
  on_board_date       DATE,
  document_id         BIGINT,                         -- FK m21_document
  status              ENUM('Draft','Issued','Released','Cancelled') NOT NULL,
  UNIQUE KEY uq_tenant_mbl (tenant_id, mbl_number),
  CONSTRAINT fk_mbl_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_mbl_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.5 `m5_hbl` (+country_code) — House Bill of Lading
```sql
CREATE TABLE m5_hbl (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  country_code        CHAR(2) NOT NULL,
  mbl_id              BIGINT,                          -- nullable; consol HBLs reference an MBL
  hbl_number          VARCHAR(50) NOT NULL,
  shipper_party_id    BIGINT,
  consignee_party_id  BIGINT,
  notify_party_id     BIGINT,
  release_type        ENUM('ORIGINAL','TELEX','SEAWAY','EXPRESS','SURRENDER') NOT NULL,
  issue_date          DATE,
  document_id         BIGINT,
  status              ENUM('Draft','Issued','Released','Cancelled') NOT NULL,
  UNIQUE KEY uq_tenant_hbl (tenant_id, hbl_number),
  CONSTRAINT fk_hbl_mbl FOREIGN KEY (mbl_id) REFERENCES m5_mbl(id) ON DELETE SET NULL,
  CONSTRAINT fk_hbl_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.6 `m5_awb` — Air Waybill (HAWB/MAWB)
```sql
CREATE TABLE m5_awb (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id           INT NOT NULL,
  shipment_id         BIGINT NOT NULL,
  awb_type            ENUM('MASTER','HOUSE') NOT NULL,
  awb_number          VARCHAR(20) NOT NULL,           -- 11-digit IATA format
  parent_awb_id       BIGINT,                         -- HAWB references its MAWB
  iata_carrier_code   CHAR(3),
  flight_number       VARCHAR(10),
  document_id         BIGINT,
  status              ENUM('Draft','Issued','Cancelled') NOT NULL,
  UNIQUE KEY uq_tenant_awb (tenant_id, awb_number),
  CONSTRAINT fk_awb_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_awb_parent FOREIGN KEY (parent_awb_id) REFERENCES m5_awb(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.7 `m5_container`
```sql
CREATE TABLE m5_container (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  shipment_id       BIGINT NOT NULL,
  container_number  VARCHAR(20) NOT NULL,             -- ISO 6346
  container_type    VARCHAR(10) NOT NULL,             -- 20DC, 40DC, 40HC, 45HC, 20RF, 40RF
  seal_number       VARCHAR(30),
  tare_weight_kg    DECIMAL(10,2),
  cargo_weight_kg   DECIMAL(12,3),
  packed_at_utc     DATETIME(3),
  loaded_at_utc     DATETIME(3),
  discharged_at_utc DATETIME(3),
  gate_out_at_utc   DATETIME(3),
  empty_returned_at_utc DATETIME(3),
  free_days         INT,
  per_diem_starts   DATE,
  status            ENUM('Empty','Loading','Loaded','OnVessel','Discharged','GatedOut','Returned') NOT NULL,
  INDEX idx_tenant_container (tenant_id, container_number),
  CONSTRAINT fk_c_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.8 `m5_container_packing` — Stuffing detail per container
```sql
CREATE TABLE m5_container_packing (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  container_id    BIGINT NOT NULL,
  hbl_id          BIGINT,                              -- LCL groupage references HBL
  description     VARCHAR(500),
  pieces          INT,
  weight_kg       DECIMAL(12,3),
  volume_cbm      DECIMAL(12,4),
  CONSTRAINT fk_pack_container FOREIGN KEY (container_id) REFERENCES m5_container(id) ON DELETE CASCADE,
  CONSTRAINT fk_pack_hbl FOREIGN KEY (hbl_id) REFERENCES m5_hbl(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.9 `m5_milestone` — Lifecycle milestone log
```sql
CREATE TABLE m5_milestone (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  shipment_id     BIGINT NOT NULL,
  milestone_code  VARCHAR(50) NOT NULL,                -- "BOOKED","LOADED","DEPARTED","ARRIVED","DISCHARGED","GATE_OUT","DELIVERED"
  occurred_at_utc DATETIME(3) NOT NULL,
  location_port_id BIGINT,
  source          ENUM('SYSTEM','EDI','MANUAL','CARRIER_API','GPS') NOT NULL,
  remarks         TEXT,
  INDEX idx_shipment_time (shipment_id, occurred_at_utc),
  CONSTRAINT fk_ms_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.10 `m5_charge_line` — Per-shipment charge ledger (links to M14 rates)
```sql
CREATE TABLE m5_charge_line (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  shipment_id     BIGINT NOT NULL,
  charge_code     VARCHAR(50) NOT NULL,                -- "OCEAN_FREIGHT","BAF","CAF","THC","DOC_FEE","DTH"
  rate_card_id    BIGINT,                              -- FK m14_rate_card (when M14 ships)
  quantity        DECIMAL(12,4),
  uom_code        VARCHAR(10),
  unit_price_amount DECIMAL(18,4),
  unit_price_currency CHAR(3),
  amount_amount   DECIMAL(18,4),
  amount_currency CHAR(3),
  is_billable     TINYINT(1) DEFAULT 1,
  invoice_status  ENUM('Pending','Invoiced','Paid','Disputed') DEFAULT 'Pending',
  CONSTRAINT fk_charge_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.11 `m5_party_role` — Per-shipment party assignments (carrier, agent, surveyor)
```sql
CREATE TABLE m5_party_role (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  shipment_id     BIGINT NOT NULL,
  party_id        BIGINT NOT NULL,                    -- FK m1_party
  role            ENUM('CARRIER','ORIGIN_AGENT','DESTINATION_AGENT','TRUCKER','SURVEYOR','BROKER','BANK') NOT NULL,
  contact_name    VARCHAR(150),
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(30),
  CONSTRAINT fk_pr_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.12 `m5_routing` — Multi-leg routing
```sql
CREATE TABLE m5_routing (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  shipment_id     BIGINT NOT NULL,
  leg_sequence    INT NOT NULL,
  origin_port_id  BIGINT NOT NULL,
  dest_port_id    BIGINT NOT NULL,
  mode            ENUM('AIR','OCEAN','ROAD','RAIL') NOT NULL,
  vessel_or_flight VARCHAR(50),
  voyage_or_flight_no VARCHAR(30),
  etd             DATETIME(3),
  eta             DATETIME(3),
  CONSTRAINT fk_route_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.13 `m5_consol` — Consolidation header (LCL, air consol)
```sql
CREATE TABLE m5_consol (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  consol_number   VARCHAR(50) NOT NULL,
  consol_type     ENUM('AIR_CONSOL','SEA_LCL','ROAD_CONSOL') NOT NULL,
  master_shipment_id BIGINT NOT NULL,                 -- the one carrying the consol
  status          ENUM('Open','Sealed','Departed','Closed') NOT NULL,
  created_at_utc  DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_consol (tenant_id, consol_number),
  CONSTRAINT fk_consol_master FOREIGN KEY (master_shipment_id) REFERENCES m5_shipment(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.14 `m5_consol_member` — Sub-shipments inside a consol
```sql
CREATE TABLE m5_consol_member (
  consol_id       BIGINT NOT NULL,
  hbl_id          BIGINT NOT NULL,
  PRIMARY KEY (consol_id, hbl_id),
  CONSTRAINT fk_cm_consol FOREIGN KEY (consol_id) REFERENCES m5_consol(id) ON DELETE CASCADE,
  CONSTRAINT fk_cm_hbl FOREIGN KEY (hbl_id) REFERENCES m5_hbl(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.15 `m5_demurrage_event` — Per-container demurrage / detention
```sql
CREATE TABLE m5_demurrage_event (
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
  CONSTRAINT fk_demu_container FOREIGN KEY (container_id) REFERENCES m5_container(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.16 `m5_pre_alert` — Outbound pre-alert to destination agent
```sql
CREATE TABLE m5_pre_alert (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  shipment_id     BIGINT NOT NULL,
  recipient_party_id BIGINT NOT NULL,
  sent_at_utc     DATETIME(3),
  document_id     BIGINT,                              -- FK m21_document (the pre-alert PDF)
  status          ENUM('Pending','Sent','Acknowledged','Failed') NOT NULL,
  CONSTRAINT fk_prealert_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.17 `m5_audit`
```sql
CREATE TABLE m5_audit (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  entity_type     ENUM('BOOKING','SHIPMENT','MBL','HBL','AWB','CONTAINER','CONSOL') NOT NULL,
  entity_id       BIGINT NOT NULL,
  action          VARCHAR(50) NOT NULL,
  performed_by    BIGINT NOT NULL,
  performed_at_utc DATETIME(3) NOT NULL,
  details         JSON,
  INDEX idx_entity_time (entity_type, entity_id, performed_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Total: 17 tables** ✅ matches DBD §4.

## 4. Events
- `BookingCreated`, `BookingConfirmed`, `ShipmentDispatched`
- `MblIssued`, `HblIssued`, `AwbIssued`
- `ContainerLoaded`, `VesselDeparted`, `ShipmentArrived`, `ShipmentDischarged`, `GateOut`, `ShipmentDelivered`

## 5. APIs
`/api/v1/m5/{bookings | shipments | mbls | hbls | awbs | containers | consols | milestones}` — CRUD + lifecycle transitions.

## 6. Out of scope v1.0
- Carrier EDI integration (INTTRA, GT Nexus) — Phase 2.5
- Real-time AIS vessel tracking — Phase 4 with M28
- Customer Control Tower view — M24 dependency

## 7. Sign-off
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-XX | Initial draft. 17 tables matching DBD §4. |

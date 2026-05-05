-- =====================================================================
-- M7 Procurement — 11 tables (Phase 4 second module)
-- Source: docs/lld/M7_Procurement_v1.0.md
-- Buy-side: PR → vendor RFQ → PO → GRN → invoice match.
-- M7.RFQ is procurement-specific (vendor side); M2.RFQ is sales-side
-- (customer asking us). They DO NOT share schema.
-- =====================================================================

USE ulp_dev;

-- 2.1 Purchase request
CREATE TABLE IF NOT EXISTS m7_purchase_request (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  country_code    CHAR(2) NOT NULL,
  pr_number       VARCHAR(50) NOT NULL,
  requested_by    BIGINT,
  department      VARCHAR(100),
  status          ENUM('Draft','Submitted','Approved','Rejected','Closed') NOT NULL,
  needed_by       DATE,
  notes           TEXT,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_pr (tenant_id, pr_number),
  INDEX idx_tenant_status (tenant_id, status),
  CONSTRAINT fk_m7_pr_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.2 Purchase request line
CREATE TABLE IF NOT EXISTS m7_purchase_request_line (
  id                            BIGINT PRIMARY KEY AUTO_INCREMENT,
  pr_id                         BIGINT NOT NULL,
  line_no                       INT NOT NULL,
  product_id                    BIGINT,
  description                   VARCHAR(500) NOT NULL,
  quantity                      DECIMAL(12,4),
  uom_code                      VARCHAR(10),
  estimated_unit_price_amount   DECIMAL(18,4),
  estimated_unit_price_currency CHAR(3),
  INDEX idx_prl (pr_id, line_no),
  CONSTRAINT fk_m7_prl_pr FOREIGN KEY (pr_id) REFERENCES m7_purchase_request(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.3 RFQ (procurement-side; vendor RFQ)
CREATE TABLE IF NOT EXISTS m7_rfq (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id    INT NOT NULL,
  country_code CHAR(2) NOT NULL,
  rfq_number   VARCHAR(50) NOT NULL,
  due_date     DATE,
  status       ENUM('Open','InResponse','Closed','Cancelled') NOT NULL,
  scope_pr_id  BIGINT,
  notes        TEXT,
  created_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m7_tenant_rfq (tenant_id, rfq_number),
  INDEX idx_m7_rfq_tenant_status (tenant_id, status),
  CONSTRAINT fk_m7_rfq_country FOREIGN KEY (country_code) REFERENCES m1_country(code),
  CONSTRAINT fk_m7_rfq_pr FOREIGN KEY (scope_pr_id) REFERENCES m7_purchase_request(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.4 RFQ recipient
CREATE TABLE IF NOT EXISTS m7_rfq_recipient (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  rfq_id          BIGINT NOT NULL,
  vendor_party_id BIGINT NOT NULL,
  sent_at_utc     DATETIME(3),
  response_status ENUM('NotSent','Sent','Acknowledged','Responded','Declined','Expired') NOT NULL DEFAULT 'NotSent',
  INDEX idx_m7_rfq_recip (rfq_id),
  CONSTRAINT fk_m7_rfqr_rfq   FOREIGN KEY (rfq_id) REFERENCES m7_rfq(id) ON DELETE CASCADE,
  CONSTRAINT fk_m7_rfqr_party FOREIGN KEY (vendor_party_id) REFERENCES m1_party(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.5 RFQ response
CREATE TABLE IF NOT EXISTS m7_rfq_response (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  rfq_id          BIGINT NOT NULL,
  vendor_party_id BIGINT NOT NULL,
  total_amount    DECIMAL(18,4),
  total_currency  CHAR(3),
  valid_until     DATE,
  document_id     BIGINT,
  notes           TEXT,
  received_at_utc DATETIME(3) NOT NULL,
  is_winner       TINYINT(1) DEFAULT 0,
  INDEX idx_m7_rfq_resp (rfq_id),
  CONSTRAINT fk_m7_rfqresp_rfq FOREIGN KEY (rfq_id) REFERENCES m7_rfq(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.6 Purchase order
CREATE TABLE IF NOT EXISTS m7_purchase_order (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  country_code    CHAR(2) NOT NULL,
  po_number       VARCHAR(50) NOT NULL,
  vendor_party_id BIGINT NOT NULL,
  rfq_id          BIGINT,
  status          ENUM('Draft','Approved','Sent','PartialReceipt','Closed','Cancelled') NOT NULL,
  total_amount    DECIMAL(18,4),
  total_currency  CHAR(3),
  expected_delivery_date DATE,
  payment_terms   VARCHAR(50),
  notes           TEXT,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m7_tenant_po (tenant_id, po_number),
  INDEX idx_m7_po_tenant_status (tenant_id, status),
  CONSTRAINT fk_m7_po_country FOREIGN KEY (country_code) REFERENCES m1_country(code),
  CONSTRAINT fk_m7_po_party   FOREIGN KEY (vendor_party_id) REFERENCES m1_party(id),
  CONSTRAINT fk_m7_po_rfq     FOREIGN KEY (rfq_id) REFERENCES m7_rfq(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.7 Purchase order line
CREATE TABLE IF NOT EXISTS m7_purchase_order_line (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  po_id               BIGINT NOT NULL,
  line_no             INT NOT NULL,
  product_id          BIGINT,
  description         VARCHAR(500) NOT NULL,
  quantity_ordered    DECIMAL(12,4),
  quantity_received   DECIMAL(12,4) DEFAULT 0,
  uom_code            VARCHAR(10),
  unit_price_amount   DECIMAL(18,4),
  unit_price_currency CHAR(3),
  INDEX idx_m7_pol (po_id, line_no),
  CONSTRAINT fk_m7_pol_po FOREIGN KEY (po_id) REFERENCES m7_purchase_order(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.8 Goods receipt
CREATE TABLE IF NOT EXISTS m7_goods_receipt (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  po_id           BIGINT NOT NULL,
  grn_number      VARCHAR(50) NOT NULL,
  received_at_utc DATETIME(3) NOT NULL,
  received_by     BIGINT,
  m8_grn_id       BIGINT,
  status          ENUM('Draft','Posted','Reversed') NOT NULL,
  remarks         TEXT,
  UNIQUE KEY uq_m7_tenant_grn (tenant_id, grn_number),
  INDEX idx_m7_grn_po (po_id),
  CONSTRAINT fk_m7_gr_po FOREIGN KEY (po_id) REFERENCES m7_purchase_order(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.9 Goods receipt line
CREATE TABLE IF NOT EXISTS m7_goods_receipt_line (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  gr_id             BIGINT NOT NULL,
  po_line_id        BIGINT NOT NULL,
  quantity_received DECIMAL(12,4) NOT NULL,
  cond              ENUM('Good','Damaged','Short','Excess') NOT NULL DEFAULT 'Good',
  remarks           VARCHAR(500),
  INDEX idx_m7_grl (gr_id),
  CONSTRAINT fk_m7_grl_gr  FOREIGN KEY (gr_id) REFERENCES m7_goods_receipt(id) ON DELETE CASCADE,
  CONSTRAINT fk_m7_grl_pol FOREIGN KEY (po_line_id) REFERENCES m7_purchase_order_line(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.10 Invoice match (3-way: PO + GRN + vendor invoice)
CREATE TABLE IF NOT EXISTS m7_invoice_match (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  po_id             BIGINT NOT NULL,
  vendor_invoice_id BIGINT,
  vendor_invoice_no VARCHAR(50),
  match_status      ENUM('ThreeWayMatched','PriceVariance','QtyVariance','NoPO','Disputed') NOT NULL,
  variance_amount   DECIMAL(18,4),
  variance_currency CHAR(3),
  matched_by        BIGINT,
  matched_at_utc    DATETIME(3) NOT NULL,
  notes             TEXT,
  INDEX idx_m7_match_po (po_id),
  CONSTRAINT fk_m7_match_po FOREIGN KEY (po_id) REFERENCES m7_purchase_order(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2.11 Audit
CREATE TABLE IF NOT EXISTS m7_audit (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  entity_type      ENUM('PR','RFQ','PO','GRN','INVOICE_MATCH') NOT NULL,
  entity_id        BIGINT NOT NULL,
  action           VARCHAR(50) NOT NULL,
  performed_by     BIGINT NOT NULL,
  performed_at_utc DATETIME(3) NOT NULL,
  details          JSON,
  INDEX idx_m7_entity_time (entity_type, entity_id, performed_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

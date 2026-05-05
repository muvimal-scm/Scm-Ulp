---
name: wms-grn-putaway
description: Warehouse Management Standards for ULP M8 WMS - GRN (Goods Receipt Note), putaway strategies, picking strategies (FIFO/FEFO/LIFO), zone management, ABC analysis, cycle counting, stock-take. Use when implementing inbound receiving, bin-level inventory, dispatch/picking, batch/serial tracking, or any code in Backend/M8.WMS/. Covers warehousing best practices, slot optimization, perpetual inventory, RFID/barcode integration patterns, dock door scheduling, and 3PL handover.
---

# Warehouse Management for ULP M8

## When this skill triggers
Working on M8 WMS module - GRN, putaway, picking, dispatch, bin transfers, inventory adjustments, cycle counting, ABC analysis, dock scheduling, or any code in `Backend/M8.WMS/`.

## Top 3 reference sources
1. **WERC (Warehousing Education and Research Council)** (https://werc.org/) — Industry-leading warehouse practices research. Annual benchmarking studies for KPIs like inventory accuracy, on-time delivery, perfect order rate.
2. **APICS / ASCM CSCP body of knowledge** (https://www.ascm.org/) — Authoritative supply chain standards including ABC analysis, EOQ, safety stock formulas. Reference for inventory management algorithms.
3. **Github: opensourceinventory/openboxes** (https://github.com/openboxes/openboxes) — Open-source WMS used by humanitarian orgs. Real-world reference for GRN/putaway/picking workflow implementations.

## Critical ULP patterns

### Inbound: GRN (Goods Receipt Note) workflow
```
Step 1: ASN (Advance Shipping Notice) received from supplier
   - Expected: PO no, item list, qty, ETA, container details

Step 2: Vehicle arrival at gate
   - Gate-in: vehicle no, driver, GRN seq generated
   - Dock door assigned (dock scheduling module)

Step 3: Unloading + counting
   - Receiving clerk scans pallet/carton barcodes
   - System validates against ASN line items
   - Discrepancies logged: shortage, excess, damage

Step 4: GRN posting
   - Status: Draft -> Posted -> Putaway In Progress -> Putaway Complete
   - On post: stock added to Receiving Zone (logical)
   - Inventory balance updated

Step 5: Putaway
   - System suggests bin per putaway strategy
   - Forklift operator scans pallet -> system shows target bin
   - Operator scans bin on placement -> stock moves to bin

Step 6: Quality Inspection (if required)
   - Bin status: Quarantined until QC pass
   - On pass: status -> Available
   - On fail: status -> Rejected; await disposition (return/destroy)
```

### Putaway strategies (configurable per item / zone)
```
Fixed Slot
   - Each SKU has a permanent bin
   - Pros: easy training, easy locating
   - Cons: poor space utilization
   - Use for: high-velocity SKUs, A-class items

Random / Dynamic
   - Any pallet to any available bin
   - System tracks bin contents
   - Pros: high space utilization
   - Cons: requires WMS for locating
   - Use for: cold-storage warehouses, e-commerce

Zone-Based
   - Items routed to specific zones based on velocity (A/B/C) or category
   - A-zone: closest to dispatch (high pick frequency)
   - C-zone: furthest (low pick frequency)
   - Pros: optimizes labor (less travel)
   - Cons: requires ABC analysis maintenance

Closest Empty Bin
   - System suggests nearest empty bin from receiving dock
   - Reduces putaway travel time

Same-SKU Consolidation
   - If SKU already exists in a bin: add to that bin (until full)
   - Pros: improves picking efficiency (one bin per SKU)
```

### Picking strategies (configurable per outbound order type)
```
FIFO (First In First Out)
   - Pick oldest receipt first (by GRN date)
   - Use for: most goods (standard)

FEFO (First Expiry First Out)
   - Pick item with earliest expiry first
   - Use for: pharmaceuticals, food, chemicals
   - Critical for: M17 (Pharma) customers

LIFO (Last In First Out)
   - Pick newest receipt first
   - Use for: bulk commodities (sand, coal, building materials)

Zone Pick + Pack
   - Order split by zone; one picker per zone
   - Items consolidated at pack station
   - Use for: high-volume e-commerce

Wave Pick
   - Group orders into waves; pick all at once
   - Use for: warehouses with cutoff times

Batch Pick (multi-order)
   - One walker picks for multiple orders simultaneously
   - Use for: small orders, single-line orders

Pick-and-Pack (single-pass)
   - Pick into packing carton directly
   - Use for: e-commerce; saves a packing step

Pick Slip (paper) vs RF (Radio Frequency)
   - Paper: low tech, error-prone
   - RF: real-time validation, paperless, accurate
   - ULP defaults to RF on Android scanner devices
```

### Bin location structure (ULP master)
```
Format: WAREHOUSE-ZONE-AISLE-BAY-LEVEL-POSITION
Example: BLR1-A-12-3-2-04
   BLR1 = Bangalore Warehouse 1
   A    = Zone A (high-velocity)
   12   = Aisle 12
   3    = Bay 3 (along the aisle)
   2    = Level 2 (rack height)
   04   = Position 4 (within the bay)

Bin types:
- Pallet bin (1 pallet)
- Case bin (cases inside a pallet location)
- Each bin (individual units)
- Bulk bin (large quantity, no pallet)
```

### ABC analysis (Pareto-based velocity classification)
```
A-class: top 20% of SKUs accounting for 80% of pick frequency
B-class: next 30% of SKUs accounting for 15% of pick frequency
C-class: bottom 50% of SKUs accounting for 5% of pick frequency

Benefits:
- A-class -> placed near dispatch (golden zone)
- C-class -> placed in deep storage
- Cycle count frequency: A daily, B weekly, C monthly

ULP cron (M8): nightly recompute ABC class based on last 90 days picks.
On class change: trigger slot-optimization suggestions to ops manager.
```

### Cycle counting (continuous inventory accuracy)
```
Why: full physical stock-take is disruptive (warehouse shutdown 1-2 days)
Cycle count: counts a subset of SKUs daily, ensures 100% counted in a year

ULP cron (M8): nightly create cycle count tasks
   - 5 random A-class SKUs (30/month -> ~360/year per SKU)
   - 10 random B-class SKUs
   - 20 random C-class SKUs

Counter scans bin barcode -> system shows expected qty -> counter enters actual.
Variance < 2%: auto-accept (still triggers root cause)
Variance >= 2%: requires supervisor approval
Variance >= 5%: triggers full bin recount + audit log

KPI: Inventory Accuracy = (1 - SUM(|actual-expected|) / SUM(expected)) × 100
Target: > 99.5%
```

### Stock-take (annual full count)
```
Annual financial-year-end physical count:
- Lock all transactions
- Print count sheets per zone/aisle
- Two-person count (counter + verifier)
- Variance investigation
- Final write-off via M17 GL adjustment

ULP M8 stock-take wizard:
- Generates count tasks
- Tracks completion %
- Computes variance per SKU
- Generates write-off journal entries (after approval)
```

### Dock door scheduling
```
Inbound docks: assigned to receiving GRNs
Outbound docks: assigned to dispatching trips

ULP M8 dock scheduler:
- View calendar of dock occupancy
- Drag-drop GRN/Trip to time slot
- Conflict detection (overlapping bookings)
- Carrier app shows dock no on arrival
- Auto-release dock on departure
```

### Batch/Serial tracking
```
Batch tracked items (most pharma, food, chemicals):
- Batch no + manufacturing date + expiry date
- Track: GRN_qty -> putaway -> pick -> dispatch (audit trail)
- FEFO picking ensures expiry compliance

Serial tracked items (high-value: electronics, automotive):
- Each unit has unique serial no
- Track: from supplier -> bin -> outbound order -> customer
- ULP supports parent-child serials (pallet ID + carton IDs + unit IDs)
```

## Critical gotchas

### Inventory accuracy is the KPI
- Without 99%+ accuracy: every other process degrades.
- Cycle count discipline is non-negotiable.
- Ops manager dashboard must show daily cycle count completion rate.

### Multi-warehouse stock visibility
- ULP M8 supports multiple warehouses per tenant.
- Cross-warehouse lookup: ATP (Available To Promise) shows total available across warehouses.
- Inter-warehouse transfer: STO (Stock Transfer Order) workflow.

### Reservations vs allocations
- Reservation: soft hold (sales order pending picking)
- Allocation: hard hold (assigned to a specific bin/lot for picking)
- Available qty = on-hand - reserved - allocated
- ULP M8 must enforce: allocated stock cannot be picked for a different order.

### Damage and write-off
- Damage during receiving: log against GRN; do NOT putaway
- Damage post-putaway: bin transfer to "Damaged Goods" zone
- Write-off requires supervisor approval + M17 GL entry

### Quarantine for QC
- Mandatory for pharma, food, chemicals
- Bin status = "Quarantined" until QC Pass
- ULP M8 + M22 (Quality) integration: QC creates GRN sample; on pass -> bin Available

### Min-Max-ROP (Reorder Point) rules
- ULP M8 master: per-item min stock, max stock, ROP, EOQ
- Daily job: scan items at ROP -> create PO request to procurement
- Formula: ROP = (avg daily demand × lead time) + safety stock
- EOQ (Economic Order Quantity) = sqrt((2 × annual demand × order cost) / holding cost)

### Pick path optimization
- Default: zone-then-aisle-then-bay sequence
- Advanced: TSP (Traveling Salesman Problem) solver for picker tours
- ULP M8: heuristic (s-shape, return, midpoint) by warehouse layout

### Pallet vs case vs each
- Pallet: full pallet of one SKU (or mixed)
- Case: carton of multiple eaches
- Each: smallest sellable unit
- ULP item master: define UOM hierarchy (1 pallet = 50 cases = 600 eaches)
- Bin capacity: per-UOM (some bins hold 1 pallet, some 20 cases, some 200 eaches)

### 3PL handover (ULP customer = 3PL operator)
- ULP supports 3PL business model
- 3PL customer has multiple end-customers (sub-tenants)
- Inventory ownership: end-customer owns; 3PL stores
- Storage billing: per pallet-day, per cubic meter, value-add services
- Reports: occupancy, throughput, dwell time, accuracy by end-customer

## ULP companion docs
- ULP_LLD_M8_v1.0_WMS.docx (full module spec - 48 pages)
- ULP_DomainReferenceLibrary_v3.0.docx Section 7 (WMS domain)
- ULP_DBD_v1.0_DatabaseDesign.docx (m8_grn, m8_putaway, m8_bin, m8_inventory schemas)

---
name: transportation-pod-gps
description: Transportation lifecycle, POD (Proof of Delivery), and GPS tracking patterns for ULP M13. Use when implementing trip planning, vehicle assignment, GPS ingestion (telematics + driver app), geofence triggers (origin/destination/checkpoint), POD capture (signature, photo, OTP), exception management (delays, breakdowns, deviations), or any code in Backend/M13.Transportation/ or driver-app KMP module. Covers trip status machine, GPS battery management on driver phones, POD validation rules, ePOD (electronic proof of delivery), and integration with M8 WMS dispatch + M17 invoicing.
---

# Transportation Lifecycle + POD + GPS for ULP M13

## When this skill triggers
Working on M13 trip planning, vehicle assignment, GPS data ingestion, geofence triggers, POD workflow, exception handling, KMP driver app, or any code in `Backend/M13.Transportation/`, `frontend/src/app/m13-transportation/`, or `mobile/shared/m13-transportation/`.

## Top 3 reference sources (industry standards)
1. **API Open standards (logistics-api.org)** — Open API specs for telematics, e-POD. Reference for industry-standard message formats.
2. **GitHub: traccar/traccar** (https://github.com/traccar/traccar) — Open-source GPS tracking server. Useful reference for telematics protocol parsers (NMEA, GT06, Teltonika).
3. **GitHub: openrouteservice/openrouteservice** (https://github.com/GIScience/openrouteservice) — Open-source routing engine. ULP can self-host for ETA computation, alternate routing, fleet optimization.

## Critical ULP patterns

### Trip lifecycle (state machine)
```
States:
[Draft] -> [Planned] -> [Vehicle Assigned] -> [In Transit] -> [Arrived at Stop] -> [Stop Completed]
        -> [In Transit] (next leg) -> ... -> [Arrived at Destination] -> [Delivered] -> [Closed]

Exception branches:
- [In Transit] -> [Breakdown] -> [Recovered] -> [In Transit]
- [In Transit] -> [Detour Approved] -> [In Transit]
- Any state -> [Cancelled] (with reason + approval)
- [Delivered] -> [Returned] (POD rejected by customer)

State transitions trigger:
- Notifications (driver, customer, dispatch, billing)
- Geofence events (entry, exit, dwell)
- ETA recompute
- Document generation (LR, e-Way Bill, POD)
```

### Trip planning
```
Inputs:
- Origin (warehouse / customer pickup)
- Destination(s) (one or many)
- Cargo: weight, volume, special handling
- Service level: standard | express | next-day | same-day
- Time windows: pickup window, delivery window
- Vehicle requirements: type, capacity, refrigeration

Outputs:
- Suggested vehicle(s) - capacity check, ETA fit
- Suggested route - via map service (alternate routes)
- Estimated trip cost (M14 Pricing)
- Estimated CO2 (M28 Sustainability)
```

### Vehicle assignment
```
ULP M13 dispatch board:
- Available vehicles: idle + at warehouse
- Vehicle attributes: type, capacity, refrigeration, last service date
- Driver attributes: license expiry, hours-of-service, current location
- Drag-drop trip onto vehicle
- Hard validation: capacity, license type, restricted zones
- Soft validation: HOS limits, vehicle service due, driver fatigue
```

### GPS ingestion architecture
```
Data sources:
1. Telematics device (in vehicle) - GPS chip + GSM
   - Protocol: typically GT06 / Teltonika / NMEA / proprietary JSON
   - Frequency: 30 sec stationary, 10 sec moving
   - Data: lat, lng, speed, heading, ignition, odometer, sensors
2. Driver KMP app (phone)
   - Foreground service while on duty
   - Frequency: 30 sec moving, 5 min stationary (battery save)
   - Data: lat, lng, speed, heading, accuracy
3. EWB-linked vehicle tracking (RFIDs at toll plazas - FASTag)
   - Last-seen at each toll plaza
   - Useful for high-level corridor visibility

ULP ingestion pipeline:
[Device/App] -> HTTPS POST -> Ingestion API (rate-limited)
    -> Validates JWT (vehicle/device token)
    -> Writes to MySQL (m13_gps_breadcrumb table)
    -> Publishes event to MassTransit (if state-changing)
    -> Geofence service evaluates triggers
```

### GPS breadcrumb table design
```sql
CREATE TABLE m13_gps_breadcrumb (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  vehicle_id BIGINT NOT NULL,
  trip_id BIGINT,                           -- nullable (vehicle could be idle)
  source ENUM('Telematics','DriverApp','FasTag') NOT NULL,
  recorded_at DATETIME(3) NOT NULL,        -- millisecond precision
  ingested_at DATETIME(3) NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  speed_kph DECIMAL(5,2),
  heading_degrees DECIMAL(5,2),
  accuracy_m DECIMAL(5,1),
  ignition TINYINT(1),                      -- 0/1 from telematics
  odometer_km DECIMAL(10,1),
  battery_pct INT,                          -- driver app only
  raw_payload JSON,                         -- preserve for debugging
  INDEX idx_vehicle_recorded (vehicle_id, recorded_at),
  INDEX idx_trip_recorded (trip_id, recorded_at),
  PARTITION BY RANGE COLUMNS(recorded_at) (...)  -- monthly partitions
);

-- Hot storage: last 90 days
-- Warm: 90-365 days (daily aggregates only)
-- Cold: > 1 year (yearly aggregates)
```

### Geofence triggers
```
Types:
- Origin geofence: trip starts when vehicle exits origin
- Destination geofence: trip arrival when vehicle enters destination
- Checkpoint geofence: progress tracking (e.g., crossed Mumbai-Pune highway)
- Restricted zone: alert if vehicle enters (e.g., red zone, no-truck area)
- Customer site: arrival/departure dwell time tracking

Implementation:
- Backend service evaluates each breadcrumb against active geofences for vehicle
- Use Turf.js (.NET equivalent) for point-in-polygon / point-in-circle
- Throttle: emit event only on STATE CHANGE (entry/exit), not every breadcrumb
- Storage: m13_geofence_event (vehicle_id, geofence_id, event_type, timestamp)

Sample geofence event:
{
  "tripId": 12345,
  "vehicleId": 678,
  "geofenceId": 999,
  "geofenceName": "Customer XYZ Warehouse",
  "eventType": "Entered",
  "timestamp": "2026-04-15T14:23:45+05:30",
  "lat": 12.971,
  "lng": 77.594
}
```

### POD (Proof of Delivery) workflow
```
At delivery location:
1. Driver opens KMP app -> Trip detail -> Mark Arrived
   (Geofence already detected entry; this confirms)
2. Driver consults consignee
3. Capture POD evidence (one or more):
   a. Customer signature on touchscreen
   b. Customer photo of goods received
   c. OTP from consignee (sent to consignee mobile)
   d. Customer-stamped LR copy photo
   e. Empty container/return goods photo (if applicable)
4. Capture exceptions (if any):
   - Quantity mismatch (entered count)
   - Damaged goods (photo)
   - Refused (reason)
5. Driver submits POD
6. Server validates:
   - At least one evidence type provided
   - GPS at submission within geofence (anti-fraud)
   - Submission within trip window (else flag)
7. Status -> Delivered
8. Trigger: invoice issuance (M17), customer notification, settlement (M16)
```

### POD upload strategy (offline-resilient)
```
Driver KMP app:
1. POD captured -> stored in local SQLDelight DB
2. Photos compressed (max 1024px, JPEG quality 70)
3. Background sync queue
4. On network available:
   - PUT photo to pre-signed URL (MinIO/Azure Blob)
   - POST POD record to /api/m13/pod
5. On success: mark local as synced
6. On failure: retry with exponential backoff (max 24h)

Photo upload: pre-signed URL approach
- ULP API issues pre-signed URL (5 min validity)
- Driver app uploads directly to blob storage
- ULP API never proxies bytes (saves backend bandwidth)
```

### Driver app GPS battery management
```
Challenge: continuous GPS drains phone battery.

Strategies:
1. Adaptive frequency:
   - Moving > 5 kph: 30-second updates
   - Moving 0-5 kph: 2-minute updates
   - Stationary: 5-minute updates
   - At customer site (geofenced): 10-minute updates

2. Foreground service (Android):
   - Required for continuous GPS in background
   - Sticky notification visible (Android requirement)
   - Restart on system reboot

3. iOS background modes:
   - "Location updates" capability declared in Info.plist
   - Use significant location changes for low-power baseline
   - Switch to high-accuracy when in trip

4. Battery alert:
   - If phone battery < 20%: alert dispatch
   - If < 10%: app reduces frequency to preserve

5. Telematics device fallback:
   - If vehicle has telematics, use that as primary
   - Driver app as backup

KMP shared module:
- expect / actual implementation per platform
- Common interface: GpsTracker.start(), GpsTracker.stop(), GpsTracker.flowOfPositions()
```

### Exception management
```
Common exceptions:
- Vehicle breakdown
- Driver fatigue / accident
- Goods damaged in transit
- Route diversion (road closed, traffic)
- Customer not available at delivery
- Goods refused by customer
- Document missing (e-Way Bill expired, etc.)

ULP exception workflow:
1. Driver / dispatch flags exception
2. Capture: type, location (auto-geo), reason, photo if applicable
3. Severity classification (low/medium/high)
4. Notification:
   - Low: dispatch + customer service
   - Medium: dispatch manager + customer
   - High: ops manager + escalation team
5. Resolution captured (action taken, time spent)
6. KPI: MTTR (mean time to resolve)
```

### ePOD vs paper POD
```
ePOD (electronic):
- Captured in app
- Stored in cloud
- Searchable
- Anti-fraud (GPS + timestamp validated)
- Immediate availability for billing

Paper POD (legacy):
- Driver carries copy of LR
- Customer signs, stamps
- Driver returns to warehouse
- Scanned + uploaded
- Slower, error-prone

ULP M13 supports BOTH:
- New customers default to ePOD
- Legacy customers grandfather paper
- Hybrid: paper for govt/military, ePOD for commercial
```

## Critical gotchas

### GPS accuracy varies wildly
- Urban canyons (Mumbai/Bangalore): 10-50m accuracy
- Open highways: 3-10m accuracy
- Indoor (warehouses): 50-200m or unavailable
- ULP must NOT mark "Arrived" purely on GPS without geofence buffer (use 100m radius default).

### Time zones
- Always store GPS timestamps in UTC.
- Display in IST (UTC+5:30) or driver's local timezone.
- Never use server local time.

### Anti-fraud measures
- POD GPS must be within 200m of expected destination (geofence buffer).
- POD timestamp must be within trip window.
- Photo must have EXIF GPS metadata that matches reported GPS.
- Suspicious POD flagged for manual review.

### Driver consent + privacy
- Drivers must consent to location tracking (mandatory for trip duration).
- Off-duty: location tracking MUST stop.
- KMP app shows green/red indicator: "On Duty - Tracking" / "Off Duty - Not Tracking".

### MMI (Map My India) vs Google Maps
- Google Maps best for end-customer ETA (familiar UX).
- MMI better for India-specific routing (knows truck-restricted roads, narrow lanes).
- ULP can offer both via routing service abstraction.

### Driver hours-of-service
- Indian Motor Vehicles Act: 8 hours driving / day, max 12 hours work.
- ULP M13 must track driver hours; alert before legal limits.
- Hard stop: driver cannot accept trip if would exceed 12h.

### Real-time vs batch GPS
- Real-time: WebSocket + Redis pub/sub for live fleet view.
- Batch (every 5 min): summary aggregations for dashboards.
- Don't query MySQL gps_breadcrumb in real-time UI - use Redis cache.

### Trip cost vs trip profitability
- Cost = fuel + driver + tolls + maintenance + indirect.
- Revenue = customer billing.
- Profitability per trip captured for M24 dashboards.

### Multi-stop optimization (TSP)
- For multiple deliveries: optimize sequence to minimize distance.
- Use OpenRouteService or Google Routes API.
- ULP TSP solver runs on trip plan submission.

### Sustainability (CO2)
- Compute CO2 per trip: distance × emission factor (kg CO2/km per vehicle type).
- Aggregate to M28 (Sustainability) module.
- Provide customer-facing carbon footprint reports.

## ULP companion docs
- ULP_LLD_M13_v1.0_Transportation.docx (full module spec - 47 pages)
- ULP_DomainReferenceLibrary_v3.0.docx Section 6 (Transportation domain)
- ULP_DBD_v1.0_DatabaseDesign.docx (m13_trip, m13_gps_breadcrumb, m13_pod, m13_geofence schemas)

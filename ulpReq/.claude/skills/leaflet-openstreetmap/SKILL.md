---
name: leaflet-openstreetmap
description: Leaflet 1.9 + OpenStreetMap for ULP M13 Transportation (live trip tracking, geofencing, hub-spoke routing, fleet view, POD locations). Use when adding map components, configuring tile providers, plotting markers/polylines, implementing geofence triggers, or any work in frontend/src/app/m13-transportation/maps/. Covers tile provider choice (OSM vs MapTiler vs Mapbox), marker clustering for 1000+ vehicles, custom icons, route polylines, geofence circle/polygon, and offline tile caching for the driver mobile app.
---

# Leaflet + OpenStreetMap for ULP M13 Transportation

## When this skill triggers
Working on map components, tile provider configuration, marker rendering, polyline routes, geofence definitions, fleet live view, or any code in `frontend/src/app/m13-transportation/maps/`. Trigger on `import L from 'leaflet'`, `@asymmetrik/ngx-leaflet`, `tileLayer`, `marker`, `polyline`, `circle`.

## Top 3 reference repos
1. **Leaflet/Leaflet** (https://github.com/Leaflet/Leaflet) — Official Leaflet (38KB gzip). Read `docs/api/` for the API. Most stable mapping library; works on every browser/device.
2. **Leaflet/Leaflet.markercluster** (https://github.com/Leaflet/Leaflet.markercluster) — Critical for 100+ markers (fleet view, customer locations). Without clustering: 1000 markers = browser crash.
3. **asymmetrik/ngx-leaflet** (https://github.com/asymmetrik/ngx-leaflet) — Angular bindings for Leaflet. Provides `[leafletOptions]`, `[leafletLayers]` directives. Standalone-component compatible.

## Critical ULP patterns

### Tile provider choice
| Provider | Cost | Use for |
|----------|------|---------|
| OpenStreetMap | Free | MVP, internal staff dashboards |
| MapTiler | Free up to 100K req/mo | Production customer-facing maps |
| Mapbox | $0.50/1000 req above 50K | High-volume production (driver app) |
| Azure Maps | Pay-per-request | If already in Azure ecosystem |

**ULP MVP default: OpenStreetMap (free, self-hosted tiles option exists).**

### Live fleet view (1000+ vehicles)
```typescript
// frontend/src/app/m13-transportation/maps/fleet-live-map.component.ts
import { Component, signal, OnInit, inject, OnDestroy } from '@angular/core';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { LeafletMarkerClusterModule } from '@asymmetrik/ngx-leaflet-markercluster';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { FleetService } from '../services/fleet.service';
import { interval, switchMap, takeUntilDestroyed } from 'rxjs';

@Component({
  standalone: true,
  imports: [LeafletModule, LeafletMarkerClusterModule],
  template: `
    <div leaflet
         [leafletOptions]="mapOptions"
         [leafletMarkerCluster]="markers()"
         [leafletMarkerClusterOptions]="clusterOptions"
         class="fleet-map"></div>
  `,
  styles: [`.fleet-map { height: 100%; min-height: 600px; }`]
})
export class FleetLiveMapComponent implements OnInit {
  private fleet = inject(FleetService);
  markers = signal<L.Marker[]>([]);

  mapOptions: L.MapOptions = {
    layers: [
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      })
    ],
    zoom: 5,
    center: L.latLng(20.5937, 78.9629),  // Center of India
  };

  clusterOptions: L.MarkerClusterGroupOptions = {
    chunkedLoading: true,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    maxClusterRadius: 60
  };

  ngOnInit() {
    interval(15_000)  // refresh every 15s
      .pipe(
        switchMap(() => this.fleet.getLivePositions()),
        takeUntilDestroyed()
      )
      .subscribe(positions => {
        const markers = positions.map(p => this.makeMarker(p));
        this.markers.set(markers);
      });
  }

  private makeMarker(p: VehiclePosition): L.Marker {
    const icon = this.iconFor(p.status);
    const marker = L.marker([p.lat, p.lng], { icon, rotationAngle: p.heading });
    marker.bindPopup(`
      <strong>${p.vehicleNumber}</strong><br>
      Driver: ${p.driverName}<br>
      Speed: ${p.speedKph} km/h<br>
      Trip: ${p.tripId ?? 'idle'}<br>
      Last update: ${new Date(p.timestamp).toLocaleTimeString()}
    `);
    return marker;
  }

  private iconFor(status: 'moving' | 'idle' | 'breakdown' | 'offline'): L.Icon {
    const colors = { moving: 'green', idle: 'orange', breakdown: 'red', offline: 'grey' };
    return L.icon({
      iconUrl: `assets/markers/truck-${colors[status]}.svg`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }
}
```

### Trip route polyline with stops
```typescript
showTripRoute(trip: Trip) {
  // Polyline of GPS breadcrumbs
  const route = L.polyline(
    trip.gpsBreadcrumbs.map(p => [p.lat, p.lng]),
    { color: '#1976d2', weight: 4, opacity: 0.8 }
  ).addTo(this.map);

  // Origin marker
  L.marker([trip.origin.lat, trip.origin.lng], { icon: this.originIcon })
    .bindPopup(`<strong>Origin:</strong> ${trip.origin.name}`).addTo(this.map);

  // Destination marker
  L.marker([trip.destination.lat, trip.destination.lng], { icon: this.destIcon })
    .bindPopup(`<strong>Destination:</strong> ${trip.destination.name}`).addTo(this.map);

  // Intermediate stops
  trip.stops.forEach((stop, i) => {
    L.marker([stop.lat, stop.lng], { icon: this.stopIcon })
      .bindPopup(`Stop ${i+1}: ${stop.name}<br>ETA: ${stop.eta}`).addTo(this.map);
  });

  // Fit map to route
  this.map.fitBounds(route.getBounds(), { padding: [50, 50] });
}
```

### Geofence (circle for warehouses, polygon for delivery zones)
```typescript
// Warehouse geofence (circle - simple)
const warehouseGeofence = L.circle(
  [warehouse.lat, warehouse.lng],
  { radius: 100, color: '#4caf50', fillOpacity: 0.2 }   // 100m radius
).addTo(this.map);

// Delivery zone (polygon - complex)
const deliveryZone = L.polygon(
  [
    [12.971, 77.594],
    [12.971, 77.610],
    [12.985, 77.610],
    [12.985, 77.594]
  ],
  { color: '#1976d2', fillOpacity: 0.15 }
).addTo(this.map);

// Backend geofence trigger (called from M13 GPS ingestion service)
// Use Turf.js for geo math: turf.booleanPointInPolygon(point, polygon)
```

### POD photo + signature pin
```typescript
// On POD upload, place a marker at the GPS coordinate
const podMarker = L.marker([pod.lat, pod.lng], { icon: this.podIcon })
  .bindPopup(`
    <div style="text-align:center">
      <strong>POD: ${pod.tripId}</strong><br>
      <img src="${pod.photoThumbnailUrl}" style="width:200px"><br>
      Delivered: ${new Date(pod.deliveredAt).toLocaleString()}<br>
      Signed by: ${pod.signedByName}
    </div>
  `).addTo(this.map);
```

## Critical gotchas

### Marker clustering is mandatory above 100 markers
- Without clustering: rendering 1000 markers freezes the browser.
- `Leaflet.markercluster` handles this; cluster radius 60px is good default.

### Tile attribution is REQUIRED
- OpenStreetMap license requires attribution: `© OpenStreetMap contributors`.
- MapTiler/Mapbox have their own attribution requirements.
- Removing attribution = license violation.

### Map sizing
- Container needs `height` set explicitly. Otherwise Leaflet renders 0px tall.
- Use `min-height: 600px` or flex layout.
- After parent resize, call `map.invalidateSize()`.

### GPS coordinate format
- Backend MUST store as DECIMAL(10,7) for lat (-90 to 90) and DECIMAL(10,7) for lng (-180 to 180).
- 7 decimal places ≈ 1cm precision (more than GPS provides).
- Don't store as float (precision loss).

### Tile caching for driver mobile app
- Online maps don't work in remote highway stretches.
- Pre-cache tiles for known routes in IndexedDB / SQLite (KMP).
- Use `leaflet.offline` plugin or roll own caching.

### Coordinate order: lat first, then lng
- Leaflet uses `[lat, lng]` (latitude first).
- GeoJSON uses `[lng, lat]` (longitude first).
- Mixing these is a common bug. Always lat first in Leaflet.

### Performance: don't recreate markers on every refresh
- Track marker by vehicle ID; update existing marker's `setLatLng()` instead of removing/adding.
- Markers in a `MarkerClusterGroup` need `cluster.refreshClusters()` after batch updates.

### Distance calculations
- Use `map.distance(a, b)` for haversine distance (meters).
- For server-side: backend uses MySQL `ST_Distance_Sphere(point1, point2)` or Turf.js.

## ULP companion docs
- ULP_LLD_M13_v1.0_Transportation.docx Section 4.4 (Live tracking + geofencing)
- ULP_LLD_M13_v1.0_Transportation.docx Section 5 (POD workflow)
- ULP_LLD_M24_v1.0_Dashboards.docx (Fleet utilization map)

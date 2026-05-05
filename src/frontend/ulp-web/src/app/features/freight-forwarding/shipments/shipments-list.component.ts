import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FreightForwardingApiService } from '../shared/freight-forwarding-api.service';
import { ShipmentDto, TradeDirection, TransportMode } from '../shared/freight-forwarding-types';

interface TabSpec {
  id: string;
  label: string;
  mode?: TransportMode | TransportMode[];   // undefined = all
  direction?: TradeDirection;
}

@Component({
  selector: 'ulp-freight-forwarding-shipments',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>Shipments</h1>
          <p>Confirmed shipments — vessel/flight, ETD/ETA, milestone progress.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new" class="new-btn">
          <mat-icon>add</mat-icon>&nbsp;New shipment
        </a>
      </div>
    </header>

    <nav class="tabs" role="tablist">
      @for (t of tabs; track t.id) {
        <button class="tab" [class.tab--active]="activeTabId() === t.id" (click)="selectTab(t.id)" role="tab" [attr.aria-selected]="activeTabId() === t.id">
          {{ t.label }}
        </button>
      }
    </nav>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Shipment #</th><th>Country</th><th>Mode</th>
              <th>Vessel / flight</th><th>ETD</th><th>ETA</th>
              <th class="num">Containers</th><th class="num">Milestones</th>
              <th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (s of filteredRows(); track s.id) {
              <tr>
                <td><code>{{ s.shipmentNumber }}</code></td>
                <td>{{ s.countryCode }}</td>
                <td>{{ s.mode }}</td>
                <td>{{ s.vesselOrFlight ?? '—' }}<br/><span class="muted">{{ s.voyageOrFlightNo ?? '' }}</span></td>
                <td>{{ s.etd ? (s.etd | slice:0:16) : '—' }}</td>
                <td>{{ s.eta ? (s.eta | slice:0:16) : '—' }}</td>
                <td class="num">{{ s.containerCount }}</td>
                <td class="num">{{ s.milestoneCount }}</td>
                <td><span class="status status--{{ s.status.toLowerCase() }}">{{ s.status }}</span></td>
                <td><a [routerLink]="[s.id]" class="link">Open →</a></td>
              </tr>
            } @empty {
              <tr><td colspan="10" class="empty">No shipments in this view.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .head-row p { color: #6B5BA0; margin: 0; }
    .new-btn { white-space: nowrap; }

    .tabs { display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid #E8E2F4; }
    .tab {
      background: transparent; border: 0; padding: 10px 18px;
      font-size: 13px; font-weight: 600; color: #6B5BA0;
      border-bottom: 3px solid transparent; cursor: pointer;
      transition: color .12s ease, border-color .12s ease;
    }
    .tab:hover { color: #3F2D7C; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 16px; background: #F5F2FB; color: #3F2D7C;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; vertical-align: top; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .muted { color: #9A9AA3; font-size: 11px; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--booked     { background: #E8E2F4; color: #3F2D7C; }
    .status--loaded     { background: #DCEAF8; color: #1F4E8A; }
    .status--departed   { background: #FFF3D6; color: #946100; }
    .status--intransit  { background: #FFF3D6; color: #946100; }
    .status--arrived    { background: #FFE6CC; color: #8A4F00; }
    .status--discharged { background: #FFE6CC; color: #8A4F00; }
    .status--gateout    { background: #DCF5E4; color: #1F7A3D; }
    .status--delivered  { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled  { background: #FBE4E5; color: #B23F45; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
  `],
})
export class ShipmentsListComponent implements OnInit {
  private readonly api = inject(FreightForwardingApiService);

  readonly rows         = signal<ShipmentDto[]>([]);
  readonly loading      = signal(true);
  readonly error        = signal<string | null>(null);
  readonly activeTabId  = signal<string>('all');

  // v2 client doc: shipment ERP needs tabs for Ocean Import / Export / Air Import / Export.
  readonly tabs: TabSpec[] = [
    { id: 'all',          label: 'All shipments' },
    { id: 'ocean-import', label: 'Ocean Import',  mode: ['OceanFcl', 'OceanLcl'], direction: 'Import' },
    { id: 'ocean-export', label: 'Ocean Export',  mode: ['OceanFcl', 'OceanLcl'], direction: 'Export' },
    { id: 'air-import',   label: 'Air Import',    mode: 'Air',                    direction: 'Import' },
    { id: 'air-export',   label: 'Air Export',    mode: 'Air',                    direction: 'Export' },
  ];

  // CP13 wired direction: shipment now exposes tradeDirection (backfilled from
  // booking by the migration). When direction is null on a legacy shipment, the
  // mode-only match still applies — tab filter is "mode AND (direction matches OR direction unknown)".
  readonly filteredRows = computed(() => {
    const tab = this.tabs.find(t => t.id === this.activeTabId());
    const all = this.rows();
    if (!tab || !tab.mode) return all;
    const modes = Array.isArray(tab.mode) ? tab.mode : [tab.mode];
    return all.filter(s =>
      modes.includes(s.mode)
      && (!tab.direction || s.tradeDirection === null || s.tradeDirection === tab.direction)
    );
  });

  async ngOnInit() {
    try { this.rows.set(await this.api.listShipments({ pageSize: 200 })); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load shipments'); }
    finally { this.loading.set(false); }
  }

  selectTab(id: string) { this.activeTabId.set(id); }
}

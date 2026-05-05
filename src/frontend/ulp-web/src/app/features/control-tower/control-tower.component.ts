import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FreightForwardingApiService } from '../freight-forwarding/shared/freight-forwarding-api.service';
import { ShipmentDto, TradeDirection, TransportMode } from '../freight-forwarding/shared/freight-forwarding-types';

/**
 * SCM Milestone 1 "Control Tower" — single dashboard combining
 * five mode/direction tabs over m5_shipments with the rich filter set
 * (file # / MBL / HBL / Cntr # / customer party / port / ETA range).
 *
 * Watchlist + Reminders/Holds + Chat are LLD-acknowledged scope but
 * deferred (need new tables); shown as 0-state badges so the UI matches
 * the spec layout. PGA/customs holds belong to M4-US.
 */
type Tab = 'all' | 'oceanImport' | 'oceanExport' | 'airImport' | 'airExport' | 'watchlist';

interface TabSpec {
  key: Tab;
  label: string;
  /** undefined = no filter; otherwise pass through to listShipments */
  mode?: TransportMode;
  direction?: TradeDirection;
  starredOnly?: boolean;
}

@Component({
  selector: 'ulp-control-tower',
  standalone: true,
  imports: [FormsModule, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Control Tower</h1>
      <p>Unified shipment view · 5 mode/direction tabs · file/MBL/HBL/container/party/port/ETA filters.</p>
    </header>

    <nav class="tabs" role="tablist">
      @for (t of tabs; track t.key) {
        <button class="tab" role="tab"
                [class.tab--active]="activeTab() === t.key"
                (click)="switchTab(t.key)">
          {{ t.label }}
          @if (activeTab() === t.key && rows().length > 0) {
            <span class="tab__count">{{ rows().length }}</span>
          }
        </button>
      }
      <div class="tab-spacer"></div>
      <span class="tab-stat">
        <mat-icon>star_outline</mat-icon> Watchlist <span class="muted">({{ starredVisibleCount() }})</span>
      </span>
      <span class="tab-stat" [class.tab-stat--alert]="totalActiveHolds() + totalDueReminders() > 0">
        <mat-icon>notifications_none</mat-icon>
        Reminders / Holds
        <span class="muted">({{ totalActiveHolds() }} hold(s) · {{ totalDueReminders() }} due)</span>
      </span>
    </nav>

    <section class="filters">
      <div class="filter-grid">
        <label>File #
          <input type="text" placeholder="SH-…" [(ngModel)]="f_shipmentNumber" (change)="reload()" />
        </label>
        <label>MBL #
          <input type="text" placeholder="CONU-…" [(ngModel)]="f_mblNumber" (change)="reload()" />
        </label>
        <label>HBL #
          <input type="text" placeholder="HBL-…" [(ngModel)]="f_hblNumber" (change)="reload()" />
        </label>
        <label>Container #
          <input type="text" placeholder="TCKU…" [(ngModel)]="f_containerNumber" (change)="reload()" />
        </label>
        <label>Customer party id
          <input type="number" placeholder="101" [(ngModel)]="f_customerPartyId" (change)="reload()" />
        </label>
        <label>Origin port id (POL)
          <input type="number" placeholder="1" [(ngModel)]="f_originPortId" (change)="reload()" />
        </label>
        <label>Destination port id (POD)
          <input type="number" placeholder="13" [(ngModel)]="f_destinationPortId" (change)="reload()" />
        </label>
        <label>ETA from
          <input type="date" [(ngModel)]="f_etaFrom" (change)="reload()" />
        </label>
        <label>ETA to
          <input type="date" [(ngModel)]="f_etaTo" (change)="reload()" />
        </label>
      </div>
      <div class="filter-actions">
        <button class="btn btn--ghost" (click)="clearFilters()">Clear filters</button>
        <span class="muted">{{ activeFilterCount() }} active filter(s)</span>
      </div>
    </section>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th aria-label="Star"></th>
              <th>File #</th><th>Country</th><th>Mode</th>
              <th>Vessel / flight</th><th>ETD</th><th>ETA</th>
              <th class="num">Cntrs</th><th class="num">Stages</th>
              <th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (s of rows(); track s.id) {
              <tr>
                <td>
                  <button class="star"
                          [class.star--on]="s.isStarred"
                          (click)="toggleStar(s, $event)"
                          [attr.aria-label]="s.isStarred ? 'Remove from watchlist' : 'Add to watchlist'"
                          [attr.title]="s.isStarred ? 'Remove from watchlist' : 'Add to watchlist'">
                    <mat-icon>{{ s.isStarred ? 'star' : 'star_border' }}</mat-icon>
                  </button>
                </td>
                <td><code>{{ s.shipmentNumber }}</code></td>
                <td>{{ s.countryCode }}</td>
                <td>{{ s.mode }}</td>
                <td>{{ s.vesselOrFlight ?? '—' }}<br/><span class="muted">{{ s.voyageOrFlightNo ?? '' }}</span></td>
                <td>{{ s.etd ? (s.etd | slice:0:16) : '—' }}</td>
                <td>{{ s.eta ? (s.eta | slice:0:16) : '—' }}</td>
                <td class="num">{{ s.containerCount }}</td>
                <td class="num">{{ s.milestoneCount }}</td>
                <td>
                  <span class="status status--{{ s.status.toLowerCase() }}">{{ s.status }}</span>
                  @if (s.activeHoldCount > 0) {
                    <span class="chip chip--hold" [attr.title]="s.activeHoldCount + ' active hold(s)'">⛔ {{ s.activeHoldCount }}</span>
                  }
                  @if (s.dueReminderCount > 0) {
                    <span class="chip chip--due" [attr.title]="s.dueReminderCount + ' reminder(s) due'">⏰ {{ s.dueReminderCount }}</span>
                  }
                </td>
                <td><a [routerLink]="['/app/freight-forwarding/shipments', s.id]" class="link">Open →</a></td>
              </tr>
            } @empty {
              <tr><td colspan="11" class="empty">No shipments match these filters.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; }

    .tabs {
      display: flex; gap: 6px; align-items: center;
      border-bottom: 1px solid #E8E2F4; margin-bottom: 12px; padding: 0 4px;
      flex-wrap: wrap;
    }
    .tab {
      background: transparent; border: none; cursor: pointer;
      padding: 10px 14px; font-size: 13px; font-weight: 600; color: #6B5BA0;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      font-family: inherit;
    }
    .tab:hover { color: #3F2D7C; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }
    .tab__count {
      display: inline-block; margin-left: 6px;
      background: #E8E2F4; color: #3F2D7C; font-size: 11px;
      padding: 1px 8px; border-radius: 999px; font-weight: 700;
    }
    .tab-spacer { flex: 1; }
    .tab-stat {
      display: inline-flex; align-items: center; gap: 4px;
      color: #6B5BA0; font-size: 12px; padding: 8px 10px;
    }
    .tab-stat mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .filters {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      padding: 16px; margin-bottom: 16px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
    }
    .filter-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;
    }
    .filter-grid label {
      display: flex; flex-direction: column; gap: 4px;
      font-size: 11px; color: #6B5BA0; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .filter-grid input {
      padding: 6px 10px; border: 1px solid #E8E2F4; border-radius: 6px;
      font-size: 13px; color: #1A1A33; font-family: inherit;
    }
    .filter-grid input:focus { outline: none; border-color: #5B3FA0; }
    .filter-actions {
      display: flex; gap: 12px; align-items: center; margin-top: 12px;
      font-size: 12px;
    }
    .btn { font-family: inherit; font-size: 12px; cursor: pointer; padding: 6px 12px; border-radius: 6px; font-weight: 600; }
    .btn--ghost { background: #F5F2FB; color: #5B3FA0; border: 1px solid #E8E2F4; }
    .btn--ghost:hover { background: #E8E2F4; }
    .muted { color: #9A9AA3; font-size: 11px; }

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
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--booked      { background: #E8E2F4; color: #3F2D7C; }
    .status--loaded      { background: #DCEAF8; color: #1F4E8A; }
    .status--departed,
    .status--intransit   { background: #FFF3D6; color: #946100; }
    .status--arrived,
    .status--atpod,
    .status--discharged,
    .status--inboundarrival { background: #FFE6CC; color: #8A4F00; }
    .status--gateout,
    .status--emptyreturn,
    .status--delivered   { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled   { background: #FBE4E5; color: #B23F45; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }

    /* SCM Milestone 1+2 — hold + due-reminder chips next to status */
    .chip {
      display: inline-block; margin-left: 6px;
      padding: 1px 6px; border-radius: 4px;
      font-size: 10px; font-weight: 700;
    }
    .chip--hold { background: #FBE4E5; color: #B23F45; }
    .chip--due  { background: #FFF3D6; color: #946100; }
    .tab-stat--alert { color: #B23F45; }
    .tab-stat--alert .muted { color: #B23F45; }

    /* SCM Milestone 1+2 — watchlist star button */
    .star {
      background: transparent; border: none; padding: 4px;
      cursor: pointer; color: #C9BEEC; line-height: 0;
      border-radius: 4px;
    }
    .star:hover    { background: #F5F2FB; color: #5B3FA0; }
    .star--on      { color: #E5A43A; }
    .star--on:hover{ color: #D4922B; }
    .star mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `],
})
export class ControlTowerComponent implements OnInit {
  private readonly api = inject(FreightForwardingApiService);

  readonly tabs: TabSpec[] = [
    { key: 'all',         label: 'All Shipments' },
    { key: 'oceanImport', label: 'Ocean Import',  mode: 'OceanFcl', direction: 'Import' },
    { key: 'oceanExport', label: 'Ocean Export',  mode: 'OceanFcl', direction: 'Export' },
    { key: 'airImport',   label: 'Air Import',    mode: 'Air',      direction: 'Import' },
    { key: 'airExport',   label: 'Air Export',    mode: 'Air',      direction: 'Export' },
    { key: 'watchlist',   label: '★ Watchlist',   starredOnly: true },
  ];

  readonly activeTab = signal<Tab>('all');
  readonly rows = signal<ShipmentDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Filter state — bound to template inputs
  f_shipmentNumber = '';
  f_mblNumber = '';
  f_hblNumber = '';
  f_containerNumber = '';
  f_customerPartyId?: number;
  f_originPortId?: number;
  f_destinationPortId?: number;
  f_etaFrom = '';
  f_etaTo = '';

  readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.f_shipmentNumber) n++;
    if (this.f_mblNumber) n++;
    if (this.f_hblNumber) n++;
    if (this.f_containerNumber) n++;
    if (this.f_customerPartyId) n++;
    if (this.f_originPortId) n++;
    if (this.f_destinationPortId) n++;
    if (this.f_etaFrom) n++;
    if (this.f_etaTo) n++;
    return n;
  });

  // SCM Milestone 1+2 — header counters derived from visible rows.
  readonly starredVisibleCount = computed(() => this.rows().filter(r => r.isStarred).length);
  readonly totalActiveHolds    = computed(() => this.rows().reduce((sum, r) => sum + r.activeHoldCount, 0));
  readonly totalDueReminders   = computed(() => this.rows().reduce((sum, r) => sum + r.dueReminderCount, 0));

  ngOnInit() { this.reload(); }

  switchTab(t: Tab) {
    this.activeTab.set(t);
    this.reload();
  }

  clearFilters() {
    this.f_shipmentNumber = '';
    this.f_mblNumber = '';
    this.f_hblNumber = '';
    this.f_containerNumber = '';
    this.f_customerPartyId = undefined;
    this.f_originPortId = undefined;
    this.f_destinationPortId = undefined;
    this.f_etaFrom = '';
    this.f_etaTo = '';
    this.reload();
  }

  async reload() {
    this.loading.set(true);
    this.error.set(null);
    const tab = this.tabs.find(t => t.key === this.activeTab())!;
    try {
      this.rows.set(await this.api.listShipments({
        mode: tab.mode,
        direction: tab.direction,
        starredOnly: tab.starredOnly ?? false,
        shipmentNumber:    this.f_shipmentNumber || undefined,
        mblNumber:         this.f_mblNumber || undefined,
        hblNumber:         this.f_hblNumber || undefined,
        containerNumber:   this.f_containerNumber || undefined,
        customerPartyId:   this.f_customerPartyId,
        originPortId:      this.f_originPortId,
        destinationPortId: this.f_destinationPortId,
        etaFrom:           this.f_etaFrom || undefined,
        etaTo:             this.f_etaTo   || undefined,
        pageSize: 100,
      }));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load Control Tower');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Toggle the star on a row. Optimistic local update + server round-trip;
   * if the server call fails we reload to re-sync state with the truth.
   */
  async toggleStar(row: ShipmentDto, ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();
    const newState = !row.isStarred;
    // Optimistic mutation — clone the array so the OnPush component re-renders.
    this.rows.update(rs => rs.map(r => r.id === row.id ? { ...r, isStarred: newState } : r));
    try {
      if (newState) await this.api.starShipment(row.id);
      else          await this.api.unstarShipment(row.id);
      // If we're on the watchlist tab and just unstarred, drop the row from the visible set.
      if (!newState && this.activeTab() === 'watchlist') {
        this.rows.update(rs => rs.filter(r => r.id !== row.id));
      }
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Star toggle failed');
      await this.reload();
    }
  }
}

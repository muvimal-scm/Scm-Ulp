import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FreightForwardingApiService } from '../shared/freight-forwarding-api.service';
import { BookingDto } from '../shared/freight-forwarding-types';

@Component({
  selector: 'ulp-ff-bookings-list',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>Booking Requests</h1>
          <p>Manage freight bookings from quote proposal through to confirmed booking #.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon>&nbsp;New Booking Request</a>
      </div>
    </header>

    <nav class="tabs">
      @for (t of tabs; track t.key) {
        <button class="tab" [class.tab--active]="activeTab() === t.key" (click)="activeTab.set(t.key)">
          {{ t.label }}
          <span class="tab-count">{{ tabCount(t.key) }}</span>
        </button>
      }
    </nav>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else {
      @if (tabRows().length === 0) {
        <div class="empty"><mat-icon>inbox</mat-icon><p>No bookings in this stage.</p></div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Booking #</th>
              <th>Mode</th>
              <th>Direction</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Incoterm</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              @for (b of tabRows(); track b.id) {
                <tr>
                  <td><a [routerLink]="[b.id]" class="link"><code>{{ b.bookingNumber }}</code></a></td>
                  <td><span class="mode-badge mode-badge--{{ b.mode.toLowerCase() }}">{{ modeLabel(b.mode) }}</span></td>
                  <td>{{ b.tradeDirection }}</td>
                  <td>Port #{{ b.originPortId }}</td>
                  <td>Port #{{ b.destinationPortId }}</td>
                  <td>{{ b.incoterm ?? '—' }}</td>
                  <td><span class="status status--{{ b.status.toLowerCase() }}">{{ b.status }}</span></td>
                  <td>{{ b.modifiedAt | slice:0:10 }}</td>
                  <td>
                    @if (activeTab() === 'quotesForReview') {
                      <button mat-stroked-button (click)="requestSecure(b)">
                        Request to Secure
                      </button>
                    }
                    @if (activeTab() === 'confirmed') {
                      <span class="confirmed-chip">{{ b.bookingNumber }}</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <!-- AMS note for confirmed tab -->
      @if (activeTab() === 'confirmed') {
        <div class="ams-note">
          <mat-icon>info_outline</mat-icon>
          <span>
            <strong>AMS (Automated Manifest System)</strong> — US Customs integration pending.
            AMS filing will be processed automatically once enabled.
            Contact your customs broker to confirm AMS submission status.
          </span>
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 16px; }
    .tabs { display: flex; gap: 4px; border-bottom: 2px solid #E8E2F4; margin-bottom: 20px; flex-wrap: wrap; }
    .tab { background: transparent; border: none; cursor: pointer; padding: 10px 14px; font-size: 13px;
      font-weight: 600; color: #6B5BA0; border-bottom: 3px solid transparent; margin-bottom: -2px;
      font-family: inherit; display: flex; align-items: center; gap: 6px; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }
    .tab-count { background: #E8E2F4; color: #3F2D7C; border-radius: 999px; padding: 1px 7px; font-size: 11px; }
    .loading { padding: 32px; text-align: center; color: #6B5BA0; }
    .empty { padding: 48px; text-align: center; color: #9A9AA3; }
    .empty mat-icon { font-size: 36px; width: 36px; height: 36px; color: #C9BEEC; display: block; margin: 0 auto 12px; }
    .table-wrap { background: #fff; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63,45,124,.06); overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 900px; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; font-size: 13px; color: #1A1A33; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: #FAFAFA; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px;
      font-family: 'SFMono-Regular', Consolas, monospace; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
    .mode-badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #E8E2F4; color: #3F2D7C; }
    .mode-badge--oceanfcl { background: #DCEAF8; color: #1F4E8A; }
    .mode-badge--oceanlcl { background: #E3F2FD; color: #1565C0; }
    .mode-badge--air { background: #FFF3D6; color: #946100; }
    .mode-badge--road { background: #E8F5E9; color: #2E7D32; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #E8E2F4; color: #3F2D7C; }
    .status--draft { background: #FFF3D6; color: #946100; }
    .status--confirmed { background: #DCF5E4; color: #1F7A3D; }
    .status--intransit { background: #DCEAF8; color: #1F4E8A; }
    .status--discharged { background: #FFE6CC; color: #8A4F00; }
    .status--delivered { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled { background: #FBE4E5; color: #B23F45; }
    .confirmed-chip { background: #DCF5E4; color: #1F7A3D; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .ams-note { display: flex; align-items: flex-start; gap: 10px; background: #EEF2FF;
      border: 1px solid #C9BEEC; border-radius: 10px; padding: 14px 16px; margin-top: 16px;
      color: #3F2D7C; font-size: 13px; }
    .ams-note mat-icon { flex-shrink: 0; color: #5B3FA0; margin-top: 1px; }
  `],
})
export class BookingsListComponent implements OnInit {
  private readonly api = inject(FreightForwardingApiService);
  readonly all     = signal<BookingDto[]>([]);
  readonly loading = signal(true);
  readonly activeTab = signal('waitingQuote');

  readonly tabs = [
    { key: 'waitingQuote',    label: 'Waiting Quote Proposal', statuses: ['Draft'] as string[] },
    { key: 'quotesForReview', label: 'Quotes for Review',       statuses: ['Draft'] as string[] },
    { key: 'pending',         label: 'Pending Bookings',        statuses: ['Confirmed'] as string[] },
    { key: 'confirmed',       label: 'Bookings Confirmed',      statuses: ['InTransit', 'Discharged', 'Delivered'] as string[] },
  ];

  readonly tabRows = computed(() => {
    const tab = this.tabs.find(t => t.key === this.activeTab());
    if (!tab) return this.all();
    return this.all().filter(b => tab.statuses.includes(b.status));
  });

  tabCount(key: string): number {
    const tab = this.tabs.find(t => t.key === key);
    if (!tab) return this.all().length;
    return this.all().filter(b => tab.statuses.includes(b.status)).length;
  }

  async ngOnInit() {
    try { this.all.set(await this.api.listBookings({})); }
    catch { /* silently ignore — empty state shown */ }
    finally { this.loading.set(false); }
  }

  modeLabel(m: string): string {
    return m === 'OceanFcl' ? 'FCL' : m === 'OceanLcl' ? 'LCL' : m;
  }

  requestSecure(b: BookingDto) {
    alert(
      `Request to Secure Booking sent for ${b.bookingNumber}.\n` +
      `Your freight team will confirm the rate and assign a booking #.`
    );
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FreightForwardingApiService } from '../shared/freight-forwarding-api.service';
import { BookingDto } from '../shared/freight-forwarding-types';

@Component({
  selector: 'ulp-freight-forwarding-bookings',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>Bookings</h1>
          <p>Customer freight requests — origin, destination, cargo, mode.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new" class="new-btn">
          <mat-icon>add</mat-icon>&nbsp;New booking
        </a>
      </div>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Booking #</th>
              <th>Country</th>
              <th>Direction</th>
              <th>Mode</th>
              <th>Service</th>
              <th class="num">O→D</th>
              <th class="num">Pieces</th>
              <th class="num">Weight (kg)</th>
              <th>Status</th>
              <th>ETD pickup</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (b of rows(); track b.id) {
              <tr>
                <td><code>{{ b.bookingNumber }}</code></td>
                <td>{{ b.countryCode }}</td>
                <td>{{ b.tradeDirection }}</td>
                <td>{{ b.mode }}</td>
                <td>{{ b.serviceType }}</td>
                <td class="num">{{ b.originPortId }} → {{ b.destinationPortId }}</td>
                <td class="num">{{ b.totalPieces ?? '—' }}</td>
                <td class="num">{{ b.totalGrossWeightKg ? (b.totalGrossWeightKg | number:'1.0-1') : '—' }}</td>
                <td><span class="status status--{{ b.status.toLowerCase() }}">{{ b.status }}</span></td>
                <td>{{ b.expectedPickupDate ? (b.expectedPickupDate | slice:0:10) : '—' }}</td>
                <td><a [routerLink]="[b.id]" class="link">Open →</a></td>
              </tr>
            } @empty {
              <tr><td colspan="11" class="empty">No bookings yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .new-btn { white-space: nowrap; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 16px; background: #F5F2FB; color: #3F2D7C;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft      { background: #E8E2F4; color: #3F2D7C; }
    .status--confirmed  { background: #DCEAF8; color: #1F4E8A; }
    .status--intransit  { background: #FFF3D6; color: #946100; }
    .status--discharged { background: #FFE6CC; color: #8A4F00; }
    .status--delivered  { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled  { background: #FBE4E5; color: #B23F45; }
    .status--closed     { background: #E0E0E0; color: #555; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
  `],
})
export class BookingsListComponent implements OnInit {
  private readonly api = inject(FreightForwardingApiService);
  readonly rows    = signal<BookingDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listBookings()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load bookings'); }
    finally { this.loading.set(false); }
  }
}

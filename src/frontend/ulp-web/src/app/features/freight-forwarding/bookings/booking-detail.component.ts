import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FreightForwardingApiService } from '../shared/freight-forwarding-api.service';
import { BookingDetailDto } from '../shared/freight-forwarding-types';

@Component({
  selector: 'ulp-freight-forwarding-booking-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    }
    @if (data(); as d) {
      <a routerLink=".." class="back">← Back to bookings</a>

      <header class="page-head">
        <h1>{{ d.booking.bookingNumber }}</h1>
        <p>
          {{ d.booking.tradeDirection }} · {{ d.booking.mode }} · {{ d.booking.serviceType }}
          @if (d.booking.incoterm) { · {{ d.booking.incoterm }} } · {{ d.booking.countryCode }}
          · <span class="status status--{{ d.booking.status.toLowerCase() }}">{{ d.booking.status }}</span>
        </p>
      </header>

      <section class="card">
        <h2>Summary</h2>
        <dl>
          <dt>Customer party</dt>     <dd>#{{ d.booking.customerPartyId }}</dd>
          <dt>Origin → destination</dt><dd>port {{ d.booking.originPortId }} → port {{ d.booking.destinationPortId }}</dd>
          <dt>Pickup window</dt>      <dd>{{ d.booking.expectedPickupDate ? (d.booking.expectedPickupDate | slice:0:10) : '—' }}</dd>
          <dt>Delivery ETA</dt>       <dd>{{ d.booking.expectedDeliveryDate ? (d.booking.expectedDeliveryDate | slice:0:10) : '—' }}</dd>
          <dt>Pieces / weight</dt>    <dd>{{ d.booking.totalPieces ?? '—' }} pcs · {{ d.booking.totalGrossWeightKg ? (d.booking.totalGrossWeightKg | number:'1.0-1') : '—' }} kg · {{ d.booking.totalVolumeCbm ? (d.booking.totalVolumeCbm | number:'1.0-2') : '—' }} cbm</dd>
          <dt>Declared value</dt>     <dd>{{ d.booking.declaredValueAmount ? (d.booking.declaredValueAmount | number:'1.0-0') : '—' }} {{ d.booking.declaredValueCurrency ?? '' }}</dd>
        </dl>
      </section>

      <section class="card">
        <h2>Cargo lines ({{ d.lines.length }})</h2>
        @if (d.lines.length === 0) {
          <p class="muted">No lines added.</p>
        } @else {
          <table>
            <thead><tr>
              <th class="num">#</th><th>Description</th><th>HS</th>
              <th class="num">Pieces</th><th>Pkg</th>
              <th class="num">Weight (kg)</th><th class="num">Vol (cbm)</th><th>Flags</th>
            </tr></thead>
            <tbody>
              @for (l of d.lines; track l.id) {
                <tr>
                  <td class="num">{{ l.lineNumber }}</td>
                  <td>{{ l.description }}</td>
                  <td>{{ l.hsCode ?? '—' }}</td>
                  <td class="num">{{ l.pieces ?? '—' }}</td>
                  <td>{{ l.packagingType ?? '—' }}</td>
                  <td class="num">{{ l.grossWeightKg ? (l.grossWeightKg | number:'1.0-1') : '—' }}</td>
                  <td class="num">{{ l.volumeCbm ? (l.volumeCbm | number:'1.0-2') : '—' }}</td>
                  <td>
                    @if (l.isHazmat) { <span class="flag flag--haz">HAZ</span> }
                    @if (l.isPerishable) { <span class="flag flag--per">PER</span> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .back { color: #5B3FA0; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-block; margin-bottom: 12px; }
    .back:hover { text-decoration: underline; }
    .page-head h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; font-size: 13px; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .card { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 20px; margin-bottom: 16px; }
    .card h2 { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .muted { color: #9A9AA3; }
    dl { display: grid; grid-template-columns: 200px 1fr; gap: 8px 16px; margin: 0; }
    dt { color: #6B5BA0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    dd { margin: 0; color: #1A1A33; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 8px 12px; background: #F5F2FB; color: #3F2D7C;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    tbody td { padding: 8px 12px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft      { background: #E8E2F4; color: #3F2D7C; }
    .status--confirmed  { background: #DCEAF8; color: #1F4E8A; }
    .status--intransit  { background: #FFF3D6; color: #946100; }
    .status--delivered  { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled  { background: #FBE4E5; color: #B23F45; }
    .flag { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-right: 4px; }
    .flag--haz { background: #FBE4E5; color: #B23F45; }
    .flag--per { background: #DCEAF8; color: #1F4E8A; }
  `],
})
export class BookingDetailComponent implements OnInit {
  private readonly api   = inject(FreightForwardingApiService);
  private readonly route = inject(ActivatedRoute);

  readonly data    = signal<BookingDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error.set('invalid booking id');
      this.loading.set(false);
      return;
    }
    try { this.data.set(await this.api.getBooking(id)); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load booking'); }
    finally { this.loading.set(false); }
  }
}

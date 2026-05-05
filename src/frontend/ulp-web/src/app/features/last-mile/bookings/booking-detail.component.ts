import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LastMileApiService } from '../shared/last-mile-api.service';
import { CourierBookingDetailDto } from '../shared/last-mile-types';

@Component({
  selector: 'ulp-last-mile-booking-detail',
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
      <a routerLink=".." class="back">← Back to courier bookings</a>
      <header class="page-head">
        <h1>{{ d.booking.bookingNumber }}</h1>
        <p>
          <span class="ct ct--{{ d.booking.courierType.toLowerCase() }}">{{ d.booking.courierType }}</span>
          · {{ d.booking.countryCode }} · {{ d.booking.serviceLevel ?? '—' }}
          · <span class="status status--{{ d.booking.status.toLowerCase() }}">{{ d.booking.status }}</span>
        </p>
      </header>

      <section class="card">
        <h2>Summary</h2>
        <dl>
          <dt>Weight / pieces</dt> <dd>{{ d.booking.weightKg ? (d.booking.weightKg | number:'1.0-3') : '—' }} kg · {{ d.booking.pieces ?? '—' }}</dd>
          <dt>Declared value</dt>  <dd>{{ d.booking.declaredValueAmount ? (d.booking.declaredValueAmount | number:'1.0-2') : '—' }} {{ d.booking.declaredValueCurrency ?? '' }}</dd>
          <dt>COD amount</dt>      <dd>@if (d.booking.codAmount) { {{ d.booking.codAmount | number:'1.0-2' }} {{ d.booking.codCurrency ?? '' }} } @else { (no COD) }</dd>
          <dt>Created</dt>         <dd>{{ d.booking.createdAt | slice:0:19 }}</dd>
        </dl>
      </section>

      <section class="card">
        <h2>Delivery attempts ({{ d.attempts.length }})</h2>
        @if (d.attempts.length === 0) { <p class="muted">No attempts yet.</p> } @else {
          <ol class="timeline">
            @for (a of d.attempts; track a.id) {
              <li>
                <div class="timeline__when">attempt #{{ a.attemptNo }} · {{ a.attemptedAt | slice:0:19 }}</div>
                <div class="timeline__what">
                  <span class="att att--{{ a.status.toLowerCase() }}">{{ a.status }}</span>
                  @if (a.failureReason) { <span class="muted"> · {{ a.failureReason }}</span> }
                  @if (a.nextAttemptDate) { <span class="muted"> · next attempt {{ a.nextAttemptDate | slice:0:10 }}</span> }
                </div>
              </li>
            }
          </ol>
        }
      </section>

      <section class="card">
        <h2>Proof of delivery ({{ d.pods.length }})</h2>
        @if (d.pods.length === 0) { <p class="muted">No POD captured yet.</p> } @else {
          <table>
            <thead><tr>
              <th>Signed by</th><th>GPS</th><th>Captured</th><th>By user</th>
            </tr></thead>
            <tbody>
              @for (p of d.pods; track p.id) {
                <tr>
                  <td>{{ p.signedBy ?? '—' }}</td>
                  <td>@if (p.gpsLat && p.gpsLng) { {{ p.gpsLat | number:'1.4-4' }}, {{ p.gpsLng | number:'1.4-4' }} } @else { — }</td>
                  <td>{{ p.capturedAt | slice:0:19 }}</td>
                  <td>{{ p.capturedByUserId ? ('user #' + p.capturedByUserId) : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <section class="card">
        <h2>COD collections ({{ d.codCollections.length }})</h2>
        @if (d.codCollections.length === 0) { <p class="muted">No COD records.</p> } @else {
          <table>
            <thead><tr>
              <th class="num">Amount</th><th>Method</th><th>Reference</th><th>Collected</th><th>Settlement</th>
            </tr></thead>
            <tbody>
              @for (c of d.codCollections; track c.id) {
                <tr>
                  <td class="num">{{ c.amountCollected | number:'1.0-2' }} {{ c.currency }}</td>
                  <td>{{ c.paymentMethod }}</td>
                  <td>{{ c.referenceNo ?? '—' }}</td>
                  <td>{{ c.collectedAt | slice:0:19 }}</td>
                  <td><span class="cod cod--{{ c.settledStatus.toLowerCase() }}">{{ c.settledStatus }}</span></td>
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
    dl { display: grid; grid-template-columns: 160px 1fr; gap: 8px 16px; margin: 0; }
    dt { color: #6B5BA0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    dd { margin: 0; color: #1A1A33; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 8px 12px; background: #F5F2FB; color: #3F2D7C;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    tbody td { padding: 8px 12px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }

    .ct { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .ct--domestic      { background: #DCEAF8; color: #1F4E8A; }
    .ct--international { background: #FFF3D6; color: #946100; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--created   { background: #E8E2F4; color: #3F2D7C; }
    .status--pickedup  { background: #FFF3D6; color: #946100; }
    .status--intransit { background: #FFE6CC; color: #8A4F00; }
    .status--outfordelivery { background: #FFE0B3; color: #6F3F00; }
    .status--delivered { background: #DCF5E4; color: #1F7A3D; }
    .status--failed    { background: #FBE4E5; color: #B23F45; }

    .timeline { list-style: none; padding: 0; margin: 0; border-left: 2px solid #E8E2F4; }
    .timeline li { position: relative; padding: 6px 0 16px 18px; }
    .timeline li::before { content: ''; width: 10px; height: 10px; border-radius: 50%;
      background: #5B3FA0; position: absolute; left: -6px; top: 10px; }
    .timeline__when { color: #6B5BA0; font-size: 11px; }
    .timeline__what { font-size: 13px; color: #1A1A33; }
    .att { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .att--delivered          { background: #DCF5E4; color: #1F7A3D; }
    .att--failed             { background: #FBE4E5; color: #B23F45; }
    .att--partiallydelivered { background: #FFF3D6; color: #946100; }
    .att--refused            { background: #FBE4E5; color: #B23F45; }
    .cod { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .cod--pending   { background: #FFF3D6; color: #946100; }
    .cod--deposited { background: #DCEAF8; color: #1F4E8A; }
    .cod--settled   { background: #DCF5E4; color: #1F7A3D; }
    .cod--disputed  { background: #FBE4E5; color: #B23F45; }
  `],
})
export class BookingDetailComponent implements OnInit {
  private readonly api = inject(LastMileApiService);
  private readonly route = inject(ActivatedRoute);
  readonly data = signal<CourierBookingDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) { this.error.set('invalid booking id'); this.loading.set(false); return; }
    try { this.data.set(await this.api.getBooking(id)); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load booking'); }
    finally { this.loading.set(false); }
  }
}

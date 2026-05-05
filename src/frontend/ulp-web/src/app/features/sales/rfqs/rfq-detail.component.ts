import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesApiService } from '../shared/sales-api.service';
import { RfqRequestDetailDto } from '../shared/sales-types';

@Component({
  selector: 'ulp-sales-rfq-detail',
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
      <a routerLink=".." class="back">← Back to RFQs</a>

      <header class="page-head">
        <h1>{{ d.request.rfqNumber }}</h1>
        <p>
          party #{{ d.request.partyId }} · requested {{ d.request.requestedAt | slice:0:16 }}
          @if (d.request.dueDate) { · due {{ d.request.dueDate | slice:0:10 }} }
          · <span class="status status--{{ d.request.status.toLowerCase() }}">{{ d.request.status }}</span>
        </p>
      </header>

      @if (d.request.notes) {
        <section class="card">
          <h2>Notes</h2>
          <p>{{ d.request.notes }}</p>
        </section>
      }

      <section class="card">
        <h2>Lines ({{ d.lines.length }})</h2>
        @if (d.lines.length === 0) { <p class="muted">No lines.</p> } @else {
          <table>
            <thead><tr><th class="num">#</th><th>Description</th><th class="num">Qty</th><th>UOM</th></tr></thead>
            <tbody>
              @for (l of d.lines; track l.id) {
                <tr>
                  <td class="num">{{ l.lineNumber }}</td>
                  <td>{{ l.description }}</td>
                  <td class="num">{{ l.quantity ? (l.quantity | number:'1.0-2') : '—' }}</td>
                  <td>{{ l.uomCode ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <section class="card">
        <h2>Vendor responses ({{ d.responses.length }})</h2>
        @if (d.responses.length === 0) { <p class="muted">No vendor responses received yet.</p> } @else {
          <table>
            <thead><tr>
              <th>Vendor</th><th class="num">Bid</th><th>Valid until</th><th>Received</th><th>Notes</th><th>Winner</th>
            </tr></thead>
            <tbody>
              @for (r of d.responses; track r.id) {
                <tr [class.winner]="r.isWinner">
                  <td>party #{{ r.vendorPartyId }}</td>
                  <td class="num">{{ r.responseAmount ? (r.responseAmount | number:'1.0-2') : '—' }} {{ r.responseCurrency ?? '' }}</td>
                  <td>{{ r.validUntil ? (r.validUntil | slice:0:10) : '—' }}</td>
                  <td>{{ r.receivedAt | slice:0:16 }}</td>
                  <td>{{ r.notes ?? '—' }}</td>
                  <td>
                    @if (r.isWinner) { <span class="winner-badge">★ winner</span> }
                    @else { — }
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
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 8px 12px; background: #F5F2FB; color: #3F2D7C;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    tbody td { padding: 8px 12px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr.winner td { background: #F0FBF4; }
    .winner-badge { color: #1F7A3D; font-weight: 700; font-size: 12px; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--open       { background: #E8E2F4; color: #3F2D7C; }
    .status--inresponse { background: #FFF3D6; color: #946100; }
    .status--closed     { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled  { background: #FBE4E5; color: #B23F45; }
  `],
})
export class RfqDetailComponent implements OnInit {
  private readonly api   = inject(SalesApiService);
  private readonly route = inject(ActivatedRoute);

  readonly data    = signal<RfqRequestDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error.set('invalid RFQ id');
      this.loading.set(false);
      return;
    }
    try { this.data.set(await this.api.getRfq(id)); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load RFQ'); }
    finally { this.loading.set(false); }
  }
}

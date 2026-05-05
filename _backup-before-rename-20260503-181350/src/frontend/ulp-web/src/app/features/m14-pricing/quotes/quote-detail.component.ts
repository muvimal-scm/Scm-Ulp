import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M14ApiService } from '../shared/m14-api.service';
import { QuoteDto, QuoteLineDto, QuoteStatus } from '../shared/m14-types';

@Component({
  selector: 'ulp-m14-quote-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink=".." class="back"><mat-icon>arrow_back</mat-icon> Quotes</a>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else if (quote()) {
      @if (quote(); as q) {
      <header class="page-head">
        <h1>{{ q.quoteNumber }}</h1>
        <div class="head-meta">
          <span class="badge badge--{{ q.status.toLowerCase() }}">{{ q.status }}</span>
          <span class="ctry">customer party {{ q.customerPartyId }}</span>
          @if (q.enquiryRef) { <span>· enquiry {{ q.enquiryRef }}</span> }
        </div>
        @if (q.totalAmount !== null) {
          <div class="total">
            Total: <strong>{{ q.totalAmount | number:'1.2-2' }} {{ q.totalCurrency }}</strong>
            @if (q.validUntil) { · valid until {{ q.validUntil | slice:0:10 }} }
          </div>
        }
        @if (q.notes) { <p class="notes">{{ q.notes }}</p> }
      </header>

      <div class="actions">
        @for (s of nextStatuses(q.status); track s) {
          <button mat-stroked-button (click)="changeStatus(s)">→ {{ s }}</button>
        }
      </div>

      <div class="lines-card">
        <h2 class="lines-head">
          <span>Quote lines</span>
          <span class="lines-count">{{ lines().length }}</span>
        </h2>
        @if (lines().length === 0) {
          <p class="muted">No lines yet.</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Charge code</th>
                <th>Description</th>
                <th class="num">Qty</th>
                <th>UoM</th>
                <th class="num">Unit price</th>
                <th class="num">Amount</th>
                <th>Currency</th>
                <th>Source rate card</th>
              </tr>
            </thead>
            <tbody>
              @for (l of lines(); track l.id) {
                <tr>
                  <td>{{ l.lineNumber }}</td>
                  <td><code>{{ l.chargeCode }}</code></td>
                  <td>{{ l.description || '—' }}</td>
                  <td class="num">{{ l.quantity ? (l.quantity | number:'1.0-2') : '—' }}</td>
                  <td>{{ l.uomCode || '—' }}</td>
                  <td class="num">{{ l.unitPrice ? (l.unitPrice | number:'1.2-4') : '—' }}</td>
                  <td class="num"><strong>{{ l.amount ? (l.amount | number:'1.2-2') : '—' }}</strong></td>
                  <td>{{ l.currency || '—' }}</td>
                  <td>{{ l.rateCardId ? ('card #' + l.rateCardId) : 'manual' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .back { color: #5B3FA0; text-decoration: none; display: inline-flex; gap: 6px; align-items: center; font-size: 13px; margin-bottom: 12px; }
    .back:hover { color: #3F2D7C; }

    .page-head h1 {
      font-size: 28px; font-weight: 800; margin: 0 0 6px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .head-meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; color: #6B5BA0; font-size: 12.5px; }
    .total { color: #1A1A33; font-size: 16px; margin: 8px 0 6px; }
    .total strong { color: #3F2D7C; }
    .notes { color: #5C5C66; font-size: 13px; margin: 6px 0 16px; font-style: italic; }
    .ctry { font-family: 'SFMono-Regular', Consolas, monospace; }

    .actions { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }

    .lines-card {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden;
    }
    .lines-head { display: flex; justify-content: space-between; align-items: center;
      margin: 0; padding: 14px 18px; border-bottom: 1px solid #E8E2F4;
      font-size: 14px; font-weight: 700; color: #3F2D7C; }
    .lines-count { background: #E8E2F4; color: #3F2D7C; padding: 2px 10px; border-radius: 999px; font-size: 12px; }
    .muted { padding: 24px; text-align: center; color: #9A9AA3; margin: 0; }

    table { width: 100%; border-collapse: collapse; }
    thead th {
      text-align: left; padding: 10px 14px;
      background: #F8F5FD; color: #3F2D7C;
      font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    }
    thead th.num { text-align: right; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }

    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .badge--draft     { background: #F0F0F4; color: #6B6B73; }
    .badge--sent      { background: #FFF3D6; color: #946100; }
    .badge--accepted  { background: #DCF5E4; color: #1F7A3D; }
    .badge--rejected  { background: #FCDDE0; color: #B23F45; }
    .badge--expired   { background: #F0F0F4; color: #6B6B73; }
    .badge--converted { background: #E8E2F4; color: #3F2D7C; }
  `],
})
export class QuoteDetailComponent implements OnInit {
  private readonly api   = inject(M14ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly quote   = signal<QuoteDto | null>(null);
  readonly lines   = signal<QuoteLineDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  private id = 0;

  async ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    await this.reload();
  }

  async reload() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [q, l] = await Promise.all([this.api.getQuote(this.id), this.api.getQuoteLines(this.id)]);
      this.quote.set(q);
      this.lines.set(l);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load quote');
    } finally {
      this.loading.set(false);
    }
  }

  /** Allowed transitions in the simple Phase 2.0 status flow. */
  nextStatuses(current: QuoteStatus): QuoteStatus[] {
    switch (current) {
      case 'Draft':    return ['Sent'];
      case 'Sent':     return ['Accepted', 'Rejected', 'Expired'];
      case 'Accepted': return ['Converted'];
      default:         return [];
    }
  }

  async changeStatus(newStatus: QuoteStatus) {
    try {
      this.quote.set(await this.api.changeQuoteStatus(this.id, newStatus));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Status change failed');
    }
  }
}

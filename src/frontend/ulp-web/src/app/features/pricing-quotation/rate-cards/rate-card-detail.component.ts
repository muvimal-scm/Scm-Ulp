import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PricingQuotationApiService } from '../shared/pricing-quotation-api.service';
import { RateCardDto, RateCardLineDto } from '../shared/pricing-quotation-types';

@Component({
  selector: 'ulp-pricing-quotation-rate-card-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink=".." class="back"><mat-icon>arrow_back</mat-icon> Rate cards</a>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else if (card()) {
      @if (card(); as c) {
      <header class="page-head">
        <h1>{{ c.cardNumber }}</h1>
        <div class="head-meta">
          <span class="type type--{{ c.cardType.toLowerCase() }}">{{ c.cardType }}</span>
          <span class="badge badge--{{ c.status.toLowerCase() }}">{{ c.status }}</span>
          <span class="ctry">{{ c.countryCode }} · {{ c.scope }} · {{ c.serviceType || '—' }} · {{ c.currency }}</span>
        </div>
        <div class="head-validity">
          Valid {{ c.validFrom | slice:0:10 }} → {{ c.validTo ? (c.validTo | slice:0:10) : 'open' }}
          @if (c.approvedAt) { · approved {{ c.approvedAt | slice:0:19 }} }
        </div>
      </header>

      <div class="actions">
        @if (c.status === 'Draft' || c.status === 'Approved') {
          <button mat-flat-button color="primary" (click)="approve()">
            <mat-icon>check</mat-icon> Approve / activate
          </button>
        }
      </div>

      <div class="lines-card">
        <h2 class="lines-head">
          <span>Charge lines</span>
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
                <th>UoM</th>
                <th class="num">Rate</th>
                <th>Currency</th>
                <th class="num">Min</th>
                <th class="num">Max</th>
                <th>Tax</th>
              </tr>
            </thead>
            <tbody>
              @for (l of lines(); track l.id) {
                <tr>
                  <td>{{ l.lineNumber }}</td>
                  <td><code>{{ l.chargeCode }}</code></td>
                  <td>{{ l.description || '—' }}</td>
                  <td>{{ l.uomCode }}</td>
                  <td class="num">{{ l.rateAmount | number:'1.2-4' }}</td>
                  <td>{{ l.rateCurrency }}</td>
                  <td class="num">{{ l.minAmount ? (l.minAmount | number:'1.2-2') : '—' }}</td>
                  <td class="num">{{ l.maxAmount ? (l.maxAmount | number:'1.2-2') : '—' }}</td>
                  <td>
                    @if (l.isTaxable) { <span class="dot dot--ok"></span> taxable }
                    @else { <span class="dot dot--off"></span> exempt }
                  </td>
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
    .head-meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; color: #6B5BA0; font-size: 12.5px; margin-bottom: 6px; }
    .head-validity { color: #6B5BA0; font-size: 12.5px; margin-bottom: 16px; }
    .ctry { font-family: 'SFMono-Regular', Consolas, monospace; }

    .actions { display: flex; gap: 8px; margin-bottom: 16px; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }

    .lines-card {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden;
    }
    .lines-head { display: flex; justify-content: space-between; align-items: center;
      margin: 0; padding: 14px 18px; border-bottom: 1px solid #E8E2F4;
      font-size: 14px; font-weight: 700; color: #3F2D7C; }
    .lines-count {
      background: #E8E2F4; color: #3F2D7C;
      padding: 2px 10px; border-radius: 999px; font-size: 12px;
    }
    .muted { padding: 24px; text-align: center; color: #9A9AA3; margin: 0; }

    table { width: 100%; border-collapse: collapse; }
    thead th {
      text-align: left; padding: 10px 14px;
      background: #F8F5FD; color: #3F2D7C;
      font-size: 11.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    thead th.num { text-align: right; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }

    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .type { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .type--sell             { background: #DCF5E4; color: #1F7A3D; }
    .type--buy              { background: #FFF3D6; color: #946100; }
    .type--internaltransfer { background: #E8E2F4; color: #3F2D7C; }

    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .badge--draft     { background: #F0F0F4; color: #6B6B73; }
    .badge--approved  { background: #E8E2F4; color: #3F2D7C; }
    .badge--active    { background: #DCF5E4; color: #1F7A3D; }
    .badge--expired   { background: #F0F0F4; color: #6B6B73; }
    .badge--cancelled { background: #FCDDE0; color: #B23F45; }

    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
    .dot--ok  { background: #1F7A3D; }
    .dot--off { background: #9A9AA3; }
  `],
})
export class RateCardDetailComponent implements OnInit {
  private readonly api   = inject(PricingQuotationApiService);
  private readonly route = inject(ActivatedRoute);

  readonly card    = signal<RateCardDto | null>(null);
  readonly lines   = signal<RateCardLineDto[]>([]);
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
      const [c, l] = await Promise.all([this.api.getRateCard(this.id), this.api.getRateCardLines(this.id)]);
      this.card.set(c);
      this.lines.set(l);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load rate card');
    } finally {
      this.loading.set(false);
    }
  }

  async approve() {
    try {
      this.card.set(await this.api.approveRateCard(this.id));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Approve failed');
    }
  }
}

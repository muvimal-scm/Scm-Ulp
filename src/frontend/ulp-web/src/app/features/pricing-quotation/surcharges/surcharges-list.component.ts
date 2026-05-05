import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PricingQuotationApiService } from '../shared/pricing-quotation-api.service';
import { SurchargeDto } from '../shared/pricing-quotation-types';

@Component({
  selector: 'ulp-pricing-quotation-surcharges',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Surcharges</h1>
      <p>BAF, CAF, fuel, war risk, peak season — applied per quote per validity window.</p>
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
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th class="num">Amount / %</th>
              <th>Validity</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            @for (s of rows(); track s.id) {
              <tr [class.inactive]="!s.isActive">
                <td><code>{{ s.code }}</code></td>
                <td>{{ s.name }}</td>
                <td><span class="type type--{{ s.surchargeType.toLowerCase() }}">{{ s.surchargeType }}</span></td>
                <td class="num">
                  @if (s.surchargeType === 'PercentFreight' && s.percent !== null) {
                    {{ s.percent | number:'1.2-4' }} %
                  } @else if (s.amount !== null) {
                    {{ s.amount | number:'1.2-2' }} {{ s.currency }}
                  } @else { — }
                </td>
                <td>{{ s.validFrom | slice:0:10 }} → {{ s.validTo ? (s.validTo | slice:0:10) : 'open' }}</td>
                <td>
                  @if (s.isActive) { <span class="dot dot--ok"></span> active }
                  @else { <span class="dot dot--off"></span> inactive }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">No surcharges configured.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 {
      font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }

    .table-wrap {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      text-align: left; padding: 12px 16px;
      background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    thead th.num { text-align: right; }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr.inactive td { opacity: 0.55; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }

    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .type { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .type--fixed          { background: #E8E2F4; color: #3F2D7C; }
    .type--percentfreight { background: #FFF3D6; color: #946100; }
    .type--perunit        { background: #DCF5E4; color: #1F7A3D; }

    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
    .dot--ok  { background: #1F7A3D; }
    .dot--off { background: #B23F45; }
  `],
})
export class SurchargesListComponent implements OnInit {
  private readonly api = inject(PricingQuotationApiService);

  readonly rows    = signal<SurchargeDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.rows.set(await this.api.listSurcharges());
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load surcharges');
    } finally {
      this.loading.set(false);
    }
  }
}

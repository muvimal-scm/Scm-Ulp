import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PricingQuotationApiService } from '../shared/pricing-quotation-api.service';
import { ContractDto } from '../shared/pricing-quotation-types';

@Component({
  selector: 'ulp-pricing-quotation-contracts',
  standalone: true,
  imports: [SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Customer contracts</h1>
      <p>Long-term agreements that anchor a customer to a specific rate card with payment terms.</p>
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
              <th>Contract</th>
              <th>Customer</th>
              <th>Rate card</th>
              <th>Period</th>
              <th>Payment</th>
              <th>Auto-renew</th>
              <th>Status</th>
              <th>Document</th>
            </tr>
          </thead>
          <tbody>
            @for (c of rows(); track c.id) {
              <tr>
                <td><code>{{ c.contractNumber }}</code></td>
                <td>party {{ c.customerPartyId }}</td>
                <td>{{ c.rateCardId ? ('card #' + c.rateCardId) : '—' }}</td>
                <td>{{ c.startDate | slice:0:10 }} → {{ c.endDate ? (c.endDate | slice:0:10) : 'open' }}</td>
                <td>{{ c.paymentTerms || '—' }}</td>
                <td>
                  @if (c.autoRenew) { <span class="dot dot--ok"></span> yes }
                  @else { <span class="dot dot--off"></span> no }
                </td>
                <td><span class="badge badge--{{ c.status.toLowerCase() }}">{{ c.status }}</span></td>
                <td>{{ c.documentId ? ('doc #' + c.documentId) : '—' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty">No contracts.</td></tr>
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
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }

    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .badge--draft      { background: #F0F0F4; color: #6B6B73; }
    .badge--active     { background: #DCF5E4; color: #1F7A3D; }
    .badge--expiring   { background: #FFF3D6; color: #946100; }
    .badge--expired    { background: #F0F0F4; color: #6B6B73; }
    .badge--terminated { background: #FCDDE0; color: #B23F45; }

    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
    .dot--ok  { background: #1F7A3D; }
    .dot--off { background: #9A9AA3; }
  `],
})
export class ContractsListComponent implements OnInit {
  private readonly api = inject(PricingQuotationApiService);

  readonly rows    = signal<ContractDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.rows.set(await this.api.listContracts());
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load contracts');
    } finally {
      this.loading.set(false);
    }
  }
}

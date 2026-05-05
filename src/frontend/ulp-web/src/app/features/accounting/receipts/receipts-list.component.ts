import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountingApiService } from '../shared/accounting-api.service';
import { ReceiptDto } from '../shared/accounting-types';

@Component({
  selector: 'ulp-accounting-receipts',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>AR · Receipts</h1>
          <p>Customer payments received. Auto-matched by reference where possible; manual match for ambiguous.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new" class="new-btn">
          <mat-icon>add</mat-icon>&nbsp;New receipt
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
          <thead><tr><th>Receipt #</th><th>Date</th><th>Customer</th><th>Method</th><th>Cur</th><th>Amount</th><th>Unmatched</th><th>Status</th><th>Bank ref</th></tr></thead>
          <tbody>
            @for (r of receipts(); track r.id) {
              <tr>
                <td class="mono">{{ r.receiptNumber }}</td>
                <td>{{ r.receiptDate | slice:0:10 }}</td>
                <td>{{ r.customerName ?? ('#' + r.customerPartyId) }}</td>
                <td><span class="method">{{ r.paymentMethod }}</span></td>
                <td class="mono">{{ r.currency }}</td>
                <td class="num"><strong>{{ r.amount | number:'1.2-2' }}</strong></td>
                <td class="num">{{ r.unmatchedAmount | number:'1.2-2' }}</td>
                <td><span class="status status--{{ r.status.toLowerCase() }}">{{ r.status }}</span></td>
                <td class="mono small">{{ r.bankReference ?? '—' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">No receipts yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .new-btn { white-space: nowrap; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 16px; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
                  box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C;
               font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    .num  { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .small { font-size: 11px; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .method { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
              background: #DCEAF8; color: #1F4E8A; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--received         { background: #FFF3D6; color: #946100; }
    .status--partiallymatched { background: #FFE6CC; color: #8A4F00; }
    .status--matched          { background: #DCF5E4; color: #1F7A3D; }
    .status--refunded         { background: #F5F5F5; color: #777; }
  `],
})
export class ReceiptsListComponent implements OnInit {
  private readonly api = inject(AccountingApiService);
  readonly receipts = signal<ReceiptDto[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);

  async ngOnInit() {
    try { this.receipts.set(await this.api.listReceipts()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load receipts'); }
    finally { this.loading.set(false); }
  }
}

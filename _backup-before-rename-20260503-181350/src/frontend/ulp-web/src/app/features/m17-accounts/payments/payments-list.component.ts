import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M17ApiService } from '../shared/m17-api.service';
import { PaymentDto } from '../shared/m17-types';

@Component({
  selector: 'ulp-m17-payments',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>AP · Vendor Payments</h1>
      <p>Vendor payments out — NACH/IMPS/RTGS/NEFT (India), ACH (US). TDS withheld at payment time per LLD §6.3.</p>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Payment #</th><th>Date</th><th>Vendor</th><th>Method</th><th>Cur</th><th>Gross</th><th>TDS</th><th>Net</th><th>Status</th><th>Bank ref</th></tr></thead>
          <tbody>
            @for (p of payments(); track p.id) {
              <tr>
                <td class="mono">{{ p.paymentNumber }}</td>
                <td>{{ p.paymentDate | slice:0:10 }}</td>
                <td>{{ p.vendorName ?? ('#' + p.vendorPartyId) }}</td>
                <td><span class="method">{{ p.paymentMethod }}</span></td>
                <td class="mono">{{ p.currency }}</td>
                <td class="num">{{ p.amount | number:'1.2-2' }}</td>
                <td class="num">{{ p.withholdingAmount | number:'1.2-2' }}</td>
                <td class="num"><strong>{{ p.netAmount | number:'1.2-2' }}</strong></td>
                <td><span class="status status--{{ p.status.toLowerCase() }}">{{ p.status }}</span></td>
                <td class="mono small">{{ p.bankReference ?? '—' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="10" class="empty">No payments yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
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
              background: #E8E2F4; color: #3F2D7C; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--pending   { background: #FFF3D6; color: #946100; }
    .status--approved  { background: #DCEAF8; color: #1F4E8A; }
    .status--sent      { background: #DCF5E4; color: #1F7A3D; }
    .status--cleared   { background: #C8EBD3; color: #1F7A3D; }
    .status--failed    { background: #FBE4E5; color: #B23F45; }
    .status--cancelled { background: #F5F5F5; color: #777; text-decoration: line-through; }
  `],
})
export class PaymentsListComponent implements OnInit {
  private readonly api = inject(M17ApiService);
  readonly payments = signal<PaymentDto[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);

  async ngOnInit() {
    try { this.payments.set(await this.api.listPayments()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load payments'); }
    finally { this.loading.set(false); }
  }
}

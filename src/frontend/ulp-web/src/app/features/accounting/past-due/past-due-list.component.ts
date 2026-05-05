import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountingExtApiService } from '../shared/accounting-ext-api.service';
import { PastDueNoticeDto, PastDueStatus } from '../shared/accounting-ext-types';

@Component({
  selector: 'ulp-accounting-past-due',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Past-Due Notices</h1>
      <p>Customer dunning notices — first reminder → second → final → legal action.
         Multi-invoice notice generation; email or print delivery. Closes the SCM
         client M3 "Past Due Notices" + "Customer Statements" items.</p>
    </header>

    <nav class="tabs">
      <button class="tab" [class.tab--active]="filter() === null" (click)="setFilter(null)">All</button>
      @for (s of statuses; track s) {
        <button class="tab" [class.tab--active]="filter() === s" (click)="setFilter(s)">{{ s }}</button>
      }
    </nav>

    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Notice #</th><th>Customer</th><th>Level</th><th>Overdue</th><th>Invoices</th><th>Generated</th><th>Sent</th><th>Delivery</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (n of rows(); track n.id) {
              <tr>
                <td class="mono">{{ n.noticeNumber }}</td>
                <td><strong>{{ n.customerName ?? ('#' + n.customerPartyId) }}</strong></td>
                <td><span class="level level--{{ n.noticeLevel.toLowerCase() }}">{{ n.noticeLevel }}</span></td>
                <td class="num"><strong>{{ n.totalOverdueAmount | number:'1.2-2' }} {{ n.currency }}</strong></td>
                <td class="num">{{ n.invoiceCount }}</td>
                <td>{{ n.generatedAt | slice:0:10 }}</td>
                <td>{{ n.sentAt ? (n.sentAt | slice:0:16) : '—' }}</td>
                <td><span class="delivery">{{ n.deliveryMethod }}</span></td>
                <td><span class="status status--{{ n.status.toLowerCase() }}">{{ n.status }}</span></td>
                <td>
                  @if (n.status === 'Draft') {
                    <button class="btn-link" (click)="send(n)" [disabled]="busy()">Send now</button>
                  }
                </td>
              </tr>
            } @empty { <tr><td colspan="10" class="empty">No past-due notices.</td></tr> }
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
    .page-head p { color: #6B5BA0; margin: 0 0 16px; max-width: 720px; }
    .tabs { display: flex; gap: 6px; border-bottom: 1px solid #E8E2F4; margin-bottom: 12px; padding: 0 4px; }
    .tab { background: transparent; border: none; cursor: pointer; padding: 10px 14px; font-size: 13px;
           font-weight: 600; color: #6B5BA0; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit; }
    .tab:hover { color: #3F2D7C; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }
    .loading { padding: 24px; text-align: center; color: #6B5BA0; }
    .table-wrap { background: #FFF; border: 1px solid #E8E2F4; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; font-size: 13px; color: #1A1A33; }
    .num  { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .btn-link { background: none; border: none; cursor: pointer; color: #5B3FA0; font-weight: 600; font-size: 12px; padding: 2px 6px; font-family: inherit; }
    .btn-link:hover { text-decoration: underline; }
    .btn-link:disabled { color: #C5C5D5; cursor: not-allowed; }
    .level { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .level--first       { background: #FFF3D6; color: #946100; }
    .level--second      { background: #FFE6CC; color: #8A4F00; }
    .level--final       { background: #FBE4E5; color: #B23F45; }
    .level--legalaction { background: #B23F45; color: #FFF; }
    .delivery { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #DCEAF8; color: #1F4E8A; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft        { background: #F5F2FB; color: #6B5BA0; }
    .status--sent         { background: #DCEAF8; color: #1F4E8A; }
    .status--acknowledged { background: #FFE6CC; color: #8A4F00; }
    .status--resolved     { background: #DCF5E4; color: #1F7A3D; }
  `],
})
export class PastDueListComponent implements OnInit {
  private readonly api = inject(AccountingExtApiService);
  readonly rows = signal<PastDueNoticeDto[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly filter = signal<PastDueStatus | null>(null);
  readonly statuses: PastDueStatus[] = ['Draft','Sent','Acknowledged','Resolved'];

  async ngOnInit() { await this.reload(); }

  async setFilter(s: PastDueStatus | null) { this.filter.set(s); await this.reload(); }

  private async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listPastDueNotices(this.filter() ?? undefined)); }
    finally { this.loading.set(false); }
  }

  async send(n: PastDueNoticeDto) {
    if (!confirm(`Send ${n.noticeNumber} to ${n.customerName}?`)) return;
    this.busy.set(true);
    try {
      await this.api.sendPastDueNotice(n.id);
      await this.reload();
    } finally { this.busy.set(false); }
  }
}

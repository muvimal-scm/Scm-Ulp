import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M17ExtApiService } from '../shared/m17-ext-api.service';
import { SettlementLinkDto } from '../shared/m17-ext-types';

@Component({
  selector: 'ulp-m17-settlement',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>A/R ↔ A/P Settlement</h1>
      <p>Cross-link an A/R invoice line to an A/P bill line — receivable stays trackable
         even after the receivable is paid/logged. Closes the SCM client M3 "Connect invoice
         line receivable to payable" item.</p>
    </header>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Invoice line</th><th>Bill line</th><th>Linked amount</th><th>Notes</th><th>Created</th><th>Status</th><th>Reversed</th><th>Reason</th><th></th></tr></thead>
          <tbody>
            @for (s of rows(); track s.id) {
              <tr>
                <td class="mono">#{{ s.invoiceLineId }}</td>
                <td class="mono">#{{ s.billLineId }}</td>
                <td class="num"><strong>{{ s.linkedAmount | number:'1.2-2' }} {{ s.currency }}</strong></td>
                <td class="muted small">{{ s.notes }}</td>
                <td>{{ s.createdAt | slice:0:16 }}</td>
                <td><span class="status status--{{ s.status.toLowerCase() }}">{{ s.status }}</span></td>
                <td>{{ s.reversedAt ? (s.reversedAt | slice:0:16) : '—' }}</td>
                <td class="muted small">{{ s.reversalReason ?? '—' }}</td>
                <td>
                  @if (s.status === 'Active') {
                    <button class="btn-link" (click)="reverse(s)" [disabled]="busy()">Reverse</button>
                  }
                </td>
              </tr>
            } @empty { <tr><td colspan="9" class="empty">No settlement links.</td></tr> }
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
    .loading { padding: 24px; text-align: center; color: #6B5BA0; }
    .table-wrap { background: #FFF; border: 1px solid #E8E2F4; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; font-size: 13px; color: #1A1A33; }
    .num  { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .small { font-size: 12px; }
    .muted { color: #6B5BA0; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .btn-link { background: none; border: none; cursor: pointer; color: #5B3FA0; font-weight: 600; font-size: 12px; padding: 2px 6px; font-family: inherit; }
    .btn-link:hover { text-decoration: underline; }
    .btn-link:disabled { color: #C5C5D5; cursor: not-allowed; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--active   { background: #DCF5E4; color: #1F7A3D; }
    .status--reversed { background: #FBE4E5; color: #B23F45; }
  `],
})
export class SettlementListComponent implements OnInit {
  private readonly api = inject(M17ExtApiService);
  readonly rows = signal<SettlementLinkDto[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);

  async ngOnInit() {
    try { this.rows.set(await this.api.listSettlementLinks()); }
    finally { this.loading.set(false); }
  }

  async reverse(s: SettlementLinkDto) {
    const reason = prompt('Reason for reversal (audit-logged):');
    if (!reason) return;
    this.busy.set(true);
    try {
      await this.api.reverseSettlementLink(s.id, reason);
      this.rows.set(await this.api.listSettlementLinks());
    } finally { this.busy.set(false); }
  }
}

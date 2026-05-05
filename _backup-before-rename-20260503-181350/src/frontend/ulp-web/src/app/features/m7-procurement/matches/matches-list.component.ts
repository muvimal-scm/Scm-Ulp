import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M7ApiService } from '../shared/m7-api.service';
import { InvoiceMatchDto } from '../shared/m7-types';

@Component({
  selector: 'ulp-m7-matches',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Invoice matching</h1>
      <p>3-way match log: PO + GRN + vendor invoice. Variances flagged for finance review.</p>
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
              <th>PO</th><th>Vendor invoice</th><th>Match</th>
              <th class="num">Variance</th><th>Matched</th><th>Notes</th>
            </tr>
          </thead>
          <tbody>
            @for (m of rows(); track m.id) {
              <tr>
                <td>PO #{{ m.poId }}</td>
                <td>{{ m.vendorInvoiceNo ?? '—' }}</td>
                <td><span class="match match--{{ m.matchStatus.toLowerCase() }}">{{ m.matchStatus }}</span></td>
                <td class="num">{{ m.varianceAmount !== null ? (m.varianceAmount | number:'1.2-2') : '—' }} {{ m.varianceCurrency ?? '' }}</td>
                <td>{{ m.matchedAt | slice:0:16 }}</td>
                <td>{{ m.notes ?? '—' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">No invoice match records yet.</td></tr>
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
    .page-head p { color: #6B5BA0; margin: 0 0 20px; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 16px; background: #F5F2FB; color: #3F2D7C;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .match { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .match--threewaymatched { background: #DCF5E4; color: #1F7A3D; }
    .match--pricevariance   { background: #FFF3D6; color: #946100; }
    .match--qtyvariance     { background: #FFE6CC; color: #8A4F00; }
    .match--nopo            { background: #FBE4E5; color: #B23F45; }
    .match--disputed        { background: #FBE4E5; color: #B23F45; }
  `],
})
export class MatchesListComponent implements OnInit {
  private readonly api = inject(M7ApiService);
  readonly rows = signal<InvoiceMatchDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listMatches()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load invoice matches'); }
    finally { this.loading.set(false); }
  }
}

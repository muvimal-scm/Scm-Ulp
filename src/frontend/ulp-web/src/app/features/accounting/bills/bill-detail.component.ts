import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountingApiService } from '../shared/accounting-api.service';
import { BillDto } from '../shared/accounting-types';

@Component({
  selector: 'ulp-accounting-bill-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (bill() === null) {
      <div class="error"><mat-icon>error_outline</mat-icon> Bill not found</div>
    }
    @if (!loading() && bill(); as b) {
      <header class="page-head">
        <a routerLink="/app/accounting/bills" class="back-link">‹ Back to bills</a>
        <h1>{{ b.internalNumber }} <span class="vendor-ref">(vendor ref {{ b.billNumber }})</span></h1>
        <p>
          <span class="status status--{{ b.status.toLowerCase() }}">{{ b.status }}</span>
          · {{ b.billDate | slice:0:10 }} · due {{ b.dueDate | slice:0:10 }}
          · {{ b.vendorName }}
        </p>
      </header>

      <div class="actions-bar">
        @if (b.status === 'Draft' || b.status === 'PendingApproval' || b.status === 'Approved') {
          <button class="btn btn--primary" (click)="post()" [disabled]="busy()">Post bill</button>
        }
      </div>

      <div class="grid">
        <section class="card">
          <h2>Lines</h2>
          <table>
            <thead><tr><th>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>Unit</th><th>Line</th><th>Tax</th></tr></thead>
            <tbody>
              @for (l of b.lines ?? []; track l.id) {
                <tr>
                  <td>{{ l.lineNumber }}</td>
                  <td>{{ l.description }}</td>
                  <td class="mono">{{ l.hsnCode ?? '—' }}</td>
                  <td class="num">{{ l.quantity }}</td>
                  <td class="num">{{ l.unitPriceAmount | number:'1.2-2' }}</td>
                  <td class="num">{{ l.lineAmount | number:'1.2-2' }}</td>
                  <td class="num">{{ l.taxAmount | number:'1.2-2' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <div class="totals">
            <div><span>Subtotal</span><strong>{{ b.currency }} {{ b.subtotalAmount | number:'1.2-2' }}</strong></div>
            <div><span>Tax</span><strong>{{ b.currency }} {{ b.taxAmount | number:'1.2-2' }}</strong></div>
            <div><span>Withholding (TDS)</span><strong>{{ b.currency }} {{ b.withholdingAmount | number:'1.2-2' }}</strong></div>
            <div class="grand"><span>Gross total</span><strong>{{ b.currency }} {{ b.totalAmount | number:'1.2-2' }}</strong></div>
            <div><span>Net payable (after TDS)</span><strong>{{ b.currency }} {{ (b.totalAmount - b.withholdingAmount) | number:'1.2-2' }}</strong></div>
            <div><span>Paid</span><strong>{{ b.currency }} {{ b.paidAmount | number:'1.2-2' }}</strong></div>
          </div>
        </section>

        @if (b.indiaExt; as ext) {
          <section class="card">
            <h2>India · TDS</h2>
            <dl class="dl">
              <dt>Section</dt><dd>{{ ext.tdsSectionCode ?? '—' }}</dd>
              <dt>Rate</dt><dd>{{ ext.tdsRatePct !== null ? (ext.tdsRatePct + '%') : '—' }}</dd>
              <dt>TDS amount</dt><dd class="mono">{{ b.currency }} {{ ext.tdsAmount | number:'1.2-2' }}</dd>
              <dt>Vendor PAN</dt><dd class="mono">{{ ext.vendorPan ?? '—' }}</dd>
              <dt>Vendor GSTIN</dt><dd class="mono">{{ ext.vendorGstin ?? '—' }}</dd>
              <dt>Reverse charge</dt><dd>{{ ext.isReverseCharge ? 'Yes' : 'No' }}</dd>
            </dl>
          </section>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .back-link { color: #5B3FA0; text-decoration: none; font-size: 13px; font-weight: 600; }
    .back-link:hover { text-decoration: underline; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 4px 0;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head h1 .vendor-ref { font-size: 14px; color: #6B5BA0; -webkit-text-fill-color: #6B5BA0;
                                 background: none; -webkit-background-clip: initial; font-weight: 500; }
    .page-head p { color: #6B5BA0; margin: 0 0 16px; font-size: 14px; }
    .actions-bar { display: flex; gap: 8px; margin-bottom: 16px; }
    .btn { padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; font-family: inherit; }
    .btn--primary { background: #5B3FA0; color: #FFF; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .card { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
            box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 20px; }
    .card h2 { font-size: 14px; font-weight: 700; color: #3F2D7C; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 8px 10px; background: #F5F2FB; color: #3F2D7C;
               font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 8px 10px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .totals { margin-top: 12px; padding-top: 12px; border-top: 1px solid #F0EBF8; }
    .totals > div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #6B5BA0; }
    .totals > div strong { color: #1A1A33; }
    .totals .grand { padding: 8px 0; border-top: 1px solid #F0EBF8; border-bottom: 1px solid #F0EBF8; margin: 4px 0; font-size: 15px; }
    .dl { display: grid; grid-template-columns: 110px 1fr; gap: 8px 16px; margin: 0; font-size: 13px; }
    .dl dt { color: #6B5BA0; font-weight: 600; }
    .dl dd { color: #1A1A33; margin: 0; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft           { background: #F5F2FB; color: #6B5BA0; }
    .status--pendingapproval { background: #FFF3D6; color: #946100; }
    .status--approved        { background: #DCEAF8; color: #1F4E8A; }
    .status--posted          { background: #DCF5E4; color: #1F7A3D; }
    .status--partiallypaid   { background: #FFE6CC; color: #8A4F00; }
    .status--paid            { background: #C8EBD3; color: #1F7A3D; }
    .status--overdue         { background: #FBE4E5; color: #B23F45; }
    .status--disputed        { background: #FFE6CC; color: #8A4F00; }
    .status--cancelled       { background: #F5F5F5; color: #777; text-decoration: line-through; }
  `],
})
export class BillDetailComponent implements OnInit {
  private readonly api = inject(AccountingApiService);
  private readonly route = inject(ActivatedRoute);
  readonly bill    = signal<BillDto | null>(null);
  readonly loading = signal(true);
  readonly busy    = signal(false);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try { this.bill.set(await this.api.getBill(id)); }
    catch { this.bill.set(null); }
    finally { this.loading.set(false); }
  }

  async post() {
    const b = this.bill(); if (!b) return;
    this.busy.set(true);
    try { this.bill.set(await this.api.postBill(b.id)); }
    catch (e: any) { this.error.set(e?.error?.error ?? e?.message ?? 'Post failed'); }
    finally { this.busy.set(false); }
  }
}

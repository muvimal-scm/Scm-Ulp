import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountingApiService } from '../shared/accounting-api.service';
import { InvoiceDto } from '../shared/accounting-types';

@Component({
  selector: 'ulp-accounting-invoice-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (invoice() === null) {
      <div class="error"><mat-icon>error_outline</mat-icon> Invoice not found</div>
    }
    @if (!loading() && invoice(); as inv) {
      <header class="page-head">
        <a routerLink="/app/accounting/invoices" class="back-link">‹ Back to invoices</a>
        <h1>{{ inv.invoiceNumber }}</h1>
        <p>
          <span class="status status--{{ inv.status.toLowerCase() }}">{{ inv.status }}</span>
          · {{ inv.invoiceDate | slice:0:10 }} · due {{ inv.dueDate | slice:0:10 }}
          · {{ inv.customerName }}
        </p>
      </header>

      <div class="actions-bar">
        @if (inv.status === 'Draft' || inv.status === 'PendingApproval' || inv.status === 'Approved') {
          <button class="btn btn--primary" (click)="post()" [disabled]="busy()">Post invoice</button>
          <button class="btn btn--ghost" (click)="void_()" [disabled]="busy()">Void…</button>
        }
      </div>

      <div class="grid">
        <section class="card">
          <h2>Lines</h2>
          <table>
            <thead><tr><th>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>UoM</th><th>Unit</th><th>Line</th><th>Tax</th></tr></thead>
            <tbody>
              @for (l of inv.lines ?? []; track l.id) {
                <tr>
                  <td>{{ l.lineNumber }}</td>
                  <td>{{ l.description }}</td>
                  <td class="mono">{{ l.hsnCode ?? '—' }}</td>
                  <td class="num">{{ l.quantity }}</td>
                  <td>{{ l.uomCode ?? '—' }}</td>
                  <td class="num">{{ l.unitPriceAmount | number:'1.2-2' }}</td>
                  <td class="num">{{ l.lineAmount | number:'1.2-2' }}</td>
                  <td class="num">{{ l.taxAmount | number:'1.2-2' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <div class="totals">
            <div><span>Subtotal</span><strong>{{ inv.currency }} {{ inv.subtotalAmount | number:'1.2-2' }}</strong></div>
            <div><span>Tax</span><strong>{{ inv.currency }} {{ inv.taxAmount | number:'1.2-2' }}</strong></div>
            <div class="grand"><span>Total</span><strong>{{ inv.currency }} {{ inv.totalAmount | number:'1.2-2' }}</strong></div>
            <div><span>Paid</span><strong>{{ inv.currency }} {{ inv.paidAmount | number:'1.2-2' }}</strong></div>
            <div class="due"><span>Open</span><strong>{{ inv.currency }} {{ (inv.totalAmount - inv.paidAmount) | number:'1.2-2' }}</strong></div>
          </div>
        </section>

        @if (inv.indiaExt; as ext) {
          <section class="card">
            <h2>India · GST split</h2>
            <dl class="dl">
              <dt>Place of supply</dt><dd>{{ ext.placeOfSupply ?? '—' }} {{ ext.isIntraState ? '(intra-state)' : '(inter-state)' }}</dd>
              <dt>CGST</dt><dd class="mono">{{ inv.currency }} {{ ext.cgstAmount | number:'1.2-2' }}</dd>
              <dt>SGST</dt><dd class="mono">{{ inv.currency }} {{ ext.sgstAmount | number:'1.2-2' }}</dd>
              <dt>IGST</dt><dd class="mono">{{ inv.currency }} {{ ext.igstAmount | number:'1.2-2' }}</dd>
              <dt>Cess</dt><dd class="mono">{{ inv.currency }} {{ ext.cessAmount | number:'1.2-2' }}</dd>
              @if (ext.isExport) {
                <dt>Export</dt><dd>Yes ({{ ext.exportType }})</dd>
              }
              <dt>Reverse charge</dt><dd>{{ ext.reverseCharge ? 'Yes' : 'No' }}</dd>
            </dl>
          </section>
        }

        @if (inv.irn; as irn) {
          <section class="card card--irn">
            <h2>IRN (e-Invoice via IRP)</h2>
            <dl class="dl">
              <dt>Status</dt><dd><span class="status status--{{ irn.status.toLowerCase() }}">{{ irn.status }}</span></dd>
              <dt>IRN</dt><dd class="mono small">{{ irn.irnValue }}</dd>
              <dt>Ack #</dt><dd class="mono">{{ irn.ackNo }}</dd>
              <dt>Ack date</dt><dd>{{ irn.ackDate | slice:0:16 }}</dd>
              <dt>IRP provider</dt><dd>{{ irn.irpProvider }}</dd>
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
    .page-head p { color: #6B5BA0; margin: 0 0 16px; font-size: 14px; }
    .actions-bar { display: flex; gap: 8px; margin-bottom: 16px; }
    .btn { padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; font-family: inherit; }
    .btn--primary { background: #5B3FA0; color: #FFF; }
    .btn--ghost   { background: #FFF; color: #5B3FA0; border: 1px solid #C9BEEC; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .card { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
            box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 20px; }
    .card--irn { background: #FFF7F8; border-color: #FBE4E5; }
    .card h2 { font-size: 14px; font-weight: 700; color: #3F2D7C; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 8px 10px; background: #F5F2FB; color: #3F2D7C;
               font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 8px 10px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .small { font-size: 11px; word-break: break-all; }
    .totals { margin-top: 12px; padding-top: 12px; border-top: 1px solid #F0EBF8; }
    .totals > div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #6B5BA0; }
    .totals > div strong { color: #1A1A33; }
    .totals .grand { padding: 8px 0; border-top: 1px solid #F0EBF8; border-bottom: 1px solid #F0EBF8; margin: 4px 0; font-size: 15px; }
    .totals .due strong { color: #B23F45; }
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
    .status--writtenoff      { background: #F5F5F5; color: #777; }
    .status--void            { background: #F5F5F5; color: #777; text-decoration: line-through; }
    .status--generated       { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled       { background: #FBE4E5; color: #B23F45; }
    .status--failed          { background: #FBE4E5; color: #B23F45; }
  `],
})
export class InvoiceDetailComponent implements OnInit {
  private readonly api = inject(AccountingApiService);
  private readonly route = inject(ActivatedRoute);
  readonly invoice = signal<InvoiceDto | null>(null);
  readonly loading = signal(true);
  readonly busy    = signal(false);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try { this.invoice.set(await this.api.getInvoice(id)); }
    catch { this.invoice.set(null); }
    finally { this.loading.set(false); }
  }

  async post() {
    const inv = this.invoice(); if (!inv) return;
    this.busy.set(true);
    try { this.invoice.set(await this.api.postInvoice(inv.id)); }
    catch (e: any) { this.error.set(e?.error?.error ?? e?.message ?? 'Post failed'); }
    finally { this.busy.set(false); }
  }

  async void_() {
    const inv = this.invoice(); if (!inv) return;
    const reason = prompt('Void reason (audit-logged):');
    if (!reason) return;
    this.busy.set(true);
    try { this.invoice.set(await this.api.voidInvoice(inv.id, reason)); }
    catch (e: any) { this.error.set(e?.error?.error ?? e?.message ?? 'Void failed'); }
    finally { this.busy.set(false); }
  }
}

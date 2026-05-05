import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M7ApiService } from '../shared/m7-api.service';
import { PoDetailDto } from '../shared/m7-types';

@Component({
  selector: 'ulp-m7-po-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    }
    @if (data(); as d) {
      <a routerLink=".." class="back">← Back to purchase orders</a>
      <header class="page-head">
        <h1>{{ d.po.poNumber }}</h1>
        <p>
          {{ d.po.countryCode }} · vendor party #{{ d.po.vendorPartyId }}
          @if (d.po.rfqId) { · sourced from RFQ #{{ d.po.rfqId }} }
          · <span class="status status--{{ d.po.status.toLowerCase() }}">{{ d.po.status }}</span>
        </p>
      </header>

      <section class="card">
        <h2>Summary</h2>
        <dl>
          <dt>Total</dt>          <dd>{{ d.po.totalAmount ? (d.po.totalAmount | number:'1.0-2') : '—' }} {{ d.po.totalCurrency ?? '' }}</dd>
          <dt>Expected</dt>       <dd>{{ d.po.expectedDeliveryDate ? (d.po.expectedDeliveryDate | slice:0:10) : '—' }}</dd>
          <dt>Payment terms</dt>  <dd>{{ d.po.paymentTerms ?? '—' }}</dd>
          <dt>Created</dt>        <dd>{{ d.po.createdAt | slice:0:19 }}</dd>
        </dl>
      </section>

      <section class="card">
        <h2>Lines ({{ d.lines.length }})</h2>
        @if (d.lines.length === 0) { <p class="muted">No lines.</p> } @else {
          <table>
            <thead><tr>
              <th class="num">#</th><th>Description</th>
              <th class="num">Ordered</th><th class="num">Received</th><th>UOM</th>
              <th class="num">Unit</th><th class="num">Line total</th>
            </tr></thead>
            <tbody>
              @for (l of d.lines; track l.id) {
                <tr>
                  <td class="num">{{ l.lineNo }}</td>
                  <td>{{ l.description }}</td>
                  <td class="num">{{ l.quantityOrdered ? (l.quantityOrdered | number:'1.0-2') : '—' }}</td>
                  <td class="num">{{ l.quantityReceived ? (l.quantityReceived | number:'1.0-2') : '0' }}</td>
                  <td>{{ l.uomCode ?? '—' }}</td>
                  <td class="num">{{ l.unitPriceAmount ? (l.unitPriceAmount | number:'1.2-2') : '—' }} {{ l.unitPriceCurrency ?? '' }}</td>
                  <td class="num">
                    @if (l.unitPriceAmount && l.quantityOrdered) {
                      {{ (l.unitPriceAmount * l.quantityOrdered) | number:'1.2-2' }} {{ l.unitPriceCurrency ?? '' }}
                    } @else { — }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <section class="card">
        <h2>Goods receipts ({{ d.grns.length }})</h2>
        @if (d.grns.length === 0) { <p class="muted">No GRNs against this PO.</p> } @else {
          <table>
            <thead><tr>
              <th>GRN #</th><th>Received</th><th class="num">Lines</th><th>Status</th><th>Remarks</th>
            </tr></thead>
            <tbody>
              @for (g of d.grns; track g.id) {
                <tr>
                  <td><code>{{ g.grnNumber }}</code></td>
                  <td>{{ g.receivedAt | slice:0:16 }}</td>
                  <td class="num">{{ g.lineCount }}</td>
                  <td><span class="grn grn--{{ g.status.toLowerCase() }}">{{ g.status }}</span></td>
                  <td>{{ g.remarks ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <section class="card">
        <h2>Invoice matches ({{ d.matches.length }})</h2>
        @if (d.matches.length === 0) { <p class="muted">No invoice match records.</p> } @else {
          <table>
            <thead><tr>
              <th>Vendor invoice</th><th>Match</th><th class="num">Variance</th><th>Matched</th><th>Notes</th>
            </tr></thead>
            <tbody>
              @for (m of d.matches; track m.id) {
                <tr>
                  <td>{{ m.vendorInvoiceNo ?? '—' }}</td>
                  <td><span class="match match--{{ m.matchStatus.toLowerCase() }}">{{ m.matchStatus }}</span></td>
                  <td class="num">{{ m.varianceAmount !== null ? (m.varianceAmount | number:'1.2-2') : '—' }} {{ m.varianceCurrency ?? '' }}</td>
                  <td>{{ m.matchedAt | slice:0:16 }}</td>
                  <td>{{ m.notes ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .back { color: #5B3FA0; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-block; margin-bottom: 12px; }
    .back:hover { text-decoration: underline; }
    .page-head h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; font-size: 13px; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .card { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 20px; margin-bottom: 16px; }
    .card h2 { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .muted { color: #9A9AA3; }
    dl { display: grid; grid-template-columns: 160px 1fr; gap: 8px 16px; margin: 0; }
    dt { color: #6B5BA0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    dd { margin: 0; color: #1A1A33; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 8px 12px; background: #F5F2FB; color: #3F2D7C;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    tbody td { padding: 8px 12px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft          { background: #E8E2F4; color: #3F2D7C; }
    .status--approved       { background: #DCEAF8; color: #1F4E8A; }
    .status--sent           { background: #FFF3D6; color: #946100; }
    .status--partialreceipt { background: #FFE6CC; color: #8A4F00; }
    .status--closed         { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled      { background: #FBE4E5; color: #B23F45; }
    .grn { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .grn--draft    { background: #E8E2F4; color: #3F2D7C; }
    .grn--posted   { background: #DCF5E4; color: #1F7A3D; }
    .grn--reversed { background: #FBE4E5; color: #B23F45; }
    .match { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .match--threewaymatched { background: #DCF5E4; color: #1F7A3D; }
    .match--pricevariance   { background: #FFF3D6; color: #946100; }
    .match--qtyvariance     { background: #FFE6CC; color: #8A4F00; }
    .match--nopo            { background: #FBE4E5; color: #B23F45; }
    .match--disputed        { background: #FBE4E5; color: #B23F45; }
  `],
})
export class PoDetailComponent implements OnInit {
  private readonly api = inject(M7ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly data = signal<PoDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) { this.error.set('invalid PO id'); this.loading.set(false); return; }
    try { this.data.set(await this.api.getPo(id)); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load PO'); }
    finally { this.loading.set(false); }
  }
}

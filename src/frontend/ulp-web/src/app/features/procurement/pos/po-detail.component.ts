import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProcurementApiService } from '../shared/procurement-api.service';
import { PoDetailDto, PoStatus } from '../shared/procurement-types';

@Component({
  selector: 'ulp-procurement-po-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
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

      <!-- Status actions bar -->
      <section class="actions-bar">
        @if (d.po.status === 'Draft') {
          <button mat-flat-button color="primary" (click)="advance('Approved')" [disabled]="acting()">
            @if (acting()) { <mat-spinner diameter="16"></mat-spinner> } @else { ✅ Approve PO }
          </button>
        }
        @if (d.po.status === 'Approved') {
          <button mat-flat-button color="accent" (click)="advance('Sent')" [disabled]="acting()">
            @if (acting()) { <mat-spinner diameter="16"></mat-spinner> } @else { ✉️ Mark Sent to Vendor }
          </button>
          <button mat-stroked-button (click)="showBooking.set(!showBooking())">
            <mat-icon>flight_takeoff</mat-icon> Booking Request
          </button>
        }
        @if (d.po.status === 'Sent') {
          <button mat-stroked-button (click)="advance('Closed')" [disabled]="acting()">Close PO</button>
        }
        @if (actError()) { <span class="act-error">{{ actError() }}</span> }
      </section>

      <!-- Booking request inline panel -->
      @if (showBooking()) {
        <section class="card booking-card">
          <h2>Booking Request Details</h2>
          <p style="color:#6B5BA0;font-size:13px;margin:0 0 16px">Required before moving to Confirmed. Will notify the incoterm agent.</p>
          <div class="booking-grid">
            <div class="bfield"><label>POL (Port of Loading)</label><input [(ngModel)]="bkPol" placeholder="CNSHG" /></div>
            <div class="bfield"><label>POD (Port of Discharge)</label><input [(ngModel)]="bkPod" placeholder="USLAX" /></div>
            <div class="bfield"><label>Container Volume</label><input [(ngModel)]="bkCntrVol" placeholder="1 x 40HC" /></div>
            <div class="bfield"><label>Estimated CRD</label><input [(ngModel)]="bkCrd" type="date" /></div>
          </div>
          <div class="bk-actions">
            <button mat-stroked-button (click)="showBooking.set(false)">Cancel</button>
            <button mat-flat-button color="primary" (click)="submitBooking(d.po.poNumber)">Submit Booking Request</button>
          </div>
        </section>
      }

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
        <h2>OCR Invoice Match — PI vs PO Comparison</h2>
        @if (d.matches.length === 0) {
          <div class="ocr-empty">
            <mat-icon>receipt_long</mat-icon>
            <p>No PI/invoice match records. Upload a Proforma Invoice to trigger OCR comparison.</p>
          </div>
        } @else {
          @for (m of d.matches; track m.id) {
            <div class="ocr-card" [class.ocr-card--match]="m.matchStatus === 'ThreeWayMatched'" [class.ocr-card--mismatch]="m.matchStatus !== 'ThreeWayMatched'">
              <div class="ocr-card-head">
                <div>
                  <strong>{{ m.vendorInvoiceNo ?? 'Invoice #' + m.id }}</strong>
                  <span class="match match--{{ m.matchStatus.toLowerCase() }}">{{ matchLabel(m.matchStatus) }}</span>
                </div>
                <span class="ocr-time">{{ m.matchedAt | slice:0:16 }}</span>
              </div>
              @if (m.matchStatus !== 'ThreeWayMatched') {
                <div class="ocr-variance">
                  <mat-icon>warning</mat-icon>
                  Variance: {{ m.varianceAmount !== null ? (m.varianceAmount | number:'1.2-2') + ' ' + (m.varianceCurrency ?? '') : 'see notes' }}
                  @if (m.notes) { · {{ m.notes }} }
                </div>
              } @else {
                <div class="ocr-match-ok"><mat-icon>check_circle</mat-icon> All values match — PO lines confirmed against PI.</div>
              }
            </div>
          }
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
    .actions-bar { display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap; }
    .act-error { color:#B23F45;font-size:12px; }
    .booking-card { border-color:#C9BEEC;background:#FAFAFE; }
    .booking-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px; }
    .bfield { display:flex;flex-direction:column;gap:6px; }
    .bfield label { font-size:11px;font-weight:700;color:#3F2D7C;text-transform:uppercase; }
    .bfield input { border:1px solid #E8E2F4;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit; }
    .bk-actions { display:flex;gap:8px;justify-content:flex-end; }
    .ocr-empty { display:flex;align-items:center;gap:10px;color:#9A9AA3;font-size:13px; }
    .ocr-empty mat-icon { color:#C9BEEC; }
    .ocr-card { border:2px solid #DCEAF8;border-radius:10px;padding:14px;margin-bottom:10px; }
    .ocr-card--mismatch { border-color:#FBE4E5;background:#FFF8F8; }
    .ocr-card--match { border-color:#DCF5E4;background:#F8FFF9; }
    .ocr-card-head { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; }
    .ocr-time { font-size:11px;color:#9A9AA3; }
    .ocr-variance { display:flex;align-items:center;gap:6px;color:#946100;font-size:12px;font-weight:600; }
    .ocr-match-ok { display:flex;align-items:center;gap:6px;color:#1F7A3D;font-size:12px;font-weight:600; }
  `],
})
export class PoDetailComponent implements OnInit {
  private readonly api   = inject(ProcurementApiService);
  private readonly route = inject(ActivatedRoute);
  readonly data       = signal<PoDetailDto | null>(null);
  readonly loading    = signal(true);
  readonly error      = signal<string | null>(null);
  readonly acting     = signal(false);
  readonly actError   = signal<string | null>(null);
  readonly showBooking = signal(false);
  bkPol = ''; bkPod = ''; bkCntrVol = ''; bkCrd = '';

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) { this.error.set('invalid PO id'); this.loading.set(false); return; }
    try { this.data.set(await this.api.getPo(id)); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load PO'); }
    finally { this.loading.set(false); }
  }

  async advance(next: PoStatus) {
    if (!this.data()) return;
    this.acting.set(true); this.actError.set(null);
    try {
      const updated = await this.api.changePoStatus(this.data()!.po.id, next);
      this.data.update(d => d ? { ...d, po: updated } : d);
      this.showBooking.set(false);
    } catch (e: any) {
      this.actError.set(e?.error?.error ?? e?.message ?? 'Failed');
    } finally { this.acting.set(false); }
  }

  submitBooking(poNumber: string) {
    alert(`Booking Request submitted for ${poNumber}\nPOL: ${this.bkPol} → POD: ${this.bkPod}\nVolume: ${this.bkCntrVol}, CRD: ${this.bkCrd}`);
    this.showBooking.set(false);
  }

  matchLabel(s: string): string {
    return s === 'ThreeWayMatched' ? '✅ 3-Way Match'
         : s === 'PriceVariance'   ? '⚠️ Price Variance'
         : s === 'QtyVariance'     ? '⚠️ Qty Variance'
         : s === 'Disputed'        ? '❌ Disputed'
         : s;
  }
}

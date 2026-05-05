import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M4ApiService } from '../shared/m4-api.service';
import { EntryDetailDto } from '../shared/m4-types';

@Component({
  selector: 'ulp-m4-entry-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (detail() === null) {
      <div class="error"><mat-icon>error_outline</mat-icon> Entry not found</div>
    }
    @if (!loading() && detail(); as d) {
      <header class="page-head">
        <a routerLink="/app/m4/entries" class="back-link">‹ Back to entries</a>
        <h1>{{ d.entry.entryNumber ?? '#' + d.entry.id }} <span class="entry-type">· Type {{ d.entry.entryType }}</span></h1>
        <p>
          <span class="status status--{{ d.entry.abiStatus.toLowerCase() }}">{{ d.entry.abiStatus }}</span>
          @if (d.entry.pgaHoldFlag) { <span class="badge badge--pga">⛔ PGA hold</span> }
          @if (d.entry.examType !== 'Nil') { <span class="badge badge--exam">🔍 Exam: {{ d.entry.examType }}</span> }
          · {{ d.entry.importerName }} · entry {{ d.entry.entryDate | slice:0:10 }}
        </p>
        @if (d.entry.cbpStatusMessage) {
          <div class="cbp-msg"><mat-icon>info</mat-icon> {{ d.entry.cbpStatusMessage }}</div>
        }
      </header>

      <div class="grid">
        <section class="card">
          <h2>Lines (HTS classification)</h2>
          <table>
            <thead><tr><th>#</th><th>HTS</th><th>Description</th><th>COO</th><th>Qty</th><th>UoM</th><th>Value (USD)</th><th>Duty %</th><th>Duty USD</th><th>PGA</th></tr></thead>
            <tbody>
              @for (l of d.lines; track l.id) {
                <tr>
                  <td>{{ l.lineNumber }}</td>
                  <td class="mono">{{ l.htsNumber }}</td>
                  <td>{{ l.description }}</td>
                  <td class="mono">{{ l.countryOfOrigin }}</td>
                  <td class="num">{{ l.quantity }}</td>
                  <td>{{ l.unitOfMeasure }}</td>
                  <td class="num">{{ l.invoiceValueUsd | number:'1.2-2' }}</td>
                  <td class="num">{{ l.dutyRatePct ? (l.dutyRatePct + '%') : '—' }}</td>
                  <td class="num"><strong>{{ l.dutyAmountUsd | number:'1.2-2' }}</strong></td>
                  <td>
                    @if (l.fdaRequired)  { <span class="pga-tag pga-tag--fda">FDA</span> }
                    @if (l.usdaRequired) { <span class="pga-tag pga-tag--usda">USDA</span> }
                    @if (l.epaRequired)  { <span class="pga-tag pga-tag--epa">EPA</span> }
                    @if (l.fccRequired)  { <span class="pga-tag pga-tag--fcc">FCC</span> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="totals">
            <div><span>Total entered value</span><strong>USD {{ d.entry.totalValueUsd | number:'1.2-2' }}</strong></div>
            <div><span>Duty (per HTS)</span><strong>USD {{ d.entry.dutyAmountUsd | number:'1.2-2' }}</strong></div>
            <div><span>MPF (Merchandise Processing Fee)</span><strong>USD {{ d.entry.mpfUsd | number:'1.2-2' }}</strong></div>
            <div><span>HMF (Harbor Maintenance Fee)</span><strong>USD {{ d.entry.hmfUsd | number:'1.2-2' }}</strong></div>
            <div class="grand"><span>Total fees</span><strong>USD {{ d.entry.totalFeesUsd | number:'1.2-2' }}</strong></div>
          </div>
        </section>

        <section class="card">
          <h2>Entry header</h2>
          <dl class="dl">
            <dt>Filer code</dt><dd class="mono">{{ d.entry.filerCode }}</dd>
            <dt>Importer EIN</dt><dd class="mono">{{ d.entry.importerEin }}</dd>
            <dt>Carrier (SCAC)</dt><dd class="mono">{{ d.entry.carrierScac }}</dd>
            <dt>Vessel / voyage</dt><dd>{{ d.entry.vesselName }} / {{ d.entry.voyageNumber }}</dd>
            <dt>POE / POU</dt><dd class="mono">{{ d.entry.portOfEntryCode }} / {{ d.entry.portOfUnladingCode }}</dd>
            <dt>FIRMS</dt><dd class="mono">{{ d.entry.firmsCode ?? '—' }}</dd>
            <dt>B/L</dt><dd class="mono">{{ d.entry.billOfLading ?? '—' }}</dd>
            <dt>Submitted</dt><dd>{{ d.entry.submittedAt ? (d.entry.submittedAt | slice:0:16) : '—' }}</dd>
            <dt>Released</dt><dd>{{ d.entry.releasedAt ? (d.entry.releasedAt | slice:0:16) : '—' }}</dd>
          </dl>
        </section>

        @if (d.bond; as b) {
          <section class="card">
            <h2>Bond</h2>
            <dl class="dl">
              <dt>Bond #</dt><dd class="mono">{{ b.bondNumber }}</dd>
              <dt>Type</dt><dd>{{ b.bondType }}</dd>
              <dt>Surety</dt><dd>{{ b.suretyName }}</dd>
              <dt>Amount</dt><dd class="mono">USD {{ b.amountUsd | number:'1.2-2' }}</dd>
              <dt>Effective</dt><dd>{{ b.effectiveFrom | slice:0:10 }} → {{ b.effectiveTo ? (b.effectiveTo | slice:0:10) : 'open' }}</dd>
              <dt>Utilization</dt><dd>{{ b.utilizationPct }}%</dd>
            </dl>
          </section>
        }

        @if (d.pgaHolds.length > 0) {
          <section class="card card--alert">
            <h2>⛔ PGA Holds ({{ d.pgaHolds.length }})</h2>
            <ul class="hold-list">
              @for (h of d.pgaHolds; track h.id) {
                <li>
                  <strong>{{ h.pgaCode }}</strong>
                  @if (h.holdReasonCode) { <span class="muted"> · {{ h.holdReasonCode }}</span> }
                  · <span class="status status--{{ h.status.toLowerCase() }}">{{ h.status }}</span>
                  <div class="hold-text">{{ h.holdReasonText }}</div>
                  <div class="hold-meta">Raised {{ h.raisedAt | slice:0:16 }}</div>
                </li>
              }
            </ul>
          </section>
        }

        @if (d.holdExams.length > 0) {
          <section class="card card--warn">
            <h2>🔍 Customs Hold / Exam Notices ({{ d.holdExams.length }})</h2>
            <ul class="hold-list">
              @for (h of d.holdExams; track h.id) {
                <li>
                  <strong>{{ h.noticeType }}</strong>
                  @if (h.examType !== 'Nil') { <span class="muted"> · Exam: {{ h.examType }}</span> }
                  · <span class="status status--{{ h.status.toLowerCase() }}">{{ h.status }}</span>
                  <div class="hold-text">{{ h.holdReasonText }}</div>
                  @if (h.examSite) {
                    <div class="hold-meta">Exam at {{ h.examSite }}
                      @if (h.examAppointmentAt) { · {{ h.examAppointmentAt | slice:0:16 }} }
                    </div>
                  }
                </li>
              }
            </ul>
          </section>
        }

        @if (d.releaseOrders.length > 0) {
          <section class="card">
            <h2>Release Orders ({{ d.releaseOrders.length }})</h2>
            <table class="mini">
              <thead><tr><th>Type</th><th>Reference</th><th>Issued</th><th>Status</th></tr></thead>
              <tbody>
                @for (r of d.releaseOrders; track r.id) {
                  <tr>
                    <td>{{ r.orderType }}</td>
                    <td class="mono">{{ r.referenceNumber }}</td>
                    <td>{{ r.issuedAt | slice:0:10 }}</td>
                    <td><span class="status status--{{ r.status.toLowerCase() }}">{{ r.status }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }

        @if (d.abiMessages.length > 0) {
          <section class="card">
            <h2>ABI Messages ({{ d.abiMessages.length }})</h2>
            <table class="mini">
              <thead><tr><th>When</th><th>Code</th><th>Dir</th><th>Status</th><th>CBP ref</th></tr></thead>
              <tbody>
                @for (m of d.abiMessages; track m.id) {
                  <tr>
                    <td>{{ m.createdAt | slice:0:16 }}</td>
                    <td class="mono"><strong>{{ m.messageCode }}</strong></td>
                    <td><span class="dir dir--{{ m.direction.toLowerCase() }}">{{ m.direction === 'Out' ? '→' : '←' }} {{ m.direction }}</span></td>
                    <td><span class="status status--{{ m.status.toLowerCase() }}">{{ m.status }}</span></td>
                    <td class="mono small">{{ m.cbpReference ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
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
    .page-head h1 .entry-type { font-size: 15px; color: #6B5BA0; -webkit-text-fill-color: #6B5BA0;
                                background: none; -webkit-background-clip: initial; font-weight: 500; }
    .page-head p { color: #6B5BA0; margin: 0 0 8px; font-size: 14px; }
    .cbp-msg { display: flex; gap: 8px; align-items: center; padding: 8px 12px;
               background: #DCEAF8; color: #1F4E8A; border: 1px solid #BADBF6;
               border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
    .cbp-msg mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }
    @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } }
    .card { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
            box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 20px; }
    .card--alert { background: #FFF7F8; border-color: #FBE4E5; }
    .card--warn  { background: #FFFAEC; border-color: #FFE0A0; }
    .card h2 { font-size: 14px; font-weight: 700; color: #3F2D7C; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 8px 10px; background: #F5F2FB; color: #3F2D7C;
               font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 8px 10px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    table.mini thead th, table.mini tbody td { padding: 6px 8px; font-size: 12px; }
    .num  { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .small { font-size: 11px; }
    .muted { color: #9A9AA3; }
    .totals { margin-top: 12px; padding-top: 12px; border-top: 1px solid #F0EBF8; }
    .totals > div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #6B5BA0; }
    .totals > div strong { color: #1A1A33; }
    .totals .grand { padding: 8px 0; border-top: 1px solid #F0EBF8; font-size: 15px; }
    .dl { display: grid; grid-template-columns: 130px 1fr; gap: 8px 16px; margin: 0; font-size: 13px; }
    .dl dt { color: #6B5BA0; font-weight: 600; }
    .dl dd { color: #1A1A33; margin: 0; }
    .hold-list { list-style: none; padding: 0; margin: 0; }
    .hold-list li { padding: 8px 0; border-bottom: 1px solid #F0EBF8; }
    .hold-list li:last-child { border-bottom: none; }
    .hold-text { color: #1A1A33; font-size: 13px; margin: 4px 0; }
    .hold-meta { color: #9A9AA3; font-size: 11px; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft       { background: #F5F2FB; color: #6B5BA0; }
    .status--submitted   { background: #DCEAF8; color: #1F4E8A; }
    .status--accepted    { background: #DCF5E4; color: #1F7A3D; }
    .status--rejected    { background: #FBE4E5; color: #B23F45; }
    .status--released    { background: #C8EBD3; color: #1F7A3D; }
    .status--hold        { background: #FBE4E5; color: #B23F45; }
    .status--exam        { background: #FFE6CC; color: #8A4F00; }
    .status--liquidated  { background: #E8E2F4; color: #3F2D7C; }
    .status--cancelled   { background: #F5F5F5; color: #777; text-decoration: line-through; }
    .status--active      { background: #FBE4E5; color: #B23F45; }
    .status--released    { background: #C8EBD3; color: #1F7A3D; }
    .status--open        { background: #FFE6CC; color: #8A4F00; }
    .status--resolved    { background: #DCF5E4; color: #1F7A3D; }
    .status--issued      { background: #DCF5E4; color: #1F7A3D; }
    .status--ackreceived { background: #DCF5E4; color: #1F7A3D; }
    .status--sent        { background: #DCEAF8; color: #1F4E8A; }
    .status--pending     { background: #FFF3D6; color: #946100; }
    .status--failed      { background: #FBE4E5; color: #B23F45; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
             margin-left: 6px; cursor: help; }
    .badge--pga  { background: #FBE4E5; color: #B23F45; }
    .badge--exam { background: #FFE6CC; color: #8A4F00; }
    .pga-tag { padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-right: 2px; }
    .pga-tag--fda  { background: #FBE4E5; color: #B23F45; }
    .pga-tag--usda { background: #DCF5E4; color: #1F7A3D; }
    .pga-tag--epa  { background: #DCEAF8; color: #1F4E8A; }
    .pga-tag--fcc  { background: #FFE6CC; color: #8A4F00; }
    .dir { font-weight: 700; font-size: 11px; }
    .dir--out { color: #1F4E8A; }
    .dir--in  { color: #1F7A3D; }
  `],
})
export class EntryDetailComponent implements OnInit {
  private readonly api = inject(M4ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly detail = signal<EntryDetailDto | null>(null);
  readonly loading = signal(true);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try { this.detail.set(await this.api.getEntry(id)); }
    catch { this.detail.set(null); }
    finally { this.loading.set(false); }
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProcurementApiService } from '../shared/procurement-api.service';
import { PrDetailDto } from '../shared/procurement-types';

@Component({
  selector: 'ulp-procurement-pr-detail',
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
      <a routerLink=".." class="back">← Back to purchase requests</a>
      <header class="page-head">
        <h1>{{ d.pr.prNumber }}</h1>
        <p>
          {{ d.pr.department ?? '—' }} · needed by {{ d.pr.neededBy ? (d.pr.neededBy | slice:0:10) : '—' }}
          · <span class="status status--{{ d.pr.status.toLowerCase() }}">{{ d.pr.status }}</span>
        </p>
      </header>

      @if (d.pr.notes) {
        <section class="card"><h2>Notes</h2><p>{{ d.pr.notes }}</p></section>
      }

      <section class="card">
        <h2>Lines ({{ d.lines.length }})</h2>
        @if (d.lines.length === 0) { <p class="muted">No lines.</p> } @else {
          <table>
            <thead><tr>
              <th class="num">#</th><th>Description</th>
              <th class="num">Qty</th><th>UOM</th><th class="num">Est. unit</th>
            </tr></thead>
            <tbody>
              @for (l of d.lines; track l.id) {
                <tr>
                  <td class="num">{{ l.lineNo }}</td>
                  <td>{{ l.description }}</td>
                  <td class="num">{{ l.quantity ? (l.quantity | number:'1.0-2') : '—' }}</td>
                  <td>{{ l.uomCode ?? '—' }}</td>
                  <td class="num">{{ l.estimatedUnitPriceAmount ? (l.estimatedUnitPriceAmount | number:'1.2-2') : '—' }} {{ l.estimatedUnitPriceCurrency ?? '' }}</td>
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
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 8px 12px; background: #F5F2FB; color: #3F2D7C;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    tbody td { padding: 8px 12px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft     { background: #E8E2F4; color: #3F2D7C; }
    .status--submitted { background: #DCEAF8; color: #1F4E8A; }
    .status--approved  { background: #DCF5E4; color: #1F7A3D; }
    .status--rejected  { background: #FBE4E5; color: #B23F45; }
    .status--closed    { background: #E0E0E0; color: #555; }
  `],
})
export class PrDetailComponent implements OnInit {
  private readonly api = inject(ProcurementApiService);
  private readonly route = inject(ActivatedRoute);
  readonly data = signal<PrDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) { this.error.set('invalid PR id'); this.loading.set(false); return; }
    try { this.data.set(await this.api.getPr(id)); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load PR'); }
    finally { this.loading.set(false); }
  }
}

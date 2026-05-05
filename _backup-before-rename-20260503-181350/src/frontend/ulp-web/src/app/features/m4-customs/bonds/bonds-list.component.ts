import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M4ApiService } from '../shared/m4-api.service';
import { BondDto } from '../shared/m4-types';

@Component({
  selector: 'ulp-m4-bonds',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Customs Bonds</h1>
      <p>Single Transaction Bonds (per-entry) and Continuous Bonds (annual). LLD §1.2.</p>
    </header>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Bond #</th><th>Type</th><th>Importer</th><th>Surety</th><th>Amount</th><th>Effective</th><th>Status</th><th>Util</th></tr></thead>
          <tbody>
            @for (b of rows(); track b.id) {
              <tr>
                <td class="mono">{{ b.bondNumber }}</td>
                <td>{{ b.bondType }}</td>
                <td>{{ b.importerName ?? ('#' + b.importerPartyId) }}</td>
                <td>{{ b.suretyName }} <span class="muted">({{ b.suretyCode }})</span></td>
                <td class="num"><strong>USD {{ b.amountUsd | number:'1.2-2' }}</strong></td>
                <td>{{ b.effectiveFrom | slice:0:10 }} → {{ b.effectiveTo ? (b.effectiveTo | slice:0:10) : 'open' }}</td>
                <td><span class="status status--{{ b.status.toLowerCase() }}">{{ b.status }}</span></td>
                <td class="num">{{ b.utilizationPct }}%</td>
              </tr>
            } @empty { <tr><td colspan="8" class="empty">No bonds.</td></tr> }
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
    .loading { padding: 24px; text-align: center; color: #6B5BA0; }
    .table-wrap { background: #FFF; border: 1px solid #E8E2F4; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; font-size: 13px; color: #1A1A33; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .muted { color: #9A9AA3; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--active    { background: #DCF5E4; color: #1F7A3D; }
    .status--expired   { background: #F5F5F5; color: #777; }
    .status--cancelled { background: #FBE4E5; color: #B23F45; }
  `],
})
export class BondsListComponent implements OnInit {
  private readonly api = inject(M4ApiService);
  readonly rows = signal<BondDto[]>([]);
  readonly loading = signal(true);
  async ngOnInit() {
    try { this.rows.set(await this.api.listBonds()); }
    finally { this.loading.set(false); }
  }
}

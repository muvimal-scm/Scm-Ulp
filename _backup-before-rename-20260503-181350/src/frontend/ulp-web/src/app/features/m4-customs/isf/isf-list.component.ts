import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M4ApiService } from '../shared/m4-api.service';
import { IsfDto } from '../shared/m4-types';

@Component({
  selector: 'ulp-m4-isf',
  standalone: true,
  imports: [SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Importer Security Filing (10+2)</h1>
      <p>Per LLD §9 — 10 importer-supplied data elements + 2 carrier elements, must be
         on file 24 hours before vessel loaded at foreign port. Late filing = $5,000 penalty.</p>
    </header>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Importer</th><th>Importer #</th><th>Seller</th><th>Buyer</th><th>COO</th><th>HTS-6</th><th>Filed</th><th>Cutoff</th><th>Status</th></tr></thead>
          <tbody>
            @for (i of rows(); track i.id) {
              <tr>
                <td>{{ i.importerName ?? ('#' + i.importerOfRecordId) }}</td>
                <td class="mono">{{ i.importerNumber }}</td>
                <td>{{ i.sellerName ?? '—' }}</td>
                <td>{{ i.buyerName ?? '—' }}</td>
                <td class="mono">{{ i.countryOfOrigin ?? '—' }}</td>
                <td class="mono">{{ i.hts6 ?? '—' }}</td>
                <td>{{ i.filedAt ? (i.filedAt | slice:0:16) : '—' }}</td>
                <td>{{ i.vesselLoadCutoff ? (i.vesselLoadCutoff | slice:0:16) : '—' }}</td>
                <td><span class="status status--{{ i.filingStatus.toLowerCase() }}">{{ i.filingStatus }}</span></td>
              </tr>
            } @empty { <tr><td colspan="9" class="empty">No ISF on file.</td></tr> }
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
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft     { background: #F5F2FB; color: #6B5BA0; }
    .status--filed     { background: #DCEAF8; color: #1F4E8A; }
    .status--match     { background: #DCF5E4; color: #1F7A3D; }
    .status--nomatch   { background: #FFE6CC; color: #8A4F00; }
    .status--late      { background: #FBE4E5; color: #B23F45; }
    .status--amended   { background: #E8E2F4; color: #3F2D7C; }
    .status--cancelled { background: #F5F5F5; color: #777; text-decoration: line-through; }
  `],
})
export class IsfListComponent implements OnInit {
  private readonly api = inject(M4ApiService);
  readonly rows = signal<IsfDto[]>([]);
  readonly loading = signal(true);
  async ngOnInit() {
    try { this.rows.set(await this.api.listIsf()); }
    finally { this.loading.set(false); }
  }
}

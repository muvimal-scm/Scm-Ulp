import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProcurementApiService } from '../shared/procurement-api.service';
import { GrnDto } from '../shared/procurement-types';

@Component({
  selector: 'ulp-procurement-grns',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class=”page-head”>
      <div class=”head-row”>
        <div>
          <h1>Goods receipts</h1>
          <p>Receipt notes against POs — condition tracking and damage records.</p>
        </div>
        <a mat-flat-button color=”primary” routerLink=”new” class=”new-btn”>
          <mat-icon>add</mat-icon>&nbsp;New GRN
        </a>
      </div>
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
              <th>GRN #</th><th>PO</th><th>Received</th>
              <th class="num">Lines</th><th>Status</th><th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            @for (g of rows(); track g.id) {
              <tr>
                <td><code>{{ g.grnNumber }}</code></td>
                <td>PO #{{ g.poId }}</td>
                <td>{{ g.receivedAt | slice:0:16 }}</td>
                <td class="num">{{ g.lineCount }}</td>
                <td><span class="status status--{{ g.status.toLowerCase() }}">{{ g.status }}</span></td>
                <td>{{ g.remarks ?? 'â€”' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">No goods receipts yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .new-btn { white-space: nowrap; }
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
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft    { background: #E8E2F4; color: #3F2D7C; }
    .status--posted   { background: #DCF5E4; color: #1F7A3D; }
    .status--reversed { background: #FBE4E5; color: #B23F45; }
  `],
})
export class GrnsListComponent implements OnInit {
  private readonly api = inject(ProcurementApiService);
  readonly rows = signal<GrnDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listGrns()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load GRNs'); }
    finally { this.loading.set(false); }
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M5ApiService } from '../shared/m5-api.service';
import { DemurrageEventDto } from '../shared/m5-types';

@Component({
  selector: 'ulp-m5-demurrage',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Demurrage / Detention</h1>
      <p>Per-container demurrage, detention, and per-diem accrual log.</p>
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
              <th>Container</th><th>Type</th><th>Start</th><th>End</th>
              <th class="num">Days</th><th class="num">Rate</th><th class="num">Total</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (d of rows(); track d.id) {
              <tr>
                <td>container #{{ d.containerId }}</td>
                <td>{{ d.eventType }}</td>
                <td>{{ d.startDate | slice:0:10 }}</td>
                <td>{{ d.endDate ? (d.endDate | slice:0:10) : 'open' }}</td>
                <td class="num">{{ d.days ?? '—' }}</td>
                <td class="num">{{ d.rateAmount ? (d.rateAmount | number:'1.2-2') : '—' }} {{ d.rateCurrency ?? '' }}</td>
                <td class="num">{{ d.totalAmount ? (d.totalAmount | number:'1.2-2') : '—' }} {{ d.totalCurrency ?? '' }}</td>
                <td><span class="status status--{{ d.status.toLowerCase() }}">{{ d.status }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty">No demurrage events.</td></tr>
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
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--accruing { background: #FFF3D6; color: #946100; }
    .status--settled  { background: #DCF5E4; color: #1F7A3D; }
    .status--disputed { background: #FBE4E5; color: #B23F45; }
  `],
})
export class DemurrageListComponent implements OnInit {
  private readonly api = inject(M5ApiService);
  readonly rows = signal<DemurrageEventDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listDemurrage()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load demurrage events'); }
    finally { this.loading.set(false); }
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LastMileApiService } from '../shared/last-mile-api.service';
import { ZoneRateDto } from '../shared/last-mile-types';

@Component({
  selector: 'ulp-last-mile-zones',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Zone rates</h1>
      <p>Per-country zone × weight slab × courier type rate cards.</p>
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
              <th>Country</th><th>Zone</th><th>Type</th>
              <th class="num">From (kg)</th><th class="num">To (kg)</th>
              <th class="num">Rate</th><th>Valid</th>
            </tr>
          </thead>
          <tbody>
            @for (z of rows(); track z.id) {
              <tr>
                <td>{{ z.countryCode }}</td>
                <td><code>{{ z.zoneCode }}</code></td>
                <td>{{ z.courierType }}</td>
                <td class="num">{{ z.weightSlabFromKg | number:'1.0-3' }}</td>
                <td class="num">{{ z.weightSlabToKg | number:'1.0-3' }}</td>
                <td class="num">{{ z.rateAmount | number:'1.2-2' }} {{ z.rateCurrency }}</td>
                <td>{{ z.validFrom | slice:0:10 }} → {{ z.validTo ? (z.validTo | slice:0:10) : 'open' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty">No zone rates configured.</td></tr>
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
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
  `],
})
export class ZonesListComponent implements OnInit {
  private readonly api = inject(LastMileApiService);
  readonly rows = signal<ZoneRateDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listZoneRates()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load zone rates'); }
    finally { this.loading.set(false); }
  }
}

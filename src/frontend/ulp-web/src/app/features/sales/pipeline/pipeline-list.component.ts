import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesApiService } from '../shared/sales-api.service';
import { PipelineStageDto } from '../shared/sales-types';

@Component({
  selector: 'ulp-sales-pipeline',
  standalone: true,
  imports: [DecimalPipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Pipeline stages</h1>
      <p>Tenant-defined opportunity stages with default probabilities.</p>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th class="num">Seq</th><th>Code</th><th>Name</th><th class="num">Default %</th></tr>
          </thead>
          <tbody>
            @for (s of rows(); track s.id) {
              <tr>
                <td class="num">{{ s.sequence }}</td>
                <td><code>{{ s.code }}</code></td>
                <td>{{ s.name }}</td>
                <td class="num">{{ s.defaultProbabilityPct !== null ? (s.defaultProbabilityPct | number:'1.0-1') + '%' : 'â€”' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="empty">No pipeline stages defined.</td></tr>
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
export class PipelineListComponent implements OnInit {
  private readonly api = inject(SalesApiService);
  readonly rows = signal<PipelineStageDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listPipelineStages()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load pipeline stages'); }
    finally { this.loading.set(false); }
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountingExtApiService } from '../shared/accounting-ext-api.service';
import { ComparativeProfitDto } from '../shared/accounting-ext-types';

@Component({
  selector: 'ulp-accounting-comparative-profit',
  standalone: true,
  imports: [DecimalPipe, FormsModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Comparative Profit by Year</h1>
      <p>12-month revenue / expense / profit breakdown with prior-year comparison.
         Closes the SCM client M3 "Comparative Profit Report by Year" item.</p>
    </header>

    <div class="filter-bar">
      <label>Fiscal year:
        <select [ngModel]="year()" (ngModelChange)="onYearChange($event)">
          @for (y of years; track y) { <option [value]="y">{{ y }}</option> }
        </select>
      </label>
    </div>

    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @if (!loading() && data(); as r) {
      <div class="summary">
        <div class="kpi"><span>Revenue</span><strong class="pos">{{ r.totalRevenue | number:'1.2-2' }}</strong></div>
        <div class="kpi"><span>Expenses</span><strong class="neg">{{ r.totalExpenses | number:'1.2-2' }}</strong></div>
        <div class="kpi"><span>Profit</span><strong [class.pos]="r.totalProfit >= 0" [class.neg]="r.totalProfit < 0">{{ r.totalProfit | number:'1.2-2' }}</strong></div>
        @if (r.priorYearProfit !== null) {
          <div class="kpi kpi--prior">
            <span>Prior year profit</span>
            <strong>{{ r.priorYearProfit | number:'1.2-2' }}</strong>
            <span class="yoy" [class.pos]="(r.totalProfit - (r.priorYearProfit ?? 0)) >= 0" [class.neg]="(r.totalProfit - (r.priorYearProfit ?? 0)) < 0">
              YoY {{ ((r.totalProfit - (r.priorYearProfit ?? 0)) / (r.priorYearProfit ?? 1) * 100) | number:'1.1-1' }}%
            </span>
          </div>
        }
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Month</th>
            @for (m of months; track m) { <th class="num">{{ m }}</th> }
            <th class="num"><strong>Total</strong></th>
          </tr></thead>
          <tbody>
            <tr><td><strong>Revenue</strong></td>
              @for (v of r.revenuePerMonth; track $index) { <td class="num pos">{{ v | number:'1.0-2' }}</td> }
              <td class="num"><strong>{{ r.totalRevenue | number:'1.2-2' }}</strong></td>
            </tr>
            <tr><td><strong>Expenses</strong></td>
              @for (v of r.expensePerMonth; track $index) { <td class="num neg">{{ v | number:'1.0-2' }}</td> }
              <td class="num"><strong>{{ r.totalExpenses | number:'1.2-2' }}</strong></td>
            </tr>
            <tr class="profit-row"><td><strong>Profit</strong></td>
              @for (v of r.profitPerMonth; track $index) {
                <td class="num" [class.pos]="v >= 0" [class.neg]="v < 0"><strong>{{ v | number:'1.0-2' }}</strong></td>
              }
              <td class="num"><strong [class.pos]="r.totalProfit >= 0" [class.neg]="r.totalProfit < 0">{{ r.totalProfit | number:'1.2-2' }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bars">
        <h2>Profit per month visualization</h2>
        <div class="bar-grid">
          @for (v of r.profitPerMonth; track $index) {
            <div class="bar-col">
              <div class="bar" [style.height.%]="barHeight(v)" [class.bar--pos]="v >= 0" [class.bar--neg]="v < 0"></div>
              <span class="bar-label">{{ months[$index] }}</span>
              <span class="bar-val">{{ v | number:'1.0-0' }}</span>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 16px; max-width: 720px; }
    .filter-bar { padding: 12px 0; }
    .filter-bar label { font-size: 13px; color: #6B5BA0; font-weight: 600; }
    .filter-bar select { margin-left: 8px; padding: 6px 10px; border-radius: 6px; border: 1px solid #C9BEEC; font-size: 13px; font-family: inherit; }
    .loading { padding: 24px; text-align: center; color: #6B5BA0; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .kpi { background: #FFF; border: 1px solid #E8E2F4; border-radius: 12px; padding: 16px; }
    .kpi span { display: block; font-size: 11px; text-transform: uppercase; color: #6B5BA0; font-weight: 600; letter-spacing: 0.5px; }
    .kpi strong { display: block; font-size: 22px; margin-top: 4px; font-variant-numeric: tabular-nums; }
    .kpi--prior { background: #FBFAFE; }
    .yoy { font-size: 11px; padding: 1px 6px; border-radius: 4px; margin-top: 6px; display: inline-block; }
    .pos { color: #1F7A3D; }
    .pos.yoy { background: #DCF5E4; }
    .neg { color: #B23F45; }
    .neg.yoy { background: #FBE4E5; }
    .table-wrap { background: #FFF; border: 1px solid #E8E2F4; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 10px 12px; background: #F5F2FB; color: #3F2D7C; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #F0EBF8; font-size: 12px; color: #1A1A33; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .profit-row { background: #F5F2FB; }
    .bars { margin-top: 24px; }
    .bars h2 { font-size: 14px; font-weight: 700; color: #3F2D7C; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; }
    .bar-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 8px; height: 200px; align-items: end;
                background: #FFF; border: 1px solid #E8E2F4; border-radius: 12px; padding: 16px; }
    .bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
    .bar { width: 70%; min-height: 2px; border-radius: 4px 4px 0 0; }
    .bar--pos { background: linear-gradient(to top, #1F7A3D, #4FB87F); }
    .bar--neg { background: linear-gradient(to top, #B23F45, #E54A8A); }
    .bar-label { font-size: 10px; color: #6B5BA0; font-weight: 600; }
    .bar-val { font-size: 10px; color: #1A1A33; font-variant-numeric: tabular-nums; }
  `],
})
export class ComparativeProfitComponent implements OnInit {
  private readonly api = inject(AccountingExtApiService);

  readonly months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  readonly years = [2024, 2025, 2026, 2027];
  readonly year = signal(2026);
  readonly data = signal<ComparativeProfitDto | null>(null);
  readonly loading = signal(true);

  async ngOnInit() { await this.load(); }

  async onYearChange(y: number) { this.year.set(Number(y)); await this.load(); }

  async load() {
    this.loading.set(true);
    try { this.data.set(await this.api.comparativeProfit(this.year())); }
    finally { this.loading.set(false); }
  }

  barHeight(v: number): number {
    const r = this.data();
    if (!r) return 0;
    const maxAbs = Math.max(...r.profitPerMonth.map(x => Math.abs(x)), 1);
    return Math.min(100, Math.abs(v) / maxAbs * 95);
  }
}

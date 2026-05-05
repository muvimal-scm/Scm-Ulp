import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountingApiService } from '../shared/accounting-api.service';
import {
  AgingBucketDto, BalanceSheetDto, IncomeStatementDto, PeriodDto, TrialBalanceDto,
} from '../shared/accounting-types';

type ReportTab = 'trialBalance' | 'incomeStatement' | 'balanceSheet' | 'arAging' | 'apAging';

@Component({
  selector: 'ulp-accounting-reports',
  standalone: true,
  imports: [DecimalPipe, NgTemplateOutlet, FormsModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Financial Reports</h1>
      <p>Trial Balance · Income Statement · Balance Sheet · AR/AP Aging. Per LLD §11 §5.4 §6.</p>
    </header>

    <nav class="tabs">
      <button class="tab" [class.tab--active]="tab() === 'trialBalance'"     (click)="switch('trialBalance')">Trial Balance</button>
      <button class="tab" [class.tab--active]="tab() === 'incomeStatement'"  (click)="switch('incomeStatement')">P&amp;L</button>
      <button class="tab" [class.tab--active]="tab() === 'balanceSheet'"     (click)="switch('balanceSheet')">Balance Sheet</button>
      <button class="tab" [class.tab--active]="tab() === 'arAging'"          (click)="switch('arAging')">AR Aging</button>
      <button class="tab" [class.tab--active]="tab() === 'apAging'"          (click)="switch('apAging')">AP Aging</button>
    </nav>

    @if (tab() === 'trialBalance' || tab() === 'incomeStatement' || tab() === 'balanceSheet') {
      <div class="filter-bar">
        <label>Period:
          <select [ngModel]="selectedPeriodId()" (ngModelChange)="onPeriodChange($event)">
            @for (p of periods(); track p.id) {
              <option [value]="p.id">{{ p.periodName }} · {{ p.status }}</option>
            }
          </select>
        </label>
      </div>
    }

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      @switch (tab()) {
        @case ('trialBalance')    { <ng-container *ngTemplateOutlet="tbTpl"></ng-container> }
        @case ('incomeStatement') { <ng-container *ngTemplateOutlet="isTpl"></ng-container> }
        @case ('balanceSheet')    { <ng-container *ngTemplateOutlet="bsTpl"></ng-container> }
        @case ('arAging')         { <ng-container *ngTemplateOutlet="agingTpl; context: { $implicit: arRows(), title: 'AR Aging (Customers)' }"></ng-container> }
        @case ('apAging')         { <ng-container *ngTemplateOutlet="agingTpl; context: { $implicit: apRows(), title: 'AP Aging (Vendors)' }"></ng-container> }
      }
    }

    <ng-template #tbTpl>
      @if (tb(); as r) {
        <div class="report-head"><strong>{{ r.periodName }}</strong> · {{ r.startDate.substring(0,10) }} → {{ r.endDate.substring(0,10) }} · {{ r.funcCurrency }}</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Account</th><th>Class</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
            <tbody>
              @for (row of r.rows; track row.accountId) {
                <tr>
                  <td class="mono">{{ row.accountCode }}</td>
                  <td>{{ row.accountName }}</td>
                  <td>{{ row.accountClass }}</td>
                  <td class="num">{{ row.debit | number:'1.2-2' }}</td>
                  <td class="num">{{ row.credit | number:'1.2-2' }}</td>
                  <td class="num"><strong>{{ row.balance | number:'1.2-2' }}</strong></td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">No posted journals in this period.</td></tr>
              }
            </tbody>
            <tfoot>
              <tr><td colspan="3"><strong>Totals</strong></td>
                <td class="num"><strong>{{ r.totalDebits | number:'1.2-2' }}</strong></td>
                <td class="num"><strong>{{ r.totalCredits | number:'1.2-2' }}</strong></td><td></td></tr>
            </tfoot>
          </table>
        </div>
      }
    </ng-template>

    <ng-template #isTpl>
      @if (is_(); as r) {
        <div class="report-head">{{ r.funcCurrency }} · Net income = <strong>{{ r.netIncome | number:'1.2-2' }}</strong></div>
        <div class="grid">
          <section class="card">
            <h2>Revenue · {{ r.totalRevenue | number:'1.2-2' }}</h2>
            <table>
              <tbody>
                @for (row of r.revenue; track row.accountCode) {
                  <tr><td class="mono">{{ row.accountCode }}</td><td>{{ row.accountName }}</td><td class="num">{{ row.amount | number:'1.2-2' }}</td></tr>
                } @empty { <tr><td colspan="3" class="empty">No revenue posted</td></tr> }
              </tbody>
            </table>
          </section>
          <section class="card">
            <h2>Expenses · {{ r.totalExpenses | number:'1.2-2' }}</h2>
            <table>
              <tbody>
                @for (row of r.expenses; track row.accountCode) {
                  <tr><td class="mono">{{ row.accountCode }}</td><td>{{ row.accountName }}</td><td class="num">{{ row.amount | number:'1.2-2' }}</td></tr>
                } @empty { <tr><td colspan="3" class="empty">No expenses posted</td></tr> }
              </tbody>
            </table>
          </section>
        </div>
      }
    </ng-template>

    <ng-template #bsTpl>
      @if (bs(); as r) {
        <div class="report-head">{{ r.funcCurrency }} · Assets {{ r.totalAssets | number:'1.2-2' }} = Liabilities {{ r.totalLiabilities | number:'1.2-2' }} + Equity {{ r.totalEquity | number:'1.2-2' }}</div>
        <div class="grid grid--3">
          <section class="card">
            <h2>Assets · {{ r.totalAssets | number:'1.2-2' }}</h2>
            <table><tbody>
              @for (row of r.assets; track row.accountCode) {
                <tr><td class="mono">{{ row.accountCode }}</td><td>{{ row.accountName }}</td><td class="num">{{ row.amount | number:'1.2-2' }}</td></tr>
              } @empty { <tr><td colspan="3" class="empty">No data</td></tr> }
            </tbody></table>
          </section>
          <section class="card">
            <h2>Liabilities · {{ r.totalLiabilities | number:'1.2-2' }}</h2>
            <table><tbody>
              @for (row of r.liabilities; track row.accountCode) {
                <tr><td class="mono">{{ row.accountCode }}</td><td>{{ row.accountName }}</td><td class="num">{{ row.amount | number:'1.2-2' }}</td></tr>
              } @empty { <tr><td colspan="3" class="empty">No data</td></tr> }
            </tbody></table>
          </section>
          <section class="card">
            <h2>Equity · {{ r.totalEquity | number:'1.2-2' }}</h2>
            <table><tbody>
              @for (row of r.equity; track row.accountCode) {
                <tr><td class="mono">{{ row.accountCode }}</td><td>{{ row.accountName }}</td><td class="num">{{ row.amount | number:'1.2-2' }}</td></tr>
              } @empty { <tr><td colspan="3" class="empty">No data</td></tr> }
            </tbody></table>
          </section>
        </div>
      }
    </ng-template>

    <ng-template #agingTpl let-rows let-title="title">
      <div class="report-head"><strong>{{ title }}</strong> as of today</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Party</th><th>Cur</th><th>Current</th><th>1-30</th><th>31-60</th><th>61-90</th><th>&gt;90</th><th>Total</th></tr></thead>
          <tbody>
            @for (a of rows; track a.partyId) {
              <tr>
                <td>{{ a.partyName }}</td>
                <td class="mono">{{ a.currency }}</td>
                <td class="num">{{ a.current | number:'1.2-2' }}</td>
                <td class="num">{{ a.bucket1To30 | number:'1.2-2' }}</td>
                <td class="num">{{ a.bucket31To60 | number:'1.2-2' }}</td>
                <td class="num">{{ a.bucket61To90 | number:'1.2-2' }}</td>
                <td class="num bucket-over90">{{ a.bucketOver90 | number:'1.2-2' }}</td>
                <td class="num"><strong>{{ a.total | number:'1.2-2' }}</strong></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty">Nothing aging.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 16px; }
    .tabs { display: flex; gap: 6px; border-bottom: 1px solid #E8E2F4; margin-bottom: 12px; padding: 0 4px; }
    .tab { background: transparent; border: none; cursor: pointer; padding: 10px 14px; font-size: 13px;
           font-weight: 600; color: #6B5BA0; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit; }
    .tab:hover { color: #3F2D7C; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }
    .filter-bar { padding: 12px 0; }
    .filter-bar label { font-size: 13px; color: #6B5BA0; font-weight: 600; }
    .filter-bar select { margin-left: 8px; padding: 6px 10px; border-radius: 6px; border: 1px solid #C9BEEC;
                         font-size: 13px; font-family: inherit; }
    .report-head { font-size: 13px; color: #6B5BA0; margin-bottom: 8px; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid--3 { grid-template-columns: 1fr 1fr 1fr; }
    @media (max-width: 900px) { .grid, .grid--3 { grid-template-columns: 1fr; } }
    .card, .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
                          box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 0; overflow: hidden; }
    .card { padding: 20px; }
    .card h2 { font-size: 13px; font-weight: 700; color: #3F2D7C; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C;
               font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 8px 14px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tfoot td { padding: 10px 14px; background: #F5F2FB; font-size: 13px; }
    .num  { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .empty { text-align: center; color: #9A9AA3; padding: 24px !important; }
    .bucket-over90 { color: #B23F45; font-weight: 600; }
  `],
})
export class ReportsComponent implements OnInit {
  private readonly api = inject(AccountingApiService);

  readonly tab        = signal<ReportTab>('trialBalance');
  readonly periods    = signal<PeriodDto[]>([]);
  readonly selectedPeriodId = signal<number>(0);
  readonly loading    = signal(false);
  readonly error      = signal<string | null>(null);

  readonly tb     = signal<TrialBalanceDto    | null>(null);
  readonly is_    = signal<IncomeStatementDto | null>(null);
  readonly bs     = signal<BalanceSheetDto    | null>(null);
  readonly arRows = signal<AgingBucketDto[]>([]);
  readonly apRows = signal<AgingBucketDto[]>([]);

  async ngOnInit() {
    const ps = await this.api.listPeriods();
    this.periods.set(ps);
    const open = ps.find(p => p.status === 'Open') ?? ps[0];
    if (open) {
      this.selectedPeriodId.set(open.id);
      await this.loadTb();
    }
  }

  async switch(t: ReportTab) {
    this.tab.set(t);
    this.error.set(null);
    if      (t === 'trialBalance')    await this.loadTb();
    else if (t === 'incomeStatement') await this.loadIs();
    else if (t === 'balanceSheet')    await this.loadBs();
    else if (t === 'arAging')         await this.loadAr();
    else if (t === 'apAging')         await this.loadAp();
  }

  async onPeriodChange(id: number) {
    this.selectedPeriodId.set(Number(id));
    await this.switch(this.tab());
  }

  private async loadTb() {
    if (!this.selectedPeriodId()) return;
    this.loading.set(true);
    try { this.tb.set(await this.api.trialBalance(this.selectedPeriodId())); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed'); }
    finally { this.loading.set(false); }
  }
  private async loadIs() {
    if (!this.selectedPeriodId()) return;
    this.loading.set(true);
    try { this.is_.set(await this.api.incomeStatement(this.selectedPeriodId(), this.selectedPeriodId())); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed'); }
    finally { this.loading.set(false); }
  }
  private async loadBs() {
    if (!this.selectedPeriodId()) return;
    this.loading.set(true);
    try { this.bs.set(await this.api.balanceSheet(this.selectedPeriodId())); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed'); }
    finally { this.loading.set(false); }
  }
  private async loadAr() {
    this.loading.set(true);
    try { this.arRows.set(await this.api.arAging()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed'); }
    finally { this.loading.set(false); }
  }
  private async loadAp() {
    this.loading.set(true);
    try { this.apRows.set(await this.api.apAging()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed'); }
    finally { this.loading.set(false); }
  }
}

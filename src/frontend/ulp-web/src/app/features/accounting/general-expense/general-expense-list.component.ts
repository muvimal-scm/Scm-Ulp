import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountingExtApiService } from '../shared/accounting-ext-api.service';
import { GeneralExpenseDto, GeneralExpenseKind } from '../shared/accounting-ext-types';

@Component({
  selector: 'ulp-accounting-general-expense',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>General Expense</h1>
          <p>One-time + fixed recurring (rent, utilities, professional fees).
             Closes the SCM client M3 "General Expense" + "Fixed General Expense" items.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new" class="new-btn">
          <mat-icon>add</mat-icon>&nbsp;New expense
        </a>
      </div>
    </header>

    <nav class="tabs">
      <button class="tab" [class.tab--active]="filter() === null"           (click)="setFilter(null)">All</button>
      <button class="tab" [class.tab--active]="filter() === 'General'"      (click)="setFilter('General')">One-time</button>
      <button class="tab" [class.tab--active]="filter() === 'FixedGeneral'" (click)="setFilter('FixedGeneral')">Fixed (recurring)</button>
    </nav>

    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Expense #</th><th>Date</th><th>Kind</th><th>Description</th><th>Account</th><th>Amount</th><th>Recurrence</th><th>Next due</th><th>Active</th></tr></thead>
          <tbody>
            @for (e of rows(); track e.id) {
              <tr>
                <td class="mono">{{ e.expenseNumber }}</td>
                <td>{{ e.expenseDate | slice:0:10 }}</td>
                <td><span class="kind kind--{{ e.expenseKind.toLowerCase() }}">{{ e.expenseKind === 'FixedGeneral' ? 'Fixed' : 'One-time' }}</span></td>
                <td>{{ e.description }}</td>
                <td class="mono">{{ e.accountCode ?? 'â€”' }}</td>
                <td class="num"><strong>{{ e.amount | number:'1.2-2' }} {{ e.currency }}</strong></td>
                <td><span class="recur">{{ e.recurrence }}</span></td>
                <td>{{ e.nextRecurDate ? (e.nextRecurDate | slice:0:10) : 'â€”' }}</td>
                <td>{{ e.isActive ? 'âœ“' : 'â€”' }}</td>
              </tr>
            } @empty { <tr><td colspan="9" class="empty">No general expenses.</td></tr> }
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
    .page-head p { color: #6B5BA0; margin: 0 0 16px; max-width: 720px; }
    .tabs { display: flex; gap: 6px; border-bottom: 1px solid #E8E2F4; margin-bottom: 12px; padding: 0 4px; }
    .tab { background: transparent; border: none; cursor: pointer; padding: 10px 14px; font-size: 13px;
           font-weight: 600; color: #6B5BA0; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit; }
    .tab:hover { color: #3F2D7C; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }
    .loading { padding: 24px; text-align: center; color: #6B5BA0; }
    .table-wrap { background: #FFF; border: 1px solid #E8E2F4; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; font-size: 13px; color: #1A1A33; }
    .num  { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .kind { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .kind--general      { background: #DCEAF8; color: #1F4E8A; }
    .kind--fixedgeneral { background: #E8E2F4; color: #3F2D7C; }
    .recur { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
             background: #F5F2FB; color: #6B5BA0; }
  `],
})
export class GeneralExpenseListComponent implements OnInit {
  private readonly api = inject(AccountingExtApiService);
  readonly rows = signal<GeneralExpenseDto[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<GeneralExpenseKind | null>(null);

  async ngOnInit() { await this.reload(); }
  async setFilter(k: GeneralExpenseKind | null) { this.filter.set(k); await this.reload(); }

  private async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listGeneralExpenses(this.filter() ?? undefined)); }
    finally { this.loading.set(false); }
  }
}

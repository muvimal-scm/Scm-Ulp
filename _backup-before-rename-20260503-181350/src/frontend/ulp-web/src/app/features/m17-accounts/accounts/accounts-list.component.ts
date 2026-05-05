import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M17ApiService } from '../shared/m17-api.service';
import { AccountClass, AccountDto } from '../shared/m17-types';

@Component({
  selector: 'ulp-m17-accounts',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Chart of Accounts</h1>
      <p>5-class hierarchy (Asset · Liability · Equity · Revenue · Expense). Per-tenant + multi-currency.</p>
    </header>

    <nav class="tabs">
      @for (c of classes; track c.value) {
        <button class="tab" [class.tab--active]="filter() === c.value" (click)="filter.set(c.value)">
          {{ c.label }} @if (countByClass()[c.value] > 0) { <span class="tab__count">{{ countByClass()[c.value] }}</span> }
        </button>
      }
    </nav>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Class</th><th>Currency</th><th>Postable</th><th>Active</th></tr></thead>
          <tbody>
            @for (a of filtered(); track a.id) {
              <tr>
                <td class="mono">{{ a.accountCode }}</td>
                <td>
                  @if (a.parentAccountId) { <span class="indent">└</span> }
                  {{ a.accountName }}
                </td>
                <td><span class="badge badge--{{ a.accountClass.toLowerCase() }}">{{ a.accountClass }}</span></td>
                <td class="mono">{{ a.defaultCurrency }}</td>
                <td>{{ a.isPostable ? '✓' : '—' }}</td>
                <td>{{ a.isActive ? '✓' : '—' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">No accounts in this class.</td></tr>
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
    .page-head p { color: #6B5BA0; margin: 0 0 16px; }
    .tabs { display: flex; gap: 6px; border-bottom: 1px solid #E8E2F4; margin-bottom: 12px; padding: 0 4px; }
    .tab { background: transparent; border: none; cursor: pointer; padding: 10px 14px; font-size: 13px;
           font-weight: 600; color: #6B5BA0; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit; }
    .tab:hover { color: #3F2D7C; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }
    .tab__count { display: inline-block; margin-left: 6px; background: #E8E2F4; color: #3F2D7C;
                  font-size: 11px; padding: 1px 8px; border-radius: 999px; font-weight: 700; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
                  box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C;
               font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .indent { color: #9A9AA3; margin-right: 4px; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .badge--asset    { background: #DCEAF8; color: #1F4E8A; }
    .badge--liability{ background: #FBE4E5; color: #B23F45; }
    .badge--equity   { background: #E8E2F4; color: #3F2D7C; }
    .badge--revenue  { background: #DCF5E4; color: #1F7A3D; }
    .badge--expense  { background: #FFE6CC; color: #8A4F00; }
  `],
})
export class AccountsListComponent implements OnInit {
  private readonly api = inject(M17ApiService);
  readonly accounts = signal<AccountDto[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);
  readonly filter   = signal<AccountClass>('Asset');

  readonly classes: { value: AccountClass; label: string }[] = [
    { value: 'Asset',     label: 'Assets' },
    { value: 'Liability', label: 'Liabilities' },
    { value: 'Equity',    label: 'Equity' },
    { value: 'Revenue',   label: 'Revenue' },
    { value: 'Expense',   label: 'Expenses' },
  ];

  readonly countByClass = computed(() => {
    const m: Record<string, number> = {};
    for (const a of this.accounts()) m[a.accountClass] = (m[a.accountClass] ?? 0) + 1;
    return m;
  });

  readonly filtered = computed(() => this.accounts().filter(a => a.accountClass === this.filter()));

  async ngOnInit() {
    this.loading.set(true);
    try { this.accounts.set(await this.api.listAccounts({ pageSize: 500 })); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load accounts'); }
    finally { this.loading.set(false); }
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountingApiService } from '../shared/accounting-api.service';
import { BillDto, BillStatus } from '../shared/accounting-types';

@Component({
  selector: 'ulp-accounting-bills',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>AP · Vendor Bills</h1>
          <p>Sealed LLD §6 state machine: Draft → PendingApproval → Approved → Posted → Paid. TDS deducted at payment time per LLD §6.3.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new" class="new-btn">
          <mat-icon>add</mat-icon>&nbsp;New bill
        </a>
      </div>
    </header>

    <nav class="tabs">
      <button class="tab" [class.tab--active]="filter() === null" (click)="filter.set(null)">All</button>
      @for (s of statuses; track s) {
        <button class="tab" [class.tab--active]="filter() === s" (click)="filter.set(s)">{{ s }}</button>
      }
    </nav>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Internal #</th><th>Vendor ref</th><th>Date</th><th>Due</th><th>Vendor</th><th>Cur</th><th>Subtotal</th><th>Tax</th><th>TDS</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            @for (b of filtered(); track b.id) {
              <tr>
                <td><a [routerLink]="[b.id]" class="link">{{ b.internalNumber }}</a></td>
                <td class="mono">{{ b.billNumber }}</td>
                <td>{{ b.billDate | slice:0:10 }}</td>
                <td>{{ b.dueDate | slice:0:10 }}</td>
                <td>{{ b.vendorName ?? ('#' + b.vendorPartyId) }}</td>
                <td class="mono">{{ b.currency }}</td>
                <td class="num">{{ b.subtotalAmount | number:'1.2-2' }}</td>
                <td class="num">{{ b.taxAmount | number:'1.2-2' }}</td>
                <td class="num">{{ b.withholdingAmount | number:'1.2-2' }}</td>
                <td class="num"><strong>{{ b.totalAmount | number:'1.2-2' }}</strong></td>
                <td><span class="status status--{{ b.status.toLowerCase() }}">{{ b.status }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="11" class="empty">No bills match this filter.</td></tr>
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
    .page-head p { color: #6B5BA0; margin: 0 0 16px; }
    .tabs { display: flex; gap: 6px; border-bottom: 1px solid #E8E2F4; margin-bottom: 12px; padding: 0 4px; flex-wrap: wrap; }
    .tab { background: transparent; border: none; cursor: pointer; padding: 8px 12px; font-size: 12px;
           font-weight: 600; color: #6B5BA0; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit; }
    .tab:hover { color: #3F2D7C; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
                  box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C;
               font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    .num  { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft           { background: #F5F2FB; color: #6B5BA0; }
    .status--pendingapproval { background: #FFF3D6; color: #946100; }
    .status--approved        { background: #DCEAF8; color: #1F4E8A; }
    .status--posted          { background: #DCF5E4; color: #1F7A3D; }
    .status--partiallypaid   { background: #FFE6CC; color: #8A4F00; }
    .status--paid            { background: #C8EBD3; color: #1F7A3D; }
    .status--overdue         { background: #FBE4E5; color: #B23F45; }
    .status--disputed        { background: #FFE6CC; color: #8A4F00; }
    .status--cancelled       { background: #F5F5F5; color: #777; text-decoration: line-through; }
  `],
})
export class BillsListComponent implements OnInit {
  private readonly api = inject(AccountingApiService);
  readonly bills    = signal<BillDto[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);
  readonly filter   = signal<BillStatus | null>(null);

  readonly statuses: BillStatus[] = ['Draft','PendingApproval','Approved','Posted','PartiallyPaid','Paid','Overdue','Disputed','Cancelled'];

  readonly filtered = () => this.filter() === null ? this.bills() : this.bills().filter(b => b.status === this.filter());

  async ngOnInit() {
    try { this.bills.set(await this.api.listBills({ pageSize: 200 })); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load bills'); }
    finally { this.loading.set(false); }
  }
}

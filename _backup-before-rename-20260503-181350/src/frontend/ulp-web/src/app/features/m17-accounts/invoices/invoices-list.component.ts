import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M17ApiService } from '../shared/m17-api.service';
import { InvoiceDto, InvoiceStatus } from '../shared/m17-types';

@Component({
  selector: 'ulp-m17-invoices',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>AR · Customer Invoices</h1>
      <p>Sealed LLD §5 state machine: Draft → PendingApproval → Approved → Posted → Paid (or Void/WrittenOff).</p>
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
          <thead><tr><th>Invoice #</th><th>Date</th><th>Due</th><th>Customer</th><th>Currency</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Paid</th><th>Status</th><th>IRN</th></tr></thead>
          <tbody>
            @for (i of filtered(); track i.id) {
              <tr>
                <td><a [routerLink]="[i.id]" class="link">{{ i.invoiceNumber }}</a></td>
                <td>{{ i.invoiceDate | slice:0:10 }}</td>
                <td>{{ i.dueDate | slice:0:10 }}</td>
                <td>{{ i.customerName ?? ('#' + i.customerPartyId) }}</td>
                <td class="mono">{{ i.currency }}</td>
                <td class="num">{{ i.subtotalAmount | number:'1.2-2' }}</td>
                <td class="num">{{ i.taxAmount | number:'1.2-2' }}</td>
                <td class="num"><strong>{{ i.totalAmount | number:'1.2-2' }}</strong></td>
                <td class="num">{{ i.paidAmount | number:'1.2-2' }}</td>
                <td><span class="status status--{{ i.status.toLowerCase() }}">{{ i.status }}</span></td>
                <td>
                  @if (i.irn) { <span class="badge badge--irn" title="IRN: {{ i.irn.irnValue }}">⚡ {{ i.irn.irpProvider }}</span> }
                  @else if (i.countryCode === 'IN') { <span class="muted">—</span> }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="11" class="empty">No invoices match this filter.</td></tr>
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
    .muted { color: #9A9AA3; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft           { background: #F5F2FB; color: #6B5BA0; }
    .status--pendingapproval { background: #FFF3D6; color: #946100; }
    .status--approved        { background: #DCEAF8; color: #1F4E8A; }
    .status--posted          { background: #DCF5E4; color: #1F7A3D; }
    .status--partiallypaid   { background: #FFE6CC; color: #8A4F00; }
    .status--paid            { background: #C8EBD3; color: #1F7A3D; }
    .status--overdue         { background: #FBE4E5; color: #B23F45; }
    .status--writtenoff      { background: #F5F5F5; color: #777; }
    .status--void            { background: #F5F5F5; color: #777; text-decoration: line-through; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .badge--irn { background: #FBE4E5; color: #B23F45; cursor: help; }
  `],
})
export class InvoicesListComponent implements OnInit {
  private readonly api = inject(M17ApiService);
  readonly invoices = signal<InvoiceDto[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);
  readonly filter   = signal<InvoiceStatus | null>(null);

  readonly statuses: InvoiceStatus[] = ['Draft','PendingApproval','Approved','Posted','PartiallyPaid','Paid','Overdue','WrittenOff','Void'];

  readonly filtered = () => this.filter() === null ? this.invoices() : this.invoices().filter(i => i.status === this.filter());

  async ngOnInit() {
    try { this.invoices.set(await this.api.listInvoices({ pageSize: 200 })); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load invoices'); }
    finally { this.loading.set(false); }
  }
}

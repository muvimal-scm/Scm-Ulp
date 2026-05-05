import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PricingQuotationApiService } from '../shared/pricing-quotation-api.service';
import { QuoteDto, QuoteStatus } from '../shared/pricing-quotation-types';

@Component({
  selector: 'ulp-pricing-quotation-quotes',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, FormsModule, RouterLink, MatIconModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Quotations</h1>
      <p>Customer quotes — Draft → Sent → Accepted/Rejected → Converted (to job).</p>
    </header>

    <div class="toolbar">
      <mat-form-field appearance="outline" class="filter">
        <mat-label>Status</mat-label>
        <mat-select [(value)]="statusFilter" (selectionChange)="reload()">
          <mat-option [value]="undefined">All</mat-option>
          @for (s of statuses; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <a mat-flat-button color="primary" routerLink="new">
        <mat-icon>add</mat-icon> New quote
      </a>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Quote</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Status</th>
              <th class="num">Total</th>
              <th>Lines</th>
              <th>Valid until</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (q of rows(); track q.id) {
              <tr>
                <td><code>{{ q.quoteNumber }}</code></td>
                <td>party {{ q.customerPartyId }}</td>
                <td><code>{{ q.serviceType || '—' }}</code></td>
                <td><span class="badge badge--{{ q.status.toLowerCase() }}">{{ q.status }}</span></td>
                <td class="num">
                  @if (q.totalAmount !== null) {
                    {{ q.totalAmount | number:'1.2-2' }} {{ q.totalCurrency }}
                  } @else {
                    —
                  }
                </td>
                <td>{{ q.lineCount }}</td>
                <td>{{ q.validUntil ? (q.validUntil | slice:0:10) : '—' }}</td>
                <td>{{ q.createdAt | slice:0:10 }}</td>
                <td class="actions">
                  <a mat-icon-button [routerLink]="[q.id]" matTooltip="Open"><mat-icon>open_in_new</mat-icon></a>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">No quotations.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 {
      font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; }

    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .filter { width: 180px; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }

    .table-wrap {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      text-align: left; padding: 12px 16px;
      background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    thead th.num { text-align: right; }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:hover { background: #F8F5FD; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .badge--draft     { background: #F0F0F4; color: #6B6B73; }
    .badge--sent      { background: #FFF3D6; color: #946100; }
    .badge--accepted  { background: #DCF5E4; color: #1F7A3D; }
    .badge--rejected  { background: #FCDDE0; color: #B23F45; }
    .badge--expired   { background: #F0F0F4; color: #6B6B73; }
    .badge--converted { background: #E8E2F4; color: #3F2D7C; }

    .actions { text-align: right; }
  `],
})
export class QuotesListComponent implements OnInit {
  private readonly api = inject(PricingQuotationApiService);

  readonly rows    = signal<QuoteDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  statusFilter?: QuoteStatus;
  readonly statuses: QuoteStatus[] = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'];

  async ngOnInit() { await this.reload(); }

  async reload() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.rows.set(await this.api.listQuotes({ status: this.statusFilter }));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load quotes');
    } finally {
      this.loading.set(false);
    }
  }
}

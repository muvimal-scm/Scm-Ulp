import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PricingQuotationApiService } from '../shared/pricing-quotation-api.service';
import { RateCardDto, RateCardStatus, RateCardType } from '../shared/pricing-quotation-types';

@Component({
  selector: 'ulp-pricing-quotation-rate-cards',
  standalone: true,
  imports: [SlicePipe, FormsModule, RouterLink, MatIconModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Rate cards</h1>
      <p>Sell-side and buy-side pricing tables. Status drives availability for new quotes.</p>
    </header>

    <div class="toolbar">
      <mat-form-field appearance="outline" class="filter">
        <mat-label>Status</mat-label>
        <mat-select [(value)]="statusFilter" (selectionChange)="reload()">
          <mat-option [value]="undefined">All</mat-option>
          @for (s of statuses; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="filter">
        <mat-label>Type</mat-label>
        <mat-select [(value)]="typeFilter" (selectionChange)="reload()">
          <mat-option [value]="undefined">All</mat-option>
          <mat-option value="Sell">Sell</mat-option>
          <mat-option value="Buy">Buy</mat-option>
          <mat-option value="InternalTransfer">Internal transfer</mat-option>
        </mat-select>
      </mat-form-field>
      <a mat-flat-button color="primary" routerLink="new">
        <mat-icon>add</mat-icon> New rate card
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
              <th>Card</th>
              <th>Type</th>
              <th>Scope</th>
              <th>Service</th>
              <th>Validity</th>
              <th>Currency</th>
              <th>Lines</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (c of rows(); track c.id) {
              <tr>
                <td>
                  <div class="cell">
                    <code>{{ c.cardNumber }}</code>
                    <div class="ctry">{{ c.countryCode }}</div>
                  </div>
                </td>
                <td><span class="type type--{{ c.cardType.toLowerCase() }}">{{ c.cardType }}</span></td>
                <td>{{ c.scope }}</td>
                <td><code>{{ c.serviceType || '—' }}</code></td>
                <td>{{ c.validFrom | slice:0:10 }} → {{ c.validTo ? (c.validTo | slice:0:10) : 'open' }}</td>
                <td>{{ c.currency }}</td>
                <td>{{ c.lineCount }}</td>
                <td><span class="badge badge--{{ c.status.toLowerCase() }}">{{ c.status }}</span></td>
                <td class="actions">
                  <a mat-icon-button [routerLink]="[c.id]" matTooltip="Open"><mat-icon>open_in_new</mat-icon></a>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">No rate cards.</td></tr>
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
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #F8F5FD; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }

    .cell code { background: #F5F2FB; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .ctry { color: #9A9AA3; font-size: 11px; margin-top: 2px; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .type { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .type--sell             { background: #DCF5E4; color: #1F7A3D; }
    .type--buy              { background: #FFF3D6; color: #946100; }
    .type--internaltransfer { background: #E8E2F4; color: #3F2D7C; }

    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .badge--draft     { background: #F0F0F4; color: #6B6B73; }
    .badge--approved  { background: #E8E2F4; color: #3F2D7C; }
    .badge--active    { background: #DCF5E4; color: #1F7A3D; }
    .badge--expired   { background: #F0F0F4; color: #6B6B73; }
    .badge--cancelled { background: #FCDDE0; color: #B23F45; }

    .actions { text-align: right; }
  `],
})
export class RateCardsListComponent implements OnInit {
  private readonly api = inject(PricingQuotationApiService);

  readonly rows    = signal<RateCardDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  statusFilter?: RateCardStatus;
  typeFilter?: RateCardType;

  readonly statuses: RateCardStatus[] = ['Draft', 'Approved', 'Active', 'Expired', 'Cancelled'];

  async ngOnInit() { await this.reload(); }

  async reload() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.rows.set(await this.api.listRateCards({
        status: this.statusFilter,
        cardType: this.typeFilter,
      }));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load rate cards');
    } finally {
      this.loading.set(false);
    }
  }
}

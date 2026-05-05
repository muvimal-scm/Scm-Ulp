import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LastMileApiService } from '../shared/last-mile-api.service';
import { CodDto } from '../shared/last-mile-types';

@Component({
  selector: 'ulp-last-mile-cod',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>COD collections</h1>
          <p>Cash / UPI / card collected at delivery — Pending → Deposited → Settled.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new" class="new-btn">
          <mat-icon>add</mat-icon>&nbsp;Record COD
        </a>
      </div>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Booking</th><th class="num">Amount</th><th>Method</th>
              <th>Reference</th><th>Collected</th><th>Settlement</th></tr>
          </thead>
          <tbody>
            @for (c of rows(); track c.id) {
              <tr>
                <td>booking #{{ c.bookingId }}</td>
                <td class="num">{{ c.amountCollected | number:'1.0-2' }} {{ c.currency }}</td>
                <td><span class="pm pm--{{ c.paymentMethod.toLowerCase() }}">{{ c.paymentMethod }}</span></td>
                <td>{{ c.referenceNo ?? '—' }}</td>
                <td>{{ c.collectedAt | slice:0:19 }}</td>
                <td><span class="cod cod--{{ c.settledStatus.toLowerCase() }}">{{ c.settledStatus }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">No COD collections yet.</td></tr>
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
    .pm { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .pm--cash  { background: #DCF5E4; color: #1F7A3D; }
    .pm--card  { background: #DCEAF8; color: #1F4E8A; }
    .pm--upi   { background: #E8E2F4; color: #3F2D7C; }
    .pm--other { background: #FFF3D6; color: #946100; }
    .cod { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .cod--pending   { background: #FFF3D6; color: #946100; }
    .cod--deposited { background: #DCEAF8; color: #1F4E8A; }
    .cod--settled   { background: #DCF5E4; color: #1F7A3D; }
    .cod--disputed  { background: #FBE4E5; color: #B23F45; }
  `],
})
export class CodListComponent implements OnInit {
  private readonly api = inject(LastMileApiService);
  readonly rows = signal<CodDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listCod()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load COD records'); }
    finally { this.loading.set(false); }
  }
}

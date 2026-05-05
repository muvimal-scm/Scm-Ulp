import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M17ApiService } from '../shared/m17-api.service';
import { PeriodDto } from '../shared/m17-types';

@Component({
  selector: 'ulp-m17-periods',
  standalone: true,
  imports: [SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Periods &amp; Close</h1>
      <p>Fiscal periods (Apr-Mar for IN, Jan-Dec for US). Closed periods are immutable; reopening
         needs CFO+Auditor RBAC per LLD §7.4.</p>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>FY</th><th>#</th><th>Period</th><th>Start</th><th>End</th><th>Status</th><th>Closed at</th><th>Reopens</th><th></th></tr></thead>
          <tbody>
            @for (p of periods(); track p.id) {
              <tr [class.row-open]="p.status === 'Open'" [class.row-closed]="p.status === 'Closed'">
                <td>{{ p.fiscalYear }}</td>
                <td>{{ p.periodNumber }}</td>
                <td><strong>{{ p.periodName }}</strong></td>
                <td>{{ p.startDate | slice:0:10 }}</td>
                <td>{{ p.endDate | slice:0:10 }}</td>
                <td><span class="status status--{{ p.status.toLowerCase() }}">{{ p.status }}</span></td>
                <td>{{ p.closedAt ? (p.closedAt | slice:0:16) : '—' }}</td>
                <td>{{ p.reopenedCount > 0 ? p.reopenedCount : '—' }}</td>
                <td class="actions">
                  @if (p.status === 'Open') {
                    <button class="btn-link" (click)="closePeriod(p)" [disabled]="busy()">Close period</button>
                  }
                  @if (p.status === 'Closed') {
                    <button class="btn-link" (click)="reopenPeriod(p)" [disabled]="busy()">Reopen…</button>
                  }
                </td>
              </tr>
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
    .page-head p { color: #6B5BA0; margin: 0 0 16px; max-width: 720px; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
                  box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C;
               font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody tr.row-open td { background: #F4FBF7; }
    tbody tr.row-closed td { color: #6B5BA0; }
    .actions { white-space: nowrap; }
    .btn-link { background: none; border: none; cursor: pointer; color: #5B3FA0; font-weight: 600;
                font-size: 12px; padding: 2px 6px; font-family: inherit; }
    .btn-link:hover { text-decoration: underline; }
    .btn-link:disabled { color: #C5C5D5; cursor: not-allowed; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--future    { background: #F5F2FB; color: #6B5BA0; }
    .status--open      { background: #DCF5E4; color: #1F7A3D; }
    .status--softclose { background: #FFF3D6; color: #946100; }
    .status--closed    { background: #E8E2F4; color: #3F2D7C; }
  `],
})
export class PeriodsListComponent implements OnInit {
  private readonly api = inject(M17ApiService);
  readonly periods = signal<PeriodDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly busy    = signal(false);

  async ngOnInit() {
    try { this.periods.set(await this.api.listPeriods()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load periods'); }
    finally { this.loading.set(false); }
  }

  async closePeriod(p: PeriodDto) {
    if (!confirm(`Close ${p.periodName}? This will lock all journals in this period.`)) return;
    this.busy.set(true);
    try {
      await this.api.closePeriod(p.id);
      this.periods.set(await this.api.listPeriods());
    } catch (e: any) { this.error.set(e?.error?.error ?? e?.message ?? 'Close failed'); }
    finally { this.busy.set(false); }
  }

  async reopenPeriod(p: PeriodDto) {
    const reason = prompt(`Reopen ${p.periodName}? Reason (audit-logged):`);
    if (!reason) return;
    this.busy.set(true);
    try {
      await this.api.reopenPeriod(p.id, reason);
      this.periods.set(await this.api.listPeriods());
    } catch (e: any) { this.error.set(e?.error?.error ?? e?.message ?? 'Reopen failed'); }
    finally { this.busy.set(false); }
  }
}

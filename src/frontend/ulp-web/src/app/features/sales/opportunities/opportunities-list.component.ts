import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/dialogs/confirm-dialog.component';
import { SalesApiService } from '../shared/sales-api.service';
import { OpportunityDto } from '../shared/sales-types';

@Component({
  selector: 'ulp-sales-opportunities',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>Opportunities</h1>
          <p>Active deals — title, party, value, expected close, stage.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new" class="new-btn">
          <mat-icon>add</mat-icon>&nbsp;New opportunity
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
            <tr>
              <th>Opp #</th><th>Country</th><th>Title</th>
              <th class="num">Est. value</th><th class="num">Prob.</th>
              <th>Expected close</th><th>Stage</th><th class="num">Activities</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (o of rows(); track o.id) {
              <tr>
                <td><code>{{ o.oppNumber }}</code></td>
                <td>{{ o.countryCode }}</td>
                <td>{{ o.title }}<br/><span class="muted">party #{{ o.partyId }}</span></td>
                <td class="num">{{ o.estimatedValue ? (o.estimatedValue | number:'1.0-0') : '—' }} {{ o.estimatedCurrency ?? '' }}</td>
                <td class="num">{{ o.probabilityPct !== null ? (o.probabilityPct | number:'1.0-1') + '%' : '—' }}</td>
                <td>{{ o.expectedClose ? (o.expectedClose | slice:0:10) : '—' }}</td>
                <td><span class="stage stage--{{ o.stage.toLowerCase() }}">{{ o.stage }}</span></td>
                <td class="num">{{ o.activityCount }}</td>
                <td class="actions">
                  <a mat-icon-button [routerLink]="[o.id]" [attr.title]="'Open detail'" aria-label="Open detail">
                    <mat-icon>open_in_new</mat-icon>
                  </a>
                  <a mat-icon-button [routerLink]="[o.id, 'edit']" [attr.title]="'Edit'" aria-label="Edit opportunity">
                    <mat-icon>edit</mat-icon>
                  </a>
                  <button mat-icon-button color="warn" (click)="onDelete(o)" [disabled]="busyId() === o.id" [attr.title]="'Delete'" aria-label="Delete opportunity">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">No opportunities yet. Click <strong>+ New opportunity</strong> to add one.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head { margin-bottom: 16px; }
    .head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .head-row h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .head-row p { color: #6B5BA0; margin: 0; }
    .new-btn { white-space: nowrap; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 16px; background: #F5F2FB; color: #3F2D7C;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    thead th.actions-col { text-align: right; }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; vertical-align: top; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    .actions { white-space: nowrap; text-align: right; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .muted { color: #9A9AA3; font-size: 11px; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .stage { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .stage--prospecting   { background: #E8E2F4; color: #3F2D7C; }
    .stage--qualification { background: #DCEAF8; color: #1F4E8A; }
    .stage--proposal      { background: #FFF3D6; color: #946100; }
    .stage--negotiation   { background: #FFE6CC; color: #8A4F00; }
    .stage--closedwon     { background: #DCF5E4; color: #1F7A3D; }
    .stage--closedlost    { background: #FBE4E5; color: #B23F45; }
  `],
})
export class OpportunitiesListComponent implements OnInit {
  private readonly api    = inject(SalesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack  = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly rows    = signal<OpportunityDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly busyId  = signal<number | null>(null);

  async ngOnInit() { await this.reload(); }

  private async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listOpportunities()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load opportunities'); }
    finally { this.loading.set(false); }
  }

  async onDelete(o: OpportunityDto) {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      data: {
        title: 'Delete opportunity',
        message: `Delete "${o.oppNumber} — ${o.title}"? This cannot be undone. Linked activities will also be removed.`,
        confirmText: 'Delete',
        danger: true,
      },
      width: '460px',
    });
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;

    this.busyId.set(o.id);
    try {
      await this.api.deleteOpportunity(o.id);
      this.snack.open(`Opportunity ${o.oppNumber} deleted`, 'Dismiss', { duration: 4000 });
      await this.reload();
    } catch (e: any) {
      const msg = e?.error?.error ?? e?.message ?? 'Delete failed';
      this.snack.open(msg, 'Dismiss', { duration: 6000, panelClass: 'snack-error' });
    } finally {
      this.busyId.set(null);
    }
  }
}

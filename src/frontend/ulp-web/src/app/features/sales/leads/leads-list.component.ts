import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/dialogs/confirm-dialog.component';
import { SalesApiService } from '../shared/sales-api.service';
import { LeadDto } from '../shared/sales-types';

@Component({
  selector: 'ulp-sales-leads',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>Leads</h1>
          <p>Inbound contacts in the funnel — qualify, contact, convert to opportunities.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new" class="new-btn">
          <mat-icon>add</mat-icon>&nbsp;New lead
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
              <th>Lead #</th><th>Country</th><th>Source</th>
              <th>Contact</th><th>Company</th><th>Industry</th>
              <th>Est. volume</th><th>Stage</th><th>Created</th><th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (l of rows(); track l.id) {
              <tr>
                <td><code>{{ l.leadNumber }}</code></td>
                <td>{{ l.countryCode }}</td>
                <td>{{ l.source }}</td>
                <td>{{ l.contactName }}<br/><span class="muted">{{ l.email ?? '' }}</span></td>
                <td>{{ l.companyName ?? '—' }}</td>
                <td>{{ l.industry ?? '—' }}</td>
                <td>{{ l.estimatedVolume ?? '—' }}</td>
                <td><span class="stage stage--{{ l.stage.toLowerCase() }}">{{ l.stage }}</span></td>
                <td>{{ l.createdAt | slice:0:10 }}</td>
                <td class="actions">
                  <a mat-icon-button routerLink="/app/pricing-quotation/quotes/new" [queryParams]="{ leadId: l.id }" [attr.title]="'Generate Quote'" aria-label="Generate Quote from lead">
                    <mat-icon>request_quote</mat-icon>
                  </a>
                  <a mat-icon-button [routerLink]="[l.id, 'edit']" [attr.title]="'Edit'" aria-label="Edit lead">
                    <mat-icon>edit</mat-icon>
                  </a>
                  <button mat-icon-button color="warn" (click)="onDelete(l)" [disabled]="busyId() === l.id" [attr.title]="'Delete'" aria-label="Delete lead">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="10" class="empty">No leads yet. Click <strong>+ New lead</strong> to add one.</td></tr>
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
    thead th.actions-col { text-align: right; }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; vertical-align: top; }
    tbody tr:last-child td { border-bottom: none; }
    .actions { white-space: nowrap; text-align: right; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .muted { color: #9A9AA3; font-size: 11px; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .stage { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .stage--new          { background: #E8E2F4; color: #3F2D7C; }
    .stage--contacted    { background: #DCEAF8; color: #1F4E8A; }
    .stage--qualified    { background: #DCF5E4; color: #1F7A3D; }
    .stage--disqualified { background: #FBE4E5; color: #B23F45; }
    .stage--converted    { background: #FFF3D6; color: #946100; }
  `],
})
export class LeadsListComponent implements OnInit {
  private readonly api     = inject(SalesApiService);
  private readonly dialog  = inject(MatDialog);
  private readonly snack   = inject(MatSnackBar);
  private readonly router  = inject(Router);

  readonly rows    = signal<LeadDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly busyId  = signal<number | null>(null);

  async ngOnInit() { await this.reload(); }

  private async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listLeads()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load leads'); }
    finally { this.loading.set(false); }
  }

  async onDelete(l: LeadDto) {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      data: {
        title: 'Delete lead',
        message: `Delete lead "${l.leadNumber}" (${l.contactName})? This cannot be undone.`,
        confirmText: 'Delete',
        danger: true,
      },
      width: '440px',
    });
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;

    this.busyId.set(l.id);
    try {
      await this.api.deleteLead(l.id);
      this.snack.open(`Lead ${l.leadNumber} deleted`, 'Dismiss', { duration: 4000 });
      await this.reload();
    } catch (e: any) {
      const msg = e?.error?.error ?? e?.message ?? 'Delete failed';
      this.snack.open(msg, 'Dismiss', { duration: 6000, panelClass: 'snack-error' });
    } finally {
      this.busyId.set(null);
    }
  }
}

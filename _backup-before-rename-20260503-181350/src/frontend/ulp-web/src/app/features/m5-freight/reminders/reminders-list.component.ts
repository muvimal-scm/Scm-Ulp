import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M5ApiService } from '../shared/m5-api.service';
import { ReminderStatus, ShipmentReminderDto } from '../shared/m5-types';

/**
 * SCM Milestone 1+2 — Reminders list.
 *
 * Three-tab view (Pending / Due now / Done) with a "Run due reminders" button
 * that fires the same handler the Phase-5 Hangfire scheduler will call.
 * Inline status actions per row: Snooze 1h, Mark done, Dismiss.
 */
type TabKey = 'pending' | 'dueNow' | 'done';

@Component({
  selector: 'ulp-m5-reminders',
  standalone: true,
  imports: [FormsModule, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Reminders</h1>
      <p>Date-driven follow-ups across all shipments. The "Run due reminders" button
         is the same handler that a Phase-5 Hangfire scheduler will fire on a cron.</p>
    </header>

    <nav class="tabs">
      <button class="tab" [class.tab--active]="activeTab() === 'pending'" (click)="switchTab('pending')">
        Pending @if (counts().pending > 0) { <span class="tab__count">{{ counts().pending }}</span> }
      </button>
      <button class="tab" [class.tab--active]="activeTab() === 'dueNow'" (click)="switchTab('dueNow')">
        Due now @if (counts().dueNow > 0) { <span class="tab__count tab__count--alert">{{ counts().dueNow }}</span> }
      </button>
      <button class="tab" [class.tab--active]="activeTab() === 'done'" (click)="switchTab('done')">
        Done
      </button>
      <div class="tab-spacer"></div>
      <button class="btn btn--primary" (click)="runDue()" [disabled]="busy()">
        @if (busy()) { Running… } @else { <mat-icon>play_arrow</mat-icon> Run due reminders }
      </button>
    </nav>

    @if (lastFireResult(); as r) {
      <div class="banner">
        <mat-icon>check_circle</mat-icon>
        Checked <strong>{{ r.checkedCount }}</strong> reminders ·
        fired <strong>{{ r.firedCount }}</strong>
        @if (r.failedCount > 0) { · failed <strong>{{ r.failedCount }}</strong> }
      </div>
    }

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Shipment</th><th>Kind</th><th>Title</th>
              <th>Due</th><th>Status</th><th>Last fired</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr [class.row-overdue]="isOverdue(r)">
                <td><a [routerLink]="['/app/m5/shipments', r.shipmentId]" class="link">#{{ r.shipmentId }}</a></td>
                <td><span class="kind kind--{{ r.reminderKind.toLowerCase() }}">{{ r.reminderKind }}</span></td>
                <td>
                  <div class="title">{{ r.title }}</div>
                  @if (r.notes) { <div class="muted">{{ r.notes }}</div> }
                </td>
                <td>{{ r.dueAt | slice:0:16 }}</td>
                <td><span class="status status--{{ r.status.toLowerCase() }}">{{ r.status }}</span></td>
                <td>{{ r.lastFiredAt ? (r.lastFiredAt | slice:0:16) : '—' }}</td>
                <td class="actions">
                  @if (r.status === 'Pending' || r.status === 'Sent') {
                    <button class="btn-link" (click)="snooze(r)">Snooze 1h</button>
                    <button class="btn-link" (click)="markDone(r)">Done</button>
                    <button class="btn-link btn-link--muted" (click)="dismiss(r)">Dismiss</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty">No reminders match this filter.</td></tr>
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

    .tabs {
      display: flex; gap: 6px; align-items: center;
      border-bottom: 1px solid #E8E2F4; margin-bottom: 12px; padding: 0 4px;
    }
    .tab {
      background: transparent; border: none; cursor: pointer;
      padding: 10px 14px; font-size: 13px; font-weight: 600; color: #6B5BA0;
      border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit;
    }
    .tab:hover { color: #3F2D7C; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }
    .tab__count {
      display: inline-block; margin-left: 6px;
      background: #E8E2F4; color: #3F2D7C; font-size: 11px;
      padding: 1px 8px; border-radius: 999px; font-weight: 700;
    }
    .tab__count--alert { background: #FBE4E5; color: #B23F45; }
    .tab-spacer { flex: 1; }

    .btn { padding: 8px 14px; background: #5B3FA0; color: #FFF; border: none;
      border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;
      font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
    .btn--primary { background: #5B3FA0; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .banner {
      display: flex; gap: 10px; align-items: center;
      padding: 8px 14px; background: #DCF5E4; color: #1F7A3D;
      border: 1px solid #B2E1C2; border-radius: 8px; font-size: 12px; margin-bottom: 12px;
    }
    .banner mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; vertical-align: top; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr.row-overdue td { background: #FFFAEC; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .muted { color: #9A9AA3; font-size: 11px; margin-top: 2px; }
    .title { font-weight: 600; color: #1A1A33; }
    .actions { white-space: nowrap; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
    .btn-link { background: none; border: none; cursor: pointer; color: #5B3FA0;
      font-weight: 600; font-size: 12px; padding: 2px 6px; margin-right: 4px; font-family: inherit; }
    .btn-link:hover { text-decoration: underline; }
    .btn-link--muted { color: #9A9AA3; }
    .btn-link--muted:hover { color: #B23F45; }

    .kind { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .kind--followup    { background: #E8E2F4; color: #3F2D7C; }
    .kind--docdue      { background: #DCEAF8; color: #1F4E8A; }
    .kind--podfollowup { background: #DCF5E4; color: #1F7A3D; }
    .kind--returndue   { background: #FFE6CC; color: #8A4F00; }
    .kind--paymentdue  { background: #FFF3D6; color: #946100; }
    .kind--custom      { background: #F5F2FB; color: #5B3FA0; }

    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--pending   { background: #FFF3D6; color: #946100; }
    .status--sent      { background: #DCEAF8; color: #1F4E8A; }
    .status--snoozed   { background: #E8E2F4; color: #3F2D7C; }
    .status--done      { background: #DCF5E4; color: #1F7A3D; }
    .status--dismissed { background: #F5F5F5; color: #777; }
  `],
})
export class RemindersListComponent implements OnInit {
  private readonly api = inject(M5ApiService);

  readonly rows           = signal<ShipmentReminderDto[]>([]);
  readonly loading        = signal(true);
  readonly error          = signal<string | null>(null);
  readonly busy           = signal(false);
  readonly activeTab      = signal<TabKey>('pending');
  readonly lastFireResult = signal<{ checkedCount: number; firedCount: number; failedCount: number } | null>(null);
  readonly counts         = signal<{ pending: number; dueNow: number }>({ pending: 0, dueNow: 0 });

  isOverdue(r: ShipmentReminderDto): boolean {
    return r.status === 'Pending' && new Date(r.dueAt).getTime() <= Date.now();
  }

  async ngOnInit() {
    await Promise.all([this.refreshCounts(), this.reload()]);
  }

  async switchTab(t: TabKey) {
    this.activeTab.set(t);
    await this.reload();
  }

  async reload() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const tab = this.activeTab();
      const opts = tab === 'pending' ? { status: 'Pending' as ReminderStatus }
                 : tab === 'dueNow'  ? { dueNow: true }
                 :                     { status: 'Done' as ReminderStatus };
      this.rows.set(await this.api.listReminders({ ...opts, pageSize: 200 }));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load reminders');
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshCounts() {
    try {
      const [pending, due] = await Promise.all([
        this.api.listReminders({ status: 'Pending', pageSize: 1000 }),
        this.api.listReminders({ dueNow: true, pageSize: 1000 }),
      ]);
      this.counts.set({ pending: pending.length, dueNow: due.length });
    } catch { /* non-fatal */ }
  }

  async runDue() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const res = await this.api.runDueReminders();
      this.lastFireResult.set(res);
      await Promise.all([this.refreshCounts(), this.reload()]);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Run-due failed');
    } finally {
      this.busy.set(false);
    }
  }

  async snooze(r: ShipmentReminderDto) {
    const next = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await this.changeStatus(r.id, 'Pending', next);
  }
  async markDone(r: ShipmentReminderDto) { await this.changeStatus(r.id, 'Done'); }
  async dismiss(r: ShipmentReminderDto) { await this.changeStatus(r.id, 'Dismissed'); }

  private async changeStatus(id: number, status: ReminderStatus, snoozeUntilUtc?: string) {
    try {
      await this.api.changeReminderStatus(id, status, snoozeUntilUtc);
      await Promise.all([this.refreshCounts(), this.reload()]);
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Update failed');
    }
  }
}

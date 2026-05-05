import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M27ApiService } from '../shared/m27-api.service';
import { InboxItemDto } from '../shared/m27-types';

@Component({
  selector: 'ulp-m27-inbox',
  standalone: true,
  imports: [SlicePipe, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Inbox</h1>
      <p>In-app messages routed by the M27 NotificationService.</p>
    </header>

    <div class="toolbar">
      <label class="check">
        <input type="checkbox" [(ngModel)]="includeRead" (change)="reload()" /> include read
      </label>
      <button mat-stroked-button (click)="markAll()" [disabled]="!unreadCount()">
        <mat-icon>done_all</mat-icon> Mark all read
      </button>
      <button mat-stroked-button (click)="reload()"><mat-icon>refresh</mat-icon></button>
      <span class="count">{{ unreadCount() }} unread · {{ rows().length }} shown</span>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="list">
        @for (m of rows(); track m.id) {
          <div class="msg" [class.msg--unread]="!m.isRead">
            <div class="msg__bullet"></div>
            <div class="msg__body">
              <div class="msg__title">{{ m.title }}</div>
              <div class="msg__text" [innerHTML]="m.body"></div>
              <div class="msg__meta">
                <span>{{ m.createdAt | slice:0:19 }}</span>
                @if (m.category) { <span class="sep">·</span><span>{{ m.category }}</span> }
                @if (m.linkUrl) {
                  <span class="sep">·</span>
                  <a [href]="m.linkUrl" target="_blank">open</a>
                }
              </div>
            </div>
            @if (!m.isRead) {
              <button mat-icon-button (click)="markRead(m.id)" matTooltip="Mark read">
                <mat-icon>check</mat-icon>
              </button>
            }
          </div>
        } @empty {
          <div class="empty">
            <mat-icon>inbox</mat-icon>
            <div>No messages.</div>
            <div class="hint">Trigger one by sending a test email below from Notifications → Settings.</div>
          </div>
        }
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
    .check { display: inline-flex; gap: 6px; align-items: center; color: #6B5BA0; font-size: 13px; }
    .count { margin-left: auto; color: #6B5BA0; font-size: 12px; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }

    .list { display: flex; flex-direction: column; gap: 8px; }
    .msg {
      display: grid; grid-template-columns: 12px 1fr auto; gap: 12px; align-items: flex-start;
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.04);
    }
    .msg--unread { border-left: 3px solid #5B3FA0; padding-left: 13px; }
    .msg__bullet {
      width: 8px; height: 8px; border-radius: 50%;
      background: #C9BEEC; margin-top: 6px;
    }
    .msg--unread .msg__bullet { background: #5B3FA0; }
    .msg__title { font-weight: 700; color: #1A1A33; }
    .msg__text  { color: #5C5C66; font-size: 13.5px; margin-top: 4px; line-height: 1.5; }
    .msg__meta  { color: #9A9AA3; font-size: 12px; margin-top: 6px; display: flex; gap: 6px; align-items: center; }
    .msg__meta a { color: #5B3FA0; text-decoration: none; }
    .msg__meta a:hover { text-decoration: underline; }
    .sep { color: #C9BEEC; }

    .empty {
      padding: 60px 24px; text-align: center; color: #9A9AA3;
      background: #FFFFFF; border: 1px dashed #C9BEEC; border-radius: 12px;
    }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: #C9BEEC; margin-bottom: 8px; }
    .empty .hint { color: #6B5BA0; font-size: 12px; margin-top: 6px; }
  `],
})
export class InboxComponent implements OnInit {
  private readonly api = inject(M27ApiService);

  readonly rows    = signal<InboxItemDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  includeRead = false;

  unreadCount = () => this.rows().filter(r => !r.isRead).length;

  async ngOnInit() { await this.reload(); }

  async reload() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.rows.set(await this.api.getInbox({ includeRead: this.includeRead }));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load inbox');
    } finally {
      this.loading.set(false);
    }
  }

  async markRead(id: number) {
    try { await this.api.markRead(id); await this.reload(); }
    catch (e: any) { this.error.set(e?.message ?? 'mark read failed'); }
  }

  async markAll() {
    try { await this.api.markAllRead(); await this.reload(); }
    catch (e: any) { this.error.set(e?.message ?? 'mark all failed'); }
  }
}

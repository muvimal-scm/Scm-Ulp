import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IdentityApiService } from '../shared/identity-api.service';
import { ApiKeyRow, CreatedApiKeyResponse } from '../shared/identity-types';

@Component({
  selector: 'ulp-identity-apikeys',
  standalone: true,
  imports: [SlicePipe, FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>API keys</h1>
      <p>Service-to-service tokens. Raw key shown ONCE on creation. SHA-256 hash + 8-char prefix persisted.</p>
    </header>

    <div class="toolbar">
      <mat-form-field appearance="outline" class="name-input">
        <mat-label>Key name</mat-label>
        <input matInput [(ngModel)]="newName" placeholder="ETL pipeline" />
      </mat-form-field>
      <button mat-flat-button color="primary" [disabled]="!newName.trim() || creating()" (click)="create()">
        <mat-icon>add</mat-icon> Create key
      </button>
    </div>

    @if (created(); as ck) {
      <div class="raw">
        <mat-icon>key</mat-icon>
        <div>
          <strong>Save this key now — it will never be shown again.</strong>
          <div class="raw__key">{{ ck.rawKey }}</div>
          <div class="raw__meta">id={{ ck.id }} · prefix={{ ck.prefix }}</div>
        </div>
        <button mat-icon-button (click)="created.set(null)" matTooltip="Dismiss">
          <mat-icon>close</mat-icon>
        </button>
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
              <th>Name</th>
              <th>Prefix</th>
              <th>Status</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Last used</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (k of rows(); track k.id) {
              <tr [class.revoked]="k.isRevoked">
                <td>{{ k.name }}</td>
                <td><code>{{ k.keyPrefix }}…</code></td>
                <td>
                  @if (k.isRevoked) { <span class="badge badge--revoked">revoked</span> }
                  @else { <span class="badge badge--active">active</span> }
                </td>
                <td>{{ k.createdAt | slice:0:10 }}</td>
                <td>{{ k.expiresAt ? (k.expiresAt | slice:0:10) : '—' }}</td>
                <td>{{ k.lastUsedAt ? (k.lastUsedAt | slice:0:19) : 'never' }}</td>
                <td class="actions">
                  @if (!k.isRevoked) {
                    <button mat-icon-button (click)="revoke(k.id)" matTooltip="Revoke">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty">No API keys yet.</td></tr>
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
    .toolbar { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .name-input { width: 320px; }

    .raw {
      display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center;
      padding: 16px; border-radius: 12px; margin-bottom: 16px;
      background: #FFF8E1; border: 1px solid #FFE082;
    }
    .raw mat-icon { color: #946100; }
    .raw__key {
      font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px;
      background: #FFFFFF; padding: 8px 12px; border-radius: 8px;
      margin: 8px 0 4px; user-select: all; word-break: break-all;
    }
    .raw__meta { color: #6B5BA0; font-size: 12px; }

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
      border-bottom: 1px solid #E8E2F4;
    }
    tbody td {
      padding: 12px 16px; border-bottom: 1px solid #F0EBF8;
      color: #1A1A33; font-size: 13px;
    }
    tbody tr.revoked td { opacity: 0.55; }
    .actions { text-align: right; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    code { background: #F5F2FB; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
    .badge--active  { background: #DCF5E4; color: #1F7A3D; }
    .badge--revoked { background: #FCDDE0; color: #B23F45; }
  `],
})
export class ApiKeysListComponent implements OnInit {
  private readonly api = inject(IdentityApiService);

  readonly rows     = signal<ApiKeyRow[]>([]);
  readonly loading  = signal(true);
  readonly creating = signal(false);
  readonly error    = signal<string | null>(null);
  readonly created  = signal<CreatedApiKeyResponse | null>(null);
  newName = '';

  async ngOnInit() { await this.reload(); }

  async reload() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.rows.set(await this.api.listApiKeys());
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load keys');
    } finally {
      this.loading.set(false);
    }
  }

  async create() {
    const name = this.newName.trim();
    if (!name) return;
    this.creating.set(true);
    try {
      const result = await this.api.createApiKey({ name });
      this.created.set(result);
      this.newName = '';
      await this.reload();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to create key');
    } finally {
      this.creating.set(false);
    }
  }

  async revoke(id: number) {
    if (!confirm('Revoke this API key? Existing callers will fail authentication.')) return;
    try {
      await this.api.revokeApiKey(id);
      await this.reload();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to revoke');
    }
  }
}

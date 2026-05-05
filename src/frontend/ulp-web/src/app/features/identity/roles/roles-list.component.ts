import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IdentityApiService } from '../shared/identity-api.service';
import { RoleDto } from '../shared/identity-types';

@Component({
  selector: 'ulp-identity-roles',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>Roles</h1>
          <p>System roles (read-only) + tenant-scoped roles. Click "New role" to define a custom role with permissions.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new" class="new-btn">
          <mat-icon>add</mat-icon>&nbsp;New role
        </a>
      </div>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="grid">
        @for (r of rows(); track r.id) {
          <div class="role-card" [class.role-card--system]="r.isSystem">
            <div class="role-card__head">
              <mat-icon>{{ r.isSystem ? 'verified' : 'badge' }}</mat-icon>
              <div>
                <div class="title">{{ r.name }}</div>
                <code class="code">{{ r.code }}</code>
              </div>
              <span class="badge" [class.badge--system]="r.isSystem">{{ r.isSystem ? 'system' : 'tenant' }}</span>
            </div>
            <p class="desc">{{ r.description || '—' }}</p>
            <div class="meta">
              @if (r.isActive) { <span class="dot dot--active"></span> Active }
              @else { <span class="dot dot--inactive"></span> Inactive }
              <span class="sep">·</span>
              <span>tenantId: {{ r.tenantId ?? 'system-wide' }}</span>
            </div>
          </div>
        } @empty {
          <div class="empty">No roles found.</div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .new-btn { white-space: nowrap; }
    .page-head h1 {
      font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .page-head p { color: #6B5BA0; margin: 0 0 24px; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }
    .role-card {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 14px;
      padding: 20px; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
    }
    .role-card--system { border-color: #C9BEEC; background: linear-gradient(180deg, #FFFFFF 0%, #F8F5FD 100%); }

    .role-card__head { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .role-card__head mat-icon { color: #5B3FA0; }
    .title { font-weight: 700; color: #1A1A33; }
    .code  { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px; color: #6B5BA0; }
    .desc  { color: #5C5C66; margin: 8px 0 12px; font-size: 13px; }
    .meta  { color: #6B5BA0; font-size: 12px; display: flex; align-items: center; gap: 6px; }
    .sep   { color: #C9BEEC; }
    .dot   { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot--active  { background: #1F7A3D; }
    .dot--inactive{ background: #B23F45; }

    .badge {
      margin-left: auto; padding: 2px 10px; border-radius: 999px;
      background: #E8E2F4; color: #3F2D7C; font-size: 10.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .badge--system { background: #FCDDE0; color: #B23F45; }
    .empty { padding: 40px; text-align: center; color: #9A9AA3; }
  `],
})
export class RolesListComponent implements OnInit {
  private readonly api = inject(IdentityApiService);
  readonly rows    = signal<RoleDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.rows.set(await this.api.listRoles());
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load roles');
    } finally {
      this.loading.set(false);
    }
  }
}

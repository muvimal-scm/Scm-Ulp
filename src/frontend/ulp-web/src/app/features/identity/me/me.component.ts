import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IdentityApiService } from '../shared/identity-api.service';
import { UserDto } from '../shared/identity-types';

@Component({
  selector: 'ulp-identity-me',
  standalone: true,
  imports: [MatIconModule, MatChipsModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>My account</h1>
      <p>Effective permissions resolved by M26 PermissionResolver.</p>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner><span>Loadingâ€¦</span></div>
    } @else if (error()) {
      <div class="error">
        <mat-icon>error_outline</mat-icon>
        <div>
          <strong>Could not load profile.</strong>
          <p>{{ error() }}</p>
          <p class="hint">If you see 403, your JWT lacks <code>tenant_id</code>. Sign in as <code>in-admin&#64;ulp.local</code>.</p>
        </div>
      </div>
    } @else {
      @if (user(); as u) {
        <div class="card">
          <div class="card__head">
            <div class="avatar">{{ initials(u.displayName) }}</div>
            <div>
              <div class="name">{{ u.displayName || '(no name)' }}</div>
              <div class="email">{{ u.email }}</div>
            </div>
          </div>
          <dl class="kv">
            <dt>Tenant</dt><dd>{{ u.tenantId }}</dd>
            <dt>Country</dt><dd>{{ u.countryCode }}</dd>
            <dt>Status</dt><dd><span class="badge badge--{{ u.status.toLowerCase() }}">{{ u.status }}</span></dd>
            <dt>Roles</dt>
            <dd>
              @if (u.roles.length === 0) { <em class="muted">no roles assigned</em> }
              @for (r of u.roles; track r) { <span class="chip chip--role">{{ r }}</span> }
            </dd>
            <dt>Effective permissions</dt>
            <dd>
              @if (u.permissions.length === 0) { <em class="muted">none</em> }
              @for (p of u.permissions; track p) { <span class="chip chip--perm">{{ p }}</span> }
            </dd>
          </dl>
        </div>
      }
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
    .page-head p { color: #6B5BA0; margin: 0 0 24px; }
    .loading { display: flex; gap: 12px; align-items: center; color: #6B5BA0; }
    .error {
      display: grid; grid-template-columns: auto 1fr; gap: 12px;
      padding: 16px; border-radius: 12px;
      background: #FFF3F5; border: 1px solid #FCDDE0; color: #B23F45;
    }
    .error mat-icon { color: #D04E54; }
    .error p { margin: 4px 0; }
    .error .hint { color: #6B5BA0; font-size: 12.5px; }

    .card {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 14px;
      padding: 24px; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
    }
    .card__head { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #5B3FA0 0%, #3F2D7C 100%);
      color: #FFFFFF; font-weight: 700; font-size: 20px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .name  { font-weight: 700; font-size: 18px; color: #1A1A33; }
    .email { color: #6B5BA0; font-size: 13px; }
    dl.kv { display: grid; grid-template-columns: 200px 1fr; gap: 8px 16px; margin: 0; }
    dl.kv dt { color: #6B5BA0; font-size: 12.5px; font-weight: 600; padding-top: 4px; }
    dl.kv dd { margin: 0; color: #1A1A33; }
    .muted { color: #9A9AA3; }
    .chip {
      display: inline-flex; align-items: center;
      padding: 3px 10px; border-radius: 999px; margin: 2px 4px 2px 0;
      font-size: 12px; font-weight: 500;
    }
    .chip--role { background: #E8E2F4; color: #3F2D7C; }
    .chip--perm { background: #F5F2FB; color: #5B3FA0; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 11.5px; }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
    .badge--active        { background: #DCF5E4; color: #1F7A3D; }
    .badge--invited       { background: #FFF3D6; color: #946100; }
    .badge--suspended     { background: #FCDDE0; color: #B23F45; }
    .badge--deactivated   { background: #F0F0F4; color: #6B6B73; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
  `],
})
export class MeComponent implements OnInit {
  private readonly api = inject(IdentityApiService);

  readonly user    = signal<UserDto | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.user.set(await this.api.me());
    } catch (e: any) {
      this.error.set(e?.message ?? 'Unknown error');
    } finally {
      this.loading.set(false);
    }
  }

  initials(name: string): string {
    if (!name) return '?';
    return name.replace(/[._@-].*$/, '').slice(0, 2).toUpperCase();
  }
}

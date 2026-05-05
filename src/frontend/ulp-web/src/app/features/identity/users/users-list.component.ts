import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IdentityApiService } from '../shared/identity-api.service';
import { BriefUser } from '../shared/identity-types';

@Component({
  selector: 'ulp-identity-users',
  standalone: true,
  imports: [SlicePipe, FormsModule, RouterLink, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Users</h1>
      <p>Tenant directory. Invitations + role assignments.</p>
    </header>

    <div class="toolbar">
      <mat-form-field appearance="outline" class="search">
        <mat-label>Search</mat-label>
        <input matInput [(ngModel)]="search" (keyup.enter)="reload()" placeholder="email or display name" />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <a mat-flat-button color="primary" routerLink="invite">
        <mat-icon>person_add</mat-icon> Invite user
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
              <th>User</th>
              <th>Status</th>
              <th>Country</th>
              <th>Last login</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            @for (u of rows(); track u.id) {
              <tr>
                <td>
                  <div class="user-cell">
                    <div class="avatar">{{ initials(u.displayName || u.email) }}</div>
                    <div>
                      <div class="name">{{ u.displayName || '(no name)' }}</div>
                      <div class="email">{{ u.email }}</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge--{{ u.status.toLowerCase() }}">{{ u.status }}</span></td>
                <td>{{ u.countryCode }}</td>
                <td>{{ u.lastLoginAt ? (u.lastLoginAt | slice:0:19) : 'â€”' }}</td>
                <td>{{ u.createdAt | slice:0:10 }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty">No users found.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="footer">{{ total() }} user{{ total() === 1 ? '' : 's' }}</div>
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
    .search { width: 320px; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; display: flex; gap: 8px; align-items: center; justify-content: center; }
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
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #F8F5FD; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }

    .user-cell { display: flex; align-items: center; gap: 12px; }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #5B3FA0 0%, #3F2D7C 100%);
      color: #FFFFFF; font-weight: 700; font-size: 13px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .name  { font-weight: 600; }
    .email { color: #6B5BA0; font-size: 12px; }

    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
    .badge--active      { background: #DCF5E4; color: #1F7A3D; }
    .badge--invited     { background: #FFF3D6; color: #946100; }
    .badge--suspended   { background: #FCDDE0; color: #B23F45; }
    .badge--deactivated { background: #F0F0F4; color: #6B6B73; }

    .footer { margin-top: 12px; color: #6B5BA0; font-size: 12px; }
  `],
})
export class UsersListComponent implements OnInit {
  private readonly api = inject(IdentityApiService);

  readonly rows    = signal<BriefUser[]>([]);
  readonly total   = signal(0);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  search = '';

  async ngOnInit() { await this.reload(); }

  async reload() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.listUsers({ search: this.search || undefined });
      this.rows.set(res.items);
      this.total.set(res.totalCount);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load users');
    } finally {
      this.loading.set(false);
    }
  }

  initials(name: string): string {
    return (name || '?').replace(/[._@-].*$/, '').slice(0, 2).toUpperCase();
  }
}

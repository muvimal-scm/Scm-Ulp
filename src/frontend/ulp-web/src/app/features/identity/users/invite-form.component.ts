import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IdentityApiService } from '../shared/identity-api.service';
import { InviteUserRequest, RoleDto } from '../shared/identity-types';

@Component({
  selector: 'ulp-identity-invite-user',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatCheckboxModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/identity/users" class="back-link">‹ Back to users</a>
      <h1>Invite User</h1>
      <p>Send an invitation. The user gets an email with a Keycloak set-password link.
         Once they accept, they appear in the directory with the roles you assign here.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" maxlength="200" />
          @if (form.get('email')?.hasError('required')) { <mat-error>Required</mat-error> }
          @else if (form.get('email')?.hasError('email')) { <mat-error>Invalid email</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Display name</mat-label>
          <input matInput formControlName="displayName" maxlength="200" />
          @if (form.get('displayName')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Country code</mat-label>
        <mat-select formControlName="countryCode">
          <mat-option value="IN">IN — India</mat-option>
          <mat-option value="US">US — United States</mat-option>
        </mat-select>
      </mat-form-field>

      <h2 class="section">Roles</h2>
      @if (rolesLoading()) {
        <p class="muted">Loading roles…</p>
      } @else if (roles().length === 0) {
        <p class="muted">No roles defined for this tenant. Create one first under <a routerLink="/app/identity/roles">Roles</a>.</p>
      } @else {
        <div class="role-grid">
          @for (r of roles(); track r.id) {
            <label class="role-row">
              <mat-checkbox [checked]="selectedRoleIds().has(r.id)" (change)="toggleRole(r.id, $event.checked)">
                <span class="role-row__name">{{ r.code }} — {{ r.name }}</span>
                @if (r.description) { <span class="role-row__desc">{{ r.description }}</span> }
              </mat-checkbox>
            </label>
          }
        </div>
      }

      <div class="actions">
        <button mat-button type="button" routerLink="/app/identity/users" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Sending… } @else { Send Invitation }
        </button>
      </div>
    </form>
  `,
  styles: [`
    :host { display: block; }
    .page-head { margin-bottom: 16px; }
    .back-link { color: #5B3FA0; text-decoration: none; font-size: 13px; font-weight: 600; }
    .back-link:hover { text-decoration: underline; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 4px 0;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0; }
    .api-error { display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; margin-bottom: 16px;
      background: #FBE4E5; color: #B23F45;
      border: 1px solid #F5C6CB; border-radius: 8px; font-size: 13px; }
    .form-card { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 24px; max-width: 900px; }
    .section { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full { width: 100%; }
    mat-form-field { width: 100%; }
    .muted { color: #9A9AA3; font-size: 13px; }
    .role-grid { display: grid; gap: 6px; margin-bottom: 16px; }
    .role-row { display: block; padding: 8px 12px; background: #FAFAFC; border: 1px solid #EFEFF3; border-radius: 8px; }
    .role-row__name { color: #1A1A33; font-weight: 600; font-size: 13px; }
    .role-row__desc { display: block; color: #6B5BA0; font-size: 12px; margin-top: 2px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    @media (max-width: 720px) { .row-2 { grid-template-columns: 1fr; } }
  `],
})
export class InviteUserFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(IdentityApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving        = signal(false);
  readonly apiError      = signal<string | null>(null);
  readonly roles         = signal<RoleDto[]>([]);
  readonly rolesLoading  = signal(true);
  readonly selectedRoleIds = signal<Set<number>>(new Set());

  readonly form = this.fb.nonNullable.group({
    email:       ['', [Validators.required, Validators.email]],
    displayName: ['', [Validators.required, Validators.maxLength(200)]],
    countryCode: ['IN', [Validators.required]],
  });

  async ngOnInit() {
    try {
      this.roles.set(await this.api.listRoles());
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Failed to load roles');
    } finally {
      this.rolesLoading.set(false);
    }
  }

  toggleRole(id: number, checked: boolean) {
    const next = new Set(this.selectedRoleIds());
    if (checked) next.add(id); else next.delete(id);
    this.selectedRoleIds.set(next);
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: InviteUserRequest = {
      email:       v.email,
      displayName: v.displayName,
      countryCode: v.countryCode,
      roleIds:     Array.from(this.selectedRoleIds()),
    };

    try {
      const u = await this.api.inviteUser(req);
      this.snack.open(`Invitation sent to ${u.email}`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/identity/users']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Invite failed');
    } finally {
      this.saving.set(false);
    }
  }
}

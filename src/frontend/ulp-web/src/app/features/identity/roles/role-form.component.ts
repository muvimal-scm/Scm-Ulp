import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IdentityApiService } from '../shared/identity-api.service';
import { CreateRoleRequest, PermissionDto } from '../shared/identity-types';

@Component({
  selector: 'ulp-identity-role-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatCheckboxModule, MatFormFieldModule,
    MatIconModule, MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/identity/roles" class="back-link">‹ Back to roles</a>
      <h1>New Role</h1>
      <p>Custom tenant role. System roles ({{ '\\'PlatformAdmin\\'' }}, OrgAdmin, etc.) are seeded — these are tenant-defined.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Code</mat-label>
          <input matInput formControlName="code" maxlength="50" placeholder="WAREHOUSE_LEAD" />
          @if (form.get('code')?.hasError('required')) { <mat-error>Required</mat-error> }
          @else if (form.get('code')?.hasError('pattern')) { <mat-error>UPPER_SNAKE only</mat-error> }
          <mat-hint>UPPER_SNAKE; unique per tenant</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" maxlength="200" />
          @if (form.get('name')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Description</mat-label>
        <input matInput formControlName="description" maxlength="500" />
      </mat-form-field>

      <h2 class="section">Permissions</h2>
      @if (permsLoading()) {
        <p class="muted">Loading permissions…</p>
      } @else if (permissions().length === 0) {
        <p class="muted">No permissions seeded.</p>
      } @else {
        <input matInput class="filter-input" placeholder="Filter permissions…" (input)="filterPerms($event)" />
        <div class="perms">
          @for (g of permGroups(); track g.module) {
            <div class="perm-group">
              <div class="perm-group__h">
                <strong>{{ g.module }}</strong>
                <span class="muted">{{ countSelectedInGroup(g.module) }} of {{ g.perms.length }} selected</span>
              </div>
              <div class="perm-grid">
                @for (p of g.perms; track p.id) {
                  <label class="perm">
                    <mat-checkbox [checked]="selectedPermIds().has(p.id)" (change)="togglePerm(p.id, $event.checked)">
                      <code>{{ p.code }}</code>
                      @if (p.description) { <span class="muted"> — {{ p.description }}</span> }
                    </mat-checkbox>
                  </label>
                }
              </div>
            </div>
          }
        </div>
      }

      <div class="actions">
        <button mat-button type="button" routerLink="/app/identity/roles" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create Role }
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
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 24px; max-width: 1100px; }
    .section { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full { width: 100%; }
    mat-form-field { width: 100%; }
    .muted { color: #9A9AA3; font-size: 12px; }
    .filter-input { width: 100%; padding: 10px 12px; border: 1px solid #E8E2F4; border-radius: 8px; font-family: inherit; font-size: 13px; margin-bottom: 12px; }
    .perms { display: grid; gap: 12px; margin-bottom: 16px; }
    .perm-group { padding: 12px; background: #FAFAFC; border: 1px solid #EFEFF3; border-radius: 8px; }
    .perm-group__h { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: baseline; }
    .perm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 4px 12px; }
    .perm { padding: 4px 0; font-size: 13px; }
    .perm code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'JetBrains Mono', Consolas, monospace; color: #3F2D7C; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    @media (max-width: 720px) { .row-2 { grid-template-columns: 1fr; } }
  `],
})
export class RoleFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(IdentityApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving           = signal(false);
  readonly apiError         = signal<string | null>(null);
  readonly permissions      = signal<PermissionDto[]>([]);
  readonly permsLoading     = signal(true);
  readonly selectedPermIds  = signal<Set<number>>(new Set());
  readonly filterText       = signal('');

  readonly form = this.fb.nonNullable.group({
    code:        ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Z][A-Z0-9_]*$/)]],
    name:        ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
  });

  permGroups() {
    const filter = this.filterText().toLowerCase();
    const filtered = filter
      ? this.permissions().filter(p => p.code.toLowerCase().includes(filter) || (p.description ?? '').toLowerCase().includes(filter))
      : this.permissions();
    const map = new Map<string, PermissionDto[]>();
    for (const p of filtered) {
      const moduleCode = p.code.split('.')[0] || 'other';
      if (!map.has(moduleCode)) map.set(moduleCode, []);
      map.get(moduleCode)!.push(p);
    }
    return Array.from(map.entries())
      .map(([module, perms]) => ({ module, perms }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }

  countSelectedInGroup(moduleCode: string): number {
    const selected = this.selectedPermIds();
    return this.permissions()
      .filter(p => p.code.startsWith(moduleCode + '.') && selected.has(p.id))
      .length;
  }

  filterPerms(ev: Event) {
    this.filterText.set((ev.target as HTMLInputElement).value);
  }

  togglePerm(id: number, checked: boolean) {
    const next = new Set(this.selectedPermIds());
    if (checked) next.add(id); else next.delete(id);
    this.selectedPermIds.set(next);
  }

  async ngOnInit() {
    try {
      this.permissions.set(await this.api.listPermissions());
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Failed to load permissions');
    } finally {
      this.permsLoading.set(false);
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateRoleRequest = {
      code:          v.code,
      name:          v.name,
      description:   v.description || undefined,
      permissionIds: Array.from(this.selectedPermIds()),
    };

    try {
      await this.api.createRole(req);
      this.snack.open(`Role ${v.code} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/identity/roles']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

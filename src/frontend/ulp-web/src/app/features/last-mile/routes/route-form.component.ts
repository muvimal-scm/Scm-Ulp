import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LastMileApiService } from '../shared/last-mile-api.service';
import { CreateRouteRequest, RouteType } from '../shared/last-mile-types';

@Component({
  selector: 'ulp-lastmile-route-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/last-mile/routes" class="back-link">‹ Back to routes</a>
      <h1>New Route</h1>
      <p>Plan a delivery / pickup route. Stops are added on the route detail screen.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Country code</mat-label>
          <mat-select formControlName="countryCode">
            <mat-option value="IN">IN — India</mat-option>
            <mat-option value="US">US — United States</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Route code</mat-label>
          <input matInput formControlName="routeCode" maxlength="50" />
          @if (form.get('routeCode')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Type</mat-label>
          <mat-select formControlName="routeType">
            <mat-option value="Pickup">Pickup</mat-option>
            <mat-option value="Delivery">Delivery</mat-option>
            <mat-option value="Mixed">Mixed</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" maxlength="200" />
      </mat-form-field>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Planned date</mat-label>
          <input matInput formControlName="plannedDate" type="date" />
          @if (form.get('plannedDate')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Driver user ID</mat-label>
          <input matInput formControlName="driverUserId" type="number" min="1" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Vehicle #</mat-label>
          <input matInput formControlName="vehicleNo" maxlength="50" />
        </mat-form-field>
      </div>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/last-mile/routes" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create Route }
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
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .full { width: 100%; }
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    @media (max-width: 720px) { .row-3 { grid-template-columns: 1fr; } }
  `],
})
export class RouteFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(LastMileApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    countryCode:  ['IN' as 'IN' | 'US', [Validators.required]],
    routeCode:    ['', [Validators.required, Validators.maxLength(50)]],
    name:         [''],
    routeType:    ['Delivery' as RouteType, [Validators.required]],
    plannedDate:  ['', [Validators.required]],
    driverUserId: [null as number | null],
    vehicleNo:    [''],
  });

  ngOnInit() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const hhmm = `${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
    this.form.patchValue({
      routeCode:   `RT-${yyyymmdd}-${hhmm}`,
      plannedDate: today.toISOString().slice(0, 10),
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateRouteRequest = {
      countryCode:  v.countryCode,
      routeCode:    v.routeCode,
      name:         v.name      || null,
      routeType:    v.routeType,
      plannedDate:  v.plannedDate,
      driverUserId: v.driverUserId,
      vehicleNo:    v.vehicleNo || null,
    };

    try {
      const r = await this.api.createRoute(req);
      this.snack.open(`Route ${r.routeCode} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/last-mile/routes']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

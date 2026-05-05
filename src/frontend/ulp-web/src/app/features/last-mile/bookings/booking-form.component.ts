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
import { CourierType, CreateCourierBookingRequest } from '../shared/last-mile-types';

@Component({
  selector: 'ulp-lastmile-booking-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/last-mile/bookings" class="back-link">‹ Back to bookings</a>
      <h1>New Courier Booking</h1>
      <p>Last-mile delivery booking — pickup, delivery, weight, COD if applicable.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <h2 class="section">Identity</h2>
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Country code</mat-label>
          <mat-select formControlName="countryCode">
            <mat-option value="IN">IN — India</mat-option>
            <mat-option value="US">US — United States</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Booking #</mat-label>
          <input matInput formControlName="bookingNumber" maxlength="50" />
          @if (form.get('bookingNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Courier type</mat-label>
          <mat-select formControlName="courierType">
            <mat-option value="Domestic">Domestic</mat-option>
            <mat-option value="International">International</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <h2 class="section">Parties &amp; addresses</h2>
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Shipper party ID</mat-label>
          <input matInput formControlName="shipperPartyId" type="number" min="1" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Consignee party ID</mat-label>
          <input matInput formControlName="consigneePartyId" type="number" min="1" />
        </mat-form-field>
      </div>
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Pickup address ID</mat-label>
          <input matInput formControlName="pickupAddressId" type="number" min="1" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Delivery address ID</mat-label>
          <input matInput formControlName="deliveryAddressId" type="number" min="1" />
        </mat-form-field>
      </div>

      <h2 class="section">Cargo</h2>
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Weight (kg)</mat-label>
          <input matInput formControlName="weightKg" type="number" min="0" step="0.01" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Pieces</mat-label>
          <input matInput formControlName="pieces" type="number" min="1" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Service level</mat-label>
          <mat-select formControlName="serviceLevel">
            <mat-option value="">— none —</mat-option>
            <mat-option value="SameDay">Same day</mat-option>
            <mat-option value="NextDay">Next day</mat-option>
            <mat-option value="Standard">Standard</mat-option>
            <mat-option value="Economy">Economy</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Declared value</mat-label>
          <input matInput formControlName="declaredValueAmount" type="number" min="0" step="0.01" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Currency</mat-label>
          <mat-select formControlName="declaredValueCurrency">
            <mat-option value="">— none —</mat-option>
            <mat-option value="INR">INR</mat-option>
            <mat-option value="USD">USD</mat-option>
            <mat-option value="EUR">EUR</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <h2 class="section">COD (if applicable)</h2>
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>COD amount</mat-label>
          <input matInput formControlName="codAmount" type="number" min="0" step="0.01" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>COD currency</mat-label>
          <mat-select formControlName="codCurrency">
            <mat-option value="">— none —</mat-option>
            <mat-option value="INR">INR</mat-option>
            <mat-option value="USD">USD</mat-option>
            <mat-option value="EUR">EUR</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/last-mile/bookings" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create Booking }
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
    .section:first-of-type { margin-top: 0; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    @media (max-width: 720px) { .row-2, .row-3 { grid-template-columns: 1fr; } }
  `],
})
export class CourierBookingFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(LastMileApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    countryCode:           ['IN' as 'IN' | 'US', [Validators.required]],
    bookingNumber:         ['', [Validators.required, Validators.maxLength(50)]],
    courierType:           ['Domestic' as CourierType, [Validators.required]],
    shipperPartyId:        [null as number | null],
    consigneePartyId:      [null as number | null],
    pickupAddressId:       [null as number | null],
    deliveryAddressId:     [null as number | null],
    weightKg:              [null as number | null],
    pieces:                [null as number | null],
    serviceLevel:          [''],
    declaredValueAmount:   [null as number | null],
    declaredValueCurrency: [''],
    codAmount:             [null as number | null],
    codCurrency:           [''],
  });

  ngOnInit() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const hhmm = `${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
    this.form.patchValue({ bookingNumber: `LMB-${yyyymmdd}-${hhmm}` });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateCourierBookingRequest = {
      countryCode:           v.countryCode,
      bookingNumber:         v.bookingNumber,
      courierType:           v.courierType,
      shipperPartyId:        v.shipperPartyId,
      consigneePartyId:      v.consigneePartyId,
      pickupAddressId:       v.pickupAddressId,
      deliveryAddressId:     v.deliveryAddressId,
      weightKg:              v.weightKg,
      pieces:                v.pieces,
      serviceLevel:          v.serviceLevel || null,
      declaredValueAmount:   v.declaredValueAmount,
      declaredValueCurrency: v.declaredValueCurrency || null,
      codAmount:             v.codAmount,
      codCurrency:           v.codCurrency || null,
    };

    try {
      const b = await this.api.createBooking(req);
      this.snack.open(`Booking ${b.bookingNumber} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/last-mile/bookings', b.id]);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

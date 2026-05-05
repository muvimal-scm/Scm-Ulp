import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FreightForwardingApiService } from '../shared/freight-forwarding-api.service';
import {
  CreateBookingRequest, ServiceType, TradeDirection, TransportMode,
} from '../shared/freight-forwarding-types';

@Component({
  selector: 'ulp-ff-booking-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/freight-forwarding/bookings" class="back-link">‹ Back to bookings</a>
      <h1>New Booking</h1>
      <p>Create a new freight booking. Booking number is immutable once created.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <h2 class="section">Identity</h2>
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Country code</mat-label>
          <mat-select formControlName="countryCode">
            <mat-option value="IN">IN — India</mat-option>
            <mat-option value="US">US — United States</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Booking #</mat-label>
          <input matInput formControlName="bookingNumber" maxlength="50" placeholder="BKG-2026-0001" />
          @if (form.get('bookingNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>Immutable; e.g. BKG-2026-0001</mat-hint>
        </mat-form-field>
      </div>

      <h2 class="section">Trade lane</h2>
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Trade direction</mat-label>
          <mat-select formControlName="tradeDirection">
            <mat-option value="Import">Import</mat-option>
            <mat-option value="Export">Export</mat-option>
            <mat-option value="CrossTrade">Cross-trade</mat-option>
            <mat-option value="Domestic">Domestic</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Mode</mat-label>
          <mat-select formControlName="mode">
            <mat-option value="Air">Air</mat-option>
            <mat-option value="OceanFcl">Ocean FCL</mat-option>
            <mat-option value="OceanLcl">Ocean LCL</mat-option>
            <mat-option value="Road">Road</mat-option>
            <mat-option value="Rail">Rail</mat-option>
            <mat-option value="Multimodal">Multimodal</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Service type</mat-label>
          <mat-select formControlName="serviceType">
            <mat-option value="DoorDoor">Door / Door</mat-option>
            <mat-option value="DoorPort">Door / Port</mat-option>
            <mat-option value="PortDoor">Port / Door</mat-option>
            <mat-option value="PortPort">Port / Port</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Origin port ID</mat-label>
          <input matInput formControlName="originPortId" type="number" min="1" />
          @if (form.get('originPortId')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Destination port ID</mat-label>
          <input matInput formControlName="destinationPortId" type="number" min="1" />
          @if (form.get('destinationPortId')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Incoterm</mat-label>
          <mat-select formControlName="incoterm">
            <mat-option value="">— none —</mat-option>
            <mat-option value="EXW">EXW</mat-option>
            <mat-option value="FCA">FCA</mat-option>
            <mat-option value="FOB">FOB</mat-option>
            <mat-option value="CFR">CFR</mat-option>
            <mat-option value="CIF">CIF</mat-option>
            <mat-option value="DAP">DAP</mat-option>
            <mat-option value="DDP">DDP</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <h2 class="section">Parties</h2>
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Customer party ID</mat-label>
          <input matInput formControlName="customerPartyId" type="number" min="1" />
          @if (form.get('customerPartyId')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>FK to m1_party — see Master Data → Parties</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Shipper party ID</mat-label>
          <input matInput formControlName="shipperPartyId" type="number" min="1" />
        </mat-form-field>
      </div>
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Consignee party ID</mat-label>
          <input matInput formControlName="consigneePartyId" type="number" min="1" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Notify party ID</mat-label>
          <input matInput formControlName="notifyPartyId" type="number" min="1" />
        </mat-form-field>
      </div>

      <h2 class="section">Schedule &amp; value</h2>
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Expected pickup</mat-label>
          <input matInput formControlName="expectedPickupDate" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Expected delivery</mat-label>
          <input matInput formControlName="expectedDeliveryDate" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Estimated CRD</mat-label>
          <input matInput formControlName="estimatedCrd" type="date" />
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

      <mat-form-field appearance="outline" class="full">
        <mat-label>Remarks</mat-label>
        <textarea matInput formControlName="remarks" rows="3" maxlength="2000"></textarea>
      </mat-form-field>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/freight-forwarding/bookings" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create booking }
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
    .full { width: 100%; }
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    @media (max-width: 720px) {
      .row-2, .row-3 { grid-template-columns: 1fr; }
    }
  `],
})
export class BookingFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(FreightForwardingApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    countryCode:           ['IN' as 'IN' | 'US', [Validators.required]],
    bookingNumber:         ['', [Validators.required, Validators.maxLength(50)]],
    customerPartyId:       [0, [Validators.required, Validators.min(1)]],
    shipperPartyId:        [null as number | null],
    consigneePartyId:      [null as number | null],
    notifyPartyId:         [null as number | null],
    tradeDirection:        ['Import' as TradeDirection, [Validators.required]],
    mode:                  ['OceanFcl' as TransportMode, [Validators.required]],
    serviceType:           ['PortPort' as ServiceType, [Validators.required]],
    incoterm:              [''],
    originPortId:          [0, [Validators.required, Validators.min(1)]],
    destinationPortId:     [0, [Validators.required, Validators.min(1)]],
    expectedPickupDate:    [''],
    expectedDeliveryDate:  [''],
    declaredValueAmount:   [null as number | null],
    declaredValueCurrency: [''],
    estimatedCrd:          [''],
    remarks:               [''],
  });

  ngOnInit() {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dd = `${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    this.form.patchValue({ bookingNumber: `BKG-${yyyymm}-${dd}` });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateBookingRequest = {
      countryCode:           v.countryCode,
      bookingNumber:         v.bookingNumber,
      customerPartyId:       v.customerPartyId,
      shipperPartyId:        v.shipperPartyId   || null,
      consigneePartyId:      v.consigneePartyId || null,
      notifyPartyId:         v.notifyPartyId    || null,
      tradeDirection:        v.tradeDirection,
      mode:                  v.mode,
      serviceType:           v.serviceType,
      incoterm:              v.incoterm        || null,
      originPortId:          v.originPortId,
      destinationPortId:     v.destinationPortId,
      expectedPickupDate:    v.expectedPickupDate   || null,
      expectedDeliveryDate:  v.expectedDeliveryDate || null,
      declaredValueAmount:   v.declaredValueAmount  || null,
      declaredValueCurrency: v.declaredValueCurrency || null,
      estimatedCrd:          v.estimatedCrd || null,
      remarks:               v.remarks      || null,
    };

    try {
      const b = await this.api.createBooking(req);
      this.snack.open(`Booking ${b.bookingNumber} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/freight-forwarding/bookings', b.id]);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

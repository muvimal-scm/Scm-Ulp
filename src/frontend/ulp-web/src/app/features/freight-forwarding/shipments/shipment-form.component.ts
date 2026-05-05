import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FreightForwardingApiService } from '../shared/freight-forwarding-api.service';
import { CreateShipmentRequest, TransportMode } from '../shared/freight-forwarding-types';

@Component({
  selector: 'ulp-ff-shipment-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/freight-forwarding/shipments" class="back-link">‹ Back to shipments</a>
      <h1>New Shipment</h1>
      <p>Create a new MBL/HBL/AWB shipment. Add containers, milestones, charges, and documents from the shipment detail page.</p>
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
          <mat-label>Shipment #</mat-label>
          <input matInput formControlName="shipmentNumber" maxlength="50" placeholder="SHP-2026-0001" />
          @if (form.get('shipmentNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>Immutable; e.g. SHP-2026-0001</mat-hint>
        </mat-form-field>
      </div>

      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Linked booking ID</mat-label>
          <input matInput formControlName="bookingId" type="number" min="1" />
          <mat-hint>Optional — pre-filled when creating from a Booking</mat-hint>
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
      </div>

      <h2 class="section">Carrier &amp; voyage</h2>
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Carrier party ID</mat-label>
          <input matInput formControlName="carrierPartyId" type="number" min="1" />
          @if (form.get('carrierPartyId')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>FK to m1_party (Carrier)</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Vessel / flight name</mat-label>
          <input matInput formControlName="vesselOrFlight" maxlength="100" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Voyage / flight #</mat-label>
          <input matInput formControlName="voyageOrFlightNo" maxlength="50" />
        </mat-form-field>
      </div>

      <h2 class="section">Lane &amp; schedule</h2>
      <div class="row-2">
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
      </div>

      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>ETD</mat-label>
          <input matInput formControlName="etd" type="datetime-local" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>ETA</mat-label>
          <input matInput formControlName="eta" type="datetime-local" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Remarks</mat-label>
        <textarea matInput formControlName="remarks" rows="3" maxlength="2000"></textarea>
      </mat-form-field>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/freight-forwarding/shipments" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create shipment }
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
export class ShipmentFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(FreightForwardingApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    countryCode:       ['IN' as 'IN' | 'US', [Validators.required]],
    shipmentNumber:    ['', [Validators.required, Validators.maxLength(50)]],
    bookingId:         [null as number | null],
    mode:              ['OceanFcl' as TransportMode, [Validators.required]],
    carrierPartyId:    [0, [Validators.required, Validators.min(1)]],
    vesselOrFlight:    [''],
    voyageOrFlightNo:  [''],
    etd:               [''],
    eta:               [''],
    originPortId:      [0, [Validators.required, Validators.min(1)]],
    destinationPortId: [0, [Validators.required, Validators.min(1)]],
    remarks:           [''],
  });

  ngOnInit() {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dd = `${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    this.form.patchValue({ shipmentNumber: `SHP-${yyyymm}-${dd}` });

    // Pre-fill from query: ?bookingId=42&mode=OceanFcl
    const q = this.route.snapshot.queryParamMap;
    const bId = q.get('bookingId');
    const md  = q.get('mode');
    if (bId) this.form.patchValue({ bookingId: Number(bId) });
    if (md)  this.form.patchValue({ mode: md as TransportMode });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateShipmentRequest = {
      countryCode:       v.countryCode,
      shipmentNumber:    v.shipmentNumber,
      bookingId:         v.bookingId || null,
      mode:              v.mode,
      carrierPartyId:    v.carrierPartyId,
      vesselOrFlight:    v.vesselOrFlight   || null,
      voyageOrFlightNo:  v.voyageOrFlightNo || null,
      etd:               v.etd ? new Date(v.etd).toISOString() : null,
      eta:               v.eta ? new Date(v.eta).toISOString() : null,
      originPortId:      v.originPortId,
      destinationPortId: v.destinationPortId,
      remarks:           v.remarks || null,
    };

    try {
      const s = await this.api.createShipment(req);
      this.snack.open(`Shipment ${s.shipmentNumber} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/freight-forwarding/shipments', s.id]);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

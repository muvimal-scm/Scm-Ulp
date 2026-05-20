import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LastMileApiService } from '../shared/last-mile-api.service';

@Component({
  selector: 'ulp-drayage-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule,
            MatSelectModule, MatCheckboxModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-page">
      <header class="page-head">
        <h1>{{ isEdit() ? 'Edit' : 'New' }} Ocean Drayage Job</h1>
      </header>
      <form [formGroup]="form" (ngSubmit)="save()" class="form-card">
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Job #</mat-label>
            <input matInput formControlName="jobNumber" placeholder="OD2026-0000001" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Container #</mat-label>
            <input matInput formControlName="containerNumber" placeholder="MAEU1234567" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Additional Refs (PO#, PI#)</mat-label>
            <input matInput formControlName="additionalRefs" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Terminal</mat-label>
            <input matInput formControlName="terminal" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Pickup Appointment</mat-label>
            <input matInput formControlName="pickupAppointment" type="datetime-local" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Drop Off Location</mat-label>
            <input matInput formControlName="dropOffLocation" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Drop Off Appointment</mat-label>
            <input matInput formControlName="dropOffAppointment" type="datetime-local" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Trip Type</mat-label>
            <mat-select formControlName="tripType">
              <mat-option value="LiveUnload">Live Unload</mat-option>
              <mat-option value="Drop">Drop</mat-option>
            </mat-select>
          </mat-form-field>
          @if (isEdit()) {
            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="OutGate">Out-Gate</mat-option>
                <mat-option value="EnRoute">En-Route</mat-option>
                <mat-option value="ContainerMarkedEmpty">Container Marked Empty</mat-option>
                <mat-option value="EmptyReturned">Empty Returned</mat-option>
              </mat-select>
            </mat-form-field>
          }
          <mat-form-field appearance="outline" class="full">
            <mat-label>Special Instructions (lift gate, pallet jack, reefer)</mat-label>
            <textarea matInput formControlName="specialInstructions" rows="2"></textarea>
          </mat-form-field>
        </div>
        <mat-checkbox formControlName="availableForPickup" color="primary" style="margin-bottom:16px">
          Available for Pick Up
        </mat-checkbox>
        @if (error()) {
          <div class="error-msg"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
        }
        <div class="form-actions">
          <button mat-stroked-button type="button" (click)="cancel()">Cancel</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
            @if (saving()) { <mat-spinner diameter="18"></mat-spinner> } @else { Save }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .form-page { max-width:860px;margin:0 auto; }
    .page-head h1 { font-size:24px;font-weight:800;margin:0 0 20px;
      background:linear-gradient(90deg,#E54A8A,#5B3FA0,#3F2D7C);
      -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent; }
    .form-card { background:#fff;border:1px solid #E8E2F4;border-radius:12px;padding:24px;
      box-shadow:0 4px 16px rgba(63,45,124,.06); }
    .form-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px; }
    .full { grid-column:1/-1; }
    .form-actions { display:flex;gap:12px;justify-content:flex-end;margin-top:16px; }
    .error-msg { color:#B23F45;display:flex;align-items:center;gap:6px;margin:12px 0;font-size:13px; }
  `],
})
export class DrayageFormComponent implements OnInit {
  private readonly api    = inject(LastMileApiService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly fb     = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);
  readonly isEdit = signal(false);
  private jobId?: number;

  readonly form = this.fb.group({
    jobNumber: ['', Validators.required],
    containerNumber: ['', Validators.required],
    additionalRefs: [''],
    terminal: [''],
    pickupAppointment: [''],
    dropOffLocation: [''],
    dropOffAppointment: [''],
    tripType: ['LiveUnload', Validators.required],
    status: ['OutGate'],
    specialInstructions: [''],
    availableForPickup: [false],
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.jobId = Number(id);
      try {
        const job = await this.api.getOdJob(this.jobId);
        this.form.patchValue({
          jobNumber: job.jobNumber, containerNumber: job.containerNumber,
          additionalRefs: job.additionalRefs ?? '', terminal: job.terminal ?? '',
          pickupAppointment: job.pickupAppointment?.slice(0, 16) ?? '',
          dropOffLocation: job.dropOffLocation ?? '',
          dropOffAppointment: job.dropOffAppointment?.slice(0, 16) ?? '',
          tripType: job.tripType, status: job.status,
          specialInstructions: job.specialInstructions ?? '',
          availableForPickup: job.availableForPickup,
        });
      } catch {}
    }
  }

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true); this.error.set(null);
    const appt = (s: string | null | undefined) => s ? new Date(s).toISOString() : undefined;
    try {
      const v = this.form.value;
      if (this.isEdit() && this.jobId) {
        await this.api.updateOdJob(this.jobId, {
          containerNumber: v.containerNumber ?? undefined,
          additionalRefs: v.additionalRefs || undefined,
          terminal: v.terminal || undefined,
          pickupAppointment: appt(v.pickupAppointment),
          dropOffLocation: v.dropOffLocation || undefined,
          dropOffAppointment: appt(v.dropOffAppointment),
          tripType: v.tripType ?? undefined,
          status: v.status ?? undefined,
          specialInstructions: v.specialInstructions || undefined,
          availableForPickup: v.availableForPickup ?? undefined,
        });
      } else {
        await this.api.createOdJob({
          jobNumber: v.jobNumber!, containerNumber: v.containerNumber!,
          additionalRefs: v.additionalRefs || undefined,
          availableForPickup: v.availableForPickup ?? false,
          terminal: v.terminal || undefined,
          pickupAppointment: appt(v.pickupAppointment),
          dropOffLocation: v.dropOffLocation || undefined,
          dropOffAppointment: appt(v.dropOffAppointment),
          tripType: v.tripType!,
          specialInstructions: v.specialInstructions || undefined,
        });
      }
      this.router.navigate(['../..'], { relativeTo: this.route });
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally { this.saving.set(false); }
  }

  cancel() { this.router.navigate(['../..'], { relativeTo: this.route }); }
}

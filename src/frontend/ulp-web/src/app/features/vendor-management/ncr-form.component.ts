import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VendorManagementApiService } from './shared/vendor-management-api.service';
import { NcrSeverity, RaiseNcrRequest } from './shared/vendor-management-types';

@Component({
  selector: 'ulp-ncr-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/vendor-management" class="back-link">‹ Back to vendors</a>
      <h1>Raise NCR (Non-Conformance Report)</h1>
      <p>Record a quality / SLA / compliance breach against a vendor. Use higher severity for critical issues.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Vendor ID</mat-label>
          <input matInput formControlName="vendorId" type="number" min="1" />
          @if (form.get('vendorId')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>Pre-filled from ?vendorId=X</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>NCR number</mat-label>
          <input matInput formControlName="ncrNumber" maxlength="50" />
          @if (form.get('ncrNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Severity</mat-label>
          <mat-select formControlName="severity">
            <mat-option value="Low">Low</mat-option>
            <mat-option value="Medium">Medium</mat-option>
            <mat-option value="High">High</mat-option>
            <mat-option value="Critical">Critical</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Description</mat-label>
        <textarea matInput formControlName="description" rows="4" maxlength="2000"></textarea>
        @if (form.get('description')?.hasError('required')) { <mat-error>Required</mat-error> }
      </mat-form-field>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <input matInput formControlName="category" maxlength="100" placeholder="Quality, Delivery, Documentation, …" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Related module</mat-label>
          <mat-select formControlName="relatedModule">
            <mat-option value="">— none —</mat-option>
            <mat-option value="M5">M5 — Freight Forwarding</mat-option>
            <mat-option value="M7">M7 — Procurement</mat-option>
            <mat-option value="M8">M8 — WMS</mat-option>
            <mat-option value="M13">M13 — Transportation</mat-option>
            <mat-option value="M17">M17 — Accounting</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Related entity ID</mat-label>
          <input matInput formControlName="relatedEntityId" type="number" min="1" />
          <mat-hint>Optional</mat-hint>
        </mat-form-field>
      </div>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/vendor-management" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Raise NCR }
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
export class NcrFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(VendorManagementApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    vendorId:        [0, [Validators.required, Validators.min(1)]],
    ncrNumber:       ['', [Validators.required, Validators.maxLength(50)]],
    severity:        ['Medium' as NcrSeverity, [Validators.required]],
    description:     ['', [Validators.required, Validators.maxLength(2000)]],
    category:        [''],
    relatedModule:   [''],
    relatedEntityId: [null as number | null],
  });

  ngOnInit() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const hhmm = `${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
    this.form.patchValue({ ncrNumber: `NCR-${yyyymmdd}-${hhmm}` });

    const vId = this.route.snapshot.queryParamMap.get('vendorId');
    if (vId) this.form.patchValue({ vendorId: Number(vId) });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: RaiseNcrRequest = {
      vendorId:        v.vendorId,
      ncrNumber:       v.ncrNumber,
      severity:        v.severity,
      description:     v.description,
      category:        v.category      || null,
      relatedModule:   v.relatedModule || null,
      relatedEntityId: v.relatedEntityId,
    };

    try {
      const n = await this.api.raiseNcr(req);
      this.snack.open(`NCR ${n.ncrNumber} raised`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/vendor-management', n.vendorId]);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

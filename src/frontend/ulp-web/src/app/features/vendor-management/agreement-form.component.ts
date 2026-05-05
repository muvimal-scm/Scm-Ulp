import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VendorManagementApiService } from './shared/vendor-management-api.service';
import { AgreementType, CreateAgreementRequest } from './shared/vendor-management-types';

@Component({
  selector: 'ulp-agreement-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatCheckboxModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a [routerLink]="['/app/vendor-management', vendorId()]" class="back-link">‹ Back to vendor</a>
      <h1>New Agreement</h1>
      <p>Create an MSA / SOW / SLA / NDA / Rate Card with this vendor.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Type</mat-label>
          <mat-select formControlName="agreementType">
            <mat-option value="MSA">MSA — Master Services</mat-option>
            <mat-option value="SOW">SOW — Statement of Work</mat-option>
            <mat-option value="SLA">SLA — Service Level</mat-option>
            <mat-option value="NDA">NDA — Non-Disclosure</mat-option>
            <mat-option value="RATE_CARD">Rate Card</mat-option>
            <mat-option value="OTHER">Other</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Agreement number</mat-label>
          <input matInput formControlName="agreementNumber" maxlength="50" />
          @if (form.get('agreementNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Document ID</mat-label>
          <input matInput formControlName="documentId" type="number" min="1" />
          <mat-hint>FK to m21_document (optional)</mat-hint>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Title</mat-label>
        <input matInput formControlName="title" maxlength="255" />
        @if (form.get('title')?.hasError('required')) { <mat-error>Required</mat-error> }
      </mat-form-field>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Start date</mat-label>
          <input matInput formControlName="startDate" type="date" />
          @if (form.get('startDate')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>End date</mat-label>
          <input matInput formControlName="endDate" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Renewal notice (days)</mat-label>
          <input matInput formControlName="renewalNoticeDays" type="number" min="0" />
        </mat-form-field>
      </div>

      <mat-checkbox formControlName="autoRenewal">Auto-renew at end of term</mat-checkbox>

      <div class="actions">
        <button mat-button type="button" [routerLink]="['/app/vendor-management', vendorId()]" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create Agreement }
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
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    @media (max-width: 720px) { .row-3 { grid-template-columns: 1fr; } }
  `],
})
export class AgreementFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(VendorManagementApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly vendorId = signal<number>(0);
  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    agreementType:     ['MSA' as AgreementType, [Validators.required]],
    agreementNumber:   ['', [Validators.required, Validators.maxLength(50)]],
    title:             ['', [Validators.required, Validators.maxLength(255)]],
    startDate:         ['', [Validators.required]],
    endDate:           [''],
    autoRenewal:       [false],
    renewalNoticeDays: [null as number | null],
    documentId:        [null as number | null],
  });

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) this.vendorId.set(Number(idParam));

    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const hhmm = `${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
    this.form.patchValue({
      agreementNumber: `AGR-${yyyymmdd}-${hhmm}`,
      startDate:       today.toISOString().slice(0, 10),
    });
  }

  async onSubmit() {
    if (this.form.invalid || !this.vendorId()) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateAgreementRequest = {
      agreementType:     v.agreementType,
      agreementNumber:   v.agreementNumber,
      title:             v.title,
      startDate:         v.startDate,
      endDate:           v.endDate || null,
      autoRenewal:       v.autoRenewal,
      renewalNoticeDays: v.renewalNoticeDays,
      documentId:        v.documentId,
    };

    try {
      const a = await this.api.createAgreement(this.vendorId(), req);
      this.snack.open(`Agreement ${a.agreementNumber} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/vendor-management', this.vendorId()]);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

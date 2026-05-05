import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProcurementApiService } from '../shared/procurement-api.service';
import { CreateRfqRequest } from '../shared/procurement-types';

@Component({
  selector: 'ulp-procurement-rfq-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/procurement/rfqs" class="back-link">‹ Back to RFQs</a>
      <h1>New Procurement RFQ</h1>
      <p>Solicit vendor responses for a Purchase Requisition. Send to recipients, collect responses, then convert to PO.</p>
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
          <mat-label>RFQ number</mat-label>
          <input matInput formControlName="rfqNumber" maxlength="50" />
          @if (form.get('rfqNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Due date</mat-label>
          <input matInput formControlName="dueDate" type="date" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Scope PR ID</mat-label>
        <input matInput formControlName="scopePrId" type="number" min="1" />
        <mat-hint>Optional — link to a specific Purchase Requisition</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Notes</mat-label>
        <textarea matInput formControlName="notes" rows="3" maxlength="2000"></textarea>
      </mat-form-field>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/procurement/rfqs" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create RFQ }
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
export class ProcurementRfqFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(ProcurementApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    countryCode: ['IN' as 'IN' | 'US', [Validators.required]],
    rfqNumber:   ['', [Validators.required, Validators.maxLength(50)]],
    dueDate:     [''],
    scopePrId:   [null as number | null],
    notes:       [''],
  });

  ngOnInit() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const hhmm = `${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
    this.form.patchValue({ rfqNumber: `RFQ-P-${yyyymmdd}-${hhmm}` });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateRfqRequest = {
      countryCode: v.countryCode,
      rfqNumber:   v.rfqNumber,
      dueDate:     v.dueDate   || null,
      scopePrId:   v.scopePrId || null,
      notes:       v.notes     || null,
    };

    try {
      const r = await this.api.createRfq(req);
      this.snack.open(`RFQ ${r.rfqNumber} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/procurement/rfqs', r.id]);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccountingExtApiService } from '../shared/accounting-ext-api.service';
import {
  CreateGeneralExpenseRequest, ExpenseRecurrence, GeneralExpenseKind,
} from '../shared/accounting-ext-types';

@Component({
  selector: 'ulp-acct-general-expense-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/accounting/general-expense" class="back-link">‹ Back to general expense</a>
      <h1>New General Expense</h1>
      <p>Recurring or one-time operating expense (rent, utilities, subscriptions, etc.).</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Expense #</mat-label>
          <input matInput formControlName="expenseNumber" maxlength="50" />
          @if (form.get('expenseNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Expense date</mat-label>
          <input matInput formControlName="expenseDate" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Kind</mat-label>
          <mat-select formControlName="expenseKind">
            <mat-option value="General">General (one-time)</mat-option>
            <mat-option value="FixedGeneral">Fixed General (recurring)</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Description</mat-label>
        <input matInput formControlName="description" maxlength="500" />
        @if (form.get('description')?.hasError('required')) { <mat-error>Required</mat-error> }
      </mat-form-field>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Expense account ID</mat-label>
          <input matInput formControlName="expenseAccountId" type="number" min="1" />
          @if (form.get('expenseAccountId')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>FK to m17_account</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Amount</mat-label>
          <input matInput formControlName="amount" type="number" min="0" step="0.01" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Currency</mat-label>
          <mat-select formControlName="currency">
            <mat-option value="INR">INR</mat-option>
            <mat-option value="USD">USD</mat-option>
            <mat-option value="EUR">EUR</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Recurrence</mat-label>
          <mat-select formControlName="recurrence">
            <mat-option value="OneTime">One-time</mat-option>
            <mat-option value="Monthly">Monthly</mat-option>
            <mat-option value="Quarterly">Quarterly</mat-option>
            <mat-option value="Yearly">Yearly</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Next recurrence date</mat-label>
          <input matInput formControlName="nextRecurDate" type="date" />
          <mat-hint>Required for recurring</mat-hint>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Notes</mat-label>
        <textarea matInput formControlName="notes" rows="2" maxlength="2000"></textarea>
      </mat-form-field>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/accounting/general-expense" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create Expense }
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
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .full { width: 100%; }
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    @media (max-width: 720px) { .row-2, .row-3 { grid-template-columns: 1fr; } }
  `],
})
export class GeneralExpenseFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(AccountingExtApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    expenseNumber:    ['', [Validators.required, Validators.maxLength(50)]],
    expenseDate:      ['', [Validators.required]],
    expenseKind:      ['General' as GeneralExpenseKind, [Validators.required]],
    description:      ['', [Validators.required, Validators.maxLength(500)]],
    expenseAccountId: [0, [Validators.required, Validators.min(1)]],
    amount:           [0, [Validators.required, Validators.min(0)]],
    currency:         ['INR', [Validators.required]],
    recurrence:       ['OneTime' as ExpenseRecurrence, [Validators.required]],
    nextRecurDate:    [''],
    notes:            [''],
  });

  ngOnInit() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const hhmm = `${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
    this.form.patchValue({
      expenseNumber: `EXP-${yyyymmdd}-${hhmm}`,
      expenseDate:   today.toISOString().slice(0, 10),
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateGeneralExpenseRequest = {
      expenseNumber:    v.expenseNumber,
      expenseDate:      v.expenseDate,
      expenseKind:      v.expenseKind,
      description:      v.description,
      expenseAccountId: v.expenseAccountId,
      amount:           v.amount,
      currency:         v.currency,
      recurrence:       v.recurrence,
      nextRecurDate:    v.nextRecurDate || null,
      notes:            v.notes         || null,
    };

    try {
      const e = await this.api.createGeneralExpense(req);
      this.snack.open(`Expense ${e.expenseNumber} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/accounting/general-expense']);
    } catch (err: any) {
      this.apiError.set(err?.error?.error ?? err?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

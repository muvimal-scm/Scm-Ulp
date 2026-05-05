import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccountingApiService } from '../shared/accounting-api.service';
import { CreateReceiptRequest, PaymentMethod } from '../shared/accounting-types';

@Component({
  selector: 'ulp-acct-receipt-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/accounting/receipts" class="back-link">‹ Back to receipts</a>
      <h1>New Receipt</h1>
      <p>Customer payment received — match to invoices from the receipt detail screen.</p>
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
          <mat-label>Receipt #</mat-label>
          <input matInput formControlName="receiptNumber" maxlength="50" />
          @if (form.get('receiptNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Receipt date</mat-label>
          <input matInput formControlName="receiptDate" type="date" />
        </mat-form-field>
      </div>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Customer party ID</mat-label>
          <input matInput formControlName="customerPartyId" type="number" min="1" />
          @if (form.get('customerPartyId')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Amount</mat-label>
          <input matInput formControlName="amount" type="number" min="0" step="0.01" />
          @if (form.get('amount')?.hasError('min')) { <mat-error>Must be ≥ 0</mat-error> }
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
          <mat-label>Payment method</mat-label>
          <mat-select formControlName="paymentMethod">
            <mat-option value="Cash">Cash</mat-option>
            <mat-option value="Cheque">Cheque</mat-option>
            <mat-option value="BankTransfer">Bank transfer</mat-option>
            <mat-option value="Card">Card</mat-option>
            <mat-option value="Upi">UPI</mat-option>
            <mat-option value="Wallet">Wallet</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Bank reference</mat-label>
          <input matInput formControlName="bankReference" maxlength="100" placeholder="UTR / cheque #" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Notes</mat-label>
        <textarea matInput formControlName="notes" rows="2" maxlength="2000"></textarea>
      </mat-form-field>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/accounting/receipts" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create Receipt }
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
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 24px; max-width: 760px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .full { width: 100%; }
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    @media (max-width: 720px) { .row-2, .row-3 { grid-template-columns: 1fr; } }
  `],
})
export class ReceiptFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(AccountingApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    countryCode:     ['IN' as 'IN' | 'US', [Validators.required]],
    receiptNumber:   ['', [Validators.required, Validators.maxLength(50)]],
    receiptDate:     ['', [Validators.required]],
    customerPartyId: [0, [Validators.required, Validators.min(1)]],
    amount:          [0, [Validators.required, Validators.min(0)]],
    currency:        ['INR', [Validators.required]],
    paymentMethod:   ['BankTransfer' as PaymentMethod, [Validators.required]],
    bankReference:   [''],
    notes:           [''],
  });

  ngOnInit() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const hhmm = `${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
    this.form.patchValue({
      receiptNumber: `RCT-${yyyymmdd}-${hhmm}`,
      receiptDate:   today.toISOString().slice(0, 10),
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateReceiptRequest = {
      countryCode:     v.countryCode,
      receiptNumber:   v.receiptNumber,
      receiptDate:     v.receiptDate,
      customerPartyId: v.customerPartyId,
      amount:          v.amount,
      currency:        v.currency,
      paymentMethod:   v.paymentMethod,
      bankReference:   v.bankReference || null,
      notes:           v.notes         || null,
    };

    try {
      const r = await this.api.createReceipt(req);
      this.snack.open(`Receipt ${r.receiptNumber} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/accounting/receipts']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

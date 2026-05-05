import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LastMileApiService } from '../shared/last-mile-api.service';
import { CodPaymentMethod, CreateCodRequest } from '../shared/last-mile-types';

@Component({
  selector: 'ulp-lastmile-cod-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/last-mile/cod" class="back-link">‹ Back to COD</a>
      <h1>Record COD Collection</h1>
      <p>Cash-on-delivery collected from consignee. Settles to bank via the COD reconciliation flow.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Booking ID</mat-label>
          <input matInput formControlName="bookingId" type="number" min="1" />
          @if (form.get('bookingId')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>Pre-filled from ?bookingId=X</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Amount collected</mat-label>
          <input matInput formControlName="amountCollected" type="number" min="0" step="0.01" />
          @if (form.get('amountCollected')?.hasError('required')) { <mat-error>Required</mat-error> }
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

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Payment method</mat-label>
          <mat-select formControlName="paymentMethod">
            <mat-option value="Cash">Cash</mat-option>
            <mat-option value="Card">Card</mat-option>
            <mat-option value="Upi">UPI</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Collected at</mat-label>
          <input matInput formControlName="collectedAt" type="datetime-local" />
          @if (form.get('collectedAt')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Reference #</mat-label>
          <input matInput formControlName="referenceNo" maxlength="100" placeholder="UPI / card receipt #" />
        </mat-form-field>
      </div>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/last-mile/cod" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Record COD }
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
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    @media (max-width: 720px) { .row-3 { grid-template-columns: 1fr; } }
  `],
})
export class CodFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(LastMileApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    bookingId:       [0, [Validators.required, Validators.min(1)]],
    amountCollected: [0, [Validators.required, Validators.min(0)]],
    currency:        ['INR', [Validators.required]],
    paymentMethod:   ['Cash' as CodPaymentMethod, [Validators.required]],
    collectedAt:     ['', [Validators.required]],
    referenceNo:     [''],
  });

  ngOnInit() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    this.form.patchValue({ collectedAt: local });

    const bookingId = this.route.snapshot.queryParamMap.get('bookingId');
    if (bookingId) this.form.patchValue({ bookingId: Number(bookingId) });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateCodRequest = {
      bookingId:       v.bookingId,
      amountCollected: v.amountCollected,
      currency:        v.currency,
      paymentMethod:   v.paymentMethod,
      collectedAt:     new Date(v.collectedAt).toISOString(),
      referenceNo:     v.referenceNo || null,
    };

    try {
      const c = await this.api.createCod(req);
      this.snack.open(`COD recorded — ${c.amountCollected} ${c.currency}`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/last-mile/cod']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

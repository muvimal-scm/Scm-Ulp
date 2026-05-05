import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProcurementApiService } from '../shared/procurement-api.service';
import { CreateGrnRequest } from '../shared/procurement-types';

@Component({
  selector: 'ulp-procurement-grn-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/procurement/grns" class="back-link">‹ Back to GRNs</a>
      <h1>New Goods Receipt Note</h1>
      <p>Record receipt of goods against a Purchase Order.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>PO ID</mat-label>
          <input matInput formControlName="poId" type="number" min="1" />
          @if (form.get('poId')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>FK to m7_purchase_order</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>GRN number</mat-label>
          <input matInput formControlName="grnNumber" maxlength="50" />
          @if (form.get('grnNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Received at</mat-label>
          <input matInput formControlName="receivedAt" type="datetime-local" />
          @if (form.get('receivedAt')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
      </div>

      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Received-by user ID</mat-label>
          <input matInput formControlName="receivedBy" type="number" min="1" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Linked M8 GRN ID</mat-label>
          <input matInput formControlName="m8GrnId" type="number" min="1" />
          <mat-hint>Optional — if recorded via WMS</mat-hint>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Remarks</mat-label>
        <textarea matInput formControlName="remarks" rows="3" maxlength="2000"></textarea>
      </mat-form-field>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/procurement/grns" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create GRN }
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
export class GrnFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(ProcurementApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    poId:       [0, [Validators.required, Validators.min(1)]],
    grnNumber:  ['', [Validators.required, Validators.maxLength(50)]],
    receivedAt: ['', [Validators.required]],
    receivedBy: [null as number | null],
    m8GrnId:    [null as number | null],
    remarks:    [''],
  });

  ngOnInit() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    this.form.patchValue({
      grnNumber:  `GRN-${yyyymmdd}-${hhmm}`,
      receivedAt: local,
    });

    // Pre-fill PO ID from query: ?poId=42
    const poId = this.route.snapshot.queryParamMap.get('poId');
    if (poId) this.form.patchValue({ poId: Number(poId) });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateGrnRequest = {
      poId:       v.poId,
      grnNumber:  v.grnNumber,
      receivedAt: new Date(v.receivedAt).toISOString(),
      receivedBy: v.receivedBy || null,
      m8GrnId:    v.m8GrnId    || null,
      remarks:    v.remarks    || null,
    };

    try {
      const g = await this.api.createGrn(req);
      this.snack.open(`GRN ${g.grnNumber} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/procurement/grns']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

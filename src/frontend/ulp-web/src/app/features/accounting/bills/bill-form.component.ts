import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccountingApiService } from '../shared/accounting-api.service';
import { CreateBillLineRequest, CreateBillRequest } from '../shared/accounting-types';

interface DraftLine {
  description: string;
  hsnCode: string;
  quantity: number;
  uomCode: string;
  unitPriceAmount: number;
  accountId: number | null;
}

@Component({
  selector: 'ulp-acct-bill-form',
  standalone: true,
  imports: [
    DecimalPipe, ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/accounting/bills" class="back-link">‹ Back to bills</a>
      <h1>New AP Bill</h1>
      <p>Vendor bill — saved as Draft. Post to GL from the detail screen.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="header">
      <h2 class="section">Header</h2>
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Country code</mat-label>
          <mat-select formControlName="countryCode">
            <mat-option value="IN">IN — India</mat-option>
            <mat-option value="US">US — United States</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Vendor's bill #</mat-label>
          <input matInput formControlName="billNumber" maxlength="50" />
          @if (header.get('billNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>As printed on vendor's bill</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Internal #</mat-label>
          <input matInput formControlName="internalNumber" maxlength="50" />
          @if (header.get('internalNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>Auto-suggested AP-YYYYMMDD</mat-hint>
        </mat-form-field>
      </div>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Bill date</mat-label>
          <input matInput formControlName="billDate" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Due date</mat-label>
          <input matInput formControlName="dueDate" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Vendor party ID</mat-label>
          <input matInput formControlName="vendorPartyId" type="number" min="1" />
          @if (header.get('vendorPartyId')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
      </div>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Currency</mat-label>
          <mat-select formControlName="currency">
            <mat-option value="INR">INR</mat-option>
            <mat-option value="USD">USD</mat-option>
            <mat-option value="EUR">EUR</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Functional currency</mat-label>
          <mat-select formControlName="funcCurrency">
            <mat-option value="INR">INR</mat-option>
            <mat-option value="USD">USD</mat-option>
            <mat-option value="EUR">EUR</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>FX rate</mat-label>
          <input matInput formControlName="fxRate" type="number" min="0" step="0.0001" />
        </mat-form-field>
      </div>

      <h2 class="section">India-specific (TDS)</h2>
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>TDS section code</mat-label>
          <input matInput formControlName="tdsSectionCode" maxlength="20" placeholder="194C, 194J, …" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Vendor PAN</mat-label>
          <input matInput formControlName="vendorPan" maxlength="10" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Vendor GSTIN</mat-label>
          <input matInput formControlName="vendorGstin" maxlength="15" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Notes</mat-label>
        <textarea matInput formControlName="notes" rows="2" maxlength="2000"></textarea>
      </mat-form-field>
    </form>

    <h2 class="lines-h">Lines</h2>
    <div class="form-card">
      @if (lines().length > 0) {
        <table class="lines">
          <thead>
            <tr><th>#</th><th>Description</th><th>HSN</th><th class="num">Qty</th><th>UoM</th>
                <th class="num">Unit price</th><th class="num">Amount</th><th></th></tr>
          </thead>
          <tbody>
            @for (l of lines(); track $index) {
              <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ l.description }}</td>
                <td><code>{{ l.hsnCode || '—' }}</code></td>
                <td class="num">{{ l.quantity | number:'1.0-2' }}</td>
                <td>{{ l.uomCode }}</td>
                <td class="num">{{ l.unitPriceAmount | number:'1.2-2' }}</td>
                <td class="num"><strong>{{ (l.quantity * l.unitPriceAmount) | number:'1.2-2' }}</strong></td>
                <td>
                  <button mat-icon-button (click)="removeLine($index)" aria-label="Remove">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </td>
              </tr>
            }
            <tr class="total-row">
              <td colspan="6" class="num"><strong>Subtotal</strong></td>
              <td class="num"><strong>{{ subtotal() | number:'1.2-2' }} {{ header.value.currency }}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      } @else {
        <p class="muted empty">No lines yet — add at least one below.</p>
      }

      <h3 class="add-line-h">Add a line</h3>
      <form class="form-row" [formGroup]="newLine" (ngSubmit)="addLine()">
        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <input matInput formControlName="description" maxlength="500" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="narrow">
          <mat-label>HSN</mat-label>
          <input matInput formControlName="hsnCode" maxlength="20" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="narrow">
          <mat-label>Qty</mat-label>
          <input matInput formControlName="quantity" type="number" min="0" step="0.01" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="narrow">
          <mat-label>UoM</mat-label>
          <input matInput formControlName="uomCode" maxlength="10" placeholder="EACH" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="narrow">
          <mat-label>Unit price</mat-label>
          <input matInput formControlName="unitPriceAmount" type="number" min="0" step="0.01" />
        </mat-form-field>
        <button mat-flat-button color="primary" type="submit" [disabled]="newLine.invalid">
          <mat-icon>add</mat-icon> Add
        </button>
      </form>
    </div>

    <div class="actions">
      <button mat-button type="button" routerLink="/app/accounting/bills" [disabled]="saving()">Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="save()"
              [disabled]="saving() || header.invalid || lines().length === 0">
        @if (saving()) { Saving… } @else { Create Bill }
      </button>
    </div>
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
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 24px; max-width: 1100px; margin-bottom: 16px; }
    .section { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .section:first-of-type { margin-top: 0; }
    .lines-h { color: #1A1A33; font-size: 16px; font-weight: 800; margin: 24px 0 8px; max-width: 1100px; }
    .add-line-h { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 16px 0 8px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .full { width: 100%; }
    mat-form-field { width: 100%; }
    .form-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto; gap: 8px; align-items: start; }
    .narrow { width: 100%; }
    .lines { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .lines th, .lines td { padding: 8px 10px; border-bottom: 1px solid #F0EBF8; font-size: 13px; }
    .lines th { background: #F5F2FB; color: #3F2D7C; font-weight: 700; text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; }
    .lines th.num, .lines td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .total-row td { background: #FBF8FE; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .muted { color: #9A9AA3; font-size: 13px; }
    .empty { padding: 24px; text-align: center; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; max-width: 1100px; }
    @media (max-width: 720px) {
      .row-3, .form-row { grid-template-columns: 1fr; }
    }
  `],
})
export class BillFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(AccountingApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);
  readonly lines    = signal<DraftLine[]>([]);

  readonly header = this.fb.nonNullable.group({
    countryCode:    ['IN' as 'IN' | 'US', [Validators.required]],
    billNumber:     ['', [Validators.required, Validators.maxLength(50)]],
    internalNumber: ['', [Validators.required, Validators.maxLength(50)]],
    billDate:       ['', [Validators.required]],
    dueDate:        ['', [Validators.required]],
    vendorPartyId:  [0, [Validators.required, Validators.min(1)]],
    currency:       ['INR', [Validators.required]],
    funcCurrency:   ['INR', [Validators.required]],
    fxRate:         [1, [Validators.required, Validators.min(0)]],
    tdsSectionCode: [''],
    vendorPan:      [''],
    vendorGstin:    [''],
    notes:          [''],
  });

  readonly newLine = this.fb.nonNullable.group({
    description:     ['', [Validators.required, Validators.maxLength(500)]],
    hsnCode:         [''],
    quantity:        [1, [Validators.required, Validators.min(0)]],
    uomCode:         ['EACH', [Validators.required, Validators.maxLength(10)]],
    unitPriceAmount: [0, [Validators.required, Validators.min(0)]],
  });

  readonly subtotal = computed(() =>
    this.lines().reduce((sum, l) => sum + (l.quantity * l.unitPriceAmount), 0));

  ngOnInit() {
    const today = new Date();
    const due   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const hhmm = `${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
    this.header.patchValue({
      internalNumber: `AP-${yyyymmdd}-${hhmm}`,
      billDate: today.toISOString().slice(0, 10),
      dueDate:  due.toISOString().slice(0, 10),
    });
  }

  addLine() {
    if (this.newLine.invalid) return;
    const v = this.newLine.getRawValue();
    this.lines.update(arr => [...arr, { ...v, accountId: null }]);
    this.newLine.reset({ description: '', hsnCode: '', quantity: 1, uomCode: 'EACH', unitPriceAmount: 0 });
  }

  removeLine(idx: number) {
    this.lines.update(arr => arr.filter((_, i) => i !== idx));
  }

  async save() {
    if (this.header.invalid || this.lines().length === 0) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.header.getRawValue();

    const lineReqs: CreateBillLineRequest[] = this.lines().map(l => ({
      description:     l.description,
      hsnCode:         l.hsnCode || null,
      quantity:        l.quantity,
      uomCode:         l.uomCode || null,
      unitPriceAmount: l.unitPriceAmount,
      accountId:       l.accountId,
    }));

    const req: CreateBillRequest = {
      countryCode:    v.countryCode,
      billNumber:     v.billNumber,
      internalNumber: v.internalNumber,
      billDate:       v.billDate,
      dueDate:        v.dueDate,
      vendorPartyId:  v.vendorPartyId,
      currency:       v.currency,
      funcCurrency:   v.funcCurrency,
      fxRate:         v.fxRate,
      notes:          v.notes || null,
      lines:          lineReqs,
      tdsSectionCode: v.tdsSectionCode || null,
      vendorPan:      v.vendorPan      || null,
      vendorGstin:    v.vendorGstin    || null,
      isReverseCharge: null,
    };

    try {
      const b = await this.api.createBill(req);
      this.snack.open(`Bill ${b.internalNumber} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/accounting/bills', b.id]);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

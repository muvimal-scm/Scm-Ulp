import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PricingQuotationApiService } from '../shared/pricing-quotation-api.service';
import {
  CreateRateCardLineRequest, CreateRateCardRequest, RateCardScope, RateCardType,
} from '../shared/pricing-quotation-types';

interface DraftLine {
  chargeCode: string;
  description: string;
  uomCode: string;
  rateAmount: number;
  rateCurrency: string;
  minAmount: number | null;
  maxAmount: number | null;
  isTaxable: boolean;
  taxClass: string;
}

@Component({
  selector: 'ulp-rate-card-form',
  standalone: true,
  imports: [
    DecimalPipe, ReactiveFormsModule, RouterLink,
    MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/pricing-quotation/rate-cards" class="back-link">‹ Back to rate cards</a>
      <h1>New Rate Card</h1>
      <p>Pricing template — saved as Draft. Approve from the detail screen to activate for new quotes.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="header">
      <h2 class="section">Header</h2>
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Country code</mat-label>
          <mat-select formControlName="countryCode">
            <mat-option value="IN">IN — India</mat-option>
            <mat-option value="US">US — United States</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Card number</mat-label>
          <input matInput formControlName="cardNumber" maxlength="50" placeholder="RC-2026-0001" />
          @if (header.get('cardNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
      </div>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Card type</mat-label>
          <mat-select formControlName="cardType">
            <mat-option value="Sell">Sell</mat-option>
            <mat-option value="Buy">Buy</mat-option>
            <mat-option value="InternalTransfer">Internal transfer</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Scope</mat-label>
          <mat-select formControlName="scope">
            <mat-option value="General">General</mat-option>
            <mat-option value="Customer">Customer-specific</mat-option>
            <mat-option value="Vendor">Vendor-specific</mat-option>
            <mat-option value="Lane">Lane-specific</mat-option>
            <mat-option value="Service">Service-specific</mat-option>
          </mat-select>
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
          <mat-label>Party ID (if Customer/Vendor scope)</mat-label>
          <input matInput formControlName="partyId" type="number" min="1" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Origin port ID (if Lane)</mat-label>
          <input matInput formControlName="originPortId" type="number" min="1" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Destination port ID (if Lane)</mat-label>
          <input matInput formControlName="destinationPortId" type="number" min="1" />
        </mat-form-field>
      </div>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Service type</mat-label>
          <mat-select formControlName="serviceType">
            <mat-option value="">— none —</mat-option>
            <mat-option value="OceanFCL">Ocean FCL</mat-option>
            <mat-option value="OceanLCL">Ocean LCL</mat-option>
            <mat-option value="AirFreight">Air Freight</mat-option>
            <mat-option value="Trucking">Trucking</mat-option>
            <mat-option value="Brokerage">Customs Brokerage</mat-option>
            <mat-option value="Warehousing">Warehousing</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Valid from</mat-label>
          <input matInput formControlName="validFrom" type="date" />
          @if (header.get('validFrom')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Valid to</mat-label>
          <input matInput formControlName="validTo" type="date" />
        </mat-form-field>
      </div>
    </form>

    <h2 class="lines-h">Lines</h2>
    <div class="form-card">
      @if (lines().length > 0) {
        <table class="lines">
          <thead>
            <tr>
              <th>#</th><th>Charge</th><th>Description</th><th>UoM</th>
              <th class="num">Rate</th><th>Cur</th>
              <th class="num">Min</th><th class="num">Max</th>
              <th>Tax</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (l of lines(); track $index) {
              <tr>
                <td>{{ $index + 1 }}</td>
                <td><code>{{ l.chargeCode }}</code></td>
                <td>{{ l.description || '—' }}</td>
                <td>{{ l.uomCode }}</td>
                <td class="num">{{ l.rateAmount | number:'1.2-2' }}</td>
                <td>{{ l.rateCurrency }}</td>
                <td class="num">{{ l.minAmount !== null ? (l.minAmount | number:'1.2-2') : '—' }}</td>
                <td class="num">{{ l.maxAmount !== null ? (l.maxAmount | number:'1.2-2') : '—' }}</td>
                <td>{{ l.isTaxable ? l.taxClass || 'taxable' : '—' }}</td>
                <td>
                  <button mat-icon-button (click)="removeLine($index)" aria-label="Remove">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="muted empty">No lines yet — add at least one below.</p>
      }

      <h3 class="add-line-h">Add a line</h3>
      <form class="form-row" [formGroup]="newLine" (ngSubmit)="addLine()">
        <mat-form-field appearance="outline">
          <mat-label>Charge code</mat-label>
          <input matInput formControlName="chargeCode" maxlength="40" placeholder="OCEAN_FREIGHT" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <input matInput formControlName="description" maxlength="255" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="narrow">
          <mat-label>UoM</mat-label>
          <input matInput formControlName="uomCode" maxlength="10" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="narrow">
          <mat-label>Rate</mat-label>
          <input matInput formControlName="rateAmount" type="number" min="0" step="0.01" />
        </mat-form-field>
        <button mat-flat-button color="primary" type="submit" [disabled]="newLine.invalid">
          <mat-icon>add</mat-icon> Add
        </button>
      </form>
    </div>

    <div class="actions">
      <button mat-button type="button" routerLink="/app/pricing-quotation/rate-cards" [disabled]="saving()">Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="save()"
              [disabled]="saving() || header.invalid || lines().length === 0">
        @if (saving()) { Saving… } @else { Create Rate Card }
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
    .section { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .lines-h { color: #1A1A33; font-size: 16px; font-weight: 800; margin: 24px 0 8px; max-width: 1100px; }
    .add-line-h { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 16px 0 8px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    mat-form-field { width: 100%; }
    .form-row { display: grid; grid-template-columns: 1.5fr 2fr 1fr 1fr auto; gap: 8px; align-items: start; }
    .narrow { width: 100%; }
    .lines { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .lines th, .lines td { padding: 8px 10px; border-bottom: 1px solid #F0EBF8; font-size: 13px; }
    .lines th { background: #F5F2FB; color: #3F2D7C; font-weight: 700; text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; }
    .lines th.num, .lines td.num { text-align: right; font-variant-numeric: tabular-nums; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .muted { color: #9A9AA3; font-size: 13px; }
    .empty { padding: 24px; text-align: center; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; max-width: 1100px; }
    @media (max-width: 720px) {
      .row-2, .row-3, .form-row { grid-template-columns: 1fr; }
    }
  `],
})
export class RateCardFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(PricingQuotationApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);
  readonly lines    = signal<DraftLine[]>([]);

  readonly header = this.fb.nonNullable.group({
    countryCode:       ['IN' as 'IN' | 'US', [Validators.required]],
    cardNumber:        ['', [Validators.required, Validators.maxLength(50)]],
    cardType:          ['Sell' as RateCardType, [Validators.required]],
    scope:             ['General' as RateCardScope, [Validators.required]],
    partyId:           [null as number | null],
    originPortId:      [null as number | null],
    destinationPortId: [null as number | null],
    serviceType:       [''],
    validFrom:         ['', [Validators.required]],
    validTo:           [''],
    currency:          ['INR', [Validators.required]],
  });

  readonly newLine = this.fb.nonNullable.group({
    chargeCode:  ['', [Validators.required, Validators.maxLength(40)]],
    description: [''],
    uomCode:     ['EACH', [Validators.required, Validators.maxLength(10)]],
    rateAmount:  [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const hhmm = `${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
    const validTo = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    this.header.patchValue({
      cardNumber: `RC-${yyyymmdd}-${hhmm}`,
      validFrom:  today.toISOString().slice(0, 10),
      validTo:    validTo.toISOString().slice(0, 10),
    });
  }

  addLine() {
    if (this.newLine.invalid) return;
    const v = this.newLine.getRawValue();
    const cur = this.header.value.currency || 'INR';
    this.lines.update(arr => [...arr, {
      chargeCode:   v.chargeCode,
      description:  v.description,
      uomCode:      v.uomCode,
      rateAmount:   v.rateAmount,
      rateCurrency: cur,
      minAmount:    null,
      maxAmount:    null,
      isTaxable:    false,
      taxClass:     '',
    }]);
    this.newLine.reset({ chargeCode: '', description: '', uomCode: 'EACH', rateAmount: 0 });
  }

  removeLine(idx: number) {
    this.lines.update(arr => arr.filter((_, i) => i !== idx));
  }

  async save() {
    if (this.header.invalid || this.lines().length === 0) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.header.getRawValue();

    try {
      const req: CreateRateCardRequest = {
        countryCode:       v.countryCode,
        cardNumber:        v.cardNumber,
        cardType:          v.cardType,
        scope:             v.scope,
        partyId:           v.partyId,
        originPortId:      v.originPortId,
        destinationPortId: v.destinationPortId,
        serviceType:       v.serviceType || null,
        validFrom:         v.validFrom,
        validTo:           v.validTo || null,
        currency:          v.currency,
      };
      const card = await this.api.createRateCard(req);

      for (const l of this.lines()) {
        const lineReq: CreateRateCardLineRequest = {
          chargeCode:   l.chargeCode,
          description:  l.description || null,
          uomCode:      l.uomCode,
          rateAmount:   l.rateAmount,
          rateCurrency: l.rateCurrency,
          minAmount:    l.minAmount,
          maxAmount:    l.maxAmount,
          isTaxable:    l.isTaxable,
          taxClass:     l.taxClass || null,
        };
        await this.api.addRateCardLine(card.id, lineReq);
      }

      this.snack.open(`Rate card ${card.cardNumber} created with ${this.lines().length} line(s)`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/pricing-quotation/rate-cards', card.id]);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

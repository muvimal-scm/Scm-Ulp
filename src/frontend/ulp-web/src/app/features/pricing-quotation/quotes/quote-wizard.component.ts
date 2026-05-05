import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { PricingQuotationApiService } from '../shared/pricing-quotation-api.service';
import { SalesApiService } from '../../sales/shared/sales-api.service';
import { CreateQuoteLineRequest, CreateQuoteRequest, QuoteDto } from '../shared/pricing-quotation-types';
import { LeadDto } from '../../sales/shared/sales-types';

interface DraftLine {
  chargeCode: string;
  description: string;
  quantity: number;
  uomCode: string;
  unitPrice: number;
  currency: string;
}

@Component({
  selector: 'ulp-quote-wizard',
  standalone: true,
  imports: [
    DecimalPipe, FormsModule, ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule, MatStepperModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/pricing-quotation/quotes" class="back-link">‹ Back to quotes</a>
      <h1>New Quote</h1>
      <p>
        @if (sourceLead()) {
          Building a quote for lead <strong>{{ sourceLead()!.leadNumber }}</strong> ({{ sourceLead()!.contactName }}).
        } @else {
          Create a new quote for an existing customer party.
        }
      </p>
    </header>

    @if (loadingSource()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    }

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <mat-stepper linear class="wizard">
      <!-- Step 1 — header -->
      <mat-step [stepControl]="header" label="Quote header">
        <form class="form-card" [formGroup]="header">
          <div class="row-2">
            <mat-form-field appearance="outline">
              <mat-label>Quote number</mat-label>
              <input matInput formControlName="quoteNumber" maxlength="50" placeholder="QTE-2026-0001" />
              @if (header.get('quoteNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
              <mat-hint>Must be unique per tenant</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Customer party ID</mat-label>
              <input matInput formControlName="customerPartyId" type="number" min="1" />
              @if (header.get('customerPartyId')?.hasError('required')) { <mat-error>Required</mat-error> }
              @else if (header.get('customerPartyId')?.hasError('min')) { <mat-error>Must be &gt; 0</mat-error> }
              <mat-hint>FK to m1_party — see Master Data → Parties</mat-hint>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full">
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

          <div class="row-2">
            <mat-form-field appearance="outline">
              <mat-label>Origin port ID</mat-label>
              <input matInput formControlName="originPortId" type="number" min="1" />
              <mat-hint>Optional — FK to ports table</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Destination port ID</mat-label>
              <input matInput formControlName="destinationPortId" type="number" min="1" />
              <mat-hint>Optional</mat-hint>
            </mat-form-field>
          </div>

          <div class="row-2">
            <mat-form-field appearance="outline">
              <mat-label>Enquiry / lead ref</mat-label>
              <input matInput formControlName="enquiryRef" maxlength="100" />
              <mat-hint>Auto-filled if creating from a lead</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Valid until</mat-label>
              <input matInput formControlName="validUntil" type="date" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Notes</mat-label>
            <textarea matInput formControlName="notes" rows="3" maxlength="1000"></textarea>
          </mat-form-field>

          <div class="step-actions">
            <button mat-flat-button color="primary" type="button" matStepperNext [disabled]="header.invalid">
              Next: lines &rarr;
            </button>
          </div>
        </form>
      </mat-step>

      <!-- Step 2 — lines -->
      <mat-step label="Quote lines">
        <div class="form-card">
          <p class="muted">Add at least one charge line. The total updates as you go.</p>

          @if (lines().length > 0) {
            <table class="lines">
              <thead>
                <tr>
                  <th>#</th><th>Charge</th><th>Description</th>
                  <th class="num">Qty</th><th>UoM</th>
                  <th class="num">Unit price</th><th>Currency</th>
                  <th class="num">Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (l of lines(); track $index) {
                  <tr>
                    <td>{{ $index + 1 }}</td>
                    <td><code>{{ l.chargeCode }}</code></td>
                    <td>{{ l.description || '—' }}</td>
                    <td class="num">{{ l.quantity | number:'1.0-2' }}</td>
                    <td>{{ l.uomCode }}</td>
                    <td class="num">{{ l.unitPrice | number:'1.2-2' }}</td>
                    <td>{{ l.currency }}</td>
                    <td class="num"><strong>{{ (l.quantity * l.unitPrice) | number:'1.2-2' }}</strong></td>
                    <td>
                      <button mat-icon-button (click)="removeLine($index)" aria-label="Remove line">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
                <tr class="total-row">
                  <td colspan="7" class="num"><strong>Total</strong></td>
                  <td class="num"><strong>{{ totalAmount() | number:'1.2-2' }} {{ defaultCurrency() }}</strong></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          } @else {
            <p class="muted empty">No lines yet — add one below.</p>
          }

          <h3 class="add-line-h">Add a line</h3>
          <form class="form-card form-card--inline" [formGroup]="newLine" (ngSubmit)="addLine()">
            <div class="row-line">
              <mat-form-field appearance="outline">
                <mat-label>Charge code</mat-label>
                <input matInput formControlName="chargeCode" maxlength="40" placeholder="OCEAN_FREIGHT" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Description</mat-label>
                <input matInput formControlName="description" maxlength="255" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="narrow">
                <mat-label>Qty</mat-label>
                <input matInput formControlName="quantity" type="number" min="0" step="1" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="narrow">
                <mat-label>UoM</mat-label>
                <input matInput formControlName="uomCode" maxlength="10" placeholder="EACH" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="narrow">
                <mat-label>Unit price</mat-label>
                <input matInput formControlName="unitPrice" type="number" min="0" step="0.01" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="narrow-cur">
                <mat-label>Currency</mat-label>
                <mat-select formControlName="currency">
                  <mat-option value="INR">INR</mat-option>
                  <mat-option value="USD">USD</mat-option>
                  <mat-option value="EUR">EUR</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-flat-button color="primary" type="submit" [disabled]="newLine.invalid">
                <mat-icon>add</mat-icon> Add
              </button>
            </div>
          </form>

          <div class="step-actions">
            <button mat-button matStepperPrevious>&larr; Back</button>
            <button mat-flat-button color="primary" matStepperNext [disabled]="lines().length === 0">
              Next: review &rarr;
            </button>
          </div>
        </div>
      </mat-step>

      <!-- Step 3 — review -->
      <mat-step label="Review &amp; save">
        <div class="form-card review">
          <h2>Review</h2>
          <dl class="kv">
            <dt>Quote #</dt>          <dd>{{ header.value.quoteNumber }}</dd>
            <dt>Customer party</dt>   <dd>{{ header.value.customerPartyId }}</dd>
            <dt>Service</dt>          <dd>{{ header.value.serviceType || '—' }}</dd>
            <dt>Origin / Destination</dt><dd>{{ header.value.originPortId || '—' }} → {{ header.value.destinationPortId || '—' }}</dd>
            <dt>Valid until</dt>      <dd>{{ header.value.validUntil || '—' }}</dd>
            <dt>Lines</dt>            <dd>{{ lines().length }}</dd>
            <dt>Total</dt>            <dd><strong>{{ totalAmount() | number:'1.2-2' }} {{ defaultCurrency() }}</strong></dd>
          </dl>

          <div class="step-actions">
            <button mat-button matStepperPrevious [disabled]="saving()">&larr; Back</button>
            <button mat-stroked-button (click)="save('Draft')" [disabled]="saving() || lines().length === 0">
              @if (saving()) { Saving… } @else { Save as Draft }
            </button>
            <button mat-flat-button color="primary" (click)="save('Sent')" [disabled]="saving() || lines().length === 0">
              @if (saving()) { Saving… } @else { Save &amp; Send to customer }
            </button>
          </div>
        </div>
      </mat-step>
    </mat-stepper>
  `,
  styles: [`
    :host { display: block; }
    .page-head { margin-bottom: 16px; }
    .back-link { color: #5B3FA0; text-decoration: none; font-size: 13px; font-weight: 600; }
    .back-link:hover { text-decoration: underline; }
    .page-head h1 {
      font-size: 28px; font-weight: 800; margin: 4px 0;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    }
    .page-head p { color: #6B5BA0; margin: 0; }
    .loading { padding: 24px; text-align: center; color: #6B5BA0; }
    .api-error {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; margin-bottom: 16px;
      background: #FBE4E5; color: #B23F45;
      border: 1px solid #F5C6CB; border-radius: 8px; font-size: 13px;
    }
    .wizard {
      background: transparent;
    }
    .form-card {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
      padding: 24px;
    }
    .form-card--inline { padding: 14px 16px; margin-top: 12px; background: #F8F6FC; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full { width: 100%; }
    mat-form-field { width: 100%; }
    .row-line { display: grid; grid-template-columns: 1fr 1.5fr 80px 80px 110px 110px auto; gap: 8px; align-items: start; }
    .narrow { width: 100%; }
    .narrow-cur { width: 100%; }
    .step-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .lines { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .lines th, .lines td { padding: 8px 10px; border-bottom: 1px solid #F0EBF8; font-size: 13px; }
    .lines th { background: #F5F2FB; color: #3F2D7C; font-weight: 700; text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; }
    .lines th.num, .lines td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .total-row td { background: #FBF8FE; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .muted { color: #9A9AA3; font-size: 13px; }
    .empty { padding: 24px; text-align: center; }
    .add-line-h { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 18px 0 0; }
    .review h2 { color: #1A1A33; font-weight: 800; margin: 0 0 16px; font-size: 18px; }
    .kv { display: grid; grid-template-columns: 200px 1fr; gap: 8px 16px; margin: 0 0 16px; }
    .kv dt { color: #6B5BA0; font-weight: 600; font-size: 13px; }
    .kv dd { color: #1A1A33; margin: 0; font-size: 13px; }
    @media (max-width: 720px) {
      .row-2 { grid-template-columns: 1fr; }
      .row-line { grid-template-columns: 1fr; }
      .kv { grid-template-columns: 1fr; }
    }
  `],
})
export class QuoteWizardComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(PricingQuotationApiService);
  private readonly sales  = inject(SalesApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly loadingSource = signal(false);
  readonly sourceLead    = signal<LeadDto | null>(null);
  readonly saving        = signal(false);
  readonly apiError      = signal<string | null>(null);
  readonly lines         = signal<DraftLine[]>([]);

  readonly header = this.fb.nonNullable.group({
    quoteNumber:       ['', [Validators.required, Validators.maxLength(50)]],
    customerPartyId:   [0, [Validators.required, Validators.min(1)]],
    enquiryRef:        [''],
    serviceType:       [''],
    originPortId:      [null as number | null],
    destinationPortId: [null as number | null],
    validUntil:        [''],
    notes:             [''],
  });

  readonly newLine = this.fb.nonNullable.group({
    chargeCode:  ['', [Validators.required, Validators.maxLength(40)]],
    description: [''],
    quantity:    [1, [Validators.required, Validators.min(0)]],
    uomCode:     ['EACH', [Validators.required, Validators.maxLength(10)]],
    unitPrice:   [0, [Validators.required, Validators.min(0)]],
    currency:    ['INR', [Validators.required]],
  });

  readonly totalAmount = computed(() =>
    this.lines().reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0));

  readonly defaultCurrency = computed(() => {
    const ls = this.lines();
    return ls.length > 0 ? ls[0].currency : 'INR';
  });

  async ngOnInit() {
    const leadIdParam = this.route.snapshot.queryParamMap.get('leadId');
    const today = new Date();
    const validUntilDefault = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    this.header.patchValue({
      quoteNumber: this.suggestedQuoteNumber(today),
      validUntil:  validUntilDefault.toISOString().slice(0, 10),
    });

    if (leadIdParam) {
      this.loadingSource.set(true);
      try {
        const lead = await this.sales.getLead(Number(leadIdParam));
        this.sourceLead.set(lead);
        this.header.patchValue({
          enquiryRef: lead.leadNumber,
          notes:      lead.companyName ? `Quote for ${lead.contactName} at ${lead.companyName}.` : '',
        });
      } catch (e: any) {
        this.apiError.set(e?.error?.error ?? e?.message ?? 'Failed to load lead');
      } finally {
        this.loadingSource.set(false);
      }
    }
  }

  private suggestedQuoteNumber(d: Date): string {
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    const hhmm = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    return `QTE-${yyyy}${mm}${dd}-${hhmm}`;
  }

  addLine() {
    if (this.newLine.invalid) return;
    const v = this.newLine.getRawValue();
    this.lines.update(arr => [...arr, { ...v }]);
    this.newLine.reset({ chargeCode: '', description: '', quantity: 1, uomCode: 'EACH', unitPrice: 0, currency: this.defaultCurrency() });
  }

  removeLine(idx: number) {
    this.lines.update(arr => arr.filter((_, i) => i !== idx));
  }

  async save(targetStatus: 'Draft' | 'Sent') {
    if (this.header.invalid || this.lines().length === 0) return;
    this.saving.set(true);
    this.apiError.set(null);

    const v = this.header.getRawValue();
    try {
      // 1. Create quote header.
      const req: CreateQuoteRequest = {
        quoteNumber:       v.quoteNumber,
        customerPartyId:   v.customerPartyId,
        enquiryRef:        v.enquiryRef       || null,
        serviceType:       v.serviceType      || null,
        originPortId:      v.originPortId     || null,
        destinationPortId: v.destinationPortId || null,
        validUntil:        v.validUntil       || null,
        notes:             v.notes            || null,
      };
      const quote: QuoteDto = await this.api.createQuote(req);

      // 2. Add lines (sequentially — order matters for line numbers).
      for (const l of this.lines()) {
        const lineReq: CreateQuoteLineRequest = {
          chargeCode:  l.chargeCode,
          description: l.description || null,
          quantity:    l.quantity,
          uomCode:     l.uomCode,
          unitPrice:   l.unitPrice,
          currency:    l.currency,
        };
        await this.api.addQuoteLine(quote.id, lineReq);
      }

      // 3. Optionally promote status to Sent.
      if (targetStatus === 'Sent') {
        await this.api.changeQuoteStatus(quote.id, 'Sent');
      }

      this.snack.open(
        `Quote ${quote.quoteNumber} ${targetStatus === 'Sent' ? 'sent to customer' : 'saved as draft'}`,
        'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/pricing-quotation/quotes', quote.id]);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

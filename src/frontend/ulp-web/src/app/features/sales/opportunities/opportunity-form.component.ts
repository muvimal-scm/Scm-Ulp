import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { SalesApiService } from '../shared/sales-api.service';
import { CreateOpportunityRequest, UpdateOpportunityRequest } from '../shared/sales-types';

/**
 * Opportunity form — used for both create + edit. Mirrors the LeadFormComponent pattern.
 *   - Create: POST /api/v1/sales/opportunities
 *   - Edit:   PUT  /api/v1/sales/opportunities/:id
 *
 * Stage is NOT editable here (use stage-change action in list); oppNumber is immutable.
 * partyId is captured as a free number — a real implementation would use a party-picker.
 */
@Component({
  selector: 'ulp-sales-opportunity-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/sales/opportunities" class="back-link">‹ Back to opportunities</a>
      <h1>{{ isEdit() ? 'Edit Opportunity' : 'New Opportunity' }}</h1>
      <p>{{ isEdit() ? 'Update opportunity details. Opp # is immutable.' : 'Create a new sales opportunity. Opp # must be unique per tenant.' }}</p>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else {
      @if (apiError()) {
        <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
      }

      <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Country code</mat-label>
            <mat-select formControlName="countryCode">
              <mat-option value="IN">IN — India</mat-option>
              <mat-option value="US">US — United States</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Opp #</mat-label>
            <input matInput formControlName="oppNumber" maxlength="50" />
            @if (form.get('oppNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
            <mat-hint>Immutable once created (e.g. OPP-2026-0001)</mat-hint>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" maxlength="255" />
          @if (form.get('title')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Customer party ID</mat-label>
            <input matInput formControlName="partyId" type="number" min="1" />
            @if (form.get('partyId')?.hasError('required')) { <mat-error>Required</mat-error> }
            @else if (form.get('partyId')?.hasError('min')) { <mat-error>Must be &gt; 0</mat-error> }
            <mat-hint>FK to m1_party — see Master Data → Parties</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Probability %</mat-label>
            <input matInput formControlName="probabilityPct" type="number" min="0" max="100" step="5" />
            @if (form.get('probabilityPct')?.hasError('min') || form.get('probabilityPct')?.hasError('max')) {
              <mat-error>Between 0 and 100</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Estimated value</mat-label>
            <input matInput formControlName="estimatedValue" type="number" min="0" step="100" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Currency</mat-label>
            <mat-select formControlName="estimatedCurrency">
              <mat-option value="">— none —</mat-option>
              <mat-option value="INR">INR</mat-option>
              <mat-option value="USD">USD</mat-option>
              <mat-option value="EUR">EUR</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Expected close date</mat-label>
          <input matInput formControlName="expectedClose" type="date" />
        </mat-form-field>

        <div class="actions">
          <button mat-button type="button" routerLink="/app/sales/opportunities">Cancel</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
            @if (saving()) { Saving… } @else { {{ isEdit() ? 'Update opportunity' : 'Create opportunity' }} }
          </button>
        </div>
      </form>
    }
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
    .form-card {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
      padding: 24px; max-width: 760px;
    }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full-width { width: 100%; }
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    @media (max-width: 720px) { .row-2 { grid-template-columns: 1fr; } }
  `],
})
export class OpportunityFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(SalesApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly id        = signal<number | null>(null);
  readonly isEdit    = computed(() => this.id() !== null);
  readonly loading   = signal(false);
  readonly saving    = signal(false);
  readonly apiError  = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    countryCode:       ['IN' as 'IN' | 'US', [Validators.required]],
    oppNumber:         ['', [Validators.required, Validators.maxLength(50)]],
    title:             ['', [Validators.required, Validators.maxLength(255)]],
    partyId:           [0, [Validators.required, Validators.min(1)]],
    probabilityPct:    [50, [Validators.min(0), Validators.max(100)]],
    estimatedValue:    [0, [Validators.min(0)]],
    estimatedCurrency: [''],
    expectedClose:     [''],
  });

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.id.set(id);
      this.loading.set(true);
      try {
        const detail = await this.api.getOpportunity(id);
        const o = detail.opportunity;
        this.form.patchValue({
          countryCode:       (o.countryCode === 'US' ? 'US' : 'IN'),
          oppNumber:         o.oppNumber,
          title:             o.title,
          partyId:           o.partyId,
          probabilityPct:    o.probabilityPct ?? 50,
          estimatedValue:    o.estimatedValue ?? 0,
          estimatedCurrency: o.estimatedCurrency ?? '',
          expectedClose:     o.expectedClose ?? '',
        });
        this.form.controls.oppNumber.disable();
      } catch (e: any) {
        this.apiError.set(e?.error?.error ?? e?.message ?? 'Failed to load opportunity');
      } finally {
        this.loading.set(false);
      }
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    try {
      if (this.isEdit()) {
        const req: UpdateOpportunityRequest = {
          countryCode:       v.countryCode,
          partyId:           v.partyId,
          title:             v.title,
          estimatedValue:    v.estimatedValue || null,
          estimatedCurrency: v.estimatedCurrency || null,
          expectedClose:     v.expectedClose    || null,
          probabilityPct:    v.probabilityPct,
        };
        await this.api.updateOpportunity(this.id()!, req);
      } else {
        const req: CreateOpportunityRequest = {
          countryCode:       v.countryCode,
          oppNumber:         v.oppNumber,
          partyId:           v.partyId,
          title:             v.title,
          estimatedValue:    v.estimatedValue || null,
          estimatedCurrency: v.estimatedCurrency || null,
          expectedClose:     v.expectedClose    || null,
          probabilityPct:    v.probabilityPct,
        };
        await this.api.createOpportunity(req);
      }
      await this.router.navigate(['/app/sales/opportunities']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

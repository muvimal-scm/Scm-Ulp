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
import { CreateLeadRequest, LeadSource, UpdateLeadRequest } from '../shared/sales-types';

/**
 * Single component used for BOTH create and edit modes.
 * Mode is determined by route: `/leads/new` => create, `/leads/:id/edit` => edit.
 *
 * Uses Angular Reactive Forms with synchronous validators. On submit:
 *   - Create: POST /api/v1/sales/leads, then redirect to list
 *   - Edit:   PUT  /api/v1/sales/leads/:id, then redirect to list
 *
 * Errors from the API surface as a banner above the form. Stage is NOT editable here
 * (use the dedicated stage-change action in the list page); leadNumber is NOT editable
 * once created (immutable identifier per the sealed design).
 */
@Component({
  selector: 'ulp-sales-lead-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/sales/leads" class="back-link">‹ Back to leads</a>
      <h1>{{ isEdit() ? 'Edit Lead' : 'New Lead' }}</h1>
      <p>{{ isEdit() ? 'Update lead details. Lead # is immutable.' : 'Capture an inbound contact. Lead # must be unique per tenant.' }}</p>
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
            <mat-error>Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Lead #</mat-label>
            <input matInput formControlName="leadNumber" maxlength="50" />
            @if (form.get('leadNumber')?.hasError('required')) { <mat-error>Required</mat-error> }
            @else if (form.get('leadNumber')?.hasError('maxlength')) { <mat-error>Max 50 chars</mat-error> }
            <mat-hint>Immutable once created (e.g. LD-2026-0001)</mat-hint>
          </mat-form-field>
        </div>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Source</mat-label>
            <mat-select formControlName="source">
              @for (s of sources; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Contact name</mat-label>
            <input matInput formControlName="contactName" maxlength="150" />
            @if (form.get('contactName')?.hasError('required')) { <mat-error>Required</mat-error> }
          </mat-form-field>
        </div>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Company</mat-label>
            <input matInput formControlName="companyName" maxlength="150" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Industry</mat-label>
            <input matInput formControlName="industry" maxlength="100" />
          </mat-form-field>
        </div>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" maxlength="150" />
            @if (form.get('email')?.hasError('email')) { <mat-error>Not a valid email</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Phone</mat-label>
            <input matInput formControlName="phone" maxlength="30" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Estimated volume (free text — e.g. "100 TEU/month")</mat-label>
          <input matInput formControlName="estimatedVolume" maxlength="100" />
        </mat-form-field>

        <div class="actions">
          <button mat-button type="button" routerLink="/app/sales/leads">Cancel</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
            @if (saving()) { Saving… } @else { {{ isEdit() ? 'Update lead' : 'Create lead' }} }
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
export class LeadFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(SalesApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly id        = signal<number | null>(null);
  readonly isEdit    = computed(() => this.id() !== null);
  readonly loading   = signal(false);
  readonly saving    = signal(false);
  readonly apiError  = signal<string | null>(null);

  readonly sources: LeadSource[] = ['Web', 'Referral', 'ColdCall', 'Event', 'Partner', 'ExistingCustomer', 'Other'];

  readonly form = this.fb.nonNullable.group({
    countryCode:     ['IN' as 'IN' | 'US', [Validators.required]],
    leadNumber:      ['', [Validators.required, Validators.maxLength(50)]],
    source:          ['Web' as LeadSource, [Validators.required]],
    contactName:     ['', [Validators.required, Validators.maxLength(150)]],
    companyName:     [''],
    email:           ['', [Validators.email]],
    phone:           [''],
    industry:        [''],
    estimatedVolume: [''],
  });

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      // Edit mode — load + prefill, lock the immutable leadNumber.
      const id = Number(idParam);
      this.id.set(id);
      this.loading.set(true);
      try {
        const l = await this.api.getLead(id);
        this.form.patchValue({
          countryCode:     (l.countryCode === 'US' ? 'US' : 'IN'),
          leadNumber:      l.leadNumber,
          source:          l.source,
          contactName:     l.contactName,
          companyName:     l.companyName ?? '',
          email:           l.email ?? '',
          phone:           l.phone ?? '',
          industry:        l.industry ?? '',
          estimatedVolume: l.estimatedVolume ?? '',
        });
        this.form.controls.leadNumber.disable();   // immutable identifier
      } catch (e: any) {
        this.apiError.set(e?.error?.error ?? e?.message ?? 'Failed to load lead');
      } finally {
        this.loading.set(false);
      }
    } else {
      // Create mode — auto-suggest a lead number so the user has something to
      // submit with. Format: LD-YYYYMMDD-hhmmss-ms (millisecond resolution
      // avoids collisions when two leads are entered in the same minute,
      // which crashes the unique constraint on m2_lead.lead_number).
      const now = new Date();
      const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const hms = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const ms  = String(now.getMilliseconds()).padStart(3, '0');
      this.form.patchValue({ leadNumber: `LD-${ymd}-${hms}${ms}` });
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();   // includes disabled leadNumber

    try {
      if (this.isEdit()) {
        const req: UpdateLeadRequest = {
          countryCode:     v.countryCode,
          source:          v.source,
          contactName:     v.contactName,
          companyName:     v.companyName || null,
          email:           v.email       || null,
          phone:           v.phone       || null,
          industry:        v.industry    || null,
          estimatedVolume: v.estimatedVolume || null,
        };
        await this.api.updateLead(this.id()!, req);
      } else {
        const req: CreateLeadRequest = {
          countryCode:     v.countryCode,
          leadNumber:      v.leadNumber,
          source:          v.source,
          contactName:     v.contactName,
          companyName:     v.companyName || null,
          email:           v.email       || null,
          phone:           v.phone       || null,
          industry:        v.industry    || null,
          estimatedVolume: v.estimatedVolume || null,
        };
        await this.api.createLead(req);
      }
      await this.router.navigate(['/app/sales/leads']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

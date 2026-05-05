import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesApiService } from '../shared/sales-api.service';
import { ActivityType, CreateActivityRequest, RelatedTo } from '../shared/sales-types';

@Component({
  selector: 'ulp-sales-activity-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/sales/activities" class="back-link">‹ Back to activities</a>
      <h1>Log activity</h1>
      <p>Record a call, email, meeting, note or task against a lead, opportunity or party.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Type</mat-label>
          <mat-select formControlName="activityType">
            <mat-option value="Call">Call</mat-option>
            <mat-option value="Email">Email</mat-option>
            <mat-option value="Meeting">Meeting</mat-option>
            <mat-option value="Note">Note</mat-option>
            <mat-option value="Task">Task</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Subject</mat-label>
          <input matInput formControlName="subject" maxlength="255" />
        </mat-form-field>
      </div>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Related to</mat-label>
          <mat-select formControlName="relatedTo">
            <mat-option value="Lead">Lead</mat-option>
            <mat-option value="Opp">Opportunity</mat-option>
            <mat-option value="Party">Party</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Related ID</mat-label>
          <input matInput formControlName="relatedId" type="number" min="1" />
          @if (form.get('relatedId')?.hasError('required')) { <mat-error>Required</mat-error> }
          @else if (form.get('relatedId')?.hasError('min')) { <mat-error>Must be &gt; 0</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Owner user ID</mat-label>
          <input matInput formControlName="ownerUserId" type="number" min="1" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Occurred at</mat-label>
        <input matInput formControlName="occurredAt" type="datetime-local" />
        @if (form.get('occurredAt')?.hasError('required')) { <mat-error>Required</mat-error> }
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Details (free text)</mat-label>
        <textarea matInput formControlName="details" rows="4" maxlength="2000"></textarea>
      </mat-form-field>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/sales/activities" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Log activity }
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
export class ActivityFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(SalesApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    activityType: ['Note' as ActivityType, [Validators.required]],
    subject:      [''],
    relatedTo:    ['Lead' as RelatedTo, [Validators.required]],
    relatedId:    [0, [Validators.required, Validators.min(1)]],
    ownerUserId:  [null as number | null],
    occurredAt:   ['', [Validators.required]],
    details:      [''],
  });

  ngOnInit() {
    // Default occurredAt = now (datetime-local needs YYYY-MM-DDTHH:mm)
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    this.form.patchValue({ occurredAt: local });

    // Pre-fill from query: ?relatedTo=Lead&relatedId=42
    const q = this.route.snapshot.queryParamMap;
    const rt = q.get('relatedTo'); const ri = q.get('relatedId');
    if (rt) this.form.patchValue({ relatedTo: rt as RelatedTo });
    if (ri) this.form.patchValue({ relatedId: Number(ri) });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    // datetime-local gives "2026-05-04T17:30" with no offset; backend expects ISO 8601 with offset.
    // Treat the value as local time, convert to ISO with the browser's offset.
    const occurredAtIso = new Date(v.occurredAt).toISOString();

    const detailsJson = v.details ? JSON.stringify({ note: v.details }) : null;

    const req: CreateActivityRequest = {
      relatedTo:    v.relatedTo,
      relatedId:    v.relatedId,
      activityType: v.activityType,
      subject:      v.subject || null,
      occurredAt:   occurredAtIso,
      ownerUserId:  v.ownerUserId || null,
      detailsJson,
    };

    try {
      await this.api.createActivity(req);
      this.snack.open(`Activity logged`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/sales/activities']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesApiService } from '../shared/sales-api.service';
import { CampaignChannel, CreateCampaignRequest } from '../shared/sales-types';

@Component({
  selector: 'ulp-sales-campaign-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/sales/campaigns" class="back-link">‹ Back to campaigns</a>
      <h1>New campaign</h1>
      <p>Create a marketing campaign on Email, SMS or WhatsApp.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-form-field appearance="outline" class="full">
        <mat-label>Campaign name</mat-label>
        <input matInput formControlName="name" maxlength="200" />
        @if (form.get('name')?.hasError('required')) { <mat-error>Required</mat-error> }
      </mat-form-field>

      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Channel</mat-label>
          <mat-select formControlName="channel">
            <mat-option value="Email">Email</mat-option>
            <mat-option value="Sms">SMS</mat-option>
            <mat-option value="Whatsapp">WhatsApp</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Template code</mat-label>
          <input matInput formControlName="templateCode" maxlength="100" />
          <mat-hint>FK to m27_notification_template (optional)</mat-hint>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Audience filter (JSON)</mat-label>
        <textarea matInput formControlName="audienceFilterJson" rows="3" placeholder='{"industry": "Logistics"}'></textarea>
        <mat-hint>JSON expression evaluated against contacts to build the audience</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Scheduled at</mat-label>
        <input matInput formControlName="scheduledAt" type="datetime-local" />
        <mat-hint>Leave blank to save as Draft (you can schedule later)</mat-hint>
      </mat-form-field>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/sales/campaigns" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create campaign }
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
    .full { width: 100%; }
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    @media (max-width: 720px) { .row-2 { grid-template-columns: 1fr; } }
  `],
})
export class CampaignFormComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(SalesApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name:               ['', [Validators.required, Validators.maxLength(200)]],
    channel:            ['Email' as CampaignChannel, [Validators.required]],
    templateCode:       [''],
    audienceFilterJson: [''],
    scheduledAt:        [''],
  });

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    // Validate audienceFilterJson is well-formed JSON (or empty)
    if (v.audienceFilterJson) {
      try { JSON.parse(v.audienceFilterJson); }
      catch { this.apiError.set('Audience filter must be valid JSON'); this.saving.set(false); return; }
    }

    const scheduledAtIso = v.scheduledAt ? new Date(v.scheduledAt).toISOString() : null;

    const req: CreateCampaignRequest = {
      name:               v.name,
      channel:            v.channel,
      templateCode:       v.templateCode || null,
      audienceFilterJson: v.audienceFilterJson || null,
      scheduledAt:        scheduledAtIso,
    };

    try {
      const c = await this.api.createCampaign(req);
      this.snack.open(`Campaign "${c.name}" created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/sales/campaigns']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

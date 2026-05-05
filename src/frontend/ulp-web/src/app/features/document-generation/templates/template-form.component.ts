import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocumentGenerationApiService } from '../shared/document-generation-api.service';
import {
  CreateTemplateRequest, RenderingEngine, TemplateType,
} from '../shared/document-generation-types';

@Component({
  selector: 'ulp-template-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/document-generation/templates" class="back-link">‹ Back to templates</a>
      <h1>New Template</h1>
      <p>Create a tenant-specific document template (Scriban or Handlebars).
         Body uses placeholders like <code>{{ '{{ shipment.number }}' }}</code> resolved at render time.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>Code</mat-label>
          <input matInput formControlName="code" maxlength="50" placeholder="INVOICE_CUSTOM" />
          @if (form.get('code')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>UPPER_SNAKE; unique per tenant</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Country code</mat-label>
          <mat-select formControlName="countryCode">
            <mat-option value="">— country-agnostic —</mat-option>
            <mat-option value="IN">IN — India</mat-option>
            <mat-option value="US">US — United States</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Output type</mat-label>
          <mat-select formControlName="templateType">
            <mat-option value="HTML">HTML</mat-option>
            <mat-option value="PDF">PDF</mat-option>
            <mat-option value="TEXT">TEXT</mat-option>
            <mat-option value="XLSX">XLSX</mat-option>
            <mat-option value="CSV">CSV</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" maxlength="200" />
          @if (form.get('name')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Rendering engine</mat-label>
          <mat-select formControlName="renderingEngine">
            <mat-option value="SCRIBAN">Scriban</mat-option>
            <mat-option value="HANDLEBARS">Handlebars</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Description</mat-label>
        <input matInput formControlName="description" maxlength="500" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full body-field">
        <mat-label>Template body</mat-label>
        <textarea matInput formControlName="body" rows="20" placeholder="<html>&#10;  <body>&#10;    Hello {{ '{{ contact_name }}' }}&#10;  </body>&#10;</html>"></textarea>
        @if (form.get('body')?.hasError('required')) { <mat-error>Required</mat-error> }
        <mat-hint>Initial version of the template. Add new versions from the detail page.</mat-hint>
      </mat-form-field>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/document-generation/templates" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Create Template }
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
    .page-head code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'JetBrains Mono', Consolas, monospace; }
    .api-error { display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; margin-bottom: 16px;
      background: #FBE4E5; color: #B23F45;
      border: 1px solid #F5C6CB; border-radius: 8px; font-size: 13px; }
    .form-card { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 24px; max-width: 1100px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .full { width: 100%; }
    mat-form-field { width: 100%; }
    .body-field textarea {
      font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace;
      font-size: 12.5px; line-height: 18px;
    }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    @media (max-width: 720px) { .row-2, .row-3 { grid-template-columns: 1fr; } }
  `],
})
export class TemplateFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(DocumentGenerationApiService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    code:            ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Z][A-Z0-9_]*$/)]],
    countryCode:     [''],
    name:            ['', [Validators.required, Validators.maxLength(200)]],
    description:     [''],
    templateType:    ['HTML' as TemplateType, [Validators.required]],
    renderingEngine: ['SCRIBAN' as RenderingEngine, [Validators.required]],
    body:            ['', [Validators.required]],
  });

  ngOnInit() {
    // Provide a starter HTML body so the user has something to edit.
    const starter = `<html>
  <head>
    <style>body { font-family: sans-serif; padding: 24px; }</style>
  </head>
  <body>
    <h1>{{ '{{ title }}' }}</h1>
    <p>Hello {{ '{{ contact_name }}' }},</p>
    <p>This is a placeholder template body. Edit it as needed.</p>
  </body>
</html>`;
    this.form.patchValue({ body: starter });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreateTemplateRequest = {
      code:            v.code,
      countryCode:     v.countryCode || null,
      name:            v.name,
      description:     v.description || null,
      templateType:    v.templateType,
      renderingEngine: v.renderingEngine,
      body:            v.body,
    };

    try {
      const t = await this.api.createTemplate(req);
      this.snack.open(`Template ${t.code} created`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/document-generation/templates', t.id]);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}

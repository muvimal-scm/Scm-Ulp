import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CustomsApiService } from '../shared/customs-api.service';

@Component({
  selector: 'ulp-isf-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule,
            MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-page">
      <header class="page-head">
        <h1>File ISF (10+2)</h1>
        <p>Importer Security Filing — mandatory for all ocean imports to the USA.</p>
      </header>
      <form [formGroup]="form" (ngSubmit)="save()" class="form-card">
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Shipment ID</mat-label>
            <input matInput formControlName="shipmentId" type="number" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Importer Number (EIN/DUNS)</mat-label>
            <input matInput formControlName="importerNumber" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Seller Name</mat-label>
            <input matInput formControlName="sellerName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Buyer Name</mat-label>
            <input matInput formControlName="buyerName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Ship To Name</mat-label>
            <input matInput formControlName="shipToName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Manufacturer Name</mat-label>
            <input matInput formControlName="manufacturerName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Country of Origin</mat-label>
            <input matInput formControlName="countryOfOrigin" placeholder="CN" maxlength="2" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>HTS-6</mat-label>
            <input matInput formControlName="hts6" placeholder="0901.21" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Container Stuffing Location</mat-label>
            <input matInput formControlName="containerStuffingLocation" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Consolidator Name</mat-label>
            <input matInput formControlName="consolidatorName" />
          </mat-form-field>
        </div>
        @if (error()) {
          <div class="error-msg"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
        }
        <div class="form-actions">
          <button mat-stroked-button type="button" (click)="cancel()">Cancel</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
            @if (saving()) { <mat-spinner diameter="18"></mat-spinner> } @else { File ISF }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .form-page { max-width: 860px; margin: 0 auto; }
    .page-head h1 { font-size:24px;font-weight:800;margin:0 0 4px;
      background:linear-gradient(90deg,#E54A8A,#5B3FA0,#3F2D7C);
      -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent; }
    .page-head p { color:#6B5BA0;margin:0 0 20px; }
    .form-card { background:#fff;border:1px solid #E8E2F4;border-radius:12px;padding:24px;
      box-shadow:0 4px 16px rgba(63,45,124,.06); }
    .form-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px; }
    .full { grid-column:1/-1; }
    .form-actions { display:flex;gap:12px;justify-content:flex-end;margin-top:16px; }
    .error-msg { color:#B23F45;display:flex;align-items:center;gap:6px;margin-bottom:12px;font-size:13px; }
  `],
})
export class IsfFormComponent {
  private readonly api    = inject(CustomsApiService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly fb     = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);

  readonly form = this.fb.group({
    shipmentId: [null as number | null, Validators.required],
    importerNumber: ['', Validators.required],
    sellerName: [''], buyerName: [''], shipToName: [''],
    manufacturerName: [''], countryOfOrigin: [''], hts6: [''],
    containerStuffingLocation: [''], consolidatorName: [''],
  });

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true); this.error.set(null);
    try {
      const v = this.form.value;
      await this.api.createIsf({
        shipmentId: v.shipmentId!, importerOfRecordId: 1,
        importerNumber: v.importerNumber!,
        sellerName: v.sellerName || undefined, buyerName: v.buyerName || undefined,
        shipToName: v.shipToName || undefined, manufacturerName: v.manufacturerName || undefined,
        countryOfOrigin: v.countryOfOrigin || undefined, hts6: v.hts6 || undefined,
        containerStuffingLocation: v.containerStuffingLocation || undefined,
        consolidatorName: v.consolidatorName || undefined,
      });
      this.router.navigate(['..'], { relativeTo: this.route });
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally { this.saving.set(false); }
  }

  cancel() { this.router.navigate(['..'], { relativeTo: this.route }); }
}

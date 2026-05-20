import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CustomsApiService } from '../shared/customs-api.service';

@Component({
  selector: 'ulp-entry-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule,
            MatSelectModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-page">
      <header class="page-head">
        <h1>{{ isEdit() ? 'Edit Entry' : 'New CBP Entry' }}</h1>
      </header>
      <form [formGroup]="form" (ngSubmit)="save()" class="form-card">
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Filer Code</mat-label>
            <input matInput formControlName="filerCode" placeholder="ABC" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Entry Type</mat-label>
            <mat-select formControlName="entryType">
              <mat-option value="01">01 - Consumption</mat-option>
              <mat-option value="03">03 - Consumption TIB</mat-option>
              <mat-option value="11">11 - Informal</mat-option>
              <mat-option value="21">21 - Warehouse</mat-option>
              <mat-option value="23">23 - Re-Warehouse</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Importer EIN</mat-label>
            <input matInput formControlName="importerEin" placeholder="12-3456789" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Carrier SCAC</mat-label>
            <input matInput formControlName="carrierScac" placeholder="MAEU" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Vessel Name</mat-label>
            <input matInput formControlName="vesselName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Voyage Number</mat-label>
            <input matInput formControlName="voyageNumber" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Port of Unlading Code</mat-label>
            <input matInput formControlName="portOfUnladingCode" placeholder="2704" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Port of Entry Code</mat-label>
            <input matInput formControlName="portOfEntryCode" placeholder="2704" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>FIRMS Code</mat-label>
            <input matInput formControlName="firmsCode" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Bill of Lading</mat-label>
            <input matInput formControlName="billOfLading" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Entry Date</mat-label>
            <input matInput formControlName="entryDate" type="date" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Import Date</mat-label>
            <input matInput formControlName="importDate" type="date" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Total Value (USD)</mat-label>
            <input matInput formControlName="totalValueUsd" type="number" step="0.01" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Duty Amount (USD)</mat-label>
            <input matInput formControlName="dutyAmountUsd" type="number" step="0.01" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>MPF (USD)</mat-label>
            <input matInput formControlName="mpfUsd" type="number" step="0.01" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>HMF (USD)</mat-label>
            <input matInput formControlName="hmfUsd" type="number" step="0.01" />
          </mat-form-field>
        </div>
        @if (error()) {
          <div class="error-msg"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
        }
        <div class="form-actions">
          <button mat-stroked-button type="button" (click)="cancel()">Cancel</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
            @if (saving()) { <mat-spinner diameter="18"></mat-spinner> } @else { Save Entry }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .form-page { max-width: 900px; margin: 0 auto; }
    .page-head h1 { font-size: 24px; font-weight: 800; margin: 0 0 20px;
      background: linear-gradient(90deg,#E54A8A,#5B3FA0,#3F2D7C);
      -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent; }
    .form-card { background:#fff;border:1px solid #E8E2F4;border-radius:12px;padding:24px;
      box-shadow:0 4px 16px rgba(63,45,124,.06); }
    .form-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px; }
    .form-actions { display:flex;gap:12px;justify-content:flex-end;margin-top:16px; }
    .error-msg { color:#B23F45;display:flex;align-items:center;gap:6px;margin-bottom:12px;font-size:13px; }
  `],
})
export class EntryFormComponent implements OnInit {
  private readonly api    = inject(CustomsApiService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly fb     = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);
  readonly isEdit = signal(false);
  private entryId?: number;

  readonly form = this.fb.group({
    filerCode: ['', Validators.required],
    entryType: ['01', Validators.required],
    importerEin: ['', Validators.required],
    carrierScac: ['', Validators.required],
    vesselName: [''],
    voyageNumber: [''],
    portOfUnladingCode: ['', Validators.required],
    portOfEntryCode: ['', Validators.required],
    firmsCode: [''],
    billOfLading: [''],
    entryDate: [new Date().toISOString().slice(0, 10), Validators.required],
    importDate: [new Date().toISOString().slice(0, 10), Validators.required],
    totalValueUsd: [null as number | null],
    dutyAmountUsd: [null as number | null],
    mpfUsd: [null as number | null],
    hmfUsd: [null as number | null],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') { this.isEdit.set(true); this.entryId = Number(id); }
  }

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true); this.error.set(null);
    try {
      const v = this.form.value;
      if (this.isEdit() && this.entryId) {
        await this.api.updateEntry(this.entryId, {
          vesselName: v.vesselName || undefined, voyageNumber: v.voyageNumber || undefined,
          portOfEntryCode: v.portOfEntryCode || undefined, firmsCode: v.firmsCode || undefined,
          billOfLading: v.billOfLading || undefined,
          totalValueUsd: v.totalValueUsd ?? undefined, dutyAmountUsd: v.dutyAmountUsd ?? undefined,
          mpfUsd: v.mpfUsd ?? undefined, hmfUsd: v.hmfUsd ?? undefined,
        });
      } else {
        await this.api.createEntry({
          filerCode: v.filerCode!, entryType: v.entryType!,
          importerOfRecordId: 1, importerEin: v.importerEin!,
          carrierScac: v.carrierScac!, vesselName: v.vesselName || undefined,
          voyageNumber: v.voyageNumber || undefined,
          portOfUnladingCode: v.portOfUnladingCode!, portOfEntryCode: v.portOfEntryCode!,
          firmsCode: v.firmsCode || undefined, billOfLading: v.billOfLading || undefined,
          entryDate: v.entryDate!, importDate: v.importDate!,
          totalValueUsd: v.totalValueUsd ?? undefined, dutyAmountUsd: v.dutyAmountUsd ?? undefined,
          mpfUsd: v.mpfUsd ?? undefined, hmfUsd: v.hmfUsd ?? undefined,
        });
      }
      this.router.navigate(['..'], { relativeTo: this.route });
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally { this.saving.set(false); }
  }

  cancel() { this.router.navigate(['..'], { relativeTo: this.route }); }
}

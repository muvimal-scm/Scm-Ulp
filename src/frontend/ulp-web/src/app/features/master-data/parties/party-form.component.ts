import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MasterDataApiService } from '../shared/master-data-api.service';
import {
  Country, Currency, CreatePartyRequest, Party, PartyType, PartyTypes,
  UpdatePartyRequest,
} from '../shared/master-data-types';

interface IdentifierRow {
  identifierType: string;
  identifierValue: string;
  isPrimary: boolean;
}

@Component({
  selector: 'ulp-master-data-party-form',
  standalone: true,
  imports: [
    RouterLink, FormsModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bc">
      Home <span class="bc-sep">›</span>
      <a routerLink="/app/master-data">Master Data</a> <span class="bc-sep">›</span>
      <a routerLink="/app/master-data/parties">Parties</a> <span class="bc-sep">›</span>
      <span>{{ isNew() ? 'New' : f.legalName || 'Edit' }}</span>
    </nav>

    <section class="hero">
      <div>
        <h1 class="brand-heading">{{ isNew() ? 'New Party' : f.legalName || 'Edit Party' }}</h1>
        <p>{{ isNew() ? 'Create a customer, vendor, or other party.' : 'Edit party details and identifiers.' }}</p>
      </div>
      <div class="hero__actions">
        <button mat-stroked-button routerLink="/app/master-data/parties">Cancel</button>
        <button mat-flat-button class="primary" (click)="save()" [disabled]="saving()">
          <mat-icon>save</mat-icon>
          {{ saving() ? 'Savingâ€¦' : (isNew() ? 'Create' : 'Save changes') }}
        </button>
      </div>
    </section>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32" /></div>
    } @else if (error()) {
      <p class="error">{{ error() }}</p>
    } @else {
      <section class="grid-2">
        <div class="card">
          <h2>Identity</h2>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Legal name</mat-label>
              <input matInput [(ngModel)]="f.legalName" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Trade name</mat-label>
              <input matInput [(ngModel)]="f.tradeName">
            </mat-form-field>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Party type</mat-label>
              <mat-select [(ngModel)]="f.partyType" required>
                @for (t of partyTypes; track t) {
                  <mat-option [value]="t">{{ t }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Country</mat-label>
              <mat-select [(ngModel)]="f.countryCode" required>
                @for (c of countries(); track c.code) {
                  <mat-option [value]="c.code">{{ c.name }} ({{ c.code }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Tax status</mat-label>
              <input matInput [(ngModel)]="f.taxStatus" placeholder="e.g. Regular GST / Tax Exempt">
            </mat-form-field>
            @if (!isNew()) {
              <mat-checkbox [(ngModel)]="f.isActive">Active</mat-checkbox>
            }
          </div>
        </div>

        <div class="card">
          <h2>Commercial</h2>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Preferred locale</mat-label>
              <input matInput [(ngModel)]="f.preferredLocale" placeholder="en-IN">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Preferred currency</mat-label>
              <mat-select [(ngModel)]="f.preferredCurrency">
                <mat-option [value]="''">â€”</mat-option>
                @for (c of currencies(); track c.code) {
                  <mat-option [value]="c.code">{{ c.code }} â€” {{ c.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Default payment terms</mat-label>
              <input matInput [(ngModel)]="f.defaultPaymentTerms" placeholder="Net 30">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Credit limit (amount)</mat-label>
              <input matInput type="number" [(ngModel)]="creditAmount">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Credit currency</mat-label>
              <mat-select [(ngModel)]="creditCurrency">
                <mat-option [value]="''">â€”</mat-option>
                @for (c of currencies(); track c.code) {
                  <mat-option [value]="c.code">{{ c.code }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </section>

      @if (isNew()) {
        <section class="card">
          <header class="card-h">
            <h2>Identifiers</h2>
            <button mat-stroked-button (click)="addIdentifier()">
              <mat-icon>add</mat-icon> Add identifier
            </button>
          </header>
          <p class="muted">
            Country-specific IDs (PAN, GSTIN, EIN, etc.). Validation happens
            once the country plugin ships in Phase 3 â€” for now stored as Pending.
          </p>
          @for (id of identifiers(); track id; let i = $index) {
            <div class="row id-row">
              <mat-form-field appearance="outline">
                <mat-label>Type</mat-label>
                <input matInput [(ngModel)]="id.identifierType" placeholder="PAN | GSTIN | EIN | DUNS â€¦">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Value</mat-label>
                <input matInput [(ngModel)]="id.identifierValue">
              </mat-form-field>
              <mat-checkbox [(ngModel)]="id.isPrimary">Primary</mat-checkbox>
              <button mat-icon-button (click)="removeIdentifier(i)" aria-label="Remove">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          } @empty {
            <p class="muted">No identifiers yet.</p>
          }
        </section>
      } @else {
        <section class="card">
          <h2>Existing identifiers</h2>
          @if (existingParty()?.identifiers?.length) {
            <table class="data">
              <thead>
                <tr><th>Type</th><th>Value</th><th>Primary</th><th>Status</th></tr>
              </thead>
              <tbody>
                @for (id of existingParty()!.identifiers; track id.id) {
                  <tr>
                    <td>{{ id.identifierType }}</td>
                    <td>{{ id.identifierValue }}</td>
                    <td>{{ id.isPrimary ? 'âœ“' : '' }}</td>
                    <td><span class="chip chip--{{ id.validationStatus.toLowerCase() }}">{{ id.validationStatus }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="muted">No identifiers yet.</p>
          }
        </section>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .bc { font-size: 12px; color: #9A9AA3; margin: 0 0 12px; }
    .bc-sep { color: #C9C9D0; padding: 0 4px; }
    .bc a { color: #3F2D7C; font-weight: 600; text-decoration: none; }
    .bc span:last-child { color: #3F2D7C; font-weight: 600; }

    .hero {
      display: flex; justify-content: space-between; align-items: center; gap: 16px;
      background: #FFFFFF; border: 3px solid #1A1A33;
      border-radius: 16px; padding: 20px 24px; margin-bottom: 16px;
      box-shadow: 0 4px 20px rgba(63, 45, 124, 0.08);
    }
    .hero h1 { font-weight: 800; font-size: 24px; line-height: 30px; margin: 0 0 4px; }
    .hero p  { color: #5C5C66; font-size: 13px; margin: 0; }
    .hero__actions { display: flex; gap: 8px; }
    .primary { background: #3F2D7C !important; color: #FFFFFF !important; border-radius: 999px; }
    .primary:hover { background: #5B3FA0 !important; }

    .grid-2 { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); margin-bottom: 16px; }
    .card {
      background: #FFFFFF; border: 1px solid rgba(63, 45, 124, 0.06);
      border-radius: 12px; padding: 20px 22px;
      box-shadow: 0 2px 8px rgba(63, 45, 124, 0.06);
      margin-bottom: 16px;
    }
    .card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .card h2 { color: #1A1A33; font-weight: 700; font-size: 15px; margin: 0 0 12px; }
    .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; align-items: start; }
    .id-row { align-items: center; }
    .muted { color: #5C5C66; font-size: 13px; margin: 0 0 12px; }
    .error { color: #D04E54; padding: 12px 16px; background: #FCDDE0; border-radius: 8px; }

    table.data { width: 100%; border-collapse: collapse; }
    table.data th, table.data td { padding: 8px 12px; text-align: left; font-size: 13px; }
    table.data th { color: #5C5C66; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
    table.data td { color: #2C2C36; border-top: 1px solid #EFEFF3; }
    .chip { display: inline-flex; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .chip--pending { background: #F5DCEA; color: #8B2F6C; }
    .chip--valid   { background: #E8E2F4; color: #3F2D7C; }
    .chip--invalid { background: #FCDDE0; color: #B23F45; }
    .chip--expired { background: #F0F0F4; color: #9A9AA3; }
    .loading { padding: 40px; text-align: center; }
  `],
})
export class PartyFormComponent implements OnInit {
  private readonly api = inject(MasterDataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly partyTypes = PartyTypes;
  protected readonly countries = signal<Country[]>([]);
  protected readonly currencies = signal<Currency[]>([]);
  protected readonly existingParty = signal<Party | null>(null);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly identifiers = signal<IdentifierRow[]>([]);

  // Mutable form state â€” bound directly via ngModel
  protected f: {
    countryCode: string;
    partyType: PartyType;
    legalName: string;
    tradeName: string;
    taxStatus: string;
    preferredLocale: string;
    preferredCurrency: string;
    defaultPaymentTerms: string;
    isActive: boolean;
  } = {
    countryCode: 'IN',
    partyType: 'Customer',
    legalName: '',
    tradeName: '',
    taxStatus: '',
    preferredLocale: '',
    preferredCurrency: '',
    defaultPaymentTerms: '',
    isActive: true,
  };

  protected creditAmount: number | null = null;
  protected creditCurrency = '';

  private editId: number | null = null;

  protected isNew(): boolean { return this.editId === null; }

  async ngOnInit() {
    try {
      const idParam = this.route.snapshot.paramMap.get('id');
      this.editId = idParam && idParam !== 'new' ? Number(idParam) : null;

      const [countries, currencies] = await Promise.all([
        this.api.listCountries(true),
        this.api.listCurrencies(true),
      ]);
      this.countries.set(countries);
      this.currencies.set(currencies);

      if (this.editId !== null) {
        const p = await this.api.getParty(this.editId);
        this.existingParty.set(p);
        this.f = {
          countryCode: p.countryCode,
          partyType: p.partyType,
          legalName: p.legalName,
          tradeName: p.tradeName ?? '',
          taxStatus: p.taxStatus ?? '',
          preferredLocale: p.preferredLocale ?? '',
          preferredCurrency: p.preferredCurrency ?? '',
          defaultPaymentTerms: p.defaultPaymentTerms ?? '',
          isActive: p.isActive,
        };
        if (p.creditLimit) {
          this.creditAmount = Number.parseFloat(p.creditLimit.amount);
          this.creditCurrency = p.creditLimit.currency;
        }
      }
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to load.');
    } finally {
      this.loading.set(false);
    }
  }

  protected addIdentifier() {
    this.identifiers.update(ids => [...ids, { identifierType: '', identifierValue: '', isPrimary: false }]);
  }
  protected removeIdentifier(i: number) {
    this.identifiers.update(ids => ids.filter((_, idx) => idx !== i));
  }

  async save() {
    this.saving.set(true);
    this.error.set(null);
    try {
      const creditLimit = this.creditAmount != null && this.creditCurrency
        ? { amount: this.creditAmount.toFixed(2), currency: this.creditCurrency }
        : null;

      if (this.isNew()) {
        const req: CreatePartyRequest = {
          countryCode: this.f.countryCode,
          partyType: this.f.partyType,
          legalName: this.f.legalName,
          tradeName: this.f.tradeName || null,
          preferredLocale: this.f.preferredLocale || null,
          preferredCurrency: this.f.preferredCurrency || null,
          defaultPaymentTerms: this.f.defaultPaymentTerms || null,
          taxStatus: this.f.taxStatus || null,
          creditLimit,
          identifiers: this.identifiers().filter(i => i.identifierType && i.identifierValue),
        };
        const created = await this.api.createParty(req);
        await this.router.navigate(['/app/master-data/parties', created.id]);
      } else {
        const req: UpdatePartyRequest = {
          partyType: this.f.partyType,
          legalName: this.f.legalName,
          tradeName: this.f.tradeName || null,
          isActive: this.f.isActive,
          preferredLocale: this.f.preferredLocale || null,
          preferredCurrency: this.f.preferredCurrency || null,
          defaultPaymentTerms: this.f.defaultPaymentTerms || null,
          taxStatus: this.f.taxStatus || null,
          creditLimit,
        };
        await this.api.updateParty(this.editId!, req);
        await this.router.navigate(['/app/master-data/parties']);
      }
    } catch (e) {
      this.error.set((e as Error).message ?? 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }
}

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
  Country, CreateProductRequest, Product, ProductTypeKind, ProductTypeKinds,
  Uom, UpdateProductRequest,
} from '../shared/master-data-types';

@Component({
  selector: 'ulp-master-data-product-form',
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
      <a routerLink="/app/master-data/products">Products</a> <span class="bc-sep">›</span>
      <span>{{ isNew() ? 'New' : f.productCode || 'Edit' }}</span>
    </nav>

    <section class="hero">
      <div>
        <h1 class="brand-heading">{{ isNew() ? 'New Product' : (f.productCode || 'Edit Product') }}</h1>
        <p>{{ isNew() ? 'Create a goods, service, or bundle product.' : 'Edit product fields.' }}</p>
      </div>
      <div class="hero__actions">
        <button mat-stroked-button routerLink="/app/master-data/products">Cancel</button>
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
              <mat-label>Product code</mat-label>
              <input matInput [(ngModel)]="f.productCode" required [disabled]="!isNew()">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Product name</mat-label>
              <input matInput [(ngModel)]="f.productName" required>
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Description</mat-label>
            <textarea matInput rows="2" [(ngModel)]="f.productDescription"></textarea>
          </mat-form-field>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select [(ngModel)]="f.productType" required>
                @for (t of productTypes; track t) {
                  <mat-option [value]="t">{{ t }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>UoM</mat-label>
              <mat-select [(ngModel)]="f.uomCode" required>
                @for (u of uoms(); track u.code) {
                  <mat-option [value]="u.code">{{ u.code }} â€” {{ u.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Weight (kg)</mat-label>
              <input matInput type="number" [(ngModel)]="f.weightKg">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Volume (cbm)</mat-label>
              <input matInput type="number" [(ngModel)]="f.volumeCbm">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Country of origin</mat-label>
              <mat-select [(ngModel)]="f.countryOfOrigin">
                <mat-option [value]="''">â€”</mat-option>
                @for (c of countries(); track c.code) {
                  <mat-option [value]="c.code">{{ c.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <div class="card">
          <h2>Classification</h2>
          <p class="muted">Multi-system per LLD Â§5.1 â€” a product can carry HS, HSN, HTSUS, and Schedule&nbsp;B codes simultaneously.</p>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>HS code (universal 6-digit)</mat-label>
              <input matInput [(ngModel)]="f.hsCode">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>HSN (IN, 8-digit)</mat-label>
              <input matInput [(ngModel)]="f.hsnCode">
            </mat-form-field>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>HTSUS (US, 10-digit)</mat-label>
              <input matInput [(ngModel)]="f.htsusCode">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Schedule B (US export, 10-digit)</mat-label>
              <input matInput [(ngModel)]="f.scheduleBCode">
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline">
            <mat-label>Tax class</mat-label>
            <input matInput [(ngModel)]="f.taxClass" placeholder="Standard Rate / Tangible Personal Property">
          </mat-form-field>
        </div>
      </section>

      <section class="card">
        <h2>Compliance flags</h2>
        <div class="flags-grid">
          <mat-checkbox [(ngModel)]="f.isHazmat">Hazmat (dangerous goods)</mat-checkbox>
          <mat-checkbox [(ngModel)]="f.isPerishable">Perishable</mat-checkbox>
          <mat-checkbox [(ngModel)]="f.isTemperatureControlled">Temperature-controlled</mat-checkbox>
          <mat-checkbox [(ngModel)]="f.isDualUse">Dual-use (export-control)</mat-checkbox>
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .bc { font-size: 12px; color: #9A9AA3; margin: 0 0 12px; }
    .bc-sep { color: #C9C9D0; padding: 0 4px; }
    .bc a { color: #3F2D7C; font-weight: 600; text-decoration: none; }
    .bc span:last-child { color: #3F2D7C; font-weight: 600; }

    .hero { display: flex; justify-content: space-between; align-items: center; gap: 16px;
      background: #FFFFFF; border: 3px solid #1A1A33; border-radius: 16px;
      padding: 20px 24px; margin-bottom: 16px; box-shadow: 0 4px 20px rgba(63, 45, 124, 0.08); }
    .hero h1 { font-weight: 800; font-size: 24px; line-height: 30px; margin: 0 0 4px; }
    .hero p  { color: #5C5C66; font-size: 13px; margin: 0; }
    .hero__actions { display: flex; gap: 8px; }
    .primary { background: #3F2D7C !important; color: #FFFFFF !important; border-radius: 999px; }
    .primary:hover { background: #5B3FA0 !important; }

    .grid-2 { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); margin-bottom: 16px; }
    .card { background: #FFFFFF; border: 1px solid rgba(63, 45, 124, 0.06); border-radius: 12px;
      padding: 20px 22px; box-shadow: 0 2px 8px rgba(63, 45, 124, 0.06); margin-bottom: 16px; }
    .card h2 { color: #1A1A33; font-weight: 700; font-size: 15px; margin: 0 0 12px; }
    .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; align-items: start; margin-bottom: 4px; }
    .full { width: 100%; }
    .muted { color: #5C5C66; font-size: 12px; margin: 0 0 12px; }
    .flags-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .error { color: #D04E54; padding: 12px 16px; background: #FCDDE0; border-radius: 8px; }
    .loading { padding: 40px; text-align: center; }
  `],
})
export class ProductFormComponent implements OnInit {
  private readonly api = inject(MasterDataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly productTypes = ProductTypeKinds;
  protected readonly countries = signal<Country[]>([]);
  protected readonly uoms = signal<Uom[]>([]);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected f: {
    countryCode: string | null;
    productCode: string;
    productName: string;
    productDescription: string;
    productType: ProductTypeKind;
    uomCode: string;
    weightKg: number | null;
    volumeCbm: number | null;
    hsCode: string;
    hsnCode: string;
    htsusCode: string;
    scheduleBCode: string;
    taxClass: string;
    countryOfOrigin: string;
    isHazmat: boolean;
    isPerishable: boolean;
    isTemperatureControlled: boolean;
    isDualUse: boolean;
  } = {
    countryCode: null, productCode: '', productName: '', productDescription: '',
    productType: 'Goods', uomCode: 'EA', weightKg: null, volumeCbm: null,
    hsCode: '', hsnCode: '', htsusCode: '', scheduleBCode: '',
    taxClass: '', countryOfOrigin: '',
    isHazmat: false, isPerishable: false, isTemperatureControlled: false, isDualUse: false,
  };

  private editId: number | null = null;
  protected isNew(): boolean { return this.editId === null; }

  async ngOnInit() {
    try {
      const idParam = this.route.snapshot.paramMap.get('id');
      this.editId = idParam && idParam !== 'new' ? Number(idParam) : null;

      const [countries, uoms] = await Promise.all([
        this.api.listCountries(true),
        this.api.listUoms(),
      ]);
      this.countries.set(countries);
      this.uoms.set(uoms);

      if (this.editId !== null) {
        const p = await this.api.getProduct(this.editId);
        this.f = {
          countryCode: p.countryCode ?? null,
          productCode: p.productCode,
          productName: p.productName,
          productDescription: p.productDescription ?? '',
          productType: p.productType,
          uomCode: p.uomCode,
          weightKg: p.weightKg ?? null,
          volumeCbm: p.volumeCbm ?? null,
          hsCode: p.hsCode ?? '',
          hsnCode: p.hsnCode ?? '',
          htsusCode: p.htsusCode ?? '',
          scheduleBCode: p.scheduleBCode ?? '',
          taxClass: p.taxClass ?? '',
          countryOfOrigin: p.countryOfOrigin ?? '',
          isHazmat: p.isHazmat,
          isPerishable: p.isPerishable,
          isTemperatureControlled: p.isTemperatureControlled,
          isDualUse: p.isDualUse,
        };
      }
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to load.');
    } finally {
      this.loading.set(false);
    }
  }

  async save() {
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isNew()) {
        const req: CreateProductRequest = {
          countryCode: this.f.countryCode,
          productCode: this.f.productCode,
          productName: this.f.productName,
          productDescription: this.f.productDescription || null,
          productType: this.f.productType,
          uomCode: this.f.uomCode,
          weightKg: this.f.weightKg,
          volumeCbm: this.f.volumeCbm,
          hsCode: this.f.hsCode || null,
          hsnCode: this.f.hsnCode || null,
          htsusCode: this.f.htsusCode || null,
          scheduleBCode: this.f.scheduleBCode || null,
          taxClass: this.f.taxClass || null,
          countryOfOrigin: this.f.countryOfOrigin || null,
          isHazmat: this.f.isHazmat,
          isPerishable: this.f.isPerishable,
          isTemperatureControlled: this.f.isTemperatureControlled,
          isDualUse: this.f.isDualUse,
        };
        const created = await this.api.createProduct(req);
        await this.router.navigate(['/app/master-data/products', created.id]);
      } else {
        const req: UpdateProductRequest = {
          productName: this.f.productName,
          productDescription: this.f.productDescription || null,
          productType: this.f.productType,
          uomCode: this.f.uomCode,
          weightKg: this.f.weightKg,
          volumeCbm: this.f.volumeCbm,
          hsCode: this.f.hsCode || null,
          hsnCode: this.f.hsnCode || null,
          htsusCode: this.f.htsusCode || null,
          scheduleBCode: this.f.scheduleBCode || null,
          taxClass: this.f.taxClass || null,
          countryOfOrigin: this.f.countryOfOrigin || null,
          isHazmat: this.f.isHazmat,
          isPerishable: this.f.isPerishable,
          isTemperatureControlled: this.f.isTemperatureControlled,
          isDualUse: this.f.isDualUse,
        };
        await this.api.updateProduct(this.editId!, req);
        await this.router.navigate(['/app/master-data/products']);
      }
    } catch (e) {
      this.error.set((e as Error).message ?? 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }
}

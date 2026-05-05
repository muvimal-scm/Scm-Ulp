import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/dialogs/confirm-dialog.component';
import { MasterDataApiService } from '../shared/master-data-api.service';
import { Product, ProductTypeKind, ProductTypeKinds } from '../shared/master-data-types';

@Component({
  selector: 'ulp-master-data-product-list',
  standalone: true,
  imports: [
    RouterLink, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bc">
      Home <span class="bc-sep">›</span>
      <a routerLink="/app/master-data">Master Data</a> <span class="bc-sep">›</span>
      <span>Products</span>
    </nav>

    <section class="hero">
      <div>
        <h1 class="brand-heading">Products</h1>
        <p>Goods, services, and bundles. Classification per HS, HSN (IN), HTSUS (US), Schedule B (US).</p>
      </div>
      <button mat-flat-button class="primary" routerLink="new">
        <mat-icon>add</mat-icon>
        Add product
      </button>
    </section>

    <section class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Search</mat-label>
        <input matInput [ngModel]="search()" (ngModelChange)="onSearch($event)" placeholder="Code or name">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Type</mat-label>
        <mat-select [ngModel]="filterType()" (ngModelChange)="onTypeChange($event)">
          <mat-option [value]="''">All types</mat-option>
          @for (t of productTypes; track t) {
            <mat-option [value]="t">{{ t }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </section>

    <section class="card">
      @if (loading()) {
        <div class="loading"><mat-spinner diameter="32" /></div>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (rows().length === 0) {
        <p class="empty">No products yet. Click <strong>Add product</strong> to create one.</p>
      } @else {
        <table class="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>UoM</th>
              <th>HS / HSN / HTS</th>
              <th>Flags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of rows(); track p.id) {
              <tr>
                <td><strong>{{ p.productCode }}</strong></td>
                <td>{{ p.productName }}</td>
                <td>{{ p.productType }}</td>
                <td>{{ p.uomCode }}</td>
                <td class="cls">
                  @if (p.hsCode)    { <span class="tag">HS {{ p.hsCode }}</span> }
                  @if (p.hsnCode)   { <span class="tag tag--hsn">HSN {{ p.hsnCode }}</span> }
                  @if (p.htsusCode) { <span class="tag tag--hts">HTS {{ p.htsusCode }}</span> }
                </td>
                <td class="flags">
                  @if (p.isHazmat)              { <span class="flag">Hazmat</span> }
                  @if (p.isPerishable)          { <span class="flag">Perishable</span> }
                  @if (p.isTemperatureControlled) { <span class="flag">Temp-controlled</span> }
                  @if (p.isDualUse)             { <span class="flag">Dual-use</span> }
                </td>
                <td class="actions">
                  <a mat-icon-button [routerLink]="[p.id]" matTooltip="Edit" aria-label="Edit product">
                    <mat-icon>edit</mat-icon>
                  </a>
                  <button mat-icon-button color="warn" (click)="onDelete(p)" [disabled]="busyId() === p.id" matTooltip="Delete" aria-label="Delete product">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pager">
          <span>{{ total() }} total · page {{ page() }}</span>
          <span>
            <button mat-stroked-button [disabled]="page() <= 1" (click)="prev()">Previous</button>
            <button mat-stroked-button [disabled]="page() * pageSize >= total()" (click)="next()">Next</button>
          </span>
        </div>
      }
    </section>
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
    .primary { background: #3F2D7C !important; color: #FFFFFF !important; border-radius: 999px;
      padding: 0 20px !important; font-weight: 600; box-shadow: 0 6px 16px rgba(63,45,124,.3) !important; }
    .primary:hover { background: #5B3FA0 !important; }

    .filters { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .filters mat-form-field { min-width: 220px; }

    .card { background: #FFFFFF; border: 1px solid rgba(63, 45, 124, 0.06); border-radius: 12px;
      padding: 4px; box-shadow: 0 2px 8px rgba(63, 45, 124, 0.06); }
    .loading, .empty, .error { padding: 40px; text-align: center; color: #5C5C66; }
    .error { color: #D04E54; }

    table.data { width: 100%; border-collapse: collapse; }
    table.data th, table.data td { padding: 12px 16px; text-align: left; font-size: 13px; }
    table.data th { color: #5C5C66; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.4px;
      border-bottom: 1px solid #EFEFF3; background: #FAFAFC; }
    table.data td { border-bottom: 1px solid #EFEFF3; color: #2C2C36; }
    table.data tr:last-child td { border-bottom: 0; }
    table.data tr:hover td { background: #F5F2FB; }

    .cls { display: flex; flex-wrap: wrap; gap: 4px; }
    .tag { background: #EDE5FA; color: #5B3FA0; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .tag--hsn { background: #DCF1E5; color: #2E8B57; }
    .tag--hts { background: #DEF2F0; color: #0D9488; }

    .flags { display: flex; flex-wrap: wrap; gap: 4px; }
    .flag { background: #FAEBCD; color: #B47A18; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }

    .actions { text-align: right; }
    .link { color: #3F2D7C; font-weight: 600; text-decoration: none; }
    .link:hover { text-decoration: underline; }

    .pager { display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; color: #5C5C66; font-size: 12px; border-top: 1px solid #EFEFF3; }
    .pager > span:last-child { display: flex; gap: 8px; }
  `],
})
export class ProductListComponent implements OnInit {
  private readonly api    = inject(MasterDataApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack  = inject(MatSnackBar);
  protected readonly productTypes = ProductTypeKinds;

  protected readonly rows    = signal<Product[]>([]);
  protected readonly total   = signal(0);
  protected readonly loading = signal(false);
  protected readonly error   = signal<string | null>(null);
  protected readonly busyId  = signal<number | null>(null);

  protected readonly search     = signal('');
  protected readonly filterType = signal<ProductTypeKind | ''>('');
  protected readonly page       = signal(1);
  protected readonly pageSize   = 25;

  private debounce: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit() { await this.load(); }

  protected async onDelete(p: Product) {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      data: {
        title: 'Delete product',
        message: `Delete product "${p.productCode} — ${p.productName}"? This cannot be undone if no transactions reference it.`,
        confirmText: 'Delete',
        danger: true,
      },
      width: '460px',
    });
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;

    this.busyId.set(p.id);
    try {
      await this.api.deleteProduct(p.id);
      this.snack.open(`Product "${p.productCode}" deleted`, 'Dismiss', { duration: 4000 });
      await this.load();
    } catch (e: any) {
      const msg = e?.error?.error ?? e?.message ?? 'Delete failed';
      this.snack.open(msg, 'Dismiss', { duration: 6000, panelClass: 'snack-error' });
    } finally {
      this.busyId.set(null);
    }
  }

  private async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const r = await this.api.listProducts({
        search: this.search() || undefined,
        productType: this.filterType() || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      });
      this.rows.set(r.items);
      this.total.set(r.totalCount);
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to load products.');
    } finally {
      this.loading.set(false);
    }
  }

  protected onSearch(v: string) {
    this.search.set(v);
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => { this.page.set(1); void this.load(); }, 250);
  }
  protected onTypeChange(v: ProductTypeKind | '') { this.filterType.set(v); this.page.set(1); void this.load(); }
  protected prev() { if (this.page() > 1) { this.page.update(p => p - 1); void this.load(); } }
  protected next() { if (this.page() * this.pageSize < this.total()) { this.page.update(p => p + 1); void this.load(); } }
}

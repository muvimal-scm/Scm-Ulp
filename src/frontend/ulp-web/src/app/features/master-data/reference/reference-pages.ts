import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MasterDataApiService } from '../shared/master-data-api.service';
import { Country, Currency, Holiday, Port, StateOrProvince, Uom } from '../shared/master-data-types';

/* ------------------------------------------------------------------ */
/*  Shared styles + breadcrumb fragment                               */
/* ------------------------------------------------------------------ */

const SHARED_STYLES = `
  :host { display: block; }
  .bc { font-size: 12px; color: #9A9AA3; margin: 0 0 12px; }
  .bc-sep { color: #C9C9D0; padding: 0 4px; }
  .bc a { color: #3F2D7C; font-weight: 600; text-decoration: none; }
  .bc span:last-child { color: #3F2D7C; font-weight: 600; }

  .hero { background: #FFFFFF; border: 3px solid #1A1A33; border-radius: 16px;
    padding: 20px 24px; margin-bottom: 16px; box-shadow: 0 4px 20px rgba(63, 45, 124, 0.08); }
  .hero h1 { font-weight: 800; font-size: 24px; line-height: 30px; margin: 0 0 4px; }
  .hero p  { color: #5C5C66; font-size: 13px; margin: 0; }

  .filters { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
  .filters mat-form-field { min-width: 220px; }

  .card { background: #FFFFFF; border: 1px solid rgba(63, 45, 124, 0.06); border-radius: 12px;
    padding: 4px; box-shadow: 0 2px 8px rgba(63, 45, 124, 0.06); }
  .loading, .empty, .error { padding: 40px; text-align: center; color: #5C5C66; }
  .error { color: #D04E54; }

  table.data { width: 100%; border-collapse: collapse; }
  table.data th, table.data td { padding: 10px 14px; text-align: left; font-size: 13px; }
  table.data th { color: #5C5C66; font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.4px;
    border-bottom: 1px solid #EFEFF3; background: #FAFAFC; }
  table.data td { border-bottom: 1px solid #EFEFF3; color: #2C2C36; }
  table.data tr:last-child td { border-bottom: 0; }
  table.data tr:hover td { background: #F5F2FB; }

  .chip { display: inline-flex; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .chip--ok { background: #E8E2F4; color: #3F2D7C; }
  .chip--off { background: #F0F0F4; color: #9A9AA3; }
`;

/* ================================================================== */
/*  Countries                                                         */
/* ================================================================== */
@Component({
  selector: 'ulp-master-data-countries',
  standalone: true,
  imports: [RouterLink, FormsModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bc">Home <span class="bc-sep">›</span> <a routerLink="/app/master-data">Master Data</a> <span class="bc-sep">›</span> <span>Countries</span></nav>
    <section class="hero"><h1 class="brand-heading">Countries</h1><p>ISO 3166-1 reference. ULP supports tenants in countries marked Supported.</p></section>
    <section class="filters">
      <label class="check"><input type="checkbox" [(ngModel)]="supportedOnly" (ngModelChange)="reload()"> Supported only</label>
    </section>
    <section class="card">
      @if (loading()) { <div class="loading"><mat-spinner diameter="32"/></div> }
      @else if (rows().length === 0) { <p class="empty">No countries.</p> }
      @else {
        <table class="data">
          <thead><tr><th>Code</th><th>Name</th><th>Region</th><th>Currency</th><th>Locale</th><th>Time zone</th><th>Supported</th></tr></thead>
          <tbody>
            @for (c of rows(); track c.code) {
              <tr>
                <td><strong>{{ c.code }}</strong> <span class="muted">/ {{ c.code3 }}</span></td>
                <td>{{ c.name }}</td>
                <td>{{ c.region || 'â€”' }}</td>
                <td>{{ c.defaultCurrency }}</td>
                <td>{{ c.defaultLocale }}</td>
                <td>{{ c.defaultTimeZone }}</td>
                <td>@if (c.isSupported) {<span class="chip chip--ok">Yes</span>} @else {<span class="chip chip--off">No</span>}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [SHARED_STYLES + `.muted { color: #9A9AA3; font-size: 11px; } .check { color: #5C5C66; font-size: 13px; cursor: pointer; }`],
})
export class CountriesComponent implements OnInit {
  private readonly api = inject(MasterDataApiService);
  protected readonly rows = signal<Country[]>([]);
  protected readonly loading = signal(false);
  protected supportedOnly = false;
  async ngOnInit() { await this.reload(); }
  async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listCountries(this.supportedOnly)); }
    finally { this.loading.set(false); }
  }
}

/* ================================================================== */
/*  States / Provinces                                                */
/* ================================================================== */
@Component({
  selector: 'ulp-master-data-states',
  standalone: true,
  imports: [RouterLink, FormsModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bc">Home <span class="bc-sep">›</span> <a routerLink="/app/master-data">Master Data</a> <span class="bc-sep">›</span> <span>States / Provinces</span></nav>
    <section class="hero"><h1 class="brand-heading">States / Provinces</h1><p>IN: 28 states + 8 UTs. US: 50 states + DC + 5 territories.</p></section>
    <section class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Country</mat-label>
        <mat-select [(ngModel)]="country" (ngModelChange)="reload()">
          <mat-option value="IN">India (IN)</mat-option>
          <mat-option value="US">United States (US)</mat-option>
        </mat-select>
      </mat-form-field>
    </section>
    <section class="card">
      @if (loading()) { <div class="loading"><mat-spinner diameter="32"/></div> }
      @else if (rows().length === 0) { <p class="empty">No states.</p> }
      @else {
        <table class="data">
          <thead><tr><th>Code</th><th>Name</th><th>Time zone</th><th>Capital</th><th>Special</th></tr></thead>
          <tbody>
            @for (s of rows(); track s.id) {
              <tr>
                <td><strong>{{ s.code }}</strong></td>
                <td>{{ s.name }}</td>
                <td>{{ s.timeZone || 'â€”' }}</td>
                <td>{{ s.capitalCity || 'â€”' }}</td>
                <td>@if (s.isSpecial) {<span class="chip chip--ok">UT / Territory</span>} @else {<span class="chip chip--off">State</span>}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [SHARED_STYLES],
})
export class StatesComponent implements OnInit {
  private readonly api = inject(MasterDataApiService);
  protected readonly rows = signal<StateOrProvince[]>([]);
  protected readonly loading = signal(false);
  protected country = 'IN';
  async ngOnInit() { await this.reload(); }
  async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listStates(this.country)); }
    finally { this.loading.set(false); }
  }
}

/* ================================================================== */
/*  Currencies                                                        */
/* ================================================================== */
@Component({
  selector: 'ulp-master-data-currencies',
  standalone: true,
  imports: [RouterLink, FormsModule, MatIconModule, MatFormFieldModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bc">Home <span class="bc-sep">›</span> <a routerLink="/app/master-data">Master Data</a> <span class="bc-sep">›</span> <span>Currencies</span></nav>
    <section class="hero"><h1 class="brand-heading">Currencies</h1><p>ISO 4217 â€” code, symbol, decimal precision.</p></section>
    <section class="card">
      @if (loading()) { <div class="loading"><mat-spinner diameter="32"/></div> }
      @else {
        <table class="data">
          <thead><tr><th>Code</th><th>Symbol</th><th>Name</th><th>Decimals</th><th>Default country</th><th>Active</th></tr></thead>
          <tbody>
            @for (c of rows(); track c.code) {
              <tr>
                <td><strong>{{ c.code }}</strong></td>
                <td><span class="sym">{{ c.symbol || 'â€”' }}</span></td>
                <td>{{ c.name }}</td>
                <td>{{ c.decimalDigits }}</td>
                <td>{{ c.defaultCountry || 'â€”' }}</td>
                <td>@if (c.isActive) {<span class="chip chip--ok">Active</span>} @else {<span class="chip chip--off">Inactive</span>}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [SHARED_STYLES + `.sym { font-size: 16px; font-weight: 700; color: #3F2D7C; }`],
})
export class CurrenciesComponent implements OnInit {
  private readonly api = inject(MasterDataApiService);
  protected readonly rows = signal<Currency[]>([]);
  protected readonly loading = signal(false);
  async ngOnInit() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listCurrencies(false)); }
    finally { this.loading.set(false); }
  }
}

/* ================================================================== */
/*  Units of Measure                                                  */
/* ================================================================== */
@Component({
  selector: 'ulp-master-data-uoms',
  standalone: true,
  imports: [RouterLink, FormsModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bc">Home <span class="bc-sep">›</span> <a routerLink="/app/master-data">Master Data</a> <span class="bc-sep">›</span> <span>Units of Measure</span></nav>
    <section class="hero"><h1 class="brand-heading">Units of Measure</h1><p>Length, weight, volume, container, count units. Conversion factors to base unit included.</p></section>
    <section class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Category</mat-label>
        <mat-select [(ngModel)]="category" (ngModelChange)="reload()">
          <mat-option value="">All</mat-option>
          <mat-option value="Length">Length</mat-option>
          <mat-option value="Weight">Weight</mat-option>
          <mat-option value="Volume">Volume</mat-option>
          <mat-option value="Container">Container</mat-option>
          <mat-option value="Count">Count</mat-option>
        </mat-select>
      </mat-form-field>
    </section>
    <section class="card">
      @if (loading()) { <div class="loading"><mat-spinner diameter="32"/></div> }
      @else {
        <table class="data">
          <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Base factor</th><th>Base UoM</th></tr></thead>
          <tbody>
            @for (u of rows(); track u.code) {
              <tr>
                <td><strong>{{ u.code }}</strong></td>
                <td>{{ u.name }}</td>
                <td><span class="chip chip--ok">{{ u.category }}</span></td>
                <td>{{ u.baseFactor ?? 'â€”' }}</td>
                <td>{{ u.baseUomCode || 'â€”' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [SHARED_STYLES],
})
export class UomsComponent implements OnInit {
  private readonly api = inject(MasterDataApiService);
  protected readonly rows = signal<Uom[]>([]);
  protected readonly loading = signal(false);
  protected category = '';
  async ngOnInit() { await this.reload(); }
  async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listUoms(this.category || undefined)); }
    finally { this.loading.set(false); }
  }
}

/* ================================================================== */
/*  Ports                                                             */
/* ================================================================== */
@Component({
  selector: 'ulp-master-data-ports',
  standalone: true,
  imports: [RouterLink, FormsModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bc">Home <span class="bc-sep">›</span> <a routerLink="/app/master-data">Master Data</a> <span class="bc-sep">›</span> <span>Ports</span></nav>
    <section class="hero"><h1 class="brand-heading">Ports</h1><p>UN/LOCODE â€” sea, air, multimodal. CBP Schedule D codes for US ports.</p></section>
    <section class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Country</mat-label>
        <mat-select [(ngModel)]="country" (ngModelChange)="reload()">
          <mat-option value="">All</mat-option>
          <mat-option value="IN">India</mat-option>
          <mat-option value="US">United States</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Type</mat-label>
        <mat-select [(ngModel)]="portType" (ngModelChange)="reload()">
          <mat-option value="">All</mat-option>
          <mat-option value="Sea">Sea</mat-option>
          <mat-option value="Air">Air</mat-option>
          <mat-option value="Multimodal">Multimodal</mat-option>
        </mat-select>
      </mat-form-field>
    </section>
    <section class="card">
      @if (loading()) { <div class="loading"><mat-spinner diameter="32"/></div> }
      @else {
        <table class="data">
          <thead><tr><th>UN/LOCODE</th><th>Name</th><th>Country</th><th>Type</th><th>CBP Schedule D</th></tr></thead>
          <tbody>
            @for (p of rows(); track p.id) {
              <tr>
                <td><strong>{{ p.unLocode }}</strong></td>
                <td>{{ p.name }}</td>
                <td>{{ p.countryCode }}</td>
                <td><span class="chip chip--ok">{{ p.portType }}</span></td>
                <td>{{ p.cbpScheduleD || 'â€”' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [SHARED_STYLES],
})
export class PortsComponent implements OnInit {
  private readonly api = inject(MasterDataApiService);
  protected readonly rows = signal<Port[]>([]);
  protected readonly loading = signal(false);
  protected country = '';
  protected portType = '';
  async ngOnInit() { await this.reload(); }
  async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listPorts({ countryCode: this.country || undefined, portType: this.portType || undefined })); }
    finally { this.loading.set(false); }
  }
}

/* ================================================================== */
/*  Holidays                                                          */
/* ================================================================== */
@Component({
  selector: 'ulp-master-data-holidays',
  standalone: true,
  imports: [RouterLink, FormsModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bc">Home <span class="bc-sep">›</span> <a routerLink="/app/master-data">Master Data</a> <span class="bc-sep">›</span> <span>Holidays</span></nav>
    <section class="hero"><h1 class="brand-heading">Holiday Calendar</h1><p>Country / state holidays â€” used by SLA, due-date and working-day calculations.</p></section>
    <section class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Country</mat-label>
        <mat-select [(ngModel)]="country" (ngModelChange)="reload()">
          <mat-option value="IN">India</mat-option>
          <mat-option value="US">United States</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Year</mat-label>
        <input matInput type="number" [(ngModel)]="year" (change)="reload()">
      </mat-form-field>
    </section>
    <section class="card">
      @if (loading()) { <div class="loading"><mat-spinner diameter="32"/></div> }
      @else if (rows().length === 0) { <p class="empty">No holidays for {{ country }} {{ year }}. Holiday data isn't seeded in Phase 1 â€” populated when M27 / scheduling needs it.</p> }
      @else {
        <table class="data">
          <thead><tr><th>Date</th><th>Name</th><th>State</th><th>Observed</th></tr></thead>
          <tbody>
            @for (h of rows(); track h.id) {
              <tr>
                <td><strong>{{ h.holidayDate }}</strong></td>
                <td>{{ h.name }}</td>
                <td>{{ h.stateCode || 'Country-wide' }}</td>
                <td>@if (h.isObserved) {<span class="chip chip--ok">Yes</span>} @else {<span class="chip chip--off">No</span>}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [SHARED_STYLES],
})
export class HolidaysComponent implements OnInit {
  private readonly api = inject(MasterDataApiService);
  protected readonly rows = signal<Holiday[]>([]);
  protected readonly loading = signal(false);
  protected country = 'IN';
  protected year = new Date().getFullYear();
  async ngOnInit() { await this.reload(); }
  async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listHolidays(this.country, this.year)); }
    finally { this.loading.set(false); }
  }
}

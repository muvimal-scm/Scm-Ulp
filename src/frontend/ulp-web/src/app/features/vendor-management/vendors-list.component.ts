import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VendorManagementApiService } from './shared/vendor-management-api.service';
import { VendorDto, VendorStatus } from './shared/vendor-management-types';

@Component({
  selector: 'ulp-vendor-management-vendors',
  standalone: true,
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Vendors</h1>
      <p>Vendor satellite over <code>m1_party</code>. Onboarding workflow + agreements + NCRs.</p>
    </header>

    <div class="toolbar">
      <mat-form-field appearance="outline" class="filter">
        <mat-label>Status</mat-label>
        <mat-select [(value)]="statusFilter" (selectionChange)="reload()">
          <mat-option [value]="undefined">All</mat-option>
          @for (s of statuses; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="country">
        <mat-label>Country</mat-label>
        <mat-select [(value)]="countryFilter" (selectionChange)="reload()">
          <mat-option [value]="undefined">Both</mat-option>
          <mat-option value="IN">IN</mat-option>
          <mat-option value="US">US</mat-option>
        </mat-select>
      </mat-form-field>

      <a mat-flat-button color="primary" routerLink="new">
        <mat-icon>add</mat-icon> Create vendor
      </a>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Country</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Categories</th>
              <th>Compliance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (v of rows(); track v.id) {
              <tr>
                <td>
                  <div class="cell">
                    <code>{{ v.vendorCode }}</code>
                    <div class="party">party id {{ v.partyId }}</div>
                  </div>
                </td>
                <td>{{ v.countryCode }}</td>
                <td><span class="badge badge--{{ v.status.toLowerCase() }}">{{ v.status }}</span></td>
                <td><span class="risk risk--{{ v.riskTier.toLowerCase() }}">{{ v.riskTier }}</span></td>
                <td>
                  @if (v.categories.length === 0) { <em>â€”</em> }
                  @for (c of v.categories.slice(0, 2); track c) {
                    <span class="cat">{{ c }}</span>
                  }
                  @if (v.categories.length > 2) {
                    <span class="more">+{{ v.categories.length - 2 }}</span>
                  }
                </td>
                <td class="comp">
                  @if (v.tdsApplicable) { <span class="comp-flag">TDS{{ v.tdsSection ? ' ' + v.tdsSection : '' }}</span> }
                  @if (v.isMsme) { <span class="comp-flag">MSME</span> }
                  @if (v.is1099Reportable) { <span class="comp-flag">1099</span> }
                  @if (v.w9OnFile) { <span class="comp-flag comp-flag--ok">W-9 âœ“</span> }
                </td>
                <td class="actions">
                  <a mat-icon-button [routerLink]="[v.id]" matTooltip="Open"><mat-icon>open_in_new</mat-icon></a>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty">No vendors yet for this tenant.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="footer">{{ total() }} vendor{{ total() === 1 ? '' : 's' }}</div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 {
      font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; }

    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .filter { width: 200px; } .country { width: 120px; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }

    .table-wrap {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      text-align: left; padding: 12px 16px;
      background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #F8F5FD; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }

    .cell code { background: #F5F2FB; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .party { color: #9A9AA3; font-size: 11px; margin-top: 2px; }

    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
    .badge--prospect              { background: #F0F0F4; color: #6B6B73; }
    .badge--onboardinginprogress  { background: #FFF3D6; color: #946100; }
    .badge--active                { background: #DCF5E4; color: #1F7A3D; }
    .badge--suspended             { background: #FCDDE0; color: #B23F45; }
    .badge--blacklisted           { background: #FFCDD2; color: #B71C1C; }
    .badge--closed                { background: #F0F0F4; color: #6B6B73; }

    .risk { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .risk--low      { background: #DCF5E4; color: #1F7A3D; }
    .risk--medium   { background: #FFF3D6; color: #946100; }
    .risk--high     { background: #FCDDE0; color: #B23F45; }
    .risk--critical { background: #FFCDD2; color: #B71C1C; }

    .cat {
      display: inline-block; padding: 2px 8px; border-radius: 6px; margin: 2px 4px 2px 0;
      background: #E8E2F4; color: #3F2D7C; font-size: 10.5px; font-family: 'SFMono-Regular', Consolas, monospace;
    }
    .more { color: #9A9AA3; font-size: 11px; }

    .comp { font-size: 12px; }
    .comp-flag { display: inline-block; padding: 2px 8px; border-radius: 4px; margin: 1px 3px 1px 0; background: #FFF3D6; color: #946100; font-size: 10.5px; font-weight: 700; }
    .comp-flag--ok { background: #DCF5E4; color: #1F7A3D; }

    .actions { text-align: right; }
    .footer { margin-top: 12px; color: #6B5BA0; font-size: 12px; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
  `],
})
export class VendorsListComponent implements OnInit {
  private readonly api = inject(VendorManagementApiService);

  readonly rows    = signal<VendorDto[]>([]);
  readonly total   = signal(0);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  statusFilter?: VendorStatus;
  countryFilter?: string;

  readonly statuses: VendorStatus[] = ['Prospect', 'OnboardingInProgress', 'Active', 'Suspended', 'Blacklisted', 'Closed'];

  async ngOnInit() { await this.reload(); }

  async reload() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.list({
        status: this.statusFilter,
        countryCode: this.countryFilter,
      });
      this.rows.set(res.items);
      this.total.set(res.total);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load vendors');
    } finally {
      this.loading.set(false);
    }
  }
}

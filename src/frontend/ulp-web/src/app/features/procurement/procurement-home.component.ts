import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'ulp-procurement-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Procurement</h1>
      <p>Buy-side: PR → vendor RFQ → PO → GRN → 3-way invoice match.</p>
    </header>

    <div class="tile-grid">
      <a routerLink="purchase-requests" class="tile">
        <mat-icon>assignment</mat-icon>
        <div class="tile__title">Purchase requests</div>
        <div class="tile__sub">Internal departmental requests for goods/services</div>
      </a>
      <a routerLink="rfqs" class="tile">
        <mat-icon>send</mat-icon>
        <div class="tile__title">Vendor RFQs</div>
        <div class="tile__sub">Solicit quotes from approved vendors</div>
      </a>
      <a routerLink="purchase-orders" class="tile">
        <mat-icon>receipt_long</mat-icon>
        <div class="tile__title">Purchase orders</div>
        <div class="tile__sub">Issued POs · status · partial receipts</div>
      </a>
      <a routerLink="grns" class="tile">
        <mat-icon>inbox</mat-icon>
        <div class="tile__title">Goods receipts</div>
        <div class="tile__sub">Receive against PO · condition · damage tracking</div>
      </a>
      <a routerLink="invoice-matches" class="tile">
        <mat-icon>fact_check</mat-icon>
        <div class="tile__title">Invoice matching</div>
        <div class="tile__sub">3-way match: PO + GRN + vendor invoice</div>
      </a>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 28px; }
    .tile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .tile {
      display: block; padding: 22px; border-radius: 14px;
      background: #FFFFFF; border: 1px solid #E8E2F4;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
      text-decoration: none; color: inherit;
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(63, 45, 124, 0.12); border-color: #C9BEEC; }
    .tile mat-icon { color: #5B3FA0; font-size: 28px; width: 28px; height: 28px; margin-bottom: 12px; }
    .tile__title { color: #1A1A33; font-weight: 700; font-size: 16px; }
    .tile__sub   { color: #6B5BA0; font-size: 13px; margin-top: 4px; }
  `],
})
export class ProcurementHomeComponent {}

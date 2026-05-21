import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'ulp-marketplace-home',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Marketplace</h1>
      <p>Supplier catalog — browse products, build a cart, and create purchase orders directly.</p>
    </header>
    <div class="tile-grid">
      <a routerLink="catalog" class="tile tile--primary">
        <mat-icon>storefront</mat-icon>
        <div class="tile__title">Product Catalog</div>
        <div class="tile__sub">Browse all supplier products by section</div>
      </a>
      <a routerLink="/app/procurement/pos" class="tile">
        <mat-icon>receipt_long</mat-icon>
        <div class="tile__title">Purchase Orders</div>
        <div class="tile__sub">Review, approve and track all POs</div>
      </a>
      <a routerLink="/app/freight-forwarding/bookings/new" class="tile">
        <mat-icon>flight_takeoff</mat-icon>
        <div class="tile__title">New Booking Request</div>
        <div class="tile__sub">Create a freight booking for a confirmed PO</div>
      </a>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A, #5B3FA0, #3F2D7C);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 28px; }
    .tile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .tile { display: block; padding: 22px; border-radius: 14px; background: #fff;
      border: 1px solid #E8E2F4; box-shadow: 0 4px 16px rgba(63,45,124,.06);
      text-decoration: none; color: inherit; transition: transform .15s, box-shadow .15s, border-color .15s; }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(63,45,124,.12); border-color: #C9BEEC; }
    .tile--primary { background: linear-gradient(135deg, #3F2D7C, #5B3FA0); color: #fff; border-color: transparent; }
    .tile--primary mat-icon { color: rgba(255,255,255,.9); }
    .tile--primary .tile__title { color: #fff; }
    .tile--primary .tile__sub { color: rgba(255,255,255,.75); }
    .tile mat-icon { color: #5B3FA0; font-size: 28px; width: 28px; height: 28px; margin-bottom: 12px; }
    .tile__title { font-weight: 700; font-size: 16px; }
    .tile__sub { color: #6B5BA0; font-size: 13px; margin-top: 4px; }
  `],
})
export class MarketplaceHomeComponent {}

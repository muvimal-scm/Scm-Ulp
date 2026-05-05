import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'ulp-m9-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Last-Mile Delivery</h1>
      <p>Domestic + international courier · routes · manifests · POD · COD · attempts · zone rates.</p>
    </header>

    <div class="tile-grid">
      <a routerLink="bookings" class="tile">
        <mat-icon>local_shipping</mat-icon>
        <div class="tile__title">Courier bookings</div>
        <div class="tile__sub">Domestic / international parcels with COD</div>
      </a>
      <a routerLink="routes" class="tile">
        <mat-icon>alt_route</mat-icon>
        <div class="tile__title">Routes</div>
        <div class="tile__sub">Pickup / delivery / mixed routes &amp; stops</div>
      </a>
      <a routerLink="manifests" class="tile">
        <mat-icon>list_alt</mat-icon>
        <div class="tile__title">Manifests</div>
        <div class="tile__sub">Per-route consolidated dispatch lists</div>
      </a>
      <a routerLink="pods" class="tile">
        <mat-icon>verified</mat-icon>
        <div class="tile__title">Proofs of delivery</div>
        <div class="tile__sub">Signed-by + GPS + photo capture log</div>
      </a>
      <a routerLink="cod" class="tile">
        <mat-icon>payments</mat-icon>
        <div class="tile__title">COD collections</div>
        <div class="tile__sub">Cash · UPI · card · settlement status</div>
      </a>
      <a routerLink="zone-rates" class="tile">
        <mat-icon>monitoring</mat-icon>
        <div class="tile__title">Zone rates</div>
        <div class="tile__sub">Per-zone weight-slab rate cards</div>
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
export class M9HomeComponent {}

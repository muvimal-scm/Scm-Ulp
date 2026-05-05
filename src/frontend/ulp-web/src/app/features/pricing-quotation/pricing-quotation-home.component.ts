import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'ulp-pricing-quotation-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Pricing &amp; Quotation</h1>
      <p>Sell-side and buy-side rate cards · customer quotations · surcharges · contracts.</p>
    </header>

    <div class="tile-grid">
      <a routerLink="rate-cards" class="tile">
        <mat-icon>price_change</mat-icon>
        <div class="tile__title">Rate cards</div>
        <div class="tile__sub">Sell + buy rates with line items, breakpoints, validity</div>
      </a>
      <a routerLink="quotes" class="tile">
        <mat-icon>request_quote</mat-icon>
        <div class="tile__title">Quotations</div>
        <div class="tile__sub">Customer quotes · status lifecycle · line totals</div>
      </a>
      <a routerLink="surcharges" class="tile">
        <mat-icon>local_atm</mat-icon>
        <div class="tile__title">Surcharges</div>
        <div class="tile__sub">BAF, CAF, fuel, war risk, peak season</div>
      </a>
      <a routerLink="contracts" class="tile">
        <mat-icon>handshake</mat-icon>
        <div class="tile__title">Contracts</div>
        <div class="tile__sub">Long-term customer agreements linked to rate cards</div>
      </a>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 {
      font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .page-head p { color: #6B5BA0; margin: 0 0 28px; }
    .tile-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .tile {
      display: block; padding: 22px; border-radius: 14px;
      background: #FFFFFF;
      border: 1px solid #E8E2F4;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
      text-decoration: none; color: inherit;
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    }
    .tile:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(63, 45, 124, 0.12);
      border-color: #C9BEEC;
    }
    .tile mat-icon {
      color: #5B3FA0; font-size: 28px; width: 28px; height: 28px;
      margin-bottom: 12px;
    }
    .tile__title { color: #1A1A33; font-weight: 700; font-size: 16px; }
    .tile__sub   { color: #6B5BA0; font-size: 13px; margin-top: 4px; }
  `],
})
export class PricingQuotationHomeComponent {}

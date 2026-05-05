import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'ulp-sales-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>CRM &amp; Sales</h1>
      <p>Lead → Opportunity → Quote pipeline · activities · campaigns · RFQs.</p>
    </header>

    <div class="tile-grid">
      <a routerLink="leads" class="tile">
        <mat-icon>person_add</mat-icon>
        <div class="tile__title">Leads</div>
        <div class="tile__sub">Inbound contacts — qualify, contact, convert</div>
      </a>
      <a routerLink="opportunities" class="tile">
        <mat-icon>trending_up</mat-icon>
        <div class="tile__title">Opportunities</div>
        <div class="tile__sub">Deal pipeline · stages · probability · forecast</div>
      </a>
      <a routerLink="activities" class="tile">
        <mat-icon>history</mat-icon>
        <div class="tile__title">Activities</div>
        <div class="tile__sub">Calls, emails, meetings, notes, tasks log</div>
      </a>
      <a routerLink="campaigns" class="tile">
        <mat-icon>campaign</mat-icon>
        <div class="tile__title">Campaigns</div>
        <div class="tile__sub">Email · SMS · WhatsApp outreach</div>
      </a>
      <a routerLink="rfqs" class="tile">
        <mat-icon>request_quote</mat-icon>
        <div class="tile__title">RFQs</div>
        <div class="tile__sub">Customer RFQ workflow with vendor responses</div>
      </a>
      <a routerLink="pipeline" class="tile">
        <mat-icon>linear_scale</mat-icon>
        <div class="tile__title">Pipeline stages</div>
        <div class="tile__sub">Stage definitions and default probabilities</div>
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
export class SalesHomeComponent {}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'ulp-trucking-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Trucking ERP</h1>
      <p>Dispatch board · driver roster · fleet management · accessorials · maintenance.</p>
    </header>
    <div class="tile-grid">
      <a routerLink="jobs" class="tile tile--primary">
        <mat-icon>assignment</mat-icon>
        <div class="tile__title">Dispatch Board</div>
        <div class="tile__sub">All jobs · availability workflow · driver assignment</div>
      </a>
      <a routerLink="drivers" class="tile">
        <mat-icon>badge</mat-icon>
        <div class="tile__title">Driver Roster</div>
        <div class="tile__sub">CDL · TWIC · Medical card expiry tracking</div>
      </a>
      <a routerLink="trucks" class="tile">
        <mat-icon>local_shipping</mat-icon>
        <div class="tile__title">Truck Fleet</div>
        <div class="tile__sub">Company · Owner-Operator · Leased trucks</div>
      </a>
      <a routerLink="chassis" class="tile">
        <mat-icon>view_module</mat-icon>
        <div class="tile__title">Chassis</div>
        <div class="tile__sub">Company · Pool chassis · container assignment</div>
      </a>
      <a routerLink="maintenance" class="tile">
        <mat-icon>build</mat-icon>
        <div class="tile__title">Maintenance Log</div>
        <div class="tile__sub">PMI · Repairs · Registration &amp; insurance expiry</div>
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
    .tile--primary { background: linear-gradient(135deg, #3F2D7C, #5B3FA0); color: #fff; border-color: transparent; }
    .tile--primary mat-icon { color: rgba(255,255,255,.9); }
    .tile--primary .tile__title { color: #fff; }
    .tile--primary .tile__sub { color: rgba(255,255,255,.75); }
    .tile mat-icon { color: #5B3FA0; font-size: 28px; width: 28px; height: 28px; margin-bottom: 12px; }
    .tile__title { color: #1A1A33; font-weight: 700; font-size: 16px; }
    .tile__sub   { color: #6B5BA0; font-size: 13px; margin-top: 4px; }
  `],
})
export class TruckingHomeComponent {}

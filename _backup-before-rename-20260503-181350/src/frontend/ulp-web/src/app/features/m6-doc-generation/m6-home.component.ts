import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'ulp-m6-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Document Generation</h1>
      <p>HTML / PDF templates · Scriban rendering · render history.</p>
    </header>

    <div class="tile-grid">
      <a routerLink="templates" class="tile">
        <mat-icon>article</mat-icon>
        <div class="tile__title">Templates</div>
        <div class="tile__sub">Invoices, HBL, AWB, packing list, COO, quote</div>
      </a>
      <a routerLink="render-test" class="tile">
        <mat-icon>play_circle</mat-icon>
        <div class="tile__title">Render test</div>
        <div class="tile__sub">Pick a template, paste payload, see HTML</div>
      </a>
      <a routerLink="history" class="tile">
        <mat-icon>history</mat-icon>
        <div class="tile__title">Render history</div>
        <div class="tile__sub">Status · duration · error log</div>
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
export class M6HomeComponent {}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'ulp-customs-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>US Customs (CBP / ABI)</h1>
      <p>M4-US plugin per sealed LLD ULP_LLD_M4_US_CBP_ABI_v1.0.docx â€” entries, bonds,
         ATM/POA, ISF, PGA holds, in-bond moves, ABI messages. Closes the SCM client
         milestone customs items (Authority to Make Entry, Turnover/Release Order, I.T.,
         US Customs Hold/Exam, 7501 duty per product, PGA/FDA holds).</p>
    </header>

    <div class="tile-grid">
      <a routerLink="entries" class="tile">
        <mat-icon>article</mat-icon>
        <div class="tile__title">Entries (7501)</div>
        <div class="tile__sub">Entry header, lines, HTS, duty + MPF + HMF</div>
      </a>
      <a routerLink="holds" class="tile">
        <mat-icon>front_hand</mat-icon>
        <div class="tile__title">Holds &amp; Exams</div>
        <div class="tile__sub">PGA holds, customs hold/exam notices</div>
      </a>
      <a routerLink="atm" class="tile">
        <mat-icon>verified_user</mat-icon>
        <div class="tile__title">ATM / POA</div>
        <div class="tile__sub">Authority to Make Entry on file per importer</div>
      </a>
      <a routerLink="release-orders" class="tile">
        <mat-icon>local_shipping</mat-icon>
        <div class="tile__title">Release Orders</div>
        <div class="tile__sub">Turnover, Delivery, Release Instructions, LoG</div>
      </a>
      <a routerLink="isf" class="tile">
        <mat-icon>security</mat-icon>
        <div class="tile__title">ISF (10+2)</div>
        <div class="tile__sub">Importer Security Filing 24h before vessel load</div>
      </a>
      <a routerLink="in-bond" class="tile">
        <mat-icon>swap_horiz</mat-icon>
        <div class="tile__title">In-Bond Moves</div>
        <div class="tile__sub">I.T., T&amp;E, Warehouse Withdrawal</div>
      </a>
      <a routerLink="bonds" class="tile">
        <mat-icon>account_balance</mat-icon>
        <div class="tile__title">Bonds</div>
        <div class="tile__sub">Continuous + Single Transaction Bonds</div>
      </a>
      <a routerLink="abi-messages" class="tile">
        <mat-icon>send</mat-icon>
        <div class="tile__title">ABI Messages</div>
        <div class="tile__sub">EDI traffic to/from CBP (SE, SO, UC, UR, etc.)</div>
      </a>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 28px; max-width: 720px; }
    .tile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .tile { display: block; padding: 22px; border-radius: 14px; background: #FFFFFF;
      border: 1px solid #E8E2F4; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
      text-decoration: none; color: inherit;
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(63, 45, 124, 0.12); border-color: #C9BEEC; }
    .tile mat-icon { color: #5B3FA0; font-size: 28px; width: 28px; height: 28px; margin-bottom: 12px; }
    .tile__title { color: #1A1A33; font-weight: 700; font-size: 16px; }
    .tile__sub   { color: #6B5BA0; font-size: 13px; margin-top: 4px; }
  `],
})
export class CustomsHomeComponent {}

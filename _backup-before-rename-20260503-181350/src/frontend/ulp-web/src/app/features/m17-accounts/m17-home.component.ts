import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'ulp-m17-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>FACube · Finance</h1>
      <p>M17 Accounts — General ledger, AR/AP, period close, multi-currency, India GST/TDS.
         Per sealed LLD ULP_LLD_M17_v2.0_Accounts.docx (M17-Core + M17-IN-Plugin).</p>
    </header>

    <div class="tile-grid">
      <a routerLink="invoices" class="tile">
        <mat-icon>receipt_long</mat-icon>
        <div class="tile__title">AR · Invoices</div>
        <div class="tile__sub">Customer billing · post · void · IRN (India)</div>
      </a>
      <a routerLink="bills" class="tile">
        <mat-icon>request_page</mat-icon>
        <div class="tile__title">AP · Vendor bills</div>
        <div class="tile__sub">Vendor invoices · TDS deduction · post</div>
      </a>
      <a routerLink="receipts" class="tile">
        <mat-icon>payments</mat-icon>
        <div class="tile__title">Receipts</div>
        <div class="tile__sub">Customer payments received · auto/manual match</div>
      </a>
      <a routerLink="payments" class="tile">
        <mat-icon>account_balance_wallet</mat-icon>
        <div class="tile__title">Payments</div>
        <div class="tile__sub">Vendor payments out · NACH/RTGS/NEFT/UPI</div>
      </a>
      <a routerLink="periods" class="tile">
        <mat-icon>event_available</mat-icon>
        <div class="tile__title">Periods &amp; close</div>
        <div class="tile__sub">Open/SoftClose/Closed · checklist · reopen (privileged)</div>
      </a>
      <a routerLink="accounts" class="tile">
        <mat-icon>account_tree</mat-icon>
        <div class="tile__title">Chart of accounts</div>
        <div class="tile__sub">5-class hierarchy · multi-currency · per-tenant</div>
      </a>
      <a routerLink="reports" class="tile">
        <mat-icon>insights</mat-icon>
        <div class="tile__title">Reports</div>
        <div class="tile__sub">Trial Balance · P&amp;L · Balance Sheet · AR/AP Aging</div>
      </a>
      <a routerLink="banking" class="tile">
        <mat-icon>account_balance_wallet</mat-icon>
        <div class="tile__title">Banking &amp; Reconciliation</div>
        <div class="tile__sub">Bank accounts · statements · recon · deposits · transfers · voided checks</div>
      </a>
      <a routerLink="settlement" class="tile">
        <mat-icon>swap_horiz</mat-icon>
        <div class="tile__title">A/R ↔ A/P Settlement</div>
        <div class="tile__sub">Cross-link receivables to payables · reverse settlement</div>
      </a>
      <a routerLink="past-due" class="tile">
        <mat-icon>notifications_active</mat-icon>
        <div class="tile__title">Past-Due Notices</div>
        <div class="tile__sub">Dunning levels · multi-invoice notices · send/track</div>
      </a>
      <a routerLink="email-templates" class="tile">
        <mat-icon>email</mat-icon>
        <div class="tile__title">Email Templates</div>
        <div class="tile__sub">Custom + predefined for invoices, statements, dunning</div>
      </a>
      <a routerLink="comparative-profit" class="tile">
        <mat-icon>show_chart</mat-icon>
        <div class="tile__title">Comparative Profit by Year</div>
        <div class="tile__sub">12-month revenue / expense / profit · YoY comparison</div>
      </a>
      <a routerLink="general-expense" class="tile">
        <mat-icon>receipt</mat-icon>
        <div class="tile__title">General Expense</div>
        <div class="tile__sub">One-time + fixed recurring (rent, utilities, etc.)</div>
      </a>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 {
      font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    }
    .page-head p { color: #6B5BA0; margin: 0 0 28px; max-width: 720px; }
    .tile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .tile {
      display: block; padding: 22px; border-radius: 14px; background: #FFFFFF;
      border: 1px solid #E8E2F4; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
      text-decoration: none; color: inherit;
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(63, 45, 124, 0.12); border-color: #C9BEEC; }
    .tile mat-icon { color: #5B3FA0; font-size: 28px; width: 28px; height: 28px; margin-bottom: 12px; }
    .tile__title { color: #1A1A33; font-weight: 700; font-size: 16px; }
    .tile__sub   { color: #6B5BA0; font-size: 13px; margin-top: 4px; }
  `],
})
export class M17HomeComponent {}

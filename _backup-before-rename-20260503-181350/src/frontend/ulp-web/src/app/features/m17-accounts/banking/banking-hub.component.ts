import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M17ExtApiService } from '../shared/m17-ext-api.service';
import {
  BankAccountDto, BankReconDto, BankStatementDto, DepositDto, FundTransferDto, VoidedCheckDto,
} from '../shared/m17-ext-types';

type BankingTab = 'accounts' | 'statements' | 'recon' | 'deposits' | 'transfers' | 'voided' | 'checkPrint' | 'invoicePrint';

@Component({
  selector: 'ulp-m17-banking-hub',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Banking &amp; Reconciliation</h1>
      <p>Bank accounts · monthly statements · reconciliation · deposits · fund transfers · voided checks · multi-print batches.
         Closes the SCM client M3 Bank section.</p>
    </header>

    <nav class="tabs">
      <button class="tab" [class.tab--active]="tab() === 'accounts'"     (click)="setTab('accounts')">Accounts</button>
      <button class="tab" [class.tab--active]="tab() === 'statements'"   (click)="setTab('statements')">Statements</button>
      <button class="tab" [class.tab--active]="tab() === 'recon'"        (click)="setTab('recon')">Reconciliation</button>
      <button class="tab" [class.tab--active]="tab() === 'deposits'"     (click)="setTab('deposits')">Deposits</button>
      <button class="tab" [class.tab--active]="tab() === 'transfers'"    (click)="setTab('transfers')">Fund Transfers</button>
      <button class="tab" [class.tab--active]="tab() === 'voided'"       (click)="setTab('voided')">Voided Checks</button>
      <button class="tab" [class.tab--active]="tab() === 'checkPrint'"   (click)="setTab('checkPrint')">Check Print</button>
      <button class="tab" [class.tab--active]="tab() === 'invoicePrint'" (click)="setTab('invoicePrint')">Invoice Print</button>
    </nav>

    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      @switch (tab()) {
        @case ('accounts') {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Bank</th><th>Account</th><th>Type</th><th>Cur</th><th>Balance</th><th>Last recon</th><th>Status</th></tr></thead>
              <tbody>
                @for (a of accounts(); track a.id) {
                  <tr>
                    <td class="mono">{{ a.accountCode }}</td>
                    <td><strong>{{ a.bankName }}</strong></td>
                    <td class="mono small">{{ a.accountNumberMasked }}</td>
                    <td>{{ a.accountType }}</td>
                    <td class="mono">{{ a.currency }}</td>
                    <td class="num"><strong>{{ a.currentBalance | number:'1.2-2' }}</strong></td>
                    <td>{{ a.lastReconDate ? (a.lastReconDate | slice:0:10) : '—' }}</td>
                    <td><span class="status status--{{ a.isActive ? 'active' : 'inactive' }}">{{ a.isActive ? 'Active' : 'Inactive' }}</span></td>
                  </tr>
                } @empty { <tr><td colspan="8" class="empty">No bank accounts.</td></tr> }
              </tbody>
            </table>
          </div>
        }
        @case ('statements') {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Period</th><th>Bank</th><th>Date</th><th>Opening</th><th>Closing</th><th>Debits</th><th>Credits</th><th>Source</th><th>Lines</th></tr></thead>
              <tbody>
                @for (s of statements(); track s.id) {
                  <tr>
                    <td class="mono"><strong>{{ s.statementPeriod }}</strong></td>
                    <td>{{ s.bankName }}</td>
                    <td>{{ s.statementDate | slice:0:10 }}</td>
                    <td class="num">{{ s.openingBalance | number:'1.2-2' }}</td>
                    <td class="num"><strong>{{ s.closingBalance | number:'1.2-2' }}</strong></td>
                    <td class="num neg">{{ s.totalDebits | number:'1.2-2' }}</td>
                    <td class="num pos">{{ s.totalCredits | number:'1.2-2' }}</td>
                    <td><span class="source">{{ s.source }}</span></td>
                    <td class="num">{{ s.lineCount }}</td>
                  </tr>
                } @empty { <tr><td colspan="9" class="empty">No bank statements.</td></tr> }
              </tbody>
            </table>
          </div>
        }
        @case ('recon') {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Bank</th><th>Period</th><th>Date</th><th>Status</th><th>Book</th><th>Bank</th><th>Diff</th><th>Matched</th><th>Unmatched</th><th>Completed</th></tr></thead>
              <tbody>
                @for (r of recons(); track r.id) {
                  <tr>
                    <td>{{ r.bankName }}</td>
                    <td class="mono">{{ r.statementPeriod }}</td>
                    <td>{{ r.reconDate | slice:0:10 }}</td>
                    <td><span class="status status--{{ r.status.toLowerCase() }}">{{ r.status }}</span></td>
                    <td class="num">{{ r.bookBalance | number:'1.2-2' }}</td>
                    <td class="num">{{ r.bankBalance | number:'1.2-2' }}</td>
                    <td class="num" [class.diff]="r.difference !== 0">{{ r.difference | number:'1.2-2' }}</td>
                    <td class="num pos">{{ r.matchedCount }}</td>
                    <td class="num neg">{{ r.unmatchedCount }}</td>
                    <td>{{ r.completedAt ? (r.completedAt | slice:0:16) : '—' }}</td>
                  </tr>
                } @empty { <tr><td colspan="10" class="empty">No reconciliations.</td></tr> }
              </tbody>
            </table>
          </div>
        }
        @case ('deposits') {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Deposit #</th><th>Date</th><th>Bank</th><th>Source</th><th>Customer</th><th>Check #</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                @for (d of deposits(); track d.id) {
                  <tr>
                    <td class="mono">{{ d.depositNumber }}</td>
                    <td>{{ d.depositDate | slice:0:10 }}</td>
                    <td>{{ d.bankName }}</td>
                    <td><span class="source">{{ d.source === 'FromAr' ? 'From A/R' : 'Standalone' }}</span></td>
                    <td>{{ d.customerName ?? '—' }}</td>
                    <td class="mono small">{{ d.checkNumber ?? '—' }}</td>
                    <td class="num"><strong>{{ d.amount | number:'1.2-2' }} {{ d.currency }}</strong></td>
                    <td><span class="status status--{{ d.status.toLowerCase() }}">{{ d.status }}</span></td>
                  </tr>
                } @empty { <tr><td colspan="8" class="empty">No deposits.</td></tr> }
              </tbody>
            </table>
          </div>
        }
        @case ('transfers') {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Transfer #</th><th>Date</th><th>From</th><th>→</th><th>To</th><th>Amount</th><th>FX</th><th>To amount</th><th>Status</th></tr></thead>
              <tbody>
                @for (t of transfers(); track t.id) {
                  <tr>
                    <td class="mono">{{ t.transferNumber }}</td>
                    <td>{{ t.transferDate | slice:0:10 }}</td>
                    <td>{{ t.fromBankName }}</td>
                    <td class="arrow">→</td>
                    <td>{{ t.toBankName }}</td>
                    <td class="num">{{ t.amount | number:'1.2-2' }} {{ t.currency }}</td>
                    <td class="num">{{ t.fxRate }}</td>
                    <td class="num"><strong>{{ t.toAmount | number:'1.2-2' }}</strong></td>
                    <td><span class="status status--{{ t.status.toLowerCase() }}">{{ t.status }}</span></td>
                  </tr>
                } @empty { <tr><td colspan="9" class="empty">No fund transfers.</td></tr> }
              </tbody>
            </table>
          </div>
        }
        @case ('voided') {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Bank</th><th>Check #</th><th>Date</th><th>Amount</th><th>Payee</th><th>Reason</th><th>Notes</th></tr></thead>
              <tbody>
                @for (v of voided(); track v.id) {
                  <tr>
                    <td>{{ v.bankName }}</td>
                    <td class="mono"><strong>{{ v.checkNumber }}</strong></td>
                    <td>{{ v.voidDate | slice:0:10 }}</td>
                    <td class="num">{{ v.amount ? (v.amount | number:'1.2-2') : '—' }}</td>
                    <td>{{ v.payee ?? '—' }}</td>
                    <td><span class="reason reason--{{ v.voidReason.toLowerCase() }}">{{ v.voidReason }}</span></td>
                    <td class="muted small">{{ v.notes }}</td>
                  </tr>
                } @empty { <tr><td colspan="7" class="empty">No voided checks.</td></tr> }
              </tbody>
            </table>
          </div>
        }
        @case ('checkPrint') {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Batch #</th><th>Bank</th><th>Date</th><th>Start check</th><th>Count</th><th>Total</th><th>Status</th><th>Printed</th></tr></thead>
              <tbody>
                @for (b of checkBatches(); track b.id) {
                  <tr>
                    <td class="mono">{{ b.batchNumber }}</td>
                    <td>{{ b.bankName }}</td>
                    <td>{{ b.printDate | slice:0:10 }}</td>
                    <td class="mono">{{ b.startingCheckNo }}</td>
                    <td class="num">{{ b.checkCount }}</td>
                    <td class="num"><strong>{{ b.totalAmount | number:'1.2-2' }}</strong></td>
                    <td><span class="status status--{{ b.status.toLowerCase() }}">{{ b.status }}</span></td>
                    <td>{{ b.printedAt ? (b.printedAt | slice:0:16) : '—' }}</td>
                  </tr>
                } @empty { <tr><td colspan="8" class="empty">No check print batches.</td></tr> }
              </tbody>
            </table>
          </div>
        }
        @case ('invoicePrint') {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Batch #</th><th>Date</th><th>Count</th><th>Delivery</th><th>Status</th><th>Sent at</th></tr></thead>
              <tbody>
                @for (b of invoiceBatches(); track b.id) {
                  <tr>
                    <td class="mono">{{ b.batchNumber }}</td>
                    <td>{{ b.printDate | slice:0:10 }}</td>
                    <td class="num"><strong>{{ b.invoiceCount }}</strong></td>
                    <td><span class="source">{{ b.deliveryMethod }}</span></td>
                    <td><span class="status status--{{ b.status.toLowerCase() }}">{{ b.status }}</span></td>
                    <td>{{ b.printedAt ? (b.printedAt | slice:0:16) : '—' }}</td>
                  </tr>
                } @empty { <tr><td colspan="6" class="empty">No invoice print batches.</td></tr> }
              </tbody>
            </table>
          </div>
        }
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 16px; max-width: 760px; }
    .tabs { display: flex; gap: 6px; border-bottom: 1px solid #E8E2F4; margin-bottom: 12px; padding: 0 4px; flex-wrap: wrap; }
    .tab { background: transparent; border: none; cursor: pointer; padding: 8px 12px; font-size: 12px;
           font-weight: 600; color: #6B5BA0; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit; }
    .tab:hover { color: #3F2D7C; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }
    .loading { padding: 24px; text-align: center; color: #6B5BA0; }
    .table-wrap { background: #FFF; border: 1px solid #E8E2F4; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; font-size: 13px; color: #1A1A33; }
    .num  { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .small { font-size: 11px; }
    .muted { color: #6B5BA0; }
    .pos { color: #1F7A3D; }
    .neg { color: #B23F45; }
    .diff { color: #B23F45; font-weight: 700; }
    .arrow { color: #5B3FA0; font-weight: 700; text-align: center; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .source { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #DCEAF8; color: #1F4E8A; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--active     { background: #DCF5E4; color: #1F7A3D; }
    .status--inactive   { background: #F5F5F5; color: #777; }
    .status--draft      { background: #F5F2FB; color: #6B5BA0; }
    .status--inprogress { background: #FFF3D6; color: #946100; }
    .status--completed  { background: #DCF5E4; color: #1F7A3D; }
    .status--discrepancy{ background: #FBE4E5; color: #B23F45; }
    .status--pending    { background: #FFF3D6; color: #946100; }
    .status--cleared    { background: #DCF5E4; color: #1F7A3D; }
    .status--reversed   { background: #FBE4E5; color: #B23F45; }
    .status--bounced    { background: #FBE4E5; color: #B23F45; }
    .status--sent       { background: #DCEAF8; color: #1F4E8A; }
    .status--failed     { background: #FBE4E5; color: #B23F45; }
    .status--cancelled  { background: #F5F5F5; color: #777; text-decoration: line-through; }
    .status--printed    { background: #DCF5E4; color: #1F7A3D; }
    .reason { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .reason--misprint  { background: #FFE6CC; color: #8A4F00; }
    .reason--lost      { background: #FBE4E5; color: #B23F45; }
    .reason--stale     { background: #F5F2FB; color: #6B5BA0; }
    .reason--printtest { background: #DCEAF8; color: #1F4E8A; }
    .reason--uservoid  { background: #FBE4E5; color: #B23F45; }
    .reason--other     { background: #F5F5F5; color: #777; }
  `],
})
export class BankingHubComponent implements OnInit {
  private readonly api = inject(M17ExtApiService);

  readonly tab = signal<BankingTab>('accounts');
  readonly loading = signal(true);

  readonly accounts       = signal<BankAccountDto[]>([]);
  readonly statements     = signal<BankStatementDto[]>([]);
  readonly recons         = signal<BankReconDto[]>([]);
  readonly deposits       = signal<DepositDto[]>([]);
  readonly transfers      = signal<FundTransferDto[]>([]);
  readonly voided         = signal<VoidedCheckDto[]>([]);
  readonly checkBatches   = signal<any[]>([]);
  readonly invoiceBatches = signal<any[]>([]);

  async ngOnInit() {
    this.accounts.set(await this.api.listBankAccounts());
    this.loading.set(false);
  }

  async setTab(t: BankingTab) {
    this.tab.set(t);
    this.loading.set(true);
    try {
      switch (t) {
        case 'accounts':     this.accounts.set(await this.api.listBankAccounts()); break;
        case 'statements':   this.statements.set(await this.api.listBankStatements()); break;
        case 'recon':        this.recons.set(await this.api.listBankRecons()); break;
        case 'deposits':     this.deposits.set(await this.api.listDeposits()); break;
        case 'transfers':    this.transfers.set(await this.api.listFundTransfers()); break;
        case 'voided':       this.voided.set(await this.api.listVoidedChecks()); break;
        case 'checkPrint':   this.checkBatches.set(await this.api.listCheckPrintBatches()); break;
        case 'invoicePrint': this.invoiceBatches.set(await this.api.listInvoicePrintBatches()); break;
      }
    } finally { this.loading.set(false); }
  }
}

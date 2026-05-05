import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M4ApiService } from '../shared/m4-api.service';
import { AbiStatus, EntryDto } from '../shared/m4-types';

@Component({
  selector: 'ulp-m4-entries',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>CBP Entries</h1>
      <p>Per sealed LLD §4 state machine: Draft → Submitted → Accepted/Rejected → Released → Liquidated.
         Hold &amp; Exam are intermediate. Form 7501 entry summary lives inside each entry detail.</p>
    </header>

    <nav class="tabs">
      <button class="tab" [class.tab--active]="filter() === null" (click)="setFilter(null)">All</button>
      @for (s of statuses; track s) {
        <button class="tab" [class.tab--active]="filter() === s" (click)="setFilter(s)">{{ s }}</button>
      }
      <div class="spacer"></div>
      <label class="check">
        <input type="checkbox" [checked]="pgaOnly()" (change)="togglePga($event)" /> PGA hold only
      </label>
    </nav>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Entry #</th><th>Type</th><th>Importer</th><th>Vessel</th><th>POE</th>
            <th>Entry date</th><th>Value</th><th>Duty</th><th>Fees</th><th>ABI status</th><th>Flags</th>
          </tr></thead>
          <tbody>
            @for (e of rows(); track e.id) {
              <tr>
                <td><a [routerLink]="[e.id]" class="link">{{ e.entryNumber ?? '#' + e.id }}</a></td>
                <td>{{ e.entryType }}</td>
                <td>{{ e.importerName ?? ('#' + e.importerOfRecordId) }}</td>
                <td><strong>{{ e.vesselName ?? '—' }}</strong> @if (e.voyageNumber) { <span class="muted"> · {{ e.voyageNumber }}</span> }</td>
                <td class="mono">{{ e.portOfEntryCode }}</td>
                <td>{{ e.entryDate | slice:0:10 }}</td>
                <td class="num">{{ e.totalValueUsd | number:'1.2-2' }}</td>
                <td class="num">{{ e.dutyAmountUsd | number:'1.2-2' }}</td>
                <td class="num">{{ e.totalFeesUsd | number:'1.2-2' }}</td>
                <td><span class="status status--{{ e.abiStatus.toLowerCase() }}">{{ e.abiStatus }}</span></td>
                <td>
                  @if (e.pgaHoldFlag) { <span class="badge badge--pga" title="PGA hold active">⛔ PGA</span> }
                  @if (e.examType !== 'Nil') { <span class="badge badge--exam" title="Exam: {{ e.examType }}">🔍 {{ e.examType }}</span> }
                  @if (e.activePgaHoldCount > 0) { <span class="badge">{{ e.activePgaHoldCount }} hold(s)</span> }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="11" class="empty">No entries match this filter.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 16px; max-width: 720px; }
    .tabs { display: flex; gap: 6px; align-items: center; border-bottom: 1px solid #E8E2F4;
            margin-bottom: 12px; padding: 0 4px; flex-wrap: wrap; }
    .tab { background: transparent; border: none; cursor: pointer; padding: 8px 12px; font-size: 12px;
           font-weight: 600; color: #6B5BA0; border-bottom: 2px solid transparent;
           margin-bottom: -1px; font-family: inherit; }
    .tab:hover { color: #3F2D7C; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }
    .spacer { flex: 1; }
    .check { font-size: 12px; color: #6B5BA0; cursor: pointer; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
                  box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C;
               font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    .num  { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .muted { color: #9A9AA3; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft       { background: #F5F2FB; color: #6B5BA0; }
    .status--submitted   { background: #DCEAF8; color: #1F4E8A; }
    .status--accepted    { background: #DCF5E4; color: #1F7A3D; }
    .status--rejected    { background: #FBE4E5; color: #B23F45; }
    .status--released    { background: #C8EBD3; color: #1F7A3D; }
    .status--hold        { background: #FBE4E5; color: #B23F45; }
    .status--exam        { background: #FFE6CC; color: #8A4F00; }
    .status--liquidated  { background: #E8E2F4; color: #3F2D7C; }
    .status--cancelled   { background: #F5F5F5; color: #777; text-decoration: line-through; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
             background: #E8E2F4; color: #3F2D7C; margin-right: 4px; cursor: help; }
    .badge--pga  { background: #FBE4E5; color: #B23F45; }
    .badge--exam { background: #FFE6CC; color: #8A4F00; }
  `],
})
export class EntriesListComponent implements OnInit {
  private readonly api = inject(M4ApiService);
  readonly rows    = signal<EntryDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly filter  = signal<AbiStatus | null>(null);
  readonly pgaOnly = signal(false);
  readonly statuses: AbiStatus[] = ['Draft','Submitted','Accepted','Rejected','Released','Hold','Exam','Liquidated','Cancelled'];

  async ngOnInit() { await this.reload(); }

  async setFilter(s: AbiStatus | null) { this.filter.set(s); await this.reload(); }
  togglePga(ev: Event) { this.pgaOnly.set((ev.target as HTMLInputElement).checked); this.reload(); }

  private async reload() {
    this.loading.set(true);
    try {
      this.rows.set(await this.api.listEntries({
        status: this.filter() ?? undefined,
        pgaHoldOnly: this.pgaOnly() || undefined,
        pageSize: 200,
      }));
    } catch (e: any) { this.error.set(e?.message ?? 'Failed to load entries'); }
    finally { this.loading.set(false); }
  }
}

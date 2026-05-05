import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M2ApiService } from '../shared/m2-api.service';
import { OpportunityDto } from '../shared/m2-types';

@Component({
  selector: 'ulp-m2-opportunities',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Opportunities</h1>
      <p>Active deals — title, party, value, expected close, stage.</p>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Opp #</th><th>Country</th><th>Title</th>
              <th class="num">Est. value</th><th class="num">Prob.</th>
              <th>Expected close</th><th>Stage</th><th class="num">Activities</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (o of rows(); track o.id) {
              <tr>
                <td><code>{{ o.oppNumber }}</code></td>
                <td>{{ o.countryCode }}</td>
                <td>{{ o.title }}<br/><span class="muted">party #{{ o.partyId }}</span></td>
                <td class="num">{{ o.estimatedValue ? (o.estimatedValue | number:'1.0-0') : '—' }} {{ o.estimatedCurrency ?? '' }}</td>
                <td class="num">{{ o.probabilityPct !== null ? (o.probabilityPct | number:'1.0-1') + '%' : '—' }}</td>
                <td>{{ o.expectedClose ? (o.expectedClose | slice:0:10) : '—' }}</td>
                <td><span class="stage stage--{{ o.stage.toLowerCase() }}">{{ o.stage }}</span></td>
                <td class="num">{{ o.activityCount }}</td>
                <td><a [routerLink]="[o.id]" class="link">Open →</a></td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">No opportunities yet.</td></tr>
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
    .page-head p { color: #6B5BA0; margin: 0 0 20px; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 16px; background: #F5F2FB; color: #3F2D7C;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; vertical-align: top; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .muted { color: #9A9AA3; font-size: 11px; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .stage { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .stage--prospecting   { background: #E8E2F4; color: #3F2D7C; }
    .stage--qualification { background: #DCEAF8; color: #1F4E8A; }
    .stage--proposal      { background: #FFF3D6; color: #946100; }
    .stage--negotiation   { background: #FFE6CC; color: #8A4F00; }
    .stage--closedwon     { background: #DCF5E4; color: #1F7A3D; }
    .stage--closedlost    { background: #FBE4E5; color: #B23F45; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
  `],
})
export class OpportunitiesListComponent implements OnInit {
  private readonly api = inject(M2ApiService);
  readonly rows    = signal<OpportunityDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listOpportunities()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load opportunities'); }
    finally { this.loading.set(false); }
  }
}

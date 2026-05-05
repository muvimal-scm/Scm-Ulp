import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesApiService } from '../shared/sales-api.service';
import { CampaignDto } from '../shared/sales-types';

@Component({
  selector: 'ulp-sales-campaigns',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>Campaigns</h1>
          <p>Bulk outreach via email, SMS or WhatsApp.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon>&nbsp;New campaign</a>
      </div>
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
              <th>Name</th><th>Channel</th><th>Template</th><th>Scheduled</th>
              <th>Status</th><th class="num">Targets</th><th class="num">Sent</th>
              <th class="num">Delivered</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            @for (c of rows(); track c.id) {
              <tr>
                <td>{{ c.name }}</td>
                <td><span class="ch ch--{{ c.channel.toLowerCase() }}">{{ c.channel }}</span></td>
                <td>{{ c.templateCode ?? 'â€”' }}</td>
                <td>{{ c.scheduledAt ? (c.scheduledAt | slice:0:16) : 'â€”' }}</td>
                <td><span class="status status--{{ c.status.toLowerCase() }}">{{ c.status }}</span></td>
                <td class="num">{{ c.targetCount }}</td>
                <td class="num">{{ c.sentCount }}</td>
                <td class="num">{{ c.deliveredCount }}</td>
                <td>{{ c.createdAt | slice:0:10 }}</td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">No campaigns yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
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
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .ch { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .ch--email    { background: #E8E2F4; color: #3F2D7C; }
    .ch--sms      { background: #DCEAF8; color: #1F4E8A; }
    .ch--whatsapp { background: #DCF5E4; color: #1F7A3D; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft     { background: #E8E2F4; color: #3F2D7C; }
    .status--scheduled { background: #FFF3D6; color: #946100; }
    .status--sending   { background: #FFE6CC; color: #8A4F00; }
    .status--sent      { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled { background: #FBE4E5; color: #B23F45; }
  `],
})
export class CampaignsListComponent implements OnInit {
  private readonly api = inject(SalesApiService);
  readonly rows = signal<CampaignDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listCampaigns()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load campaigns'); }
    finally { this.loading.set(false); }
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M2ApiService } from '../shared/m2-api.service';
import { LeadDto } from '../shared/m2-types';

@Component({
  selector: 'ulp-m2-leads',
  standalone: true,
  imports: [SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Leads</h1>
      <p>Inbound contacts in the funnel — qualify, contact, convert to opportunities.</p>
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
              <th>Lead #</th><th>Country</th><th>Source</th>
              <th>Contact</th><th>Company</th><th>Industry</th>
              <th>Est. volume</th><th>Stage</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            @for (l of rows(); track l.id) {
              <tr>
                <td><code>{{ l.leadNumber }}</code></td>
                <td>{{ l.countryCode }}</td>
                <td>{{ l.source }}</td>
                <td>{{ l.contactName }}<br/><span class="muted">{{ l.email ?? '' }}</span></td>
                <td>{{ l.companyName ?? '—' }}</td>
                <td>{{ l.industry ?? '—' }}</td>
                <td>{{ l.estimatedVolume ?? '—' }}</td>
                <td><span class="stage stage--{{ l.stage.toLowerCase() }}">{{ l.stage }}</span></td>
                <td>{{ l.createdAt | slice:0:10 }}</td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">No leads yet.</td></tr>
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
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; vertical-align: top; }
    tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .muted { color: #9A9AA3; font-size: 11px; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .stage { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .stage--new          { background: #E8E2F4; color: #3F2D7C; }
    .stage--contacted    { background: #DCEAF8; color: #1F4E8A; }
    .stage--qualified    { background: #DCF5E4; color: #1F7A3D; }
    .stage--disqualified { background: #FBE4E5; color: #B23F45; }
    .stage--converted    { background: #FFF3D6; color: #946100; }
  `],
})
export class LeadsListComponent implements OnInit {
  private readonly api = inject(M2ApiService);
  readonly rows    = signal<LeadDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listLeads()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load leads'); }
    finally { this.loading.set(false); }
  }
}

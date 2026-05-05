import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M4ApiService } from '../shared/m4-api.service';
import { AbiMessageDto } from '../shared/m4-types';

@Component({
  selector: 'ulp-m4-abi-messages',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>ABI Messages</h1>
      <p>Outbound (broker → CBP) and inbound (CBP → broker) EDI traffic.
         Codes: SE = Cargo Release · SO = Entry Summary · SI = In-bond ·
         UC = Cargo Release Status · US = Entry Summary Status · UR = Release.</p>
    </header>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Created</th><th>Code</th><th>Direction</th><th>Entry</th><th>Status</th><th>Attempts</th><th>CBP ref</th><th>Acknowledged</th></tr></thead>
          <tbody>
            @for (m of rows(); track m.id) {
              <tr>
                <td>{{ m.createdAt | slice:0:16 }}</td>
                <td class="mono"><strong>{{ m.messageCode }}</strong></td>
                <td><span class="dir dir--{{ m.direction.toLowerCase() }}">{{ m.direction === 'Out' ? '→ Out' : '← In' }}</span></td>
                <td>@if (m.entryId) { <a [routerLink]="['/app/m4/entries', m.entryId]" class="link">#{{ m.entryId }}</a> } @else { — }</td>
                <td><span class="status status--{{ m.status.toLowerCase() }}">{{ m.status }}</span></td>
                <td class="num">{{ m.attemptCount }}</td>
                <td class="mono small">{{ m.cbpReference ?? '—' }}</td>
                <td>{{ m.acknowledgedAt ? (m.acknowledgedAt | slice:0:16) : '—' }}</td>
              </tr>
            } @empty { <tr><td colspan="8" class="empty">No ABI messages.</td></tr> }
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
    .loading { padding: 24px; text-align: center; color: #6B5BA0; }
    .table-wrap { background: #FFF; border: 1px solid #E8E2F4; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; font-size: 13px; color: #1A1A33; }
    .num  { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .small { font-size: 11px; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
    .dir { font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 999px; }
    .dir--out { background: #DCEAF8; color: #1F4E8A; }
    .dir--in  { background: #DCF5E4; color: #1F7A3D; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--pending     { background: #FFF3D6; color: #946100; }
    .status--sent        { background: #DCEAF8; color: #1F4E8A; }
    .status--ackreceived { background: #DCF5E4; color: #1F7A3D; }
    .status--rejected    { background: #FBE4E5; color: #B23F45; }
    .status--failed      { background: #FBE4E5; color: #B23F45; }
  `],
})
export class AbiMessagesListComponent implements OnInit {
  private readonly api = inject(M4ApiService);
  readonly rows = signal<AbiMessageDto[]>([]);
  readonly loading = signal(true);
  async ngOnInit() {
    try { this.rows.set(await this.api.listAbiMessages()); }
    finally { this.loading.set(false); }
  }
}

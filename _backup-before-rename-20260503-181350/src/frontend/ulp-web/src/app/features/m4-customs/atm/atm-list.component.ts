import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M4ApiService } from '../shared/m4-api.service';
import { AtmDto } from '../shared/m4-types';

@Component({
  selector: 'ulp-m4-atm',
  standalone: true,
  imports: [SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Authority to Make Entry / Power of Attorney</h1>
      <p>ATM is the importer's empowerment of the broker to file CBP entries on their behalf.
         Combined ATM+POA per CBP guidance. Closes the SCM client M1 "Authority to Make Entry" item.</p>
    </header>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Importer</th><th>Filer</th><th>Combined POA</th><th>Signed</th><th>Effective</th><th>Signer</th><th>Status</th></tr></thead>
          <tbody>
            @for (a of rows(); track a.id) {
              <tr>
                <td><strong>{{ a.importerName ?? ('#' + a.importerPartyId) }}</strong></td>
                <td class="mono">{{ a.brokerFilerCode }}</td>
                <td>{{ a.combinedWithPoa ? '✓ Yes' : '— No' }}</td>
                <td>{{ a.signedAt | slice:0:10 }}</td>
                <td>{{ a.effectiveFrom | slice:0:10 }} → {{ a.effectiveTo ? (a.effectiveTo | slice:0:10) : 'open' }}</td>
                <td>{{ a.signerName }} <span class="muted">({{ a.signerTitle }})</span></td>
                <td><span class="status status--{{ a.status.toLowerCase() }}">{{ a.status }}</span></td>
              </tr>
            } @empty { <tr><td colspan="7" class="empty">No ATM on file.</td></tr> }
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
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .muted { color: #9A9AA3; font-size: 11px; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--active  { background: #DCF5E4; color: #1F7A3D; }
    .status--expired { background: #F5F5F5; color: #777; }
    .status--revoked { background: #FBE4E5; color: #B23F45; }
  `],
})
export class AtmListComponent implements OnInit {
  private readonly api = inject(M4ApiService);
  readonly rows = signal<AtmDto[]>([]);
  readonly loading = signal(true);
  async ngOnInit() {
    try { this.rows.set(await this.api.listAtm()); }
    finally { this.loading.set(false); }
  }
}

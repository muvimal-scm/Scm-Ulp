import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TruckingApiService } from '../shared/trucking-api.service';
import { ChassisDto } from '../shared/trucking-types';

@Component({
  selector: 'ulp-chassis-list',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Chassis Fleet</h1>
      <p>Company, leased, and pool chassis · current container &amp; location tracking.</p>
    </header>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Chassis #</th><th>Type</th><th>Ownership</th><th>Pool</th>
            <th>Current Container</th><th>Location</th><th>Reg. Expiry</th><th>Status</th>
          </tr></thead>
          <tbody>
            @for (c of rows(); track c.id) {
              <tr>
                <td><strong>{{ c.chassisNumber }}</strong></td>
                <td>{{ c.chassisType }}</td>
                <td><span class="badge" [class.badge--pool]="c.ownership === 'Pool'">{{ c.ownership }}</span></td>
                <td>{{ c.poolProvider ?? '—' }}</td>
                <td>{{ c.currentContainer ?? '—' }}</td>
                <td>{{ c.currentLocation ?? '—' }}</td>
                <td [class.expiry-warn]="expiringSoon(c.registrationExpiry)">{{ c.registrationExpiry ?? '—' }}</td>
                <td><span class="status status--{{ c.status.toLowerCase() }}">{{ c.status }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty">No chassis registered.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host{display:block;}
    .page-head h1{font-size:28px;font-weight:800;margin:0 0 4px;background:linear-gradient(90deg,#E54A8A,#5B3FA0,#3F2D7C);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
    .page-head p{color:#6B5BA0;margin:0 0 16px;}
    .loading{padding:24px;text-align:center;color:#6B5BA0;}
    .table-wrap{background:#fff;border:1px solid #E8E2F4;border-radius:12px;box-shadow:0 4px 16px rgba(63,45,124,.06);overflow:auto;}
    table{width:100%;border-collapse:collapse;}
    thead th{text-align:left;padding:12px 14px;background:#F5F2FB;color:#3F2D7C;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
    tbody td{padding:10px 14px;border-bottom:1px solid #F0EBF8;font-size:13px;}
    .badge{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#E8E2F4;color:#3F2D7C;}
    .badge--pool{background:#E3F2FD;color:#1565C0;}
    .expiry-warn{color:#946100;font-weight:600;}
    .status{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;}
    .status--available{background:#DCF5E4;color:#1F7A3D;}
    .status--inuse{background:#DCEAF8;color:#1F4E8A;}
    .status--inmaintenance{background:#FFF3D6;color:#946100;}
    .status--outofservice{background:#FBE4E5;color:#B23F45;}
    .empty{text-align:center;color:#9A9AA3;padding:32px !important;}
  `],
})
export class ChassisListComponent implements OnInit {
  private readonly api = inject(TruckingApiService);
  readonly rows = signal<ChassisDto[]>([]);
  readonly loading = signal(true);

  async ngOnInit() {
    try { this.rows.set(await this.api.listChassis()); }
    finally { this.loading.set(false); }
  }

  expiringSoon(d?: string) { if (!d) return false; return (new Date(d).getTime() - Date.now()) / 86400000 <= 30; }
}

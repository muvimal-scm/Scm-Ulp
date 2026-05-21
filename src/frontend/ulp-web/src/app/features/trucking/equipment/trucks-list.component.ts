import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TruckingApiService } from '../shared/trucking-api.service';
import { TruckDto } from '../shared/trucking-types';

@Component({
  selector: 'ulp-trucks-list',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Truck Fleet</h1>
      <p>Company-owned, owner-operator, and leased trucks with registration &amp; insurance expiry.</p>
    </header>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Truck #</th><th>Make / Model</th><th>Year</th><th>VIN</th><th>Plate</th>
            <th>Ownership</th><th>Registration Exp</th><th>Insurance Exp</th><th>Status</th>
          </tr></thead>
          <tbody>
            @for (t of rows(); track t.id) {
              <tr>
                <td><strong>{{ t.truckNumber }}</strong></td>
                <td>{{ t.make ?? '' }} {{ t.model ?? '' }}</td>
                <td>{{ t.year ?? '—' }}</td>
                <td class="mono">{{ t.vin ?? '—' }}</td>
                <td>{{ t.licensePlate ?? '—' }}</td>
                <td><span class="badge" [class.badge--oo]="t.ownership === 'OwnerOperator'">{{ t.ownership }}</span></td>
                <td [class.expiry-warn]="expiringSoon(t.registrationExpiry)" [class.expiry-expired]="expired(t.registrationExpiry)">
                  {{ t.registrationExpiry ?? '—' }}
                </td>
                <td [class.expiry-warn]="expiringSoon(t.insuranceExpiry)" [class.expiry-expired]="expired(t.insuranceExpiry)">
                  {{ t.insuranceExpiry ?? '—' }}
                </td>
                <td><span class="status status--{{ t.status.toLowerCase() }}">{{ t.status }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">No trucks registered.</td></tr>
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
    table{width:100%;border-collapse:collapse;min-width:800px;}
    thead th{text-align:left;padding:12px 14px;background:#F5F2FB;color:#3F2D7C;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
    tbody td{padding:10px 14px;border-bottom:1px solid #F0EBF8;font-size:13px;}
    .mono{font-family:monospace;font-size:11px;}
    .badge{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#E8E2F4;color:#3F2D7C;}
    .badge--oo{background:#FFF3D6;color:#946100;}
    .expiry-warn{color:#946100;font-weight:600;}
    .expiry-expired{color:#B23F45;font-weight:700;}
    .status{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;}
    .status--inservice{background:#DCF5E4;color:#1F7A3D;}
    .status--inmaintenance{background:#FFF3D6;color:#946100;}
    .status--outofservice{background:#FBE4E5;color:#B23F45;}
    .empty{text-align:center;color:#9A9AA3;padding:32px !important;}
  `],
})
export class TrucksListComponent implements OnInit {
  private readonly api = inject(TruckingApiService);
  readonly rows = signal<TruckDto[]>([]);
  readonly loading = signal(true);

  async ngOnInit() {
    try { this.rows.set(await this.api.listTrucks()); }
    finally { this.loading.set(false); }
  }

  expiringSoon(d?: string) { if (!d) return false; const days = (new Date(d).getTime() - Date.now()) / 86400000; return days > 0 && days <= 30; }
  expired(d?: string) { return d ? new Date(d).getTime() < Date.now() : false; }
}

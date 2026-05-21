import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TruckingApiService } from '../shared/trucking-api.service';
import { DriverDto } from '../shared/trucking-types';

@Component({
  selector: 'ulp-drivers-list',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Driver Roster</h1>
      <p>CDL · TWIC · Medical card expiry tracking · availability management.</p>
    </header>

    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else if (error()) { <div class="err"><mat-icon>error_outline</mat-icon> {{ error() }}</div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Code</th><th>Name</th><th>Type</th><th>Phone</th>
            <th>CDL</th><th>TWIC</th><th>Medical</th>
            <th>Current Truck</th><th>Availability</th><th>Actions</th>
          </tr></thead>
          <tbody>
            @for (d of rows(); track d.id) {
              <tr [class.row-inactive]="!d.isActive">
                <td><code>{{ d.driverCode }}</code></td>
                <td><strong>{{ d.fullName }}</strong></td>
                <td><span class="badge" [class.badge--oo]="d.driverType === 'OwnerOperator'">{{ d.driverType === 'OwnerOperator' ? 'O/O' : 'Company' }}</span></td>
                <td>{{ d.phone ?? '—' }}</td>
                <td [class.expiry-warn]="isExpiringSoon(d.licenseExpiry)" [class.expiry-expired]="isExpired(d.licenseExpiry)">
                  {{ d.licenseExpiry ?? '—' }} @if (isExpiringSoon(d.licenseExpiry)) { <mat-icon class="warn-icon" matTooltip="Expiring soon">warning</mat-icon> }
                </td>
                <td [class.expiry-warn]="isExpiringSoon(d.twicCardExpiry)" [class.expiry-expired]="isExpired(d.twicCardExpiry)">
                  {{ d.twicCardExpiry ?? '—' }} @if (isExpired(d.twicCardExpiry)) { <mat-icon class="err-icon" matTooltip="Expired">error</mat-icon> }
                </td>
                <td [class.expiry-warn]="isExpiringSoon(d.medicalCardExpiry)" [class.expiry-expired]="isExpired(d.medicalCardExpiry)">
                  {{ d.medicalCardExpiry ?? '—' }}
                </td>
                <td>{{ d.currentTruckNumber ?? '—' }}</td>
                <td>
                  <span class="avail avail--{{ d.availability.toLowerCase() }}">{{ d.availability }}</span>
                </td>
                <td>
                  <div class="action-btns">
                    @for (av of availabilityOptions; track av) {
                      @if (av !== d.availability) {
                        <button mat-icon-button [matTooltip]="'Set ' + av" (click)="setAvail(d, av)" [disabled]="setting() === d.id">
                          <mat-icon style="font-size:16px">{{ avIcon(av) }}</mat-icon>
                        </button>
                      }
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="10" class="empty">No drivers found.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display:block; }
    .page-head h1 { font-size:28px;font-weight:800;margin:0 0 4px;
      background:linear-gradient(90deg,#E54A8A,#5B3FA0,#3F2D7C);
      -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent; }
    .page-head p { color:#6B5BA0;margin:0 0 16px; }
    .loading,.err { padding:24px;text-align:center;color:#6B5BA0; }
    .table-wrap { background:#fff;border:1px solid #E8E2F4;border-radius:12px;
      box-shadow:0 4px 16px rgba(63,45,124,.06);overflow:auto; }
    table { width:100%;border-collapse:collapse;min-width:900px; }
    thead th { text-align:left;padding:12px 14px;background:#F5F2FB;color:#3F2D7C;
      font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px; }
    tbody td { padding:10px 14px;border-bottom:1px solid #F0EBF8;font-size:13px; }
    tbody tr:last-child td { border-bottom:none; }
    .row-inactive td { opacity:.5; }
    code { background:#F5F2FB;padding:1px 6px;border-radius:4px;font-size:12px; }
    .badge { padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#E8E2F4;color:#3F2D7C; }
    .badge--oo { background:#FFF3D6;color:#946100; }
    .expiry-warn { color:#946100;font-weight:600; }
    .expiry-expired { color:#B23F45;font-weight:700; }
    .warn-icon { color:#946100;font-size:14px;vertical-align:middle; }
    .err-icon { color:#B23F45;font-size:14px;vertical-align:middle; }
    .avail { padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#E8E2F4;color:#3F2D7C; }
    .avail--available { background:#DCF5E4;color:#1F7A3D; }
    .avail--onload { background:#DCEAF8;color:#1F4E8A; }
    .avail--offduty,.avail--sick,.avail--vacation { background:#F5F5F5;color:#777; }
    .avail--outofservice { background:#FBE4E5;color:#B23F45; }
    .action-btns { display:flex;gap:2px; }
    .empty { text-align:center;color:#9A9AA3;padding:32px !important; }
  `],
})
export class DriversListComponent implements OnInit {
  private readonly api = inject(TruckingApiService);
  readonly rows    = signal<DriverDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly setting = signal<number | null>(null);

  readonly availabilityOptions = ['Available', 'OnLoad', 'OffDuty', 'OutOfService'] as const;

  async ngOnInit() {
    try { this.rows.set(await this.api.listDrivers()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed'); }
    finally { this.loading.set(false); }
  }

  isExpiringSoon(date?: string): boolean {
    if (!date) return false;
    const d = new Date(date);
    const days = (d.getTime() - Date.now()) / 86400000;
    return days > 0 && days <= 30;
  }

  isExpired(date?: string): boolean {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
  }

  avIcon(av: string): string {
    return av === 'Available' ? 'check_circle' : av === 'OnLoad' ? 'local_shipping' :
           av === 'OffDuty'  ? 'bedtime'       : 'block';
  }

  async setAvail(d: DriverDto, av: string) {
    this.setting.set(d.id);
    try {
      const updated = await this.api.setDriverAvailability(d.id, av as any);
      this.rows.update(rows => rows.map(r => r.id === d.id ? updated : r));
    } finally { this.setting.set(null); }
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LastMileApiService } from '../shared/last-mile-api.service';
import { OceanDrayageJobDto } from '../shared/last-mile-types';

@Component({
  selector: 'ulp-drayage-list',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>Ocean Drayage Jobs</h1>
          <p>Port pickup → warehouse/customer delivery for FCL containers.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon>&nbsp;New Job</a>
      </div>
    </header>
    <nav class="tabs">
      <button class="tab" [class.tab--active]="filter() === null" (click)="setFilter(null)">All</button>
      @for (s of statuses; track s) {
        <button class="tab" [class.tab--active]="filter() === s" (click)="setFilter(s)">{{ s }}</button>
      }
    </nav>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else if (error()) { <div class="err"><mat-icon>error_outline</mat-icon> {{ error() }}</div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Job #</th><th>Container #</th><th>Terminal</th><th>Available</th>
            <th>Pickup Appt</th><th>Drop Off</th><th>Trip Type</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            @for (j of rows(); track j.id) {
              <tr>
                <td><code>{{ j.jobNumber }}</code></td>
                <td><strong>{{ j.containerNumber }}</strong></td>
                <td>{{ j.terminal ?? '—' }}</td>
                <td><span [class]="j.availableForPickup ? 'yes' : 'no'">{{ j.availableForPickup ? 'Yes' : 'No' }}</span></td>
                <td>{{ j.pickupAppointment ? (j.pickupAppointment | slice:0:16).replace('T',' ') : '—' }}</td>
                <td>{{ j.dropOffLocation ?? '—' }}</td>
                <td>{{ j.tripType }}</td>
                <td><span class="status status--{{ j.status.toLowerCase() }}">{{ j.status }}</span></td>
                <td><a [routerLink]="[j.id, 'edit']" class="link">Edit →</a></td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">No ocean drayage jobs yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display:block; }
    .head-row { display:flex;align-items:flex-start;justify-content:space-between;gap:16px; }
    .page-head h1 { font-size:28px;font-weight:800;margin:0 0 4px;
      background:linear-gradient(90deg,#E54A8A,#5B3FA0,#3F2D7C);
      -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent; }
    .page-head p { color:#6B5BA0;margin:0 0 16px; }
    .tabs { display:flex;gap:6px;border-bottom:1px solid #E8E2F4;margin-bottom:12px;padding:0 4px;flex-wrap:wrap; }
    .tab { background:transparent;border:none;cursor:pointer;padding:8px 12px;font-size:12px;font-weight:600;
           color:#6B5BA0;border-bottom:2px solid transparent;margin-bottom:-1px;font-family:inherit; }
    .tab--active { color:#3F2D7C;border-bottom-color:#5B3FA0; }
    .loading,.err { padding:24px;text-align:center;color:#6B5BA0; }
    .table-wrap { background:#fff;border:1px solid #E8E2F4;border-radius:12px;
      box-shadow:0 4px 16px rgba(63,45,124,.06);overflow:hidden; }
    table { width:100%;border-collapse:collapse; }
    thead th { text-align:left;padding:12px 14px;background:#F5F2FB;color:#3F2D7C;
      font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px; }
    tbody td { padding:10px 14px;border-bottom:1px solid #F0EBF8;font-size:13px; }
    code { background:#F5F2FB;padding:1px 6px;border-radius:4px;font-size:12px; }
    .yes { color:#1F7A3D;font-weight:600; } .no { color:#B23F45; }
    .status { padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#E8E2F4;color:#3F2D7C; }
    .status--enroute { background:#FFE6CC;color:#8A4F00; }
    .status--containermarkedempty { background:#DCEAF8;color:#1F4E8A; }
    .status--emptyreturned { background:#DCF5E4;color:#1F7A3D; }
    .empty { text-align:center;color:#9A9AA3;padding:32px !important; }
    .link { color:#5B3FA0;text-decoration:none;font-weight:600; }
  `],
})
export class DrayageListComponent implements OnInit {
  private readonly api = inject(LastMileApiService);
  readonly rows = signal<OceanDrayageJobDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<string | null>(null);
  readonly statuses = ['OutGate', 'EnRoute', 'ContainerMarkedEmpty', 'EmptyReturned'];

  async ngOnInit() { await this.reload(); }
  async setFilter(s: string | null) { this.filter.set(s); await this.reload(); }
  private async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listOdJobs(this.filter() ?? undefined)); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load'); }
    finally { this.loading.set(false); }
  }
}

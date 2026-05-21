import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TruckingApiService } from '../shared/trucking-api.service';
import { JobAvailabilityStatus, JobListDto } from '../shared/trucking-types';

interface Tab { label: string; status: JobAvailabilityStatus | null; color: string; }

@Component({
  selector: 'ulp-jobs-board',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>Dispatch Board</h1>
          <p>All trucking jobs · availability workflow · driver &amp; chassis assignment.</p>
        </div>
      </div>
    </header>

    <nav class="tabs">
      @for (t of tabs; track t.label) {
        <button class="tab" [class.tab--active]="activeTab() === t.status" (click)="setTab(t)">
          {{ t.label }}
          @if (counts()[t.label] !== undefined) {
            <span class="tab-count">{{ counts()[t.label] }}</span>
          }
        </button>
      }
    </nav>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="err"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Job #</th><th>Move</th><th>Customer</th><th>Container</th>
            <th>P/U Location</th><th>P/U Date</th><th>Del Location</th><th>Del Date</th>
            <th>LFD</th><th>Driver</th><th>Truck</th><th>Chassis</th>
            <th class="num">Acc. $</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            @for (j of rows(); track j.id) {
              <tr [class.row--lfd-warn]="isLfdWarn(j)">
                <td><code>{{ j.jobNumber }}</code></td>
                <td><span class="move-badge move-badge--{{ j.moveType.toLowerCase() }}">{{ j.moveType }}</span></td>
                <td>{{ j.customerName ?? '#' + j.customerPartyId }}</td>
                <td>
                  @if (j.containerNumber) { <strong>{{ j.containerNumber }}</strong> }
                  @if (j.containerSize) { <span class="muted"> {{ j.containerSize }}</span> }
                </td>
                <td class="loc">{{ j.puLocation ?? '—' }}</td>
                <td>{{ j.puDate ? (j.puDate | slice:0:10) : '—' }}</td>
                <td class="loc">{{ j.delLocation ?? '—' }}</td>
                <td>{{ j.delDate ? (j.delDate | slice:0:10) : '—' }}</td>
                <td [class.lfd-warn]="isLfdWarn(j)">{{ j.lfdDate ? (j.lfdDate | slice:0:10) : '—' }}</td>
                <td>{{ j.driverName ?? '—' }}</td>
                <td>{{ j.truckNumber ?? '—' }}</td>
                <td>{{ j.chassisNumber ?? '—' }}</td>
                <td class="num">
                  @if (j.accessorialCount > 0) {
                    <span [matTooltip]="j.accessorialCount + ' charge(s)'">
                      {{ j.accessorialTotalAmount | number:'1.0-2' }}
                    </span>
                  } @else { — }
                </td>
                <td><span class="status status--{{ j.availabilityStatus.toLowerCase() }}">{{ statusLabel(j.availabilityStatus) }}</span></td>
                <td><a [routerLink]="[j.id]" class="link">Open →</a></td>
              </tr>
              @if (j.holdReason) {
                <tr class="hold-row"><td colspan="15">⛔ Hold: {{ j.holdReason }}</td></tr>
              }
            } @empty {
              <tr><td colspan="15" class="empty">No jobs in this category.</td></tr>
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
    .tabs { display:flex;gap:4px;border-bottom:2px solid #E8E2F4;margin-bottom:12px;flex-wrap:wrap; }
    .tab { background:transparent;border:none;cursor:pointer;padding:10px 14px;font-size:12px;font-weight:600;
           color:#6B5BA0;border-bottom:3px solid transparent;margin-bottom:-2px;font-family:inherit;
           display:flex;align-items:center;gap:6px; }
    .tab--active { color:#3F2D7C;border-bottom-color:#5B3FA0; }
    .tab-count { background:#E8E2F4;color:#3F2D7C;border-radius:999px;padding:1px 7px;font-size:11px; }
    .loading,.err { padding:24px;text-align:center;color:#6B5BA0; }
    .table-wrap { background:#fff;border:1px solid #E8E2F4;border-radius:12px;
      box-shadow:0 4px 16px rgba(63,45,124,.06);overflow:auto; }
    table { width:100%;border-collapse:collapse;min-width:1100px; }
    thead th { text-align:left;padding:10px 12px;background:#F5F2FB;color:#3F2D7C;
      font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap; }
    thead th.num { text-align:right; }
    tbody td { padding:9px 12px;border-bottom:1px solid #F0EBF8;font-size:12px;color:#1A1A33; }
    tbody td.num { text-align:right; }
    tbody tr:last-child td { border-bottom:none; }
    tbody tr:hover td { background:#FAFAFE; }
    .row--lfd-warn td { background:#FFF8F0; }
    .hold-row td { background:#FEF2F2;color:#B23F45;font-size:11px;padding:4px 12px; }
    code { background:#F5F2FB;padding:1px 6px;border-radius:4px;font-family:monospace;font-size:11px; }
    .muted { color:#9A9AA3; }
    .loc { max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .lfd-warn { color:#B23F45;font-weight:700; }
    .move-badge { padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;background:#E8E2F4;color:#3F2D7C; }
    .move-badge--drayage { background:#DCEAF8;color:#1F4E8A; }
    .move-badge--fcl { background:#E8F5E9;color:#2E7D32; }
    .move-badge--ltl,.move-badge--ftl { background:#FFF3D6;color:#946100; }
    .status { padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;background:#E8E2F4;color:#3F2D7C; }
    .status--notreadyforpickup { background:#FBE4E5;color:#B23F45; }
    .status--availablependingappointment { background:#FFF3D6;color:#946100; }
    .status--dispatched { background:#DCEAF8;color:#1F4E8A; }
    .status--outgated { background:#E8F5E9;color:#2E7D32; }
    .status--waitingreturnnotify { background:#F3E5F5;color:#6A1B9A; }
    .status--completed { background:#DCF5E4;color:#1F7A3D; }
    .status--cancelled { background:#F5F5F5;color:#777;text-decoration:line-through; }
    .empty { text-align:center;color:#9A9AA3;padding:32px !important; }
    .link { color:#5B3FA0;text-decoration:none;font-weight:600; }
  `],
})
export class JobsBoardComponent implements OnInit {
  private readonly api = inject(TruckingApiService);
  readonly rows    = signal<JobListDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly activeTab = signal<JobAvailabilityStatus | null>(null);
  readonly counts  = signal<Record<string, number>>({});

  readonly tabs: Tab[] = [
    { label: 'All Jobs',              status: null,                           color: '' },
    { label: 'Not Ready',             status: 'NotReadyForPickup',            color: 'red' },
    { label: 'Available',             status: 'AvailablePendingAppointment',  color: 'orange' },
    { label: 'Dispatched',            status: 'Dispatched',                   color: 'blue' },
    { label: 'Out-Gated',             status: 'OutGated',                     color: 'green' },
    { label: 'Waiting Return Notify', status: 'WaitingReturnNotify',          color: 'purple' },
    { label: 'Completed',             status: 'Completed',                    color: 'teal' },
  ];

  async ngOnInit() {
    await this.loadAll();
    await this.reload();
  }

  private async loadAll() {
    try {
      const all = await this.api.listJobs();
      const c: Record<string, number> = {};
      for (const t of this.tabs) {
        if (t.status) c[t.label] = all.filter(j => j.availabilityStatus === t.status).length;
        else c[t.label] = all.length;
      }
      this.counts.set(c);
    } catch {}
  }

  async setTab(t: Tab) { this.activeTab.set(t.status); await this.reload(); }

  private async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listJobs(this.activeTab() ?? undefined)); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load'); }
    finally { this.loading.set(false); }
  }

  statusLabel(s: JobAvailabilityStatus): string {
    const map: Record<string, string> = {
      NotReadyForPickup: 'Not Ready', AvailablePendingAppointment: 'Available',
      Dispatched: 'Dispatched', OutGated: 'Out-Gated',
      WaitingReturnNotify: 'Waiting Return', Completed: 'Completed', Cancelled: 'Cancelled',
    };
    return map[s] ?? s;
  }

  isLfdWarn(j: JobListDto): boolean {
    if (!j.lfdDate) return false;
    const lfd = new Date(j.lfdDate);
    const today = new Date();
    const diff = (lfd.getTime() - today.getTime()) / 86400000;
    return diff >= 0 && diff <= 2;
  }
}

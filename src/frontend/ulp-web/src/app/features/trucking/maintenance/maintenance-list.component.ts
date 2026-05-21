import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TruckingApiService } from '../shared/trucking-api.service';
import { EquipmentMaintDto } from '../shared/trucking-types';

@Component({
  selector: 'ulp-maintenance-list',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Equipment Maintenance</h1>
      <p>PMI, repairs, inspections, and tire service for trucks and chassis.</p>
    </header>
    <nav class="tabs">
      @for (s of statuses; track s) {
        <button class="tab" [class.tab--active]="filter() === s" (click)="setFilter(s)">{{ s }}</button>
      }
      <button class="tab" [class.tab--active]="filter() === null" (click)="setFilter(null)">All</button>
    </nav>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Equipment</th><th>Kind</th><th>Type</th><th>Description</th>
            <th>Start</th><th>End</th><th class="num">Cost</th><th>Status</th>
          </tr></thead>
          <tbody>
            @for (m of rows(); track m.id) {
              <tr>
                <td><strong>{{ m.equipmentLabel ?? '#' + m.equipmentId }}</strong></td>
                <td><span class="badge" [class.badge--chassis]="m.equipmentKind === 'Chassis'">{{ m.equipmentKind }}</span></td>
                <td>{{ m.maintType }}</td>
                <td>{{ m.description }}</td>
                <td>{{ m.startDate | slice:0:10 }}</td>
                <td>{{ m.endDate ? (m.endDate | slice:0:10) : '—' }}</td>
                <td class="num">{{ m.costAmount ? (m.costAmount | number:'1.0-2') : '—' }}</td>
                <td><span class="status status--{{ m.status.toLowerCase() }}">{{ m.status }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty">No maintenance records.</td></tr>
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
    .tabs{display:flex;gap:6px;border-bottom:1px solid #E8E2F4;margin-bottom:12px;padding:0 4px;}
    .tab{background:transparent;border:none;cursor:pointer;padding:8px 12px;font-size:12px;font-weight:600;color:#6B5BA0;border-bottom:2px solid transparent;margin-bottom:-1px;font-family:inherit;}
    .tab--active{color:#3F2D7C;border-bottom-color:#5B3FA0;}
    .loading{padding:24px;text-align:center;color:#6B5BA0;}
    .table-wrap{background:#fff;border:1px solid #E8E2F4;border-radius:12px;box-shadow:0 4px 16px rgba(63,45,124,.06);overflow:auto;}
    table{width:100%;border-collapse:collapse;}
    thead th{text-align:left;padding:12px 14px;background:#F5F2FB;color:#3F2D7C;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
    thead th.num{text-align:right;}
    tbody td{padding:10px 14px;border-bottom:1px solid #F0EBF8;font-size:13px;}
    tbody td.num{text-align:right;}
    .badge{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#E8E2F4;color:#3F2D7C;}
    .badge--chassis{background:#FFF3D6;color:#946100;}
    .status{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;}
    .status--scheduled{background:#DCEAF8;color:#1F4E8A;}
    .status--inprogress{background:#FFF3D6;color:#946100;}
    .status--completed{background:#DCF5E4;color:#1F7A3D;}
    .status--cancelled{background:#F5F5F5;color:#777;}
    .empty{text-align:center;color:#9A9AA3;padding:32px !important;}
  `],
})
export class MaintenanceListComponent implements OnInit {
  private readonly api = inject(TruckingApiService);
  readonly rows = signal<EquipmentMaintDto[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<string | null>(null);
  readonly statuses = ['Scheduled', 'InProgress', 'Completed'];

  async ngOnInit() { await this.reload(); }
  async setFilter(s: string | null) { this.filter.set(s); await this.reload(); }
  private async reload() {
    this.loading.set(true);
    try { this.rows.set(await this.api.listMaintenance(undefined, this.filter() as any ?? undefined)); }
    finally { this.loading.set(false); }
  }
}

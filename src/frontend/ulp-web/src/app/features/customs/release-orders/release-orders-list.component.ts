import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CustomsApiService } from '../shared/customs-api.service';
import { ReleaseOrderDto } from '../shared/customs-types';

@Component({
  selector: 'ulp-customs-release-orders',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Release Orders</h1>
      <p>Turnover Order, Delivery Order, Release Instructions, Letter of Guarantee.
         Closes the SCM client M1 "Turnover/Release Order" item.</p>
    </header>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Type</th><th>Reference</th><th>Entry</th><th>Issued</th><th>Pickup</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td><span class="type type--{{ r.orderType.toLowerCase() }}">{{ r.orderType }}</span></td>
                <td class="mono"><strong>{{ r.referenceNumber }}</strong></td>
                <td><a [routerLink]="['/app/customs/entries', r.entryId]" class="link">#{{ r.entryId }}</a></td>
                <td>{{ r.issuedAt | slice:0:10 }}</td>
                <td>{{ r.cargoPickupAt ? (r.cargoPickupAt | slice:0:10) : 'â€”' }}</td>
                <td><span class="status status--{{ r.status.toLowerCase() }}">{{ r.status }}</span></td>
                <td class="muted small">{{ r.notes }}</td>
              </tr>
            } @empty { <tr><td colspan="7" class="empty">No release orders.</td></tr> }
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
    .small { font-size: 12px; }
    .muted { color: #6B5BA0; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
    .type { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .type--turnoverorder      { background: #DCEAF8; color: #1F4E8A; }
    .type--deliveryorder      { background: #DCF5E4; color: #1F7A3D; }
    .type--releaseinstruction { background: #FFE6CC; color: #8A4F00; }
    .type--letterofguarantee  { background: #E8E2F4; color: #3F2D7C; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--draft     { background: #F5F2FB; color: #6B5BA0; }
    .status--issued    { background: #DCF5E4; color: #1F7A3D; }
    .status--picked    { background: #C8EBD3; color: #1F7A3D; }
    .status--cancelled { background: #FBE4E5; color: #B23F45; text-decoration: line-through; }
  `],
})
export class ReleaseOrdersListComponent implements OnInit {
  private readonly api = inject(CustomsApiService);
  readonly rows = signal<ReleaseOrderDto[]>([]);
  readonly loading = signal(true);
  async ngOnInit() {
    try { this.rows.set(await this.api.listReleaseOrders()); }
    finally { this.loading.set(false); }
  }
}

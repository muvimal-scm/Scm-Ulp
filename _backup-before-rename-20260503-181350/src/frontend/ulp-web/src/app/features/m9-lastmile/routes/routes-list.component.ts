import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M9ApiService } from '../shared/m9-api.service';
import { RouteDto } from '../shared/m9-types';

@Component({
  selector: 'ulp-m9-routes',
  standalone: true,
  imports: [SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Routes</h1>
      <p>Pickup, delivery, and mixed routes — driver, vehicle, and stop count.</p>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Route #</th><th>Country</th><th>Name</th><th>Type</th>
              <th>Planned</th><th>Vehicle</th><th>Status</th><th class="num">Stops</th></tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td><code>{{ r.routeCode }}</code></td>
                <td>{{ r.countryCode }}</td>
                <td>{{ r.name ?? '—' }}</td>
                <td><span class="rt rt--{{ r.routeType.toLowerCase() }}">{{ r.routeType }}</span></td>
                <td>{{ r.plannedDate | slice:0:10 }}</td>
                <td>{{ r.vehicleNo ?? '—' }}</td>
                <td><span class="status status--{{ r.status.toLowerCase() }}">{{ r.status }}</span></td>
                <td class="num">{{ r.stopCount }}</td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty">No routes yet.</td></tr>
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
    thead th.num { text-align: right; }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .rt { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .rt--pickup   { background: #DCEAF8; color: #1F4E8A; }
    .rt--delivery { background: #FFF3D6; color: #946100; }
    .rt--mixed    { background: #E8E2F4; color: #3F2D7C; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--planned    { background: #E8E2F4; color: #3F2D7C; }
    .status--inprogress { background: #FFF3D6; color: #946100; }
    .status--completed  { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled  { background: #FBE4E5; color: #B23F45; }
  `],
})
export class RoutesListComponent implements OnInit {
  private readonly api = inject(M9ApiService);
  readonly rows = signal<RouteDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listRoutes()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load routes'); }
    finally { this.loading.set(false); }
  }
}

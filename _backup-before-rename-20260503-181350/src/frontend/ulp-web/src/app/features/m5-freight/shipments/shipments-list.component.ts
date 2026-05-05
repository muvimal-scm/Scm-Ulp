import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M5ApiService } from '../shared/m5-api.service';
import { ShipmentDto } from '../shared/m5-types';

@Component({
  selector: 'ulp-m5-shipments',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Shipments</h1>
      <p>Confirmed shipments — vessel/flight, ETD/ETA, milestone progress.</p>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Shipment #</th><th>Country</th><th>Mode</th>
              <th>Vessel / flight</th><th>ETD</th><th>ETA</th>
              <th class="num">Containers</th><th class="num">Milestones</th>
              <th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (s of rows(); track s.id) {
              <tr>
                <td><code>{{ s.shipmentNumber }}</code></td>
                <td>{{ s.countryCode }}</td>
                <td>{{ s.mode }}</td>
                <td>{{ s.vesselOrFlight ?? '—' }}<br/><span class="muted">{{ s.voyageOrFlightNo ?? '' }}</span></td>
                <td>{{ s.etd ? (s.etd | slice:0:16) : '—' }}</td>
                <td>{{ s.eta ? (s.eta | slice:0:16) : '—' }}</td>
                <td class="num">{{ s.containerCount }}</td>
                <td class="num">{{ s.milestoneCount }}</td>
                <td><span class="status status--{{ s.status.toLowerCase() }}">{{ s.status }}</span></td>
                <td><a [routerLink]="[s.id]" class="link">Open →</a></td>
              </tr>
            } @empty {
              <tr><td colspan="10" class="empty">No shipments yet.</td></tr>
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
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; vertical-align: top; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .muted { color: #9A9AA3; font-size: 11px; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--booked     { background: #E8E2F4; color: #3F2D7C; }
    .status--loaded     { background: #DCEAF8; color: #1F4E8A; }
    .status--departed   { background: #FFF3D6; color: #946100; }
    .status--intransit  { background: #FFF3D6; color: #946100; }
    .status--arrived    { background: #FFE6CC; color: #8A4F00; }
    .status--discharged { background: #FFE6CC; color: #8A4F00; }
    .status--gateout    { background: #DCF5E4; color: #1F7A3D; }
    .status--delivered  { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled  { background: #FBE4E5; color: #B23F45; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
  `],
})
export class ShipmentsListComponent implements OnInit {
  private readonly api = inject(M5ApiService);
  readonly rows    = signal<ShipmentDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listShipments()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load shipments'); }
    finally { this.loading.set(false); }
  }
}

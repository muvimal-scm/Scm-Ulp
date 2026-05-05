import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FreightForwardingApiService } from '../shared/freight-forwarding-api.service';
import { ConsolDto } from '../shared/freight-forwarding-types';

@Component({
  selector: 'ulp-freight-forwarding-consols',
  standalone: true,
  imports: [SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Consolidations</h1>
      <p>LCL groupage and air consol manifests.</p>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Consol #</th><th>Type</th><th>Master shipment</th><th>Status</th><th>Created</th></tr>
          </thead>
          <tbody>
            @for (c of rows(); track c.id) {
              <tr>
                <td><code>{{ c.consolNumber }}</code></td>
                <td>{{ c.consolType }}</td>
                <td>shipment #{{ c.masterShipmentId }}</td>
                <td><span class="status status--{{ c.status.toLowerCase() }}">{{ c.status }}</span></td>
                <td>{{ c.createdAt | slice:0:19 }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty">No consolidations.</td></tr>
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
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--open     { background: #E8E2F4; color: #3F2D7C; }
    .status--sealed   { background: #DCEAF8; color: #1F4E8A; }
    .status--departed { background: #FFF3D6; color: #946100; }
    .status--closed   { background: #DCF5E4; color: #1F7A3D; }
  `],
})
export class ConsolsListComponent implements OnInit {
  private readonly api = inject(FreightForwardingApiService);
  readonly rows = signal<ConsolDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listConsols()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load consols'); }
    finally { this.loading.set(false); }
  }
}

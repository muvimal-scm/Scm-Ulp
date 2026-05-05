import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LastMileApiService } from '../shared/last-mile-api.service';
import { PodDto } from '../shared/last-mile-types';

@Component({
  selector: 'ulp-last-mile-pods',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class=”page-head”>
      <div class=”head-row”>
        <div>
          <h1>Proofs of delivery</h1>
          <p>Captured POD records — signed-by, GPS, photo doc, capturing user.</p>
        </div>
        <a mat-flat-button color=”primary” routerLink=”new” class=”new-btn”>
          <mat-icon>add</mat-icon>&nbsp;Capture POD
        </a>
      </div>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Booking</th><th>Signed by</th><th>GPS</th><th>Captured</th><th>By user</th></tr>
          </thead>
          <tbody>
            @for (p of rows(); track p.id) {
              <tr>
                <td>booking #{{ p.bookingId }}</td>
                <td>{{ p.signedBy ?? 'â€”' }}</td>
                <td>@if (p.gpsLat && p.gpsLng) { {{ p.gpsLat | number:'1.4-4' }}, {{ p.gpsLng | number:'1.4-4' }} } @else { â€” }</td>
                <td>{{ p.capturedAt | slice:0:19 }}</td>
                <td>{{ p.capturedByUserId ? ('user #' + p.capturedByUserId) : 'â€”' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty">No PODs captured yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .new-btn { white-space: nowrap; }
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
  `],
})
export class PodsListComponent implements OnInit {
  private readonly api = inject(LastMileApiService);
  readonly rows = signal<PodDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listPods()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load PODs'); }
    finally { this.loading.set(false); }
  }
}

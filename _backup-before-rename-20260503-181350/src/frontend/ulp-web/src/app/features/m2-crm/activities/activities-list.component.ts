import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M2ApiService } from '../shared/m2-api.service';
import { ActivityDto } from '../shared/m2-types';

@Component({
  selector: 'ulp-m2-activities',
  standalone: true,
  imports: [SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Activities</h1>
      <p>Calls, emails, meetings, notes and tasks across leads, opps and parties.</p>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Type</th><th>Subject</th><th>Related</th><th>Owner</th><th>When</th></tr>
          </thead>
          <tbody>
            @for (a of rows(); track a.id) {
              <tr>
                <td><span class="type type--{{ a.activityType.toLowerCase() }}">{{ a.activityType }}</span></td>
                <td>{{ a.subject ?? '—' }}</td>
                <td>{{ a.relatedTo }} #{{ a.relatedId }}</td>
                <td>{{ a.ownerUserId ? ('user #' + a.ownerUserId) : '—' }}</td>
                <td>{{ a.occurredAt | slice:0:19 }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty">No activities yet.</td></tr>
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
    .type { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .type--call    { background: #DCEAF8; color: #1F4E8A; }
    .type--email   { background: #E8E2F4; color: #3F2D7C; }
    .type--meeting { background: #FFF3D6; color: #946100; }
    .type--note    { background: #DCF5E4; color: #1F7A3D; }
    .type--task    { background: #FBE4E5; color: #B23F45; }
  `],
})
export class ActivitiesListComponent implements OnInit {
  private readonly api = inject(M2ApiService);
  readonly rows = signal<ActivityDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try { this.rows.set(await this.api.listActivities()); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load activities'); }
    finally { this.loading.set(false); }
  }
}

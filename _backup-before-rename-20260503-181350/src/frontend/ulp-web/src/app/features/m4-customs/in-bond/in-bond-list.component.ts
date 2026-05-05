import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M4ApiService } from '../shared/m4-api.service';
import { InBondDto } from '../shared/m4-types';

@Component({
  selector: 'ulp-m4-in-bond',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>In-Bond Moves (I.T. / T&amp;E / W/D)</h1>
      <p>Immediate Transportation, Transportation &amp; Exportation, Warehouse Withdrawal.
         Closes the SCM client M1 "I.T." item.</p>
    </header>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>In-Bond #</th><th>Type</th><th>Carrier</th><th>Origin</th><th>Destination</th><th>Initiated</th><th>Arrived</th><th>Status</th><th>Entry</th></tr></thead>
          <tbody>
            @for (i of rows(); track i.id) {
              <tr>
                <td class="mono"><strong>{{ i.inBondNumber }}</strong></td>
                <td><span class="type type--{{ i.inBondType.toLowerCase() }}">{{ i.inBondType }}</span></td>
                <td class="mono">{{ i.carrierScac }}</td>
                <td class="mono">{{ i.originPortCode }}</td>
                <td class="mono">{{ i.destinationPortCode }}</td>
                <td>{{ i.initiatedAt | slice:0:10 }}</td>
                <td>{{ i.arrivedAt ? (i.arrivedAt | slice:0:10) : '—' }}</td>
                <td><span class="status status--{{ i.status.toLowerCase() }}">{{ i.status }}</span></td>
                <td>@if (i.entryId) { <a [routerLink]="['/app/m4/entries', i.entryId]" class="link">#{{ i.entryId }}</a> } @else { <span class="muted">—</span> }</td>
              </tr>
            } @empty { <tr><td colspan="9" class="empty">No in-bond moves.</td></tr> }
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
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .muted { color: #9A9AA3; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
    .type { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .type--it { background: #DCEAF8; color: #1F4E8A; }
    .type--te { background: #FFE6CC; color: #8A4F00; }
    .type--wd { background: #E8E2F4; color: #3F2D7C; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--open      { background: #FFF3D6; color: #946100; }
    .status--intransit { background: #DCEAF8; color: #1F4E8A; }
    .status--arrived   { background: #DCF5E4; color: #1F7A3D; }
    .status--closed    { background: #C8EBD3; color: #1F7A3D; }
    .status--cancelled { background: #FBE4E5; color: #B23F45; text-decoration: line-through; }
  `],
})
export class InBondListComponent implements OnInit {
  private readonly api = inject(M4ApiService);
  readonly rows = signal<InBondDto[]>([]);
  readonly loading = signal(true);
  async ngOnInit() {
    try { this.rows.set(await this.api.listInBondMoves()); }
    finally { this.loading.set(false); }
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M4ApiService } from '../shared/m4-api.service';
import { HoldExamDto, PgaHoldDto } from '../shared/m4-types';

@Component({
  selector: 'ulp-m4-holds',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Holds &amp; Exams</h1>
      <p>PGA holds (FDA, USDA, EPA, etc.) and CBP customs hold/exam notices.
         Closes the SCM client M1 "US Customs Hold/Exam Notice" + M2 "PGA holds (FDA holds)" items.</p>
    </header>

    <nav class="tabs">
      <button class="tab" [class.tab--active]="tab() === 'pga'" (click)="tab.set('pga')">
        PGA Holds @if (pgaCount() > 0) { <span class="tab__count">{{ pgaCount() }}</span> }
      </button>
      <button class="tab" [class.tab--active]="tab() === 'cbp'" (click)="tab.set('cbp')">
        CBP Hold/Exam @if (cbpCount() > 0) { <span class="tab__count">{{ cbpCount() }}</span> }
      </button>
    </nav>

    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      @if (tab() === 'pga') {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Entry</th><th>PGA</th><th>Reason code</th><th>Reason</th><th>Status</th><th>Raised</th><th>Released</th></tr></thead>
            <tbody>
              @for (h of pgaHolds(); track h.id) {
                <tr>
                  <td><a [routerLink]="['/app/m4/entries', h.entryId]" class="link">{{ h.entryNumber ?? '#' + h.entryId }}</a></td>
                  <td><span class="pga pga--{{ h.pgaCode.toLowerCase() }}">{{ h.pgaCode }}</span></td>
                  <td class="mono">{{ h.holdReasonCode ?? '—' }}</td>
                  <td class="reason">{{ h.holdReasonText }}</td>
                  <td><span class="status status--{{ h.status.toLowerCase() }}">{{ h.status }}</span></td>
                  <td>{{ h.raisedAt | slice:0:16 }}</td>
                  <td>{{ h.releasedAt ? (h.releasedAt | slice:0:16) : '—' }}</td>
                </tr>
              } @empty { <tr><td colspan="7" class="empty">No active PGA holds.</td></tr> }
            </tbody>
          </table>
        </div>
      }
      @if (tab() === 'cbp') {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Entry</th><th>Type</th><th>Exam</th><th>Reason code</th><th>Reason</th><th>Exam site</th><th>Appt</th><th>Status</th></tr></thead>
            <tbody>
              @for (h of cbpHolds(); track h.id) {
                <tr>
                  <td><a [routerLink]="['/app/m4/entries', h.entryId]" class="link">{{ h.entryNumber ?? '#' + h.entryId }}</a></td>
                  <td><span class="hold-type hold-type--{{ h.noticeType.toLowerCase() }}">{{ h.noticeType }}</span></td>
                  <td>{{ h.examType !== 'Nil' ? h.examType : '—' }}</td>
                  <td class="mono">{{ h.holdReasonCode ?? '—' }}</td>
                  <td class="reason">{{ h.holdReasonText }}</td>
                  <td>{{ h.examSite ?? '—' }}</td>
                  <td>{{ h.examAppointmentAt ? (h.examAppointmentAt | slice:0:16) : '—' }}</td>
                  <td><span class="status status--{{ h.status.toLowerCase() }}">{{ h.status }}</span></td>
                </tr>
              } @empty { <tr><td colspan="8" class="empty">No open CBP hold/exam notices.</td></tr> }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 16px; max-width: 720px; }
    .tabs { display: flex; gap: 6px; border-bottom: 1px solid #E8E2F4; margin-bottom: 12px; padding: 0 4px; }
    .tab { background: transparent; border: none; cursor: pointer; padding: 10px 14px; font-size: 13px;
           font-weight: 600; color: #6B5BA0; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit; }
    .tab:hover { color: #3F2D7C; }
    .tab--active { color: #3F2D7C; border-bottom-color: #5B3FA0; }
    .tab__count { display: inline-block; margin-left: 6px; background: #FBE4E5; color: #B23F45;
                  font-size: 11px; padding: 1px 8px; border-radius: 999px; font-weight: 700; }
    .loading { padding: 24px; text-align: center; color: #6B5BA0; }
    .table-wrap { background: #FFF; border: 1px solid #E8E2F4; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #F0EBF8; font-size: 13px; color: #1A1A33; vertical-align: top; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .reason { color: #6B5BA0; max-width: 350px; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
    .pga { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .pga--fda       { background: #FBE4E5; color: #B23F45; }
    .pga--usdaaphis { background: #DCF5E4; color: #1F7A3D; }
    .pga--usdafsis  { background: #DCF5E4; color: #1F7A3D; }
    .pga--epatsca   { background: #DCEAF8; color: #1F4E8A; }
    .pga--epafifra  { background: #DCEAF8; color: #1F4E8A; }
    .pga--fcc       { background: #FFE6CC; color: #8A4F00; }
    .pga--fws       { background: #DCF5E4; color: #1F7A3D; }
    .pga--cpsc      { background: #E8E2F4; color: #3F2D7C; }
    .pga--atf       { background: #FBE4E5; color: #B23F45; }
    .pga--dotnhtsa  { background: #FFE6CC; color: #8A4F00; }
    .hold-type { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .hold-type--hold { background: #FBE4E5; color: #B23F45; }
    .hold-type--exam { background: #FFE6CC; color: #8A4F00; }
    .hold-type--both { background: #FBE4E5; color: #B23F45; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--active   { background: #FBE4E5; color: #B23F45; }
    .status--released { background: #DCF5E4; color: #1F7A3D; }
    .status--refused  { background: #F5F5F5; color: #777; }
    .status--withdrawn{ background: #E8E2F4; color: #3F2D7C; }
    .status--open     { background: #FFE6CC; color: #8A4F00; }
    .status--resolved { background: #DCF5E4; color: #1F7A3D; }
  `],
})
export class HoldsPageComponent implements OnInit {
  private readonly api = inject(M4ApiService);
  readonly tab = signal<'pga' | 'cbp'>('pga');
  readonly pgaHolds = signal<PgaHoldDto[]>([]);
  readonly cbpHolds = signal<HoldExamDto[]>([]);
  readonly loading = signal(true);

  pgaCount = () => this.pgaHolds().length;
  cbpCount = () => this.cbpHolds().length;

  async ngOnInit() {
    try {
      const [p, c] = await Promise.all([this.api.listPgaHolds(true), this.api.listHoldExams(true)]);
      this.pgaHolds.set(p);
      this.cbpHolds.set(c);
    } finally { this.loading.set(false); }
  }
}

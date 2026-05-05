import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';

/**
 * SCM Milestone 3 — auto-notification rules.
 *
 * Lists the 5 seeded rules per tenant; each row has a "Run now" button that
 * fires the rule synchronously and shows match/sent counts. The schedule
 * (cron) is shown but not yet wired — a Hangfire scheduler is the Phase 5
 * follow-up. The rule itself uses a stub matcher today; clearly flagged.
 */

type RuleQueryKind = 'ShipmentsOnHold' | 'StatementOfAccount' | 'ShipmentsArriving' | 'ContainersNotReturned' | 'ContainersReadyForReturn';
type RuleRunStatus = 'Running' | 'Success' | 'PartialFailure' | 'Failed';
type Channel       = 'Email' | 'Sms' | 'Whatsapp' | 'InApp' | 'Webhook';

interface RuleDto {
  id: number; code: string; name: string; description: string | null;
  queryKind: RuleQueryKind; thresholdDays: number | null;
  channel: Channel; templateCode: string | null;
  recipientStrategy: string; cronExpression: string | null;
  isEnabled: boolean;
  lastRunAt: string | null; lastRunStatus: RuleRunStatus | null;
  lastRunMatchCount: number | null; lastRunSentCount: number | null; lastRunError: string | null;
}

interface RuleRunResultDto {
  ruleId: number; runId: number; status: RuleRunStatus;
  matchCount: number; sentCount: number; error: string | null; finishedAt: string;
}

@Component({
  selector: 'ulp-m27-rules',
  standalone: true,
  imports: [SlicePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Auto-notification rules</h1>
      <p>SCM Milestone 3 — five recurring rules ship pre-configured. Run any rule on demand;
         scheduled execution lands with the Phase-5 Hangfire wiring.</p>
    </header>

    <div class="banner">
      <mat-icon>science</mat-icon>
      <span><strong>Phase-1 stub:</strong> the matcher returns deterministic counts so the loop
        (rule → email → run log) is verifiable end-to-end. Real predicates against M5/M17 land
        in Phase 5 alongside the production scheduler.</span>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Name</th><th>Channel</th><th>Cron</th>
              <th>Enabled</th>
              <th class="num">Last matches</th><th class="num">Last sent</th>
              <th>Last status</th><th>Last run</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td><code>{{ r.code }}</code></td>
                <td>{{ r.name }}<br/><span class="muted">{{ r.description }}</span></td>
                <td>{{ r.channel }}</td>
                <td><code>{{ r.cronExpression ?? '—' }}</code></td>
                <td>
                  <button class="toggle"
                          [class.toggle--on]="r.isEnabled"
                          (click)="toggle(r)"
                          [disabled]="busyId() === r.id">
                    {{ r.isEnabled ? 'On' : 'Off' }}
                  </button>
                </td>
                <td class="num">{{ r.lastRunMatchCount ?? '—' }}</td>
                <td class="num">{{ r.lastRunSentCount ?? '—' }}</td>
                <td>
                  @if (r.lastRunStatus) {
                    <span class="status status--{{ r.lastRunStatus.toLowerCase() }}">{{ r.lastRunStatus }}</span>
                  } @else { <span class="muted">never</span> }
                </td>
                <td>{{ r.lastRunAt ? (r.lastRunAt | slice:0:19) : '—' }}</td>
                <td>
                  <button class="btn"
                          (click)="run(r)"
                          [disabled]="busyId() === r.id || !r.isEnabled">
                    @if (busyId() === r.id) { Running… } @else { Run now }
                  </button>
                </td>
              </tr>
              @if (lastResult()?.ruleId === r.id) {
                <tr class="result-row">
                  <td colspan="10">
                    <span class="result-pill result-pill--{{ lastResult()!.status.toLowerCase() }}">
                      {{ lastResult()!.status }}
                    </span>
                    matched <strong>{{ lastResult()!.matchCount }}</strong> ·
                    sent <strong>{{ lastResult()!.sentCount }}</strong>
                    @if (lastResult()!.error) { · <span class="error-text">{{ lastResult()!.error }}</span> }
                    · finished {{ lastResult()!.finishedAt | slice:0:19 }}
                  </td>
                </tr>
              }
            } @empty {
              <tr><td colspan="10" class="empty">No rules configured.</td></tr>
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
    .page-head p { color: #6B5BA0; margin: 0 0 16px; max-width: 720px; }

    .banner {
      display: flex; gap: 10px; align-items: flex-start;
      padding: 10px 14px; background: #FFF3D6; color: #946100;
      border: 1px solid #F0DFA8; border-radius: 8px;
      font-size: 12px; margin-bottom: 16px;
    }
    .banner mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .table-wrap { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 12px 14px; background: #F5F2FB; color: #3F2D7C;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    tbody td { padding: 12px 14px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; vertical-align: top; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr.result-row td { background: #FAFAFE; padding: 8px 14px; border-bottom: 2px solid #E8E2F4; }
    tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }
    .muted { color: #9A9AA3; font-size: 11px; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .toggle {
      padding: 4px 12px; border-radius: 999px; border: none;
      background: #FBE4E5; color: #B23F45; font-weight: 700; font-size: 11px;
      cursor: pointer; font-family: inherit;
    }
    .toggle--on { background: #DCF5E4; color: #1F7A3D; }
    .toggle:disabled { opacity: 0.5; cursor: not-allowed; }

    .status { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--success         { background: #DCF5E4; color: #1F7A3D; }
    .status--running         { background: #DCEAF8; color: #1F4E8A; }
    .status--partialfailure  { background: #FFF3D6; color: #946100; }
    .status--failed          { background: #FBE4E5; color: #B23F45; }

    .result-pill { padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .result-pill--success         { background: #DCF5E4; color: #1F7A3D; }
    .result-pill--running         { background: #DCEAF8; color: #1F4E8A; }
    .result-pill--partialfailure  { background: #FFF3D6; color: #946100; }
    .result-pill--failed          { background: #FBE4E5; color: #B23F45; }
    .error-text { color: #B23F45; }

    .btn { padding: 6px 12px; background: #5B3FA0; color: #FFF; border: none;
      border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; font-family: inherit; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class RulesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/m27/rules`;

  readonly rows       = signal<RuleDto[]>([]);
  readonly loading    = signal(true);
  readonly error      = signal<string | null>(null);
  readonly busyId     = signal<number | null>(null);
  readonly lastResult = signal<RuleRunResultDto | null>(null);

  async ngOnInit() { await this.reload(); }

  async reload() {
    this.loading.set(true); this.error.set(null);
    try { this.rows.set(await firstValueFrom(this.http.get<RuleDto[]>(this.base))); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load rules'); }
    finally { this.loading.set(false); }
  }

  async run(r: RuleDto) {
    if (this.busyId()) return;
    this.busyId.set(r.id); this.error.set(null);
    try {
      const res = await firstValueFrom(this.http.post<RuleRunResultDto>(`${this.base}/${r.id}/run`, {}));
      this.lastResult.set(res);
      await this.reload();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Run failed');
    } finally {
      this.busyId.set(null);
    }
  }

  async toggle(r: RuleDto) {
    if (this.busyId()) return;
    this.busyId.set(r.id); this.error.set(null);
    try {
      await firstValueFrom(this.http.post(`${this.base}/${r.id}/toggle`, { enabled: !r.isEnabled }));
      await this.reload();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Toggle failed');
    } finally {
      this.busyId.set(null);
    }
  }
}

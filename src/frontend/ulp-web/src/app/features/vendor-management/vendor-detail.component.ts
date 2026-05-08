import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VendorManagementApiService } from './shared/vendor-management-api.service';
import { AgreementDto, NcrDto, OnboardingStepDto, PerformanceScoreDto, VendorDto } from './shared/vendor-management-types';

@Component({
  selector: 'ulp-vendor-management-vendor-detail',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatIconModule, MatButtonModule, MatTabsModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink=".." class="back"><mat-icon>arrow_back</mat-icon> Vendors</a>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else if (vendor()) {
      @if (vendor(); as v) {
      <header class="page-head">
        <h1>{{ v.vendorCode }}</h1>
        <div class="head-meta">
          <span class="badge badge--{{ v.status.toLowerCase() }}">{{ v.status }}</span>
          <span class="risk risk--{{ v.riskTier.toLowerCase() }}">risk: {{ v.riskTier }}</span>
          <span class="ctry">{{ v.countryCode }} · party {{ v.partyId }} · tenant {{ v.tenantId }}</span>
        </div>
      </header>

      <div class="actions">
        @if (v.status !== 'Active') {
          <button mat-flat-button color="primary" (click)="activate()">
            <mat-icon>check</mat-icon> Activate
          </button>
        }
        @if (v.status === 'Active') {
          <button mat-stroked-button color="warn" (click)="suspend()">
            <mat-icon>block</mat-icon> Suspend
          </button>
        }
        @if (v.status === 'Prospect' || v.status === 'OnboardingInProgress') {
          <button mat-stroked-button (click)="startOnboarding()">
            <mat-icon>play_arrow</mat-icon> Start onboarding
          </button>
        }
      </div>

      <mat-tab-group class="tabs">
        <mat-tab label="Onboarding">
          @if (steps().length === 0) {
            <p class="muted">No steps yet — click "Start onboarding" to seed.</p>
          } @else {
            <ol class="steps">
              @for (s of steps(); track s.stepCode) {
                <li class="step step--{{ s.status.toLowerCase() }}">
                  <mat-icon>{{ stepIcon(s.status) }}</mat-icon>
                  <div>
                    <div class="step__name">{{ s.stepName }} <code>{{ s.stepCode }}</code></div>
                    <div class="step__meta">
                      {{ s.status }}{{ s.required ? ' · required' : ' · optional' }}
                      @if (s.performedAt) { · {{ s.performedAt | slice:0:19 }} }
                    </div>
                  </div>
                  @if (s.status !== 'Completed') {
                    <button mat-button (click)="complete(s.stepCode)">Mark done</button>
                  }
                </li>
              }
            </ol>
          }
        </mat-tab>

        <mat-tab label="Agreements ({{ agreements().length }})">
          @if (agreements().length === 0) {
            <p class="muted">No agreements yet.</p>
          } @else {
            <table>
              <thead><tr><th>Number</th><th>Type</th><th>Title</th><th>Period</th><th>Status</th></tr></thead>
              <tbody>
                @for (a of agreements(); track a.id) {
                  <tr>
                    <td><code>{{ a.agreementNumber }}</code></td>
                    <td>{{ a.agreementType }}</td>
                    <td>{{ a.title }}</td>
                    <td>{{ a.startDate | slice:0:10 }} — {{ a.endDate ? (a.endDate | slice:0:10) : 'open' }}</td>
                    <td><span class="ag-status">{{ a.status }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </mat-tab>

        <mat-tab label="Performance ({{ scores().length }})">
          @if (scores().length === 0) {
            <p class="muted">No score periods yet.</p>
          } @else {
            <table>
              <thead><tr><th>Period</th><th>OTD %</th><th>Quality</th><th>SLA breaches</th><th>NCRs</th><th>Overall</th><th>Rating</th></tr></thead>
              <tbody>
                @for (s of scores(); track s.id) {
                  <tr>
                    <td>{{ s.periodStart | slice:0:10 }} → {{ s.periodEnd | slice:0:10 }}</td>
                    <td>{{ s.onTimeDeliveryPct ?? '—' }}</td>
                    <td>{{ s.qualityScore ?? '—' }}</td>
                    <td>{{ s.slaBreachCount }}</td>
                    <td>{{ s.ncrCount }}</td>
                    <td>{{ s.overallScore ?? '—' }}</td>
                    <td>@if (s.rating) { <span class="rating rating--{{ s.rating.toLowerCase() }}">{{ s.rating }}</span> }</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </mat-tab>

        <mat-tab label="NCRs ({{ ncrs().length }})">
          @if (ncrs().length === 0) {
            <p class="muted">No non-conformance reports filed.</p>
          } @else {
            <table>
              <thead><tr><th>Number</th><th>Severity</th><th>Status</th><th>Description</th><th>Raised</th></tr></thead>
              <tbody>
                @for (n of ncrs(); track n.id) {
                  <tr>
                    <td><code>{{ n.ncrNumber }}</code></td>
                    <td><span class="sev sev--{{ n.severity.toLowerCase() }}">{{ n.severity }}</span></td>
                    <td>{{ n.status }}</td>
                    <td>{{ n.description }}</td>
                    <td>{{ n.raisedAt | slice:0:19 }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </mat-tab>
      </mat-tab-group>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .back { color: #5B3FA0; text-decoration: none; display: inline-flex; gap: 6px; align-items: center; font-size: 13px; margin-bottom: 12px; }
    .back:hover { color: #3F2D7C; }

    .page-head h1 {
      font-size: 28px; font-weight: 800; margin: 0 0 6px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .head-meta { display: flex; gap: 12px; align-items: center; color: #6B5BA0; font-size: 12.5px; margin-bottom: 16px; flex-wrap: wrap; }

    .actions { display: flex; gap: 8px; margin-bottom: 16px; }

    .tabs { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px; padding: 16px; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); }
    .muted { color: #9A9AA3; padding: 16px; text-align: center; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }

    .steps { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .step { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; padding: 10px 14px; border-radius: 10px; background: #F8F5FD; }
    .step--completed { background: #DCF5E4; }
    .step--failed    { background: #FCDDE0; }
    .step--inprogress{ background: #FFF3D6; }
    .step mat-icon { color: #5B3FA0; }
    .step--completed mat-icon { color: #1F7A3D; }
    .step--failed mat-icon    { color: #B23F45; }
    .step__name { color: #1A1A33; font-weight: 600; }
    .step__meta { color: #6B5BA0; font-size: 12px; margin-top: 2px; }

    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    thead th {
      text-align: left; padding: 10px 12px; background: #F5F2FB;
      color: #3F2D7C; font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #F0EBF8; font-size: 13px; }

    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .ctry { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px; }

    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .badge--prospect             { background: #F0F0F4; color: #6B6B73; }
    .badge--onboardinginprogress { background: #FFF3D6; color: #946100; }
    .badge--active               { background: #DCF5E4; color: #1F7A3D; }
    .badge--suspended            { background: #FCDDE0; color: #B23F45; }
    .badge--blacklisted          { background: #FFCDD2; color: #B71C1C; }
    .badge--closed               { background: #F0F0F4; color: #6B6B73; }

    .risk { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .risk--low { background: #DCF5E4; color: #1F7A3D; }
    .risk--medium { background: #FFF3D6; color: #946100; }
    .risk--high { background: #FCDDE0; color: #B23F45; }
    .risk--critical { background: #FFCDD2; color: #B71C1C; }

    .ag-status { padding: 2px 8px; background: #E8E2F4; color: #3F2D7C; border-radius: 6px; font-size: 11px; font-weight: 700; }

    .rating { padding: 2px 10px; border-radius: 999px; font-weight: 800; font-size: 12px; }
    .rating--a { background: #DCF5E4; color: #1F7A3D; }
    .rating--b { background: #E8E2F4; color: #3F2D7C; }
    .rating--c { background: #FFF3D6; color: #946100; }
    .rating--d { background: #FCDDE0; color: #B23F45; }
    .rating--f { background: #FFCDD2; color: #B71C1C; }

    .sev { padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .sev--low      { background: #DCF5E4; color: #1F7A3D; }
    .sev--medium   { background: #FFF3D6; color: #946100; }
    .sev--high     { background: #FCDDE0; color: #B23F45; }
    .sev--critical { background: #FFCDD2; color: #B71C1C; }
  `],
})
export class VendorDetailComponent implements OnInit {
  private readonly api   = inject(VendorManagementApiService);
  private readonly route = inject(ActivatedRoute);

  readonly vendor     = signal<VendorDto | null>(null);
  readonly steps      = signal<OnboardingStepDto[]>([]);
  readonly agreements = signal<AgreementDto[]>([]);
  readonly scores     = signal<PerformanceScoreDto[]>([]);
  readonly ncrs       = signal<NcrDto[]>([]);
  readonly loading    = signal(true);
  readonly error      = signal<string | null>(null);

  private id = 0;

  async ngOnInit() {
    const raw = this.route.snapshot.paramMap.get('id');
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Hit the route with a non-numeric segment — e.g. /vendor-management/vendors
      // matched :id='vendors' before the list path. Bounce to the list rather
      // than firing 4 × NaN-suffixed API calls.
      this.error.set(`Invalid vendor id: ${raw}`);
      this.loading.set(false);
      return;
    }
    this.id = parsed;
    await this.reloadAll();
  }

  async reloadAll() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [v, s, a, p, n] = await Promise.all([
        this.api.get(this.id),
        this.api.getOnboarding(this.id),
        this.api.listAgreements(this.id),
        this.api.performance(this.id),
        this.api.ncrs(this.id),
      ]);
      this.vendor.set(v);
      this.steps.set(s);
      this.agreements.set(a);
      this.scores.set(p);
      this.ncrs.set(n);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load vendor');
    } finally {
      this.loading.set(false);
    }
  }

  async activate()        { await this.api.activate(this.id); await this.reloadAll(); }
  async suspend()         {
    const reason = prompt('Reason?');
    if (!reason) return;
    await this.api.suspend(this.id, reason); await this.reloadAll();
  }
  async startOnboarding() { await this.api.startOnboarding(this.id); await this.reloadAll(); }
  async complete(stepCode: string) {
    await this.api.completeStep(this.id, stepCode);
    this.steps.set(await this.api.getOnboarding(this.id));
  }

  stepIcon(status: OnboardingStepDto['status']): string {
    switch (status) {
      case 'Completed':  return 'check_circle';
      case 'Failed':     return 'error_outline';
      case 'InProgress': return 'hourglass_top';
      case 'Skipped':    return 'remove_circle_outline';
      default:           return 'radio_button_unchecked';
    }
  }
}

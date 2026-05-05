import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { environment } from '../../../environments/environment';

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  time: string;
}

interface Tile {
  label: string;
  value: string;
  trend?: string;
  icon: string;
  /**
   * 8 distinct dashboard tones — each tile reads as its own card.
   * All tones harmonise with the lavender/pink page wash (purple-leaning
   * primaries) but introduce enough hue variety (teal, amber, mint, slate)
   * to make the dashboard scan-able at a glance — per the IFIT reference.
   * Page-level brand (purple primary on white) is unchanged.
   */
  tone: 'purple' | 'magenta' | 'coral' | 'teal' | 'amber' | 'mint' | 'slate' | 'plum';
  module: string;
}

/**
 * Dashboard landing inside the app shell.
 *
 * Phase 1 — placeholder KPI tiles + system status. Real values wire in
 * once M24 Dashboards module ships (Phase 4).
 *
 * Visual: continues the SCMCube brand from the sign-in page — soft
 * lavender wash background, white cards with purple-tinted shadows,
 * per-tile semantic accent colors (one per nav group from the IA doc).
 */
@Component({
  selector: 'ulp-dashboard',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Breadcrumb -->
    <nav class="bc">Home <span class="bc-sep">›</span> <span>Dashboard</span></nav>

    <!-- Hero / welcome -->
    <section class="hero">
      <div class="hero__copy">
        <h1 class="brand-heading">Welcome back, {{ firstName() }}</h1>
        <p class="hero__lede">{{ welcomeSub() }}</p>
        <div class="hero__pills">
          <span class="pill pill--country">
            <mat-icon>public</mat-icon>
            {{ ctx()?.countryCode || '—' }} · {{ ctx()?.region || '—' }}
          </span>
          <span class="pill" [class.pill--ok]="!apiError()" [class.pill--err]="!!apiError()">
            <mat-icon>{{ apiError() ? 'cloud_off' : 'cloud_done' }}</mat-icon>
            {{ apiError() ? 'API offline' : 'API online' }}
          </span>
          <span class="pill pill--phase">
            <mat-icon>flag</mat-icon>
            Phase 1 · Foundation
          </span>
        </div>
      </div>
      <div class="hero__art" aria-hidden="true">
        <div class="hero-cube"></div>
      </div>
    </section>

    <!-- Section title -->
    <div class="sec-h">
      <h2>Operational snapshot</h2>
      <span class="sec-h__sub">Live values arrive when each module ships</span>
    </div>

    <!-- KPI tiles -->
    <section class="tiles">
      @for (t of tiles; track t.label) {
        <article class="tile" [attr.data-tone]="t.tone">
          <div class="tile__icon"><mat-icon>{{ t.icon }}</mat-icon></div>
          <div class="tile__body">
            <div class="tile__label">{{ t.label }}</div>
            <div class="tile__value">{{ t.value }}</div>
            <div class="tile__trend">
              <mat-icon>schedule</mat-icon>
              {{ t.trend }}
            </div>
          </div>
        </article>
      }
    </section>

    <!-- Two-column cards -->
    <section class="grid-2">
      <article class="card card--accent-status">
        <header class="card__head">
          <div>
            <h2>System Status</h2>
            <span class="card__sub">Phase 1 connectivity check</span>
          </div>
          <span class="card__badge" [class.card__badge--err]="!!apiError()" [class.card__badge--ok]="!apiError() && apiHealth()">
            {{ loading() ? 'CHECKING' : apiError() ? 'OFFLINE' : 'ONLINE' }}
          </span>
        </header>
        @if (loading()) {
          <p class="muted">Pinging API…</p>
        } @else if (apiError()) {
          <p class="error">{{ apiError() }}</p>
          <p class="muted">
            Start the local stack: <code>pwsh infra/scripts/stack-up.ps1</code><br>
            Then run the API: <code>dotnet run --project src/backend/host/Ulp.Api</code>
          </p>
        } @else if (apiHealth()) {
          <ul class="kv">
            <li><span>Status</span><strong class="ok">{{ apiHealth()!.status }}</strong></li>
            <li><span>Service</span><strong>{{ apiHealth()!.service }}</strong></li>
            <li><span>Version</span><strong>{{ apiHealth()!.version }}</strong></li>
            <li><span>Server time (UTC)</span><strong>{{ apiHealth()!.time }}</strong></li>
          </ul>
        }
      </article>

      <article class="card card--accent-access">
        <header class="card__head">
          <div>
            <h2>Your Access</h2>
            <span class="card__sub">From your sign-in token</span>
          </div>
          <span class="card__badge" [class.card__badge--ok]="!!ctx()" [class.card__badge--neutral]="!ctx()">
            {{ ctx() ? 'AUTHENTICATED' : 'PREVIEW MODE' }}
          </span>
        </header>
        @if (ctx(); as c) {
          <ul class="kv">
            <li><span>Tenant</span><strong>{{ c.tenantId || '—' }}</strong></li>
            <li><span>Country</span><strong>{{ c.countryCode || '—' }}</strong></li>
            <li><span>Region</span><strong>{{ c.region || '—' }}</strong></li>
            <li><span>Email</span><strong>{{ c.email || '—' }}</strong></li>
          </ul>
          <div class="perm-list">
            <div class="perm-list__title">Permissions</div>
            @if (c.permissions.length === 0) {
              <span class="muted">None on this token.</span>
            } @else {
              <div class="perm-chips">
                @for (p of c.permissions; track p) {
                  <span class="chip">{{ p }}</span>
                }
              </div>
            }
          </div>
        } @else {
          <p class="muted">
            Phase 1 dev preview — Keycloak isn't running, so there's no JWT yet.
            Once you sign in (after starting the Docker stack), tenant context
            and permissions appear here.
          </p>
        }
      </article>
    </section>
  `,
  styles: [`
    /* ============================================ */
    /* Page-level: transparent so the shell's        */
    /* lavender→pink wash shows through              */
    /* ============================================ */
    :host {
      display: block;
      min-height: 100%;
      background: transparent;
    }

    /* ---- Breadcrumb ---- */
    .bc {
      font-size: 12px; color: #9A9AA3;
      margin: 0 0 12px;
    }
    .bc-sep { color: #C9C9D0; padding: 0 4px; }
    .bc span { color: #3F2D7C; font-weight: 600; }

    /* ============================================ */
    /* Hero card                                    */
    /* ============================================ */
    .hero {
      display: grid; grid-template-columns: 1fr auto; gap: 24px;
      background: #FFFFFF;
      border-radius: 16px; padding: 24px 28px;
      box-shadow: 0 4px 20px rgba(63, 45, 124, 0.08);
      border: 3px solid #1A1A33;             /* dark border, all 4 sides */
      margin-bottom: 24px;
      position: relative; overflow: hidden;
    }
    .hero::before {
      content: ''; position: absolute;
      top: 0; right: 0; width: 280px; height: 100%;
      background: linear-gradient(120deg,
        rgba(232, 226, 244, 0) 0%,
        rgba(232, 226, 244, 0.4) 60%,
        rgba(252, 221, 224, 0.3) 100%);
      pointer-events: none;
    }
    .hero__copy { position: relative; z-index: 1; }
    .hero__copy h1 {
      font-weight: 800; font-size: 28px; line-height: 36px;
      margin: 0 0 6px;
      /* color set by .brand-heading */
    }
    .hero__lede {
      color: #5C5C66; font-size: 14px; line-height: 22px;
      margin: 0 0 16px;
    }
    .hero__pills { display: flex; gap: 8px; flex-wrap: wrap; }
    .hero__art { position: relative; z-index: 1; display: flex; align-items: center; }
    .hero-cube {
      width: 88px; height: 88px;
      border-radius: 12px;
      background:
        linear-gradient(135deg, #5B3FA0 0%, #3F2D7C 100%);
      box-shadow: 0 8px 24px rgba(63, 45, 124, 0.25);
      transform: rotate(-8deg);
      position: relative;
    }
    .hero-cube::after {
      content: '⬢'; position: absolute;
      inset: 0; display: flex; align-items: center; justify-content: center;
      color: rgba(255,255,255,0.85); font-size: 38px;
    }

    /* ---- Pills ---- */
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px; border-radius: 999px;
      font-size: 11.5px; font-weight: 600;
      background: #FFFFFF; border: 1px solid #EFEFF3;
      color: #5C5C66;
    }
    .pill mat-icon { font-size: 14px; width: 14px; height: 14px; line-height: 14px; }
    /* All pills stay inside the SCMCube brand wash family — soft pastel tones */
    .pill--country { background: #E8E2F4; color: #3F2D7C; border-color: transparent; }
    .pill--ok      { background: #E8E2F4; color: #5B3FA0; border-color: transparent; }
    .pill--err     { background: #FCDDE0; color: #B23F45; border-color: transparent; }
    .pill--phase   { background: #F5DCEA; color: #8B2F6C; border-color: transparent; }

    /* ============================================ */
    /* Section heading                              */
    /* ============================================ */
    .sec-h {
      display: flex; align-items: baseline; justify-content: space-between;
      margin: 24px 4px 12px;
    }
    .sec-h h2 {
      color: #1A1A33; font-size: 16px; font-weight: 700;
      margin: 0;
    }
    .sec-h__sub { color: #9A9AA3; font-size: 12px; }

    /* ============================================ */
    /* KPI tiles — semantic per-group accents        */
    /* ============================================ */
    .tiles {
      display: grid; gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      margin-bottom: 24px;
    }
    .tile {
      position: relative;
      border-radius: 14px;
      padding: 18px; display: flex; gap: 14px; align-items: flex-start;
      cursor: pointer;
      transition: transform .12s ease, box-shadow .12s ease;
      background: var(--tile-bg, #FFFFFF);
      border: 2px solid var(--tile-border, #E0E0E8);
      box-shadow: 0 2px 8px var(--tile-shadow, rgba(63, 45, 124, 0.06));
    }
    .tile:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px var(--tile-shadow, rgba(63, 45, 124, 0.18));
    }

    .tile__icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      background: var(--tile-icon-bg, #F0EAF7);
      border: 1px solid var(--tile-icon-border, transparent);
    }
    .tile__icon mat-icon {
      color: var(--tile-icon-color, #5B3FA0);
      font-size: 22px; width: 22px; height: 22px; line-height: 22px;
    }
    .tile__body { flex: 1 1 auto; min-width: 0; }
    .tile__label {
      color: #9A9AA3; font-size: 10.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.6px;
      margin-bottom: 4px;
    }
    .tile__value {
      font-weight: 800; font-size: 26px; line-height: 32px;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
      background: linear-gradient(135deg, var(--accent-from, #3F2D7C), var(--accent-to, #5B3FA0));
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; color: transparent;
    }
    .tile__trend {
      display: inline-flex; align-items: center; gap: 4px;
      color: #9A9AA3; font-size: 11px; font-weight: 500;
    }
    .tile__trend mat-icon { font-size: 12px; width: 12px; height: 12px; line-height: 12px; }

    /*
     * 8 distinct tile palettes. Each tone defines:
     *   --tile-bg          very soft tinted card body
     *   --tile-border      visible 2px border in the tone hue
     *   --tile-shadow      tone-tinted soft shadow
     *   --tile-icon-bg     icon square background (gentle tint)
     *   --tile-icon-border subtle border around the icon square
     *   --tile-icon-color  glyph color inside the icon
     *   --accent-from/to   value-gradient text colors
     */

    /* PURPLE — primary brand */
    .tile[data-tone="purple"] {
      --tile-bg:          #FBF8FE;
      --tile-border:      #B5A6E8;
      --tile-shadow:      rgba(91, 63, 160, 0.14);
      --tile-icon-bg:     #EDE5FA;
      --tile-icon-border: #D4C2F0;
      --tile-icon-color:  #5B3FA0;
      --accent-from:      #3F2D7C; --accent-to: #7B3FCC;
    }

    /* MAGENTA — pink-purple */
    .tile[data-tone="magenta"] {
      --tile-bg:          #FDF4FA;
      --tile-border:      #E89AC9;
      --tile-shadow:      rgba(185, 59, 142, 0.16);
      --tile-icon-bg:     #FBE6F1;
      --tile-icon-border: #F1B8D9;
      --tile-icon-color:  #B93B8E;
      --accent-from:      #B93B8E; --accent-to: #E54A8A;
    }

    /* CORAL — soft red-pink */
    .tile[data-tone="coral"] {
      --tile-bg:          #FEF5F5;
      --tile-border:      #F2A8A9;
      --tile-shadow:      rgba(229, 74, 90, 0.16);
      --tile-icon-bg:     #FCE4E5;
      --tile-icon-border: #F5BBBC;
      --tile-icon-color:  #D04E54;
      --accent-from:      #D04E54; --accent-to: #EF7D7E;
    }

    /* TEAL — cool blue-green */
    .tile[data-tone="teal"] {
      --tile-bg:          #F1FAFA;
      --tile-border:      #6EC4C0;
      --tile-shadow:      rgba(13, 148, 136, 0.14);
      --tile-icon-bg:     #DEF2F0;
      --tile-icon-border: #A3D9D5;
      --tile-icon-color:  #0D9488;
      --accent-from:      #0D9488; --accent-to: #14B8A6;
    }

    /* AMBER — warm honey */
    .tile[data-tone="amber"] {
      --tile-bg:          #FEF8EE;
      --tile-border:      #E8B772;
      --tile-shadow:      rgba(212, 144, 24, 0.16);
      --tile-icon-bg:     #FAEBCD;
      --tile-icon-border: #EDCB8A;
      --tile-icon-color:  #B47A18;
      --accent-from:      #B47A18; --accent-to: #E0A22B;
    }

    /* MINT — soft green */
    .tile[data-tone="mint"] {
      --tile-bg:          #F2FAF5;
      --tile-border:      #82C9A1;
      --tile-shadow:      rgba(46, 139, 87, 0.14);
      --tile-icon-bg:     #DCF1E5;
      --tile-icon-border: #A8DCB9;
      --tile-icon-color:  #2E8B57;
      --accent-from:      #2E8B57; --accent-to: #43A06D;
    }

    /* SLATE — muted blue-grey */
    .tile[data-tone="slate"] {
      --tile-bg:          #F4F6FA;
      --tile-border:      #95A5C0;
      --tile-shadow:      rgba(107, 122, 153, 0.16);
      --tile-icon-bg:     #E1E7F1;
      --tile-icon-border: #B5C2D6;
      --tile-icon-color:  #4A5C7C;
      --accent-from:      #4A5C7C; --accent-to: #6B7A99;
    }

    /* PLUM — deep wine */
    .tile[data-tone="plum"] {
      --tile-bg:          #FAF3F7;
      --tile-border:      #B26A95;
      --tile-shadow:      rgba(138, 47, 108, 0.16);
      --tile-icon-bg:     #F3E0EC;
      --tile-icon-border: #D9A4C2;
      --tile-icon-color:  #8B2F6C;
      --accent-from:      #8B2F6C; --accent-to: #B23F8B;
    }

    /* ============================================ */
    /* Cards (System Status + Your Access)          */
    /* ============================================ */
    .grid-2 {
      display: grid; gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
    }
    .card {
      position: relative;
      background: #FFFFFF; border-radius: 12px;
      padding: 20px 22px;
      box-shadow: 0 2px 8px rgba(63, 45, 124, 0.06);
      border-top:    1px solid rgba(63, 45, 124, 0.04);
      border-bottom: 1px solid rgba(63, 45, 124, 0.04);
      border-left:   1px solid rgba(63, 45, 124, 0.04);
      border-right:  3px solid #1A1A33;          /* dark border on RIGHT only */
    }
    .card::before {
      content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%;
      border-radius: 12px 0 0 12px;
    }
    .card--accent-status::before { background: linear-gradient(180deg, #1D6FA4 0%, #0D9488 100%); }
    .card--accent-access::before { background: linear-gradient(180deg, #5B3FA0 0%, #B93B8E 100%); }

    .card__head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; margin-bottom: 14px;
    }
    .card__head h2 { color: #1A1A33; font-weight: 700; font-size: 15px; margin: 0; }
    .card__sub    { color: #9A9AA3; font-size: 12px; }
    .card__badge {
      display: inline-flex; align-items: center;
      padding: 4px 10px; border-radius: 999px;
      font-size: 10px; font-weight: 700; letter-spacing: 0.4px;
      background: #F0F0F4; color: #9A9AA3;
    }
    .card__badge--ok      { background: #E8E2F4; color: #5B3FA0; }
    .card__badge--err     { background: #FCDDE0; color: #B23F45; }
    .card__badge--neutral { background: #F5DCEA; color: #8B2F6C; }

    .muted { color: #5C5C66; font-size: 13px; line-height: 22px; margin: 0 0 4px; }
    .error { color: #D04E54; font-size: 13px; margin: 0 0 8px; font-weight: 500; }

    code {
      background: #F5F2FB; color: #3F2D7C;
      padding: 2px 6px; border-radius: 4px;
      font-family: 'JetBrains Mono', Consolas, monospace; font-size: 11.5px;
    }

    .kv { list-style: none; padding: 0; margin: 0 0 12px; }
    .kv li {
      display: flex; justify-content: space-between; gap: 12px;
      padding: 8px 0; border-bottom: 1px dashed #EFEFF3;
      font-size: 12.5px;
    }
    .kv li:last-child { border-bottom: 0; }
    .kv span { color: #5C5C66; }
    .kv strong { color: #2C2C36; font-weight: 600; word-break: break-all; text-align: right; }
    .ok { color: #2E8B57 !important; }

    .perm-list { margin-top: 12px; }
    .perm-list__title {
      color: #5C5C66; font-size: 11px; font-weight: 700;
      letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 6px;
    }
    .perm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      background: #F5F2FB; color: #3F2D7C;
      padding: 3px 10px; border-radius: 999px;
      font-size: 11px; font-weight: 600;
    }

    /* ============================================ */
    /* Responsive                                   */
    /* ============================================ */
    @media (max-width: 720px) {
      .hero { grid-template-columns: 1fr; gap: 16px; padding: 18px 20px; }
      .hero__art { order: -1; }
      .hero-cube { width: 56px; height: 56px; transform: none; }
      .hero-cube::after { font-size: 24px; }
      .hero__copy h1 { font-size: 22px; line-height: 28px; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  protected readonly tenant = inject(TenantContextService);
  private readonly http = inject(HttpClient);

  protected readonly ctx = this.tenant.ctx;
  protected readonly loading = signal(false);
  protected readonly apiHealth = signal<HealthResponse | null>(null);
  protected readonly apiError = signal<string | null>(null);

  /**
   * Phase 1 placeholder KPIs — real values land with M24 Dashboards module
   * (Phase 4). One tile per nav-group tone per the IA doc.
   */
  protected readonly tiles: Tile[] = [
    { label: 'New Leads (30d)',   value: '—', trend: 'M2 CRM — Phase 4',         icon: 'groups',               tone: 'purple',  module: 'M2'  },
    { label: 'Open Shipments',    value: '—', trend: 'M5 Forwarding — Phase 2',  icon: 'flight_takeoff',       tone: 'teal',    module: 'M5'  },
    { label: 'Customs Filings',   value: '—', trend: 'M4 CHA — Phase 2/3',       icon: 'gavel',                tone: 'amber',   module: 'M4'  },
    { label: 'Inventory On Hand', value: '—', trend: 'M8 WMS — Phase 2',         icon: 'inventory_2',          tone: 'mint',    module: 'M8'  },
    { label: 'Active Trips',      value: '—', trend: 'M13 Transport — Phase 2',  icon: 'directions_bus',       tone: 'coral',   module: 'M13' },
    { label: 'Outstanding AR',    value: '—', trend: 'M17 Accounts — Phase 2',   icon: 'account_balance',      tone: 'plum',    module: 'M17' },
    { label: 'Pending Approvals', value: '—', trend: 'M27 Notif — Phase 1',      icon: 'notifications_active', tone: 'magenta', module: 'M27' },
    { label: 'Reports Generated', value: '—', trend: 'M24 Dashboards — Phase 4', icon: 'analytics',            tone: 'slate',   module: 'M24' },
  ];

  constructor() {
    console.warn('[ulp] DashboardComponent constructed');
  }

  async ngOnInit() {
    console.warn('[ulp] DashboardComponent ngOnInit START');
    try {
      await this.tenant.load();
    } catch (err) {
      console.warn('[ulp] tenant.load() threw — ignoring in dev:', err);
    }
    this.loading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<HealthResponse>(`${environment.apiBaseUrl}/health`)
      );
      this.apiHealth.set(data);
    } catch {
      this.apiError.set(`Cannot reach API at ${environment.apiBaseUrl}`);
    } finally {
      this.loading.set(false);
      console.warn('[ulp] DashboardComponent ngOnInit DONE');
    }
  }

  firstName(): string {
    const name = this.ctx()?.username ?? this.ctx()?.email ?? '';
    if (!name) return 'there';
    const local = name.replace(/[@_.-].*$/, '');
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  welcomeSub(): string {
    const c = this.ctx();
    if (!c) return 'Phase 1 dev preview — sign in once Docker is up to see your tenant context.';
    return `You're signed in to tenant ${c.tenantId} (${c.countryCode}) on the ${c.region} region.`;
  }
}

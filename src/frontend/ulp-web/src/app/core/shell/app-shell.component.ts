import { Component, ChangeDetectionStrategy, HostListener, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CommandPaletteComponent, PaletteEntry } from './command-palette.component';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  badge?: string;
  status?: 'live' | 'soon';
  children?: NavItem[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Post-login app shell.
 *
 * Layout = white top bar + light off-white sidebar with grouped module
 * navigation + white content area with a router outlet. Brand-correct
 * light theme; purple-dominant; no dark sidebar.
 *
 * Navigation groups follow the brand's product taxonomy (the SCMCube
 * commercial product names), each mapped to one or more ULP backend
 * modules per ULP_HLD_v2.0_MultiRegion.docx §9.
 */
@Component({
  selector: 'ulp-app-shell',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive, RouterOutlet,
    MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule,
    CommandPaletteComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="topbar__left">
        <button mat-icon-button class="topbar__menu" (click)="toggleSidebar()" matTooltip="Toggle menu">
          <mat-icon>menu</mat-icon>
        </button>
        <a routerLink="/app" class="brand">
          <img class="brand__logo"
               src="assets/brand/logo-color.jpg"
               alt="SCM CUBE"
               (error)="onLogoMissing($event)" />
          <span class="brand__fallback" [class.brand__fallback--show]="logoMissing">
            <strong>SCM&nbsp;&nbsp;CUBE</strong>
          </span>
        </a>
      </div>

      <div class="topbar__right">
        <button mat-icon-button matTooltip="Search (Ctrl+K)" (click)="paletteOpen.set(true)">
          <mat-icon>search</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Notifications">
          <mat-icon>notifications_none</mat-icon>
        </button>

        <button mat-button [matMenuTriggerFor]="userMenu" class="user-chip">
          <span class="user-chip__avatar">{{ userInitials() }}</span>
          <span class="user-chip__meta">
            <span class="user-chip__name">{{ ctx()?.username || 'Sign in' }}</span>
            <span class="user-chip__sub">{{ tenantSummary() }}</span>
          </span>
          <mat-icon>arrow_drop_down</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <div class="usermenu-head">
            <div class="usermenu-head__name">{{ ctx()?.username }}</div>
            <div class="usermenu-head__sub">{{ ctx()?.email }}</div>
          </div>
          <button mat-menu-item disabled>
            <mat-icon>business</mat-icon>
            <span>Tenant: {{ ctx()?.tenantId || '—' }}</span>
          </button>
          <button mat-menu-item disabled>
            <mat-icon>public</mat-icon>
            <span>Region: {{ ctx()?.region || '—' }} ({{ ctx()?.countryCode || '—' }})</span>
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Sign out</span>
          </button>
        </mat-menu>
      </div>
    </header>

    <div class="shell" [class.shell--collapsed]="sidebarCollapsed()">
      <aside class="sidebar" aria-label="Main navigation">
        <a routerLink="/app/dashboard"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{exact: true}"
           class="nav-item nav-item--top">
          <mat-icon>dashboard</mat-icon>
          <span class="nav-item__label">Dashboard</span>
        </a>

        @for (group of navGroups; track group.title) {
          <div class="nav-group">
            <div class="nav-group__title">{{ group.title }}</div>
            @for (item of group.items; track item.label) {
              @if (item.children?.length) {
                <details class="nav-collapsible">
                  <summary class="nav-item nav-item--summary">
                    <mat-icon>{{ item.icon }}</mat-icon>
                    <span class="nav-item__label">{{ item.label }}</span>
                    @if (item.badge) {
                      <span class="badge badge--{{ item.badge }}">{{ item.badge }}</span>
                    }
                    <mat-icon class="nav-item__chev">expand_more</mat-icon>
                  </summary>
                  <div class="nav-children">
                    @for (child of item.children!; track child.label) {
                      <a class="nav-item nav-item--child"
                         [class.nav-item--soon]="child.status === 'soon'"
                         [routerLink]="child.route ? child.route : null"
                         routerLinkActive="active">
                        <span class="nav-item__dot"></span>
                        <span class="nav-item__label">{{ child.label }}</span>
                        @if (child.badge) {
                          <span class="badge badge--{{ child.badge }}">{{ child.badge }}</span>
                        }
                      </a>
                    }
                  </div>
                </details>
              } @else {
                <a class="nav-item"
                   [class.nav-item--soon]="item.status === 'soon'"
                   [routerLink]="item.route ? item.route : null"
                   routerLinkActive="active">
                  <mat-icon>{{ item.icon }}</mat-icon>
                  <span class="nav-item__label">{{ item.label }}</span>
                  @if (item.badge) {
                    <span class="badge badge--{{ item.badge }}">{{ item.badge }}</span>
                  }
                </a>
              }
            }
          </div>
        }

        <div class="sidebar__spacer"></div>

        <a class="nav-item nav-item--footer">
          <mat-icon>help_outline</mat-icon>
          <span class="nav-item__label">Help &amp; Support</span>
        </a>
        <button class="nav-item nav-item--footer nav-item--button" (click)="logout()">
          <mat-icon>logout</mat-icon>
          <span class="nav-item__label">Sign out</span>
        </button>
      </aside>

      <main class="content">
        <div class="content-card">
          <router-outlet />
        </div>
      </main>
    </div>

    <ulp-command-palette
      [open]="paletteOpen()"
      [entries]="paletteEntries()"
      (closed)="paletteOpen.set(false)" />
  `,
  styles: [`
    :host { display: block; height: 100vh; background: #F8F8FA; }

    .topbar {
      height: 60px;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 16px 0 12px;
      background: #FFFFFF;
      border-bottom: 1px solid #EFEFF3;
      position: sticky; top: 0; z-index: 20;
    }
    .topbar__left { display: flex; align-items: center; gap: 8px; }
    .topbar__right { display: flex; align-items: center; gap: 4px; }
    .topbar__menu { color: #5C5C66 !important; }

    .brand { display: inline-flex; align-items: center; text-decoration: none; padding-left: 4px; }
    .brand__logo { height: 36px; width: auto; display: block; }
    .brand__fallback { display: none; }
    .brand__fallback--show { display: inline-flex; }
    .brand__fallback strong { color: #3F2D7C; font-weight: 800; font-size: 18px; letter-spacing: 0.5px; }

    .user-chip {
      display: inline-flex !important; align-items: center; gap: 8px;
      padding: 4px 8px 4px 4px !important; border-radius: 999px !important;
      color: #2C2C36 !important;
    }
    .user-chip__avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #5B3FA0 0%, #3F2D7C 100%);
      color: #FFFFFF; font-weight: 700; font-size: 13px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .user-chip__meta { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.1; }
    .user-chip__name { color: #2C2C36; font-weight: 600; font-size: 13px; }
    .user-chip__sub { color: #9A9AA3; font-size: 11px; font-weight: 500; }

    .usermenu-head { padding: 12px 16px; border-bottom: 1px solid #EFEFF3; }
    .usermenu-head__name { color: #1A1A33; font-weight: 700; font-size: 14px; }
    .usermenu-head__sub { color: #9A9AA3; font-size: 12px; margin-top: 2px; }

    .shell {
      display: grid;
      grid-template-columns: 280px 1fr;
      min-height: calc(100vh - 60px);
      transition: grid-template-columns .2s ease;
    }
    .shell--collapsed { grid-template-columns: 60px 1fr; }

    .sidebar {
      /* White surface; deep-purple text; thin lavender right border */
      background: #FFFFFF;
      border-right: 1px solid #C9BEEC;
      padding: 16px 8px;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex; flex-direction: column;
      min-height: calc(100vh - 60px);
      gap: 2px;
    }
    /* Every label stays on a single line — never wraps, never causes overflow */
    .sidebar .nav-item__label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;        /* defence — at 280px this should never trigger */
      flex: 1 1 auto;
      min-width: 0;
    }
    .shell--collapsed .sidebar .nav-item__label,
    .shell--collapsed .sidebar .nav-group__title,
    .shell--collapsed .sidebar .badge,
    .shell--collapsed .sidebar .nav-item__chev,
    .shell--collapsed .sidebar .nav-children { display: none; }
    .shell--collapsed .sidebar .nav-item { justify-content: center; padding: 12px; }

    /* Group separator — thin lavender line above every group except the first */
    .nav-group {
      padding: 6px 0;
      border-top: 1px solid #E8E2F4;
      margin-top: 8px;
    }
    .nav-group:first-of-type {
      border-top: none;
      margin-top: 0;
    }

    /* Group titles use the same magenta→violet brand gradient as page H1s */
    .nav-group__title {
      font-size: 11px; font-weight: 800; letter-spacing: 1.4px;
      text-transform: uppercase;
      padding: 16px 18px 8px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }

    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px;
      margin: 0 4px;
      color: #3F2D7C; font-size: 14px; font-weight: 500;
      text-decoration: none; cursor: pointer;
      border: none; border-radius: 10px;
      background: transparent;
      width: calc(100% - 8px); text-align: left;
      transition: background .14s ease, color .14s ease, box-shadow .14s ease;
    }
    .nav-item--button { font-family: inherit; }
    .nav-item:hover { background: #F5F2FB; color: #3F2D7C; }
    .nav-item.active {
      background: #E8E2F4;
      color: #3F2D7C; font-weight: 600;
      box-shadow: 0 2px 8px rgba(63, 45, 124, 0.10);
    }
    .nav-item.active mat-icon { color: #5B3FA0; }
    .nav-item mat-icon {
      color: #5B3FA0; font-size: 20px; width: 20px; height: 20px; line-height: 20px;
    }
    .nav-item__label { flex: 1 1 auto; }
    .nav-item__chev { transition: transform .15s ease; }
    .nav-item--summary { list-style: none; }
    .nav-item--summary::-webkit-details-marker { display: none; }
    details[open] > .nav-item--summary .nav-item__chev { transform: rotate(180deg); }
    .nav-item--soon { opacity: 0.55; cursor: not-allowed; }
    .nav-item--top { margin-top: 4px; }

    .nav-children { padding: 2px 0 6px; background: transparent; }
    .nav-item--child {
      padding: 6px 12px 6px 44px; font-size: 12.5px; gap: 8px;
      color: #6B5BA0;          /* lighter lavender for hierarchy */
      font-weight: 500;
    }
    .nav-item--child:hover { color: #3F2D7C; background: #F5F2FB; }
    .nav-item--child .nav-item__dot {
      width: 4px; height: 4px; border-radius: 50%;
      background: #B5A6D9; flex: 0 0 auto;
    }
    .nav-item--child:hover .nav-item__dot,
    .nav-item--child.active .nav-item__dot { background: #5B3FA0; }

    .badge {
      display: inline-flex; align-items: center;
      padding: 2px 6px; border-radius: 999px;
      font-size: 9.5px; font-weight: 700; letter-spacing: 0.3px;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    /* All badge tones stay inside the SCMCube brand family */
    .badge--new  { background: #FCDDE0; color: #B23F45; }   /* soft pink */
    .badge--ext  { background: #E8E2F4; color: #3F2D7C; }   /* lavender */
    .badge--soon { background: #F0F0F4; color: #9A9AA3; }   /* neutral grey — preview/disabled */

    .sidebar__spacer { flex: 1 1 auto; }
    .nav-item--footer { color: #5C5C66; }

    /* Main content area — lavender→pink wash from the login page */
    .content {
      padding: 0;
      background:
        radial-gradient(ellipse 60% 70% at 5% 10%, rgba(91, 63, 160, 0.10) 0%, rgba(91, 63, 160, 0) 60%),
        radial-gradient(ellipse 60% 70% at 95% 90%, rgba(239, 125, 126, 0.08) 0%, rgba(239, 125, 126, 0) 60%),
        linear-gradient(95deg, #E8DEF5 0%, #EDDCF3 30%, #F0DCEE 50%, #F5DCEA 75%, #FCDDE0 100%);
      min-height: calc(100vh - 60px);
    }
    /* Inner content card — generous frame so the lavender→pink wash
       shows clearly on all four sides (~50px frame). */
    .content-card {
      background:
        radial-gradient(ellipse 60% 70% at 5% 10%, rgba(91, 63, 160, 0.04) 0%, rgba(91, 63, 160, 0) 60%),
        #FFFFFF;
      border-radius: 24px;
      padding: 32px 36px;
      margin: 48px 56px;
      min-height: calc(100vh - 60px - 96px);
      box-shadow: 0 12px 40px rgba(63, 45, 124, 0.14);
      border: 1px solid rgba(63, 45, 124, 0.06);   /* subtle, no dark border */
    }

    @media (max-width: 900px) {
      .shell { grid-template-columns: 60px 1fr; }
      .shell .sidebar .nav-item__label,
      .shell .sidebar .nav-group__title,
      .shell .sidebar .badge,
      .shell .sidebar .nav-item__chev,
      .shell .sidebar .nav-children { display: none; }
      .shell .sidebar .nav-item { justify-content: center; padding: 12px; }
      .content { padding: 16px; }
      .user-chip__meta { display: none; }
    }
  `],
})
export class AppShellComponent implements OnInit {
  private readonly tenant = inject(TenantContextService);
  protected readonly ctx = this.tenant.ctx;

  protected logoMissing = false;
  protected sidebarCollapsed = signal(false);

  /** Global Ctrl+K command palette state. */
  protected paletteOpen = signal(false);

  /** Flattened, navigable entries derived from `navGroups`. Live-only. */
  protected paletteEntries = computed<PaletteEntry[]>(() => this.flattenNav());

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent) {
    // Ctrl+K (or Cmd+K on macOS) toggles the palette from anywhere.
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      this.paletteOpen.update(v => !v);
    }
  }

  private flattenNav(): PaletteEntry[] {
    const out: PaletteEntry[] = [];
    // Always include Dashboard as first searchable entry.
    out.push({ label: 'Dashboard', group: 'Home', route: '/app/dashboard', icon: 'dashboard' });
    for (const g of this.navGroups) {
      for (const item of g.items) {
        if (item.children?.length) {
          for (const child of item.children) {
            if (child.status !== 'soon' && child.route) {
              out.push({ label: child.label, group: g.title, parent: item.label, route: child.route, icon: item.icon });
            }
          }
        } else if (item.status !== 'soon' && item.route) {
          out.push({ label: item.label, group: g.title, route: item.route, icon: item.icon });
        }
      }
    }
    return out;
  }

  /**
   * Navigation taxonomy — Customer-first, then operations, then back-office.
   *
   * Order rationale (per Shankar 2026-05-02): every workflow starts with
   * the customer (CRM/Sales). After customer engagement, freight operations
   * happen, then compliance is filed, then logistics moves the goods, then
   * visibility tracks the lifecycle, then finance closes the books, then
   * management runs reports / HR / settings.
   *
   * Brand product names (FreightCube, ImpexCube, etc.) surface as the
   * primary labels; each maps to one or more ULP backend modules
   * (per ULP_HLD_v2.0_MultiRegion.docx §9). Items currently `status:'soon'`
   * — they go live as their backend module ships.
   */
  protected readonly navGroups: NavGroup[] = [
    {
      title: 'Commercial',
      items: [
        {
          label: 'Pricing & Quotation', icon: 'request_quote',
          children: [
            { label: 'Rate cards',          icon: '', route: '/app/pricing-quotation/rate-cards', status: 'live' },
            { label: 'Quotations',          icon: '', route: '/app/pricing-quotation/quotes',     status: 'live' },
            { label: 'Surcharges',          icon: '', route: '/app/pricing-quotation/surcharges', status: 'live' },
            { label: 'Customer contracts',  icon: '', route: '/app/pricing-quotation/contracts',  status: 'live' },
          ],
        },
        {
          label: 'CRM & Sales', icon: 'groups',
          children: [
            { label: 'Leads',               icon: '', route: '/app/sales/leads',         status: 'live' },
            { label: 'Opportunities',       icon: '', route: '/app/sales/opportunities', status: 'live' },
            { label: 'Activities',          icon: '', route: '/app/sales/activities',    status: 'live' },
            { label: 'Campaigns',           icon: '', route: '/app/sales/campaigns',     status: 'live' },
            { label: 'RFQs',                icon: '', route: '/app/sales/rfqs',          status: 'live' },
            { label: 'Pipeline stages',     icon: '', route: '/app/sales/pipeline',      status: 'live' },
          ],
        },
        { label: 'Vendor management', icon: 'store', route: '/app/vendor-management', status: 'live' },
        {
          label: 'Procurement', icon: 'shopping_cart',
          children: [
            { label: 'Purchase requests',  icon: '', route: '/app/procurement/purchase-requests', status: 'live' },
            { label: 'Vendor RFQs',        icon: '', route: '/app/procurement/rfqs',              status: 'live' },
            { label: 'Purchase orders',    icon: '', route: '/app/procurement/purchase-orders',   status: 'live' },
            { label: 'Goods receipts',     icon: '', route: '/app/procurement/grns',              status: 'live' },
            { label: 'Invoice matching',   icon: '', route: '/app/procurement/invoice-matches',   status: 'live' },
          ],
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          label: 'FreightCube · Forwarding', icon: 'flight_takeoff',
          children: [
            { label: 'Bookings',                        icon: '', route: '/app/freight-forwarding/bookings',  status: 'live' },
            { label: 'Shipments',                       icon: '', route: '/app/freight-forwarding/shipments', status: 'live' },
            { label: 'Consolidations',                  icon: '', route: '/app/freight-forwarding/consols',   status: 'live' },
            { label: 'Demurrage / detention',           icon: '', route: '/app/freight-forwarding/demurrage', status: 'live' },
            { label: 'Job management',                  icon: '', status: 'soon' },
            { label: 'Container survey',                icon: '', status: 'soon' },
          ],
        },
        {
          label: 'Last-Mile Delivery', icon: 'local_shipping',
          children: [
            { label: 'Courier bookings',    icon: '', route: '/app/last-mile/bookings',    status: 'live' },
            { label: 'Routes',              icon: '', route: '/app/last-mile/routes',      status: 'live' },
            { label: 'Manifests',           icon: '', route: '/app/last-mile/manifests',   status: 'live' },
            { label: 'Proofs of delivery',  icon: '', route: '/app/last-mile/pods',        status: 'live' },
            { label: 'COD collections',     icon: '', route: '/app/last-mile/cod',         status: 'live' },
            { label: 'Zone rates',          icon: '', route: '/app/last-mile/zone-rates',  status: 'live' },
          ],
        },
        {
          label: 'Consolidation (CGM / LCL)', icon: 'view_module', status: 'soon',
          children: [
            { label: 'Air consol manifest',  icon: '', status: 'soon' },
            { label: 'Sea consol (LCL)',     icon: '', status: 'soon' },
            { label: 'Consol agent master',  icon: '', status: 'soon' },
            { label: 'IGM — land, transport',icon: '', status: 'soon' },
            { label: 'SCMTR filing',         icon: '', status: 'soon' },
          ],
        },
      ],
    },
    {
      title: 'Compliance',
      items: [
        {
          label: 'ImpexCube · US Customs (CBP/ABI)', icon: 'gavel', status: 'live',
          children: [
            { label: 'Entries (7501)',              icon: '', route: '/app/customs/entries',        status: 'live' },
            { label: 'Holds & Exams',               icon: '', route: '/app/customs/holds',          status: 'live' },
            { label: 'ATM / POA',                   icon: '', route: '/app/customs/atm',            status: 'live' },
            { label: 'Release Orders',              icon: '', route: '/app/customs/release-orders', status: 'live' },
            { label: 'ISF (10+2)',                  icon: '', route: '/app/customs/isf',            status: 'live' },
            { label: 'In-Bond Moves',               icon: '', route: '/app/customs/in-bond',        status: 'live' },
            { label: 'Bonds',                       icon: '', route: '/app/customs/bonds',          status: 'live' },
            { label: 'ABI Messages',                icon: '', route: '/app/customs/abi-messages',   status: 'live' },
          ],
        },
        {
          label: 'EximCube · Trade Programs', icon: 'public', status: 'soon',
          children: [
            { label: 'HS code lookup & tariff',     icon: '', status: 'soon' },
            { label: 'Trade data intelligence',     icon: '', status: 'soon' },
            { label: 'Restricted party screening',  icon: '', status: 'soon' },
            { label: 'Compliance alerts',           icon: '', status: 'soon' },
          ],
        },
      ],
    },
    {
      title: 'Logistics',
      items: [
        {
          label: 'TMSCube · Transport', icon: 'directions_bus', status: 'soon',
          children: [
            { label: 'LR booking & creation',       icon: '', status: 'soon' },
            { label: 'Trip start / close',          icon: '', status: 'soon' },
            { label: 'Delivery running sheet',      icon: '', status: 'soon' },
            { label: 'Proof of delivery',           icon: '', status: 'soon' },
            { label: 'Transport invoice & reports', icon: '', status: 'soon' },
          ],
        },
        { label: 'Fleet Management', icon: 'commute', status: 'soon' },
        {
          label: 'WMSCube · Warehouse', icon: 'warehouse', status: 'soon',
          children: [
            { label: 'Inbound & GRN',          icon: '', status: 'soon' },
            { label: 'Storage & bins',         icon: '', status: 'soon' },
            { label: 'Inventory control',      icon: '', status: 'soon' },
            { label: 'Bonded warehouse',       icon: '', status: 'soon' },
            { label: 'Outbound dispatch',      icon: '', status: 'soon' },
            { label: 'Billing & reports',      icon: '', status: 'soon' },
          ],
        },
      ],
    },
    {
      title: 'Visibility',
      items: [
        { label: 'Control Tower', icon: 'travel_explore', route: '/app/control-tower', status: 'live' },
        { label: 'Reminders',     icon: 'notifications_active', route: '/app/freight-forwarding/reminders', status: 'live' },
        {
          label: 'Tracking & Documents', icon: 'subject',
          children: [
            { label: 'Stage milestone tracker',    icon: '', status: 'soon' },
            { label: 'Stage update & status',      icon: '', status: 'soon' },
            { label: 'DMS — document management',  icon: '', route: '/app/document-management', status: 'live' },
            { label: 'Landed cost',                icon: '', status: 'soon' },
            { label: 'Stage status reports',       icon: '', status: 'soon' },
          ],
        },
        {
          label: 'Doc generation', icon: 'description',
          children: [
            { label: 'Templates',          icon: '', route: '/app/document-generation/templates',   status: 'live' },
            { label: 'Render test',        icon: '', route: '/app/document-generation/render-test', status: 'live' },
            { label: 'Render history',     icon: '', route: '/app/document-generation/history',     status: 'live' },
          ],
        },
        { label: 'Notifications inbox', icon: 'notifications', route: '/app/notifications/inbox', status: 'live' },
      ],
    },
    {
      title: 'Finance',
      items: [
        {
          label: 'FACube · Finance', icon: 'account_balance', status: 'live',
          children: [
            { label: 'AR · Invoices',             icon: '', route: '/app/accounting/invoices',  status: 'live' },
            { label: 'AP · Vendor bills',         icon: '', route: '/app/accounting/bills',     status: 'live' },
            { label: 'Receipts (AR)',             icon: '', route: '/app/accounting/receipts',  status: 'live' },
            { label: 'Payments (AP)',             icon: '', route: '/app/accounting/payments',  status: 'live' },
            { label: 'A/R ↔ A/P Settlement',      icon: '', route: '/app/accounting/settlement',status: 'live' },
            { label: 'Banking & Reconciliation',  icon: '', route: '/app/accounting/banking',   status: 'live' },
            { label: 'Past-Due Notices',          icon: '', route: '/app/accounting/past-due',  status: 'live' },
            { label: 'General Expense',           icon: '', route: '/app/accounting/general-expense', status: 'live' },
            { label: 'Periods & close',           icon: '', route: '/app/accounting/periods',   status: 'live' },
            { label: 'Chart of accounts',         icon: '', route: '/app/accounting/accounts',  status: 'live' },
            { label: 'Reports (TB · P&L · BS · Aging)', icon: '', route: '/app/accounting/reports', status: 'live' },
            { label: 'Comparative Profit by Year',icon: '', route: '/app/accounting/comparative-profit', status: 'live' },
            { label: 'Email Templates',           icon: '', route: '/app/accounting/email-templates',   status: 'live' },
          ],
        },
      ],
    },
    {
      title: 'Management',
      items: [
        {
          label: 'Reports & Analytics', icon: 'analytics', status: 'soon',
          children: [
            { label: 'Register reports',          icon: '', status: 'soon' },
            { label: 'Financial statements',      icon: '', status: 'soon' },
            { label: 'MIS & dashboards',          icon: '', status: 'soon' },
            { label: 'BI & analytics',            icon: '', status: 'soon' },
            { label: 'GSTR / TDS statutory',      icon: '', status: 'soon' },
          ],
        },
        {
          label: 'HRMS', icon: 'badge', status: 'soon',
          children: [
            { label: 'Employee master',           icon: '', status: 'soon' },
            { label: 'Attendance & leave',        icon: '', status: 'soon' },
            { label: 'Payroll processing',        icon: '', status: 'soon' },
            { label: 'Performance management',    icon: '', status: 'soon' },
            { label: 'HR reports',                icon: '', status: 'soon' },
          ],
        },
        {
          label: 'Settings', icon: 'settings',
          children: [
            { label: 'Master data',                  icon: '', route: '/app/master-data', status: 'live' },
            { label: 'User management & roles',      icon: '', route: '/app/identity', status: 'live' },
            { label: 'Notification preferences',     icon: '', route: '/app/notifications/preferences', status: 'live' },
            { label: 'Auto-notification rules',      icon: '', route: '/app/notifications/rules',       status: 'live' },
            { label: 'System tools & audit',         icon: '', status: 'soon' },
          ],
        },
      ],
    },
  ];

  constructor() {
    console.warn('[ulp] AppShellComponent constructed');
  }

  async ngOnInit() {
    console.warn('[ulp] AppShellComponent ngOnInit START');
    try {
      await this.tenant.load();
    } catch (err) {
      console.warn('[ulp] tenant.load() threw — ignoring in dev:', err);
    }
    console.warn('[ulp] AppShellComponent ngOnInit DONE');
  }

  toggleSidebar() {
    this.sidebarCollapsed.update((c) => !c);
  }

  userInitials(): string {
    const name = this.ctx()?.username ?? this.ctx()?.email ?? '';
    if (!name) return '?';
    const part = name.replace(/[._@-].*$/, '').slice(0, 2).toUpperCase();
    return part || '?';
  }

  tenantSummary(): string {
    const c = this.ctx();
    if (!c) return 'Not signed in';
    return `Tenant ${c.tenantId} · ${c.countryCode}`;
  }

  onLogoMissing(event: Event) {
    this.logoMissing = true;
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  logout() {
    void this.tenant.logout();
  }
}

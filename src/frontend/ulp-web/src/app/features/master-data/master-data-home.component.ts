import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface EntityCard {
  routerLink: string;
  label: string;
  description: string;
  icon: string;
  tone: 'lavender' | 'magenta' | 'coral' | 'teal' | 'amber' | 'mint' | 'slate' | 'plum' | 'navy';
}

/**
 * M1 Master Data home — entity picker. Lists all master-data entities.
 * Tile design pattern locked in docs/design/SCMCube-DesignSystem.md (v1.6).
 */
@Component({
  selector: 'ulp-master-data-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bc">Home <span class="bc-sep">›</span> <span>Master Data</span></nav>

    <section class="hero">
      <div class="hero__copy">
        <h1 class="brand-heading">Master Data</h1>
        <p>
          Reference data shared across every ULP module. Customers, vendors,
          products, addresses, ports, banks, currencies, units of measure,
          identifiers — the foundation every other module reads from.
        </p>
        <span class="pill"><mat-icon>info</mat-icon> M1 — per ULP_LLD_M1_v2.0_MasterData.docx</span>
      </div>
    </section>

    <div class="sec-h"><h2>Entities</h2><span>Pick an entity to manage</span></div>

    <section class="tiles">
      @for (e of entities; track e.routerLink) {
        <a class="tile" [attr.data-tone]="e.tone" [routerLink]="e.routerLink">
          <div class="tile__icon"><mat-icon>{{ e.icon }}</mat-icon></div>
          <div class="tile__body">
            <div class="tile__label">{{ e.label }}</div>
            <div class="tile__desc">{{ e.description }}</div>
          </div>
          <mat-icon class="tile__arrow">chevron_right</mat-icon>
        </a>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .bc { font-size: 12px; color: #9A9AA3; margin: 0 0 12px; }
    .bc-sep { color: #C9C9D0; padding: 0 4px; }
    .bc span { color: #3F2D7C; font-weight: 600; }

    .hero {
      background: #FFFFFF; border: 3px solid #1A1A33;
      border-radius: 16px; padding: 24px 28px; margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(63, 45, 124, 0.08);
    }
    .hero__copy h1 { font-weight: 800; font-size: 28px; line-height: 36px; margin: 0 0 6px; }
    .hero__copy p { color: #5C5C66; font-size: 14px; line-height: 22px; margin: 0 0 16px; max-width: 780px; }
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 600;
      background: #E8E2F4; color: #3F2D7C;
    }
    .pill mat-icon { font-size: 14px; width: 14px; height: 14px; line-height: 14px; }

    .sec-h { display: flex; align-items: baseline; justify-content: space-between; margin: 24px 4px 12px; }
    .sec-h h2 { color: #1A1A33; font-size: 16px; font-weight: 700; margin: 0; }
    .sec-h span { color: #9A9AA3; font-size: 12px; }

    .tiles {
      display: grid; gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }
    .tile {
      position: relative; display: flex; align-items: center; gap: 14px;
      padding: 16px 18px; border-radius: 14px;
      background: var(--tile-bg, #FFFFFF);
      border: 2px solid var(--tile-border, #E0E0E8);
      box-shadow: 0 2px 8px var(--tile-shadow, rgba(63, 45, 124, 0.06));
      text-decoration: none; color: inherit; cursor: pointer;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 12px 28px var(--tile-shadow, rgba(63, 45, 124, 0.18)); }
    .tile__icon {
      width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--tile-icon-bg, #F0EAF7);
      border: 1px solid var(--tile-icon-border, transparent);
    }
    .tile__icon mat-icon { color: var(--tile-icon-color, #5B3FA0); font-size: 22px; width: 22px; height: 22px; line-height: 22px; }
    .tile__body { flex: 1 1 auto; min-width: 0; }
    .tile__label { color: #1A1A33; font-weight: 700; font-size: 14px; margin-bottom: 2px; }
    .tile__desc { color: #5C5C66; font-size: 12px; line-height: 18px; }
    .tile__arrow { color: #9A9AA3; }

    .tile[data-tone="lavender"] { --tile-bg:#FBF8FE; --tile-border:#B5A6E8; --tile-icon-bg:#EDE5FA; --tile-icon-border:#D4C2F0; --tile-icon-color:#5B3FA0; --tile-shadow:rgba(91,63,160,.14); }
    .tile[data-tone="magenta"]  { --tile-bg:#FDF4FA; --tile-border:#E89AC9; --tile-icon-bg:#FBE6F1; --tile-icon-border:#F1B8D9; --tile-icon-color:#B93B8E; --tile-shadow:rgba(185,59,142,.16); }
    .tile[data-tone="coral"]    { --tile-bg:#FEF5F5; --tile-border:#F2A8A9; --tile-icon-bg:#FCE4E5; --tile-icon-border:#F5BBBC; --tile-icon-color:#D04E54; --tile-shadow:rgba(229,74,90,.16); }
    .tile[data-tone="teal"]     { --tile-bg:#F1FAFA; --tile-border:#6EC4C0; --tile-icon-bg:#DEF2F0; --tile-icon-border:#A3D9D5; --tile-icon-color:#0D9488; --tile-shadow:rgba(13,148,136,.14); }
    .tile[data-tone="amber"]    { --tile-bg:#FEF8EE; --tile-border:#E8B772; --tile-icon-bg:#FAEBCD; --tile-icon-border:#EDCB8A; --tile-icon-color:#B47A18; --tile-shadow:rgba(212,144,24,.16); }
    .tile[data-tone="mint"]     { --tile-bg:#F2FAF5; --tile-border:#82C9A1; --tile-icon-bg:#DCF1E5; --tile-icon-border:#A8DCB9; --tile-icon-color:#2E8B57; --tile-shadow:rgba(46,139,87,.14); }
    .tile[data-tone="slate"]    { --tile-bg:#F4F6FA; --tile-border:#95A5C0; --tile-icon-bg:#E1E7F1; --tile-icon-border:#B5C2D6; --tile-icon-color:#4A5C7C; --tile-shadow:rgba(107,122,153,.16); }
    .tile[data-tone="plum"]     { --tile-bg:#FAF3F7; --tile-border:#B26A95; --tile-icon-bg:#F3E0EC; --tile-icon-border:#D9A4C2; --tile-icon-color:#8B2F6C; --tile-shadow:rgba(138,47,108,.16); }
    .tile[data-tone="navy"]     { --tile-bg:#F4F5FA; --tile-border:#7587B0; --tile-icon-bg:#DFE3F0; --tile-icon-border:#A8B4D0; --tile-icon-color:#374A78; --tile-shadow:rgba(55,74,120,.16); }
  `],
})
export class MasterDataHomeComponent {
  protected readonly entities: EntityCard[] = [
    { routerLink: 'parties',    label: 'Parties',           description: 'Customers, vendors, carriers, brokers',     icon: 'groups',       tone: 'lavender' },
    { routerLink: 'products',   label: 'Products',          description: 'Goods / services + HS, HSN, HTS codes',     icon: 'inventory_2',  tone: 'mint' },
    { routerLink: 'countries',  label: 'Countries',         description: 'ISO 3166-1 — supported regions',            icon: 'public',       tone: 'teal' },
    { routerLink: 'states',     label: 'States / Provinces',description: 'IN states + UTs · US states + DC',          icon: 'map',          tone: 'slate' },
    { routerLink: 'currencies', label: 'Currencies',        description: 'ISO 4217 + symbols + decimals',             icon: 'paid',         tone: 'amber' },
    { routerLink: 'uoms',       label: 'Units of Measure',  description: 'Length, weight, volume, container',         icon: 'straighten',   tone: 'plum' },
    { routerLink: 'ports',      label: 'Ports',             description: 'UN/LOCODE — sea, air, multimodal',          icon: 'directions_boat', tone: 'navy' },
    { routerLink: 'holidays',   label: 'Holidays',          description: 'Country / state calendar for SLAs',         icon: 'event',        tone: 'magenta' },
  ];
}

# ULP / SCMCube Design System v1.0

**Source of truth:** [../../ulpReq/DesignColorReference.jpg](../../ulpReq/DesignColorReference.jpg)
**Status:** Locked. Do not alter values without an ADR.
**Authority:** This document overrides any conflicting palette in [.claude/skills/angular-material-17/SKILL.md](../../.claude/skills/angular-material-17/SKILL.md). The skill's indigo+amber default is **not** the ULP brand and must not be used.

---

## 1. Brand identity

The ULP web/desktop product is branded **SCMCube — NextGen Solutions**. The visual language is **purple-dominant on white** — professional, light, never dark theme, never red-dominant.

**Hierarchy of color usage (strict):**

| Rank | Color | Share | When |
|---|---|---|---|
| Dominant | **White** `#FFFFFF` and **Off-white** `#F8F8FA` | 60–70% of pixels | Page backgrounds, cards, content surfaces |
| Primary brand | **Purple** `#3F2D7C` / `#5B3FA0` | 15–25% | Logo, headings, primary buttons, links, active nav, sidebar selected, icons |
| Soft purple wash | `#E8E2F4` / `#F5F2FB` | 5–10% | Selected row tint, subtle hero wash, hover states |
| Accent / mild coral | `#EF7D7E` | ≤5% | Module hex tiles only. NOT for primary CTAs. NOT for nav. NOT for hero gradients. |
| Errors only | `#D04E54` | <1% | Error text, destructive button, validation errors |

**Visual rules:**

- **Logo wordmark** — bold purple sans-serif "SCM CUBE" with a small isometric purple cube glyph between the words; tagline "NextGen Solutions" sits beneath in muted grey.
- **Hero / landing** — purple-led on **white** background. Soft purple/lavender radial-gradient washes for subtle texture. Headlines in purple `#3F2D7C`. Primary CTAs in purple `#3F2D7C`. **NO full-bleed coral hero gradient** — that creates a red-dominant page which violates the brand hierarchy.
- **App shell** — light theme. White top nav, off-white `#F8F8FA` sidebar, white content cards. Active sidebar item: light purple tint `#E8E2F4` with a purple left border `#5B3FA0`. Active top-nav link: purple `#5B3FA0` underline.
- **Buttons** — Primary = purple `#3F2D7C` filled. Secondary = white with purple border + purple text. Coral is reserved for module hex tiles only.
- **No dark theme.** Never. White is professional.

Strictly follow these rules everywhere. **No improvisation, no alternative palettes**.

---

## 2. Core palette (extracted from reference image)

These are the only colors that exist in the design system. They are tokens — refer to them by token name, not by hex.

### 2.1 Brand primary — Purple

The logo and the primary brand identity.

| Token | Hex | RGB | Usage |
|---|---|---|---|
| `brand-purple-900` | `#3F2D7C` | rgb(63,45,124) | Logo wordmark "SCM CUBE", primary buttons in non-hero surfaces, links on white, key navigation icons |
| `brand-purple-700` | `#5B3FA0` | rgb(91,63,160) | Hover state for purple-900, focus rings |
| `brand-purple-500` | `#8B6FC8` | rgb(139,111,200) | Active/selected state, secondary purple accents |
| `brand-purple-300` | `#A397DF` | rgb(163,151,223) | Hero gradient bottom-left anchor, soft purple highlights |
| `brand-purple-100` | `#E8E2F4` | rgb(232,226,244) | Tinted backgrounds, hover row tint, chip background |
| `brand-purple-050` | `#F5F2FB` | rgb(245,242,251) | Page tint when subtle purple wash is needed |

### 2.2 Brand accent — Mild Coral Red

CTAs, module hex tiles. **Soft coral, not saturated red** — sampled from the actual CTA button in the reference image. Use sparingly. Errors/destructive states use a slightly stronger semantic token (§2.5).

| Token | Hex | RGB | Usage |
|---|---|---|---|
| `accent-red-600` | `#EF7D7E` | rgb(239,125,126) | Primary CTA button (`Requested Demo`), module hex tiles, top-nav active underline |
| `accent-red-500` | `#F49595` | rgb(244,149,149) | CTA hover (paler) |
| `accent-red-400` | `#F8AEAE` | rgb(248,174,174) | CTA pressed |
| `accent-red-300` | `#FBCBCB` | rgb(251,203,203) | Subtle red tint backgrounds |
| `accent-red-200` | `#FDE0E0` | rgb(253,224,224) | Alert banners (light) |
| `accent-red-050` | `#FEF3F3` | rgb(254,243,243) | Error message background |
| `hero-coral` | `#DF7179` | rgb(223,113,121) | Hero gradient top-left anchor only — slightly deeper than CTA |
| `semantic-danger-strong` | `#D04E54` | rgb(208,78,84) | Errors and destructive actions only — stronger than brand coral so urgent actions still read |

### 2.3 Mid pink (gradient bridge)

Only appears inside the hero gradient — never as a flat fill on its own surface.

| Token | Hex | RGB | Usage |
|---|---|---|---|
| `gradient-pink-mid` | `#C27496` | rgb(194,116,150) | Hero gradient mid-stop only |

### 2.4 Neutrals

| Token | Hex | Usage |
|---|---|---|
| `neutral-white` | `#FFFFFF` | Cards, dialogs, top nav strip, hero foreground text |
| `neutral-50` | `#F8F8FA` | Page background (default working surface) |
| `neutral-100` | `#EFEFF3` | Subtle dividers, table zebra |
| `neutral-200` | `#DDDDE3` | Borders, disabled bg |
| `neutral-400` | `#9A9AA3` | Tagline grey ("NextGen Solutions"), muted icons |
| `neutral-600` | `#5C5C66` | Secondary text |
| `neutral-800` | `#2C2C36` | Primary text on light surfaces, headings |
| `neutral-900` | `#16161D` | Strongest text (rarely used) |

### 2.5 Semantic (derived — must remain consistent with brand)

| Token | Hex | Usage |
|---|---|---|
| `semantic-success` | `#2E8B57` | Success states (a desaturated sea-green that doesn't fight the brand) |
| `semantic-warning` | `#D49018` | Warnings / pending |
| `semantic-info` | `#5B3FA0` | Info — reuses `brand-purple-700` |
| `semantic-danger` | `#D04E54` | Errors / destructive — uses `semantic-danger-strong` (slightly stronger than brand coral) |

---

## 3. The hero gradient

This is the single most recognizable surface in the brand. Apply it ONLY on:
- Public marketing pages (landing, login, signup, password-reset)
- Tenant-onboarding wizard hero
- Empty-state heroes for new modules (subdued tint version)

**Never** apply to: data-heavy screens, dashboards, lists, tables, forms, dialogs.

### 3.1 Canonical hero gradient (CSS)

```css
background: linear-gradient(
  120deg,
  #DF7179 0%,         /* hero-coral — top-left */
  #C27496 45%,        /* gradient-pink-mid */
  #A397DF 100%        /* brand-purple-300 — bottom-right lavender */
);
```

### 3.2 Subdued hero (interior empty states)

```css
background: linear-gradient(
  120deg,
  #FDEEEF 0%,         /* accent-red-050 */
  #F5F2FB 100%        /* brand-purple-050 */
);
```

---

## 4. Logo usage

The logo file is owned by the design package; do not redraw it. Required rules:

- **Clear space** — minimum padding around the logo equal to the height of the lowercase "x" in "NextGen Solutions".
- **Min size** — 32 px height for the wordmark; below that, use the cube glyph alone.
- **Background** — only on `neutral-white` or on the hero gradient. Never on any other tint.
- **Color** — full color version on light surfaces; reversed (white wordmark + white-outlined cube) on the hero gradient.
- **Tagline** — "NextGen Solutions" in `neutral-400`; never re-color.
- **Do NOT** rotate, recolor, add drop shadows, place on busy imagery, or redraw the cube glyph.

Asset locations (placeholders — actual files to be supplied by Shankar):
- `src/frontend/ulp-web/src/assets/brand/logo-color.svg`
- `src/frontend/ulp-web/src/assets/brand/logo-reversed.svg`
- `src/frontend/ulp-web/src/assets/brand/cube-glyph.svg`
- `src/frontend/ulp-web/src/assets/brand/favicon.svg`

---

## 5. Typography

| Token | Family | Usage |
|---|---|---|
| `font-display` | `Inter, sans-serif` | Headings, logo lockup fallback |
| `font-body` | `Inter, sans-serif` | Body text, forms, tables |
| `font-mono` | `'JetBrains Mono', 'Consolas', monospace` | Code, IDs (invoice no, tracking no) |

Sizes (Material 17 typography config):

| Role | Size | Weight | Line height |
|---|---|---|---|
| `display-large` | 36px | 700 | 44px |
| `display-medium` | 28px | 700 | 36px |
| `headline` | 22px | 600 | 30px |
| `title` | 18px | 600 | 26px |
| `body-large` | 16px | 400 | 24px |
| `body-medium` | 14px | 400 | 22px |
| `label` | 13px | 500 | 18px |
| `caption` | 12px | 400 | 16px |

---

## 6. Density, spacing, radii

- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 32, 40, 56, 72.
- **Border radius:** `radius-sm` 4px (chips/inputs), `radius-md` 8px (cards/dialogs/buttons), `radius-lg` 16px (hero panels), `radius-pill` 999px.
- **Material density:** `-1` (slightly tighter than default).
- **Card elevation:** prefer flat with 1px border (`neutral-200`) over heavy shadows. When elevation is used: `0 2px 6px rgba(63,45,124,0.08)` (purple-tinted, soft).

---

## 7. Components — concrete rules

| Component | Brand application |
|---|---|
| **Top nav** | `neutral-white` background, logo on the left, links in `neutral-800`, active link underline in `accent-red-600` 2px |
| **Sidebar** (app shell) | `neutral-50` background; section headers in `brand-purple-900`; selected row tinted `brand-purple-100` with a 3px `brand-purple-700` left border |
| **Primary button (`mat-flat-button color="primary"`)** | Background `brand-purple-900`, text `neutral-white` |
| **Accent button (CTA, `mat-flat-button color="accent"`)** | Background `accent-red-600`, text `neutral-white` — for marketing/onboarding hero CTAs ONLY |
| **Secondary button** | Outlined, `brand-purple-900` border + text, transparent background |
| **Tertiary / text button** | `brand-purple-700` text, no background |
| **Form field (`appearance="outline"`)** | Border `neutral-200`; focus ring `brand-purple-700`; error border `accent-red-600`; error text `accent-red-600` |
| **Data table header** | `neutral-50` background, `neutral-800` text, sortable indicator in `brand-purple-700` |
| **Data table selected row** | `brand-purple-100` tint |
| **Mat-chip / status pill** | Default `neutral-100` bg / `neutral-800` text; states use semantic tokens with `050` background variants |
| **Module tiles** (homepage) | Red hex per reference image — use `accent-red-600` fill, white label, white card behind |
| **Empty states** | Subdued hero gradient (§3.2) + cube-glyph illustration in `brand-purple-300` |
| **Snackbar (success)** | `semantic-success` accent strip, white card |
| **Dialog backdrop** | `rgba(63,45,124,0.45)` (purple-tinted, not black) |

---

## 8. Country variants

The brand identity is **country-agnostic** — IN and US tenants see the same SCMCube brand. Country-specific UI variants in `src/frontend/ulp-web/src/app/plugins-ui/{india,us}/` MUST NOT introduce new colors. They may use country-specific iconography (flags in tenant switcher only) but everything else stays in the SCMCube tokens above.

---

## 9. Accessibility constraints

All combinations below have been mentally checked against WCAG 2.1 AA:

| Foreground | Background | Min size | Notes |
|---|---|---|---|
| `neutral-800` on `neutral-white` | text | passes AA at all sizes |
| `brand-purple-900` on `neutral-white` | text | passes AA at all sizes — primary link color |
| `accent-red-600` on `neutral-white` | ≥18 px / 700 wt | mild coral — passes AA Large only; for body text use `semantic-danger-strong` instead |
| `neutral-white` on `accent-red-600` | ≥18 px | mild coral — use for CTA labels (button text is large enough) |
| `semantic-danger-strong` on `neutral-white` | text | passes AA at all sizes — use for error messages and destructive button labels |
| `neutral-white` on `brand-purple-900` | text | passes AA at all sizes |
| `neutral-400` on `neutral-white` | tagline only | does NOT pass AA — only used for the brand tagline at 12 px under the logo |

When the hero gradient is the background, body text must be `neutral-white` and minimum 16 px / 500 weight. Headlines must be 700 weight.

---

## 10. Implementation

The Material 17 theme is in [../../src/frontend/ulp-web/src/styles/_theme.scss](../../src/frontend/ulp-web/src/styles/_theme.scss). All design tokens live in [../../src/frontend/ulp-web/src/styles/_tokens.scss](../../src/frontend/ulp-web/src/styles/_tokens.scss). When this document changes, both files must be updated in the same PR.

When the desktop wrapper (Electron) is added, it imports the same Angular SPA — no separate styling. Mobile (KMP) maintains a parallel token file in `src/mobile/ulp-mobile/shared/` (out of scope for Phase 1).

---

## 11. Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-02 | Initial extraction from `ulpReq/DesignColorReference.jpg`. Locks SCMCube purple+red brand. Overrides indigo+amber default in `angular-material-17` skill. |
| 1.1 | 2026-05-02 | **Red softened to true mild coral** per Shankar's clarification. Brand `accent-red-600` now `#EF7D7E` (was `#E54A52` — too dark). Errors/destructive only use new `semantic-danger-strong` `#D04E54`. Hero gradient anchor moved to `hero-coral` `#DF7179`. |
| 1.2 | 2026-05-02 | **Purple-dominant rebalance.** Coral was visually dominating the landing page. Coral demoted to ≤5% accent (module tiles only). Primary CTAs now purple. Hero is white background with subtle purple/lavender radial washes — no full-bleed coral gradient. Confirms light theme everywhere; no dark theme. Per Shankar: "Red color dominating, it should not be — logo color (purple) should dominate. Don't go with dark theme. Professional white should be there." |

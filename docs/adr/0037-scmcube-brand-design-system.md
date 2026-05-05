# ADR 0037 — SCMCube Brand Design System

**Status:** Accepted (locked)
**Date:** 2026-05-02
**Decider:** Shankar
**Supersedes:** the indigo+amber sample palette in [.claude/skills/angular-material-17/SKILL.md](../../.claude/skills/angular-material-17/SKILL.md) (which was illustrative only)

## Context

The product is branded **SCMCube — NextGen Solutions**. A reference image was supplied at [ulpReq/DesignColorReference.jpg](../../ulpReq/DesignColorReference.jpg). Shankar's instruction was explicit:

> "Get the color design pattern should be like [reference image]. This image logo and other places mild color. Hope u will get professional skill from the knowledge also. Strictly follow design document and other skills don't go with assumption and other proposal strictly follow this and keep it in ur memory"

The pre-existing `angular-material-17` skill contained a sample palette (indigo primary + amber accent). That palette does not match the SCMCube brand and would conflict with the reference image if used.

## Decision

1. **Adopt the SCMCube palette as the only ULP brand palette.** Two anchors extracted directly from the reference image:
   - **Primary purple** `#3F2D7C` (logo wordmark, primary buttons, links)
   - **Accent mild coral** `#EF7D7E` (CTAs, module hex tiles) — soft coral matching the actual CTA button in the reference image, NOT a saturated red. Errors/destructive actions use a separate slightly-stronger `semantic-danger-strong` `#D04E54`.
2. **Hero gradient** — coral → pink → lavender — applies only to marketing/onboarding hero surfaces. Interior app screens use mild neutrals (`#F8F8FA` page, white cards, soft purple-tinted shadows) per Shankar's "mild color" instruction.
3. **Lock all rules** in [docs/design/SCMCube-DesignSystem.md](../design/SCMCube-DesignSystem.md). It is the source of truth — supersedes any conflicting palette/typography/component choice in any skill or document.
4. **Implement** as Material 17 theme + token SCSS in [src/frontend/ulp-web/src/styles/](../../src/frontend/ulp-web/src/styles/). Tokens are the only way to refer to brand values from component code.
5. **Country variants** (India, US plugin UIs) inherit the SCMCube brand verbatim — they may not introduce new colors.

## Consequences

### Better
- Single, locked brand palette → no drift across modules, no per-developer color preference.
- Reference image and SCSS tokens are 1:1 → zero ambiguity for engineers.
- Material 17 theming inherits brand correctly via `mat.define-palette($ulp-purple-palette, 900, 700, 500)` etc.
- Future skills/docs cannot quietly override the brand — this ADR is the gate.

### Worse
- Engineers must consult the design system doc, not their instincts.
- Pre-existing skill examples (indigo+amber) are now misleading until the skill is updated; the design system README explicitly warns about this.

### Now possible
- Designers can hand SVG assets to `src/frontend/ulp-web/src/assets/brand/` and they work with zero code changes.
- The Electron desktop app inherits identical styling from the Angular SPA.

### Now harder
- Any future request to "make this button blue" must be rejected at PR review unless an ADR supersedes 0037 first.

## Implementation

| Path | Purpose |
|---|---|
| [docs/design/SCMCube-DesignSystem.md](../design/SCMCube-DesignSystem.md) | Authoritative spec — palette, typography, spacing, hero gradient, component rules, accessibility |
| [src/frontend/ulp-web/src/styles/_tokens.scss](../../src/frontend/ulp-web/src/styles/_tokens.scss) | All design tokens as SCSS variables |
| [src/frontend/ulp-web/src/styles/_theme.scss](../../src/frontend/ulp-web/src/styles/_theme.scss) | Material 17 light theme with SCMCube palettes (primary=purple, accent=red, warn=red) |
| [src/frontend/ulp-web/src/styles/_components.scss](../../src/frontend/ulp-web/src/styles/_components.scss) | App-shell components: top nav, sidebar, hero, hex tile, card, status pill, dialog backdrop |
| [src/frontend/ulp-web/src/styles.scss](../../src/frontend/ulp-web/src/styles.scss) | Global entry point — wired into `angular.json` when SPA scaffolding is created |
| [src/frontend/ulp-web/src/assets/brand/](../../src/frontend/ulp-web/src/assets/brand/) | Reserved for SVG/PNG brand assets |

## Verification

A change is considered conformant only if **all** of the following hold:

1. No hex literal in any component template/SCSS — only token references.
2. Buttons use `mat-flat-button color="primary"` (purple) for app actions, `color="accent"` (red) only for hero CTAs.
3. Hero gradient appears only on landing/login/onboarding heroes; data screens use `$neutral-50` page bg and white cards.
4. Country plugin UIs introduce no new colors.
5. The `angular-material-17` skill's indigo+amber sample is never copied into the codebase.

## Amendments

**2026-05-02 (same day):** Initial draft used `#E54A52` for the accent red. Shankar flagged this as too dark — the reference image shows a mild coral. Re-sampled the actual CTA button in the image (`#EF7D7E`) and adopted that as `accent-red-600`. Introduced `semantic-danger-strong` (`#D04E54`) for errors/destructive only, so urgent actions still read clearly without the brand using a loud red.

## Future

- When the brand assets (logo SVG, cube glyph) land, drop them into `src/frontend/ulp-web/src/assets/brand/`. No further code changes needed.
- If the brand evolves (v2 of design), supersede this ADR with 0038+ and update the design system doc and tokens in the same PR.

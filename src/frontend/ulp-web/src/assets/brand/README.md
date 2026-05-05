# Brand assets

The visual brand for the ULP web/desktop product is **SCMCube — NextGen Solutions** per [../../../../../docs/design/SCMCube-DesignSystem.md](../../../../../docs/design/SCMCube-DesignSystem.md) §4.

Expected files (to be supplied by Shankar / design):

| File | Purpose | Format |
|---|---|---|
| `logo-color.svg` | Primary logo for white/light surfaces | SVG (preferred) |
| `logo-reversed.svg` | Reversed logo for use on the hero gradient | SVG |
| `cube-glyph.svg` | The cube glyph alone — for small spaces and favicons | SVG |
| `favicon.svg` / `favicon.ico` | Browser favicon | SVG + ICO |
| `app-icon.png` (multiple sizes) | Electron desktop app icon | PNG 16/32/64/128/256/512 |
| `mobile-icon.png` (multiple sizes) | KMP mobile launcher icons | PNG, density variants |

## Rules

- Logo files are **read-only** to engineers — do not edit, recolor, rotate, or redraw.
- Logo on backgrounds other than white or the canonical hero gradient is forbidden.
- See design system doc §4 for clear-space, min-size, and "do not" rules.

Until the assets land, the SPA renders a placeholder text logo using the `font-display` family in `$brand-purple-900` so layouts can be developed without blocking on art.

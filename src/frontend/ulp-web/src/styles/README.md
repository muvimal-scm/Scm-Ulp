# Frontend styles — SCMCube design system

Source of truth: [../../../../docs/design/SCMCube-DesignSystem.md](../../../../docs/design/SCMCube-DesignSystem.md).

| File | Purpose |
|---|---|
| `_tokens.scss` | All brand tokens — palette, spacing, radii, typography, gradient |
| `_theme.scss` | Material 17 light theme built from the tokens |
| `_components.scss` | App-shell + brand component classes (top nav, sidebar, hero, hex tile, card, pill) |
| `../styles.scss` | Global entry — imported once from `angular.json` |

## Rules

1. **Never** hardcode a color hex in a component template/SCSS. Use the token (`$brand-purple-900` etc.).
2. **Never** introduce a new color without an ADR and a design-system doc update.
3. The skill `.claude/skills/angular-material-17/` contains an example palette (indigo + amber). **Ignore that palette** — it is generic. The SCMCube tokens here are authoritative.
4. Country-specific UI (`plugins-ui/india/`, `plugins-ui/us/`) MUST NOT add new colors — only iconography (e.g., flag in tenant switcher).

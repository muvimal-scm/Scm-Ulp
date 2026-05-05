# docs/design/

Design system reference for the ULP / SCMCube product. Source of truth: [../../ulpReq/DesignColorReference.jpg](../../ulpReq/DesignColorReference.jpg).

| File | Purpose |
|---|---|
| [SCMCube-DesignSystem.md](SCMCube-DesignSystem.md) | The locked design system — palette, typography, spacing, component rules. Strictly follow. |

## Reading order

1. Open the reference image first.
2. Read the design system doc top to bottom.
3. When implementing UI, refer to tokens by name (`brand-purple-900`, not `#3F2D7C`).
4. Token definitions live in [../../src/frontend/ulp-web/src/styles/](../../src/frontend/ulp-web/src/styles/) once Phase 1 frontend lands.

## What this overrides

The pre-built skill [../../.claude/skills/angular-material-17/SKILL.md](../../.claude/skills/angular-material-17/SKILL.md) shows an indigo + amber sample palette. **That is illustrative only — not the ULP brand.** The SCMCube design system in this folder is authoritative.

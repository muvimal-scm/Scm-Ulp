# src/frontend/

Angular 17 web app. Same code is wrapped by Electron for desktop ([../desktop/](../desktop/)).

| Folder | Purpose |
|---|---|
| [ulp-web/](ulp-web/) | Main SPA — Angular 17 + Signals + Material 17 |
| [ulp-shared-lib/](ulp-shared-lib/) | Shared TypeScript library (DTOs, Money/Luxon helpers, validation) |

## ulp-web layout

```
ulp-web/src/app/
├── core/                  # Auth, HTTP interceptors, tenant context, error handling
├── shared/                # Common components, pipes (money, date), directives
├── features/              # One folder per module — m1-master-data/, m5-forwarding/, ...
└── plugins-ui/            # Country-specific UI variants
    ├── india/             # GST forms, IRN preview, EWB UI, BOE filing screens
    └── us/                # CBP entry forms, ATM/ITN, sales tax UI, 1099 screens
```

## Conventions

- Standalone components, no NgModules.
- Signals for state, OnPush change detection.
- All user-facing strings via Angular i18n (`.xlf` files in `src/assets/i18n/`).
- Money display: dedicated `<money>` component reading tenant locale.
- Date display: Luxon + tenant tz from `ITenantContext`.
- Reference skills: [../../.claude/skills/angular-17-signals/](../../.claude/skills/angular-17-signals/), [../../.claude/skills/angular-material-17/](../../.claude/skills/angular-material-17/).

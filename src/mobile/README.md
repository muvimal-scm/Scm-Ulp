# src/mobile/

Kotlin Multiplatform Mobile (KMP) — shared code targeting Android + iOS. Field-only apps; office users use web/desktop ([HLD §4.9](../../ulpReq/ULP_HLD_v2.0_MultiRegion.docx)).

## Three apps

| App | Purpose | Module | Phase |
|---|---|---|---|
| Driver | Trip status, GPS, POD upload | M13 | 2 (skeleton) → 4 (polish) |
| Warehouse | Barcode scan, GRN, putaway, picking | M8 | 2 (skeleton) → 4 (polish) |
| Last-mile | Last-mile delivery leg | M13 | 4 |

## Layout

```
ulp-mobile/
├── shared/                # KMP shared module — DTOs, API client, offline cache, business rules
└── apps/
    ├── driver/
    │   ├── androidApp/
    │   └── iosApp/
    ├── warehouse/
    │   ├── androidApp/
    │   └── iosApp/
    └── lastmile/
        ├── androidApp/
        └── iosApp/
```

Reference skill: [../../.claude/skills/kotlin-multiplatform-mobile/](../../.claude/skills/kotlin-multiplatform-mobile/).

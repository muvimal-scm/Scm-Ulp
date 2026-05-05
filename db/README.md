# db/

Database artifacts. Source of truth schema lives in [../ulpReq/ULP_DBD_v2.0_Schema.sql](../ulpReq/ULP_DBD_v2.0_Schema.sql) (sealed v2.0 design).

| Folder | Purpose |
|---|---|
| [schema/](schema/) | Generated DDL snapshots from EF Core (verify drift against ulpReq schema) |
| [seeds/](seeds/) | Reference data: `m1_country`, `m1_state_or_province`, `m1_currency`, `m1_locale`, `m1_time_zone` |
| [migrations/](migrations/) | EF Core migrations output for inspection (also lives in `host/Ulp.Migrations`) |

## Migration discipline

Per [../ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx](../ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx) §1.4 + the v2.0 migration plan:

1. Add nullable columns
2. Backfill existing data
3. Apply NOT NULL constraints
4. Create new plugin tables (`m4us_*`, `m13us_*`, `m17us_*`)

Every migration must be reversible (`Up` + `Down`) and tested for backward compatibility.

Reference skill: [../.claude/skills/efcore-mysql-pomelo/](../.claude/skills/efcore-mysql-pomelo/).

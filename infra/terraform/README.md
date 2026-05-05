# infra/terraform/

Cloud IaC. **Phase 5 work** — empty for now.

Per [../../ulpReq/ULP_HLD_v2.0_MultiRegion.docx](../../ulpReq/ULP_HLD_v2.0_MultiRegion.docx) §6, target cloud is Azure:

- IN region: Central India (primary) + South India (DR)
- US region: East US 2 (primary) + West US 2 (DR)

Reference skill: [../../.claude/skills/terraform-azure/SKILL.md](../../.claude/skills/terraform-azure/SKILL.md).

Layout:

```
terraform/
├── modules/             # Reusable modules (mysql-flex, aks-cluster, key-vault, ...)
└── envs/
    ├── dev/             # Single region, minimal sizing
    ├── stage/           # Both regions, scaled-down
    └── prod/            # Both regions, full sizing
```

If we ever need to support AWS/GCP, modules abstract over providers — refactor effort is bounded to module internals.

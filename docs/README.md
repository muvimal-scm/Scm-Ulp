# docs/

Working documentation generated during the build. Companion to (not replacement for) the sealed design package in [../ulpReq/](../ulpReq/).

| Folder | Contents |
|---|---|
| [adr/](adr/) | Architecture Decision Records — markdown, additive. One file per decision, numbered (e.g., `0001-money-type.md`). |
| [runbooks/](runbooks/) | Local-dev runbooks (start stack, reset DB, seed test tenants, troubleshoot containers). |

## When to write here vs ulpReq

- **ulpReq/** — sealed v2.0 design (don't modify).
- **docs/adr/** — new decisions made during build that augment or override design assumptions.
- **docs/runbooks/** — practical how-tos for the build/dev workflow.

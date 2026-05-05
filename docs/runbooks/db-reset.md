# Runbook — Reset the local database

## When to use this

- Schema in `ulp_dev` got into a state you can't easily undo.
- Switched branches and migrations diverged.
- Want to test the v2.0 schema apply from a clean slate.

## Option 1 — Reset DB only (keep Keycloak / MinIO intact)

```powershell
# Drop and recreate ulp_dev, reapply schema
docker exec -i ulp-mysql mysql -uroot -pdev_password -e "DROP DATABASE IF EXISTS ulp_dev; CREATE DATABASE ulp_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
pwsh ./infra/scripts/init-db.ps1
```

```bash
docker exec -i ulp-mysql mysql -uroot -pdev_password -e "DROP DATABASE IF EXISTS ulp_dev; CREATE DATABASE ulp_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
./infra/scripts/init-db.sh
```

## Option 2 — Reset MySQL volume entirely

```powershell
docker compose -f infra/docker/docker-compose.yml stop mysql
docker volume rm ulp_mysql_data
docker compose -f infra/docker/docker-compose.yml up -d mysql
# wait ~30s for first-boot init
pwsh ./infra/scripts/init-db.ps1
```

## Option 3 — Full nuke (all stack volumes)

See [troubleshooting.md](troubleshooting.md) → "Reset everything".

## Verify

```bash
docker exec -i ulp-mysql mysql -uroot -pdev_password ulp_dev -e "SELECT version, applied_at_utc FROM _ulp_schema_version;"
```

Should print `v2.0` and a recent timestamp.

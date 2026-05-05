# Runbook — Troubleshooting the local stack

## Stack won't start

### Port already in use

```
Error: bind: address already in use
```

A host service is using one of the stack's ports. Two fixes:

**Option A** — kill the process on that port:
```powershell
Get-NetTCPConnection -LocalPort 3306 | Select-Object -Property OwningProcess
Stop-Process -Id <pid>
```

**Option B** — remap via override:
```powershell
cp infra/docker/docker-compose.override.example.yml infra/docker/docker-compose.override.yml
```
Edit and uncomment the relevant `ports:` block. Then restart the stack.

### Docker Desktop not running

Symptom: `error during connect: ... docker daemon is not running`. Start Docker Desktop and retry.

### Insufficient memory

Symptom: containers OOMKilled, MySQL won't init. Increase Docker Desktop memory to ≥6 GB (Settings → Resources).

## MySQL

### `Access denied for user 'root'`

The root password baked into the volume doesn't match `MYSQL_ROOT_PASSWORD` in `.env`. Either:
- Change `.env` back to `dev_password`, or
- Wipe the volume: `pwsh infra/scripts/stack-down.ps1 -Wipe` then restart.

### `Can't connect to MySQL server on 'localhost' (10061)`

Container is unhealthy. Check `docker compose logs mysql`. Most common cause: corrupted `mysql_data` volume — wipe and recreate.

### `init-db.sh` fails with `ERROR 1064`

The schema file references syntax not supported by your MySQL minor version. Verify image is `mysql:8.0` (not 5.7).

## Keycloak

### Realm import didn't take effect

Realm import only runs on first Keycloak boot (when Postgres is empty). To force re-import:

```powershell
pwsh ./infra/scripts/stack-down.ps1 -Wipe
pwsh ./infra/scripts/stack-up.ps1
```

This wipes the Keycloak Postgres volume and triggers `--import-realm` again.

### `Invalid parameter: redirect_uri` from Angular

The realm import only allows `http://localhost:4200/*`. If your Angular dev server runs on a different port, edit [infra/docker/_dev/keycloak/import/ulp-realm.json](../../infra/docker/_dev/keycloak/import/ulp-realm.json) `redirectUris` and re-import (wipe + restart) — or update the client live in the Keycloak admin UI.

### Keycloak takes >2 min to start

Normal on first boot — it migrates its schema in Postgres. Subsequent starts are <30s.

## MinIO

### `minio-init` shows status `Exited (0)`

That's correct — it runs once, creates buckets, exits. Re-run on demand:
```bash
docker compose -f infra/docker/docker-compose.yml run --rm minio-init
```

### Buckets don't exist after restart

Healthcheck timing — `minio-init` ran before MinIO was fully ready. Wait 30s, run the command above.

### `mc: command not found` in init script

Don't run the script on your host — it's run inside the `minio/mc` container. The script targets the `minio` container's hostname, not `localhost`.

## RabbitMQ

### Management UI returns 401

Default user is `ulp` (matching `.env` `RABBITMQ_USER`), not `guest`. The `guest` user only works from `localhost` and isn't created here.

## Qdrant

### Healthcheck fails

Qdrant images >v1.7 expose `/healthz` on port 6333. Older images use `/`. Update the image tag if you've pinned an older version.

## General

### `docker compose ps` shows `unhealthy`

```bash
docker compose -f infra/docker/docker-compose.yml logs <service>
```
Tail logs with `-f` for live output.

### Volumes fill up disk

```bash
docker volume ls | grep ulp_
docker compose -f infra/docker/docker-compose.yml down -v   # wipe all stack volumes
```

### Reset everything

```powershell
pwsh ./infra/scripts/reset-local.ps1
```

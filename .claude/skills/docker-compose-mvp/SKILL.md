---
name: docker-compose-mvp
description: Docker Compose patterns for the ULP local development stack (MySQL 8, Redis 7, RabbitMQ, MinIO, MailHog, Keycloak, Qdrant). Use when setting up local dev environment, debugging container connectivity, modifying docker-compose.yml, configuring volumes/networks, or troubleshooting first-run issues. Always trigger when developer onboarding, fixing "container won't start" errors, or adding a new local service to the stack.
---

# Docker Compose for ULP MVP Local Stack

## When this skill triggers
Modifying `docker-compose.yml`, `docker-compose.override.yml`, troubleshooting container startup errors, debugging port conflicts, adding new services to the dev stack, configuring health checks, or setting up `.env` files for local development.

## Top 3 reference repos
1. **docker/awesome-compose** (https://github.com/docker/awesome-compose) — Official curated examples. Reference patterns for nginx + .NET + MySQL stacks. Read `nginx-aspnet-mysql/` for ASP.NET-style multi-service setups.
2. **PomeloFoundation/Pomelo.EntityFrameworkCore.MySql** (https://github.com/PomeloFoundation/Pomelo.EntityFrameworkCore.MySql) — `tests/docker-compose.yml` shows MySQL container config with proper charset and SQL mode for EF Core compatibility.
3. **dotnet/aspire** (https://github.com/dotnet/aspire) — Microsoft's modern alternative; useful for understanding service-discovery patterns even if ULP uses raw Compose. Read samples for env var patterns.

## The ULP Compose stack

### docker-compose.yml at repo root
```yaml
version: '3.9'

services:
  mysql:
    image: mysql:8.0
    container_name: ulp-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-dev_password}
      MYSQL_DATABASE: ulp_dev
    ports: ['3306:3306']
    volumes:
      - mysql_data:/var/lib/mysql
      - ./_dev/mysql/init:/docker-entrypoint-initdb.d:ro
    command:
      - --default-authentication-plugin=mysql_native_password
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --sql-mode=STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO
    healthcheck:
      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost', '-u', 'root', '-p${MYSQL_ROOT_PASSWORD:-dev_password}']
      interval: 10s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: ulp-redis
    restart: unless-stopped
    ports: ['6379:6379']
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: ulp-rabbitmq
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: ulp
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-dev_password}
    ports: ['5672:5672', '15672:15672']  # AMQP + Management UI
    volumes: [rabbitmq_data:/var/lib/rabbitmq]
    healthcheck:
      test: ['CMD', 'rabbitmq-diagnostics', '-q', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: ulp-minio
    restart: unless-stopped
    command: server /data --console-address ':9001'
    environment:
      MINIO_ROOT_USER: ulp
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD:-dev_password_min8}
    ports: ['9000:9000', '9001:9001']  # API + Console
    volumes: [minio_data:/data]
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 10s
      timeout: 5s
      retries: 5

  mailhog:
    image: mailhog/mailhog:latest
    container_name: ulp-mailhog
    restart: unless-stopped
    ports: ['1025:1025', '8025:8025']  # SMTP + Web UI

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    container_name: ulp-keycloak
    restart: unless-stopped
    command: start-dev
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:-admin}
      KC_DB: dev-mem
    ports: ['8080:8080']
    volumes:
      - ./_dev/keycloak/import:/opt/keycloak/data/import:ro

  qdrant:
    image: qdrant/qdrant:latest
    container_name: ulp-qdrant
    restart: unless-stopped
    ports: ['6333:6333', '6334:6334']  # REST + gRPC
    volumes: [qdrant_data:/qdrant/storage]

volumes:
  mysql_data:
  rabbitmq_data:
  minio_data:
  qdrant_data:

networks:
  default:
    name: ulp-network
```

### .env at repo root (gitignored, template in .env.example)
```bash
MYSQL_ROOT_PASSWORD=dev_password
RABBITMQ_PASSWORD=dev_password
MINIO_PASSWORD=dev_password_min8
KEYCLOAK_ADMIN_PASSWORD=admin
```

### docker-compose.override.yml (developer-specific, gitignored)
```yaml
# Each developer can override ports if their machine has conflicts
services:
  mysql:
    ports: ['3307:3306']  # if 3306 already in use
```

## Critical ULP patterns

### Daily developer workflow
```bash
# Start stack (background)
docker compose up -d

# Check health
docker compose ps

# View logs for one service
docker compose logs -f mysql

# Restart one service (after config change)
docker compose restart redis

# Tear down completely (preserves volumes)
docker compose down

# Tear down + delete data (clean slate)
docker compose down -v
```

### Connection strings for the .NET app
```json
// appsettings.Development.json
{
  "ConnectionStrings": {
    "Default": "server=localhost;port=3306;database=ulp_dev;user=root;password=dev_password;CharSet=utf8mb4"
  },
  "Redis": { "Endpoint": "localhost:6379" },
  "RabbitMQ": { "Host": "localhost", "Port": 5672, "User": "ulp", "Password": "dev_password" },
  "MinIO": { "Endpoint": "http://localhost:9000", "AccessKey": "ulp", "SecretKey": "dev_password_min8" },
  "Mail": { "Provider": "MailHog", "Host": "localhost", "Port": 1025 },
  "Keycloak": { "Authority": "http://localhost:8080/realms/ulp", "Audience": "ulp-api" },
  "Qdrant": { "Endpoint": "http://localhost:6333" }
}
```

## Critical gotchas

### Port conflicts
- Common conflicts on Windows/macOS: 3306 (other MySQL), 6379 (other Redis), 8080 (other tools)
- Fix via `docker-compose.override.yml` per developer.

### Volume permissions on Linux
- MinIO + Postgres often need `:Z` SELinux label on RHEL/Fedora hosts.
- If startup fails with EACCES, add `:Z` to volume mount: `./_dev/minio:/data:Z`.

### MySQL initial connection slowness
- First start takes 30-60 seconds while MySQL initializes the data directory.
- Always wait for `healthcheck` to pass before starting the .NET app.
- In CI: use `docker compose up --wait`.

### Keycloak realm seeding
- For repeatable local setup, export realm to `./_dev/keycloak/import/ulp-realm.json`.
- Mount as readonly volume; Keycloak imports on `start-dev`.
- Realm should pre-create `ulp-api` client and 2 test users (admin + viewer).

### MailHog vs ACS in production
- MailHog SMTP captures all emails; web UI at `http://localhost:8025` shows them.
- Production swap: replace `IEmailSender` impl from `SmtpEmailSender` to `AcsEmailSender`. ZERO config changes if abstraction is correct.

### .dockerignore (root)
- Always exclude: `bin/`, `obj/`, `node_modules/`, `.git/`, `_dev/` (dev DB volumes).
- Keeps build context small; speeds up `docker compose build`.

## ULP companion docs
- ULP_DevelopmentGuide_v1.0.docx Section 6.3 (Setting up the MVP local stack)
- ULP_TechStack_v3.0_Final.xlsx (Local stack sheet)
- ULP_HLD_v1.0_HighLevelDesign.docx (Deployment topology)

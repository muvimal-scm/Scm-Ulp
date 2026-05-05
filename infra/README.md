# infra/

Infrastructure-as-code for ULP. **Open-source-first**: local dev runs on Docker Compose; production runs on Kubernetes (self-host) or Terraform-managed cloud.

| Folder | Phase | Purpose |
|---|---|---|
| [docker/](docker/) | Phase 1 (now) | Local MVP stack — MySQL, Redis, RabbitMQ, MinIO, MailHog, Keycloak, Qdrant. |
| [k8s/](k8s/) | Phase 5 (later) | Kubernetes manifests / Helm charts for self-hosted production. |
| [terraform/](terraform/) | Phase 5 (later) | Cloud IaC — Azure first (per HLD §6), portable to AWS/GCP via module redesign. |
| [scripts/](scripts/) | Throughout | Bootstrap scripts (DB init, Keycloak realm seed, MinIO bucket creation). |

## Why open-source-first

Every cloud-managed service used in production has an open-source equivalent we can run locally. Code talks to abstractions (`IEmailSender`, `IBus`, `IBlobStore`, ...), not vendor SDKs. Production migration is a DI registration change.

| Local (now) | Production target | Abstraction |
|---|---|---|
| MySQL 8 (Docker) | Azure Database for MySQL Flexible Server | EF Core + connection string |
| Redis 7 | Azure Cache for Redis | `IDistributedCache` |
| RabbitMQ | Azure Service Bus | MassTransit (broker-agnostic) |
| MinIO | Azure Blob Storage | `IBlobStore` |
| MailHog | Azure Communication Services | `IEmailSender` |
| Keycloak | Keycloak self-host or Azure AD B2C | OIDC standard |
| Qdrant | Qdrant Cloud or self-host | Qdrant client |

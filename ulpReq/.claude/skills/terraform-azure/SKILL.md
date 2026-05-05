---
name: terraform-azure
description: Terraform Infrastructure-as-Code patterns for ULP production deployment on Azure. Use when writing or modifying Terraform configs for Azure resources (App Service, MySQL Flexible Server, Redis Cache, Service Bus, Blob Storage, Key Vault, AD B2C), provisioning new environments (dev/staging/prod), or working in infra/terraform/. Covers AVM (Azure Verified Modules), backend state, hub-and-spoke networking, environment workspaces, and least-privilege RBAC. Always trigger on .tf, .tfvars, terraform.tfstate, or backend.tf files.
---

# Terraform on Azure for ULP

## When this skill triggers
Working on `.tf` files, modifying Azure resource provisioning, configuring backend state, defining environments (dev/staging/prod), setting up RBAC, or any work in `infra/terraform/`. Trigger on Terraform CLI commands (`terraform plan`, `apply`, `init`).

## Top 3 reference repos
1. **Azure/Azure-Verified-Modules** (https://github.com/Azure/Azure-Verified-Modules) — Microsoft-maintained verified modules. The recommended starting point for any Azure resource. Use `Azure/avm-res-web-site/azurerm` for App Service, `Azure/avm-res-dbformysql-flexibleserver/azurerm` for MySQL.
2. **Azure/terraform-azurerm-caf-enterprise-scale** (https://github.com/Azure/terraform-azurerm-caf-enterprise-scale) — Azure Landing Zone reference. Architecture for management groups, policies, RBAC. Essential for production governance setup. (Note: archives Aug 2026 — migrate to ALZ accelerator.)
3. **azure365pro/azure-hub-spoke-terraform** (https://github.com/azure365pro/azure-hub-spoke-terraform) — Practical hub-and-spoke topology with Firewall, Bastion, App Service VNet integration. Direct mapping for ULP's networking needs.

## Critical ULP patterns

### Repository layout
```
infra/terraform/
├── modules/
│   ├── networking/      # VNet, subnets, NSGs, private endpoints
│   ├── data/            # MySQL Flexible Server, Redis Cache, Service Bus
│   ├── compute/         # App Service Plan + App Service for Containers
│   ├── identity/        # Key Vault, Managed Identity, AD B2C
│   └── observability/   # App Insights, Log Analytics
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   └── prod/
└── _shared/
    └── versions.tf      # provider version pinning
```

### Backend state (azurerm — required for prod)
```hcl
# environments/prod/backend.tf
terraform {
  required_version = ">= 1.7.0"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
  }
  backend "azurerm" {
    resource_group_name  = "rg-ulp-tfstate"
    storage_account_name = "stulptfstate"  # globally unique
    container_name       = "tfstate"
    key                  = "ulp.prod.tfstate"
    use_oidc             = true            # OIDC from GitHub Actions
  }
}
```

### Provider config with managed identity
```hcl
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false  # NEVER true in prod
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
  use_oidc = true
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}
```

### MySQL Flexible Server (production tier)
```hcl
resource "azurerm_mysql_flexible_server" "ulp" {
  name                   = "mysql-ulp-${var.environment}-${var.region_short}"
  resource_group_name    = azurerm_resource_group.data.name
  location               = var.location
  version                = "8.0.21"
  sku_name               = var.environment == "prod" ? "GP_Standard_D4ds_v4" : "B_Standard_B1ms"
  zone                   = "1"

  administrator_login    = "ulpadmin"
  administrator_password = data.azurerm_key_vault_secret.mysql_password.value

  storage {
    size_gb            = var.environment == "prod" ? 256 : 32
    auto_grow_enabled  = true
    iops               = 1000
  }

  high_availability {
    mode                      = var.environment == "prod" ? "ZoneRedundant" : "Disabled"
    standby_availability_zone = "2"
  }

  backup_retention_days        = var.environment == "prod" ? 35 : 7
  geo_redundant_backup_enabled = var.environment == "prod"

  delegated_subnet_id   = azurerm_subnet.mysql.id
  private_dns_zone_id   = azurerm_private_dns_zone.mysql.id

  tags = local.common_tags
}

# Required ULP charset (matches Pomelo provider expectations)
resource "azurerm_mysql_flexible_server_configuration" "charset" {
  name                = "character_set_server"
  server_id           = azurerm_mysql_flexible_server.ulp.id
  value               = "utf8mb4"
}
```

### Tag every resource with mandatory ULP tags
```hcl
locals {
  common_tags = {
    Project        = "ULP"
    Environment    = var.environment
    Module         = "Platform"
    ManagedBy      = "Terraform"
    CostCenter     = "Engineering"
    DataClass      = "Confidential"
  }
}

# CAF policy enforces these tags - tags missing = deployment denied
```

### Variables / tfvars structure
```hcl
# variables.tf
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev","staging","prod"], var.environment)
    error_message = "environment must be dev|staging|prod"
  }
}
variable "location" { type = string default = "Central India" }
variable "region_short" { type = string default = "cin" }

# environments/prod/terraform.tfvars
environment  = "prod"
location     = "Central India"
region_short = "cin"
```

## Critical gotchas

### NEVER commit .tfstate files or .tfvars with secrets
- `.gitignore`: `*.tfstate`, `*.tfstate.backup`, `.terraform/`, `terraform.tfvars` (only commit `.tfvars.example`)
- Secrets ALWAYS in Key Vault, referenced via `data.azurerm_key_vault_secret`.

### State locking is mandatory for shared environments
- Azure Storage backend has lease-based locking built in.
- NEVER use `terraform apply -lock=false` in CI.

### Plan before apply, always
- CI/CD pattern: `terraform plan -out=tfplan` → human review → `terraform apply tfplan`.
- For prod: require manual approval gate in GitHub Actions Environment.

### Module versioning
- Pin AVM module versions: `source = "Azure/avm-res-web-site/azurerm" version = "0.15.0"`.
- Floating versions (`>= 1.0`) cause unexpected drift between runs.

### Workspaces vs separate state files
- ULP uses **separate state files per environment** (not workspaces).
- Why: workspaces share backend storage; separate state files allow per-env access control.

### MVP -> Production Terraform progression
- **MVP (Phase 1-2):** local Docker Compose only — NO Terraform yet.
- **Phase 3-4:** Terraform spins up dev environment in Azure (Basic tier resources).
- **Phase 5:** Terraform spins up staging + prod (Premium tier, Multi-AZ, private endpoints).

### RBAC — least privilege
- Each environment has its own Service Principal with scoped role assignments.
- GitHub Actions OIDC federation eliminates secret rotation pain.
- NEVER use `Owner` role for CI/CD — use `Contributor` + specific resource roles.

## ULP companion docs
- ULP_DevelopmentGuide_v1.0.docx Section 6 (MVP -> Prod migration)
- ULP_HLD_v1.0_HighLevelDesign.docx (Deployment topology)
- ULP_TechStack_v3.0_Final.xlsx (Infrastructure tab)

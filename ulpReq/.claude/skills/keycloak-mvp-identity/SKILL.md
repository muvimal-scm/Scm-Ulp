---
name: keycloak-mvp-identity
description: Keycloak open-source IAM for ULP MVP authentication. Use when implementing OAuth2 OIDC flows, RBAC, multi-tenant realms, JWT validation, custom claim mappers, brute force protection. The MVP identity provider that swaps to Azure AD B2C for production with config-only changes. Always use this skill for any authentication or authorization work.
---

# Keycloak Identity for ULP MVP

## When this skill triggers
Implementing auth flows, JWT validation, RBAC, multi-tenant identity. Keycloak is the MVP IdP - production swaps to Azure AD B2C via JWT validator config change only.

## Top 3 reference repos
1. **keycloak/keycloak** (https://github.com/keycloak/keycloak) - Official. The `docs/` and `examples/` folder cover REST API and client config.
2. **keycloak/keycloak-quickstarts** (https://github.com/keycloak/keycloak-quickstarts) - Runnable client examples for SPAs, .NET, Spring Boot.
3. **mauricio-andrei/keycloak-angular-realm-config** - Modern Angular + Keycloak integration patterns.

## Realm structure for ULP

- **One realm per environment**: `ulp-dev`, `ulp-staging`, `ulp-prod`
- **Multi-tenancy via groups**: `tenant_<tenant_id>` group; users belong to one or more
- **Custom claim mapper**: emit `tenant_id` and `permissions` in JWT
- **PKCE mandatory** for public clients (SPA, mobile)

## Realm config (Terraform)

```hcl
resource "keycloak_realm" "ulp" {
  realm        = "ulp"
  display_name = "Unified Logistics Platform"
  
  password_policy = "length(12) and upperCase(1) and digits(1) and specialChars(1) and notUsername"
  
  access_token_lifespan = "15m"
  sso_session_idle_timeout = "30m"
  sso_session_max_lifespan = "10h"
  
  brute_force_protected = true
  failure_factor = 5
  wait_increment_seconds = 60
}

resource "keycloak_openid_client" "ulp_web" {
  realm_id            = keycloak_realm.ulp.id
  client_id           = "ulp-web"
  access_type         = "PUBLIC"               # SPA - no client secret
  standard_flow_enabled = true                # Auth code with PKCE
  valid_redirect_uris = ["http://localhost:4200/*", "https://app.ulp.com/*"]
  pkce_code_challenge_method = "S256"
}
```

## Custom protocol mapper (tenant_id claim)

```hcl
resource "keycloak_openid_user_attribute_protocol_mapper" "tenant_id" {
  realm_id            = keycloak_realm.ulp.id
  client_id           = keycloak_openid_client.ulp_web.id
  name                = "tenant-id"
  user_attribute      = "tenant_id"
  claim_name          = "tenant_id"
  claim_value_type    = "String"
  add_to_id_token     = true
  add_to_access_token = true
}
```

## Angular integration

```typescript
import { KeycloakService } from 'keycloak-angular';

export function initKeycloak(keycloak: KeycloakService) {
  return () => keycloak.init({
    config: {
      url: environment.keycloakUrl,
      realm: 'ulp',
      clientId: 'ulp-web'
    },
    initOptions: {
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256',
      checkLoginIframe: false
    },
    bearerExcludedUrls: ['/assets', '/api/v1/public']
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(KeycloakAngularModule),
    {
      provide: APP_INITIALIZER,
      useFactory: initKeycloak,
      multi: true,
      deps: [KeycloakService]
    }
  ]
};
```

## .NET JWT validation

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts => {
        opts.Authority = builder.Configuration["Identity:Authority"];
        opts.Audience = "ulp-api";
        opts.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        opts.Events = new JwtBearerEvents {
            OnTokenValidated = ctx => {
                var tenantId = ctx.Principal!.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantId)) {
                    ctx.Fail("tenant_id claim missing");
                    return Task.CompletedTask;
                }
                ctx.HttpContext.Items["TenantId"] = Guid.Parse(tenantId);
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(opts => {
    opts.AddPolicy("invoice.write", p => p.RequireClaim("permissions", "invoice.write"));
    opts.AddPolicy("invoice.read", p => p.RequireClaim("permissions", "invoice.read"));
});
```

## Gotchas specific to ULP

1. **PKCE mandatory** - never use implicit flow.
2. **tenant_id claim is mandatory** - reject tokens without it.
3. **15-min access tokens, 10-hour refresh** - balance security and UX.
4. **NEVER store tokens in localStorage** - XSS = token theft. Use httpOnly cookies OR in-memory storage with silent refresh.
5. **MVP-to-prod migration**: Keep `Authority` URL configurable. Switch from `http://localhost:8080/realms/ulp` to `https://login.ulp.com/...`.
6. **Brute force protection enabled** - lock account after 5 failed attempts for 1 minute.
7. **Realm config in git** via Terraform - don't manage in UI alone.
8. **Service accounts for backend-to-backend** - client credentials grant. Don't share user tokens.

## Migration to Azure AD B2C
- B2C custom policies replace Keycloak realm config
- Same JWT validation in .NET (just different `Authority` URL)
- Angular `keycloak-angular` swapped for `msal-angular`
- Estimated effort: 2-3 weeks

## ULP companion docs
- Identity strategy: `docs/ULP_HLD_v1.0_HighLevelDesign.docx` Section 6

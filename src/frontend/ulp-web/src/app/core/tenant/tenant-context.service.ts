import { Injectable, computed, inject, signal } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';

export interface TenantContext {
  tenantId: string;
  countryCode: 'IN' | 'US' | string;
  region: string;
  username: string;
  email: string;
  permissions: string[];
}

/**
 * Reads tenant context from the JWT after Keycloak has resolved login.
 * Mirrors backend ITenantContext shape.
 */
@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly keycloak = inject(KeycloakService);

  private readonly _ctx = signal<TenantContext | null>(null);
  readonly ctx = this._ctx.asReadonly();

  readonly isLoaded = computed(() => this._ctx() !== null);
  readonly currency = computed(() => {
    const c = this._ctx()?.countryCode;
    if (c === 'IN') return 'INR';
    if (c === 'US') return 'USD';
    return 'INR';
  });
  readonly locale = computed(() => {
    const c = this._ctx()?.countryCode;
    if (c === 'IN') return 'en-IN';
    if (c === 'US') return 'en-US';
    return 'en-IN';
  });
  readonly timezone = computed(() => {
    const c = this._ctx()?.countryCode;
    if (c === 'IN') return 'Asia/Kolkata';
    if (c === 'US') return 'America/New_York';
    return 'Asia/Kolkata';
  });

  async load(): Promise<void> {
    // Guard the entire flow — keycloak-angular throws if Keycloak failed
    // to initialise (e.g., docker stack down in dev preview).
    let loggedIn = false;
    try {
      loggedIn = this.keycloak.isLoggedIn();
    } catch {
      this._ctx.set(null);
      return;
    }
    if (!loggedIn) {
      this._ctx.set(null);
      return;
    }
    try {
      // The JWT itself carries email + preferred_username + tenant_id + country_code
      // + region + permissions claims (mapped by the realm's ulp-claims scope).
      // We don't need to call loadUserProfile() — that hits Keycloak's /account
      // endpoint, which has its own CORS rules separate from token issuance and
      // blocks the SPA in beta. Reading from tokenParsed avoids that round trip.
      const claims = this.keycloak.getKeycloakInstance().tokenParsed as Record<string, unknown> | undefined;
      if (!claims) {
        this._ctx.set(null);
        return;
      }
      this._ctx.set({
        tenantId: String(claims['tenant_id'] ?? ''),
        countryCode: String(claims['country_code'] ?? ''),
        region: String(claims['region'] ?? ''),
        username: String(claims['preferred_username'] ?? ''),
        email: String(claims['email'] ?? ''),
        permissions: Array.isArray(claims['permissions']) ? (claims['permissions'] as string[]) : [],
      });
    } catch (err) {
      console.warn('[ulp] tenant.load() failed:', err);
      this._ctx.set(null);
    }
  }

  hasPermission(perm: string): boolean {
    return this._ctx()?.permissions.includes(perm) ?? false;
  }

  async logout(): Promise<void> {
    await this.keycloak.logout(window.location.origin);
  }
}

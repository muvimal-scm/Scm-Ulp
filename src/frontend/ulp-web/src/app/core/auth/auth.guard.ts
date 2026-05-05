import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

/**
 * Real auth guard. Keycloak is initialised at app bootstrap (APP_INITIALIZER
 * in app.config.ts). If the user has no SSO session, redirect to the landing
 * page so they can click sign-in.
 */
export const authGuard: CanActivateFn = async () => {
  const keycloak = inject(KeycloakService);
  const router   = inject(Router);
  try {
    if (keycloak.isLoggedIn()) return true;
  } catch {
    /* fall through to redirect */
  }
  await router.navigate(['/']);
  return false;
};

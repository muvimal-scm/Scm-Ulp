import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Adds Keycloak bearer token to requests targeting our API base URL.
 * Skips public assets and external URLs.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloak = inject(KeycloakService);
  const apiBase = environment.apiBaseUrl;

  if (!req.url.startsWith(apiBase) || !keycloak.isLoggedIn()) {
    return next(req);
  }

  return from(keycloak.getToken()).pipe(
    switchMap((token) =>
      next(
        req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      )
    )
  );
};

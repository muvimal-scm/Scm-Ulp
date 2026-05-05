import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloak = inject(KeycloakService);
  const apiBase = environment.apiBaseUrl;

  if (!req.url.startsWith(apiBase) || !keycloak.isLoggedIn()) {
    return next(req);
  }

  // Refresh if the token expires within the next 30 seconds. If updateToken
  // throws (refresh-token expired) force a fresh login so the user can't sit
  // on a dead session sending unauth requests forever.
  const tokenPromise = keycloak
    .updateToken(30)
    .catch(() => { keycloak.login(); return false; })
    .then(() => keycloak.getToken());

  return from(tokenPromise).pipe(
    switchMap((token) =>
      next(
        token
          ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
          : req,
      ),
    ),
  );
};

import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { idempotencyKeyInterceptor } from './core/http/idempotency-key.interceptor';
import { environment } from '../environments/environment';

/**
 * Initialise Keycloak once at app bootstrap so the SPA can pick up an
 * existing SSO session on cold load (after the post-login redirect from
 * Keycloak), and so KeycloakService.isLoggedIn() / getToken() work on
 * the first request the auth interceptor handles.
 *
 * onLoad='check-sso' = passive — does NOT force a login. Click the
 * sign-in button on the landing page to trigger keycloak.login().
 */
function initKeycloak(keycloak: KeycloakService): () => Promise<unknown> {
  return () => keycloak
    .init({
      config: {
        url:      environment.keycloak.url,
        realm:    environment.keycloak.realm,
        clientId: environment.keycloak.clientId,
      },
      initOptions: {
        onLoad: 'check-sso',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
        pkceMethod: 'S256',
      },
      enableBearerInterceptor: true,
      bearerExcludedUrls: [],
    })
    .catch((err) => {
      // Don't block app boot if Keycloak is down — log and let the user
      // see a friendly landing page instead of a white screen.
      console.warn('[ulp] Keycloak init failed (Docker stack down?):', err);
      return false;
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor, idempotencyKeyInterceptor])),
    importProvidersFrom(KeycloakAngularModule),
    {
      provide: APP_INITIALIZER,
      useFactory: initKeycloak,
      multi: true,
      deps: [KeycloakService],
    },
  ],
};

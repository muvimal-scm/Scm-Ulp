import { HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';
import { authInterceptor } from './auth.interceptor';
import { environment } from '../../../environments/environment';

/**
 * CP15 regression guard for the CP1.A fix:
 *   - Token must be refreshed before each API call (not just .getToken())
 *   - If refresh-token is dead, login() is forced
 *   - Non-API URLs are passed through untouched
 *
 * Without these guards a logged-in user with an expired access token
 * silently sends unauthenticated requests → 401 from the API → confusing
 * "session lost" UX.
 */
describe('authInterceptor', () => {
  let http: HttpClient;
  let mock: HttpTestingController;
  let keycloak: jasmine.SpyObj<KeycloakService>;

  beforeEach(() => {
    keycloak = jasmine.createSpyObj<KeycloakService>(
      'KeycloakService',
      ['isLoggedIn', 'updateToken', 'getToken', 'login']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: KeycloakService, useValue: keycloak },
      ],
    });

    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => mock.verify());

  it('passes non-API URLs through without touching the token', async () => {
    const reqPromise = firstValueFrom(http.get('https://example.com/static.json'));
    const req = mock.expectOne('https://example.com/static.json');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(keycloak.updateToken).not.toHaveBeenCalled();
    req.flush({});
    await reqPromise;
  });

  it('passes API request through unauthenticated when not logged in', async () => {
    keycloak.isLoggedIn.and.returnValue(false);
    const reqPromise = firstValueFrom(http.get(`${environment.apiBaseUrl}/api/v1/sales/leads`));
    const req = mock.expectOne(`${environment.apiBaseUrl}/api/v1/sales/leads`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(keycloak.updateToken).not.toHaveBeenCalled();
    req.flush([]);
    await reqPromise;
  });

  it('refreshes the token (updateToken) before adding Bearer header on API calls', async () => {
    keycloak.isLoggedIn.and.returnValue(true);
    keycloak.updateToken.and.resolveTo(true);
    keycloak.getToken.and.resolveTo('jwt-fresh');

    const reqPromise = firstValueFrom(http.get(`${environment.apiBaseUrl}/api/v1/sales/leads`));

    // Wait a microtask so the interceptor's promise chain runs.
    await Promise.resolve();
    await Promise.resolve();

    const req = mock.expectOne(`${environment.apiBaseUrl}/api/v1/sales/leads`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-fresh');
    expect(keycloak.updateToken).toHaveBeenCalledWith(30);
    req.flush([]);
    await reqPromise;
  });

  it('forces login when updateToken throws (refresh-token expired)', async () => {
    keycloak.isLoggedIn.and.returnValue(true);
    keycloak.updateToken.and.rejectWith(new Error('token expired'));
    keycloak.getToken.and.resolveTo(undefined as unknown as string);

    // The request still goes out but without Authorization (login() side-effects).
    const reqPromise = firstValueFrom(http.get(`${environment.apiBaseUrl}/api/v1/sales/leads`));
    await Promise.resolve();
    await Promise.resolve();

    expect(keycloak.login).toHaveBeenCalled();

    const req = mock.expectOne(`${environment.apiBaseUrl}/api/v1/sales/leads`);
    req.flush([]);
    await reqPromise;
  });
});

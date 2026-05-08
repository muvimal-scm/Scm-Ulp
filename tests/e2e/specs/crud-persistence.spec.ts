import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * E2E: CRUD persistence — proves browser-driven mutations actually round-trip
 * through SPA → API → MySQL → API → SPA.
 *
 * Strategy: do the action via UI, then independently fetch the row via the
 * REST API and assert it exists with the right shape. The redirect-back-to-list
 * pattern in import-flow.spec.ts only proves the SPA *thinks* it succeeded;
 * this proves the row really persisted.
 */

const TEST_USER = 'in-admin@ulp.local';
const TEST_PASS = 'DevPass!2345';

async function loginViaKeycloak(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.locator('#username').fill(TEST_USER);
  await page.locator('#password').fill(TEST_PASS);
  await page.locator('#kc-login').click();
  await page.waitForURL(/\/app(\/dashboard)?\/?$/, { timeout: 15_000 });
}

async function getApiToken(request: APIRequestContext): Promise<string> {
  const r = await request.post('http://localhost:8080/realms/ulp/protocol/openid-connect/token', {
    form: {
      client_id: 'ulp-web',
      grant_type: 'password',
      username: TEST_USER,
      password: TEST_PASS,
    },
  });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  return body.access_token as string;
}

test.describe('Browser-driven CRUD persists end-to-end', () => {

  test('Lead create — UI submit, API confirms row exists in DB', async ({ page, request }) => {
    await loginViaKeycloak(page);

    // Unique contact name so we can find this exact row, never clashing with
    // prior test runs.
    const stamp = Date.now();
    const contactName = `Persist-Test-${stamp}`;

    // Navigate via the UI — exercises router + lazy-load + form bootstrap.
    await page.goto('/app/sales/leads');
    await page.getByRole('link', { name: /new lead/i }).first().click();
    await expect(page).toHaveURL(/\/sales\/leads\/new$/);

    // Lead # auto-populates (LD-YYYYMM-DDhhmm); only contactName is required
    // beyond that — fill it and submit.
    await page.getByLabel(/contact name/i).fill(contactName);
    await page.getByRole('button', { name: /create lead/i }).click();

    // Redirect back — this is what import-flow.spec already verifies.
    await expect(page).toHaveURL(/\/sales\/leads$/, { timeout: 10_000 });

    // The deeper proof: independently fetch via REST and assert the row exists.
    const token = await getApiToken(request);
    const list = await request.get('http://localhost:5080/api/v1/sales/leads', {
      params: { page: 1, pageSize: 200 },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    const row = (body.items ?? body).find((l: any) => l.contactName === contactName);
    expect(row, `lead with contactName ${contactName} not found in API response`).toBeTruthy();

    // Spot-check the shape so a regression that strips fields is caught here.
    // LD-YYYYMMDD-hhmmssMMM → LD- + 8 digits + - + 9 digits
    expect(row.leadNumber).toMatch(/^LD-\d{8}-\d{9}$/);
    expect(row.stage).toBe('New');
    expect(row.source).toBe('Web');
    expect(typeof row.id).toBe('number');
    expect(row.id).toBeGreaterThan(0);
  });
});

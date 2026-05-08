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

  test('Booking create — UI submit, API confirms row in DB', async ({ page, request }) => {
    await loginViaKeycloak(page);

    await page.goto('/app/freight-forwarding/bookings');
    await page.getByRole('link', { name: /new booking/i }).first().click();
    await expect(page).toHaveURL(/\/freight-forwarding\/bookings\/new$/);

    // bookingNumber auto-populates. Customer party 101 (Tata Steel) + ports 1
    // (INNSA Nhava Sheva) and 2 (INMUN Mundra) are seeded fixtures.
    await page.getByLabel(/customer/i).fill('101');
    await page.getByLabel(/origin port/i).fill('1');
    await page.getByLabel(/destination port/i).fill('2');
    await page.getByRole('button', { name: /create booking/i }).click();

    // Booking detail page is the success destination — id is in the URL.
    await page.waitForURL(/\/freight-forwarding\/bookings\/\d+$/, { timeout: 10_000 });
    const newBookingId = Number(page.url().match(/\/bookings\/(\d+)$/)?.[1]);
    expect(newBookingId).toBeGreaterThan(0);

    // Independent verification via API.
    const token = await getApiToken(request);
    const detail = await request.get(`http://localhost:5080/api/v1/freight-forwarding/bookings/${newBookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detail.ok()).toBeTruthy();
    const body = await detail.json();
    const b = body.booking ?? body;
    expect(b.id).toBe(newBookingId);
    expect(b.customerPartyId).toBe(101);
    expect(b.originPortId).toBe(1);
    expect(b.destinationPortId).toBe(2);
    expect(b.tradeDirection).toBe('Import');
    expect(b.mode).toBe('OceanFcl');
    expect(b.bookingNumber).toMatch(/^BKG-/);
    expect(b.status).toMatch(/Draft|Confirmed/);
  });

  test('Vendor create — UI submit, API confirms row in DB', async ({ page, request }) => {
    await loginViaKeycloak(page);

    // Find an existing party that's not yet onboarded as a vendor — the
    // form's "party already has a vendor record" guard rejects re-uses, and
    // the seed ships with all 5 VENDOR-typed parties already onboarded.
    const token = await getApiToken(request);
    const partiesResp = await request.get('http://localhost:5080/api/v1/master-data/parties', {
      params: { pageSize: 200 },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(partiesResp.ok()).toBeTruthy();
    const partiesBody = await partiesResp.json();
    const parties: any[] = partiesBody.items ?? partiesBody;

    const vendorsResp = await request.get('http://localhost:5080/api/v1/vendor-management/vendors', {
      params: { page: 1, pageSize: 500 },
      headers: { Authorization: `Bearer ${token}` },
    });
    const vendorsBody = await vendorsResp.json();
    const onboardedPartyIds = new Set<number>(
      (vendorsBody.items ?? vendorsBody).map((v: any) => v.partyId)
    );

    // Pick any party not yet onboarded. Filter to VENDOR/CARRIER/BROKER types
    // — the backend's CreateVendor validator requires the party to be one of
    // those (a CUSTOMER party can't legally be onboarded as a vendor record).
    const eligible = parties.filter((p) =>
      ['Vendor', 'Carrier', 'Broker', 'VENDOR', 'CARRIER', 'BROKER'].includes(p.partyType)
    );
    const candidate = eligible.find((p) => !onboardedPartyIds.has(p.id));
    test.skip(!candidate,
      'no un-onboarded VENDOR/CARRIER/BROKER party left; run factory-reset to refresh fixture');

    const partyId = candidate!.id as number;

    await page.goto('/app/vendor-management');
    await page.getByRole('link', { name: /create vendor/i }).first().click();
    await expect(page).toHaveURL(/\/vendor-management\/new$/);

    // vendorCode auto-populates.
    await page.getByLabel(/party/i).fill(String(partyId));
    await page.getByRole('button', { name: /create vendor/i }).click();

    // Form lands on list (or detail) — both confirm successful save.
    await page.waitForURL(/\/vendor-management(\/\d+)?$/, { timeout: 10_000 });

    // Independent verification.
    const after = await request.get('http://localhost:5080/api/v1/vendor-management/vendors', {
      params: { page: 1, pageSize: 500 },
      headers: { Authorization: `Bearer ${token}` },
    });
    const afterBody = await after.json();
    const items = afterBody.items ?? afterBody;
    const row = items.find((v: any) => v.partyId === partyId);
    expect(row, `vendor for partyId=${partyId} not found`).toBeTruthy();
    expect(row.vendorCode).toMatch(/^VEN-/);
  });
});

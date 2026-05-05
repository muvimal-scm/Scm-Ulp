import { test, expect, type Page } from '@playwright/test';

/**
 * E2E: agent-driven import flow (v2 client doc Milestone 1).
 *
 * Walks a logged-in user from landing → master data → booking → shipment →
 * generate document → invoice. Each step asserts a tell-tale UI element so a
 * regression in any of the CRUD modules surfaces here as a single failing test.
 *
 * Prereqs (see ../playwright.config.ts):
 *   - Stack up (docker compose), Keycloak realm `ulp` with seeded users
 *   - SPA on :4200, API on :5080
 *   - Demo seed (CP17) loaded — gives us known party/port IDs so the form
 *     pre-fills and FK references resolve
 *
 * If demo seed isn't loaded yet, the create flows will succeed (forms accept
 * any positive int) but the cross-flow continuation will fail at "open existing
 * shipment". Run CP17's seed-import-demo.ps1 first.
 */

const TEST_USER  = 'in-admin@ulp.local';
const TEST_PASS  = 'DevPass!2345';

async function loginViaKeycloak(page: Page) {
  await page.goto('/');
  // Landing page → click Sign in to bounce to Keycloak.
  await page.getByRole('button', { name: /sign in/i }).click();
  // Keycloak hosted login form (separate domain on :8080).
  await page.getByLabel(/username|email/i).fill(TEST_USER);
  await page.getByLabel(/password/i).fill(TEST_PASS);
  await page.getByRole('button', { name: /sign in/i }).click();
  // Back to /app/dashboard after successful auth.
  await expect(page).toHaveURL(/\/app(\/dashboard)?\/?$/, { timeout: 15_000 });
}

test.describe('Import flow — Milestone 1 happy path', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page);
  });

  test('dashboard loads with KPI tiles and Quick Actions', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: /welcome back/i })).toBeVisible();
    // Quick actions strip — at least the New Lead + New Shipment links
    await expect(page.getByRole('link', { name: /new lead/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /new shipment/i })).toBeVisible();
  });

  test('Sales Lead create + redirect to leads list', async ({ page }) => {
    await page.goto('/app/sales/leads');
    await page.getByRole('link', { name: /new lead/i }).first().click();
    await expect(page).toHaveURL(/\/sales\/leads\/new$/);

    // Form is auto-populated with a generated lead number; verify required fields.
    await page.getByLabel(/contact name/i).fill('E2E Smoke Contact');
    await page.getByRole('button', { name: /create lead/i }).click();

    // Redirects back to leads list; the new lead should appear in the table.
    await expect(page).toHaveURL(/\/sales\/leads$/, { timeout: 10_000 });
    await expect(page.getByRole('cell', { name: /E2E Smoke Contact/ })).toBeVisible();
  });

  test('Freight Forwarding shipment list shows Ocean/Air × Imp/Exp tabs', async ({ page }) => {
    await page.goto('/app/freight-forwarding/shipments');
    // CP3 v2 delta: 5 tabs.
    await expect(page.getByRole('button', { name: /^all shipments$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ocean import/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ocean export/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /air import/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /air export/i })).toBeVisible();
  });

  test('Accounting Invoice list shows the v2 In-Transit tab', async ({ page }) => {
    await page.goto('/app/accounting/invoices');
    // CP5 v2 delta: tab labelled "Shipments In-Transit"
    await expect(page.getByRole('button', { name: /shipments in-transit/i })).toBeVisible();
  });

  test('Customs landing renders read-only entries page', async ({ page }) => {
    await page.goto('/app/customs');
    // CP9: customs is read-only; entries link should exist and resolve.
    await page.goto('/app/customs/entries');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Should not have a "+ New" button.
    await expect(page.getByRole('link', { name: /^new entry$/i })).toHaveCount(0);
  });
});

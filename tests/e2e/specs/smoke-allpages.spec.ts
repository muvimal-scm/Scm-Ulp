import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Broad-shallow smoke: log in once, visit every major page, screenshot it,
 * record any browser console error or network 4xx/5xx. Goal: surface bugs that
 * only manifest at runtime in the browser (auth callback, route guards, table
 * rendering, form bootstrap), not catch logic regressions — the import-flow
 * spec already does that.
 *
 * Prereqs: SPA on :4200, API on :5080, KC on :8080 with seeded in-admin user,
 * demo seed (CP17) loaded.
 */

const TEST_USER = 'in-admin@ulp.local';
const TEST_PASS = 'DevPass!2345';

const PAGES_TO_SMOKE = [
  '/app/dashboard',
  '/app/sales/leads',
  '/app/sales/opportunities',
  '/app/sales/activities',
  '/app/master-data/parties',
  '/app/master-data/products',
  '/app/freight-forwarding/bookings',
  '/app/freight-forwarding/shipments',
  '/app/freight-forwarding/shipments/9001',                  // demo shipment detail
  '/app/pricing-quotation/rate-cards',
  '/app/pricing-quotation/quotes',
  '/app/procurement/purchase-orders',
  '/app/vendor-management',
  '/app/last-mile/bookings',
  '/app/accounting/invoices',
  '/app/accounting/bills',
  '/app/customs/entries',
  '/app/document-management/documents',
  '/app/notifications/inbox',
  '/app/identity/users',
];

const SCREENSHOT_DIR = path.join(__dirname, '..', 'smoke-screenshots');

test.describe('Browser smoke — every page renders without errors', () => {
  // Capture errors per-page; report all at the end so one bad page doesn't mask others.
  const failuresByPage = new Map<string, string[]>();

  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  async function loginViaKeycloak(page: Page) {
    await page.goto('/');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Keycloak's hosted login form. Use IDs (stable) instead of labels — the
    // password label resolves to BOTH the input and a "Show password" toggle.
    await page.locator('#username').fill(TEST_USER);
    await page.locator('#password').fill(TEST_PASS);
    await page.locator('#kc-login').click();
    await page.waitForURL(/\/app(\/dashboard)?\/?$/, { timeout: 20_000 });
  }

  test('login + visit every major page, capture errors + screenshots', async ({ page }) => {
    const allErrors: string[] = [];

    page.on('pageerror', (e) => { allErrors.push(`[pageerror on ${page.url()}] ${e.message}`); });
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        allErrors.push(`[console.error on ${page.url()}] ${msg.text()}`);
      }
    });
    page.on('response', (resp) => {
      const status = resp.status();
      const url = resp.url();
      // Ignore Keycloak's normal flow + dev-server hot-update probes.
      if (url.includes(':8080/') || url.includes('/@vite') || url.includes('/sockjs')) return;
      if (status >= 400 && status !== 401 /* auth challenge is expected on first call */) {
        allErrors.push(`[HTTP ${status}] ${url}`);
      }
    });

    await loginViaKeycloak(page);

    for (const route of PAGES_TO_SMOKE) {
      const before = allErrors.length;
      try {
        await page.goto(route, { waitUntil: 'networkidle', timeout: 20_000 });
        // Give SPA-routed renders + lazy chunks a moment to settle.
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(800);
      } catch (e: any) {
        allErrors.push(`[nav fail] ${route}: ${e?.message ?? e}`);
      }

      const safeName = route.replace(/^\//, '').replace(/[^A-Za-z0-9_-]+/g, '_');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${String(PAGES_TO_SMOKE.indexOf(route)).padStart(2, '0')}-${safeName}.png`),
        fullPage: false,
      }).catch(() => { /* screenshot is best-effort */ });

      const newErrs = allErrors.slice(before);
      if (newErrs.length > 0) failuresByPage.set(route, newErrs);
    }

    // Write consolidated report to disk — stdout truncates at 30k chars and
    // hides the actual error messages on a 19-page-fails-each-with-2-errs run.
    const reportPath = path.join(__dirname, '..', 'smoke-report.txt');
    const lines: string[] = [`Smoke report — ${new Date().toISOString()}`, ''];
    for (const [route, errs] of failuresByPage.entries()) {
      lines.push(`  ${route}`);
      errs.forEach((e) => lines.push(`    - ${e}`));
      lines.push('');
    }
    fs.writeFileSync(reportPath, lines.join('\n'));
    console.log(`Smoke report written: ${reportPath} (${failuresByPage.size} pages with errors)`);

    expect(failuresByPage.size, `pages with errors: see ${reportPath}`).toBe(0);
  });
});

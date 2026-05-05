import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ULP / SCMCube E2E tests.
 *
 * One scenario lives here today (`import-flow.spec.ts`) — walks an authenticated
 * user through Master Data → Booking → Shipment → Generate Doc → Invoice. That
 * scenario is the agent-driven import-flow demo path the v2 client doc calls
 * out for Milestone 1 beta.
 *
 * The test assumes:
 *   - SPA running at http://localhost:4200
 *   - API running at http://localhost:5080
 *   - Keycloak running at http://localhost:8080 with the seeded `in-admin@ulp.local` user
 *   - Demo seed loaded (CP17). Without seeded fixtures the create flows still work
 *     but FK lookups (party IDs, port IDs) need to match real seed values.
 *
 * Run via: `npx playwright test` from this folder. CI integration lands in CP16.
 */
export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,                    // serial — tests share the demo seed
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env['ULP_BASE_URL'] || 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

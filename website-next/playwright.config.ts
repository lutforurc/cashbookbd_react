import { defineConfig, devices } from '@playwright/test';

/**
 * Local end-to-end tests for the website feature.
 *
 * Two servers must already be running (see e2e/README.md):
 *   - Laravel on 127.0.0.1:8123 with SITE_DOMAIN=cashbookbd.test
 *     (APP_URL=http://aft.cashbookbd.test)
 *   - this Next.js app on 127.0.0.1:3000 with LARAVEL_INTERNAL_URL and
 *     NEXT_DEV_PROXY=1
 *
 * The tenant hosts are mapped to the loopback inside Chromium, so requests
 * carry the real Host and Laravel resolves the right tenant.
 */
const TENANT_HOSTS = ['aft.cashbookbd.test', 'bravo.cashbookbd.test', 'nobody.cashbookbd.test'];
const PORT = process.env.E2E_PORT ?? '3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://aft.cashbookbd.test:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: {
      args: [`--host-resolver-rules=${TENANT_HOSTS.map((h) => `MAP ${h} 127.0.0.1`).join(',')}`],
    },
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
});

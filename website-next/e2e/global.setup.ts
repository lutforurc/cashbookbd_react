import { test } from '@playwright/test';
import { OWNER, VIEWER } from './helpers';

/**
 * Signs in once per account and saves the cookies, so the specs do not each
 * spend one of the five login attempts the rate limiter allows per minute.
 * The specs that test signing in itself still do it through the form.
 */

async function saveSession(page: import('@playwright/test').Page, user: { email: string; password: string }, path: string) {
  await page.goto('/site/login');
  await page.fill('[data-testid=login-id]', user.email);
  await page.fill('[data-testid=login-password]', user.password);
  await page.click('[data-testid=login-submit]');
  await page.waitForURL('**/site');
  await page.context().storageState({ path });
}

test('owner session', async ({ page }) => {
  await saveSession(page, OWNER, '.auth/owner.json');
});

test('viewer session', async ({ page }) => {
  await saveSession(page, VIEWER, '.auth/viewer.json');
});

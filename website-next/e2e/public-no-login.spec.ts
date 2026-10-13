import { expect, test } from '@playwright/test';
import { ANONYMOUS } from './helpers';

/**
 * localhost:3000 is the local development instance. It has no company host of
 * its own, so the company it represents is named explicitly in
 * .env.development (SITE_HOST). A logged-out visitor must see the PUBLISHED
 * company website -- never a redirect to /login.
 */
test.use({ storageState: ANONYMOUS, baseURL: 'http://localhost:3000' });

test.describe('localhost without a session', () => {
  test('/ serves the published website, not a login redirect', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    expect(page.url()).not.toContain('/login');
    await expect(page.locator('main h1')).toBeVisible();
  });

  test('/about is public', async ({ page }) => {
    const response = await page.goto('/about');

    expect(response?.status()).toBe(200);
    expect(page.url()).not.toContain('/login');
  });

  test('/products is public', async ({ page }) => {
    const response = await page.goto('/products');

    expect(response?.status()).toBe(200);
    expect(page.url()).not.toContain('/login');
  });

  test('/login is the application login, not the website', async ({ page }) => {
    const response = await page.goto('/login');

    expect(response?.status()).toBe(200);
    await expect(page.locator('input[name=password]')).toBeVisible();
  });
});

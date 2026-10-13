import { expect, test } from '@playwright/test';
import { ANONYMOUS, OWNER, OWNER_STATE, VIEWER_STATE } from './helpers';

test.describe('builder sign-in', () => {
  test.use({ storageState: ANONYMOUS });

  test('an unauthenticated visitor is sent to the builder sign-in', async ({ page }) => {
    await page.goto('/site');
    await page.waitForURL('**/site/login');
    await expect(page.locator('[data-testid=login-submit]')).toBeVisible();
  });

  test('a wrong password is reported on the sign-in form', async ({ page }) => {
    await page.goto('/site/login');
    await page.fill('[data-testid=login-id]', OWNER.email);
    await page.fill('[data-testid=login-password]', 'definitely-wrong');
    await page.click('[data-testid=login-submit]');

    await expect(page.locator('[data-testid=login-error]')).toBeVisible();
  });
});

test.describe('an owner', () => {
  test.use({ storageState: OWNER_STATE });

  test('reaches the setup screen', async ({ page }) => {
    await page.goto('/site');
    await expect(page.getByRole('heading', { name: 'Website setup' })).toBeVisible();
    await expect(page.locator('[data-testid=save-settings]')).toBeVisible();
  });
});

test.describe('a view-only user', () => {
  test.use({ storageState: VIEWER_STATE });

  test('may read the setup screen but is refused a write', async ({ page }) => {
    await page.goto('/site');
    await expect(page.getByRole('heading', { name: 'Website setup' })).toBeVisible();

    await page.click('[data-testid=save-settings]');
    await expect(page.locator('[data-testid=notice-err]')).toBeVisible();
  });
});

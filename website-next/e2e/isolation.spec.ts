import { expect, test } from '@playwright/test';
import { ANONYMOUS, host } from './helpers';

// The public site needs no session; keep these requests anonymous.
test.use({ storageState: ANONYMOUS });

test.describe('tenant isolation', () => {
  test('a page that only aft has is served on aft', async ({ page }) => {
    const response = await page.goto(host('aft') + '/aft-only');
    expect(response?.status()).toBe(200);
    expect(await page.title()).toContain('Aft Only');
  });

  test('the same page is not reachable on the other tenant host', async ({ page }) => {
    const response = await page.goto(host('bravo') + '/aft-only');
    expect(response?.status()).toBe(404);
  });

  test('an unknown host gets a public 404, never the admin login', async ({ page }) => {
    // No site resolves: the visitor is told so, publicly. They are NOT sent to
    // /login -- '/' belongs to the company website, not to the admin.
    const response = await page.goto(host('nobody') + '/');
    expect(response?.status()).toBe(404);
    expect(page.url()).not.toContain('/login');
    await expect(page.getByRole('heading', { name: /not available/i })).toBeVisible();
  });
});

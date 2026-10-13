import { expect, test } from '@playwright/test';
import { OWNER_STATE } from './helpers';

test.use({ storageState: OWNER_STATE });

/** The pages list is ordered by sort, so the home page is the first row. */
async function openHomeBuilder(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/site/pages');
  await page.locator('tbody tr').first().getByRole('link', { name: 'Builder' }).click();
  await page.waitForURL('**/builder');

  return page.url();
}

test.describe('builder edit, preview and publish', () => {
  test('a draft stays private until it is published', async ({ page }) => {
    const marker = 'E2E heading ' + Date.now();

    const builderUrl = await openHomeBuilder(page);

    // Add a text section and give it a heading we can look for.
    await page.selectOption('[data-testid=add-section]', 'text');
    await page.fill('[data-testid=field-heading]', marker);

    await page.click('[data-testid=save-draft]');
    await expect(page.locator('[data-testid=notice-ok]')).toBeVisible();

    // The preview renders the draft, so it carries the unpublished heading...
    await page.click('[data-testid=open-preview]');
    await page.waitForURL('**/preview');
    await expect(page.locator('[data-testid=preview-frame]')).toContainText(marker);

    // ...but the public site must not, yet.
    await page.goto('/');
    await expect(page.locator('main')).not.toContainText(marker);

    // Publish, and then it must.
    await page.goto(builderUrl);
    await page.click('[data-testid=publish-page]');
    await expect(page.locator('[data-testid=notice-ok]')).toContainText(/publish/i);

    await page.goto('/');
    await expect(page.locator('main')).toContainText(marker);
  });

  test('sections can be reordered', async ({ page }) => {
    await openHomeBuilder(page);

    const items = page.locator('[data-testid=section-item]');
    await expect(items.nth(1)).toBeVisible();
    expect(await items.count()).toBeGreaterThan(1);

    const firstBefore = (await items.nth(0).innerText()).replace(/\s+/g, ' ').trim();
    const secondBefore = (await items.nth(1).innerText()).replace(/\s+/g, ' ').trim();

    await items.nth(1).getByRole('button', { name: 'Move up' }).click();

    const firstAfter = (await page.locator('[data-testid=section-item]').nth(0).innerText()).replace(/\s+/g, ' ').trim();

    expect(firstAfter).not.toBe(firstBefore);
    expect(firstAfter).toBe(secondBefore);
  });
});

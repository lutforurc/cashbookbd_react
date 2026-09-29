import { expect, test, type Page } from '@playwright/test';
import { OWNER_STATE } from './helpers';

test.use({ storageState: OWNER_STATE });

/** Accept the "are you sure" confirm that guards applying a template. */
function autoAcceptDialogs(page: Page) {
  page.on('dialog', (dialog) => dialog.accept());
}

test.describe('website templates gallery', () => {
  test('the gallery shows both templates, rendered in the browser', async ({ page }) => {
    await page.goto('/site/templates');

    await expect(page.getByRole('heading', { name: 'Professional' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Modern Shop' })).toBeVisible();

    // Each card renders its own template, live, with the shared section components.
    await expect(page.locator('[data-testid=template-card-professional] [data-testid=template-preview]'))
      .toContainText('Welcome to our company');
    await expect(page.locator('[data-testid=template-card-shop] [data-testid=template-preview]'))
      .toContainText('Quality you can trust');

    await page.screenshot({ path: 'test-results/templates-gallery.png', fullPage: false });
  });

  test('each template opens in its own full preview', async ({ page }) => {
    await page.goto('/site/templates/professional');
    await expect(page.locator('[data-testid=template-preview]')).toContainText('Welcome to our company');
    await expect(page.getByTestId('use-template')).toBeVisible();
    await page.screenshot({ path: 'test-results/template-professional.png', fullPage: false });

    await page.goto('/site/templates/shop');
    await expect(page.locator('[data-testid=template-preview]')).toContainText('Quality you can trust');
    await expect(page.getByTestId('use-template')).toBeVisible();
    await page.screenshot({ path: 'test-results/template-shop.png', fullPage: false });
  });

  test('selecting a template changes the draft only, then publishing makes it live', async ({ page }) => {
    autoAcceptDialogs(page);
    const marker = 'E2E shop heading ' + Date.now();

    // The published site is currently the Professional template.
    await page.goto('/');
    await expect(page.locator('main h1')).toContainText('Welcome to our company');

    // Apply the Modern Shop template from the gallery.
    await page.goto('/site/templates');
    await page.click('[data-testid=use-template-shop]');
    await expect(page.locator('[data-testid=notice-ok]')).toContainText(/applied to your draft/i);

    // ⚠️ The published website must NOT have changed.
    await page.goto('/');
    await expect(page.locator('main h1')).toContainText('Welcome to our company');

    // Edit the draft the template created, then publish it.
    await page.goto('/site/pages');
    await page.locator('tbody tr').first().getByRole('link', { name: 'Builder' }).click();
    await page.waitForURL('**/builder');
    await expect(page.locator('[data-testid=section-item]').first()).toBeVisible();
    await page.fill('[data-testid=field-heading]', marker);
    await page.click('[data-testid=save-draft]');
    await expect(page.locator('[data-testid=notice-ok]')).toBeVisible();
    await page.click('[data-testid=publish-page]');
    await expect(page.locator('[data-testid=notice-ok]')).toContainText(/publish/i);

    // Now it is live.
    await page.goto('/');
    await expect(page.locator('main h1')).toContainText(marker);

    // ---- restore the Professional template, so the fixture is left as found.
    await page.goto('/site/templates');
    await page.click('[data-testid=use-template-professional]');
    await expect(page.locator('[data-testid=notice-ok]')).toContainText(/applied to your draft/i);
    await page.goto('/site');
    await page.click('[data-testid=publish-site]');
    await expect(page.locator('[data-testid=notice-ok]')).toContainText(/publish/i);

    await page.goto('/');
    await expect(page.locator('main h1')).toContainText('Welcome to our company');
  });
});

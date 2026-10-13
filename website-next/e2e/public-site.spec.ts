import { expect, test } from '@playwright/test';
import { ANONYMOUS } from './helpers';

test.use({ storageState: ANONYMOUS });

test.describe('public company website', () => {
  test('the home page renders with title, canonical and metadata', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await expect(page.locator('h1')).toContainText('Welcome to our company');

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /aft\.cashbookbd\.test\/$/);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', /./);

    // Responsive: the viewport meta is present.
    await expect(page.locator('meta[name=viewport]')).toHaveAttribute('content', /width=device-width/);
  });

  test('a page is served by slug with the "Title — brand" convention', async ({ page }) => {
    const response = await page.goto('/about');
    expect(response?.status()).toBe(200);

    expect(await page.title()).toContain('About');
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/about$/);
  });

  test('the catalogue is served and never exposes cost', async ({ page }) => {
    const response = await page.goto('/products');
    expect(response?.status()).toBe(200);

    const html = await page.content();
    expect(html).not.toContain('purchase_price');
    expect(html).not.toContain('purchase_pct');

    await expect(page.locator('.card').first()).toBeVisible();
  });

  test('sitemap.xml lists the tenant URLs', async ({ page }) => {
    await page.goto('/sitemap.xml');
    const xml = await page.content();

    expect(xml).toContain('aft.cashbookbd.test/');
    expect(xml).toContain('/products');
    expect(xml).toContain('/about');
  });

  test('robots.txt points at the sitemap', async ({ page }) => {
    await page.goto('/robots.txt');
    const body = await page.content();

    expect(body).toContain('Sitemap:');
    expect(body).toContain('/sitemap.xml');
  });
});

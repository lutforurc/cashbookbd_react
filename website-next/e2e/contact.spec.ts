import { expect, test } from '@playwright/test';
import { OWNER_STATE } from './helpers';

// The owner's session is reused; the public form itself needs no session.
test.use({ storageState: OWNER_STATE });

test.describe('contact form', () => {
  test('a submission is stored and appears in the builder', async ({ page }) => {
    const marker = 'E2E message ' + Date.now();

    await page.goto('/contact');
    await page.fill('[data-testid=contact-name]', 'E2E Visitor');
    await page.fill('[data-testid=contact-email]', 'visitor@example.test');
    await page.fill('[data-testid=contact-message]', marker);
    await page.click('[data-testid=contact-submit]');

    await expect(page.locator('[data-testid=contact-sent]')).toBeVisible();

    await page.goto('/site/messages');
    await expect(page.getByText(marker)).toBeVisible();
  });

  test('a honeypot submission is answered but not stored', async ({ page }) => {
    const marker = 'E2E bot ' + Date.now();

    await page.goto('/contact');
    await page.fill('[data-testid=contact-name]', 'Bot');
    await page.fill('[data-testid=contact-message]', marker);

    // Fill the hidden trap the way a bot would.
    await page.evaluate(() => {
      const trap = document.querySelector('input[name="company_website_url"]') as HTMLInputElement | null;
      if (trap) trap.value = 'http://spam.example';
    });

    await page.click('[data-testid=contact-submit]');
    await expect(page.locator('[data-testid=contact-sent]')).toBeVisible();

    await page.goto('/site/messages');
    await expect(page.getByText(marker)).toHaveCount(0);
  });
});

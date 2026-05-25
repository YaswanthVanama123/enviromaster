/**
 * Playwright E2E Tests for Pure Janitorial Form
 *
 * Tests form interactions and calculations in a real browser
 */

import { test, expect, Page, Locator } from '@playwright/test';

// Helper function to login
async function login(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });
  await page.fill('input[placeholder="Enter your username"]', 'mark');
  await page.fill('input[placeholder="Enter your password"]', 'Mark@123');
  await page.click('button:has-text("Sign in as Employee")');
  await page.waitForURL(/(?!.*login).*/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

// Helper function to setup Janitorial form and get its container
async function setupJanitorialForm(page: Page): Promise<Locator> {
  // Scroll to Services section
  await page.locator('text=SERVICES').first().scrollIntoViewIfNeeded().catch(() => {});

  // Click Pure Janitorial tab
  const janitorialTab = page.locator('button:has-text("Pure Janitorial")');
  if (await janitorialTab.isVisible().catch(() => false)) {
    await janitorialTab.click();
    await page.waitForTimeout(500);
  }

  // Wait for JANITORIAL header and get the form container
  // The form is in a div with class "svc-card" that contains the JANITORIAL header
  const janitorialForm = page.locator('.svc-card').filter({ has: page.locator('text=JANITORIAL') }).first();
  await janitorialForm.waitFor({ timeout: 5000 }).catch(() => {});

  return janitorialForm;
}

test.describe('Pure Janitorial Form E2E Tests', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('page loads successfully', async ({ page }) => {
    expect(await page.content()).toBeTruthy();
  });

  test('displays JANITORIAL header', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    await expect(janitorialForm.locator('text=JANITORIAL').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows Frequency label in Janitorial form', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    // Scope to janitorial form and use exact match
    await expect(janitorialForm.locator('label').filter({ hasText: /^Frequency$/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows Square Feet label', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    await expect(janitorialForm.locator('label:has-text("Square Feet")')).toBeVisible({ timeout: 10000 });
  });

  test('shows Place Type label', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    await expect(janitorialForm.locator('label:has-text("Place Type")')).toBeVisible({ timeout: 10000 });
  });

  test('shows Hours Per Visit label', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    await expect(janitorialForm.locator('label:has-text("Hours Per Visit")')).toBeVisible({ timeout: 10000 });
  });

  test('shows Cost Per Hour label', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    await expect(janitorialForm.locator('label:has-text("Cost Per Hour")')).toBeVisible({ timeout: 10000 });
  });

  test('does not show Pricing Summary when Square Feet is 0', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    await expect(janitorialForm.locator('text=Pricing Summary')).not.toBeVisible();
  });

  test('entering Square Feet shows Pricing Summary', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');

    await sqFtInput.click();
    await sqFtInput.fill('2000');
    await sqFtInput.press('Tab');

    await expect(janitorialForm.locator('text=Pricing Summary')).toBeVisible({ timeout: 5000 });
  });

  test('Square Feet change updates Hours Per Visit', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');

    await sqFtInput.click();
    await sqFtInput.fill('2000');
    await sqFtInput.press('Tab');

    // Hours Per Visit should have a value with "hrs"
    const hoursRow = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Hours Per Visit")') });
    const hoursInput = hoursRow.locator('input');
    await expect(hoursInput).toHaveValue(/^\d+\.\d+ hrs$/, { timeout: 5000 });
  });

  test('shows Supply Line Items section', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    await expect(janitorialForm.locator('text=Supply Line Items')).toBeVisible({ timeout: 10000 });
  });

  test('shows Vacuums supply item', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    await expect(janitorialForm.locator('label:has-text("Vacuums")')).toBeVisible({ timeout: 10000 });
  });

  test('shows Mops supply item', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    // Use exact match to avoid matching "Dust Mops"
    await expect(janitorialForm.locator('label').filter({ hasText: /^Mops$/ })).toBeVisible({ timeout: 10000 });
  });

  test('clearing Square Feet hides Pricing Summary', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');

    // First add sqFt
    await sqFtInput.click();
    await sqFtInput.fill('1000');
    await sqFtInput.press('Tab');

    // Verify Pricing Summary is visible
    await expect(janitorialForm.locator('text=Pricing Summary')).toBeVisible({ timeout: 5000 });

    // Clear sqFt
    await sqFtInput.click();
    await sqFtInput.fill('0');
    await sqFtInput.press('Tab');

    // Pricing Summary should be hidden
    await expect(janitorialForm.locator('text=Pricing Summary')).not.toBeVisible({ timeout: 5000 });
  });

  test('full calculation shows Annual Base Labor', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');

    await sqFtInput.click();
    await sqFtInput.fill('1000');
    await sqFtInput.press('Tab');

    // Scroll to make sure pricing summary is visible
    await janitorialForm.locator('text=Annual Base Labor').scrollIntoViewIfNeeded().catch(() => {});
    await expect(janitorialForm.locator('text=Annual Base Labor')).toBeVisible({ timeout: 5000 });
  });

  test('full calculation shows Contract Total', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');

    await sqFtInput.click();
    await sqFtInput.fill('1000');
    await sqFtInput.press('Tab');

    // Scroll to Contract Total
    const contractTotal = janitorialForm.locator('label:has-text("Contract Total")');
    await contractTotal.scrollIntoViewIfNeeded().catch(() => {});
    await expect(contractTotal).toBeVisible({ timeout: 5000 });
  });
});

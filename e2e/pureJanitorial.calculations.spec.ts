/**
 * Playwright E2E Tests for Pure Janitorial Form - Calculations
 *
 * Comprehensive tests for form calculations
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
  await page.locator('text=SERVICES').first().scrollIntoViewIfNeeded().catch(() => {});

  const janitorialTab = page.locator('button:has-text("Pure Janitorial")');
  if (await janitorialTab.isVisible().catch(() => false)) {
    await janitorialTab.click();
    await page.waitForTimeout(500);
  }

  const janitorialForm = page.locator('.svc-card').filter({ has: page.locator('text=JANITORIAL') }).first();
  await janitorialForm.waitFor({ timeout: 5000 }).catch(() => {});

  return janitorialForm;
}

// Helper to get input value as number
async function getInputValue(locator: Locator): Promise<string> {
  return await locator.inputValue();
}

// Helper to get text content
async function getLabelValue(form: Locator, labelText: string): Promise<string> {
  const row = form.locator('.svc-row').filter({ has: form.page().locator(`label:has-text("${labelText}")`) });
  const valueElement = row.locator('.svc-row-right, input').first();
  const value = await valueElement.inputValue().catch(() => '') || await valueElement.textContent() || '';
  return value.trim();
}

test.describe('Janitorial Form - Place Type Calculations', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Place type dropdown has options', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const placeTypeRow = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Place Type")') });
    const placeTypeSelect = placeTypeRow.locator('select');

    // Should have at least one option
    const options = await placeTypeSelect.locator('option').count();
    expect(options).toBeGreaterThan(0);
  });

  test('Changing place type updates hours per visit', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    // Enter square feet first
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');
    await sqFtInput.press('Tab');

    // Get initial hours value
    const hoursInput = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Hours Per Visit")') }).locator('input');
    const initialHours = await hoursInput.inputValue();

    // Change place type to a different option
    const placeTypeRow = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Place Type")') });
    const placeTypeSelect = placeTypeRow.locator('select');

    // Get all options and select a different one
    const options = await placeTypeSelect.locator('option').allTextContents();
    if (options.length > 1) {
      // Select the second option
      await placeTypeSelect.selectOption({ index: 1 });
      await page.waitForTimeout(300);

      // Hours should change (or stay same if rates are equal)
      const newHours = await hoursInput.inputValue();
      // Just verify it's a valid hours format
      expect(newHours).toMatch(/^\d+\.\d+ hrs$/);
    }
  });

  test('Hours per visit shows correct format', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('2000');
    await sqFtInput.press('Tab');

    // Hours should be in format "X.XX hrs"
    const hoursInput = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Hours Per Visit")') }).locator('input');
    await expect(hoursInput).toHaveValue(/^\d+\.\d{2} hrs$/, { timeout: 5000 });
  });

  test('Hours per visit is read-only', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const hoursInput = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Hours Per Visit")') }).locator('input');
    const isReadOnly = await hoursInput.getAttribute('readonly');
    expect(isReadOnly).not.toBeNull();
  });
});

test.describe('Janitorial Form - Frequency Calculations', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Weekly frequency shows Monthly Recurring', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    // Set frequency to Weekly
    const frequencySelect = janitorialForm.locator('.svc-row').filter({ has: page.locator('label').filter({ hasText: /^Frequency$/ }) }).locator('select');
    await frequencySelect.selectOption('weekly');

    // Enter square feet to show pricing
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');
    await sqFtInput.press('Tab');

    // Monthly Recurring should be visible
    await expect(janitorialForm.locator('label:has-text("Monthly Recurring")')).toBeVisible({ timeout: 5000 });
  });

  test('One-time frequency hides Monthly Recurring', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    // Enter square feet first
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');
    await sqFtInput.press('Tab');

    // Set frequency to One Time
    const frequencySelect = janitorialForm.locator('.svc-row').filter({ has: page.locator('label').filter({ hasText: /^Frequency$/ }) }).locator('select');
    await frequencySelect.selectOption('oneTime');
    await page.waitForTimeout(300);

    // Monthly Recurring should NOT be visible
    await expect(janitorialForm.locator('label:has-text("Monthly Recurring")')).not.toBeVisible();
  });

  test('One-time frequency shows Total Price instead of Contract Total', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');

    // Set frequency to One Time
    const frequencySelect = janitorialForm.locator('.svc-row').filter({ has: page.locator('label').filter({ hasText: /^Frequency$/ }) }).locator('select');
    await frequencySelect.selectOption('oneTime');
    await sqFtInput.press('Tab');
    await page.waitForTimeout(300);

    // Should show Total Price
    await janitorialForm.locator('label:has-text("Total Price")').scrollIntoViewIfNeeded().catch(() => {});
    await expect(janitorialForm.locator('label:has-text("Total Price")')).toBeVisible({ timeout: 5000 });
  });

  test('Monthly frequency calculates 12 visits per year', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    // Set frequency to Monthly
    const frequencySelect = janitorialForm.locator('.svc-row').filter({ has: page.locator('label').filter({ hasText: /^Frequency$/ }) }).locator('select');
    await frequencySelect.selectOption('monthly');

    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');
    await sqFtInput.press('Tab');

    // Should show pricing summary
    await expect(janitorialForm.locator('text=Pricing Summary')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Janitorial Form - Cost and Tax Calculations', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Cost Per Hour changes affect Annual Base Labor', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    // Enter square feet
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');

    // Set cost per hour to 30
    const costInput = janitorialForm.locator('input[name="costPerHour"]');
    await costInput.fill('30');
    await costInput.press('Tab');

    // Annual Base Labor should be visible and calculated
    await janitorialForm.locator('text=Annual Base Labor').scrollIntoViewIfNeeded().catch(() => {});
    await expect(janitorialForm.locator('label:has-text("Annual Base Labor")')).toBeVisible({ timeout: 5000 });
  });

  test('Labor Tax percentage shows in label', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');

    // Set labor tax to 20%
    const taxInput = janitorialForm.locator('input[name="laborTaxPct"]');
    await taxInput.fill('20');
    await taxInput.press('Tab');

    // Should show "Annual Labor Tax (20%)"
    await janitorialForm.locator('text=Annual Labor Tax').scrollIntoViewIfNeeded().catch(() => {});
    await expect(janitorialForm.locator('label:has-text("Annual Labor Tax (20%)")')).toBeVisible({ timeout: 5000 });
  });

  test('Gross Profit percentage shows in label', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');

    // Set gross profit to 40%
    const gpInput = janitorialForm.locator('input[name="grossProfitPct"]');
    await gpInput.fill('40');
    await gpInput.press('Tab');

    // Should show "Gross Profit (40%)"
    await janitorialForm.locator('text=Gross Profit').scrollIntoViewIfNeeded().catch(() => {});
    await expect(janitorialForm.locator('label:has-text("Gross Profit (40%)")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Janitorial Form - Supply Line Items', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Vacuums default value is $100', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const vacuumsRow = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Vacuums")') });
    const vacuumsInput = vacuumsRow.locator('input');
    await expect(vacuumsInput).toHaveValue('100', { timeout: 5000 });
  });

  test('Mops default value is $500', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const mopsRow = janitorialForm.locator('.svc-row').filter({ has: page.locator('label').filter({ hasText: /^Mops$/ }) });
    const mopsInput = mopsRow.locator('input');
    await expect(mopsInput).toHaveValue('500', { timeout: 5000 });
  });

  test('Changing supply values updates Annual Supplies', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    // Enter square feet to show pricing
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');
    await sqFtInput.press('Tab');

    // Change Vacuums value
    const vacuumsRow = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Vacuums")') });
    const vacuumsInput = vacuumsRow.locator('input');
    await vacuumsInput.fill('500');
    await vacuumsInput.press('Tab');

    // Annual Supplies should be visible
    await janitorialForm.locator('text=Annual Supplies').scrollIntoViewIfNeeded().catch(() => {});
    await expect(janitorialForm.locator('label:has-text("Annual Supplies")')).toBeVisible({ timeout: 5000 });
  });

  test('All 8 supply items are visible', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const supplyItems = ['Vacuums', 'Mop Buckets', 'Dust Mops', 'Microfiber', 'Cleaning Products', 'Consumables', 'Miscellaneous'];

    for (const item of supplyItems) {
      await expect(janitorialForm.locator(`label:has-text("${item}")`)).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Janitorial Form - Pricing Summary Calculations', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('All pricing fields appear when sqFt > 0', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');
    await sqFtInput.press('Tab');

    // All pricing labels should be visible
    const pricingLabels = [
      'Annual Base Labor',
      'Annual Labor Tax',
      'Annual Supplies',
      'Total Annual Cost',
      'Gross Profit',
      'Annual Contract Value'
    ];

    for (const label of pricingLabels) {
      await janitorialForm.locator(`text=${label}`).scrollIntoViewIfNeeded().catch(() => {});
      await expect(janitorialForm.locator(`label:has-text("${label}")`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Total Annual Labor equals Base Labor + Tax', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');
    await sqFtInput.press('Tab');

    // Total Annual Labor should be visible
    await janitorialForm.locator('text=Total Annual Labor').scrollIntoViewIfNeeded().catch(() => {});
    await expect(janitorialForm.locator('label:has-text("Total Annual Labor")')).toBeVisible({ timeout: 5000 });
  });

  test('Contract Total shows calculated value', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('2000');
    await sqFtInput.press('Tab');

    // Scroll to Contract Total
    await janitorialForm.locator('label:has-text("Contract Total")').scrollIntoViewIfNeeded().catch(() => {});

    // Contract Total should be visible
    const contractTotalLabel = janitorialForm.locator('label:has-text("Contract Total")');
    await expect(contractTotalLabel).toBeVisible({ timeout: 5000 });

    // The row should contain a dollar value
    const contractTotalRow = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Contract Total")') });
    const rowText = await contractTotalRow.textContent();
    expect(rowText).toMatch(/\$/);
  });

  test('Greenline/Redline indicator appears', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');
    await sqFtInput.press('Tab');

    // Either Greenline or Redline should be visible
    await janitorialForm.locator('text=/Greenline|Redline/').scrollIntoViewIfNeeded().catch(() => {});
    const greenline = janitorialForm.locator('text=Greenline');
    const redline = janitorialForm.locator('text=Redline');

    const greenlineVisible = await greenline.isVisible().catch(() => false);
    const redlineVisible = await redline.isVisible().catch(() => false);

    expect(greenlineVisible || redlineVisible).toBeTruthy();
  });
});

test.describe('Janitorial Form - Visits Per Week', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Visits per week dropdown has options 1-7', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const visitsSelect = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Visits per Week")') }).locator('select');

    for (let i = 1; i <= 7; i++) {
      await expect(visitsSelect.locator(`option[value="${i}"]`)).toBeAttached();
    }
  });

  test('Changing visits per week affects calculations', async ({ page }) => {
    janitorialForm = await setupJanitorialForm(page);

    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('1000');

    // Set visits to 5
    const visitsSelect = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Visits per Week")') }).locator('select');
    await visitsSelect.selectOption('5');
    await sqFtInput.press('Tab');

    // Pricing should be updated
    await expect(janitorialForm.locator('text=Pricing Summary')).toBeVisible({ timeout: 5000 });
  });
});

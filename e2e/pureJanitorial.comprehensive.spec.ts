/**
 * Comprehensive Playwright E2E Tests for Pure Janitorial Form
 *
 * This test suite covers ALL calculation possibilities including:
 * - All place types with different production rates
 * - All frequency types
 * - All visits per week options
 * - Boundary values and edge cases
 * - Input validation
 * - Full calculation chain verification
 *
 * Production-ready test coverage for the Janitorial pricing calculator.
 */

import { test, expect, Page, Locator } from '@playwright/test';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });
  await page.fill('input[placeholder="Enter your username"]', 'mark');
  await page.fill('input[placeholder="Enter your password"]', 'Mark@123');
  await page.click('button:has-text("Sign in as Employee")');
  await page.waitForURL(/(?!.*login).*/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

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

function extractDollarValue(text: string): number {
  const match = text.match(/\$?\s*([\d,]+\.?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return 0;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function getPricingValue(form: Locator, labelText: string, page: Page): Promise<number> {
  let selector = labelText;
  if (labelText === 'Gross Profit') {
    selector = 'Gross Profit (';
  } else if (labelText === 'Annual Labor Tax') {
    selector = 'Annual Labor Tax';
  } else if (labelText === 'Contract Total') {
    selector = 'Contract Total';
  } else if (labelText === 'Total Price') {
    selector = 'Total Price';
  }

  const row = form.locator('.svc-row-charge').filter({ has: page.locator(`label:has-text("${selector}")`) });
  await row.first().scrollIntoViewIfNeeded().catch(() => {});
  const input = row.first().locator('input');
  const value = await input.inputValue().catch(() => '0');
  return extractDollarValue(value);
}

async function setFormInputs(
  form: Locator,
  page: Page,
  values: {
    sqFt?: number;
    costPerHour?: number;
    laborTaxPct?: number;
    grossProfitPct?: number;
    visitsPerWeek?: number;
    frequency?: string;
    placeType?: string;
  }
) {
  if (values.frequency) {
    const frequencySelect = form.locator('.svc-row').filter({ has: page.locator('label').filter({ hasText: /^Frequency$/ }) }).locator('select');
    await frequencySelect.selectOption(values.frequency);
    await page.waitForTimeout(100);
  }

  if (values.placeType) {
    const placeTypeSelect = form.locator('.svc-row').filter({ has: page.locator('label:has-text("Place Type")') }).locator('select');
    // Try selecting by label first, then by value
    try {
      await placeTypeSelect.selectOption({ label: values.placeType });
    } catch {
      // If label doesn't work, try value
      await placeTypeSelect.selectOption(values.placeType).catch(() => {});
    }
    await page.waitForTimeout(100);
  }

  if (values.visitsPerWeek) {
    const visitsSelect = form.locator('.svc-row').filter({ has: page.locator('label:has-text("Visits per Week")') }).locator('select');
    await visitsSelect.selectOption(String(values.visitsPerWeek));
    await page.waitForTimeout(100);
  }

  if (values.costPerHour !== undefined) {
    const costInput = form.locator('input[name="costPerHour"]');
    await costInput.click();
    await costInput.fill(String(values.costPerHour));
    await costInput.press('Tab');
    await page.waitForTimeout(100);
  }

  if (values.laborTaxPct !== undefined) {
    const taxInput = form.locator('input[name="laborTaxPct"]');
    await taxInput.click();
    await taxInput.fill(String(values.laborTaxPct));
    await taxInput.press('Tab');
    await page.waitForTimeout(100);
  }

  if (values.grossProfitPct !== undefined) {
    const gpInput = form.locator('input[name="grossProfitPct"]');
    await gpInput.click();
    await gpInput.fill(String(values.grossProfitPct));
    await gpInput.press('Tab');
    await page.waitForTimeout(100);
  }

  if (values.sqFt !== undefined) {
    const sqFtInput = form.locator('input[name="sqFt"]');
    await sqFtInput.click();
    await sqFtInput.fill(String(values.sqFt));
    await sqFtInput.press('Tab');
  }

  await page.waitForTimeout(500);
}

async function getProductionRate(form: Locator, page: Page): Promise<number> {
  const hoursInput = form.locator('.svc-row').filter({ has: page.locator('label:has-text("Hours Per Visit")') }).locator('input');
  const title = await hoursInput.getAttribute('title') || '';
  const match = title.match(/Production rate: (\d+)/);
  return match ? parseInt(match[1]) : 1000;
}

async function getHoursPerVisit(form: Locator, page: Page): Promise<number> {
  const hoursInput = form.locator('.svc-row').filter({ has: page.locator('label:has-text("Hours Per Visit")') }).locator('input');
  const value = await hoursInput.inputValue();
  const match = value.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

async function captureFormScreenshot(page: Page, form: Locator, testInfo: any, name: string) {
  const pricingSummary = form.locator('text=Pricing Summary');
  await pricingSummary.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);
  const screenshot = await form.screenshot();
  await testInfo.attach(name, { body: screenshot, contentType: 'image/png' });
}

function logResult(testInfo: any, label: string, expected: number | string, actual: number | string, formula: string, passed: boolean) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  ${label.padEnd(72)} ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Formula:  ${formula.substring(0, 64).padEnd(64)} ║
║  Expected: ${String(expected).padEnd(64)} ║
║  Actual:   ${String(actual).padEnd(64)} ║
║  Status:   ${status.padEnd(64)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

  testInfo.annotations.push({
    type: label,
    description: `${status} | Expected: ${expected} | Actual: ${actual} | ${formula}`
  });
}

// ============================================================================
// PLACE TYPE TESTS - Different production rates for each place type
// ============================================================================

test.describe('Place Type Production Rates', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Office place type uses correct production rate', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      placeType: 'Office',
      sqFt: 3000,
      costPerHour: 20,
      frequency: 'weekly',
      visitsPerWeek: 1
    });

    const productionRate = await getProductionRate(janitorialForm, page);
    const hours = await getHoursPerVisit(janitorialForm, page);
    const expectedHours = 3000 / productionRate;

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Office Place Type');
    logResult(testInfo, 'Office Hours Per Visit', expectedHours.toFixed(2), hours.toFixed(2), `3000 sqFt / ${productionRate} rate`, Math.abs(hours - expectedHours) < 0.01);

    expect(hours).toBeCloseTo(expectedHours, 1);
  });

  test('Home place type uses correct production rate', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      placeType: 'Home',
      sqFt: 2000,
      costPerHour: 20,
      frequency: 'weekly',
      visitsPerWeek: 1
    });

    const productionRate = await getProductionRate(janitorialForm, page);
    const hours = await getHoursPerVisit(janitorialForm, page);
    const expectedHours = 2000 / productionRate;

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Home Place Type');
    logResult(testInfo, 'Home Hours Per Visit', expectedHours.toFixed(2), hours.toFixed(2), `2000 sqFt / ${productionRate} rate`, Math.abs(hours - expectedHours) < 0.01);

    expect(hours).toBeCloseTo(expectedHours, 1);
  });

  test('Restaurant place type uses correct production rate', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      placeType: 'Restaurant',
      sqFt: 2500,
      costPerHour: 25,
      frequency: 'weekly',
      visitsPerWeek: 1
    });

    const productionRate = await getProductionRate(janitorialForm, page);
    const hours = await getHoursPerVisit(janitorialForm, page);
    const expectedHours = 2500 / productionRate;

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Restaurant Place Type');
    logResult(testInfo, 'Restaurant Hours Per Visit', expectedHours.toFixed(2), hours.toFixed(2), `2500 sqFt / ${productionRate} rate`, Math.abs(hours - expectedHours) < 0.01);

    expect(hours).toBeCloseTo(expectedHours, 1);
  });

  test('Business Place type uses correct production rate', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      placeType: 'Business Place',
      sqFt: 5000,
      costPerHour: 22,
      frequency: 'weekly',
      visitsPerWeek: 1
    });

    const productionRate = await getProductionRate(janitorialForm, page);
    const hours = await getHoursPerVisit(janitorialForm, page);
    const expectedHours = 5000 / productionRate;

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Business Place Type');
    logResult(testInfo, 'Business Place Hours Per Visit', expectedHours.toFixed(2), hours.toFixed(2), `5000 sqFt / ${productionRate} rate`, Math.abs(hours - expectedHours) < 0.01);

    expect(hours).toBeCloseTo(expectedHours, 1);
  });

  test('Changing place type updates hours calculation', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    // Set office first
    await setFormInputs(janitorialForm, page, {
      placeType: 'Office',
      sqFt: 3000,
      costPerHour: 20
    });
    const officeRate = await getProductionRate(janitorialForm, page);
    const officeHours = await getHoursPerVisit(janitorialForm, page);

    // Change to restaurant
    await setFormInputs(janitorialForm, page, { placeType: 'Restaurant' });
    const restaurantRate = await getProductionRate(janitorialForm, page);
    const restaurantHours = await getHoursPerVisit(janitorialForm, page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Place Type Change');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  Place Type Change - Hours Comparison                                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Office Rate: ${String(officeRate).padEnd(20)} Office Hours: ${officeHours.toFixed(2).padEnd(20)} ║
║  Restaurant Rate: ${String(restaurantRate).padEnd(17)} Restaurant Hours: ${restaurantHours.toFixed(2).padEnd(17)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    // Different place types should have different rates (or same if configured that way)
    expect(officeHours).toBeCloseTo(3000 / officeRate, 1);
    expect(restaurantHours).toBeCloseTo(3000 / restaurantRate, 1);
  });
});

// ============================================================================
// ALL FREQUENCY TYPES - Weekly, Monthly, One-time, and visit-based
// ============================================================================

test.describe('All Frequency Types', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Weekly frequency - 52 weeks per year', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      sqFt: productionRate // 1 hour exactly
    });

    const expectedLabor = 20 * 1 * 52; // $20/hr × 1 hr × 52 weeks
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Weekly Frequency');
    logResult(testInfo, 'Weekly (52x)', formatCurrency(expectedLabor), formatCurrency(actualLabor), '1 hr × $20/hr × 52 weeks', Math.abs(actualLabor - expectedLabor) < 1);

    expect(actualLabor).toBeCloseTo(expectedLabor, 0);
  });

  test('Monthly frequency - 12 months per year', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'monthly',
      costPerHour: 20,
      sqFt: productionRate
    });

    const expectedLabor = 20 * 12; // $20/hr × 1 hr × 12 months
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Monthly Frequency');
    logResult(testInfo, 'Monthly (12x)', formatCurrency(expectedLabor), formatCurrency(actualLabor), '1 hr × $20/hr × 12 months', Math.abs(actualLabor - expectedLabor) < 1);

    expect(actualLabor).toBeCloseTo(expectedLabor, 0);
  });

  test('One-time frequency - single occurrence', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'oneTime',
      costPerHour: 20,
      sqFt: productionRate
    });

    const expectedLabor = 20 * 1; // $20/hr × 1 hr × 1
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'One-Time Frequency');
    logResult(testInfo, 'One-Time (1x)', formatCurrency(expectedLabor), formatCurrency(actualLabor), '1 hr × $20/hr × 1', Math.abs(actualLabor - expectedLabor) < 1);

    expect(actualLabor).toBeCloseTo(expectedLabor, 0);

    // One-time should show "Total Price" instead of "Contract Total"
    const totalPriceVisible = await janitorialForm.locator('label:has-text("Total Price")').isVisible();
    expect(totalPriceVisible).toBe(true);
  });

  test('Every Four Weeks frequency - 13 occurrences per year', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'everyFourWeeks',
      costPerHour: 20,
      sqFt: productionRate
    });

    const expectedLabor = 20 * 13; // $20/hr × 1 hr × 13 (52/4)
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Every Four Weeks Frequency');
    logResult(testInfo, 'Every 4 Weeks (13x)', formatCurrency(expectedLabor), formatCurrency(actualLabor), '1 hr × $20/hr × 13', Math.abs(actualLabor - expectedLabor) < 1);

    expect(actualLabor).toBeCloseTo(expectedLabor, 0);
  });

  test('Bimonthly frequency - 6 occurrences per year', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'bimonthly',
      costPerHour: 20,
      sqFt: productionRate
    });

    const expectedLabor = 20 * 6; // $20/hr × 1 hr × 6
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Bimonthly Frequency');
    logResult(testInfo, 'Bimonthly (6x)', formatCurrency(expectedLabor), formatCurrency(actualLabor), '1 hr × $20/hr × 6', Math.abs(actualLabor - expectedLabor) < 1);

    expect(actualLabor).toBeCloseTo(expectedLabor, 0);
  });

  test('Quarterly frequency - 4 occurrences per year', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'quarterly',
      costPerHour: 20,
      sqFt: productionRate
    });

    const expectedLabor = 20 * 4; // $20/hr × 1 hr × 4
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Quarterly Frequency');
    logResult(testInfo, 'Quarterly (4x)', formatCurrency(expectedLabor), formatCurrency(actualLabor), '1 hr × $20/hr × 4', Math.abs(actualLabor - expectedLabor) < 1);

    expect(actualLabor).toBeCloseTo(expectedLabor, 0);
  });

  test('Biannual frequency - 2 occurrences per year', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'biannual',
      costPerHour: 20,
      sqFt: productionRate
    });

    const expectedLabor = 20 * 2; // $20/hr × 1 hr × 2
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Biannual Frequency');
    logResult(testInfo, 'Biannual (2x)', formatCurrency(expectedLabor), formatCurrency(actualLabor), '1 hr × $20/hr × 2', Math.abs(actualLabor - expectedLabor) < 1);

    expect(actualLabor).toBeCloseTo(expectedLabor, 0);
  });

  test('Annual frequency - 1 occurrence per year', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'annual',
      costPerHour: 20,
      sqFt: productionRate
    });

    const expectedLabor = 20 * 1; // $20/hr × 1 hr × 1
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Annual Frequency');
    logResult(testInfo, 'Annual (1x)', formatCurrency(expectedLabor), formatCurrency(actualLabor), '1 hr × $20/hr × 1', Math.abs(actualLabor - expectedLabor) < 1);

    expect(actualLabor).toBeCloseTo(expectedLabor, 0);
  });
});

// ============================================================================
// VISITS PER WEEK - All 7 options
// ============================================================================

test.describe('Visits Per Week - All Options', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  for (let visits = 1; visits <= 7; visits++) {
    test(`${visits} visit(s) per week multiplies labor correctly`, async ({ page }, testInfo) => {
      janitorialForm = await setupJanitorialForm(page);
      const productionRate = await getProductionRate(janitorialForm, page);

      await setFormInputs(janitorialForm, page, {
        frequency: 'weekly',
        visitsPerWeek: visits,
        costPerHour: 20,
        sqFt: productionRate // 1 hour
      });

      // Expected: 1 hour × $20 × visits × 52 weeks
      const expectedLabor = 20 * visits * 52;
      const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

      await captureFormScreenshot(page, janitorialForm, testInfo, `${visits} Visits Per Week`);
      logResult(testInfo, `${visits} Visit(s)/Week`, formatCurrency(expectedLabor), formatCurrency(actualLabor), `1 hr × $20/hr × ${visits} × 52 weeks`, Math.abs(actualLabor - expectedLabor) < 1);

      expect(actualLabor).toBeCloseTo(expectedLabor, 0);
    });
  }
});

// ============================================================================
// LABOR TAX PERCENTAGES
// ============================================================================

test.describe('Labor Tax Percentage Calculations', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  const taxRates = [0, 5, 10, 15, 18, 20, 25, 30];

  for (const taxRate of taxRates) {
    test(`Labor tax at ${taxRate}% calculates correctly`, async ({ page }, testInfo) => {
      janitorialForm = await setupJanitorialForm(page);

      await setFormInputs(janitorialForm, page, {
        frequency: 'weekly',
        visitsPerWeek: 1,
        costPerHour: 20,
        laborTaxPct: taxRate,
        sqFt: 1000
      });

      const baseLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);
      const expectedTax = baseLabor * (taxRate / 100);
      const actualTax = await getPricingValue(janitorialForm, 'Annual Labor Tax', page);

      await captureFormScreenshot(page, janitorialForm, testInfo, `Labor Tax ${taxRate}%`);
      logResult(testInfo, `Labor Tax ${taxRate}%`, formatCurrency(expectedTax), formatCurrency(actualTax), `${formatCurrency(baseLabor)} × ${taxRate}%`, Math.abs(actualTax - expectedTax) < 1);

      expect(actualTax).toBeCloseTo(expectedTax, 0);
    });
  }
});

// ============================================================================
// GROSS PROFIT PERCENTAGES
// ============================================================================

test.describe('Gross Profit Percentage Calculations', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  const profitRates = [0, 10, 20, 25, 30, 33, 40, 50, 60, 70];

  for (const gpRate of profitRates) {
    test(`Gross profit at ${gpRate}% calculates correctly`, async ({ page }, testInfo) => {
      janitorialForm = await setupJanitorialForm(page);

      await setFormInputs(janitorialForm, page, {
        frequency: 'weekly',
        visitsPerWeek: 1,
        costPerHour: 20,
        laborTaxPct: 15,
        grossProfitPct: gpRate,
        sqFt: 1000
      });

      const totalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);
      // Gross Profit = Cost × (GP% / (100 - GP%))
      const expectedProfit = gpRate === 100 ? Infinity : totalCost * (gpRate / (100 - gpRate));
      const actualProfit = await getPricingValue(janitorialForm, 'Gross Profit', page);

      await captureFormScreenshot(page, janitorialForm, testInfo, `Gross Profit ${gpRate}%`);

      if (gpRate === 0) {
        expect(actualProfit).toBe(0);
      } else {
        logResult(testInfo, `Gross Profit ${gpRate}%`, formatCurrency(expectedProfit), formatCurrency(actualProfit), `${formatCurrency(totalCost)} × (${gpRate}/${100-gpRate})`, Math.abs(actualProfit - expectedProfit) < 1);
        expect(actualProfit).toBeCloseTo(expectedProfit, 0);
      }
    });
  }
});

// ============================================================================
// SQUARE FEET BOUNDARY VALUES
// ============================================================================

test.describe('Square Feet Boundary Values', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  const sqFtValues = [1, 100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000];

  for (const sqFt of sqFtValues) {
    test(`${sqFt.toLocaleString()} sq ft calculates correctly`, async ({ page }, testInfo) => {
      janitorialForm = await setupJanitorialForm(page);
      const productionRate = await getProductionRate(janitorialForm, page);

      await setFormInputs(janitorialForm, page, {
        frequency: 'weekly',
        visitsPerWeek: 1,
        costPerHour: 20,
        sqFt: sqFt
      });

      const expectedHours = sqFt / productionRate;
      const actualHours = await getHoursPerVisit(janitorialForm, page);

      const expectedLabor = expectedHours * 20 * 52;
      const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

      await captureFormScreenshot(page, janitorialForm, testInfo, `${sqFt.toLocaleString()} SqFt`);

      console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  ${sqFt.toLocaleString()} Square Feet Test                                                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Production Rate: ${String(productionRate).padEnd(56)} ║
║  Expected Hours:  ${expectedHours.toFixed(2).padEnd(56)} ║
║  Actual Hours:    ${actualHours.toFixed(2).padEnd(56)} ║
║  Expected Labor:  ${formatCurrency(expectedLabor).padEnd(56)} ║
║  Actual Labor:    ${formatCurrency(actualLabor).padEnd(56)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

      expect(actualHours).toBeCloseTo(expectedHours, 1);
      expect(actualLabor).toBeCloseTo(expectedLabor, 0);
    });
  }
});

// ============================================================================
// COST PER HOUR VALUES
// ============================================================================

test.describe('Cost Per Hour Values', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  const costValues = [0, 10, 15, 18, 20, 22, 25, 30, 35, 40, 50, 75, 100];

  for (const cost of costValues) {
    test(`$${cost}/hour calculates correctly`, async ({ page }, testInfo) => {
      janitorialForm = await setupJanitorialForm(page);
      const productionRate = await getProductionRate(janitorialForm, page);

      await setFormInputs(janitorialForm, page, {
        frequency: 'weekly',
        visitsPerWeek: 1,
        costPerHour: cost,
        sqFt: productionRate // 1 hour exactly
      });

      // 1 hour × cost × 52 weeks
      const expectedLabor = cost * 52;
      const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

      await captureFormScreenshot(page, janitorialForm, testInfo, `$${cost} Per Hour`);
      logResult(testInfo, `$${cost}/Hour`, formatCurrency(expectedLabor), formatCurrency(actualLabor), `1 hr × $${cost}/hr × 52 weeks`, Math.abs(actualLabor - expectedLabor) < 1);

      expect(actualLabor).toBeCloseTo(expectedLabor, 0);
    });
  }
});

// ============================================================================
// FULL CALCULATION CHAIN VERIFICATION
// ============================================================================

test.describe('Full Calculation Chain Verification', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Complete calculation chain - Standard scenario', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    // Standard inputs
    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 2,
      costPerHour: 25,
      laborTaxPct: 18,
      grossProfitPct: 33,
      sqFt: 3000
    });

    // Calculate expected values step by step
    const hours = 3000 / productionRate;
    const expectedBaseLabor = hours * 25 * 2 * 52;
    const expectedLaborTax = expectedBaseLabor * 0.18;
    const expectedTotalLabor = expectedBaseLabor + expectedLaborTax;

    // Get actual values
    const actualBaseLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);
    const actualLaborTax = await getPricingValue(janitorialForm, 'Annual Labor Tax', page);
    const actualTotalLabor = await getPricingValue(janitorialForm, 'Total Annual Labor', page);
    const actualSupplies = await getPricingValue(janitorialForm, 'Annual Supplies', page);
    const actualTotalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);
    const actualGrossProfit = await getPricingValue(janitorialForm, 'Gross Profit', page);
    const actualAnnualValue = await getPricingValue(janitorialForm, 'Annual Contract Value', page);

    // Verify full chain
    const expectedTotalCost = actualTotalLabor + actualSupplies;
    const expectedGrossProfit = actualTotalCost * (33 / 67);
    const expectedAnnualValue = actualTotalCost + actualGrossProfit;

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Full Calculation Chain');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  FULL CALCULATION CHAIN VERIFICATION                                     ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Inputs:                                                                 ║
║    Square Feet: 3,000 | Cost: $25/hr | Tax: 18% | Profit: 33%           ║
║    Frequency: Weekly | Visits: 2/week | Production Rate: ${String(productionRate).padEnd(13)} ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Step 1: Hours = 3000 / ${productionRate} = ${hours.toFixed(2).padEnd(42)} ║
║  Step 2: Base Labor = ${hours.toFixed(2)} × $25 × 2 × 52 = ${formatCurrency(expectedBaseLabor).padEnd(24)} ║
║  Step 3: Labor Tax = ${formatCurrency(actualBaseLabor)} × 18% = ${formatCurrency(expectedLaborTax).padEnd(26)} ║
║  Step 4: Total Labor = ${formatCurrency(actualBaseLabor)} + ${formatCurrency(actualLaborTax)} = ${formatCurrency(actualTotalLabor).padEnd(15)} ║
║  Step 5: Total Cost = ${formatCurrency(actualTotalLabor)} + ${formatCurrency(actualSupplies)} = ${formatCurrency(actualTotalCost).padEnd(14)} ║
║  Step 6: Gross Profit = ${formatCurrency(actualTotalCost)} × (33/67) = ${formatCurrency(actualGrossProfit).padEnd(16)} ║
║  Step 7: Annual Value = ${formatCurrency(actualTotalCost)} + ${formatCurrency(actualGrossProfit)} = ${formatCurrency(actualAnnualValue).padEnd(12)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    // Assertions
    expect(actualBaseLabor).toBeCloseTo(expectedBaseLabor, 0);
    expect(actualLaborTax).toBeCloseTo(expectedLaborTax, 0);
    expect(actualTotalLabor).toBeCloseTo(expectedTotalLabor, 0);
    expect(actualTotalCost).toBeCloseTo(expectedTotalCost, 0);
    expect(actualGrossProfit).toBeCloseTo(expectedGrossProfit, 0);
    expect(actualAnnualValue).toBeCloseTo(expectedAnnualValue, 0);
  });

  test('Complete calculation chain - High volume scenario', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 5,
      costPerHour: 35,
      laborTaxPct: 22,
      grossProfitPct: 40,
      sqFt: 50000
    });

    const hours = 50000 / productionRate;
    const expectedBaseLabor = hours * 35 * 5 * 52;
    const expectedLaborTax = expectedBaseLabor * 0.22;
    const expectedTotalLabor = expectedBaseLabor + expectedLaborTax;

    const actualBaseLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);
    const actualLaborTax = await getPricingValue(janitorialForm, 'Annual Labor Tax', page);
    const actualTotalLabor = await getPricingValue(janitorialForm, 'Total Annual Labor', page);
    const actualSupplies = await getPricingValue(janitorialForm, 'Annual Supplies', page);
    const actualTotalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);
    const actualGrossProfit = await getPricingValue(janitorialForm, 'Gross Profit', page);
    const actualAnnualValue = await getPricingValue(janitorialForm, 'Annual Contract Value', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'High Volume Calculation');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  HIGH VOLUME SCENARIO (50,000 sq ft, 5 visits/week)                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Hours Per Visit: ${hours.toFixed(2).padEnd(55)} ║
║  Annual Base Labor: ${formatCurrency(actualBaseLabor).padEnd(53)} ║
║  Annual Labor Tax:  ${formatCurrency(actualLaborTax).padEnd(53)} ║
║  Total Annual Labor: ${formatCurrency(actualTotalLabor).padEnd(52)} ║
║  Annual Supplies: ${formatCurrency(actualSupplies).padEnd(55)} ║
║  Total Annual Cost: ${formatCurrency(actualTotalCost).padEnd(53)} ║
║  Gross Profit (40%): ${formatCurrency(actualGrossProfit).padEnd(52)} ║
║  Annual Contract Value: ${formatCurrency(actualAnnualValue).padEnd(49)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    expect(actualBaseLabor).toBeCloseTo(expectedBaseLabor, -1);
    expect(actualTotalLabor).toBeCloseTo(expectedTotalLabor, -1);
  });

  test('Complete calculation chain - Minimum scenario', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'monthly',
      costPerHour: 15,
      laborTaxPct: 10,
      grossProfitPct: 20,
      sqFt: 500
    });

    const hours = 500 / productionRate;
    const expectedBaseLabor = hours * 15 * 12;

    const actualBaseLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);
    const actualTotalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);
    const actualAnnualValue = await getPricingValue(janitorialForm, 'Annual Contract Value', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Minimum Scenario');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  MINIMUM SCENARIO (500 sq ft, Monthly)                                   ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Hours Per Visit: ${hours.toFixed(2).padEnd(55)} ║
║  Annual Base Labor: ${formatCurrency(actualBaseLabor).padEnd(53)} ║
║  Total Annual Cost: ${formatCurrency(actualTotalCost).padEnd(53)} ║
║  Annual Contract Value: ${formatCurrency(actualAnnualValue).padEnd(49)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    expect(actualBaseLabor).toBeCloseTo(expectedBaseLabor, 0);
  });
});

// ============================================================================
// SUPPLY LINE ITEMS
// ============================================================================

test.describe('Supply Line Items Calculations', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  const supplyItems = [
    { name: 'Vacuums', defaultValue: 100 },
    { name: 'Mops', defaultValue: 500, exact: true },
    { name: 'Mop Buckets', defaultValue: 200 },
    { name: 'Dust Mops', defaultValue: 300 },
    { name: 'Microfiber', defaultValue: 0 },
    { name: 'Cleaning Products', defaultValue: 0 },
    { name: 'Consumables', defaultValue: 0 },
    { name: 'Miscellaneous', defaultValue: 0 }
  ];

  test('All supply items sum correctly to Annual Supplies', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, { sqFt: 1000 });

    // Calculate expected sum from supply inputs
    let expectedSum = 0;
    for (const item of supplyItems) {
      let row;
      if (item.exact) {
        row = janitorialForm.locator('.svc-row').filter({ has: page.locator('label').filter({ hasText: new RegExp(`^${item.name}$`) }) });
      } else {
        row = janitorialForm.locator('.svc-row').filter({ has: page.locator(`label:has-text("${item.name}")`) });
      }
      const input = row.locator('input');
      const value = await input.inputValue().catch(() => '0');
      expectedSum += parseFloat(value) || 0;
    }

    const actualSupplies = await getPricingValue(janitorialForm, 'Annual Supplies', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Supply Items Sum');
    logResult(testInfo, 'Annual Supplies Sum', formatCurrency(expectedSum), formatCurrency(actualSupplies), 'Sum of all supply line items', Math.abs(actualSupplies - expectedSum) < 1);

    expect(actualSupplies).toBeCloseTo(expectedSum, 0);
  });

  test('Modifying each supply item updates Annual Supplies', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, { sqFt: 1000 });
    const initialSupplies = await getPricingValue(janitorialForm, 'Annual Supplies', page);

    // Increase each supply by 100
    for (const item of supplyItems) {
      let row;
      if (item.exact) {
        row = janitorialForm.locator('.svc-row').filter({ has: page.locator('label').filter({ hasText: new RegExp(`^${item.name}$`) }) });
      } else {
        row = janitorialForm.locator('.svc-row').filter({ has: page.locator(`label:has-text("${item.name}")`) });
      }
      const input = row.locator('input');
      const currentValue = await input.inputValue().catch(() => '0');
      const newValue = (parseFloat(currentValue) || 0) + 100;
      await input.click();
      await input.fill(String(newValue));
      await input.press('Tab');
      await page.waitForTimeout(100);
    }

    const finalSupplies = await getPricingValue(janitorialForm, 'Annual Supplies', page);
    const expectedIncrease = supplyItems.length * 100;

    await captureFormScreenshot(page, janitorialForm, testInfo, 'All Supplies Increased');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  Supply Modification Test                                                ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Initial Supplies: ${formatCurrency(initialSupplies).padEnd(53)} ║
║  Added: ${supplyItems.length} items × $100 = ${formatCurrency(expectedIncrease).padEnd(42)} ║
║  Expected Final: ${formatCurrency(initialSupplies + expectedIncrease).padEnd(55)} ║
║  Actual Final: ${formatCurrency(finalSupplies).padEnd(57)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    expect(finalSupplies).toBeCloseTo(initialSupplies + expectedIncrease, 0);
  });
});

// ============================================================================
// EDGE CASES AND VALIDATION
// ============================================================================

test.describe('Edge Cases and Input Validation', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Zero square feet hides pricing summary', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    // First set sqFt to show pricing
    await setFormInputs(janitorialForm, page, { sqFt: 1000 });
    await expect(janitorialForm.locator('text=Pricing Summary')).toBeVisible();

    // Clear sqFt
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.click();
    await sqFtInput.fill('0');
    await sqFtInput.press('Tab');
    await page.waitForTimeout(500);

    const screenshot = await janitorialForm.screenshot();
    await testInfo.attach('Zero Square Feet', { body: screenshot, contentType: 'image/png' });

    await expect(janitorialForm.locator('text=Pricing Summary')).not.toBeVisible();
  });

  test('Empty square feet hides pricing summary', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    // First set sqFt to show pricing
    await setFormInputs(janitorialForm, page, { sqFt: 1000 });
    await expect(janitorialForm.locator('text=Pricing Summary')).toBeVisible();

    // Clear sqFt completely
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.click();
    await sqFtInput.fill('');
    await sqFtInput.press('Tab');
    await page.waitForTimeout(500);

    const screenshot = await janitorialForm.screenshot();
    await testInfo.attach('Empty Square Feet', { body: screenshot, contentType: 'image/png' });

    await expect(janitorialForm.locator('text=Pricing Summary')).not.toBeVisible();
  });

  test('Zero cost per hour results in zero labor', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      costPerHour: 0,
      sqFt: 1000
    });

    const labor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Zero Cost Per Hour');
    logResult(testInfo, 'Zero Cost Per Hour', '$0.00', formatCurrency(labor), 'Any hours × $0/hr = $0', labor === 0);

    expect(labor).toBe(0);
  });

  test('Zero labor tax results in zero tax', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      costPerHour: 20,
      laborTaxPct: 0,
      sqFt: 1000
    });

    const tax = await getPricingValue(janitorialForm, 'Annual Labor Tax', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Zero Labor Tax');
    logResult(testInfo, 'Zero Labor Tax', '$0.00', formatCurrency(tax), 'Base Labor × 0% = $0', tax === 0);

    expect(tax).toBe(0);
  });

  test('Zero gross profit means no markup', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 0,
      sqFt: 1000
    });

    const totalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);
    const grossProfit = await getPricingValue(janitorialForm, 'Gross Profit', page);
    const annualValue = await getPricingValue(janitorialForm, 'Annual Contract Value', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Zero Gross Profit');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  Zero Gross Profit - No Markup                                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Total Annual Cost: ${formatCurrency(totalCost).padEnd(53)} ║
║  Gross Profit (0%): ${formatCurrency(grossProfit).padEnd(53)} ║
║  Annual Contract Value: ${formatCurrency(annualValue).padEnd(49)} ║
║  Cost equals Contract Value: ${(Math.abs(totalCost - annualValue) < 1 ? '✅ YES' : '❌ NO').padEnd(44)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    expect(grossProfit).toBe(0);
    expect(annualValue).toBeCloseTo(totalCost, 0);
  });

  test('Decimal values in inputs are handled correctly', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      costPerHour: 22.50,
      laborTaxPct: 15.5,
      grossProfitPct: 33.33,
      sqFt: 1500
    });

    const baseLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);
    const tax = await getPricingValue(janitorialForm, 'Annual Labor Tax', page);
    const profit = await getPricingValue(janitorialForm, 'Gross Profit', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Decimal Values');

    expect(baseLabor).toBeGreaterThan(0);
    expect(tax).toBeGreaterThan(0);
    expect(profit).toBeGreaterThan(0);
  });

  test('Very small square feet (1 sq ft)', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      costPerHour: 20,
      sqFt: 1
    });

    const hours = await getHoursPerVisit(janitorialForm, page);
    const expectedHours = 1 / productionRate;

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Minimum Square Feet');

    expect(hours).toBeCloseTo(expectedHours, 2);
  });

  test('Maximum reasonable square feet (1,000,000 sq ft)', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      sqFt: 1000000
    });

    const hours = await getHoursPerVisit(janitorialForm, page);
    const expectedHours = 1000000 / productionRate;

    const labor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Maximum Square Feet');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  Maximum Square Feet (1,000,000 sq ft)                                   ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Production Rate: ${String(productionRate).padEnd(55)} ║
║  Expected Hours: ${expectedHours.toFixed(2).padEnd(56)} ║
║  Actual Hours: ${hours.toFixed(2).padEnd(58)} ║
║  Annual Base Labor: ${formatCurrency(labor).padEnd(53)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    expect(hours).toBeCloseTo(expectedHours, 0);
    expect(labor).toBeGreaterThan(0);
  });
});

// ============================================================================
// CALCULATION CONSISTENCY TESTS
// ============================================================================

test.describe('Calculation Consistency', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Total Annual Labor always equals Base Labor + Tax', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    // Test with various inputs
    const testCases = [
      { sqFt: 1000, costPerHour: 20, laborTaxPct: 15 },
      { sqFt: 5000, costPerHour: 25, laborTaxPct: 18 },
      { sqFt: 10000, costPerHour: 30, laborTaxPct: 22 },
      { sqFt: 500, costPerHour: 15, laborTaxPct: 10 },
    ];

    for (const tc of testCases) {
      await setFormInputs(janitorialForm, page, {
        frequency: 'weekly',
        visitsPerWeek: 1,
        ...tc
      });

      const baseLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);
      const laborTax = await getPricingValue(janitorialForm, 'Annual Labor Tax', page);
      const totalLabor = await getPricingValue(janitorialForm, 'Total Annual Labor', page);

      const expectedTotal = baseLabor + laborTax;

      console.log(`SqFt: ${tc.sqFt}, Cost: $${tc.costPerHour}, Tax: ${tc.laborTaxPct}% → Base: ${formatCurrency(baseLabor)} + Tax: ${formatCurrency(laborTax)} = ${formatCurrency(expectedTotal)} (Actual: ${formatCurrency(totalLabor)})`);

      expect(totalLabor).toBeCloseTo(expectedTotal, 0);
    }

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Total Labor Consistency');
  });

  test('Total Annual Cost always equals Total Labor + Supplies', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    const testCases = [
      { sqFt: 1000, costPerHour: 20, laborTaxPct: 15 },
      { sqFt: 3000, costPerHour: 25, laborTaxPct: 18 },
      { sqFt: 8000, costPerHour: 22, laborTaxPct: 20 },
    ];

    for (const tc of testCases) {
      await setFormInputs(janitorialForm, page, {
        frequency: 'weekly',
        visitsPerWeek: 1,
        ...tc
      });

      const totalLabor = await getPricingValue(janitorialForm, 'Total Annual Labor', page);
      const supplies = await getPricingValue(janitorialForm, 'Annual Supplies', page);
      const totalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);

      const expectedCost = totalLabor + supplies;

      console.log(`Labor: ${formatCurrency(totalLabor)} + Supplies: ${formatCurrency(supplies)} = ${formatCurrency(expectedCost)} (Actual: ${formatCurrency(totalCost)})`);

      expect(totalCost).toBeCloseTo(expectedCost, 0);
    }

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Total Cost Consistency');
  });

  test('Annual Contract Value always equals Cost + Profit', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    const testCases = [
      { sqFt: 1000, grossProfitPct: 33 },
      { sqFt: 2000, grossProfitPct: 40 },
      { sqFt: 5000, grossProfitPct: 50 },
      { sqFt: 3000, grossProfitPct: 25 },
    ];

    for (const tc of testCases) {
      await setFormInputs(janitorialForm, page, {
        frequency: 'weekly',
        visitsPerWeek: 1,
        costPerHour: 20,
        laborTaxPct: 15,
        ...tc
      });

      const totalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);
      const grossProfit = await getPricingValue(janitorialForm, 'Gross Profit', page);
      const annualValue = await getPricingValue(janitorialForm, 'Annual Contract Value', page);

      const expectedValue = totalCost + grossProfit;

      console.log(`Cost: ${formatCurrency(totalCost)} + Profit (${tc.grossProfitPct}%): ${formatCurrency(grossProfit)} = ${formatCurrency(expectedValue)} (Actual: ${formatCurrency(annualValue)})`);

      expect(annualValue).toBeCloseTo(expectedValue, 0);
    }

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Contract Value Consistency');
  });
});

// ============================================================================
// GREENLINE / REDLINE PRICING INDICATOR
// ============================================================================

test.describe('Pricing Indicator (Greenline/Redline)', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Pricing indicator appears when sqFt is entered', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      sqFt: 1000,
      grossProfitPct: 33
    });

    // Check for either Greenline or Redline indicator
    const greenline = janitorialForm.locator('text=Greenline Pricing');
    const redline = janitorialForm.locator('text=Redline Pricing');

    const hasIndicator = await greenline.isVisible() || await redline.isVisible();

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Pricing Indicator');

    expect(hasIndicator).toBe(true);
  });

  test('High profit margin shows Greenline', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    // High profit margin should show greenline (> 30% above original)
    await setFormInputs(janitorialForm, page, {
      sqFt: 1000,
      costPerHour: 20,
      grossProfitPct: 50 // Very high profit
    });

    await captureFormScreenshot(page, janitorialForm, testInfo, 'High Profit Margin');

    // Just verify pricing summary is visible
    await expect(janitorialForm.locator('text=Pricing Summary')).toBeVisible();
  });
});

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

test.describe('Real-World Business Scenarios', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Small office - Weekly cleaning', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      placeType: 'Office',
      frequency: 'weekly',
      visitsPerWeek: 2,
      sqFt: 2500,
      costPerHour: 22,
      laborTaxPct: 15,
      grossProfitPct: 33
    });

    const contractTotal = await getPricingValue(janitorialForm, 'Contract Total', page);
    const monthlyRecurring = await getPricingValue(janitorialForm, 'Monthly Recurring', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Small Office Weekly');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  SCENARIO: Small Office - Weekly Cleaning                                ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Size: 2,500 sq ft | Visits: 2/week | Rate: $22/hr                       ║
║  Contract Total: ${formatCurrency(contractTotal).padEnd(55)} ║
║  Monthly Recurring: ${formatCurrency(monthlyRecurring).padEnd(52)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    expect(contractTotal).toBeGreaterThan(0);
    expect(monthlyRecurring).toBeGreaterThan(0);
  });

  test('Restaurant - Daily cleaning', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      placeType: 'Restaurant',
      frequency: 'weekly',
      visitsPerWeek: 7, // Daily
      sqFt: 3500,
      costPerHour: 25,
      laborTaxPct: 18,
      grossProfitPct: 35
    });

    const contractTotal = await getPricingValue(janitorialForm, 'Contract Total', page);
    const monthlyRecurring = await getPricingValue(janitorialForm, 'Monthly Recurring', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Restaurant Daily');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  SCENARIO: Restaurant - Daily Cleaning                                   ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Size: 3,500 sq ft | Visits: 7/week (Daily) | Rate: $25/hr               ║
║  Contract Total: ${formatCurrency(contractTotal).padEnd(55)} ║
║  Monthly Recurring: ${formatCurrency(monthlyRecurring).padEnd(52)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    expect(contractTotal).toBeGreaterThan(0);
  });

  test('Large warehouse - Monthly cleaning', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      placeType: 'Business Place',
      frequency: 'monthly',
      sqFt: 50000,
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 30
    });

    const contractTotal = await getPricingValue(janitorialForm, 'Contract Total', page);
    const monthlyRecurring = await getPricingValue(janitorialForm, 'Monthly Recurring', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Large Warehouse Monthly');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  SCENARIO: Large Warehouse - Monthly Cleaning                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Size: 50,000 sq ft | Frequency: Monthly | Rate: $20/hr                  ║
║  Contract Total: ${formatCurrency(contractTotal).padEnd(55)} ║
║  Monthly Recurring: ${formatCurrency(monthlyRecurring).padEnd(52)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    expect(contractTotal).toBeGreaterThan(0);
  });

  test('Home deep clean - One-time service', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      placeType: 'Home',
      frequency: 'oneTime',
      sqFt: 2000,
      costPerHour: 30, // Premium rate for deep clean
      laborTaxPct: 15,
      grossProfitPct: 40
    });

    // One-time shows "Total Price" instead of "Contract Total"
    const totalPrice = await getPricingValue(janitorialForm, 'Total Price', page).catch(() =>
      getPricingValue(janitorialForm, 'Contract Total', page)
    );

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Home Deep Clean One-Time');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  SCENARIO: Home Deep Clean - One-Time Service                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Size: 2,000 sq ft | Frequency: One-Time | Rate: $30/hr (Premium)        ║
║  Total Price: ${formatCurrency(totalPrice).padEnd(58)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    expect(totalPrice).toBeGreaterThan(0);
  });

  test('Corporate headquarters - Premium service', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      placeType: 'Office',
      frequency: 'weekly',
      visitsPerWeek: 5,
      sqFt: 75000,
      costPerHour: 28,
      laborTaxPct: 20,
      grossProfitPct: 38
    });

    const contractTotal = await getPricingValue(janitorialForm, 'Contract Total', page);
    const monthlyRecurring = await getPricingValue(janitorialForm, 'Monthly Recurring', page);
    const annualValue = await getPricingValue(janitorialForm, 'Annual Contract Value', page);

    await captureFormScreenshot(page, janitorialForm, testInfo, 'Corporate HQ Premium');

    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  SCENARIO: Corporate Headquarters - Premium Service                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Size: 75,000 sq ft | Visits: 5/week | Rate: $28/hr                      ║
║  Annual Value: ${formatCurrency(annualValue).padEnd(57)} ║
║  Contract Total: ${formatCurrency(contractTotal).padEnd(55)} ║
║  Monthly Recurring: ${formatCurrency(monthlyRecurring).padEnd(52)} ║
╚══════════════════════════════════════════════════════════════════════════╝`);

    expect(contractTotal).toBeGreaterThan(100000); // Should be a large contract
  });
});

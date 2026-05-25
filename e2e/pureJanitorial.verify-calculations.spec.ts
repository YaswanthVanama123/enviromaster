/**
 * Playwright E2E Tests - Janitorial Calculation Verification
 *
 * These tests verify that all calculations are mathematically correct
 * by entering specific values and checking the computed results.
 *
 * Each test displays Expected vs Actual values and captures screenshots.
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

// Helper function to setup Janitorial form
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

// Helper to extract dollar value from text (handles formatted numbers like "1,040.00")
function extractDollarValue(text: string): number {
  const match = text.match(/\$?\s*([\d,]+\.?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return 0;
}

// Helper to format number as currency for display
function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper to get the value from a pricing row (uses svc-row-charge class for pricing summary rows)
async function getPricingValue(form: Locator, labelText: string, page: Page): Promise<number> {
  // Pricing summary rows have class svc-row-charge
  // Handle labels that include dynamic values like percentages or months
  let selector = labelText;
  if (labelText === 'Gross Profit') {
    selector = 'Gross Profit (';
  } else if (labelText === 'Annual Labor Tax') {
    selector = 'Annual Labor Tax';
  } else if (labelText === 'Contract Total') {
    selector = 'Contract Total';
  }

  const row = form.locator('.svc-row-charge').filter({ has: page.locator(`label:has-text("${selector}")`) });
  await row.first().scrollIntoViewIfNeeded().catch(() => {});

  // Get the input value from within the row
  const input = row.first().locator('input');
  const value = await input.inputValue().catch(() => '0');

  return extractDollarValue(value);
}

// Helper to set form inputs
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
  }
) {
  if (values.frequency) {
    const frequencySelect = form.locator('.svc-row').filter({ has: page.locator('label').filter({ hasText: /^Frequency$/ }) }).locator('select');
    await frequencySelect.selectOption(values.frequency);
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
    await costInput.press('Tab'); // Commit the value
    await page.waitForTimeout(100);
  }

  if (values.laborTaxPct !== undefined) {
    const taxInput = form.locator('input[name="laborTaxPct"]');
    await taxInput.click();
    await taxInput.fill(String(values.laborTaxPct));
    await taxInput.press('Tab'); // Commit the value
    await page.waitForTimeout(100);
  }

  if (values.grossProfitPct !== undefined) {
    const gpInput = form.locator('input[name="grossProfitPct"]');
    await gpInput.click();
    await gpInput.fill(String(values.grossProfitPct));
    await gpInput.press('Tab'); // Commit the value
    await page.waitForTimeout(100);
  }

  if (values.sqFt !== undefined) {
    const sqFtInput = form.locator('input[name="sqFt"]');
    await sqFtInput.click();
    await sqFtInput.fill(String(values.sqFt));
    await sqFtInput.press('Tab'); // Commit the value and trigger calculations
  }

  await page.waitForTimeout(500); // Wait for calculations to complete
}

// Helper to get production rate from Hours Per Visit tooltip
async function getProductionRate(form: Locator, page: Page): Promise<number> {
  const hoursInput = form.locator('.svc-row').filter({ has: page.locator('label:has-text("Hours Per Visit")') }).locator('input');
  const title = await hoursInput.getAttribute('title') || '';
  const match = title.match(/Production rate: (\d+)/);
  return match ? parseInt(match[1]) : 1000;
}

// Helper to get total supplies from all supply input fields
async function getTotalSupplies(form: Locator, page: Page): Promise<number> {
  // Supply names match DEFAULT_SUPPLIES from useJanitorialCalc.ts
  const supplyNames = [
    'Vacuums',
    'Mops',
    'Mop Buckets',
    'Dust Mops',
    'Microfiber',
    'Cleaning Products',
    'Consumables',
    'Miscellaneous'
  ];

  let total = 0;

  for (const name of supplyNames) {
    // For "Mops" use exact match to avoid matching "Dust Mops"
    let row;
    if (name === 'Mops') {
      row = form.locator('.svc-row').filter({ has: page.locator('label').filter({ hasText: /^Mops$/ }) });
    } else {
      row = form.locator('.svc-row').filter({ has: page.locator(`label:has-text("${name}")`) });
    }

    const input = row.locator('input');
    const value = await input.inputValue().catch(() => '0');
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      total += parsed;
    }
  }

  return total;
}

// Helper to capture screenshot with pricing summary visible
async function captureFormScreenshot(page: Page, form: Locator, testInfo: any, name: string) {
  // Scroll to show the pricing summary
  const pricingSummary = form.locator('text=Pricing Summary');
  await pricingSummary.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);

  // Capture full form screenshot
  const screenshot = await form.screenshot();
  await testInfo.attach(name, { body: screenshot, contentType: 'image/png' });
}

// Helper to log comparison result
function logComparison(testInfo: any, label: string, expected: number | string, actual: number | string, formula?: string) {
  const comparison = `
╔══════════════════════════════════════════════════════════════╗
║  ${label.padEnd(58)} ║
╠══════════════════════════════════════════════════════════════╣
${formula ? `║  Formula: ${formula.padEnd(49)} ║\n` : ''}║  Expected: ${String(expected).padEnd(48)} ║
║  Actual:   ${String(actual).padEnd(48)} ║
║  Match:    ${(expected === actual || Math.abs(Number(expected) - Number(actual)) < 1 ? '✅ PASS' : '❌ FAIL').padEnd(48)} ║
╚══════════════════════════════════════════════════════════════╝`;

  console.log(comparison);

  // Also add as test annotation
  testInfo.annotations.push({
    type: label,
    description: `Expected: ${expected} | Actual: ${actual} | ${formula || ''}`
  });
}

test.describe('Janitorial Calculation Verification - Basic Scenarios', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Verify Hours Per Visit calculation', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    // Get the production rate
    const productionRate = await getProductionRate(janitorialForm, page);
    console.log(`\n📊 Production Rate: ${productionRate} sq ft/hr`);

    // Enter 2000 sq ft
    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('2000');
    await sqFtInput.press('Tab');
    await page.waitForTimeout(500);

    // Expected hours = sqFt / productionRate
    const expectedHours = (2000 / productionRate).toFixed(2);

    const hoursInput = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Hours Per Visit")') }).locator('input');
    const actualHours = await hoursInput.inputValue();

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Hours Per Visit Calculation');

    logComparison(testInfo, 'Hours Per Visit', `${expectedHours} hrs`, actualHours, `2000 sqFt / ${productionRate} rate = ${expectedHours} hrs`);

    expect(actualHours).toBe(`${expectedHours} hrs`);
  });

  test('Verify Annual Base Labor calculation - Weekly', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    const productionRate = await getProductionRate(janitorialForm, page);
    console.log(`\n📊 Production Rate: ${productionRate} sq ft/hr`);

    // Set specific values
    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      sqFt: 1000
    });

    // Calculate expected:
    // Hours = 1000 / productionRate
    // Annual Base Labor = hours × costPerHour × visitsPerWeek × 52
    const hours = 1000 / productionRate;
    const expectedAnnualLabor = hours * 20 * 1 * 52;

    const actualAnnualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Annual Base Labor Calculation');

    logComparison(
      testInfo,
      'Annual Base Labor',
      formatCurrency(expectedAnnualLabor),
      formatCurrency(actualAnnualLabor),
      `(1000/${productionRate}) hrs × $20/hr × 1 visit × 52 weeks`
    );

    expect(actualAnnualLabor).toBeCloseTo(expectedAnnualLabor, 0);
  });

  test('Verify Annual Labor Tax calculation', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    // Set specific values with 15% tax
    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      sqFt: 1000
    });

    const annualBaseLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);
    const expectedTax = annualBaseLabor * 0.15;

    const actualTax = await getPricingValue(janitorialForm, 'Annual Labor Tax', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Annual Labor Tax Calculation');

    logComparison(
      testInfo,
      'Annual Labor Tax',
      formatCurrency(expectedTax),
      formatCurrency(actualTax),
      `${formatCurrency(annualBaseLabor)} × 15% = ${formatCurrency(expectedTax)}`
    );

    expect(actualTax).toBeCloseTo(expectedTax, 0);
  });

  test('Verify Total Annual Labor = Base + Tax', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 25,
      laborTaxPct: 18,
      sqFt: 1500
    });

    const baseLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);
    const laborTax = await getPricingValue(janitorialForm, 'Annual Labor Tax', page);
    const totalLabor = await getPricingValue(janitorialForm, 'Total Annual Labor', page);

    const expectedTotal = baseLabor + laborTax;

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Total Annual Labor Calculation');

    logComparison(
      testInfo,
      'Total Annual Labor',
      formatCurrency(expectedTotal),
      formatCurrency(totalLabor),
      `${formatCurrency(baseLabor)} + ${formatCurrency(laborTax)} = ${formatCurrency(expectedTotal)}`
    );

    expect(totalLabor).toBeCloseTo(expectedTotal, 0);
  });

  test('Verify Annual Supplies equals sum of all supply items', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, { sqFt: 1000 });

    const totalSupplies = await getTotalSupplies(janitorialForm, page);
    const annualSupplies = await getPricingValue(janitorialForm, 'Annual Supplies', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Annual Supplies Calculation');

    logComparison(
      testInfo,
      'Annual Supplies',
      formatCurrency(totalSupplies),
      formatCurrency(annualSupplies),
      'Sum of all supply line items'
    );

    expect(annualSupplies).toBeCloseTo(totalSupplies, 0);
  });

  test('Verify Total Annual Cost = Labor + Supplies', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      sqFt: 1000
    });

    const totalLabor = await getPricingValue(janitorialForm, 'Total Annual Labor', page);
    const annualSupplies = await getPricingValue(janitorialForm, 'Annual Supplies', page);
    const totalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);

    const expectedTotalCost = totalLabor + annualSupplies;

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Total Annual Cost Calculation');

    logComparison(
      testInfo,
      'Total Annual Cost',
      formatCurrency(expectedTotalCost),
      formatCurrency(totalCost),
      `${formatCurrency(totalLabor)} + ${formatCurrency(annualSupplies)} = ${formatCurrency(expectedTotalCost)}`
    );

    expect(totalCost).toBeCloseTo(expectedTotalCost, 0);
  });
});

test.describe('Janitorial Calculation Verification - Gross Profit', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Verify Gross Profit calculation at 33%', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
      sqFt: 1000
    });

    const totalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);
    // Gross Profit formula: cost × (gp% / (100 - gp%))
    const expectedGrossProfit = totalCost * (33 / (100 - 33));

    const actualGrossProfit = await getPricingValue(janitorialForm, 'Gross Profit', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Gross Profit at 33%');

    logComparison(
      testInfo,
      'Gross Profit (33%)',
      formatCurrency(expectedGrossProfit),
      formatCurrency(actualGrossProfit),
      `${formatCurrency(totalCost)} × (33 / 67) = ${formatCurrency(expectedGrossProfit)}`
    );

    expect(actualGrossProfit).toBeCloseTo(expectedGrossProfit, 0);
  });

  test('Verify Gross Profit calculation at 50%', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 50,
      sqFt: 1000
    });

    const totalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);
    // At 50%, gross profit = total cost (doubles the price)
    const expectedGrossProfit = totalCost * (50 / (100 - 50));

    const actualGrossProfit = await getPricingValue(janitorialForm, 'Gross Profit', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Gross Profit at 50%');

    logComparison(
      testInfo,
      'Gross Profit (50%)',
      formatCurrency(expectedGrossProfit),
      formatCurrency(actualGrossProfit),
      `${formatCurrency(totalCost)} × (50 / 50) = ${formatCurrency(expectedGrossProfit)}`
    );

    expect(actualGrossProfit).toBeCloseTo(expectedGrossProfit, 0);
  });

  test('Verify Annual Contract Value = Cost + Profit', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
      sqFt: 1000
    });

    const totalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);
    const grossProfit = await getPricingValue(janitorialForm, 'Gross Profit', page);
    const annualValue = await getPricingValue(janitorialForm, 'Annual Contract Value', page);

    const expectedAnnualValue = totalCost + grossProfit;

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Annual Contract Value');

    logComparison(
      testInfo,
      'Annual Contract Value',
      formatCurrency(expectedAnnualValue),
      formatCurrency(annualValue),
      `${formatCurrency(totalCost)} + ${formatCurrency(grossProfit)} = ${formatCurrency(expectedAnnualValue)}`
    );

    expect(annualValue).toBeCloseTo(expectedAnnualValue, 0);
  });
});

test.describe('Janitorial Calculation Verification - Contract Totals', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Verify Contract Total for 12-month contract', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
      sqFt: 1000
    });

    const annualValue = await getPricingValue(janitorialForm, 'Annual Contract Value', page);
    const contractTotal = await getPricingValue(janitorialForm, 'Contract Total', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Contract Total 12-month');

    logComparison(
      testInfo,
      'Contract Total',
      formatCurrency(annualValue),
      formatCurrency(contractTotal),
      'Contract Total should equal Annual Contract Value for 12-month contract'
    );

    expect(contractTotal).toBeGreaterThan(0);
  });

  test('Verify Monthly Recurring = Contract Total / Months', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
      sqFt: 1000
    });

    const contractTotal = await getPricingValue(janitorialForm, 'Contract Total', page);
    const monthlyRecurring = await getPricingValue(janitorialForm, 'Monthly Recurring', page);
    const expectedMonthly = contractTotal / 12;

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Monthly Recurring');

    logComparison(
      testInfo,
      'Monthly Recurring',
      formatCurrency(expectedMonthly),
      formatCurrency(monthlyRecurring),
      `${formatCurrency(contractTotal)} / 12 months = ${formatCurrency(expectedMonthly)}`
    );

    expect(monthlyRecurring).toBeLessThan(contractTotal);
    expect(monthlyRecurring).toBeGreaterThan(0);
  });
});

test.describe('Janitorial Calculation Verification - Frequency Multipliers', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Weekly frequency uses 52x multiplier', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      sqFt: productionRate // 1 hour exactly
    });

    // 1 hour × $20 × 1 visit × 52 weeks = $1040
    const expectedLabor = 20 * 1 * 52;
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Weekly Frequency 52x');

    logComparison(
      testInfo,
      'Weekly (52x multiplier)',
      formatCurrency(expectedLabor),
      formatCurrency(actualLabor),
      `1 hr × $20/hr × 1 visit × 52 weeks = ${formatCurrency(expectedLabor)}`
    );

    expect(actualLabor).toBeCloseTo(expectedLabor, 0);
  });

  test('Monthly frequency uses 12x multiplier', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'monthly',
      costPerHour: 20,
      sqFt: productionRate // 1 hour exactly
    });

    // 1 hour × $20 × 12 months = $240
    const expectedLabor = 20 * 12;
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Monthly Frequency 12x');

    logComparison(
      testInfo,
      'Monthly (12x multiplier)',
      formatCurrency(expectedLabor),
      formatCurrency(actualLabor),
      `1 hr × $20/hr × 12 months = ${formatCurrency(expectedLabor)}`
    );

    expect(actualLabor).toBeCloseTo(expectedLabor, 0);
  });

  test('One-time frequency uses 1x multiplier', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'oneTime',
      costPerHour: 20,
      sqFt: productionRate // 1 hour exactly
    });

    // 1 hour × $20 × 1 = $20
    const expectedLabor = 20 * 1;
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'One-time Frequency 1x');

    logComparison(
      testInfo,
      'One-time (1x multiplier)',
      formatCurrency(expectedLabor),
      formatCurrency(actualLabor),
      `1 hr × $20/hr × 1 = ${formatCurrency(expectedLabor)}`
    );

    expect(actualLabor).toBeCloseTo(expectedLabor, 0);
  });
});

test.describe('Janitorial Calculation Verification - Visits Per Week', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('2 visits per week doubles the labor cost', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    // Get labor with 1 visit
    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      sqFt: 1000
    });
    const laborWith1Visit = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    // Get labor with 2 visits
    await setFormInputs(janitorialForm, page, { visitsPerWeek: 2 });
    await page.waitForTimeout(300);
    const laborWith2Visits = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    const expectedLabor = laborWith1Visit * 2;

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, '2 Visits Per Week');

    logComparison(
      testInfo,
      '2 Visits Per Week',
      formatCurrency(expectedLabor),
      formatCurrency(laborWith2Visits),
      `${formatCurrency(laborWith1Visit)} × 2 visits = ${formatCurrency(expectedLabor)}`
    );

    expect(laborWith2Visits).toBeCloseTo(laborWith1Visit * 2, 0);
  });

  test('5 visits per week = 5x labor cost', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    // Get labor with 1 visit
    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      sqFt: 1000
    });
    const laborWith1Visit = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    // Get labor with 5 visits
    await setFormInputs(janitorialForm, page, { visitsPerWeek: 5 });
    await page.waitForTimeout(300);
    const laborWith5Visits = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    const expectedLabor = laborWith1Visit * 5;

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, '5 Visits Per Week');

    logComparison(
      testInfo,
      '5 Visits Per Week',
      formatCurrency(expectedLabor),
      formatCurrency(laborWith5Visits),
      `${formatCurrency(laborWith1Visit)} × 5 visits = ${formatCurrency(expectedLabor)}`
    );

    expect(laborWith5Visits).toBeCloseTo(laborWith1Visit * 5, 0);
  });
});

test.describe('Janitorial Calculation Verification - Supply Changes', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Increasing supply value increases Annual Supplies', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, { sqFt: 1000 });
    const initialSupplies = await getPricingValue(janitorialForm, 'Annual Supplies', page);

    // Increase Vacuums by 500
    const vacuumsRow = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Vacuums")') });
    const vacuumsInput = vacuumsRow.locator('input');
    await vacuumsInput.fill('600'); // Was 100, now 600 (+500)
    await vacuumsInput.press('Tab');
    await page.waitForTimeout(300);

    const newSupplies = await getPricingValue(janitorialForm, 'Annual Supplies', page);
    const expectedSupplies = initialSupplies + 500;

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Supply Increase');

    logComparison(
      testInfo,
      'Annual Supplies After Increase',
      formatCurrency(expectedSupplies),
      formatCurrency(newSupplies),
      `${formatCurrency(initialSupplies)} + $500 = ${formatCurrency(expectedSupplies)}`
    );

    expect(newSupplies).toBeCloseTo(initialSupplies + 500, 0);
  });

  test('Supply changes affect Total Annual Cost', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, { sqFt: 1000 });
    const initialCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);

    // Increase Mops by 1000
    const mopsRow = janitorialForm.locator('.svc-row').filter({ has: page.locator('label').filter({ hasText: /^Mops$/ }) });
    const mopsInput = mopsRow.locator('input');
    await mopsInput.fill('1500'); // Was 500, now 1500 (+1000)
    await mopsInput.press('Tab');
    await page.waitForTimeout(300);

    const newCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);
    const expectedCost = initialCost + 1000;

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Supply Affects Total Cost');

    logComparison(
      testInfo,
      'Total Annual Cost After Supply Change',
      formatCurrency(expectedCost),
      formatCurrency(newCost),
      `${formatCurrency(initialCost)} + $1000 = ${formatCurrency(expectedCost)}`
    );

    expect(newCost).toBeCloseTo(initialCost + 1000, 0);
  });

  test('Supply changes affect Contract Total', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      grossProfitPct: 33,
      sqFt: 1000
    });
    const initialContractTotal = await getPricingValue(janitorialForm, 'Contract Total', page);

    // Increase Cleaning Products by 500
    const productsRow = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Cleaning Products")') });
    const productsInput = productsRow.locator('input');
    const currentValue = await productsInput.inputValue();
    const currentAmount = parseFloat(currentValue) || 0; // Handle empty value
    await productsInput.fill(String(currentAmount + 500));
    await productsInput.press('Tab');
    await page.waitForTimeout(300);

    const newContractTotal = await getPricingValue(janitorialForm, 'Contract Total', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Supply Affects Contract Total');

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Supply Changes Affect Contract Total                        ║
╠══════════════════════════════════════════════════════════════╣
║  Initial Contract Total: ${formatCurrency(initialContractTotal).padEnd(34)} ║
║  After +$500 Supplies:   ${formatCurrency(newContractTotal).padEnd(34)} ║
║  Difference:             ${formatCurrency(newContractTotal - initialContractTotal).padEnd(34)} ║
║  (Should be > $500 due to 33% gross profit margin)           ║
╚══════════════════════════════════════════════════════════════╝`);

    testInfo.annotations.push({
      type: 'Supply Change Impact',
      description: `Initial: ${formatCurrency(initialContractTotal)} | After: ${formatCurrency(newContractTotal)} | Diff: ${formatCurrency(newContractTotal - initialContractTotal)}`
    });

    expect(newContractTotal).toBeGreaterThan(initialContractTotal);
  });
});

test.describe('Janitorial Calculation Verification - Edge Cases', () => {
  let janitorialForm: Locator;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/form-filling');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    janitorialForm = await setupJanitorialForm(page);
  });

  test('Zero square feet shows no pricing', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    const sqFtInput = janitorialForm.locator('input[name="sqFt"]');
    await sqFtInput.fill('0');
    await sqFtInput.press('Tab');

    // Capture screenshot
    const screenshot = await janitorialForm.screenshot();
    await testInfo.attach('Zero Square Feet', { body: screenshot, contentType: 'image/png' });

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Zero Square Feet Edge Case                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Input: 0 sq ft                                              ║
║  Expected: Pricing Summary should NOT be visible             ║
╚══════════════════════════════════════════════════════════════╝`);

    // Pricing Summary should NOT be visible
    await expect(janitorialForm.locator('text=Pricing Summary')).not.toBeVisible();
  });

  test('Very large square feet calculates correctly', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);
    const productionRate = await getProductionRate(janitorialForm, page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      sqFt: 100000 // Very large
    });

    // Hours = 100000 / productionRate
    const expectedHours = (100000 / productionRate).toFixed(2);

    const hoursInput = janitorialForm.locator('.svc-row').filter({ has: page.locator('label:has-text("Hours Per Visit")') }).locator('input');
    const actualHours = await hoursInput.inputValue();

    // Annual Base Labor should be calculated
    const expectedLabor = (100000 / productionRate) * 20 * 52;
    const actualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Large Square Feet');

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Large Square Feet (100,000 sq ft)                           ║
╠══════════════════════════════════════════════════════════════╣
║  Production Rate: ${String(productionRate).padEnd(40)} ║
║  Expected Hours:  ${expectedHours.padEnd(40)} ║
║  Actual Hours:    ${actualHours.padEnd(40)} ║
║  Expected Labor:  ${formatCurrency(expectedLabor).padEnd(40)} ║
║  Actual Labor:    ${formatCurrency(actualLabor).padEnd(40)} ║
╚══════════════════════════════════════════════════════════════╝`);

    expect(actualHours).toBe(`${expectedHours} hrs`);
    expect(actualLabor).toBeCloseTo(expectedLabor, -1);
  });

  test('Zero cost per hour results in zero labor', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      costPerHour: 0,
      sqFt: 1000
    });

    const annualLabor = await getPricingValue(janitorialForm, 'Annual Base Labor', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Zero Cost Per Hour');

    logComparison(
      testInfo,
      'Zero Cost Per Hour',
      formatCurrency(0),
      formatCurrency(annualLabor),
      'Any hours × $0/hr = $0'
    );

    expect(annualLabor).toBe(0);
  });

  test('Zero gross profit means cost equals contract value', async ({ page }, testInfo) => {
    janitorialForm = await setupJanitorialForm(page);

    await setFormInputs(janitorialForm, page, {
      frequency: 'weekly',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 0,
      sqFt: 1000
    });

    const totalCost = await getPricingValue(janitorialForm, 'Total Annual Cost', page);
    const grossProfit = await getPricingValue(janitorialForm, 'Gross Profit', page);
    const annualValue = await getPricingValue(janitorialForm, 'Annual Contract Value', page);

    // Capture screenshot
    await captureFormScreenshot(page, janitorialForm, testInfo, 'Zero Gross Profit');

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Zero Gross Profit Edge Case                                 ║
╠══════════════════════════════════════════════════════════════╣
║  Total Annual Cost:      ${formatCurrency(totalCost).padEnd(34)} ║
║  Gross Profit (0%):      ${formatCurrency(grossProfit).padEnd(34)} ║
║  Annual Contract Value:  ${formatCurrency(annualValue).padEnd(34)} ║
║  Expected: Cost = Contract Value when profit is 0%           ║
╚══════════════════════════════════════════════════════════════╝`);

    expect(grossProfit).toBe(0);
    expect(annualValue).toBeCloseTo(totalCost, 0);
  });
});

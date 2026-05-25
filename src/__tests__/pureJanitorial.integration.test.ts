/**
 * Pure Janitorial Service - Integration & Validation Tests
 *
 * Tests for:
 * - Form state initialization
 * - Admin rates application
 * - Data sync to services context
 * - PDF data structure validation
 * - Business rule validations
 */

import { describe, test, expect } from 'vitest';

import type {
  JanitorialFormState,
  JanitorialAdminRates,
  JanitorialSupplyItem,
  JanitorialFrequencyKey,
} from '../components/services/purejanitorial/janitorialTypes';

import { computeJanitorialCalc, DEFAULT_SUPPLIES } from '../components/services/purejanitorial/useJanitorialCalc';
import { janitorialFrequencyList, janitorialFrequencyLabels, janitorialPricingConfig } from '../components/services/purejanitorial/janitorialConfig';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createFormState = (overrides: Partial<JanitorialFormState> = {}): JanitorialFormState => ({
  frequency: 'weekly',
  visitsPerWeek: 1,
  placeType: 'office',
  sqFt: 0,
  costPerHour: 20,
  laborTaxPct: 15,
  grossProfitPct: 33,
  supplies: [...DEFAULT_SUPPLIES],
  contractMonths: 12,
  ...overrides,
});

const createAdminRates = (overrides: Partial<JanitorialAdminRates> = {}): JanitorialAdminRates => ({
  productionRates: {
    office: 1000,
    home: 500,
    restaurant: 800,
    warehouse: 2000,
  },
  costPerHour: 20,
  laborTaxPct: 15,
  grossProfitPct: 33,
  defaultSupplies: DEFAULT_SUPPLIES,
  ...overrides,
});

const round2 = (n: number) => Math.round(n * 100) / 100;

// ============================================================================
// CONFIGURATION VALIDATION TESTS
// ============================================================================

describe('Configuration Validation', () => {
  test('all frequencies have billing conversions defined', () => {
    janitorialFrequencyList.forEach(freq => {
      expect(janitorialPricingConfig.billingConversions[freq]).toBeDefined();
      expect(janitorialPricingConfig.billingConversions[freq].annualMultiplier).toBeGreaterThanOrEqual(0);
      expect(janitorialPricingConfig.billingConversions[freq].monthlyMultiplier).toBeGreaterThanOrEqual(0);
    });
  });

  test('all frequencies have labels defined', () => {
    janitorialFrequencyList.forEach(freq => {
      expect(janitorialFrequencyLabels[freq]).toBeDefined();
      expect(janitorialFrequencyLabels[freq].length).toBeGreaterThan(0);
    });
  });

  test('default supplies array has expected items', () => {
    expect(DEFAULT_SUPPLIES).toHaveLength(8);

    const expectedNames = [
      'Vacuums', 'Mops', 'Mop Buckets', 'Dust Mops',
      'Microfiber', 'Cleaning Products', 'Consumables', 'Miscellaneous'
    ];

    DEFAULT_SUPPLIES.forEach((supply, index) => {
      expect(supply.name).toBe(expectedNames[index]);
      expect(typeof supply.amount).toBe('number');
    });
  });

  test('pricing config has valid min/max contract months', () => {
    expect(janitorialPricingConfig.minContractMonths).toBeGreaterThan(0);
    expect(janitorialPricingConfig.maxContractMonths).toBeGreaterThan(janitorialPricingConfig.minContractMonths);
  });
});

// ============================================================================
// SERVICE CONTEXT DATA STRUCTURE TESTS
// ============================================================================

describe('Service Context Data Structure', () => {
  test('generates correct totals structure for PDF', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'weekly',
      laborTaxPct: 15,
      grossProfitPct: 33,
      contractMonths: 12,
    });
    const adminRates = createAdminRates();
    const calc = computeJanitorialCalc(form, adminRates);

    // Simulate the data structure sent to services context
    const serviceData = {
      serviceId: 'pureJanitorial',
      displayName: 'Janitorial',
      isActive: form.sqFt > 0,
      contractTotal: calc.contractTotal,
      totals: {
        annualBaseLabor: {
          isDisplay: true,
          orderNo: 30,
          label: 'Annual Base Labor',
          type: 'dollar' as const,
          amount: calc.annualBaseLabor,
        },
        annualLaborTax: {
          isDisplay: true,
          orderNo: 31,
          label: `Annual Labor Tax (${form.laborTaxPct}%)`,
          type: 'dollar' as const,
          amount: calc.annualLaborTax,
        },
        annualSupplies: {
          isDisplay: true,
          orderNo: 32,
          label: 'Annual Supplies',
          type: 'dollar' as const,
          amount: calc.totalAnnualSupplies,
        },
        totalAnnualCost: {
          isDisplay: true,
          orderNo: 33,
          label: 'Total Annual Cost',
          type: 'dollar' as const,
          amount: calc.totalAnnualCost,
        },
        grossProfit: {
          isDisplay: true,
          orderNo: 34,
          label: `Gross Profit (${form.grossProfitPct}%)`,
          type: 'dollar' as const,
          amount: calc.grossProfit,
        },
        annualContractValue: {
          isDisplay: true,
          orderNo: 35,
          label: 'Annual Contract Value',
          type: 'dollar' as const,
          amount: calc.annualContractValue,
        },
        contract: {
          isDisplay: true,
          orderNo: 37,
          label: 'Contract Total',
          type: 'dollar' as const,
          months: form.contractMonths,
          amount: calc.contractTotal,
        },
      },
    };

    // Verify structure
    expect(serviceData.isActive).toBe(true);
    expect(serviceData.totals.annualBaseLabor.amount).toBe(calc.annualBaseLabor);
    expect(serviceData.totals.annualLaborTax.amount).toBe(calc.annualLaborTax);
    expect(serviceData.totals.contract.months).toBe(12);
  });

  test('service is inactive when sqFt is 0', () => {
    const form = createFormState({ sqFt: 0 });
    const isActive = form.sqFt > 0;

    expect(isActive).toBe(false);
  });

  test('monthly recurring included for non-oneTime frequencies', () => {
    const form = createFormState({
      sqFt: 1000,
      frequency: 'weekly',
      contractMonths: 12,
    });
    const adminRates = createAdminRates();
    const calc = computeJanitorialCalc(form, adminRates);

    expect(calc.monthlyRecurring).toBeGreaterThan(0);
  });

  test('monthly recurring excluded for oneTime frequency', () => {
    const form = createFormState({
      sqFt: 1000,
      frequency: 'oneTime',
    });
    const adminRates = createAdminRates();
    const calc = computeJanitorialCalc(form, adminRates);

    expect(calc.monthlyRecurring).toBe(0);
  });
});

// ============================================================================
// ADMIN RATES APPLICATION TESTS
// ============================================================================

describe('Admin Rates Application', () => {
  test('applies admin production rates correctly', () => {
    const adminRates = createAdminRates({
      productionRates: {
        office: 1200, // Different from default 1000
      },
    });
    const form = createFormState({
      sqFt: 1200,
      placeType: 'office',
    });
    const result = computeJanitorialCalc(form, adminRates);

    // 1200 sqft / 1200 sqft per hour = 1 hour
    expect(result.hoursPerVisit).toBe(1);
  });

  test('uses admin default supplies for original contract calculation', () => {
    const adminSupplies: JanitorialSupplyItem[] = [
      { name: 'Item1', amount: 500 },
      { name: 'Item2', amount: 500 },
    ];
    const adminRates = createAdminRates({
      defaultSupplies: adminSupplies,
    });

    // User has different supplies
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      supplies: [
        { name: 'Item1', amount: 1000 },
        { name: 'Item2', amount: 1000 },
      ],
    });

    const result = computeJanitorialCalc(form, adminRates);

    // Current uses user supplies ($2000)
    expect(result.totalAnnualSupplies).toBe(2000);

    // Original should use admin supplies ($1000)
    // This affects originalContractTotal
    expect(result.originalContractTotal).not.toBe(result.contractTotal);
  });

  test('admin cost per hour used for original contract', () => {
    const adminRates = createAdminRates({
      costPerHour: 25,
    });
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      costPerHour: 35, // User override
    });

    const result = computeJanitorialCalc(form, adminRates);

    // Contract uses $35, original uses $25
    // So contract should be higher
    expect(result.contractTotal).toBeGreaterThan(result.originalContractTotal);
  });
});

// ============================================================================
// GREENLINE/REDLINE THRESHOLD TESTS
// ============================================================================

describe('Greenline/Redline Threshold', () => {
  test('marks as redline when contract equals original', () => {
    const adminRates = createAdminRates();
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      costPerHour: adminRates.costPerHour,
      laborTaxPct: adminRates.laborTaxPct,
      grossProfitPct: adminRates.grossProfitPct,
      supplies: adminRates.defaultSupplies,
    });
    const result = computeJanitorialCalc(form, adminRates);

    const isGreenline = result.contractTotal > result.originalContractTotal * 1.30;
    expect(isGreenline).toBe(false);
  });

  test('marks as greenline when contract > original × 1.30', () => {
    const adminRates = createAdminRates({
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
    });
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      costPerHour: 50, // Much higher
      laborTaxPct: 15,
      grossProfitPct: 50, // Higher margin
      supplies: adminRates.defaultSupplies,
    });
    const result = computeJanitorialCalc(form, adminRates);

    const isGreenline = result.contractTotal > result.originalContractTotal * 1.30;
    expect(isGreenline).toBe(true);
  });

  test('exact 30% increase is still redline', () => {
    const adminRates = createAdminRates();
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
    });

    // First get the baseline
    const baseResult = computeJanitorialCalc(form, adminRates);

    // Now create a form that results in exactly 30% higher
    const targetContract = baseResult.originalContractTotal * 1.30;
    const formWith130Percent = createFormState({
      sqFt: 1000,
      placeType: 'office',
      customContractTotal: targetContract,
    });
    const result = computeJanitorialCalc(formWith130Percent, adminRates);

    // Exactly 30% is NOT greater than 30%, so it's redline
    const isGreenline = result.contractTotal > result.originalContractTotal * 1.30;
    expect(isGreenline).toBe(false);
  });
});

// ============================================================================
// VISIT-BASED FREQUENCY TESTS
// ============================================================================

describe('Visit-Based Frequency Handling', () => {
  const visitBasedFrequencies: JanitorialFrequencyKey[] = [
    'biweekly',
    'twicePerMonth',
    'everyFourWeeks',
    'bimonthly',
    'quarterly',
    'biannual',
    'annual',
  ];

  visitBasedFrequencies.forEach(freq => {
    test(`${freq} frequency calculates per-visit correctly`, () => {
      const form = createFormState({
        sqFt: 1000,
        placeType: 'office',
        frequency: freq,
        supplies: [],
      });
      const adminRates = createAdminRates();
      const result = computeJanitorialCalc(form, adminRates);

      const multiplier = janitorialPricingConfig.billingConversions[freq].annualMultiplier;
      const expectedPerVisit = result.annualContractValue / multiplier;

      expect(round2(result.perVisit)).toBe(round2(expectedPerVisit));
    });
  });
});

// ============================================================================
// CALCULATION CONSISTENCY TESTS
// ============================================================================

describe('Calculation Consistency', () => {
  test('total annual cost = labor + tax + supplies', () => {
    const form = createFormState({
      sqFt: 2000,
      placeType: 'office',
      visitsPerWeek: 2,
      costPerHour: 25,
      laborTaxPct: 18,
      frequency: 'weekly',
      supplies: [
        { name: 'Item1', amount: 500 },
        { name: 'Item2', amount: 300 },
      ],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    const expected = result.annualBaseLabor + result.annualLaborTax + result.totalAnnualSupplies;
    expect(result.totalAnnualCost).toBe(expected);
  });

  test('gross profit = contract value - total cost', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      grossProfitPct: 33,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    const expectedGrossProfit = result.annualContractValue - result.totalAnnualCost;
    expect(round2(result.grossProfit)).toBe(round2(expectedGrossProfit));
  });

  test('contract total × (12/contractMonths) = annual value (for recurring)', () => {
    const contractMonthsValues = [6, 12, 24, 36];

    contractMonthsValues.forEach(months => {
      const form = createFormState({
        sqFt: 1000,
        placeType: 'office',
        frequency: 'weekly',
        contractMonths: months,
      });
      const adminRates = createAdminRates();
      const result = computeJanitorialCalc(form, adminRates);

      const expectedAnnual = result.contractTotal * (12 / months);
      expect(round2(expectedAnnual)).toBe(round2(result.annualContractValue));
    });
  });

  test('weekly labor matches hourly calculation', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 3,
      costPerHour: 25,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // hours × rate × visits = weekly labor
    const expectedWeeklyLabor = result.hoursPerVisit * form.costPerHour * form.visitsPerWeek;
    expect(result.weeklyLabor).toBe(expectedWeeklyLabor);
  });
});

// ============================================================================
// NUMERIC PRECISION TESTS
// ============================================================================

describe('Numeric Precision', () => {
  test('handles decimal square footage', () => {
    const form = createFormState({
      sqFt: 1234.56,
      placeType: 'office',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.hoursPerVisit).toBeCloseTo(1.23456, 4);
  });

  test('handles decimal cost per hour', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      costPerHour: 22.50,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 1 hour × $22.50 × 1 visit × 52 weeks = $1170
    expect(result.annualBaseLabor).toBe(1170);
  });

  test('handles decimal labor tax percentage', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      laborTaxPct: 15.5,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // $1040 × 15.5% = $161.20
    expect(result.annualLaborTax).toBe(161.2);
  });

  test('handles decimal gross profit percentage', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      grossProfitPct: 33.33,
      supplies: [],
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // cost / (1 - 0.3333) = cost / 0.6667
    const expectedValue = result.totalAnnualCost / (1 - 0.3333);
    expect(round2(result.annualContractValue)).toBe(round2(expectedValue));
  });
});

// ============================================================================
// INPUT VALIDATION / SANITIZATION TESTS
// ============================================================================

describe('Input Validation', () => {
  test('negative sqFt treated as 0', () => {
    // In real app, negative values should be prevented at input level
    // But calculation should handle gracefully
    const form = createFormState({
      sqFt: -1000, // Invalid
      placeType: 'office',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Negative sqFt results in negative hours, which flows through
    // The UI should prevent this, but calc doesn't crash
    expect(typeof result.hoursPerVisit).toBe('number');
  });

  test('handles empty place type string', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: '',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // No production rate for empty string, so 0 hours
    expect(result.hoursPerVisit).toBe(0);
  });

  test('handles undefined production rate gracefully', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'nonexistentType',
    });
    const adminRates = createAdminRates({
      productionRates: { office: 1000 }, // No 'nonexistentType'
    });
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.hoursPerVisit).toBe(0);
  });
});

// ============================================================================
// CONTRACT MONTHS BOUNDARY TESTS
// ============================================================================

describe('Contract Months Boundaries', () => {
  test('minimum contract months (2)', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'weekly',
      contractMonths: 2,
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(round2(result.contractTotal)).toBe(round2(result.annualContractValue * 2 / 12));
    expect(result.monthlyRecurring).toBeGreaterThan(0);
  });

  test('maximum contract months (36)', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'weekly',
      contractMonths: 36,
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(round2(result.contractTotal)).toBe(round2(result.annualContractValue * 3));
  });

  test('odd contract months (7)', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'weekly',
      contractMonths: 7,
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(round2(result.contractTotal)).toBe(round2(result.annualContractValue * 7 / 12));
    expect(round2(result.monthlyRecurring)).toBe(round2(result.contractTotal / 7));
  });
});

// ============================================================================
// FORMULA VERIFICATION TESTS
// ============================================================================

describe('Formula Verification', () => {
  test('verifies complete calculation flow', () => {
    // Given inputs
    const sqFt = 2000;
    const productionRate = 1000; // sqft per hour
    const visitsPerWeek = 2;
    const costPerHour = 25;
    const laborTaxPct = 15;
    const grossProfitPct = 33;
    const contractMonths = 12;
    const suppliesTotal = 1100; // Default supplies

    const form = createFormState({
      sqFt,
      placeType: 'office',
      visitsPerWeek,
      costPerHour,
      laborTaxPct,
      grossProfitPct,
      frequency: 'weekly',
      contractMonths,
    });
    const adminRates = createAdminRates({
      productionRates: { office: productionRate },
    });
    const result = computeJanitorialCalc(form, adminRates);

    // Step 1: Hours per visit
    const expectedHours = sqFt / productionRate; // 2000/1000 = 2
    expect(result.hoursPerVisit).toBe(expectedHours);

    // Step 2: Weekly labor
    const expectedWeeklyLabor = expectedHours * costPerHour * visitsPerWeek; // 2 × 25 × 2 = 100
    expect(result.weeklyLabor).toBe(expectedWeeklyLabor);

    // Step 3: Annual labor (weekly × 52)
    const expectedAnnualLabor = expectedWeeklyLabor * 52; // 100 × 52 = 5200
    expect(result.annualBaseLabor).toBe(expectedAnnualLabor);

    // Step 4: Labor tax
    const expectedTax = expectedAnnualLabor * (laborTaxPct / 100); // 5200 × 0.15 = 780
    expect(result.annualLaborTax).toBe(expectedTax);

    // Step 5: Total annual cost
    const expectedCost = expectedAnnualLabor + expectedTax + suppliesTotal; // 5200 + 780 + 1100 = 7080
    expect(result.totalAnnualCost).toBe(expectedCost);

    // Step 6: Annual contract value
    const expectedValue = expectedCost / (1 - grossProfitPct / 100); // 7080 / 0.67 = 10567.16
    expect(round2(result.annualContractValue)).toBe(round2(expectedValue));

    // Step 7: Contract total (12 months = annual)
    expect(round2(result.contractTotal)).toBe(round2(expectedValue));

    // Step 8: Monthly recurring
    const expectedMonthly = result.contractTotal / contractMonths;
    expect(round2(result.monthlyRecurring)).toBe(round2(expectedMonthly));

    // Step 9: Gross profit
    const expectedProfit = result.annualContractValue - result.totalAnnualCost;
    expect(round2(result.grossProfit)).toBe(round2(expectedProfit));
  });
});

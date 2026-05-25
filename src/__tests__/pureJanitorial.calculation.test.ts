/**
 * Pure Janitorial Service Calculation Tests
 *
 * Tests all calculation scenarios for the pureJanitorial service including:
 * - Hours per visit calculation (sqFt / production rate)
 * - Labor cost calculations (hourly rate × hours × visits)
 * - Labor tax calculations
 * - Supplies summation
 * - Total annual cost
 * - Gross profit margin calculation
 * - Contract total with different frequencies
 * - Monthly recurring calculations
 * - Per-visit calculations for visit-based frequencies
 * - Edge cases (zero values, boundary conditions)
 */

import { describe, test, expect } from 'vitest';

// Import types
import type {
  JanitorialFormState,
  JanitorialAdminRates,
  JanitorialCalcResult,
  JanitorialSupplyItem,
  JanitorialFrequencyKey,
} from '../components/services/purejanitorial/janitorialTypes';

// Import the calculation function
import { computeJanitorialCalc, DEFAULT_SUPPLIES } from '../components/services/purejanitorial/useJanitorialCalc';

// Import billing conversions for frequency multipliers
import { janitorialPricingConfig } from '../components/services/purejanitorial/janitorialConfig';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const DEFAULT_ADMIN_RATES: JanitorialAdminRates = {
  productionRates: {
    office: 1000,      // 1000 sq ft per hour
    home: 500,         // 500 sq ft per hour
    restaurant: 800,   // 800 sq ft per hour
    warehouse: 2000,   // 2000 sq ft per hour
    retail: 1200,      // 1200 sq ft per hour
  },
  costPerHour: 20,
  laborTaxPct: 15,
  grossProfitPct: 33,
  defaultSupplies: DEFAULT_SUPPLIES,
};

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
  ...DEFAULT_ADMIN_RATES,
  ...overrides,
});

// Helper to round to 2 decimal places for comparison
const round2 = (n: number) => Math.round(n * 100) / 100;

// ============================================================================
// HOURS PER VISIT CALCULATION TESTS
// ============================================================================

describe('Hours Per Visit Calculation', () => {
  test('calculates hours correctly for office place type', () => {
    const form = createFormState({ sqFt: 2000, placeType: 'office' });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 2000 sqft / 1000 sqft per hour = 2 hours
    expect(result.hoursPerVisit).toBe(2);
  });

  test('calculates hours correctly for home place type', () => {
    const form = createFormState({ sqFt: 1500, placeType: 'home' });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 1500 sqft / 500 sqft per hour = 3 hours
    expect(result.hoursPerVisit).toBe(3);
  });

  test('calculates hours correctly for warehouse place type', () => {
    const form = createFormState({ sqFt: 10000, placeType: 'warehouse' });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 10000 sqft / 2000 sqft per hour = 5 hours
    expect(result.hoursPerVisit).toBe(5);
  });

  test('returns 0 hours when sqFt is 0', () => {
    const form = createFormState({ sqFt: 0, placeType: 'office' });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.hoursPerVisit).toBe(0);
  });

  test('returns 0 hours when production rate is 0', () => {
    const form = createFormState({ sqFt: 2000, placeType: 'unknown' });
    const adminRates = createAdminRates({
      productionRates: { unknown: 0 },
    });
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.hoursPerVisit).toBe(0);
  });

  test('returns 0 hours when place type has no production rate', () => {
    const form = createFormState({ sqFt: 2000, placeType: 'nonexistent' });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.hoursPerVisit).toBe(0);
  });

  test('handles fractional hours correctly', () => {
    const form = createFormState({ sqFt: 1500, placeType: 'office' });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 1500 sqft / 1000 sqft per hour = 1.5 hours
    expect(result.hoursPerVisit).toBe(1.5);
  });
});

// ============================================================================
// ANNUAL BASE LABOR CALCULATION TESTS
// ============================================================================

describe('Annual Base Labor Calculation', () => {
  test('calculates annual labor for weekly frequency', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 20,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Hours: 1000/1000 = 1 hour
    // Per occurrence labor: 1 hour × $20 × 1 visit = $20
    // Annual (weekly × 52): $20 × 52 = $1040
    expect(result.hoursPerVisit).toBe(1);
    expect(result.annualBaseLabor).toBe(1040);
  });

  test('calculates annual labor with multiple visits per week', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 3,
      costPerHour: 20,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Hours: 1 hour
    // Per occurrence labor: 1 hour × $20 × 3 visits = $60
    // Annual (weekly × 52): $60 × 52 = $3120
    expect(result.annualBaseLabor).toBe(3120);
  });

  test('calculates annual labor for monthly frequency', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 20,
      frequency: 'monthly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Per occurrence labor: 1 hour × $20 × 1 visit = $20
    // Annual (monthly × 12): $20 × 12 = $240
    expect(result.annualBaseLabor).toBe(240);
  });

  test('calculates annual labor for biweekly frequency', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 20,
      frequency: 'biweekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Per occurrence labor: $20
    // Annual (biweekly × 26): $20 × 26 = $520
    expect(result.annualBaseLabor).toBe(520);
  });

  test('calculates annual labor for quarterly frequency', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 20,
      frequency: 'quarterly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Per occurrence labor: $20
    // Annual (quarterly × 4): $20 × 4 = $80
    expect(result.annualBaseLabor).toBe(80);
  });

  test('calculates annual labor for oneTime frequency', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 20,
      frequency: 'oneTime',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Per occurrence labor: $20
    // Annual (oneTime × 1): $20 × 1 = $20
    expect(result.annualBaseLabor).toBe(20);
  });

  test('handles different cost per hour rates', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 35,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 1 hour × $35 × 1 visit × 52 weeks = $1820
    expect(result.annualBaseLabor).toBe(1820);
  });
});

// ============================================================================
// LABOR TAX CALCULATION TESTS
// ============================================================================

describe('Labor Tax Calculation', () => {
  test('calculates labor tax at 15%', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Annual labor: $1040
    // Tax: $1040 × 15% = $156
    expect(result.annualBaseLabor).toBe(1040);
    expect(result.annualLaborTax).toBe(156);
  });

  test('calculates labor tax at 18%', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 18,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Annual labor: $1040
    // Tax: $1040 × 18% = $187.20
    expect(result.annualLaborTax).toBe(187.2);
  });

  test('calculates labor tax at 0%', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      laborTaxPct: 0,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.annualLaborTax).toBe(0);
  });

  test('labor tax is 0 when sqFt is 0', () => {
    const form = createFormState({
      sqFt: 0,
      laborTaxPct: 15,
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.annualLaborTax).toBe(0);
  });
});

// ============================================================================
// SUPPLIES CALCULATION TESTS
// ============================================================================

describe('Supplies Calculation', () => {
  test('sums all supply amounts correctly', () => {
    const supplies: JanitorialSupplyItem[] = [
      { name: 'Vacuums', amount: 100 },
      { name: 'Mops', amount: 500 },
      { name: 'Mop Buckets', amount: 200 },
      { name: 'Dust Mops', amount: 300 },
    ];
    const form = createFormState({ supplies });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.totalAnnualSupplies).toBe(1100);
  });

  test('handles default supplies', () => {
    const form = createFormState();
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Default supplies: 100 + 500 + 200 + 300 + 0 + 0 + 0 + 0 = 1100
    expect(result.totalAnnualSupplies).toBe(1100);
  });

  test('handles empty supplies array', () => {
    const form = createFormState({ supplies: [] });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.totalAnnualSupplies).toBe(0);
  });

  test('handles all zero supplies', () => {
    const supplies: JanitorialSupplyItem[] = [
      { name: 'Item1', amount: 0 },
      { name: 'Item2', amount: 0 },
    ];
    const form = createFormState({ supplies });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.totalAnnualSupplies).toBe(0);
  });

  test('handles large supply amounts', () => {
    const supplies: JanitorialSupplyItem[] = [
      { name: 'Equipment', amount: 10000 },
      { name: 'Products', amount: 5000 },
    ];
    const form = createFormState({ supplies });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.totalAnnualSupplies).toBe(15000);
  });
});

// ============================================================================
// TOTAL ANNUAL COST CALCULATION TESTS
// ============================================================================

describe('Total Annual Cost Calculation', () => {
  test('calculates total annual cost correctly', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      frequency: 'weekly',
      supplies: [{ name: 'Supplies', amount: 500 }],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Labor: $1040
    // Tax: $156
    // Supplies: $500
    // Total: $1696
    expect(result.annualBaseLabor).toBe(1040);
    expect(result.annualLaborTax).toBe(156);
    expect(result.totalAnnualSupplies).toBe(500);
    expect(result.totalAnnualCost).toBe(1696);
  });

  test('total cost equals supplies when sqFt is 0', () => {
    const form = createFormState({
      sqFt: 0,
      supplies: [{ name: 'Supplies', amount: 1100 }],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.annualBaseLabor).toBe(0);
    expect(result.annualLaborTax).toBe(0);
    expect(result.totalAnnualCost).toBe(1100);
  });

  test('total cost is 0 when all inputs are 0', () => {
    const form = createFormState({
      sqFt: 0,
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.totalAnnualCost).toBe(0);
  });
});

// ============================================================================
// GROSS PROFIT AND CONTRACT VALUE CALCULATION TESTS
// ============================================================================

describe('Gross Profit and Contract Value Calculation', () => {
  test('calculates annual contract value with 33% gross profit', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
      frequency: 'weekly',
      supplies: [{ name: 'Supplies', amount: 500 }],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Total cost: $1696
    // Contract value = cost / (1 - 0.33) = $1696 / 0.67 = $2531.34
    expect(result.totalAnnualCost).toBe(1696);
    expect(round2(result.annualContractValue)).toBe(2531.34);
  });

  test('calculates gross profit amount correctly', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
      frequency: 'weekly',
      supplies: [{ name: 'Supplies', amount: 500 }],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Gross profit = contract value - cost
    const expectedGrossProfit = result.annualContractValue - result.totalAnnualCost;
    expect(result.grossProfit).toBe(expectedGrossProfit);
  });

  test('calculates with 50% gross profit margin', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      grossProfitPct: 50,
      frequency: 'weekly',
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Cost / (1 - 0.50) = Cost × 2
    expect(result.annualContractValue).toBe(result.totalAnnualCost * 2);
  });

  test('calculates with 0% gross profit margin', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      grossProfitPct: 0,
      frequency: 'weekly',
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Cost / (1 - 0) = Cost
    expect(result.annualContractValue).toBe(result.totalAnnualCost);
    expect(result.grossProfit).toBe(0);
  });

  test('handles gross profit near 100% (capped at 99.9%)', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      grossProfitPct: 100,
      frequency: 'weekly',
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Should be capped at 99.9%, so still calculable
    expect(result.annualContractValue).toBeGreaterThan(0);
  });

  test('handles negative gross profit gracefully', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      grossProfitPct: -10,
      frequency: 'weekly',
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Negative GP clamped to 0
    expect(result.annualContractValue).toBe(result.totalAnnualCost);
  });
});

// ============================================================================
// CONTRACT TOTAL CALCULATION TESTS
// ============================================================================

describe('Contract Total Calculation', () => {
  test('calculates 12-month contract total', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
      frequency: 'weekly',
      contractMonths: 12,
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // For 12-month contract, contract total = annual value
    expect(round2(result.contractTotal)).toBe(round2(result.annualContractValue));
  });

  test('calculates 36-month contract total', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      grossProfitPct: 33,
      frequency: 'weekly',
      contractMonths: 36,
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Contract total = annual value × (36/12) = annual value × 3
    expect(round2(result.contractTotal)).toBe(round2(result.annualContractValue * 3));
  });

  test('calculates 6-month contract total', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      grossProfitPct: 33,
      frequency: 'weekly',
      contractMonths: 6,
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Contract total = annual value × (6/12) = annual value / 2
    expect(round2(result.contractTotal)).toBe(round2(result.annualContractValue / 2));
  });

  test('one-time frequency uses annual value as contract total', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      grossProfitPct: 33,
      frequency: 'oneTime',
      contractMonths: 12,
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // For one-time, contract total equals annual value (which is just the one-time price)
    expect(result.contractTotal).toBe(result.annualContractValue);
  });

  test('custom contract total overrides calculated value', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'weekly',
      contractMonths: 12,
      customContractTotal: 5000,
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.contractTotal).toBe(5000);
  });
});

// ============================================================================
// MONTHLY RECURRING CALCULATION TESTS
// ============================================================================

describe('Monthly Recurring Calculation', () => {
  test('calculates monthly recurring for 12-month contract', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'weekly',
      contractMonths: 12,
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Monthly = contract total / 12
    expect(round2(result.monthlyRecurring)).toBe(round2(result.contractTotal / 12));
  });

  test('calculates monthly recurring for 36-month contract', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'weekly',
      contractMonths: 36,
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(round2(result.monthlyRecurring)).toBe(round2(result.contractTotal / 36));
  });

  test('monthly recurring is 0 for one-time frequency', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'oneTime',
      contractMonths: 12,
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.monthlyRecurring).toBe(0);
  });

  test('monthly recurring is 0 when contract months is 0', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'weekly',
      contractMonths: 0,
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.monthlyRecurring).toBe(0);
  });
});

// ============================================================================
// PER-VISIT CALCULATION TESTS
// ============================================================================

describe('Per-Visit Calculation', () => {
  test('calculates per-visit cost for weekly frequency', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'weekly',
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Per visit = annual contract value / 52
    expect(round2(result.perVisit)).toBe(round2(result.annualContractValue / 52));
  });

  test('calculates per-visit cost for monthly frequency', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'monthly',
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Per visit = annual contract value / 12
    expect(round2(result.perVisit)).toBe(round2(result.annualContractValue / 12));
  });

  test('calculates per-visit cost for quarterly frequency', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'quarterly',
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Per visit = annual contract value / 4
    expect(round2(result.perVisit)).toBe(round2(result.annualContractValue / 4));
  });

  test('per-visit equals contract total for one-time frequency', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      frequency: 'oneTime',
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // Annual multiplier for one-time is 1
    expect(result.perVisit).toBe(result.annualContractValue);
  });
});

// ============================================================================
// FREQUENCY MULTIPLIER TESTS
// ============================================================================

describe('Frequency Multiplier Tests', () => {
  const frequencies: { key: JanitorialFrequencyKey; multiplier: number }[] = [
    { key: 'oneTime', multiplier: 1 },
    { key: 'weekly', multiplier: 52 },
    { key: 'biweekly', multiplier: 26 },
    { key: 'twicePerMonth', multiplier: 24 },
    { key: 'monthly', multiplier: 12 },
    { key: 'everyFourWeeks', multiplier: 13 },
    { key: 'bimonthly', multiplier: 6 },
    { key: 'quarterly', multiplier: 4 },
    { key: 'biannual', multiplier: 2 },
    { key: 'annual', multiplier: 1 },
  ];

  frequencies.forEach(({ key, multiplier }) => {
    test(`uses correct annual multiplier for ${key} frequency (${multiplier}×)`, () => {
      const form = createFormState({
        sqFt: 1000,
        placeType: 'office',
        visitsPerWeek: 1,
        costPerHour: 20,
        frequency: key,
        laborTaxPct: 0,
        grossProfitPct: 0,
        supplies: [],
        contractMonths: 12,
      });
      const adminRates = createAdminRates();
      const result = computeJanitorialCalc(form, adminRates);

      // With 0% tax and 0% profit, annual labor = perOccurrence × multiplier
      // 1 hour × $20 × 1 visit = $20 per occurrence
      const expectedAnnualLabor = 20 * multiplier;
      expect(result.annualBaseLabor).toBe(expectedAnnualLabor);
    });
  });
});

// ============================================================================
// ORIGINAL CONTRACT TOTAL (REDLINE/GREENLINE) TESTS
// ============================================================================

describe('Original Contract Total Calculation', () => {
  test('original contract uses admin default rates', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 30, // User modified
      laborTaxPct: 20, // User modified
      grossProfitPct: 40, // User modified
      frequency: 'weekly',
      contractMonths: 12,
    });
    const adminRates = createAdminRates({
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
    });
    const result = computeJanitorialCalc(form, adminRates);

    // contractTotal uses user's values (30, 20%, 40%)
    // originalContractTotal uses admin's values (20, 15%, 33%)
    // They should be different
    expect(result.contractTotal).not.toBe(result.originalContractTotal);
  });

  test('original and current match when using admin defaults', () => {
    const adminRates = createAdminRates({
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
    });
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
      frequency: 'weekly',
      contractMonths: 12,
    });
    const result = computeJanitorialCalc(form, adminRates);

    expect(round2(result.contractTotal)).toBe(round2(result.originalContractTotal));
  });

  test('greenline threshold: current > original × 1.30', () => {
    const adminRates = createAdminRates({
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
    });
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
      frequency: 'weekly',
      contractMonths: 12,
    });
    const result = computeJanitorialCalc(form, adminRates);

    const greenlineThreshold = result.originalContractTotal * 1.30;
    const isGreenline = result.contractTotal > greenlineThreshold;

    // With same rates, it should be redline
    expect(isGreenline).toBe(false);
  });
});

// ============================================================================
// EDGE CASES AND BOUNDARY CONDITIONS
// ============================================================================

describe('Edge Cases and Boundary Conditions', () => {
  test('handles very large square footage', () => {
    const form = createFormState({
      sqFt: 1000000, // 1 million sq ft
      placeType: 'office',
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 1,000,000 / 1000 = 1000 hours per visit
    expect(result.hoursPerVisit).toBe(1000);
    expect(result.annualBaseLabor).toBeGreaterThan(0);
  });

  test('handles very small square footage', () => {
    const form = createFormState({
      sqFt: 10,
      placeType: 'office',
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 10 / 1000 = 0.01 hours
    expect(result.hoursPerVisit).toBe(0.01);
  });

  test('handles maximum visits per week (7)', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 7,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 1 hour × $20 × 7 visits × 52 weeks = $7280
    expect(result.annualBaseLabor).toBe(7280);
  });

  test('handles zero visits per week', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 0,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.annualBaseLabor).toBe(0);
  });

  test('handles zero cost per hour', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      costPerHour: 0,
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.annualBaseLabor).toBe(0);
  });

  test('handles very high labor tax percentage (99%)', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      laborTaxPct: 99,
      frequency: 'weekly',
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.annualLaborTax).toBe(result.annualBaseLabor * 0.99);
  });

  test('handles all place types from admin config', () => {
    const placeTypes = ['office', 'home', 'restaurant', 'warehouse', 'retail'];

    placeTypes.forEach(placeType => {
      const form = createFormState({
        sqFt: 1000,
        placeType,
        frequency: 'weekly',
      });
      const adminRates = createAdminRates();
      const result = computeJanitorialCalc(form, adminRates);

      expect(result.hoursPerVisit).toBeGreaterThan(0);
    });
  });

  test('all results are 0 when service is inactive (sqFt = 0, no supplies)', () => {
    const form = createFormState({
      sqFt: 0,
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.hoursPerVisit).toBe(0);
    expect(result.weeklyLabor).toBe(0);
    expect(result.annualBaseLabor).toBe(0);
    expect(result.annualLaborTax).toBe(0);
    expect(result.totalAnnualSupplies).toBe(0);
    expect(result.totalAnnualCost).toBe(0);
    expect(result.annualContractValue).toBe(0);
    expect(result.contractTotal).toBe(0);
    expect(result.grossProfit).toBe(0);
    expect(result.monthlyRecurring).toBe(0);
    expect(result.perVisit).toBe(0);
  });
});

// ============================================================================
// REAL-WORLD SCENARIO TESTS
// ============================================================================

describe('Real-World Scenario Tests', () => {
  test('Scenario: Small office weekly cleaning', () => {
    const form = createFormState({
      sqFt: 2000,
      placeType: 'office',
      visitsPerWeek: 3,
      costPerHour: 22,
      laborTaxPct: 18,
      grossProfitPct: 35,
      frequency: 'weekly',
      contractMonths: 12,
      supplies: [
        { name: 'Vacuums', amount: 150 },
        { name: 'Mops', amount: 400 },
        { name: 'Cleaning Products', amount: 600 },
      ],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 2000 sqft / 1000 = 2 hours per visit
    expect(result.hoursPerVisit).toBe(2);

    // Weekly labor: 2 hours × $22 × 3 visits = $132
    // Annual labor: $132 × 52 = $6864
    expect(result.annualBaseLabor).toBe(6864);

    // Labor tax: $6864 × 18% = $1235.52
    expect(result.annualLaborTax).toBe(1235.52);

    // Supplies: $1150
    expect(result.totalAnnualSupplies).toBe(1150);

    // Total cost: $6864 + $1235.52 + $1150 = $9249.52
    expect(result.totalAnnualCost).toBe(9249.52);

    // Contract value: $9249.52 / (1 - 0.35) = $14230.03
    expect(round2(result.annualContractValue)).toBe(14230.03);

    // Monthly recurring: $14230.03 / 12 = $1185.84
    expect(round2(result.monthlyRecurring)).toBe(1185.84);
  });

  test('Scenario: Large warehouse quarterly cleaning', () => {
    const form = createFormState({
      sqFt: 50000,
      placeType: 'warehouse',
      visitsPerWeek: 1,
      costPerHour: 25,
      laborTaxPct: 15,
      grossProfitPct: 30,
      frequency: 'quarterly',
      contractMonths: 24,
      supplies: [
        { name: 'Industrial Equipment', amount: 2000 },
      ],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 50000 sqft / 2000 = 25 hours per visit
    expect(result.hoursPerVisit).toBe(25);

    // Per occurrence: 25 hours × $25 × 1 visit = $625
    // Annual (quarterly × 4): $625 × 4 = $2500
    expect(result.annualBaseLabor).toBe(2500);

    // 24-month contract: annual value × 2
    expect(round2(result.contractTotal)).toBe(round2(result.annualContractValue * 2));
  });

  test('Scenario: One-time deep cleaning', () => {
    const form = createFormState({
      sqFt: 3000,
      placeType: 'home',
      visitsPerWeek: 1,
      costPerHour: 35,
      laborTaxPct: 10,
      grossProfitPct: 40,
      frequency: 'oneTime',
      contractMonths: 1,
      supplies: [],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 3000 / 500 = 6 hours
    expect(result.hoursPerVisit).toBe(6);

    // One-time labor: 6 hours × $35 × 1 = $210
    expect(result.annualBaseLabor).toBe(210);

    // For one-time, contract total = annual value
    expect(result.contractTotal).toBe(result.annualContractValue);

    // No monthly recurring for one-time
    expect(result.monthlyRecurring).toBe(0);
  });

  test('Scenario: Restaurant daily cleaning', () => {
    const form = createFormState({
      sqFt: 4000,
      placeType: 'restaurant',
      visitsPerWeek: 7,
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
      frequency: 'weekly',
      contractMonths: 36,
      supplies: [
        { name: 'Sanitizers', amount: 800 },
        { name: 'Cleaning Products', amount: 1200 },
        { name: 'Equipment', amount: 500 },
      ],
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    // 4000 / 800 = 5 hours per visit
    expect(result.hoursPerVisit).toBe(5);

    // Weekly labor: 5 hours × $20 × 7 days = $700
    // Annual: $700 × 52 = $36400
    expect(result.annualBaseLabor).toBe(36400);

    // 36-month contract = annual × 3
    expect(round2(result.contractTotal)).toBe(round2(result.annualContractValue * 3));
  });
});

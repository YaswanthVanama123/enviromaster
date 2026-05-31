

import { describe, test, expect } from 'vitest';

import type {
  JanitorialFormState,
  JanitorialAdminRates,
  JanitorialCalcResult,
  JanitorialSupplyItem,
  JanitorialFrequencyKey,
} from '../components/services/purejanitorial/janitorialTypes';

import { computeJanitorialCalc, DEFAULT_SUPPLIES } from '../components/services/purejanitorial/useJanitorialCalc';

import { janitorialPricingConfig } from '../components/services/purejanitorial/janitorialConfig';

const DEFAULT_ADMIN_RATES: JanitorialAdminRates = {
  productionRates: {
    office: 1000,      
    home: 500,         
    restaurant: 800,   
    warehouse: 2000,   
    retail: 1200,      
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

const round2 = (n: number) => Math.round(n * 100) / 100;

describe('Hours Per Visit Calculation', () => {
  test('calculates hours correctly for office place type', () => {
    const form = createFormState({ sqFt: 2000, placeType: 'office' });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.hoursPerVisit).toBe(2);
  });

  test('calculates hours correctly for home place type', () => {
    const form = createFormState({ sqFt: 1500, placeType: 'home' });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

    expect(result.hoursPerVisit).toBe(3);
  });

  test('calculates hours correctly for warehouse place type', () => {
    const form = createFormState({ sqFt: 10000, placeType: 'warehouse' });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

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

    expect(result.hoursPerVisit).toBe(1.5);
  });
});

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

    expect(result.annualBaseLabor).toBe(1820);
  });
});

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

    expect(result.annualContractValue).toBe(result.totalAnnualCost);
  });
});

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

    expect(result.perVisit).toBe(result.annualContractValue);
  });
});

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

      
      const expectedAnnualLabor = 20 * multiplier;
      expect(result.annualBaseLabor).toBe(expectedAnnualLabor);
    });
  });
});

describe('Original Contract Total Calculation', () => {
  test('original contract uses admin default rates', () => {
    const form = createFormState({
      sqFt: 1000,
      placeType: 'office',
      visitsPerWeek: 1,
      costPerHour: 30, 
      laborTaxPct: 20, 
      grossProfitPct: 40, 
      frequency: 'weekly',
      contractMonths: 12,
    });
    const adminRates = createAdminRates({
      costPerHour: 20,
      laborTaxPct: 15,
      grossProfitPct: 33,
    });
    const result = computeJanitorialCalc(form, adminRates);

    
    
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

    expect(isGreenline).toBe(false);
  });
});

describe('Edge Cases and Boundary Conditions', () => {
  test('handles very large square footage', () => {
    const form = createFormState({
      sqFt: 1000000, 
      placeType: 'office',
      frequency: 'weekly',
    });
    const adminRates = createAdminRates();
    const result = computeJanitorialCalc(form, adminRates);

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

    expect(result.hoursPerVisit).toBe(2);

    
    expect(result.annualBaseLabor).toBe(6864);

    expect(result.annualLaborTax).toBe(1235.52);

    expect(result.totalAnnualSupplies).toBe(1150);

    expect(result.totalAnnualCost).toBe(9249.52);

    expect(round2(result.annualContractValue)).toBe(14230.03);

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

    expect(result.hoursPerVisit).toBe(25);

    
    expect(result.annualBaseLabor).toBe(2500);

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

    expect(result.hoursPerVisit).toBe(6);

    expect(result.annualBaseLabor).toBe(210);

    expect(result.contractTotal).toBe(result.annualContractValue);

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

    expect(result.hoursPerVisit).toBe(5);

    
    expect(result.annualBaseLabor).toBe(36400);

    expect(round2(result.contractTotal)).toBe(round2(result.annualContractValue * 3));
  });
});

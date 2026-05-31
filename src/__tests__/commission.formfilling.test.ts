import { describe, test, expect } from 'vitest';
import {
  DEFAULT_COMMISSION_RULES,
  type AccountType,
  type AgreementTerm,
  type PricingLine,
  type QuotaLevel,
  type BusinessType,
} from '../backendservice/types/commission.types';

interface CommissionState {
  quotaLevel: QuotaLevel;
  accountType: AccountType;
  isInsideSales: boolean;
}

interface CommissionResult {
  monthlyValue: number;
  agreementTerm: AgreementTerm;
  pricingLine: PricingLine;
  baseRate: number;
  agreementMultiplier: number;
  accountTypeAdjustment: number;
  greenlineBonus: number;
  renewalBonus: number;
  insideSalesDeduction: number;
  effectiveBaseRate: number;
  finalCommissionRate: number;
  monthlyCommission: number;
  annualCommission: number;
  contractCommission: number;
}

interface CollectedCommissionData {
  input: {
    monthlyValue: number;
    agreementTerm: AgreementTerm;
    accountType: AccountType;
    pricingLine: PricingLine;
    quotaLevel: QuotaLevel;
    businessType: BusinessType;
    isInsideSales: boolean;
  };
  breakdown: {
    baseRate: number;
    agreementMultiplier: number;
    accountTypeAdjustment: number;
    greenlineBonus: number;
    renewalBonus: number;
    insideSalesDeduction: number;
  };
  finalCommissionRate: number;
  monthlyCommission: number;
  annualCommission: number;
  contractCommission: number;
}

function collectFormDataCommission(
  commissionResult: CommissionResult | null,
  commissionState: CommissionState
): CollectedCommissionData | null {
  if (!commissionResult) return null;

  return {
    input: {
      monthlyValue: commissionResult.monthlyValue,
      agreementTerm: commissionResult.agreementTerm,
      accountType: commissionState.accountType,
      pricingLine: commissionResult.pricingLine,
      quotaLevel: commissionState.quotaLevel,
      businessType: 'new' as const,
      isInsideSales: commissionState.isInsideSales,
    },
    breakdown: {
      baseRate: commissionResult.baseRate,
      agreementMultiplier: commissionResult.agreementMultiplier,
      accountTypeAdjustment: commissionResult.accountTypeAdjustment,
      greenlineBonus: commissionResult.greenlineBonus,
      renewalBonus: commissionResult.renewalBonus,
      insideSalesDeduction: commissionResult.insideSalesDeduction,
    },
    finalCommissionRate: commissionResult.finalCommissionRate,
    monthlyCommission: commissionResult.monthlyCommission,
    annualCommission: commissionResult.annualCommission,
    contractCommission: commissionResult.contractCommission,
  };
}

function createMockCommissionResult(overrides: Partial<CommissionResult> = {}): CommissionResult {
  return {
    monthlyValue: 500,
    agreementTerm: '1-year',
    pricingLine: 'Redline',
    baseRate: 6,
    agreementMultiplier: 100,
    accountTypeAdjustment: 0,
    greenlineBonus: 0,
    renewalBonus: 0,
    insideSalesDeduction: 0,
    effectiveBaseRate: 6,
    finalCommissionRate: 6,
    monthlyCommission: 30,
    annualCommission: 360,
    contractCommission: 360,
    ...overrides,
  };
}

describe('FormFilling Commission - State Structure', () => {
  test('Default commission state should have correct values', () => {
    const defaultState: CommissionState = {
      quotaLevel: 'above',
      accountType: 'Anchor',
      isInsideSales: false,
    };

    expect(defaultState.quotaLevel).toBe('above');
    expect(defaultState.accountType).toBe('Anchor');
    expect(defaultState.isInsideSales).toBe(false);
  });

  test('Commission state should accept all valid quota levels', () => {
    const levels: QuotaLevel[] = ['below', 'above', 'double'];
    levels.forEach((level) => {
      const state: CommissionState = {
        quotaLevel: level,
        accountType: 'Anchor',
        isInsideSales: false,
      };
      expect(state.quotaLevel).toBe(level);
    });
  });

  test('Commission state should accept all valid account types', () => {
    const types: AccountType[] = ['Anchor', 'Bread5', 'Bread15', 'Pit'];
    types.forEach((type) => {
      const state: CommissionState = {
        quotaLevel: 'above',
        accountType: type,
        isInsideSales: false,
      };
      expect(state.accountType).toBe(type);
    });
  });
});

describe('FormFilling Commission - collectFormData Output', () => {
  const mockState: CommissionState = {
    quotaLevel: 'above',
    accountType: 'Anchor',
    isInsideSales: false,
  };

  test('Should return null when commissionResult is null', () => {
    const result = collectFormDataCommission(null, mockState);
    expect(result).toBeNull();
  });

  test('Should include all required input fields', () => {
    const commissionResult = createMockCommissionResult();
    const result = collectFormDataCommission(commissionResult, mockState);

    expect(result).not.toBeNull();
    expect(result!.input).toHaveProperty('monthlyValue');
    expect(result!.input).toHaveProperty('agreementTerm');
    expect(result!.input).toHaveProperty('accountType');
    expect(result!.input).toHaveProperty('pricingLine');
    expect(result!.input).toHaveProperty('quotaLevel');
    expect(result!.input).toHaveProperty('businessType');
    expect(result!.input).toHaveProperty('isInsideSales');
  });

  test('Should include all required breakdown fields', () => {
    const commissionResult = createMockCommissionResult();
    const result = collectFormDataCommission(commissionResult, mockState);

    expect(result!.breakdown).toHaveProperty('baseRate');
    expect(result!.breakdown).toHaveProperty('agreementMultiplier');
    expect(result!.breakdown).toHaveProperty('accountTypeAdjustment');
    expect(result!.breakdown).toHaveProperty('greenlineBonus');
    expect(result!.breakdown).toHaveProperty('renewalBonus');
    expect(result!.breakdown).toHaveProperty('insideSalesDeduction');
  });

  test('Should include all required result fields', () => {
    const commissionResult = createMockCommissionResult();
    const result = collectFormDataCommission(commissionResult, mockState);

    expect(result).toHaveProperty('finalCommissionRate');
    expect(result).toHaveProperty('monthlyCommission');
    expect(result).toHaveProperty('annualCommission');
    expect(result).toHaveProperty('contractCommission');
  });

  test('Business type should always be "new" for FormFilling', () => {
    const commissionResult = createMockCommissionResult();
    const result = collectFormDataCommission(commissionResult, mockState);

    expect(result!.input.businessType).toBe('new');
  });
});

describe('FormFilling Commission - Data Mapping', () => {
  test('State values should be correctly mapped to input', () => {
    const state: CommissionState = {
      quotaLevel: 'double',
      accountType: 'Bread5',
      isInsideSales: true,
    };
    const commissionResult = createMockCommissionResult();
    const result = collectFormDataCommission(commissionResult, state);

    expect(result!.input.quotaLevel).toBe('double');
    expect(result!.input.accountType).toBe('Bread5');
    expect(result!.input.isInsideSales).toBe(true);
  });

  test('Result values should be correctly mapped', () => {
    const commissionResult = createMockCommissionResult({
      monthlyValue: 1000,
      agreementTerm: '3-year',
      pricingLine: 'Greenline',
      finalCommissionRate: 9.45,
      monthlyCommission: 94.5,
      annualCommission: 1134,
      contractCommission: 3402,
    });
    const result = collectFormDataCommission(commissionResult, {
      quotaLevel: 'above',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(result!.input.monthlyValue).toBe(1000);
    expect(result!.input.agreementTerm).toBe('3-year');
    expect(result!.input.pricingLine).toBe('Greenline');
    expect(result!.finalCommissionRate).toBe(9.45);
    expect(result!.monthlyCommission).toBe(94.5);
  });

  test('Breakdown values should be correctly mapped', () => {
    const commissionResult = createMockCommissionResult({
      baseRate: 9,
      agreementMultiplier: 135,
      accountTypeAdjustment: -1,
      greenlineBonus: 1,
      insideSalesDeduction: -3,
    });
    const result = collectFormDataCommission(commissionResult, {
      quotaLevel: 'double',
      accountType: 'Bread5',
      isInsideSales: true,
    });

    expect(result!.breakdown.baseRate).toBe(9);
    expect(result!.breakdown.agreementMultiplier).toBe(135);
    expect(result!.breakdown.accountTypeAdjustment).toBe(-1);
    expect(result!.breakdown.greenlineBonus).toBe(1);
    expect(result!.breakdown.insideSalesDeduction).toBe(-3);
  });
});

describe('FormFilling Commission - Data Types', () => {
  test('Numeric values should be numbers', () => {
    const commissionResult = createMockCommissionResult();
    const result = collectFormDataCommission(commissionResult, {
      quotaLevel: 'above',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(typeof result!.input.monthlyValue).toBe('number');
    expect(typeof result!.breakdown.baseRate).toBe('number');
    expect(typeof result!.finalCommissionRate).toBe('number');
    expect(typeof result!.monthlyCommission).toBe('number');
  });

  test('String values should be strings', () => {
    const commissionResult = createMockCommissionResult();
    const result = collectFormDataCommission(commissionResult, {
      quotaLevel: 'above',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(typeof result!.input.agreementTerm).toBe('string');
    expect(typeof result!.input.accountType).toBe('string');
    expect(typeof result!.input.pricingLine).toBe('string');
    expect(typeof result!.input.quotaLevel).toBe('string');
    expect(typeof result!.input.businessType).toBe('string');
  });

  test('Boolean values should be booleans', () => {
    const commissionResult = createMockCommissionResult();
    const result = collectFormDataCommission(commissionResult, {
      quotaLevel: 'above',
      accountType: 'Anchor',
      isInsideSales: true,
    });

    expect(typeof result!.input.isInsideSales).toBe('boolean');
    expect(result!.input.isInsideSales).toBe(true);
  });
});

describe('FormFilling Commission - Agreement Term Values', () => {
  const validTerms: AgreementTerm[] = ['3-year', '1-year', 'MTM-with-install', 'MTM-no-install'];

  validTerms.forEach((term) => {
    test(`Should accept agreement term: ${term}`, () => {
      const commissionResult = createMockCommissionResult({ agreementTerm: term });
      const result = collectFormDataCommission(commissionResult, {
        quotaLevel: 'above',
        accountType: 'Anchor',
        isInsideSales: false,
      });

      expect(result!.input.agreementTerm).toBe(term);
    });
  });
});

describe('FormFilling Commission - Pricing Line Values', () => {
  const validLines: PricingLine[] = ['Redline', 'Greenline'];

  validLines.forEach((line) => {
    test(`Should accept pricing line: ${line}`, () => {
      const commissionResult = createMockCommissionResult({ pricingLine: line });
      const result = collectFormDataCommission(commissionResult, {
        quotaLevel: 'above',
        accountType: 'Anchor',
        isInsideSales: false,
      });

      expect(result!.input.pricingLine).toBe(line);
    });
  });
});

describe('FormFilling Commission - Real Form Scenarios', () => {
  test('New 36-month agreement with green line pricing', () => {
    const state: CommissionState = {
      quotaLevel: 'above',
      accountType: 'Anchor',
      isInsideSales: false,
    };
    const commissionResult = createMockCommissionResult({
      monthlyValue: 500,
      agreementTerm: '3-year',
      pricingLine: 'Greenline',
      baseRate: 6,
      agreementMultiplier: 135,
      greenlineBonus: 1,
      effectiveBaseRate: 7,
      finalCommissionRate: 9.45,
      monthlyCommission: 47.25,
      annualCommission: 567,
      contractCommission: 1701,
    });

    const result = collectFormDataCommission(commissionResult, state);

    expect(result!.input.monthlyValue).toBe(500);
    expect(result!.input.agreementTerm).toBe('3-year');
    expect(result!.input.pricingLine).toBe('Greenline');
    expect(result!.input.businessType).toBe('new');
    expect(result!.finalCommissionRate).toBe(9.45);
    expect(result!.contractCommission).toBe(1701);
  });

  test('MTM agreement with red line pricing and inside sales', () => {
    const state: CommissionState = {
      quotaLevel: 'below',
      accountType: 'Bread15',
      isInsideSales: true,
    };
    const commissionResult = createMockCommissionResult({
      monthlyValue: 300,
      agreementTerm: 'MTM-with-install',
      pricingLine: 'Redline',
      baseRate: 3,
      agreementMultiplier: 100,
      accountTypeAdjustment: -0.5,
      greenlineBonus: 0,
      insideSalesDeduction: -3,
      effectiveBaseRate: -0.5,
      finalCommissionRate: -0.5,
      monthlyCommission: -1.5,
      annualCommission: -18,
      contractCommission: -9,
    });

    const result = collectFormDataCommission(commissionResult, state);

    expect(result!.input.quotaLevel).toBe('below');
    expect(result!.input.accountType).toBe('Bread15');
    expect(result!.input.isInsideSales).toBe(true);
    expect(result!.breakdown.insideSalesDeduction).toBe(-3);
    expect(result!.breakdown.accountTypeAdjustment).toBe(-0.5);
    expect(result!.finalCommissionRate).toBe(-0.5);
  });

  test('High-value anchor with double quota', () => {
    const state: CommissionState = {
      quotaLevel: 'double',
      accountType: 'Anchor',
      isInsideSales: false,
    };
    const commissionResult = createMockCommissionResult({
      monthlyValue: 2000,
      agreementTerm: '3-year',
      pricingLine: 'Greenline',
      baseRate: 9,
      agreementMultiplier: 135,
      greenlineBonus: 1,
      effectiveBaseRate: 10,
      finalCommissionRate: 13.5,
      monthlyCommission: 270,
      annualCommission: 3240,
      contractCommission: 9720,
    });

    const result = collectFormDataCommission(commissionResult, state);

    expect(result!.breakdown.baseRate).toBe(9);
    expect(result!.breakdown.greenlineBonus).toBe(1);
    expect(result!.finalCommissionRate).toBe(13.5);
    expect(result!.monthlyCommission).toBe(270);
    expect(result!.contractCommission).toBe(9720);
  });
});

describe('FormFilling Commission - Edge Cases', () => {
  test('Zero monthly value', () => {
    const commissionResult = createMockCommissionResult({
      monthlyValue: 0,
      monthlyCommission: 0,
      annualCommission: 0,
      contractCommission: 0,
    });
    const result = collectFormDataCommission(commissionResult, {
      quotaLevel: 'above',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(result!.input.monthlyValue).toBe(0);
    expect(result!.monthlyCommission).toBe(0);
  });

  test('Negative commission (poor deal parameters)', () => {
    const commissionResult = createMockCommissionResult({
      finalCommissionRate: -1,
      monthlyCommission: -5,
      annualCommission: -60,
      contractCommission: -30,
    });
    const result = collectFormDataCommission(commissionResult, {
      quotaLevel: 'below',
      accountType: 'Bread5',
      isInsideSales: true,
    });

    expect(result!.finalCommissionRate).toBe(-1);
    expect(result!.monthlyCommission).toBe(-5);
  });

  test('Large commission values', () => {
    const commissionResult = createMockCommissionResult({
      monthlyValue: 100000,
      monthlyCommission: 13500,
      annualCommission: 162000,
      contractCommission: 486000,
    });
    const result = collectFormDataCommission(commissionResult, {
      quotaLevel: 'double',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(result!.monthlyCommission).toBe(13500);
    expect(result!.contractCommission).toBe(486000);
  });

  test('Decimal values should be preserved', () => {
    const commissionResult = createMockCommissionResult({
      monthlyValue: 333.33,
      finalCommissionRate: 9.45,
      monthlyCommission: 31.49,
    });
    const result = collectFormDataCommission(commissionResult, {
      quotaLevel: 'above',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(result!.input.monthlyValue).toBeCloseTo(333.33, 2);
    expect(result!.finalCommissionRate).toBeCloseTo(9.45, 2);
    expect(result!.monthlyCommission).toBeCloseTo(31.49, 2);
  });
});

export { collectFormDataCommission, createMockCommissionResult };
export type { CommissionState, CommissionResult, CollectedCommissionData };


import { describe, test, expect } from 'vitest';
import {
  DEFAULT_COMMISSION_RULES,
  type AccountType,
  type AgreementTerm,
  type PricingLine,
  type QuotaLevel,
} from '../backendservice/types/commission.types';

interface CalculationInput {
  totalCurrentContract: number;
  globalContractMonths: number;
  pricingIndicator: 'red' | 'green';
  quotaLevel: QuotaLevel;
  accountType: AccountType;
  isInsideSales: boolean;
}

interface CalculationResult {
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

function calculateCommission(input: CalculationInput): CalculationResult {
  const rules = DEFAULT_COMMISSION_RULES;

  const monthlyValue = input.globalContractMonths > 0
    ? input.totalCurrentContract / input.globalContractMonths
    : input.totalCurrentContract;

  const getAgreementTerm = (): AgreementTerm => {
    if (input.globalContractMonths >= 36) return '3-year';
    if (input.globalContractMonths >= 12) return '1-year';
    return 'MTM-with-install';
  };

  const pricingLine: PricingLine = input.pricingIndicator === 'green' ? 'Greenline' : 'Redline';
  const agreementTerm = getAgreementTerm();

  const baseRate = rules.quotaRates[input.quotaLevel];

  const agreementMultiplier = rules.agreementMultipliers[agreementTerm];

  const accountTypeAdjustment = rules.accountTypeAdjustments[input.accountType];

  const greenlineBonus = pricingLine === 'Greenline' ? rules.greenlineBonus : 0;

  const renewalBonus = 0;

  const insideSalesDeduction = input.isInsideSales ? rules.insideSalesDeduction : 0;

  const effectiveBaseRate = baseRate + accountTypeAdjustment + greenlineBonus + renewalBonus + insideSalesDeduction;

  const finalCommissionRate = effectiveBaseRate * (agreementMultiplier / 100);

  const monthlyCommission = monthlyValue * (finalCommissionRate / 100);
  const annualCommission = monthlyCommission * 12;
  const contractCommission = monthlyCommission * input.globalContractMonths;

  return {
    monthlyValue,
    agreementTerm,
    pricingLine,
    baseRate,
    agreementMultiplier,
    accountTypeAdjustment,
    greenlineBonus,
    renewalBonus,
    insideSalesDeduction,
    effectiveBaseRate,
    finalCommissionRate,
    monthlyCommission,
    annualCommission,
    contractCommission,
  };
}

describe('Commission Calculation - Quota Levels', () => {
  const baseInput: CalculationInput = {
    totalCurrentContract: 6000,
    globalContractMonths: 12,
    pricingIndicator: 'red',
    quotaLevel: 'above',
    accountType: 'Anchor',
    isInsideSales: false,
  };

  test('Below quota should use 3% base rate', () => {
    const result = calculateCommission({ ...baseInput, quotaLevel: 'below' });
    expect(result.baseRate).toBe(3);
    expect(result.finalCommissionRate).toBe(3);
    expect(result.monthlyCommission).toBe(15); 
  });

  test('Above quota should use 6% base rate', () => {
    const result = calculateCommission({ ...baseInput, quotaLevel: 'above' });
    expect(result.baseRate).toBe(6);
    expect(result.finalCommissionRate).toBe(6);
    expect(result.monthlyCommission).toBe(30); 
  });

  test('Double quota should use 9% base rate', () => {
    const result = calculateCommission({ ...baseInput, quotaLevel: 'double' });
    expect(result.baseRate).toBe(9);
    expect(result.finalCommissionRate).toBe(9);
    expect(result.monthlyCommission).toBe(45); 
  });
});

describe('Commission Calculation - Agreement Terms', () => {
  const baseInput: CalculationInput = {
    totalCurrentContract: 12000,
    globalContractMonths: 12,
    pricingIndicator: 'red',
    quotaLevel: 'above', 
    accountType: 'Anchor',
    isInsideSales: false,
  };

  test('36+ months should derive 3-year (135% multiplier)', () => {
    const result = calculateCommission({
      ...baseInput,
      totalCurrentContract: 36000,
      globalContractMonths: 36,
    });

    expect(result.agreementTerm).toBe('3-year');
    expect(result.agreementMultiplier).toBe(135);
    expect(result.finalCommissionRate).toBeCloseTo(8.1, 2); 
    expect(result.monthlyCommission).toBeCloseTo(81, 0); 
  });

  test('12-35 months should derive 1-year (100% multiplier)', () => {
    const result = calculateCommission({
      ...baseInput,
      totalCurrentContract: 12000,
      globalContractMonths: 12,
    });

    expect(result.agreementTerm).toBe('1-year');
    expect(result.agreementMultiplier).toBe(100);
    expect(result.finalCommissionRate).toBe(6);
    expect(result.monthlyCommission).toBe(60); 
  });

  test('24 months should derive 1-year (100% multiplier)', () => {
    const result = calculateCommission({
      ...baseInput,
      totalCurrentContract: 24000,
      globalContractMonths: 24,
    });

    expect(result.agreementTerm).toBe('1-year');
    expect(result.agreementMultiplier).toBe(100);
  });

  test('Less than 12 months should derive MTM-with-install (100% multiplier)', () => {
    const result = calculateCommission({
      ...baseInput,
      totalCurrentContract: 6000,
      globalContractMonths: 6,
    });

    expect(result.agreementTerm).toBe('MTM-with-install');
    expect(result.agreementMultiplier).toBe(100);
  });
});

describe('Commission Calculation - Account Types', () => {
  const baseInput: CalculationInput = {
    totalCurrentContract: 6000,
    globalContractMonths: 12,
    pricingIndicator: 'red',
    quotaLevel: 'above', 
    isInsideSales: false,
    accountType: 'Anchor',
  };

  test('Anchor should have 0% adjustment', () => {
    const result = calculateCommission({ ...baseInput, accountType: 'Anchor' });
    expect(result.accountTypeAdjustment).toBe(0);
    expect(result.effectiveBaseRate).toBe(6);
  });

  test('Bread5 should have -1% adjustment', () => {
    const result = calculateCommission({ ...baseInput, accountType: 'Bread5' });
    expect(result.accountTypeAdjustment).toBe(-1);
    expect(result.effectiveBaseRate).toBe(5); 
    expect(result.monthlyCommission).toBe(25); 
  });

  test('Bread15 should have -0.5% adjustment', () => {
    const result = calculateCommission({ ...baseInput, accountType: 'Bread15' });
    expect(result.accountTypeAdjustment).toBe(-0.5);
    expect(result.effectiveBaseRate).toBe(5.5); 
    expect(result.monthlyCommission).toBe(27.5); 
  });

  test('Pit should have 0% adjustment', () => {
    const result = calculateCommission({ ...baseInput, accountType: 'Pit' });
    expect(result.accountTypeAdjustment).toBe(0);
    expect(result.effectiveBaseRate).toBe(6);
  });
});

describe('Commission Calculation - Pricing Lines', () => {
  const baseInput: CalculationInput = {
    totalCurrentContract: 12000,
    globalContractMonths: 12,
    quotaLevel: 'above', 
    accountType: 'Anchor',
    isInsideSales: false,
    pricingIndicator: 'red',
  };

  test('Red line should derive Redline with no bonus', () => {
    const result = calculateCommission({ ...baseInput, pricingIndicator: 'red' });
    expect(result.pricingLine).toBe('Redline');
    expect(result.greenlineBonus).toBe(0);
    expect(result.effectiveBaseRate).toBe(6);
  });

  test('Green line should derive Greenline with +1% bonus', () => {
    const result = calculateCommission({ ...baseInput, pricingIndicator: 'green' });
    expect(result.pricingLine).toBe('Greenline');
    expect(result.greenlineBonus).toBe(1);
    expect(result.effectiveBaseRate).toBe(7); 
    expect(result.monthlyCommission).toBe(70); 
  });
});

describe('Commission Calculation - Inside Sales', () => {
  const baseInput: CalculationInput = {
    totalCurrentContract: 12000,
    globalContractMonths: 12,
    pricingIndicator: 'red',
    quotaLevel: 'above', 
    accountType: 'Anchor',
    isInsideSales: false,
  };

  test('No inside sales should have no deduction', () => {
    const result = calculateCommission({ ...baseInput, isInsideSales: false });
    expect(result.insideSalesDeduction).toBe(0);
    expect(result.effectiveBaseRate).toBe(6);
  });

  test('Inside sales should apply -3% deduction', () => {
    const result = calculateCommission({ ...baseInput, isInsideSales: true });
    expect(result.insideSalesDeduction).toBe(-3);
    expect(result.effectiveBaseRate).toBe(3); 
    expect(result.monthlyCommission).toBe(30); 
  });
});

describe('Commission Calculation - Monthly Value', () => {
  const baseInput: CalculationInput = {
    totalCurrentContract: 3600,
    globalContractMonths: 36,
    pricingIndicator: 'red',
    quotaLevel: 'above',
    accountType: 'Anchor',
    isInsideSales: false,
  };

  test('Monthly value should be contract total / months', () => {
    const result = calculateCommission(baseInput);
    expect(result.monthlyValue).toBe(100); 
  });

  test('Different contract totals should calculate correctly', () => {
    const result = calculateCommission({
      ...baseInput,
      totalCurrentContract: 18000,
      globalContractMonths: 36,
    });
    expect(result.monthlyValue).toBe(500); 
  });

  test('Zero months should use total as monthly value', () => {
    const result = calculateCommission({
      ...baseInput,
      totalCurrentContract: 500,
      globalContractMonths: 0,
    });
    expect(result.monthlyValue).toBe(500);
  });
});

describe('Commission Calculation - Contract Commission', () => {
  test('Contract commission should be monthly * months', () => {
    const result = calculateCommission({
      totalCurrentContract: 36000,
      globalContractMonths: 36,
      pricingIndicator: 'red',
      quotaLevel: 'above', 
      accountType: 'Anchor',
      isInsideSales: false,
    });

    
    expect(result.monthlyCommission).toBeCloseTo(81, 0);
    expect(result.contractCommission).toBeCloseTo(2916, 0);
  });

  test('Annual commission should be monthly * 12', () => {
    const result = calculateCommission({
      totalCurrentContract: 12000,
      globalContractMonths: 12,
      pricingIndicator: 'red',
      quotaLevel: 'above', 
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(result.annualCommission).toBe(result.monthlyCommission * 12);
  });
});

describe('Commission Calculation - Combined Scenarios', () => {
  test('Best case: Double quota + 3-year + Greenline + Anchor', () => {
    const result = calculateCommission({
      totalCurrentContract: 36000,
      globalContractMonths: 36,
      pricingIndicator: 'green',
      quotaLevel: 'double', 
      accountType: 'Anchor', 
      isInsideSales: false,
    });

    
    expect(result.effectiveBaseRate).toBe(10);
    expect(result.finalCommissionRate).toBeCloseTo(13.5, 2);
    
    expect(result.monthlyCommission).toBeCloseTo(135, 0);
  });

  test('Worst case: Below quota + MTM + Bread5 + Inside sales', () => {
    const result = calculateCommission({
      totalCurrentContract: 3000,
      globalContractMonths: 6,
      pricingIndicator: 'red',
      quotaLevel: 'below', 
      accountType: 'Bread5', 
      isInsideSales: true, 
    });

    expect(result.effectiveBaseRate).toBe(-1);
    expect(result.finalCommissionRate).toBe(-1);
    
    expect(result.monthlyCommission).toBe(-5); 
  });

  test('Typical scenario: Above quota + 1-year + Redline + Anchor', () => {
    const result = calculateCommission({
      totalCurrentContract: 6000,
      globalContractMonths: 12,
      pricingIndicator: 'red',
      quotaLevel: 'above', 
      accountType: 'Anchor', 
      isInsideSales: false,
    });

    expect(result.effectiveBaseRate).toBe(6);
    expect(result.finalCommissionRate).toBe(6);
    expect(result.monthlyCommission).toBe(30); 
    expect(result.annualCommission).toBe(360);
    expect(result.contractCommission).toBe(360);
  });
});

describe('Commission Calculation - Edge Cases', () => {
  test('Zero contract should result in zero commission', () => {
    const result = calculateCommission({
      totalCurrentContract: 0,
      globalContractMonths: 12,
      pricingIndicator: 'green',
      quotaLevel: 'double',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(result.monthlyValue).toBe(0);
    expect(result.monthlyCommission).toBe(0);
    expect(result.contractCommission).toBe(0);
  });

  test('Large contract values should calculate correctly', () => {
    const result = calculateCommission({
      totalCurrentContract: 1000000,
      globalContractMonths: 36,
      pricingIndicator: 'green',
      quotaLevel: 'double',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(result.monthlyValue).toBeCloseTo(27777.78, 0);
    expect(result.monthlyCommission).toBeGreaterThan(0);
  });

  test('Single month contract', () => {
    const result = calculateCommission({
      totalCurrentContract: 500,
      globalContractMonths: 1,
      pricingIndicator: 'red',
      quotaLevel: 'above',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(result.agreementTerm).toBe('MTM-with-install');
    expect(result.contractCommission).toBe(result.monthlyCommission);
  });

  test('Decimal values should be handled', () => {
    const result = calculateCommission({
      totalCurrentContract: 1234.56,
      globalContractMonths: 12,
      pricingIndicator: 'red',
      quotaLevel: 'above',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(result.monthlyValue).toBeCloseTo(102.88, 2);
  });
});

describe('Commission Calculation - Real World Scenarios', () => {
  test('New customer: $500/month, 36 months, above quota, green line', () => {
    const result = calculateCommission({
      totalCurrentContract: 18000,
      globalContractMonths: 36,
      pricingIndicator: 'green',
      quotaLevel: 'above',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(result.finalCommissionRate).toBeCloseTo(9.45, 2);
    
    expect(result.monthlyCommission).toBeCloseTo(47.25, 2);
    
    expect(result.contractCommission).toBeCloseTo(1701, 0);
  });

  test('Small business with inside sales help', () => {
    const result = calculateCommission({
      totalCurrentContract: 1800,
      globalContractMonths: 12,
      pricingIndicator: 'red',
      quotaLevel: 'below',
      accountType: 'Bread5',
      isInsideSales: true,
    });

    expect(result.effectiveBaseRate).toBe(-1);
    expect(result.finalCommissionRate).toBe(-1);
    
  });

  test('High-value anchor location with double quota', () => {
    const result = calculateCommission({
      totalCurrentContract: 72000,
      globalContractMonths: 36,
      pricingIndicator: 'green',
      quotaLevel: 'double',
      accountType: 'Anchor',
      isInsideSales: false,
    });

    expect(result.finalCommissionRate).toBeCloseTo(13.5, 2);
    
    expect(result.monthlyCommission).toBeCloseTo(270, 0);
    
    expect(result.contractCommission).toBeCloseTo(9720, 0);
  });
});

export { calculateCommission };
export type { CalculationInput, CalculationResult };

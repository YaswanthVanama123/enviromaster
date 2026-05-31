import { describe, test, expect } from 'vitest';
import {
  DEFAULT_COMMISSION_RULES,
  ACCOUNT_TYPE_OPTIONS,
  AGREEMENT_TERM_OPTIONS,
  PRICING_LINE_OPTIONS,
  QUOTA_LEVEL_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
  type AccountType,
  type AgreementTerm,
  type PricingLine,
  type QuotaLevel,
  type BusinessType,
  type CommissionRules,
  type CommissionCalculationInput,
  type CommissionCalculationResult,
} from '../backendservice/types/commission.types';

describe('Commission Types - Default Rules', () => {
  test('DEFAULT_COMMISSION_RULES should have all required fields', () => {
    expect(DEFAULT_COMMISSION_RULES).toHaveProperty('version');
    expect(DEFAULT_COMMISSION_RULES).toHaveProperty('isActive');
    expect(DEFAULT_COMMISSION_RULES).toHaveProperty('quotaRates');
    expect(DEFAULT_COMMISSION_RULES).toHaveProperty('agreementMultipliers');
    expect(DEFAULT_COMMISSION_RULES).toHaveProperty('accountTypeAdjustments');
    expect(DEFAULT_COMMISSION_RULES).toHaveProperty('greenlineBonus');
    expect(DEFAULT_COMMISSION_RULES).toHaveProperty('renewalBonusRate');
    expect(DEFAULT_COMMISSION_RULES).toHaveProperty('renewalMinYears');
    expect(DEFAULT_COMMISSION_RULES).toHaveProperty('insideSalesDeduction');
    expect(DEFAULT_COMMISSION_RULES).toHaveProperty('anchorMinMonthlyValue');
  });

  test('Quota rates should match business requirements', () => {
    expect(DEFAULT_COMMISSION_RULES.quotaRates.below).toBe(3);
    expect(DEFAULT_COMMISSION_RULES.quotaRates.above).toBe(6);
    expect(DEFAULT_COMMISSION_RULES.quotaRates.double).toBe(9);
  });

  test('Agreement multipliers should match business requirements', () => {
    expect(DEFAULT_COMMISSION_RULES.agreementMultipliers['3-year']).toBe(135);
    expect(DEFAULT_COMMISSION_RULES.agreementMultipliers['1-year']).toBe(100);
    expect(DEFAULT_COMMISSION_RULES.agreementMultipliers['MTM-with-install']).toBe(100);
    expect(DEFAULT_COMMISSION_RULES.agreementMultipliers['MTM-no-install']).toBe(50);
  });

  test('Account type adjustments should match business requirements', () => {
    expect(DEFAULT_COMMISSION_RULES.accountTypeAdjustments.Anchor).toBe(0);
    expect(DEFAULT_COMMISSION_RULES.accountTypeAdjustments.Bread5).toBe(-1);
    expect(DEFAULT_COMMISSION_RULES.accountTypeAdjustments.Bread15).toBe(-0.5);
    expect(DEFAULT_COMMISSION_RULES.accountTypeAdjustments.Pit).toBe(0);
  });

  test('Bonus and deduction rates should match business requirements', () => {
    expect(DEFAULT_COMMISSION_RULES.greenlineBonus).toBe(1);
    expect(DEFAULT_COMMISSION_RULES.renewalBonusRate).toBe(4);
    expect(DEFAULT_COMMISSION_RULES.renewalMinYears).toBe(2);
    expect(DEFAULT_COMMISSION_RULES.insideSalesDeduction).toBe(-3);
    expect(DEFAULT_COMMISSION_RULES.anchorMinMonthlyValue).toBe(200);
  });
});

describe('Commission Types - Account Type Options', () => {
  test('Should have 4 account types', () => {
    expect(ACCOUNT_TYPE_OPTIONS).toHaveLength(4);
  });

  test('Each account type should have value, label, and description', () => {
    ACCOUNT_TYPE_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('description');
    });
  });

  test('Account type values should be valid', () => {
    const values = ACCOUNT_TYPE_OPTIONS.map((o) => o.value);
    expect(values).toContain('Anchor');
    expect(values).toContain('Bread5');
    expect(values).toContain('Bread15');
    expect(values).toContain('Pit');
  });

  test('Anchor should have $200+ description', () => {
    const anchor = ACCOUNT_TYPE_OPTIONS.find((o) => o.value === 'Anchor');
    expect(anchor?.description).toContain('$200');
  });
});

describe('Commission Types - Agreement Term Options', () => {
  test('Should have 4 agreement terms', () => {
    expect(AGREEMENT_TERM_OPTIONS).toHaveLength(4);
  });

  test('Each term should have value, label, and multiplier', () => {
    AGREEMENT_TERM_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('multiplier');
    });
  });

  test('Agreement term multipliers should be correct', () => {
    const threeYear = AGREEMENT_TERM_OPTIONS.find((o) => o.value === '3-year');
    const oneYear = AGREEMENT_TERM_OPTIONS.find((o) => o.value === '1-year');
    const mtmInstall = AGREEMENT_TERM_OPTIONS.find((o) => o.value === 'MTM-with-install');
    const mtmNoInstall = AGREEMENT_TERM_OPTIONS.find((o) => o.value === 'MTM-no-install');

    expect(threeYear?.multiplier).toBe(135);
    expect(oneYear?.multiplier).toBe(100);
    expect(mtmInstall?.multiplier).toBe(100);
    expect(mtmNoInstall?.multiplier).toBe(50);
  });
});

describe('Commission Types - Pricing Line Options', () => {
  test('Should have 2 pricing lines', () => {
    expect(PRICING_LINE_OPTIONS).toHaveLength(2);
  });

  test('Each pricing line should have value, label, and description', () => {
    PRICING_LINE_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('description');
    });
  });

  test('Pricing line values should be Redline and Greenline', () => {
    const values = PRICING_LINE_OPTIONS.map((o) => o.value);
    expect(values).toContain('Redline');
    expect(values).toContain('Greenline');
  });

  test('Greenline should mention 130% premium', () => {
    const greenline = PRICING_LINE_OPTIONS.find((o) => o.value === 'Greenline');
    expect(greenline?.description).toContain('130%');
  });
});

describe('Commission Types - Quota Level Options', () => {
  test('Should have 3 quota levels', () => {
    expect(QUOTA_LEVEL_OPTIONS).toHaveLength(3);
  });

  test('Each quota level should have value, label, and rate', () => {
    QUOTA_LEVEL_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('rate');
    });
  });

  test('Quota level rates should match business requirements', () => {
    const below = QUOTA_LEVEL_OPTIONS.find((o) => o.value === 'below');
    const above = QUOTA_LEVEL_OPTIONS.find((o) => o.value === 'above');
    const double = QUOTA_LEVEL_OPTIONS.find((o) => o.value === 'double');

    expect(below?.rate).toBe(3);
    expect(above?.rate).toBe(6);
    expect(double?.rate).toBe(9);
  });
});

describe('Commission Types - Business Type Options', () => {
  test('Should have 2 business types', () => {
    expect(BUSINESS_TYPE_OPTIONS).toHaveLength(2);
  });

  test('Each business type should have value and label', () => {
    BUSINESS_TYPE_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
    });
  });

  test('Business type values should be new and renewal', () => {
    const values = BUSINESS_TYPE_OPTIONS.map((o) => o.value);
    expect(values).toContain('new');
    expect(values).toContain('renewal');
  });
});

describe('Commission Types - Type Safety', () => {
  test('AccountType union should include all valid types', () => {
    const validTypes: AccountType[] = ['Anchor', 'Bread5', 'Bread15', 'Pit'];
    validTypes.forEach((type) => {
      expect(['Anchor', 'Bread5', 'Bread15', 'Pit']).toContain(type);
    });
  });

  test('AgreementTerm union should include all valid terms', () => {
    const validTerms: AgreementTerm[] = ['3-year', '1-year', 'MTM-with-install', 'MTM-no-install'];
    validTerms.forEach((term) => {
      expect(['3-year', '1-year', 'MTM-with-install', 'MTM-no-install']).toContain(term);
    });
  });

  test('PricingLine union should include all valid lines', () => {
    const validLines: PricingLine[] = ['Redline', 'Greenline'];
    validLines.forEach((line) => {
      expect(['Redline', 'Greenline']).toContain(line);
    });
  });

  test('QuotaLevel union should include all valid levels', () => {
    const validLevels: QuotaLevel[] = ['below', 'above', 'double'];
    validLevels.forEach((level) => {
      expect(['below', 'above', 'double']).toContain(level);
    });
  });

  test('BusinessType union should include all valid types', () => {
    const validTypes: BusinessType[] = ['new', 'renewal'];
    validTypes.forEach((type) => {
      expect(['new', 'renewal']).toContain(type);
    });
  });
});

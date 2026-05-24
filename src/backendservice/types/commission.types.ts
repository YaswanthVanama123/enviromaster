// Commission Calculator Types
// Based on Solange Commission Draft v2 (June 2026)

// Account Types - based on revenue and geographic proximity
export type AccountType = 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';

// Pricing Lines - standard vs premium
export type PricingLine = 'Redline' | 'Greenline';

// Agreement Terms
export type AgreementTerm = '3-year' | '1-year' | 'MTM-with-install' | 'MTM-no-install';

// Quota Achievement Level
export type QuotaLevel = 'below' | 'above' | 'double';

// Business Type
export type BusinessType = 'new' | 'renewal';

// Service Frequency
export type ServiceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'one-time';

// Pricing Tier (based on price ratio to Redline)
export interface PricingTier {
  minRatio: number;
  maxRatio: number;
  quotaMultiplier: number;
  label: string;
  requiresApproval: boolean;
}

// Account Type Revenue Rules (per-visit deductions)
export interface AccountTypeRevenueRule {
  revenueDeduction: number;      // Amount to subtract from per-visit revenue
  anchorBonusThreshold: number;  // Revenue threshold for Anchor bonus (only for Anchor type)
  anchorBonusMultiplier: number; // Multiplier for revenue above threshold (1.5 for Anchor)
}

// ============================================================
// V2 COMMISSION RULES - Solange Commission Draft (June 2026)
// ============================================================

// Pricing Tiers based on price ratio to Redline
export const PRICING_TIERS: PricingTier[] = [
  { minRatio: 0, maxRatio: 0.99, quotaMultiplier: 0.5, label: 'Below Redline', requiresApproval: true },
  { minRatio: 1.00, maxRatio: 1.09, quotaMultiplier: 1.0, label: 'Redline', requiresApproval: false },
  { minRatio: 1.10, maxRatio: 1.19, quotaMultiplier: 1.25, label: '110% Premium', requiresApproval: false },
  { minRatio: 1.20, maxRatio: 1.29, quotaMultiplier: 1.5, label: '120% Premium', requiresApproval: false },
  { minRatio: 1.30, maxRatio: Infinity, quotaMultiplier: 2.0, label: 'Greenline (130%+)', requiresApproval: false },
];

// Revenue deductions and bonuses by account type
export const ACCOUNT_TYPE_REVENUE_RULES: Record<AccountType, AccountTypeRevenueRule> = {
  'Anchor': { revenueDeduction: 0, anchorBonusThreshold: 200, anchorBonusMultiplier: 1.5 },
  'Bread5': { revenueDeduction: 50, anchorBonusThreshold: 0, anchorBonusMultiplier: 1.0 },
  'Bread15': { revenueDeduction: 75, anchorBonusThreshold: 0, anchorBonusMultiplier: 1.0 },
  'Pit': { revenueDeduction: 100, anchorBonusThreshold: 0, anchorBonusMultiplier: 1.0 },
};

// Visits per year by frequency
export const FREQUENCY_VISITS_PER_YEAR: Record<ServiceFrequency, number> = {
  'weekly': 50,     // 50 weeks (accounting for holidays)
  'biweekly': 25,
  'monthly': 12,
  'quarterly': 4,
  'one-time': 1,
};

// Quota Thresholds by months employed
export const QUOTA_THRESHOLDS = [
  { monthsEmployed: 1, annualQuota: 0, weeklyEquivalent: 0 },
  { monthsEmployed: 2, annualQuota: 2500, weeklyEquivalent: 50 },
  { monthsEmployed: 3, annualQuota: 5000, weeklyEquivalent: 100 },
  { monthsEmployed: 4, annualQuota: 7500, weeklyEquivalent: 150 },
  { monthsEmployed: 5, annualQuota: 10000, weeklyEquivalent: 200 },
];

// Commission Rules Configuration V2
export interface CommissionRulesV2 {
  version: string;
  quotaRates: {
    below: number;   // 3%
    above: number;   // 6%
    double: number;  // 9%
  };
  agreementMultipliers: {
    '3-year': number;           // 135%
    '1-year': number;           // 100%
    'MTM-with-install': number; // 100%
    'MTM-no-install': number;   // 50%
  };
  insideSalesDeduction: number;  // -3%
  renewalBonusRate: number;      // 4%
  renewalMinYears: number;       // 2 years
  anchorMinPerVisit: number;     // $200
  anchorMinGreenline: number;    // $100
}

// Default V2 Commission Rules
export const COMMISSION_RULES_V2: CommissionRulesV2 = {
  version: '2.0.0',
  quotaRates: {
    below: 3,
    above: 6,
    double: 9,
  },
  agreementMultipliers: {
    '3-year': 135,
    '1-year': 100,
    'MTM-with-install': 100,
    'MTM-no-install': 50,
  },
  insideSalesDeduction: -3,
  renewalBonusRate: 4,
  renewalMinYears: 2,
  anchorMinPerVisit: 200,
  anchorMinGreenline: 100,
};

// ============================================================
// V2 CALCULATION FUNCTIONS
// ============================================================

/**
 * Get pricing tier based on actual price vs redline price
 */
export function getPricingTier(actualPrice: number, redlinePrice: number): PricingTier {
  if (redlinePrice <= 0) return PRICING_TIERS[1]; // Default to Redline
  const ratio = actualPrice / redlinePrice;

  for (const tier of PRICING_TIERS) {
    if (ratio >= tier.minRatio && ratio < tier.maxRatio) {
      return tier;
    }
  }
  return PRICING_TIERS[PRICING_TIERS.length - 1]; // Greenline
}

/**
 * Calculate commissionable revenue based on account type
 * - Pit: First $100 = no commission
 * - Bread5: Subtract first $50
 * - Bread15: Subtract first $75
 * - Anchor: No deduction, 150% on revenue above $200
 */
export function calculateCommissionableRevenue(
  perVisitRevenue: number,
  accountType: AccountType
): {
  commissionableRevenue: number;
  revenueDeduction: number;
  anchorBonus: number;
} {
  const rule = ACCOUNT_TYPE_REVENUE_RULES[accountType];

  // Calculate revenue deduction
  const revenueDeduction = Math.min(perVisitRevenue, rule.revenueDeduction);
  let commissionableRevenue = Math.max(0, perVisitRevenue - rule.revenueDeduction);
  let anchorBonus = 0;

  // Apply Anchor bonus (150% on revenue above threshold)
  if (accountType === 'Anchor' && perVisitRevenue > rule.anchorBonusThreshold) {
    const bonusPortion = perVisitRevenue - rule.anchorBonusThreshold;
    anchorBonus = bonusPortion * (rule.anchorBonusMultiplier - 1); // Extra 50%
    commissionableRevenue = rule.anchorBonusThreshold + (bonusPortion * rule.anchorBonusMultiplier);
  }

  return { commissionableRevenue, revenueDeduction, anchorBonus };
}

/**
 * V2 Commission Calculation Input
 */
export interface CommissionCalculationInputV2 {
  perVisitRevenue: number;
  redlinePrice: number;
  frequency: ServiceFrequency;
  accountType: AccountType;
  agreementTerm: AgreementTerm;
  contractMonths: number;
  businessType: BusinessType;
  yearsAsCustomer?: number;
  totalRenewalValue?: number;
  isInsideSales: boolean;
  quotaLevel: QuotaLevel;
}

/**
 * V2 Commission Calculation Result
 */
export interface CommissionCalculationResultV2 {
  // Input values
  perVisitRevenue: number;
  redlinePrice: number;
  frequency: ServiceFrequency;
  accountType: AccountType;
  agreementTerm: AgreementTerm;
  contractMonths: number;
  quotaLevel: QuotaLevel;

  // Breakdown
  breakdown: {
    priceRatio: number;
    pricingTier: string;
    pricingMultiplier: number;
    requiresApproval: boolean;
    originalRevenue: number;
    revenueDeduction: number;
    anchorBonus: number;
    commissionableRevenue: number;
    revenueWithPricingMultiplier: number;
    visitsPerYear: number;
    annualQuotaCredit: number;
    baseRate: number;
    insideSalesDeduction: number;
    effectiveRate: number;
    agreementMultiplier: number;
    finalCommissionRate: number;
    renewalBonusRate: number;
    renewalBonusAmount: number;
  };

  // Commission amounts
  perVisitCommission: number;
  monthlyCommission: number;
  annualCommission: number;
  contractCommission: number;
  renewalBonus: number;
  totalCommission: number;

  calculatedAt: string;
  rulesVersion: string;
}

/**
 * Calculate commission using V2 rules (Solange Commission Draft)
 */
export function calculateCommissionV2(input: CommissionCalculationInputV2): CommissionCalculationResultV2 {
  const {
    perVisitRevenue,
    redlinePrice,
    frequency,
    accountType,
    agreementTerm,
    contractMonths,
    businessType,
    yearsAsCustomer = 0,
    totalRenewalValue = 0,
    isInsideSales,
    quotaLevel,
  } = input;

  const rules = COMMISSION_RULES_V2;

  // Step 1: Determine pricing tier
  const priceRatio = redlinePrice > 0 ? perVisitRevenue / redlinePrice : 1;
  const pricingTier = getPricingTier(perVisitRevenue, redlinePrice);
  const pricingMultiplier = pricingTier.quotaMultiplier;

  // Step 2: Calculate commissionable revenue with account type adjustments
  const { commissionableRevenue, revenueDeduction, anchorBonus } =
    calculateCommissionableRevenue(perVisitRevenue, accountType);

  // Step 3: Apply pricing multiplier to get quota credit value
  const revenueWithPricingMultiplier = commissionableRevenue * pricingMultiplier;

  // Step 4: Calculate annual quota credit
  const visitsPerYear = FREQUENCY_VISITS_PER_YEAR[frequency] || 1;
  const annualQuotaCredit = revenueWithPricingMultiplier * visitsPerYear;

  // Step 5: Get commission rate based on quota level
  const baseRate = rules.quotaRates[quotaLevel];
  const insideSalesDeduction = isInsideSales ? rules.insideSalesDeduction : 0;
  const effectiveRate = baseRate + insideSalesDeduction;

  // Step 6: Apply agreement multiplier
  const agreementMultiplier = rules.agreementMultipliers[agreementTerm];
  const finalCommissionRate = effectiveRate * (agreementMultiplier / 100);

  // Step 7: Calculate commission amounts
  const perVisitCommission = commissionableRevenue * (finalCommissionRate / 100);
  const annualCommission = perVisitCommission * visitsPerYear;
  const monthlyCommission = annualCommission / 12;
  const contractCommission = annualCommission * (contractMonths / 12);

  // Step 8: Calculate renewal bonus
  let renewalBonusRate = 0;
  let renewalBonusAmount = 0;
  if (businessType === 'renewal' && yearsAsCustomer >= rules.renewalMinYears) {
    renewalBonusRate = rules.renewalBonusRate;
    renewalBonusAmount = totalRenewalValue * (renewalBonusRate / 100);
  }

  return {
    perVisitRevenue,
    redlinePrice,
    frequency,
    accountType,
    agreementTerm,
    contractMonths,
    quotaLevel,
    breakdown: {
      priceRatio,
      pricingTier: pricingTier.label,
      pricingMultiplier,
      requiresApproval: pricingTier.requiresApproval,
      originalRevenue: perVisitRevenue,
      revenueDeduction,
      anchorBonus,
      commissionableRevenue,
      revenueWithPricingMultiplier,
      visitsPerYear,
      annualQuotaCredit,
      baseRate,
      insideSalesDeduction,
      effectiveRate,
      agreementMultiplier,
      finalCommissionRate,
      renewalBonusRate,
      renewalBonusAmount,
    },
    perVisitCommission,
    monthlyCommission,
    annualCommission,
    contractCommission,
    renewalBonus: renewalBonusAmount,
    totalCommission: contractCommission + renewalBonusAmount,
    calculatedAt: new Date().toISOString(),
    rulesVersion: rules.version,
  };
}

// ============================================================
// LEGACY V1 TYPES (for backwards compatibility)
// ============================================================

// Commission Rules Configuration (V1 - simplified)
export interface CommissionRules {
  _id?: string;
  version: string;
  isActive: boolean;
  quotaRates: {
    below: number;
    above: number;
    double: number;
  };
  agreementMultipliers: {
    '3-year': number;
    '1-year': number;
    'MTM-with-install': number;
    'MTM-no-install': number;
  };
  accountTypeAdjustments: {
    Anchor: number;
    Bread5: number;
    Bread15: number;
    Pit: number;
  };
  greenlineBonus: number;
  renewalBonusRate: number;
  renewalMinYears: number;
  insideSalesDeduction: number;
  anchorMinMonthlyValue: number;
  createdAt?: string;
  updatedAt?: string;
}

// Default V1 commission rules (legacy - for backwards compatibility)
export const DEFAULT_COMMISSION_RULES: Omit<CommissionRules, '_id' | 'createdAt' | 'updatedAt'> = {
  version: '1.0.0',
  isActive: true,
  quotaRates: {
    below: 3,
    above: 6,
    double: 9,
  },
  agreementMultipliers: {
    '3-year': 135,
    '1-year': 100,
    'MTM-with-install': 100,
    'MTM-no-install': 50,
  },
  accountTypeAdjustments: {
    Anchor: 0,
    Bread5: -1,
    Bread15: -0.5,
    Pit: 0,
  },
  greenlineBonus: 1,
  renewalBonusRate: 4,
  renewalMinYears: 2,
  insideSalesDeduction: -3,
  anchorMinMonthlyValue: 200,
};

// Legacy types for backwards compatibility
export interface CommissionCalculationInput {
  monthlyValue: number;
  agreementTerm: AgreementTerm;
  accountType: AccountType;
  pricingLine: PricingLine;
  quotaLevel: QuotaLevel;
  businessType: BusinessType;
  yearsAsCustomer?: number;
  isInsideSales: boolean;
  salesPersonId?: string;
  salesPersonName?: string;
  customerName?: string;
  notes?: string;
}

export interface CommissionBreakdown {
  baseRate: number;
  agreementMultiplier: number;
  accountTypeAdjustment: number;
  greenlineBonus: number;
  renewalBonus: number;
  insideSalesDeduction: number;
}

export interface CommissionCalculationResult {
  input: CommissionCalculationInput;
  breakdown: CommissionBreakdown;
  effectiveBaseRate: number;
  finalCommissionRate: number;
  monthlyCommission: number;
  annualCommission: number;
  firstYearCommission: number;
  calculatedAt: string;
}

export interface CommissionRecord {
  _id?: string;
  calculation: CommissionCalculationResult;
  salesPersonId: string;
  salesPersonName: string;
  customerName?: string;
  createdBy: string;
  createdAt: string;
  status: 'draft' | 'submitted' | 'approved' | 'paid';
}

// Form options for dropdowns
export const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string; description: string }[] = [
  { value: 'Anchor', label: 'Anchor', description: '$200+/visit ($100+ Greenline), high-revenue location' },
  { value: 'Bread5', label: 'Bread5', description: 'Within 5 minutes of Anchor (−$50 deduction)' },
  { value: 'Bread15', label: 'Bread15', description: 'Within 15 minutes of Anchor (−$75 deduction)' },
  { value: 'Pit', label: 'Pit', description: 'New location, not near Anchor (−$100 deduction)' },
];

export const AGREEMENT_TERM_OPTIONS: { value: AgreementTerm; label: string; multiplier: number }[] = [
  { value: '3-year', label: '3-Year Agreement', multiplier: 135 },
  { value: '1-year', label: '1-Year Agreement', multiplier: 100 },
  { value: 'MTM-with-install', label: 'MTM with Install', multiplier: 100 },
  { value: 'MTM-no-install', label: 'MTM No Install', multiplier: 50 },
];

export const PRICING_LINE_OPTIONS: { value: PricingLine; label: string; description: string }[] = [
  { value: 'Redline', label: 'Redline', description: 'Standard pricing (100%)' },
  { value: 'Greenline', label: 'Greenline', description: '130%+ premium pricing (2x quota credit)' },
];

export const QUOTA_LEVEL_OPTIONS: { value: QuotaLevel; label: string; rate: number }[] = [
  { value: 'below', label: 'Below Quota', rate: 3 },
  { value: 'above', label: 'Above Quota', rate: 6 },
  { value: 'double', label: 'Double Quota', rate: 9 },
];

export const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: 'new', label: 'New Business' },
  { value: 'renewal', label: 'Renewal' },
];

export const FREQUENCY_OPTIONS: { value: ServiceFrequency; label: string; visitsPerYear: number }[] = [
  { value: 'weekly', label: 'Weekly', visitsPerYear: 50 },
  { value: 'biweekly', label: 'Bi-Weekly', visitsPerYear: 25 },
  { value: 'monthly', label: 'Monthly', visitsPerYear: 12 },
  { value: 'quarterly', label: 'Quarterly', visitsPerYear: 4 },
  { value: 'one-time', label: 'One-Time', visitsPerYear: 1 },
];

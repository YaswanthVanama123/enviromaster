

export type AccountType = 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';

export type PricingLine = 'Redline' | 'Greenline';

export type AgreementTerm = '3-year' | '1-year' | 'MTM-with-install' | 'MTM-no-install';

export type QuotaLevel = 'below' | 'above' | 'double';

export type BusinessType = 'new' | 'renewal';

export type ServiceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'one-time';

export interface PricingTier {
  minRatio: number;
  maxRatio: number;
  quotaMultiplier: number;
  label: string;
  requiresApproval: boolean;
}

export interface AccountTypeRevenueRule {
  revenueDeduction: number;      
  anchorBonusThreshold: number;  
  anchorBonusMultiplier: number; 
}

export const PRICING_TIERS: PricingTier[] = [
  { minRatio: 0, maxRatio: 0.99, quotaMultiplier: 0.5, label: 'Below Redline', requiresApproval: true },
  { minRatio: 1.00, maxRatio: 1.09, quotaMultiplier: 1.0, label: 'Redline', requiresApproval: false },
  { minRatio: 1.10, maxRatio: 1.19, quotaMultiplier: 1.25, label: '110% Premium', requiresApproval: false },
  { minRatio: 1.20, maxRatio: 1.29, quotaMultiplier: 1.5, label: '120% Premium', requiresApproval: false },
  { minRatio: 1.30, maxRatio: Infinity, quotaMultiplier: 2.0, label: 'Greenline (130%+)', requiresApproval: false },
];

export const ACCOUNT_TYPE_REVENUE_RULES: Record<AccountType, AccountTypeRevenueRule> = {
  'Anchor': { revenueDeduction: 0, anchorBonusThreshold: 200, anchorBonusMultiplier: 1.5 },
  'Bread5': { revenueDeduction: 50, anchorBonusThreshold: 0, anchorBonusMultiplier: 1.0 },
  'Bread15': { revenueDeduction: 75, anchorBonusThreshold: 0, anchorBonusMultiplier: 1.0 },
  'Pit': { revenueDeduction: 100, anchorBonusThreshold: 0, anchorBonusMultiplier: 1.0 },
};

export const FREQUENCY_VISITS_PER_YEAR: Record<ServiceFrequency, number> = {
  'weekly': 50,     
  'biweekly': 25,
  'monthly': 12,
  'quarterly': 4,
  'one-time': 1,
};

export const QUOTA_THRESHOLDS = [
  { monthsEmployed: 1, annualQuota: 0, weeklyEquivalent: 0 },
  { monthsEmployed: 2, annualQuota: 2500, weeklyEquivalent: 50 },
  { monthsEmployed: 3, annualQuota: 5000, weeklyEquivalent: 100 },
  { monthsEmployed: 4, annualQuota: 7500, weeklyEquivalent: 150 },
  { monthsEmployed: 5, annualQuota: 10000, weeklyEquivalent: 200 },
];

export interface CommissionRulesV2 {
  version: string;
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
  insideSalesDeduction: number;  
  renewalBonusRate: number;      
  renewalMinYears: number;       
  anchorMinPerVisit: number;     
  anchorMinGreenline: number;    
}

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

export interface QuotaTierCutoffs {
  aboveQuota: number;   
  doubleQuota: number;  
}

export const DEFAULT_QUOTA_TIER_CUTOFFS: QuotaTierCutoffs = {
  aboveQuota: 10000,
  doubleQuota: 20000,
};

export const PIT_PER_VISIT_THRESHOLD = 100;            
export const ANCHOR_PER_VISIT_THRESHOLD = 200;         
export const ANCHOR_BONUS_MULTIPLIER = 1.5;            

export interface ResolvedCommissionRules {
  quotaRates: { below: number; above: number; double: number };
  agreementMultipliers: {
    '3-year': number;
    '1-year': number;
    'MTM-with-install': number;
    'MTM-no-install': number;
  };
  insideSalesDeduction: number;          
  renewalBonusRate: number;
  renewalMinYears: number;
  anchorMinPerVisit: number;
  anchorMinGreenline: number;
  pitPerVisitThreshold: number;
  anchorPerVisitThreshold: number;
  anchorBonusMultiplier: number;
  perVisitPenalties: { Anchor: number; Bread5: number; Bread15: number; Pit: number };
  pricingTiers: PricingTier[];
  frequencyVisitsPerYear: {
    weekly: number;
    biweekly: number;
    monthly: number;
    quarterly: number;
    'one-time': number;
  };
  quotaTierCutoffs: { aboveQuota: number; doubleQuota: number };
  weeksPerAnnualCommission: number;
}

export function resolveCommissionRules(
  partial: Partial<CommissionRules> | null | undefined,
): ResolvedCommissionRules {
  const p = partial || {};
  return {
    quotaRates: {
      below: p.quotaRates?.below ?? COMMISSION_RULES_V2.quotaRates.below,
      above: p.quotaRates?.above ?? COMMISSION_RULES_V2.quotaRates.above,
      double: p.quotaRates?.double ?? COMMISSION_RULES_V2.quotaRates.double,
    },
    agreementMultipliers: {
      '3-year': p.agreementMultipliers?.['3-year'] ?? COMMISSION_RULES_V2.agreementMultipliers['3-year'],
      '1-year': p.agreementMultipliers?.['1-year'] ?? COMMISSION_RULES_V2.agreementMultipliers['1-year'],
      'MTM-with-install': p.agreementMultipliers?.['MTM-with-install'] ?? COMMISSION_RULES_V2.agreementMultipliers['MTM-with-install'],
      'MTM-no-install': p.agreementMultipliers?.['MTM-no-install'] ?? COMMISSION_RULES_V2.agreementMultipliers['MTM-no-install'],
    },
    insideSalesDeduction: p.insideSalesDeduction ?? COMMISSION_RULES_V2.insideSalesDeduction,
    renewalBonusRate: p.renewalBonusRate ?? COMMISSION_RULES_V2.renewalBonusRate,
    renewalMinYears: p.renewalMinYears ?? COMMISSION_RULES_V2.renewalMinYears,
    anchorMinPerVisit: p.anchorMinPerVisit ?? COMMISSION_RULES_V2.anchorMinPerVisit,
    anchorMinGreenline: p.anchorMinGreenline ?? COMMISSION_RULES_V2.anchorMinGreenline,
    pitPerVisitThreshold: p.pitPerVisitThreshold ?? PIT_PER_VISIT_THRESHOLD,
    anchorPerVisitThreshold: p.anchorPerVisitThreshold ?? ANCHOR_PER_VISIT_THRESHOLD,
    anchorBonusMultiplier: p.anchorBonusMultiplier ?? ANCHOR_BONUS_MULTIPLIER,
    perVisitPenalties: {
      Anchor: 0,
      Bread5: p.perVisitPenalties?.Bread5 ?? ACCOUNT_TYPE_REVENUE_RULES.Bread5.revenueDeduction,
      Bread15: p.perVisitPenalties?.Bread15 ?? ACCOUNT_TYPE_REVENUE_RULES.Bread15.revenueDeduction,
      Pit: p.perVisitPenalties?.Pit ?? ACCOUNT_TYPE_REVENUE_RULES.Pit.revenueDeduction,
    },
    pricingTiers:
      p.pricingTiers && p.pricingTiers.length > 0
        ? p.pricingTiers
        : PRICING_TIERS,
    frequencyVisitsPerYear: {
      weekly: p.frequencyVisitsPerYear?.weekly ?? FREQUENCY_VISITS_PER_YEAR.weekly,
      biweekly: p.frequencyVisitsPerYear?.biweekly ?? FREQUENCY_VISITS_PER_YEAR.biweekly,
      monthly: p.frequencyVisitsPerYear?.monthly ?? FREQUENCY_VISITS_PER_YEAR.monthly,
      quarterly: p.frequencyVisitsPerYear?.quarterly ?? FREQUENCY_VISITS_PER_YEAR.quarterly,
      'one-time': p.frequencyVisitsPerYear?.['one-time'] ?? FREQUENCY_VISITS_PER_YEAR['one-time'],
    },
    quotaTierCutoffs: {
      aboveQuota: p.quotaTierCutoffs?.aboveQuota ?? DEFAULT_QUOTA_TIER_CUTOFFS.aboveQuota,
      doubleQuota: p.quotaTierCutoffs?.doubleQuota ?? DEFAULT_QUOTA_TIER_CUTOFFS.doubleQuota,
    },
    weeksPerAnnualCommission: p.weeksPerAnnualCommission ?? 52,
  };
}

export function getPricingTierFromList(
  actualPrice: number,
  redlinePrice: number,
  tiers: PricingTier[],
): PricingTier {
  if (!tiers || tiers.length === 0) return PRICING_TIERS[1];
  if (redlinePrice <= 0) return tiers[1] ?? tiers[0];
  const ratio = actualPrice / redlinePrice;
  for (const tier of tiers) {
    const max = Number.isFinite(tier.maxRatio) ? tier.maxRatio : Infinity;
    if (ratio >= tier.minRatio && ratio < max) return tier;
  }
  return tiers[tiers.length - 1];
}

export function getPricingTier(actualPrice: number, redlinePrice: number): PricingTier {
  if (redlinePrice <= 0) return PRICING_TIERS[1]; 
  const ratio = actualPrice / redlinePrice;

  for (const tier of PRICING_TIERS) {
    if (ratio >= tier.minRatio && ratio < tier.maxRatio) {
      return tier;
    }
  }
  return PRICING_TIERS[PRICING_TIERS.length - 1]; 
}

export function calculateCommissionableRevenue(
  perVisitRevenue: number,
  accountType: AccountType
): {
  commissionableRevenue: number;
  revenueDeduction: number;
  anchorBonus: number;
} {
  const rule = ACCOUNT_TYPE_REVENUE_RULES[accountType];

  const revenueDeduction = Math.min(perVisitRevenue, rule.revenueDeduction);
  let commissionableRevenue = Math.max(0, perVisitRevenue - rule.revenueDeduction);
  let anchorBonus = 0;

  if (accountType === 'Anchor' && perVisitRevenue > rule.anchorBonusThreshold) {
    const bonusPortion = perVisitRevenue - rule.anchorBonusThreshold;
    anchorBonus = bonusPortion * (rule.anchorBonusMultiplier - 1); 
    commissionableRevenue = rule.anchorBonusThreshold + (bonusPortion * rule.anchorBonusMultiplier);
  }

  return { commissionableRevenue, revenueDeduction, anchorBonus };
}

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

export interface CommissionCalculationResultV2 {
  
  perVisitRevenue: number;
  redlinePrice: number;
  frequency: ServiceFrequency;
  accountType: AccountType;
  agreementTerm: AgreementTerm;
  contractMonths: number;
  quotaLevel: QuotaLevel;

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

  perVisitCommission: number;
  weeklyCommission: number;
  annualCommission: number;
  contractCommission: number;
  renewalBonus: number;
  totalCommission: number;

  calculatedAt: string;
  rulesVersion: string;
}

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

  const priceRatio = redlinePrice > 0 ? perVisitRevenue / redlinePrice : 1;
  const pricingTier = getPricingTier(perVisitRevenue, redlinePrice);
  const pricingMultiplier = pricingTier.quotaMultiplier;

  const { commissionableRevenue, revenueDeduction, anchorBonus } =
    calculateCommissionableRevenue(perVisitRevenue, accountType);

  const revenueWithPricingMultiplier = commissionableRevenue * pricingMultiplier;

  const visitsPerYear = FREQUENCY_VISITS_PER_YEAR[frequency] || 1;
  const annualQuotaCredit = revenueWithPricingMultiplier * visitsPerYear;

  const baseRate = rules.quotaRates[quotaLevel];
  const insideSalesDeduction = isInsideSales ? rules.insideSalesDeduction : 0;
  const effectiveRate = baseRate + insideSalesDeduction;

  const agreementMultiplier = rules.agreementMultipliers[agreementTerm];
  const finalCommissionRate = effectiveRate * (agreementMultiplier / 100);

  const perVisitCommission = commissionableRevenue * (finalCommissionRate / 100);
  const annualCommission = perVisitCommission * visitsPerYear;
  const weeklyCommission = annualCommission / 52;
  
  const contractCommission = annualCommission;

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
    weeklyCommission,
    annualCommission,
    contractCommission,
    renewalBonus: renewalBonusAmount,
    totalCommission: contractCommission + renewalBonusAmount,
    calculatedAt: new Date().toISOString(),
    rulesVersion: rules.version,
  };
}

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
  
  perVisitPenalties?: {
    Bread5: number;
    Bread15: number;
    Pit: number;
  };
  
  anchorMinPerVisit?: number;
  anchorMinGreenline?: number;
  pitPerVisitThreshold?: number;
  anchorPerVisitThreshold?: number;
  anchorBonusMultiplier?: number;
  
  pricingTiers?: Array<{
    minRatio: number;
    maxRatio: number;
    quotaMultiplier: number;
    label: string;
    requiresApproval: boolean;
  }>;
  
  frequencyVisitsPerYear?: {
    weekly: number;
    biweekly: number;
    monthly: number;
    quarterly: number;
    'one-time': number;
  };

  
  weeksPerAnnualCommission?: number;
  
  quotaTierCutoffs?: {
    aboveQuota: number;
    doubleQuota: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

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
  weeklyCommission: number;
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



import {
  AccountType,
  AgreementTerm,
  QuotaLevel,
  ServiceFrequency,
  BusinessType,
  PricingTier,
  AccountTypeRevenueRule,
  QuotaThreshold,
  AutoQuotaRule,
  CommissionCalculationInputV2,
  CommissionBreakdownV2,
  CommissionCalculationResultV2,
  PRICING_TIERS,
  ACCOUNT_TYPE_REVENUE_RULES,
  QUOTA_THRESHOLDS,
  AUTO_QUOTA_RULES,
  FREQUENCY_VISITS_PER_YEAR,
  DEFAULT_COMMISSION_RULES_V2,
} from '../types/commission.types.v2';

export function getPricingTier(actualPrice: number, redlinePrice: number): PricingTier {
  if (redlinePrice <= 0) {
    return PRICING_TIERS[1]; 
  }

  const ratio = actualPrice / redlinePrice;

  for (const tier of PRICING_TIERS) {
    if (ratio >= tier.minRatio && ratio < tier.maxRatio) {
      return tier;
    }
  }

  return PRICING_TIERS[PRICING_TIERS.length - 1];
}

export function getQuotaMultiplier(actualPrice: number, redlinePrice: number): number {
  const tier = getPricingTier(actualPrice, redlinePrice);
  return tier.quotaMultiplier;
}

export function requiresPricingApproval(actualPrice: number, redlinePrice: number): boolean {
  const tier = getPricingTier(actualPrice, redlinePrice);
  return tier.requiresApproval;
}

export function getAccountTypeRevenueRule(accountType: AccountType): AccountTypeRevenueRule {
  const rule = ACCOUNT_TYPE_REVENUE_RULES.find((r) => r.type === accountType);
  if (!rule) {
    throw new Error(`Unknown account type: ${accountType}`);
  }
  return rule;
}

export function calculateCommissionableRevenue(
  perVisitRevenue: number,
  accountType: AccountType
): {
  commissionableRevenue: number;
  revenueDeduction: number;
  anchorBonus: number;
} {
  const rule = getAccountTypeRevenueRule(accountType);

  const revenueDeduction = Math.min(perVisitRevenue, rule.revenueDeduction);
  let commissionableRevenue = Math.max(0, perVisitRevenue - rule.revenueDeduction);

  let anchorBonus = 0;
  if (accountType === 'Anchor' && perVisitRevenue > rule.anchorBonusThreshold) {
    const bonusPortion = perVisitRevenue - rule.anchorBonusThreshold;
    anchorBonus = bonusPortion * (rule.anchorBonusMultiplier - 1); 
    commissionableRevenue = rule.anchorBonusThreshold + bonusPortion * rule.anchorBonusMultiplier;
  }

  return {
    commissionableRevenue,
    revenueDeduction,
    anchorBonus,
  };
}

export function detectAccountType(
  perVisitRevenue: number,
  drivingTimeMinutes: number | null,
  isGreenline: boolean
): AccountType {
  const rules = DEFAULT_COMMISSION_RULES_V2;

  const anchorThreshold = isGreenline ? rules.anchorMinGreenline : rules.anchorMinPerVisit;

  if (perVisitRevenue >= anchorThreshold) {
    return 'Anchor';
  }

  if (drivingTimeMinutes === null || drivingTimeMinutes === undefined) {
    return 'Pit';
  }

  if (drivingTimeMinutes < 5) {
    return 'Bread5';
  } else if (drivingTimeMinutes <= 15) {
    return 'Bread15';
  } else {
    return 'Pit';
  }
}

export function calculateMonthsEmployed(hireDate: Date | string): number {
  const hire = typeof hireDate === 'string' ? new Date(hireDate) : hireDate;
  const now = new Date();

  const months =
    (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());

  return Math.max(1, months + 1);
}

export function getQuotaThreshold(monthsEmployed: number): QuotaThreshold {
  
  const effectiveMonths = Math.min(monthsEmployed, 5);

  const threshold = QUOTA_THRESHOLDS.find((t) => t.monthsEmployed === effectiveMonths);
  return threshold || QUOTA_THRESHOLDS[QUOTA_THRESHOLDS.length - 1];
}

export function checkAutoQuota(
  monthsEmployed: number,
  newRooftopCount: number,
  salesMeetMinimum: boolean
): boolean {
  const rule = AUTO_QUOTA_RULES.find(
    (r) => monthsEmployed >= r.minMonths && monthsEmployed <= r.maxMonths
  );

  if (!rule) return false;

  return newRooftopCount >= rule.requiredSales && salesMeetMinimum;
}

export function determineQuotaLevel(
  monthsEmployed: number,
  periodSalesTotal: number,
  newRooftopCount: number,
  salesMeetMinimum: boolean
): QuotaLevel {
  
  if (checkAutoQuota(monthsEmployed, newRooftopCount, salesMeetMinimum)) {
    return 'above'; 
  }

  const threshold = getQuotaThreshold(monthsEmployed);

  if (threshold.annualQuota === 0) {
    return 'above';
  }

  if (periodSalesTotal >= threshold.annualQuota * 2) {
    return 'double';
  }
  if (periodSalesTotal >= threshold.annualQuota) {
    return 'above';
  }
  return 'below';
}

export function getBaseCommissionRate(quotaLevel: QuotaLevel): number {
  const rules = DEFAULT_COMMISSION_RULES_V2;
  return rules.quotaRates[quotaLevel];
}

export function getVisitsPerYear(frequency: ServiceFrequency): number {
  return FREQUENCY_VISITS_PER_YEAR[frequency] || 1;
}

export function calculateAnnualRevenue(perVisitRevenue: number, frequency: ServiceFrequency): number {
  return perVisitRevenue * getVisitsPerYear(frequency);
}

export function calculateCommissionV2(
  input: CommissionCalculationInputV2
): CommissionCalculationResultV2 {
  const rules = DEFAULT_COMMISSION_RULES_V2;

  
  
  const priceRatio = input.redlinePrice > 0 ? input.perVisitRevenue / input.redlinePrice : 1;
  const pricingTier = getPricingTier(input.perVisitRevenue, input.redlinePrice);
  const pricingMultiplier = pricingTier.quotaMultiplier;
  const requiresApproval = pricingTier.requiresApproval;

  
  
  const {
    commissionableRevenue,
    revenueDeduction,
    anchorBonus,
  } = calculateCommissionableRevenue(input.perVisitRevenue, input.accountType);

  
  
  const revenueWithPricingMultiplier = commissionableRevenue * pricingMultiplier;

  
  
  const visitsPerYear = getVisitsPerYear(input.frequency);
  const annualQuotaCredit = revenueWithPricingMultiplier * visitsPerYear;

  
  
  const monthsEmployed = input.employeeMonthsEmployed || 5; 
  const quotaThreshold = getQuotaThreshold(monthsEmployed);
  const totalPeriodSales = (input.periodSalesTotal || 0) + annualQuotaCredit;
  const newRooftopCount = input.newRooftopCount || 0;

  const annualRevenue = calculateAnnualRevenue(input.perVisitRevenue, input.frequency);
  const salesMeetMinimum = annualRevenue >= 1000 || input.frequency !== 'one-time';

  const autoQuotaQualified = checkAutoQuota(monthsEmployed, newRooftopCount + 1, salesMeetMinimum);
  const quotaLevel = determineQuotaLevel(
    monthsEmployed,
    totalPeriodSales,
    newRooftopCount + 1,
    salesMeetMinimum
  );

  
  
  const baseRate = getBaseCommissionRate(quotaLevel);
  const insideSalesDeduction = input.isInsideSales ? rules.insideSalesDeduction : 0;
  const effectiveRate = baseRate + insideSalesDeduction;

  
  
  const agreementMultiplier = rules.agreementMultipliers[input.agreementTerm];
  const finalCommissionRate = effectiveRate * (agreementMultiplier / 100);

  
  
  const perVisitCommission = commissionableRevenue * (finalCommissionRate / 100);
  const annualCommission = perVisitCommission * visitsPerYear;
  const weeklyCommission = annualCommission / 52;
  
  const contractCommission = annualCommission;

  
  
  let renewalBonusRate = 0;
  let renewalBonusAmount = 0;

  if (input.businessType === 'renewal') {
    const yearsAsCustomer = input.yearsAsCustomer || 0;
    if (yearsAsCustomer >= rules.renewalMinYears) {
      renewalBonusRate = rules.renewalBonusRate;
      renewalBonusAmount = (input.totalRenewalValue || 0) * (renewalBonusRate / 100);
    }
  }

  

  const backCommissionEligible = false;
  const backCommissionAmount = 0;

  
  
  const breakdown: CommissionBreakdownV2 = {
    priceRatio,
    pricingTier: pricingTier.label,
    pricingMultiplier,
    requiresApproval,

    originalRevenue: input.perVisitRevenue,
    revenueDeduction,
    anchorBonus,
    commissionableRevenue,

    revenueWithPricingMultiplier,
    visitsPerYear,
    annualQuotaCredit,

    employeeQuotaThreshold: quotaThreshold.annualQuota,
    totalPeriodSales,
    autoQuotaQualified,
    quotaLevel,

    baseRate,
    insideSalesDeduction,
    effectiveRate,
    agreementMultiplier,
    finalCommissionRate,

    renewalBonusRate,
    renewalBonusAmount,
  };

  const result: CommissionCalculationResultV2 = {
    input,
    breakdown,

    perVisitCommission,
    weeklyCommission,
    annualCommission,
    contractCommission,
    renewalBonus: renewalBonusAmount,
    totalCommission: contractCommission + renewalBonusAmount,

    backCommissionEligible,
    backCommissionAmount,

    calculatedAt: new Date().toISOString(),
    rulesVersion: rules.version,
  };

  return result;
}

export function calculateBackCommission(
  originalPitRevenue: number,
  originalFrequency: ServiceFrequency,
  quotaLevel: QuotaLevel,
  agreementTerm: AgreementTerm,
  contractMonths: number
): number {
  const rules = DEFAULT_COMMISSION_RULES_V2;

  
  const baseRate = getBaseCommissionRate(quotaLevel);
  const agreementMultiplier = rules.agreementMultipliers[agreementTerm];
  const finalRate = baseRate * (agreementMultiplier / 100);

  const visitsPerYear = getVisitsPerYear(originalFrequency);
  const annualCommission = originalPitRevenue * (finalRate / 100) * visitsPerYear;
  const contractCommission = annualCommission * (contractMonths / 12);

  return contractCommission;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function getPricingTierLabel(actualPrice: number, redlinePrice: number): string {
  const tier = getPricingTier(actualPrice, redlinePrice);
  return tier.label;
}

export function isGreenline(actualPrice: number, redlinePrice: number): boolean {
  if (redlinePrice <= 0) return false;
  return actualPrice / redlinePrice >= 1.3;
}

export function getQuotaLevelDescription(quotaLevel: QuotaLevel): string {
  const descriptions: Record<QuotaLevel, string> = {
    below: 'Below Quota (3% base rate)',
    above: 'Above Quota (6% base rate)',
    double: 'Double Quota (9% base rate)',
  };
  return descriptions[quotaLevel];
}

export function getAccountTypeImpact(
  accountType: AccountType,
  perVisitRevenue: number
): string {
  const rule = getAccountTypeRevenueRule(accountType);
  const { commissionableRevenue, revenueDeduction, anchorBonus } = calculateCommissionableRevenue(
    perVisitRevenue,
    accountType
  );

  if (accountType === 'Anchor' && anchorBonus > 0) {
    return `Anchor: First $${rule.anchorBonusThreshold} at 100%, remaining $${(perVisitRevenue - rule.anchorBonusThreshold).toFixed(2)} at 150% = $${commissionableRevenue.toFixed(2)} commissionable`;
  }

  if (revenueDeduction > 0) {
    return `${accountType}: First $${rule.revenueDeduction} deducted = $${commissionableRevenue.toFixed(2)} commissionable`;
  }

  return `${accountType}: Full $${perVisitRevenue.toFixed(2)} commissionable`;
}

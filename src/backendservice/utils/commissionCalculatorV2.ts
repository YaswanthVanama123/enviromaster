/**
 * Commission Calculator Utilities - Version 2
 * Based on Solange Commission Draft v2 (June 2026)
 *
 * This file contains all the calculation utilities for the v2 commission system.
 */

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

// ============================================================
// PRICING TIER UTILITIES
// ============================================================

/**
 * Get the pricing tier based on price ratio (actual price / redline price)
 */
export function getPricingTier(actualPrice: number, redlinePrice: number): PricingTier {
  if (redlinePrice <= 0) {
    return PRICING_TIERS[1]; // Default to Redline if no redline price
  }

  const ratio = actualPrice / redlinePrice;

  for (const tier of PRICING_TIERS) {
    if (ratio >= tier.minRatio && ratio < tier.maxRatio) {
      return tier;
    }
  }

  // Default to Greenline if ratio >= 1.30
  return PRICING_TIERS[PRICING_TIERS.length - 1];
}

/**
 * Get the quota multiplier for a given price ratio
 */
export function getQuotaMultiplier(actualPrice: number, redlinePrice: number): number {
  const tier = getPricingTier(actualPrice, redlinePrice);
  return tier.quotaMultiplier;
}

/**
 * Check if pricing requires approval (below redline)
 */
export function requiresPricingApproval(actualPrice: number, redlinePrice: number): boolean {
  const tier = getPricingTier(actualPrice, redlinePrice);
  return tier.requiresApproval;
}

// ============================================================
// ACCOUNT TYPE REVENUE UTILITIES
// ============================================================

/**
 * Get the revenue rule for an account type
 */
export function getAccountTypeRevenueRule(accountType: AccountType): AccountTypeRevenueRule {
  const rule = ACCOUNT_TYPE_REVENUE_RULES.find((r) => r.type === accountType);
  if (!rule) {
    throw new Error(`Unknown account type: ${accountType}`);
  }
  return rule;
}

/**
 * Calculate commissionable revenue after account type deductions
 *
 * For Pit: First $100 = $0 commission
 * For Bread5: First $50 = $0 commission
 * For Bread15: First $75 = $0 commission
 * For Anchor: Revenue above $200 counts at 150%
 */
export function calculateCommissionableRevenue(
  perVisitRevenue: number,
  accountType: AccountType
): {
  commissionableRevenue: number;
  revenueDeduction: number;
  anchorBonus: number;
} {
  const rule = getAccountTypeRevenueRule(accountType);

  // Apply revenue deduction
  const revenueDeduction = Math.min(perVisitRevenue, rule.revenueDeduction);
  let commissionableRevenue = Math.max(0, perVisitRevenue - rule.revenueDeduction);

  // Calculate Anchor bonus (150% on revenue above $200)
  let anchorBonus = 0;
  if (accountType === 'Anchor' && perVisitRevenue > rule.anchorBonusThreshold) {
    const bonusPortion = perVisitRevenue - rule.anchorBonusThreshold;
    anchorBonus = bonusPortion * (rule.anchorBonusMultiplier - 1); // Extra 50%
    commissionableRevenue = rule.anchorBonusThreshold + bonusPortion * rule.anchorBonusMultiplier;
  }

  return {
    commissionableRevenue,
    revenueDeduction,
    anchorBonus,
  };
}

/**
 * Auto-detect account type based on revenue and driving time
 */
export function detectAccountType(
  perVisitRevenue: number,
  drivingTimeMinutes: number | null,
  isGreenline: boolean
): AccountType {
  const rules = DEFAULT_COMMISSION_RULES_V2;

  // Check if qualifies as Anchor based on revenue
  const anchorThreshold = isGreenline ? rules.anchorMinGreenline : rules.anchorMinPerVisit;

  if (perVisitRevenue >= anchorThreshold) {
    return 'Anchor';
  }

  // If no driving time available, default to Pit
  if (drivingTimeMinutes === null || drivingTimeMinutes === undefined) {
    return 'Pit';
  }

  // Determine based on driving time to nearest Anchor
  if (drivingTimeMinutes < 5) {
    return 'Bread5';
  } else if (drivingTimeMinutes <= 15) {
    return 'Bread15';
  } else {
    return 'Pit';
  }
}

// ============================================================
// QUOTA UTILITIES
// ============================================================

/**
 * Calculate months employed from hire date
 */
export function calculateMonthsEmployed(hireDate: Date | string): number {
  const hire = typeof hireDate === 'string' ? new Date(hireDate) : hireDate;
  const now = new Date();

  const months =
    (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());

  // Add 1 because we count the current month
  return Math.max(1, months + 1);
}

/**
 * Get quota threshold based on employee tenure
 */
export function getQuotaThreshold(monthsEmployed: number): QuotaThreshold {
  // Cap at 5 months (same quota for 5+)
  const effectiveMonths = Math.min(monthsEmployed, 5);

  const threshold = QUOTA_THRESHOLDS.find((t) => t.monthsEmployed === effectiveMonths);
  return threshold || QUOTA_THRESHOLDS[QUOTA_THRESHOLDS.length - 1];
}

/**
 * Check if employee qualifies for auto-quota based on rooftop sales
 */
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

/**
 * Determine quota level based on employee tenure and sales
 */
export function determineQuotaLevel(
  monthsEmployed: number,
  periodSalesTotal: number,
  newRooftopCount: number,
  salesMeetMinimum: boolean
): QuotaLevel {
  // Check auto-quota first
  if (checkAutoQuota(monthsEmployed, newRooftopCount, salesMeetMinimum)) {
    return 'above'; // Auto-qualify for above quota
  }

  const threshold = getQuotaThreshold(monthsEmployed);

  // If no quota requirement (month 1), treat as above quota
  if (threshold.annualQuota === 0) {
    return 'above';
  }

  // Standard quota comparison
  if (periodSalesTotal >= threshold.annualQuota * 2) {
    return 'double';
  }
  if (periodSalesTotal >= threshold.annualQuota) {
    return 'above';
  }
  return 'below';
}

/**
 * Get base commission rate for quota level
 */
export function getBaseCommissionRate(quotaLevel: QuotaLevel): number {
  const rules = DEFAULT_COMMISSION_RULES_V2;
  return rules.quotaRates[quotaLevel];
}

// ============================================================
// FREQUENCY UTILITIES
// ============================================================

/**
 * Get visits per year for a frequency
 */
export function getVisitsPerYear(frequency: ServiceFrequency): number {
  return FREQUENCY_VISITS_PER_YEAR[frequency] || 1;
}

/**
 * Calculate annual revenue from per-visit and frequency
 */
export function calculateAnnualRevenue(perVisitRevenue: number, frequency: ServiceFrequency): number {
  return perVisitRevenue * getVisitsPerYear(frequency);
}

// ============================================================
// MAIN COMMISSION CALCULATOR
// ============================================================

/**
 * Calculate commission based on v2 rules (Solange Commission Draft v2)
 */
export function calculateCommissionV2(
  input: CommissionCalculationInputV2
): CommissionCalculationResultV2 {
  const rules = DEFAULT_COMMISSION_RULES_V2;

  // ========================================
  // STEP 1: Pricing Tier Analysis
  // ========================================
  const priceRatio = input.redlinePrice > 0 ? input.perVisitRevenue / input.redlinePrice : 1;
  const pricingTier = getPricingTier(input.perVisitRevenue, input.redlinePrice);
  const pricingMultiplier = pricingTier.quotaMultiplier;
  const requiresApproval = pricingTier.requiresApproval;

  // ========================================
  // STEP 2: Revenue Adjustments (Account Type)
  // ========================================
  const {
    commissionableRevenue,
    revenueDeduction,
    anchorBonus,
  } = calculateCommissionableRevenue(input.perVisitRevenue, input.accountType);

  // ========================================
  // STEP 3: Apply Pricing Multiplier
  // ========================================
  const revenueWithPricingMultiplier = commissionableRevenue * pricingMultiplier;

  // ========================================
  // STEP 4: Calculate Annual Quota Credit
  // ========================================
  const visitsPerYear = getVisitsPerYear(input.frequency);
  const annualQuotaCredit = revenueWithPricingMultiplier * visitsPerYear;

  // ========================================
  // STEP 5: Determine Quota Level
  // ========================================
  const monthsEmployed = input.employeeMonthsEmployed || 5; // Default to 5+ months
  const quotaThreshold = getQuotaThreshold(monthsEmployed);
  const totalPeriodSales = (input.periodSalesTotal || 0) + annualQuotaCredit;
  const newRooftopCount = input.newRooftopCount || 0;

  // Check if this sale meets minimum for auto-quota
  const annualRevenue = calculateAnnualRevenue(input.perVisitRevenue, input.frequency);
  const salesMeetMinimum = annualRevenue >= 1000 || input.frequency !== 'one-time';

  const autoQuotaQualified = checkAutoQuota(monthsEmployed, newRooftopCount + 1, salesMeetMinimum);
  const quotaLevel = determineQuotaLevel(
    monthsEmployed,
    totalPeriodSales,
    newRooftopCount + 1,
    salesMeetMinimum
  );

  // ========================================
  // STEP 6: Calculate Commission Rate
  // ========================================
  const baseRate = getBaseCommissionRate(quotaLevel);
  const insideSalesDeduction = input.isInsideSales ? rules.insideSalesDeduction : 0;
  const effectiveRate = baseRate + insideSalesDeduction;

  // ========================================
  // STEP 7: Apply Agreement Multiplier
  // ========================================
  const agreementMultiplier = rules.agreementMultipliers[input.agreementTerm];
  const finalCommissionRate = effectiveRate * (agreementMultiplier / 100);

  // ========================================
  // STEP 8: Calculate Commission Amounts
  // ========================================
  const perVisitCommission = commissionableRevenue * (finalCommissionRate / 100);
  const annualCommission = perVisitCommission * visitsPerYear;
  const weeklyCommission = annualCommission / 52;
  // Commission is always paid for 12 months only
  const contractCommission = annualCommission;

  // ========================================
  // STEP 9: Renewal Bonus
  // ========================================
  let renewalBonusRate = 0;
  let renewalBonusAmount = 0;

  if (input.businessType === 'renewal') {
    const yearsAsCustomer = input.yearsAsCustomer || 0;
    if (yearsAsCustomer >= rules.renewalMinYears) {
      renewalBonusRate = rules.renewalBonusRate;
      renewalBonusAmount = (input.totalRenewalValue || 0) * (renewalBonusRate / 100);
    }
  }

  // ========================================
  // STEP 10: Back Commission (Pit Conversion)
  // ========================================
  // This would be calculated separately when a Pit is converted
  const backCommissionEligible = false;
  const backCommissionAmount = 0;

  // ========================================
  // BUILD RESULT
  // ========================================
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

// ============================================================
// BACK COMMISSION CALCULATOR
// ============================================================

/**
 * Calculate back commission when a Pit is converted to an Anchor
 */
export function calculateBackCommission(
  originalPitRevenue: number,
  originalFrequency: ServiceFrequency,
  quotaLevel: QuotaLevel,
  agreementTerm: AgreementTerm,
  contractMonths: number
): number {
  const rules = DEFAULT_COMMISSION_RULES_V2;

  // The Pit had first $100 deducted - now we pay commission on full amount
  // But we need to recalculate as if it was an Anchor from the start
  const baseRate = getBaseCommissionRate(quotaLevel);
  const agreementMultiplier = rules.agreementMultipliers[agreementTerm];
  const finalRate = baseRate * (agreementMultiplier / 100);

  const visitsPerYear = getVisitsPerYear(originalFrequency);
  const annualCommission = originalPitRevenue * (finalRate / 100) * visitsPerYear;
  const contractCommission = annualCommission * (contractMonths / 12);

  return contractCommission;
}

// ============================================================
// HELPER FUNCTIONS FOR UI
// ============================================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get pricing tier label from price ratio
 */
export function getPricingTierLabel(actualPrice: number, redlinePrice: number): string {
  const tier = getPricingTier(actualPrice, redlinePrice);
  return tier.label;
}

/**
 * Check if a deal is Greenline (130%+ of Redline)
 */
export function isGreenline(actualPrice: number, redlinePrice: number): boolean {
  if (redlinePrice <= 0) return false;
  return actualPrice / redlinePrice >= 1.3;
}

/**
 * Get quota level description
 */
export function getQuotaLevelDescription(quotaLevel: QuotaLevel): string {
  const descriptions: Record<QuotaLevel, string> = {
    below: 'Below Quota (3% base rate)',
    above: 'Above Quota (6% base rate)',
    double: 'Double Quota (9% base rate)',
  };
  return descriptions[quotaLevel];
}

/**
 * Get account type impact description
 */
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

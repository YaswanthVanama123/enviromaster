// Commission Calculator Types - Version 2
// Based on Solange Commission Draft v2 (June 2026)

// ============================================================
// ACCOUNT TYPES
// ============================================================

// Account Types - based on revenue and geographic proximity
export type AccountType = 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';

// Pricing Lines - standard vs premium
export type PricingLine = 'Redline' | 'Greenline' | 'BelowRedline';

// Agreement Terms
export type AgreementTerm = '3-year' | '1-year' | 'MTM-with-install' | 'MTM-no-install';

// Quota Achievement Level
export type QuotaLevel = 'below' | 'above' | 'double';

// Business Type
export type BusinessType = 'new' | 'renewal';

// Service Frequency
export type ServiceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'one-time';

// ============================================================
// PRICING MULTIPLIERS (NEW IN V2)
// Greenline now multiplies revenue for quota credit
// ============================================================

export interface PricingTier {
  minRatio: number;        // Minimum price ratio (vs Redline)
  maxRatio: number;        // Maximum price ratio
  quotaMultiplier: number; // Multiplier for quota credit
  label: string;           // Display label
  requiresApproval: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  { minRatio: 0, maxRatio: 0.99, quotaMultiplier: 0.5, label: 'Below Redline', requiresApproval: true },
  { minRatio: 1.00, maxRatio: 1.09, quotaMultiplier: 1.0, label: 'Redline', requiresApproval: false },
  { minRatio: 1.10, maxRatio: 1.19, quotaMultiplier: 1.25, label: '110% Premium', requiresApproval: false },
  { minRatio: 1.20, maxRatio: 1.29, quotaMultiplier: 1.5, label: '120% Premium', requiresApproval: false },
  { minRatio: 1.30, maxRatio: Infinity, quotaMultiplier: 2.0, label: 'Greenline (130%+)', requiresApproval: false },
];

// ============================================================
// ACCOUNT TYPE REVENUE RULES (NEW IN V2)
// Revenue-based deductions, not percentage adjustments
// ============================================================

export interface AccountTypeRevenueRule {
  type: AccountType;
  revenueDeduction: number;    // First $X = no commission
  anchorBonusThreshold: number; // Revenue threshold for bonus (Anchor only)
  anchorBonusMultiplier: number; // Multiplier for revenue above threshold
  description: string;
}

export const ACCOUNT_TYPE_REVENUE_RULES: AccountTypeRevenueRule[] = [
  {
    type: 'Anchor',
    revenueDeduction: 0,
    anchorBonusThreshold: 200,
    anchorBonusMultiplier: 1.5,
    description: '$200+/visit. Revenue above $200 counts at 150%',
  },
  {
    type: 'Bread5',
    revenueDeduction: 50,
    anchorBonusThreshold: 0,
    anchorBonusMultiplier: 1.0,
    description: 'Within 5 min of Anchor. First $50 = no commission',
  },
  {
    type: 'Bread15',
    revenueDeduction: 75,
    anchorBonusThreshold: 0,
    anchorBonusMultiplier: 1.0,
    description: 'Within 15 min of Anchor. First $75 = no commission',
  },
  {
    type: 'Pit',
    revenueDeduction: 100,
    anchorBonusThreshold: 0,
    anchorBonusMultiplier: 1.0,
    description: 'Not near Anchor. First $100 = no commission',
  },
];

// ============================================================
// QUOTA THRESHOLDS BY EMPLOYEE TENURE (NEW IN V2)
// ============================================================

export interface QuotaThreshold {
  monthsEmployed: number;
  annualQuota: number;
  weeklyEquivalent: number;
  description: string;
}

export const QUOTA_THRESHOLDS: QuotaThreshold[] = [
  { monthsEmployed: 1, annualQuota: 0, weeklyEquivalent: 0, description: 'Month 1 - No quota' },
  { monthsEmployed: 2, annualQuota: 2500, weeklyEquivalent: 50, description: 'Month 2 - $2,500 annual' },
  { monthsEmployed: 3, annualQuota: 5000, weeklyEquivalent: 100, description: 'Month 3 - $5,000 annual' },
  { monthsEmployed: 4, annualQuota: 7500, weeklyEquivalent: 150, description: 'Month 4 - $7,500 annual' },
  { monthsEmployed: 5, annualQuota: 10000, weeklyEquivalent: 200, description: 'Month 5+ - $10,000 annual' },
];

// ============================================================
// AUTO-QUOTA RULES (NEW IN V2)
// Automatic quota achievement based on rooftop sales
// ============================================================

export interface AutoQuotaRule {
  minMonths: number;
  maxMonths: number;
  requiredSales: number;
  minimumPerSale: number;
  description: string;
}

export const AUTO_QUOTA_RULES: AutoQuotaRule[] = [
  {
    minMonths: 1,
    maxMonths: 3,
    requiredSales: 2,
    minimumPerSale: 1000,
    description: 'Months 1-3: 2 new rooftop sales = auto quota',
  },
  {
    minMonths: 4,
    maxMonths: Infinity,
    requiredSales: 3,
    minimumPerSale: 1000,
    description: 'Month 4+: 3 new rooftop sales = auto quota',
  },
];

// ============================================================
// FREQUENCY MULTIPLIERS
// Visits per year for each frequency
// ============================================================

export const FREQUENCY_VISITS_PER_YEAR: Record<ServiceFrequency, number> = {
  'weekly': 50,      // 50 weeks (accounting for holidays)
  'biweekly': 25,    // 25 bi-weekly visits
  'monthly': 12,
  'quarterly': 4,
  'one-time': 1,
};

// ============================================================
// BASE COMMISSION RULES
// ============================================================

export interface CommissionRulesV2 {
  _id?: string;
  version: string;
  isActive: boolean;

  // Base commission rates by quota level (percentages)
  quotaRates: {
    below: number;      // 3%
    above: number;      // 6%
    double: number;     // 9%
  };

  // Agreement term multipliers (percentages)
  agreementMultipliers: {
    '3-year': number;           // 135%
    '1-year': number;           // 100%
    'MTM-with-install': number; // 100%
    'MTM-no-install': number;   // 50%
  };

  // Inside sales deduction (percentage points)
  insideSalesDeduction: number; // -3%

  // Renewal bonus
  renewalBonusRate: number;     // 4%
  renewalMinYears: number;      // 2 years (or 1 year with new policy)

  // Anchor minimum (for auto-detection)
  anchorMinPerVisit: number;    // $200
  anchorMinGreenline: number;   // $100 if Greenline

  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_COMMISSION_RULES_V2: Omit<CommissionRulesV2, '_id' | 'createdAt' | 'updatedAt'> = {
  version: '2.0.0',
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
  insideSalesDeduction: -3,
  renewalBonusRate: 4,
  renewalMinYears: 2,
  anchorMinPerVisit: 200,
  anchorMinGreenline: 100,
};

// ============================================================
// COMMISSION CALCULATION INPUT (V2)
// ============================================================

export interface CommissionCalculationInputV2 {
  // Revenue Information
  perVisitRevenue: number;          // Actual price per visit
  redlinePrice: number;             // Redline (standard) price
  frequency: ServiceFrequency;      // Service frequency

  // Account Information
  accountType: AccountType;         // Auto-detected or manual
  isNearAnchor: boolean;            // From RouteSTAR
  drivingTimeMinutes?: number;      // From RouteSTAR
  nearestAnchorName?: string;       // For reference

  // Agreement Information
  agreementTerm: AgreementTerm;
  contractMonths: number;

  // Business Type
  businessType: BusinessType;
  yearsAsCustomer?: number;         // For renewal bonus
  totalRenewalValue?: number;       // Total value being renewed

  // Sales Information
  isInsideSales: boolean;
  salesPersonId?: string;
  salesPersonName?: string;

  // Employee Information (for quota calculation)
  employeeHireDate?: string;        // ISO date string
  employeeMonthsEmployed?: number;
  periodSalesTotal?: number;        // Total sales this period
  newRooftopCount?: number;         // Number of new locations sold

  // Customer Information
  customerName?: string;
  customerAddress?: string;

  // Notes
  notes?: string;
}

// ============================================================
// COMMISSION CALCULATION BREAKDOWN (V2)
// ============================================================

export interface CommissionBreakdownV2 {
  // Pricing Tier Analysis
  priceRatio: number;               // actualPrice / redlinePrice
  pricingTier: string;              // 'Redline', 'Greenline', etc.
  pricingMultiplier: number;        // 1.0, 1.25, 1.5, or 2.0
  requiresApproval: boolean;

  // Revenue Adjustments
  originalRevenue: number;          // Per-visit revenue
  revenueDeduction: number;         // Amount deducted (Pit/Bread)
  anchorBonus: number;              // Extra credit for Anchor above $200
  commissionableRevenue: number;    // After deductions and bonuses

  // Quota Credit Calculation
  revenueWithPricingMultiplier: number; // commissionableRevenue * pricingMultiplier
  visitsPerYear: number;
  annualQuotaCredit: number;        // What counts toward quota

  // Quota Determination
  employeeQuotaThreshold: number;   // Based on tenure
  totalPeriodSales: number;         // Including this sale
  autoQuotaQualified: boolean;      // Met auto-quota rules?
  quotaLevel: QuotaLevel;           // below, above, double

  // Commission Rate Calculation
  baseRate: number;                 // 3%, 6%, or 9%
  insideSalesDeduction: number;     // -3% if applicable
  effectiveRate: number;            // baseRate + deductions
  agreementMultiplier: number;      // 135%, 100%, or 50%
  finalCommissionRate: number;      // effectiveRate * multiplier

  // Renewal Bonus
  renewalBonusRate: number;         // 4% if applicable
  renewalBonusAmount: number;       // Dollar amount
}

// ============================================================
// COMMISSION CALCULATION RESULT (V2)
// ============================================================

export interface CommissionCalculationResultV2 {
  input: CommissionCalculationInputV2;
  breakdown: CommissionBreakdownV2;

  // Final Amounts
  perVisitCommission: number;       // Commission per visit
  weeklyCommission: number;         // Weekly estimate
  annualCommission: number;         // Annual commission
  contractCommission: number;       // Total contract commission (12 months)
  renewalBonus: number;             // One-time renewal bonus
  totalCommission: number;          // contractCommission + renewalBonus

  // Back Commission (if Pit converted)
  backCommissionEligible: boolean;
  backCommissionAmount: number;

  // Metadata
  calculatedAt: string;
  rulesVersion: string;
}

// ============================================================
// PIT CONVERSION TRACKING (NEW IN V2)
// ============================================================

export interface PitConversion {
  pitAgreementId: string;
  pitCustomerName: string;
  pitPerVisitRevenue: number;
  pitSaleDate: string;
  pitSalesPersonId: string;

  conversionAgreementId: string;
  conversionDate: string;
  newAccountType: AccountType;
  newPerVisitRevenue: number;

  backCommissionAmount: number;
  backCommissionPaid: boolean;
  backCommissionPaidDate?: string;
}

// ============================================================
// ROUTESTAR INTEGRATION TYPES
// ============================================================

export interface RouteSTARCustomer {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

export interface RouteSTARAnchor {
  customerId: string;
  customerName: string;
  address: string;
  perVisitRevenue: number;
  isActive: boolean;
}

export interface DrivingTimeResult {
  fromCustomer: RouteSTARCustomer;
  toCustomer: RouteSTARCustomer;
  drivingTimeMinutes: number;
  distanceMiles: number;
  calculatedAt: string;
}

export interface AccountTypeDetectionResult {
  detectedAccountType: AccountType;
  nearestAnchor: RouteSTARAnchor | null;
  drivingTimeMinutes: number;
  distanceMiles: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================
// FORM OPTIONS
// ============================================================

export const ACCOUNT_TYPE_OPTIONS_V2: { value: AccountType; label: string; description: string }[] = [
  { value: 'Anchor', label: 'Anchor', description: '$200+/visit. Revenue above $200 at 150% credit' },
  { value: 'Bread5', label: 'Bread5', description: 'Within 5 min of Anchor. First $50 deducted' },
  { value: 'Bread15', label: 'Bread15', description: 'Within 15 min of Anchor. First $75 deducted' },
  { value: 'Pit', label: 'Pit', description: 'Not near Anchor. First $100 = no commission' },
];

export const AGREEMENT_TERM_OPTIONS_V2: { value: AgreementTerm; label: string; multiplier: number }[] = [
  { value: '3-year', label: '3-Year Agreement', multiplier: 135 },
  { value: '1-year', label: '1-Year Agreement', multiplier: 100 },
  { value: 'MTM-with-install', label: 'MTM with Install (3x)', multiplier: 100 },
  { value: 'MTM-no-install', label: 'MTM No Install', multiplier: 50 },
];

export const PRICING_LINE_OPTIONS_V2: { value: PricingLine; label: string; multiplier: number; description: string }[] = [
  { value: 'BelowRedline', label: 'Below Redline', multiplier: 0.5, description: 'Below standard - requires approval' },
  { value: 'Redline', label: 'Redline', multiplier: 1.0, description: 'Standard pricing' },
  { value: 'Greenline', label: 'Greenline (130%+)', multiplier: 2.0, description: 'Premium pricing - 2x quota credit' },
];

export const QUOTA_LEVEL_OPTIONS_V2: { value: QuotaLevel; label: string; rate: number }[] = [
  { value: 'below', label: 'Below Quota', rate: 3 },
  { value: 'above', label: 'Above Quota', rate: 6 },
  { value: 'double', label: 'Double Quota', rate: 9 },
];

export const FREQUENCY_OPTIONS: { value: ServiceFrequency; label: string; visitsPerYear: number }[] = [
  { value: 'weekly', label: 'Weekly', visitsPerYear: 50 },
  { value: 'biweekly', label: 'Bi-Weekly', visitsPerYear: 25 },
  { value: 'monthly', label: 'Monthly', visitsPerYear: 12 },
  { value: 'quarterly', label: 'Quarterly', visitsPerYear: 4 },
  { value: 'one-time', label: 'One-Time', visitsPerYear: 1 },
];

export const BUSINESS_TYPE_OPTIONS_V2: { value: BusinessType; label: string }[] = [
  { value: 'new', label: 'New Business' },
  { value: 'renewal', label: 'Renewal' },
];

// ============================================================
// LEGACY SUPPORT - Keep old types for backward compatibility
// ============================================================

// Re-export old types with deprecation notice
/** @deprecated Use CommissionRulesV2 instead */
export type CommissionRules = CommissionRulesV2;

/** @deprecated Use DEFAULT_COMMISSION_RULES_V2 instead */
export const DEFAULT_COMMISSION_RULES = DEFAULT_COMMISSION_RULES_V2;

/** @deprecated Use CommissionCalculationInputV2 instead */
export type CommissionCalculationInput = CommissionCalculationInputV2;

/** @deprecated Use CommissionBreakdownV2 instead */
export type CommissionBreakdown = CommissionBreakdownV2;

/** @deprecated Use CommissionCalculationResultV2 instead */
export type CommissionCalculationResult = CommissionCalculationResultV2;

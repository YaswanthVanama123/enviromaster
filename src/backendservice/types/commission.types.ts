// Commission Calculator Types
// Based on Solange Commission Draft

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

// Commission Rules Configuration (stored in backend)
export interface CommissionRules {
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

  // Account type adjustments - percentage reduction for Bread locations
  accountTypeAdjustments: {
    Anchor: number;    // 0% (no adjustment)
    Bread5: number;    // e.g., -1% (easier sell)
    Bread15: number;   // e.g., -0.5%
    Pit: number;       // 0% (new location, no adjustment)
  };

  // Greenline bonus percentage for premium pricing (130%+)
  greenlineBonus: number;

  // Renewal bonus rate (percentage)
  renewalBonusRate: number;    // 4%

  // Minimum years for renewal bonus
  renewalMinYears: number;     // 2 years

  // Inside sales deduction (negative percentage)
  insideSalesDeduction: number; // -3%

  // Anchor minimum monthly value threshold
  anchorMinMonthlyValue: number; // $200

  createdAt?: string;
  updatedAt?: string;
}

// Default commission rules
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

// Commission Calculation Input
export interface CommissionCalculationInput {
  monthlyValue: number;
  agreementTerm: AgreementTerm;
  accountType: AccountType;
  pricingLine: PricingLine;
  quotaLevel: QuotaLevel;
  businessType: BusinessType;
  yearsAsCustomer?: number;      // For renewal bonus calculation
  isInsideSales: boolean;
  salesPersonId?: string;
  salesPersonName?: string;
  customerName?: string;
  notes?: string;
}

// Commission Calculation Breakdown
export interface CommissionBreakdown {
  baseRate: number;                    // From quota level (3%, 6%, or 9%)
  agreementMultiplier: number;         // Term multiplier (50%, 100%, or 135%)
  accountTypeAdjustment: number;       // Bread reduction
  greenlineBonus: number;              // If applicable
  renewalBonus: number;                // If renewal 2+ years
  insideSalesDeduction: number;        // If inside sales (-3%)
}

// Commission Calculation Result
export interface CommissionCalculationResult {
  input: CommissionCalculationInput;
  breakdown: CommissionBreakdown;
  effectiveBaseRate: number;           // Sum of adjustments before multiplier
  finalCommissionRate: number;         // Total percentage after multiplier
  monthlyCommission: number;           // Dollar amount per month
  annualCommission: number;            // Dollar amount per year
  firstYearCommission: number;         // Dollar amount for first year
  calculatedAt: string;
}

// Commission History Record (for saved calculations)
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
  { value: 'Anchor', label: 'Anchor', description: '$200+/visit, high-revenue location' },
  { value: 'Bread5', label: 'Bread5', description: 'Within 5 minutes of Anchor' },
  { value: 'Bread15', label: 'Bread15', description: 'Within 15 minutes of Anchor' },
  { value: 'Pit', label: 'Pit', description: 'New location, not near Anchor' },
];

export const AGREEMENT_TERM_OPTIONS: { value: AgreementTerm; label: string; multiplier: number }[] = [
  { value: '3-year', label: '3-Year Agreement', multiplier: 135 },
  { value: '1-year', label: '1-Year Agreement', multiplier: 100 },
  { value: 'MTM-with-install', label: 'MTM with Install', multiplier: 100 },
  { value: 'MTM-no-install', label: 'MTM No Install', multiplier: 50 },
];

export const PRICING_LINE_OPTIONS: { value: PricingLine; label: string; description: string }[] = [
  { value: 'Redline', label: 'Redline', description: 'Standard pricing' },
  { value: 'Greenline', label: 'Greenline', description: '130%+ premium pricing' },
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

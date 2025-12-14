// src/features/services/sanipod/sanipodTypes.ts

// ------------ Basic keys ------------

export type SanipodFrequencyKey = "oneTime" | "weekly" | "biweekly" | "twicePerMonth" | "monthly" | "bimonthly" | "quarterly" | "biannual" | "annual";
export type SanipodRateCategory = "redRate" | "greenRate";

/**
 * Which of the two standalone pricing rules is currently cheaper.
 *
 * - "perPod8"        → $8 / week / each SaniPod
 * - "perPod3Plus40"  → $3 / week / each SaniPod + $40 / week
 */
export type SanipodServiceRuleKey = "perPod8" | "perPod3Plus40";

// ------------ Rate category config ------------

export interface SanipodRateCategoryConfig {
  /** Multiplier applied to the red-rate service revenue (not trip / install). */
  multiplier: number;
  commissionRate: string;
}

// ------------ Frequency helpers ------------

export interface SanipodAnnualFrequencyConfig {
  oneTime: number;
  weekly: number;
  biweekly: number;
  twicePerMonth: number;
  monthly: number;
  bimonthly: number;
  quarterly: number;
  biannual: number;
  annual: number;
}

// ------------ Pricing config (FINAL RULES) ------------

/**
 * Final SaniPod standalone pricing schema – matches the written rules.
 *
 * Weekly standalone service:
 *   Option A:  $8  / week / each SaniPod
 *   Option B:  $3  / week / each SaniPod + $40 / week (account-level base)
 *   The cheaper option is what we actually charge.
 *
 * Extra bags:
 *   - Priced at 2 $ / bag.
 *   - If "recurring" is checked, they behave as 2 $ / bag / week.
 *   - If not recurring, they are treated as a one-time amount on the first visit.
 *
 * Install is $25 / pod one-time.
 *
 * For rollups:
 *   - Monthly uses 4.33 weeks (≈ 52 / 12).
 *   - No annual price. Instead a contract length (2–36 months) is used.
 */
export interface SanipodPricingConfig {
  /** The "3$/each/week" part used in the 3+40 rule. */
  weeklyRatePerUnit: number;

  /** The "8$/each/week" option. */
  altWeeklyRatePerUnit: number;

  /** Extra bags price (base unit). */
  extraBagPrice: number;

  /** Install charge per pod (one-time). */
  installChargePerUnit: number;

  /** The "+ 40$/week" part in the 3+40 rule (account-level weekly base). */
  standaloneExtraWeeklyCharge: number;

  /**
   * Trip charge per visit.
   * NOTE: This is kept only so the field can still appear in the UI.
   * It is locked to 0 and NOT used in any pricing calculations.
   */
  tripChargePerVisit: number;

  /** Default frequency used for the per-visit view. */
  defaultFrequency: SanipodFrequencyKey;

  /** Allowed frequency choices in the dropdown. */
  allowedFrequencies: SanipodFrequencyKey[];

  /** Visits per year when viewing as weekly / biweekly / monthly. */
  annualFrequencies: SanipodAnnualFrequencyConfig;

  /** Frequency-specific visits per month multipliers */
  frequencyMultipliers: {
    oneTime: number;
    weekly: number;
    biweekly: number;
    twicePerMonth: number;
    monthly: number;
    bimonthly: number;
    quarterly: number;
    biannual: number;
    annual: number;
  };

  /** Weeks used for monthly & annual rollups. */
  weeksPerMonth: number; // now 4.33
  weeksPerYear: number;  // typically 52

  /** Contract length bounds in months (used by dropdown). */
  minContractMonths: number;
  maxContractMonths: number;

  /** Red / green tiers. */
  rateCategories: {
    redRate: SanipodRateCategoryConfig;
    greenRate: SanipodRateCategoryConfig;
  };
}

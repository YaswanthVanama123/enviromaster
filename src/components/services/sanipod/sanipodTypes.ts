// src/features/services/sanipod/sanipodTypes.ts

// ------------ Basic keys ------------

export type SanipodFrequencyKey = "weekly" | "biweekly" | "monthly";
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
  weekly: number;
  biweekly: number;
  monthly: number;
}

// ------------ Pricing config (FINAL RULES) ------------

/**
 * Final SaniPod standalone pricing schema – matches the written rules exactly.
 *
 * Weekly standalone service:
 *   Option A:  $8  / week / each SaniPod
 *   Option B:  $3  / week / each SaniPod + $40 / week (account-level base)
 *   The cheaper option is what we actually charge.
 *
 * Extra bags are $2 / bag / week and apply on top of either option.
 * There is a trip charge every visit.
 * Install is $25 / pod one-time.
 *
 * For rollups:
 *   - Annual = 52 weeks
 *   - Monthly = 4 weeks
 */
export interface SanipodPricingConfig {
  /** The "3$/each/week" part used in the 3+40 rule. */
  weeklyRatePerUnit: number;

  /** The "8$/each/week" option. */
  altWeeklyRatePerUnit: number;

  /** Extra bags price per week. */
  extraBagPrice: number;

  /** Install charge per pod (one-time). */
  installChargePerUnit: number;

  /** The "+ 40$/week" part in the 3+40 rule (account-level weekly base). */
  standaloneExtraWeeklyCharge: number;

  /** Trip charge per visit. */
  tripChargePerVisit: number;

  /** Default frequency used for the per-visit view. */
  defaultFrequency: SanipodFrequencyKey;

  /** Allowed frequency choices in the dropdown. */
  allowedFrequencies: SanipodFrequencyKey[];

  /** Visits per year when viewing as weekly / biweekly / monthly. */
  annualFrequencies: SanipodAnnualFrequencyConfig;

  /** Weeks used for monthly & annual rollups. */
  weeksPerMonth: number; // e.g. 4
  weeksPerYear: number;  // e.g. 52

  /** Red / green tiers. */
  rateCategories: {
    redRate: SanipodRateCategoryConfig;
    greenRate: SanipodRateCategoryConfig;
  };
}

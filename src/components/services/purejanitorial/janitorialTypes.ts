// src/features/services/janitorial/janitorialTypes.ts

export type JanitorialFrequencyKey = "weekly" | "biweekly" | "monthly";
export type JanitorialRateCategory = "redRate" | "greenRate";

export interface JanitorialRateCategoryConfig {
  multiplier: number;
  commissionRate: string;
}

export interface JanitorialPricingConfig {
  /** Base hourly rate for pure janitorial addons when on normal route. */
  baseHourlyRate: number;

  /** Higher hourly rate used for very short / special jobs (not used in calc yet). */
  shortJobHourlyRate: number;

  /** Minimum billable hours per visit when using baseHourlyRate. */
  minHoursPerVisit: number;

  /** Weeks used for monthly rollups (typically 4.33). */
  weeksPerMonth: number;

  /** Contract months bounds for dropdown. */
  minContractMonths: number;
  maxContractMonths: number;

  /** Multiplier applied to first visit when doing a dirty initial clean (3x). */
  dirtyInitialMultiplier: number;

  /** Default frequency to display in UI. */
  defaultFrequency: JanitorialFrequencyKey;

  rateCategories: {
    redRate: JanitorialRateCategoryConfig;
    greenRate: JanitorialRateCategoryConfig;
  };
}

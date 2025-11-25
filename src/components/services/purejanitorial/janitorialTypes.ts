// src/features/services/janitorial/janitorialTypes.ts

export type JanitorialFrequencyKey =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly";

export type JanitorialRateCategory = "redRate" | "greenRate";
export type SchedulingMode = "normalRoute" | "standalone";

export interface JanitorialRateCategoryConfig {
  multiplier: number;
  commissionRate: string;
}

export interface JanitorialPricingConfig {
  /** Base hourly rate for normal route work. */
  baseHourlyRate: number;

  /** Higher hourly rate for standalone/short jobs. */
  shortJobHourlyRate: number;

  /**
   * Target minimum hours per visit/day on the route.
   * Normal route charge = max(totalHours, minHoursPerVisit) * baseHourlyRate.
   */
  minHoursPerVisit: number;

  /** Weeks used for monthly rollups (typically 4.33). */
  weeksPerMonth: number;

  /** Contract months bounds for dropdown. */
  minContractMonths: number;
  maxContractMonths: number;

  /** Multiplier applied to first visit when doing a dirty initial clean (3×). */
  dirtyInitialMultiplier: number;

  /**
   * Multiplier for infrequent service (quarterly/4× per year) dusting hours
   * on recurring visits.
   */
  infrequentMultiplier: number;

  /** Default frequency to display in UI. */
  defaultFrequency: JanitorialFrequencyKey;

  /** Dusting: places per hour. */
  dustingPlacesPerHour: number;

  /** Dusting: price per place. */
  dustingPricePerPlace: number;

  /** Vacuuming: default hours. */
  vacuumingDefaultHours: number;

  rateCategories: {
    redRate: JanitorialRateCategoryConfig;
    greenRate: JanitorialRateCategoryConfig;
  };
}

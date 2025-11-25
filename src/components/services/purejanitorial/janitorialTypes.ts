// src/features/services/janitorial/janitorialTypes.ts

export type JanitorialFrequencyKey = "weekly" | "biweekly" | "monthly" | "quarterly";
export type JanitorialRateCategory = "redRate" | "greenRate";
export type SchedulingMode = "normalRoute" | "standalone";

export interface JanitorialRateCategoryConfig {
  multiplier: number;
  commissionRate: string;
}

/**
 * Tiered pricing structure for smooth scheduling (normal route).
 */
export interface TieredPricing {
  upToHours: number;
  price: number;
  addonOnly?: boolean; // if true, can only be used as addon to larger service
  standalonePrice?: number; // price when used as standalone (for 15-30 min tier)
}

export interface JanitorialPricingConfig {
  /** Base hourly rate for 4+ hours on normal route. */
  baseHourlyRate: number;

  /** Higher hourly rate for standalone/short jobs. */
  shortJobHourlyRate: number;

  /** Minimum billable hours per visit when using baseHourlyRate (4 hrs). */
  minHoursPerVisit: number;

  /** Tiered pricing for smooth scheduling (normal route). */
  tieredPricing: TieredPricing[];

  /** Weeks used for monthly rollups (typically 4.33). */
  weeksPerMonth: number;

  /** Contract months bounds for dropdown. */
  minContractMonths: number;
  maxContractMonths: number;

  /** Multiplier applied to first visit when doing a dirty initial clean (3x). */
  dirtyInitialMultiplier: number;

  /** Multiplier for infrequent service (quarterly/4x per year). */
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

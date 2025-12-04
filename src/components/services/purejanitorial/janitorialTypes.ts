// src/features/services/janitorial/janitorialTypes.ts

export type JanitorialFrequencyKey =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly";

export type JanitorialRateCategory = "redRate" | "greenRate";
export type SchedulingMode = "normalRoute" | "standalone";
export type ServiceType = "recurring" | "oneTime";

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

export interface JanitorialFormState {
  manualHours: number;
  schedulingMode: SchedulingMode;
  serviceType: ServiceType; // recurring or one-time
  vacuumingHours: number;
  dustingPlaces: number;
  dirtyInitial: boolean; // kept for UI text only now
  frequency: JanitorialFrequencyKey;
  rateCategory: JanitorialRateCategory;
  contractMonths: number;
  addonTimeMinutes: number; // Add-on time in minutes for one-time service
  installation: boolean; // Installation checkbox for recurring service

  // ========== EDITABLE PRICING RATES (fetched from backend or config) ==========
  baseHourlyRate: number;               // $30/hr for normal route
  shortJobHourlyRate: number;           // $50/hr for standalone
  minHoursPerVisit: number;             // 4 hours minimum per visit
  weeksPerMonth: number;                // 4.33 weeks per month
  dirtyInitialMultiplier: number;       // 3× for dirty initial clean
  infrequentMultiplier: number;         // 3× for quarterly dusting
  dustingPlacesPerHour: number;         // places per hour
  dustingPricePerPlace: number;         // price per place
  vacuumingDefaultHours: number;        // default vacuuming hours
  redRateMultiplier: number;            // red rate multiplier
  greenRateMultiplier: number;          // green rate multiplier

  // ========== CUSTOM OVERRIDES (user can manually set totals) ==========
  customPerVisit?: number;
  customFirstVisit?: number;
  customMonthly?: number;
  customOngoingMonthly?: number;
  customContractTotal?: number;
}

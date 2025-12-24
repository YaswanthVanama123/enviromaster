// src/features/services/janitorial/janitorialTypes.ts

export type JanitorialFrequencyKey =
  | "oneTime"
  | "weekly"
  | "biweekly"
  | "twicePerMonth"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "biannual"
  | "annual";

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

  /** Dusting: places per hour (from admin panel, overrideable by salesman). */
  dustingPlacesPerHour: number;

  /** DEPRECATED: Dusting price per place - now calculated from hours × hourly rate. */
  dustingPricePerPlace: number;

  /** Vacuuming: default hours. */
  vacuumingDefaultHours: number;

  // Billing conversions for all 9 frequency types
  billingConversions: {
    [key in JanitorialFrequencyKey]: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
  };

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
  // ✅ NEW: Changed dusting from price-per-place to places-and-hours model
  dustingTotalPlaces: number;        // Total places needed (user input, e.g., 90 places)
  dustingCalculatedHours: number;    // Calculated hours (totalPlaces ÷ placesPerHour)
  dirtyInitial: boolean; // kept for UI text only now
  frequency: JanitorialFrequencyKey;
  visitsPerWeek: number; // NEW: 1-7 visits per week
  rateCategory: JanitorialRateCategory;
  contractMonths: number;
  addonTimeMinutes: number; // Add-on time in minutes for one-time service
  installation: boolean; // Installation checkbox for recurring service

  // ✅ NOTES field for form compatibility
  notes?: string; // Optional notes field

  // ========== EDITABLE PRICING RATES (fetched from backend or config) ==========
  baseHourlyRate: number;               // $30/hr for normal route
  shortJobHourlyRate: number;           // $50/hr for standalone
  minHoursPerVisit: number;             // 4 hours minimum per visit
  weeksPerMonth: number;                // 4.33 weeks per month
  dirtyInitialMultiplier: number;       // 3× for dirty initial clean
  infrequentMultiplier: number;         // 3× for quarterly dusting
  dustingPlacesPerHour: number;         // places per hour (from admin panel, editable by salesman)
  dustingPricePerPlace: number;         // DEPRECATED: kept for backward compatibility
  vacuumingDefaultHours: number;        // default vacuuming hours
  redRateMultiplier: number;            // red rate multiplier
  greenRateMultiplier: number;          // green rate multiplier

  // ========== CUSTOM PRICING OVERRIDES (for yellow highlighting) ==========
  customBaseHourlyRate?: number;        // Custom override for base hourly rate
  customShortJobHourlyRate?: number;    // Custom override for short job hourly rate
  customMinHoursPerVisit?: number;      // Custom override for minimum hours per visit

  // ========== CUSTOM OVERRIDES (user can manually set totals) ==========
  customPerVisit?: number;
  customFirstVisit?: number;
  customMonthly?: number;
  customOngoingMonthly?: number;
  customContractTotal?: number;
}

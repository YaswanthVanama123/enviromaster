// src/features/services/sanipod/sanipodTypes.ts

// --- Basic enums / keys ---

export type SanipodFrequencyKey = "weekly" | "biweekly" | "monthly";
export type SanipodServiceMode = "standalone" | "withSaniClean" | "allInclusive";
export type SanipodLocationKey = "insideBeltway" | "outsideBeltway";
export type SanipodRateCategory = "redRate" | "greenRate";
export type SanipodInstallType = "clean" | "dirty";

// --- Rate category config ---

export interface SanipodRateCategoryConfig {
  /** Multiplier applied to the red rate service revenue (not trip / install). */
  multiplier: number;
  /** For sales / commission reporting only – not used in math here. */
  commissionRate: string;
}

// --- Standalone pricing options ---
// Implements: "$8 SaniPod / wk OR $3/wk/ea + $40 minimum – whichever is cheaper"
export interface SanipodStandaloneOptions {
  /** Per-unit red rate, e.g. $3/wk/ea. */
  perUnitRate: number;
  /** Flat red rate per account, e.g. $8/wk total. */
  flatRate: number;
  /** Minimum monthly total (service + trip) for the per-unit option, e.g. $40. */
  minimum: number;
  /** Human-readable rule description ("whichever is cheaper"). */
  rule: string;
}

// --- Bundle options when Sanipod is not sold as a standalone service ---

export interface SanipodBundleWithSaniClean {
  /** Monthly red rate per SaniPod when bundled with SaniClean, e.g. $4/month. */
  monthlyRatePerPod: number;
}

export interface SanipodBundleAllInclusive {
  /** Monthly red rate per fixture when included in all-inclusive restroom program, e.g. $20/month. */
  monthlyRatePerFixture: number;
}

export interface SanipodBundleOptions {
  withSaniClean: SanipodBundleWithSaniClean;
  allInclusive: SanipodBundleAllInclusive;
}

// --- Trip charges for standalone mode only ---

export interface SanipodTripChargeConfig {
  insideBeltway: number;
  outsideBeltway: number;
  parkingSurcharge: number;
}

// --- Installation options ---

export interface SanipodInstallationOptions {
  /** Multiplier for clean / normal installs (usually 1×). */
  cleanMultiplier: number;
  /** Multiplier for dirty / hard installs (usually 3×). */
  dirtyMultiplier: number;
}

// --- Annual visit counts (used to compute per-visit) ---

export interface SanipodAnnualFrequencyConfig {
  weekly: number;
  biweekly: number;
  monthly: number;
}

// --- Business & contract meta (not all used in math now, but kept for completeness) ---

export interface SanipodBusinessRules {
  /** Standalone SaniPod always carries a trip charge. */
  alwaysIncludeTripChargeStandalone: boolean;
  /** If pricing below red rate requires authorization. */
  authorizationRequiredBelowRed: boolean;
  /** People who can authorize below-red pricing. */
  authorizers: string[];
  /** For future discount logic – e.g. 3 female toilets mentioned. */
  minimumQuantityForDiscount: number;
}

export interface SanipodContractOptions {
  canIncludeInContract: boolean;
  compensateWithOtherServices: boolean;
}

// --- Top-level pricing config used by sanipodConfig.ts ---

export interface SanipodPricingConfig {
  // Core SaniPod rates
  weeklyRatePerUnit: number;        // $3/wk/ea red rate
  installChargePerUnit: number;     // $25 install per pod
  extraBagPrice: number;            // $2 per extra bag

  defaultFrequency: SanipodFrequencyKey;
  allowedFrequencies: SanipodFrequencyKey[];

  // How many visits per year at each frequency (used for per-visit math)
  annualFrequencies: SanipodAnnualFrequencyConfig;

  // Standalone rules: $8/wk vs $3/wk/ea + $40/month minimum
  standaloneOptions: SanipodStandaloneOptions;

  // Bundle pricing when SaniPod is added to other services
  bundleOptions: SanipodBundleOptions;

  // Trip charges for standalone mode
  tripCharge: SanipodTripChargeConfig;

  // Red / green rate categories
  rateCategories: {
    redRate: SanipodRateCategoryConfig;
    greenRate: SanipodRateCategoryConfig;
  };

  // Install multipliers
  installationOptions: SanipodInstallationOptions;

  // Meta rules & contract notes
  businessRules: SanipodBusinessRules;
  contractOptions: SanipodContractOptions;
}

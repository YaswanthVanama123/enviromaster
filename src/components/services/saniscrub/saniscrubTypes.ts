import type { BaseServiceFormState } from "../common/serviceTypes";

export type SaniscrubFrequency =
  | "oneTime"
  | "weekly"
  | "biweekly"
  | "twicePerMonth"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "biannual"
  | "annual";

export interface SaniscrubFrequencyMeta {
  // visits per YEAR (e.g. 52 for weekly → 4.33 visits/month)
  visitsPerYear: number;
  // visits per MONTH (e.g., 4.33 for weekly, 1 for monthly, 0.333 for quarterly)
  monthlyMultiplier: number;
}

/**
 * Static pricing config for SaniScrub.
 * All amounts here are MONTHLY amounts, except the non-bathroom "per visit"
 * block pricing (250 + 125/extra 500 sq ft).
 */
export interface SaniscrubPricingConfig {
  // Per-fixture headline MONTHLY rates for each frequency
  fixtureRates: Record<SaniscrubFrequency, number>;

  // Frequency-specific MONTHLY minimums
  minimums: Record<SaniscrubFrequency, number>;

  // Non-bathroom area rules (per VISIT)
  nonBathroomUnitSqFt: number; // 500 sq ft
  nonBathroomFirstUnitRate: number; // 250 for first 500
  nonBathroomAdditionalUnitRate: number; // 125 for each extra 500

  // Install multipliers (one-time job) applied to MONTHLY base (no trip)
  installMultipliers: {
    clean: number; // 1× job
    dirty: number; // 3× job
  };

  // Trip charge base/parking (kept only for UI – calculations ignore these now)
  tripChargeBase: number;
  parkingFee: number;

  // Billing conversions for all 9 frequency types
  billingConversions: {
    [key in SaniscrubFrequency]: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
  };

  // Contract term limits
  minContractMonths: number;
  maxContractMonths: number;

  // Visits per year per frequency
  frequencyMeta: Record<SaniscrubFrequency, SaniscrubFrequencyMeta>;

  // 2× / month discount: flat $ amount off the 2× monthly SaniScrub charge
  // when combined with SaniClean.
  twoTimesPerMonthDiscountFlat: number;
}

/**
 * Live form state for one SaniScrub card.
 */
export interface SaniscrubFormState extends BaseServiceFormState {
  serviceId: "saniscrub";

  // Bathroom fixtures getting SaniScrub
  fixtureCount: number;

  // Non-bathroom SaniScrub area in sq ft (kitchen, FOH, etc.)
  nonBathroomSqFt: number;

  // ✅ NEW: Non-bathroom calculation method toggle
  useExactNonBathroomSqft: boolean; // true = exact calculation, false = direct add

  // Selected service frequency
  frequency: SaniscrubFrequency;

  // Whether SaniClean is also being sold (required for 2×/month discount)
  hasSaniClean: boolean;

  // Geography / trip logic (UI only now)
  location: "insideBeltway" | "outsideBeltway";
  needsParking: boolean;

  // Install quote options
  includeInstall: boolean;
  isDirtyInstall: boolean;

  // Contract length in months (2–36) – drives total contract price
  contractMonths: number;

  // ✅ NEW: Editable pricing rates (fetched from backend or config)
  fixtureRateMonthly: number;        // $25/fixture/month
  fixtureRateBimonthly: number;      // $35/fixture/month
  fixtureRateQuarterly: number;      // $40/fixture/month
  minimumMonthly: number;            // $175 minimum
  minimumBimonthly: number;          // $250 minimum
  nonBathroomFirstUnitRate: number;  // $250 for first 500 sq ft
  nonBathroomAdditionalUnitRate: number; // $125 per additional 500 sq ft
  installMultiplierDirty: number;    // 3× multiplier for dirty install
  installMultiplierClean: number;    // 1× multiplier for clean install
  twoTimesPerMonthDiscount: number;  // $15 discount for 2×/month with SaniClean

  // Custom installation override (user can manually set installation cost)
  customInstallationFee?: number;

  // ========== CUSTOM OVERRIDES (user can manually set totals) ==========
  customPerVisitPrice?: number;
  customMonthlyRecurring?: number;
  customFirstMonthPrice?: number;
  customContractTotal?: number;
  customPerVisitMinimum?: number;
  perVisitMinimum?: number;
}

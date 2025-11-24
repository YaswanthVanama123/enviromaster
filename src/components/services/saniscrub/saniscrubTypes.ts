import type { BaseServiceFormState } from "../common/serviceTypes";

export type SaniscrubFrequency =
  | "monthly"
  | "twicePerMonth"
  | "bimonthly"
  | "quarterly";

export interface SaniscrubFrequencyMeta {
  // visits per YEAR (e.g. 52 for weekly → 4.33 visits/month)
  visitsPerYear: number;
}

/**
 * Static pricing config for SaniScrub.
 * All amounts here are MONTHLY amounts, except the non-bathroom “per visit”
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
}

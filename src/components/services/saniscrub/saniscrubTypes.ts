// src/features/services/saniscrub/saniscrubTypes.ts
import type { BaseServiceFormState } from "../common/serviceTypes";

export type SaniscrubFrequency =
  | "monthly"
  | "twicePerMonth"
  | "bimonthly"
  | "quarterly";

export interface SaniscrubFrequencyMeta {
  visitsPerYear: number;
}

/**
 * Static pricing config for SaniScrub.
 * This is the light-weight frontend view of the big backend schema / JSON.
 */
export interface SaniscrubPricingConfig {
  // Per-fixture headline rates for each frequency
  fixtureRates: Record<SaniscrubFrequency, number>;

  // Frequency-specific minimums (per month)
  minimums: Record<SaniscrubFrequency, number>;

  // Non-bathroom area rules (kitchens, FOH, etc.)
  nonBathroomUnitSqFt: number;           // size of one unit, e.g. 500 sq ft
  nonBathroomFirstUnitRate: number;      // charge for first unit
  nonBathroomAdditionalUnitRate: number; // charge for each additional unit

  // Install multipliers (one-time job)
  installMultipliers: {
    clean: number; // 1× job
    dirty: number; // 3× job
  };

  // Base trip charge + optional parking
  tripChargeBase: number; // $8
  parkingFee: number;     // +$7 when needed inside beltway

  // Visit counts per year for each frequency
  frequencyMeta: Record<SaniscrubFrequency, SaniscrubFrequencyMeta>;

  // 2× / month discount configuration:
  // flat $ amount off the *monthly invoice* when combined with SaniClean
  twoTimesPerMonthDiscountFlat: number;
}

/**
 * Live form state for a single SaniScrub card.
 * Only includes the *real* inputs we need to drive the rules.
 */
export interface SaniscrubFormState extends BaseServiceFormState {
  serviceId: "saniscrub";

  // Bathroom fixtures that get SaniScrub
  fixtureCount: number;

  // Non-bathroom SaniScrub area in sq ft (kitchen, FOH, etc.)
  nonBathroomSqFt: number;

  // Selected service frequency
  frequency: SaniscrubFrequency;

  // Whether SaniClean is also being sold at the site.
  // Required for the special 2× / month discount rule.
  hasSaniClean: boolean;

  // Geography / trip logic
  location: "insideBeltway" | "outsideBeltway";
  needsParking: boolean;

  // Install quote options
  includeInstall: boolean;
  isDirtyInstall: boolean;
}

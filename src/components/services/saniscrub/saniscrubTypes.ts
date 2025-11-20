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

export interface SaniscrubPricingConfig {
  // Fixture pricing
  fixtureRates: {
    monthly: number;       // $25/fixture
    twicePerMonth: number; // baseline $25 before discount
    bimonthly: number;     // $35/fixture
    quarterly: number;     // $40/fixture
  };

  minimums: {
    monthly: number;       // $175
    twicePerMonth: number; // treat same as monthly for baseline
    bimonthly: number;     // $250
    quarterly: number;     // $250
  };

  // Discount for 2x per month when combined with SaniClean
  twicePerMonthDiscountPerFixture: number; // $15/fixture

  // Non-bathroom floor scrub rule
  nonBathroom: {
    unitSqFt: number;          // 500 sq ft per unit
    firstUnitPrice: number;    // $250 for first 500 sq ft
    additionalUnitPrice: number; // $125 for each additional 500
  };

  // Install multipliers
  installMultipliers: {
    dirty: number; // 3x
    clean: number; // 1x
  };

  // Trip charge
  tripChargeBase: number; // $8
  parkingFee: number;     // $7 when inside beltway & parking

  // Frequency meta (visits per year)
  frequencyMeta: Record<SaniscrubFrequency, SaniscrubFrequencyMeta>;
}

export interface SaniscrubFormState
  extends Omit<BaseServiceFormState, "frequency"> {
  serviceId: "saniscrub";

  // How many restroom fixtures we SaniScrub
  fixtureCount: number;

  // Non-bathroom area in sq ft
  nonBathroomSqFt: number;

  // Frequency of SaniScrub service
  frequency: SaniscrubFrequency;

  // Is SaniScrub bundled with SaniClean?
  hasSaniClean: boolean;

  // Trip charge / geography
  location: "insideBeltway" | "outsideBeltway";
  needsParking: boolean;

  // Install quote
  includeInstall: boolean;
  isDirtyInstall: boolean;
}

// src/features/services/saniscrub/saniscrubConfig.ts
import type {
  SaniscrubPricingConfig,
  SaniscrubFrequency,
} from "./saniscrubTypes";

/**
 * Allowed frequency values in UI order.
 */
export const saniscrubFrequencyList: SaniscrubFrequency[] = [
  "monthly",
  "twicePerMonth",
  "bimonthly",
  "quarterly",
];

export const saniscrubFrequencyLabels: Record<SaniscrubFrequency, string> = {
  monthly: "Monthly",
  twicePerMonth: "2× / Month (with SaniClean)",
  bimonthly: "Every 2 Months",
  quarterly: "Quarterly",
};

/**
 * Canonical SaniScrub pricing config, matching the JSON + rules.
 */
export const saniscrubPricingConfig: SaniscrubPricingConfig = {
  fixtureRates: {
    monthly: 25,        // $25 / fixture (monthly)
    twicePerMonth: 25,  // base rate still $25; 2×/month discount handled separately
    bimonthly: 35,      // $35 / fixture (every 2 months)
    quarterly: 40,      // $40 / fixture (quarterly)
  },

  minimums: {
    monthly: 175,        // $175 minimum (fixtures)
    twicePerMonth: 175,  // we still use the same "monthly" minimum as the baseline
    bimonthly: 250,      // $250 minimum
    quarterly: 250,      // $250 minimum
  },

  // Non-bathroom area rule of thumb:
  // first 500 sq ft = $250, each additional 500 sq ft = $125.
  nonBathroomUnitSqFt: 500,
  nonBathroomFirstUnitRate: 250,
  nonBathroomAdditionalUnitRate: 125,

  // Install = 1× clean, 3× dirty ("try to sell 3× normal cost").
  installMultipliers: {
    dirty: 3,
    clean: 1,
  },

  // Trip charge at $8 + parking as per SaniClean.
  tripChargeBase: 8,
  parkingFee: 7,

  // Visit counts per year
  frequencyMeta: {
    monthly: { visitsPerYear: 12 },
    twicePerMonth: { visitsPerYear: 24 },
    bimonthly: { visitsPerYear: 6 },
    quarterly: { visitsPerYear: 4 },
  },

  // 2× / month rule:
  // "Combine with Sani; -$15 from what the monthly charge would be."
  // We treat this as a flat $15/month discount off the 2× monthly SaniScrub charge
  // when SaniScrub is combined with SaniClean.
  twoTimesPerMonthDiscountFlat: 15,
};

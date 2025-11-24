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
 * Canonical SaniScrub pricing config, matching the rules.
 */
export const saniscrubPricingConfig: SaniscrubPricingConfig = {
  // *** ALL fixture rates & minimums here are MONTHLY ***
  fixtureRates: {
    monthly: 25, // $25 / fixture / month
    twicePerMonth: 25, // base per-fixture rate still 25; 2× handled in calc
    bimonthly: 35, // $35 / fixture / month (every 2 months service)
    quarterly: 40, // $40 / fixture / month (quarterly service)
  },

  minimums: {
    monthly: 175, // Monthly: $25/fixture or $175 minimum
    twicePerMonth: 175, // 2×/month uses same base minimum before discount
    bimonthly: 250, // Bi-Monthly: $35/fixture, $250 minimum (monthly)
    quarterly: 250, // Quarterly: $40/fixture, $250 minimum (monthly)
  },

  // Non-bathroom rule of thumb (per VISIT):
  // first 500 sq ft = $250, each additional 500 sq ft = $125.
  nonBathroomUnitSqFt: 500,
  nonBathroomFirstUnitRate: 250,
  nonBathroomAdditionalUnitRate: 125,

  // Install = 1× clean, 3× dirty.
  installMultipliers: {
    dirty: 3,
    clean: 1,
  },

  // Trip charge values are now effectively disabled (UI shows 0, no impact).
  tripChargeBase: 0,
  parkingFee: 0,

  // Visit counts per year – this drives the monthlyVisits = visitsPerYear / 12.
  // For a weekly service you would set visitsPerYear = 52 → 4.33 visits/month.
  frequencyMeta: {
    monthly: { visitsPerYear: 12 },
    twicePerMonth: { visitsPerYear: 24 },
    bimonthly: { visitsPerYear: 6 },
    quarterly: { visitsPerYear: 4 },
  },

  // 2× / month rule:
  // "Combine with Sani; -$15 from what the monthly charge would be."
  // -> Start with 2× the normal MONTHLY SaniScrub fixture charge,
  //    then subtract $15/month when combined with SaniClean.
  twoTimesPerMonthDiscountFlat: 15,
};

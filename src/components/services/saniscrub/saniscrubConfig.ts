import type {
  SaniscrubPricingConfig,
  SaniscrubFrequency,
} from "./saniscrubTypes";

/**
 * Allowed frequency values in UI order.
 * All 9 frequency types.
 */
export const saniscrubFrequencyList: SaniscrubFrequency[] = [
  "oneTime",
  "weekly",
  "biweekly",
  "twicePerMonth",
  "monthly",
  "bimonthly",
  "quarterly",
  "biannual",
  "annual",
];

export const saniscrubFrequencyLabels: Record<SaniscrubFrequency, string> = {
  oneTime: "One Time",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  twicePerMonth: "2× / Month (with SaniClean)",
  monthly: "Monthly",
  bimonthly: "Every 2 Months",
  quarterly: "Quarterly",
  biannual: "Bi-Annual",
  annual: "Annual",
};

/**
 * Canonical SaniScrub pricing config, matching the rules.
 *
 * NOTE: These are DEFAULT/FALLBACK values.
 * The application will attempt to fetch pricing from the backend API first.
 * If the backend is unavailable or returns an error, these values will be used.
 *
 * To update production pricing:
 * 1. Update the backend ServiceConfig in MongoDB
 * 2. OR run: node scripts/seedSaniscrubPricing.js (when created)
 * 3. OR use the admin panel (when implemented)
 */
export const saniscrubPricingConfig: SaniscrubPricingConfig = {
  // *** ALL fixture rates & minimums here are MONTHLY ***
  fixtureRates: {
    oneTime: 25, // Same as monthly base rate
    weekly: 25, // Same as monthly base rate
    biweekly: 25, // Same as monthly base rate
    monthly: 25, // $25 / fixture / month
    twicePerMonth: 25, // base per-fixture rate still 25; 2× handled in calc
    bimonthly: 35, // $35 / fixture / month (every 2 months service)
    quarterly: 40, // $40 / fixture / month (quarterly service)
    biannual: 40, // Same as quarterly base rate
    annual: 40, // Same as quarterly base rate
  },

  minimums: {
    oneTime: 175, // Same as monthly
    weekly: 175, // Same as monthly
    biweekly: 175, // Same as monthly
    monthly: 175, // Monthly: $25/fixture or $175 minimum
    twicePerMonth: 175, // 2×/month uses same base minimum before discount
    bimonthly: 250, // Bi-Monthly: $35/fixture, $250 minimum (monthly)
    quarterly: 250, // Quarterly: $40/fixture, $250 minimum (monthly)
    biannual: 250, // Same as quarterly
    annual: 250, // Same as quarterly
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

  // Billing conversions for all 9 frequency types
  billingConversions: {
    oneTime: { annualMultiplier: 1, monthlyMultiplier: 0 },
    weekly: { annualMultiplier: 52, monthlyMultiplier: 4.33 },
    biweekly: { annualMultiplier: 26, monthlyMultiplier: 2.165 },
    twicePerMonth: { annualMultiplier: 24, monthlyMultiplier: 2 },
    monthly: { annualMultiplier: 12, monthlyMultiplier: 1 },
    bimonthly: { annualMultiplier: 6, monthlyMultiplier: 0.5 },
    quarterly: { annualMultiplier: 4, monthlyMultiplier: 0.333 },
    biannual: { annualMultiplier: 2, monthlyMultiplier: 0.167 },
    annual: { annualMultiplier: 1, monthlyMultiplier: 0.083 },
  },

  // Contract term limits
  minContractMonths: 2,
  maxContractMonths: 36,

  // Visit counts per year – this drives the monthlyVisits = visitsPerYear / 12.
  // For a weekly service you would set visitsPerYear = 52 → 4.33 visits/month.
  frequencyMeta: {
    oneTime: { visitsPerYear: 1, monthlyMultiplier: 0 },
    weekly: { visitsPerYear: 52, monthlyMultiplier: 4.33 },
    biweekly: { visitsPerYear: 26, monthlyMultiplier: 2.165 },
    twicePerMonth: { visitsPerYear: 24, monthlyMultiplier: 2 },
    monthly: { visitsPerYear: 12, monthlyMultiplier: 1 },
    bimonthly: { visitsPerYear: 6, monthlyMultiplier: 0.5 },
    quarterly: { visitsPerYear: 4, monthlyMultiplier: 0.333 },
    biannual: { visitsPerYear: 2, monthlyMultiplier: 0.167 },
    annual: { visitsPerYear: 1, monthlyMultiplier: 0.083 },
  },

  // 2× / month rule:
  // "Combine with Sani; -$15 from what the monthly charge would be."
  // -> Start with 2× the normal MONTHLY SaniScrub fixture charge,
  //    then subtract $15/month when combined with SaniClean.
  twoTimesPerMonthDiscountFlat: 15,
};

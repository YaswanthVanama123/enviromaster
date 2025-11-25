import type {
  CarpetPricingConfig,
  CarpetFrequency,
} from "./carpetTypes";

/**
 * Allowed frequency values in UI order.
 * (Same idea as SaniScrub, but you can change later if needed.)
 */
export const carpetFrequencyList: CarpetFrequency[] = [
  "monthly",
  "twicePerMonth",
  "bimonthly",
  "quarterly",
];

export const carpetFrequencyLabels: Record<CarpetFrequency, string> = {
  monthly: "Monthly",
  twicePerMonth: "2× / Month",
  bimonthly: "Every 2 Months",
  quarterly: "Quarterly",
};

/**
 * Canonical Carpet Cleaning pricing config.
 */
export const carpetPricingConfig: CarpetPricingConfig = {
  // Block pricing
  unitSqFt: 500,
  firstUnitRate: 250, // first 500 sq ft
  additionalUnitRate: 125, // each additional 500 sq ft
  perVisitMinimum: 250, // per-visit minimum

  // Installation multipliers (same as SaniScrub)
  // Install = 1× clean, 3× dirty of MONTHLY BASE (no trip)
  installMultipliers: {
    dirty: 3,
    clean: 1,
  },

  // Visits per year per frequency
  frequencyMeta: {
    monthly: { visitsPerYear: 12 }, // 1× per month
    twicePerMonth: { visitsPerYear: 24 }, // 2× per month
    bimonthly: { visitsPerYear: 6 }, // every 2 months
    quarterly: { visitsPerYear: 4 }, // quarterly
  },
};

// src/features/services/janitorial/janitorialConfig.ts
import type { JanitorialPricingConfig, JanitorialFrequencyKey } from "./janitorialTypes";

/**
 * Allowed frequency values in UI order.
 * All 9 frequency types.
 */
export const janitorialFrequencyList: JanitorialFrequencyKey[] = [
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

export const janitorialFrequencyLabels: Record<JanitorialFrequencyKey, string> = {
  oneTime: "One Time",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  twicePerMonth: "2× / Month",
  monthly: "Monthly",
  bimonthly: "Every 2 Months",
  quarterly: "Quarterly",
  biannual: "Bi-Annual",
  annual: "Annual",
};

/**
 * Pure janitorial add-on service configuration.
 *
 * Rules:
 *   - Pure janitorial add-ons are $30/hr.
 *   - Normal route: aim for at least 4 hours per trip/day
 *       → minimum charge per visit = 4 hrs × $30 = $120.
 *   - Standalone / small jobs: $50/hr.
 *   - Vacuuming: generally ~1 hr unless it's a huge job.
 *   - Dusting: ~30 places/hr at $1 each.
 *       • Dirty initial clean (non-quarterly): 3× time on FIRST VISIT dusting.
 *       • Quarterly (4×/year):
 *           - First visit dusting = $0 (covered by install).
 *           - From 2nd visit onwards, dusting hours = 3× normal time.
 */
export const janitorialPricingConfig: JanitorialPricingConfig = {
  baseHourlyRate: 30,
  shortJobHourlyRate: 50,
  minHoursPerVisit: 4,

  weeksPerMonth: 4.33,

  minContractMonths: 2,
  maxContractMonths: 36,

  dirtyInitialMultiplier: 3,
  infrequentMultiplier: 3,

  defaultFrequency: "weekly",

  dustingPlacesPerHour: 30,
  dustingPricePerPlace: 1,
  vacuumingDefaultHours: 1,

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

  rateCategories: {
    redRate: {
      multiplier: 1,
      commissionRate: "20%",
    },
    greenRate: {
      multiplier: 1.3,
      commissionRate: "25%",
    },
  },
};

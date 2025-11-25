// src/features/services/janitorial/janitorialConfig.ts
import type { JanitorialPricingConfig } from "./janitorialTypes";

/**
 * Pure janitorial add-on service configuration.
 *
 * Rules from pricing doc:
 *   - Pure janitorial add-ons are $30 / hr, generally aim for 4 hr minimum.
 *   - If the place is dirty, initial clean can take ~3x time → we treat that as 3x
 *     the normal first-visit cost.
 *   - For our calculator:
 *       • per-visit = max(hours, 4) × 30 (editable).
 *       • First month uses 4.33 visits.
 *       • If there is a 3x dirty initial, first month = firstVisit + (4.33 − 1) × perVisit.
 *       • Otherwise first month = 4.33 × perVisit.
 *       • No trip charge, no annual row – we instead use a 2–36 month contract dropdown.
 */
export const janitorialPricingConfig: JanitorialPricingConfig = {
  baseHourlyRate: 30,
  shortJobHourlyRate: 50,
  minHoursPerVisit: 4,

  weeksPerMonth: 4.33,

  minContractMonths: 2,
  maxContractMonths: 36,

  dirtyInitialMultiplier: 3,

  defaultFrequency: "weekly",

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

// src/features/services/janitorial/janitorialConfig.ts
import type { JanitorialPricingConfig } from "./janitorialTypes";

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

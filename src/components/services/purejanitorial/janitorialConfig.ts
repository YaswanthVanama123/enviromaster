// src/features/services/janitorial/janitorialConfig.ts
import type { JanitorialPricingConfig } from "./janitorialTypes";

/**
 * Pure janitorial add-on service configuration.
 *
 * Rules from pricing doc:
 *   - Pure janitorial add-ons are $30 / hr, generally aim for 4 hr minimum.
 *   - Tiered pricing for smooth scheduling (when we can schedule as we want):
 *       • 0-15 mins: $10 (only as addon)
 *       • 15-30 mins: $20 (only as addon); $35 as full stop
 *       • 0.5-1 hours: $50
 *       • 1-2 hours: $80
 *       • 2-3 hours: $100
 *       • 3-4 hours: $120
 *       • 4+ hours: $30/hr
 *   - $50/hr for standalone/short jobs (doesn't apply if we can schedule with route services > $30)
 *   - Vacuuming: generally 1 hr unless huge job
 *   - Dusting: ~30 places/hr at $1 each. 3× for dirty initial or infrequent (4×/year)
 *   - If the place is dirty, initial clean takes ~3× time
 */
export const janitorialPricingConfig: JanitorialPricingConfig = {
  baseHourlyRate: 30,
  shortJobHourlyRate: 50,
  minHoursPerVisit: 4,

  // Tiered pricing for smooth scheduling (normal route)
  tieredPricing: [
    { upToHours: 0.25, price: 10, addonOnly: true }, // 0-15 mins: $10 (addon only)
    { upToHours: 0.5, price: 20, addonOnly: true, standalonePrice: 35 }, // 15-30 mins: $20 addon, $35 standalone
    { upToHours: 1, price: 50 }, // 0.5-1 hrs: $50
    { upToHours: 2, price: 80 }, // 1-2 hrs: $80
    { upToHours: 3, price: 100 }, // 2-3 hrs: $100
    { upToHours: 4, price: 120 }, // 3-4 hrs: $120
    // 4+ hours: $30/hr (calculated separately)
  ],

  weeksPerMonth: 4.33,

  minContractMonths: 2,
  maxContractMonths: 36,

  dirtyInitialMultiplier: 3,
  infrequentMultiplier: 3, // for quarterly or less frequent service

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

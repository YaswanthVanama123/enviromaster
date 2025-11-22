// src/features/services/sanipod/sanipodConfig.ts
import type { SanipodPricingConfig } from "./sanipodTypes";

/**
 * SaniPod standalone pricing configuration.
 *
 * This follows the final rules exactly:
 *   - Weekly service is EITHER:
 *       8 $/week * pods
 *       OR (3 $/week * pods + 40 $/week)
 *     whichever is cheaper.
 *   - Extra bags: 2 $/bag/week.
 *   - Trip charge: per visit (weekly).
 *   - Install: 25 $/pod one-time.
 *
 * Rollups:
 *   - Annual = 52 weeks
 *   - Monthly = 4 weeks
 */
export const sanipodPricingConfig: SanipodPricingConfig = {
  weeklyRatePerUnit: 3.0,             // 3$/week per pod (used in 3+40 rule)
  altWeeklyRatePerUnit: 8.0,          // 8$/week per pod (flat per-pod option)
  extraBagPrice: 2.0,                 // 2$/bag/week
  installChargePerUnit: 25.0,         // 25$/pod install
  standaloneExtraWeeklyCharge: 40.0,  // +40$/week account-level base
  tripChargePerVisit: 8.0,            // default trip charge per visit

  defaultFrequency: "weekly",
  allowedFrequencies: ["weekly", "biweekly", "monthly"],

  // How many visits per year for each *view* frequency
  annualFrequencies: {
    weekly: 52,
    biweekly: 26,
    monthly: 12,
  },

  // How many weeks we treat as a month / year for pricing rollups
  weeksPerMonth: 4,
  weeksPerYear: 52,

  rateCategories: {
    redRate: {
      multiplier: 1.0,
      commissionRate: "20%",
    },
    greenRate: {
      multiplier: 1.3,
      commissionRate: "25%",
    },
  },
};

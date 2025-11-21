// src/features/services/sanipod/sanipodConfig.ts
import type { SanipodPricingConfig } from "./sanipodTypes";

export const sanipodPricingConfig: SanipodPricingConfig = {
  // Core SaniPod rates
  weeklyRatePerUnit: 3.0,        // $3/wk/ea
  installChargePerUnit: 25.0,    // $25 install per pod
  extraBagPrice: 2.0,            // $2 per extra bag

  // Frequency defaults (UI only – actual pricing is per-week based)
  defaultFrequency: "weekly",
  allowedFrequencies: ["weekly", "biweekly", "monthly"],

  // Visits per year at each displayed frequency
  // (Used only to compute "per visit" numbers – total revenue is weekly-based.)
  annualFrequencies: {
    weekly: 50,    // 50 active weeks / year
    biweekly: 25,  // every other week
    monthly: 12,   // once per month
  },

  // Standalone service options:
  // As a stand-alone service (no SaniClean) $8 SaniPod / wk
  // OR $3/wk/ea + $40 (monthly minimum) – whichever is cheaper for the customer.
  standaloneOptions: {
    perUnitRate: 3.0,
    flatRate: 8.0,
    minimum: 40.0,
    rule: "whichever is cheaper",
  },

  // Bundle pricing – when SaniPod is not stand-alone
  bundleOptions: {
    // When bundled with SaniClean, we treat SaniPod as a small monthly add-on.
    withSaniClean: {
      monthlyRatePerPod: 4.0, // e.g. 3 pods = $12/month
    },
    // When included in an all-inclusive program, SaniPod is part of
    // the $20/month per restroom fixture structure.
    allInclusive: {
      monthlyRatePerFixture: 20.0,
    },
  },

  // Trip charge rules – used only for standalone SaniPod
  tripCharge: {
    insideBeltway: 8.0,
    outsideBeltway: 10.0,
    parkingSurcharge: 5.0,
  },

  // Red / green rate categories
  rateCategories: {
    redRate: {
      multiplier: 1.0,
      commissionRate: "20%",
    },
    greenRate: {
      multiplier: 1.3, // 30% above red
      commissionRate: "25%",
    },
  },

  // Install multipliers – filthy / difficult installs cost more
  installationOptions: {
    cleanMultiplier: 1.0,
    dirtyMultiplier: 3.0,
  },

  // Business rules & contract metadata
  businessRules: {
    alwaysIncludeTripChargeStandalone: true,
    authorizationRequiredBelowRed: true,
    authorizers: ["Jeff", "Alex"],
    minimumQuantityForDiscount: 3, // 3 female toilets mentioned
  },

  contractOptions: {
    canIncludeInContract: true,
    compensateWithOtherServices: true,
  },
};

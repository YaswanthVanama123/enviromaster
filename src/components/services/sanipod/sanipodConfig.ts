// src/features/services/sanipod/sanipodConfig.ts
import type { SanipodPricingConfig } from "./sanipodTypes";

export const sanipodPricingConfig: SanipodPricingConfig = {
  weeklyRatePerUnit: 4.0,
  installChargePerUnit: 12.0,
  extraBagPrice: 2.5,
  standaloneMinimum: 40.0,

  defaultFrequency: "Weekly",
  allowedFrequencies: ["Weekly", "Bi-Weekly", "Monthly"],

  frequencyMultipliers: {
    weekly: 1.0,
    biweekly: 1.25,
    monthly: 1.25,
  },

  annualFrequencies: {
    weekly: 50,
    biweekly: 25,
    monthly: 12,
  },

  monthlyConversions: {
    weekly: 4.2,
    actualWeeksPerMonth: 4.35,
    actualWeeksPerYear: 52.18,
  },

  tripCharge: {
    insideBeltway: 8.0,
    outsideBeltway: 8.0,
    parking: 7.0,
  },

  rateCategories: {
    redRate: {
      multiplier: 1.0,
      commissionRate: "standard",
    },
    greenRate: {
      multiplier: 1.3,
      commissionRate: "+3% (up to 12%)",
    },
  },

  bundleOptions: {
    withSaniClean: {
      available: true,
      discountApplied: true,
      description: "Included with SaniClean service",
    },
    allInclusive: {
      available: true,
      pricePerFixture: 20.0,
      includes: [
        "SaniClean",
        "SaniPod service",
        "urinal mats",
        "paper dispenser",
        "mopping",
        "monthly SaniScrub",
      ],
      tripChargeWaived: true,
    },
  },

  installationOptions: {
    newInstall: {
      multiplier: 3,
      cleanInstall: 1,
    },
    canBeWaivedAsConcession: true,
  },

  businessRules: {
    alwaysIncludeTripCharge: true,
    authorizationRequiredBelowRed: true,
    authorizers: ["Jeff", "Alex"],
    minimumQuantityForDiscount: 3,
  },

  contractOptions: {
    canIncludeInContract: true,
    compensateWithOtherServices: true,
  },

  relatedServices: {
    toiletClips: {
      pricePerMonth: 2.0,
      description: "Per toilet clip monthly",
    },
    toiletSeatCoverDispensers: {
      pricePerMonth: 4.0,
      description: "Per dispenser monthly",
    },
  },

  geographicPricing: {
    insideBeltway: {
      baseRate: 7.0,
      minimum: 40.0,
      tripCharge: 8.0,
    },
    outsideBeltway: {
      baseRate: 6.0,
      tripCharge: 8.0,
    },
  },
};

// src/features/services/rpmWindows/rpmWindowsConfig.ts
import type { RpmWindowPricingConfig } from "./rpmWindowsTypes";

export const rpmWindowPricingConfig: RpmWindowPricingConfig = {
  smallWindowRate: 1.5,
  mediumWindowRate: 3.0,
  largeWindowRate: 7.0,
  tripCharge: 0,

  installMultiplierFirstTime: 3,
  installMultiplierClean: 1,

  frequencyMultipliers: {
    weekly: 1.0,
    biweekly: 1.25,
    monthly: 1.25,
    quarterly: 2.0,
    quarterlyFirstTime: 3.0,
  },

  // Use “weeks” based logic:
  // weekly  = 52 visits/year
  // biweekly = 26 visits/year
  // monthly = 12 visits/year
  // quarterly = 4 visits/year
  annualFrequencies: {
    weekly: 52,
    biweekly: 26,
    monthly: 12,
    quarterly: 4,
  },

  // Normalize to 4.33-week months
  monthlyConversions: {
    weekly: 4.33,          // 4.33 weeks/month
    actualWeeksPerMonth: 4.33,
    actualWeeksPerYear: 52,
  },

  rateCategories: {
    redRate: {
      multiplier: 1.0,
      commissionRate: "standard",
    },
    greenRate: {
      multiplier: 1.3,
      commissionRate: "3% above standard (up to 12%)",
    },
  },

  allowedFrequencies: ["Weekly", "Bi-Weekly", "Monthly", "Quarterly"],

  additionalServices: {
    mirrorCleaning: true,
    mirrorCleaningRate: "same as window cleaning rate",
  },

  businessRules: {
    quarterlyHandledByInstallers: true,
    installCanBeWaivedAsConcession: true,
    alwaysIncludeTripCharge: false,
    authorizationRequiredBelowRed: true,
    authorizers: ["Jeff", "Alex"],
  },

  contractOptions: {
    canIncludeInContract: true,
    compensateWithOtherServices: true,
  },
};

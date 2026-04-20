
import type { RpmWindowPricingConfig } from "./rpmWindowsTypes";


export const rpmWindowPricingConfig: RpmWindowPricingConfig = {
  smallWindowRate: 1.5,
  mediumWindowRate: 3.0,
  largeWindowRate: 7.0,
  tripCharge: 0,

  installMultiplierFirstTime: 3,
  installMultiplierClean: 1,

  frequencyMultipliers: {
    oneTime: 1.0,
    weekly: 1.0,
    biweekly: 1.25,
    twicePerMonth: 1.2,
    monthly: 1.25,
    bimonthly: 1.5,
    quarterly: 2.0,
    biannual: 2.5,
    annual: 3.0,
    quarterlyFirstTime: 3.0,
  },


  annualFrequencies: {
    oneTime: 1,
    weekly: 52,
    biweekly: 26,
    twicePerMonth: 24,
    monthly: 12,
    bimonthly: 6,
    quarterly: 4,
    biannual: 2,
    annual: 1,
  },


  monthlyConversions: {
    weekly: 4.33,          
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

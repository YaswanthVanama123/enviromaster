// src/features/services/stripWax/stripWaxConfig.ts
import type { StripWaxPricingConfig } from "./stripWaxTypes";

export const stripWaxPricingConfig: StripWaxPricingConfig = {
  weeksPerMonth: 4.33,

  minContractMonths: 2,
  maxContractMonths: 36,

  defaultFrequency: "weekly",
  defaultVariant: "standardFull",

  variants: {
    standardFull: {
      label: "Standard – full strip + sealant",
      ratePerSqFt: 0.75,
      minCharge: 550,
    },
    noSealant: {
      label: "No sealant – 4th coat free / discount",
      ratePerSqFt: 0.70,
      minCharge: 550,
    },
    wellMaintained: {
      label: "Well maintained – partial strip",
      ratePerSqFt: 0.40,
      minCharge: 400,
    },
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

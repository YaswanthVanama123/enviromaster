// src/features/services/stripWax/stripWaxConfig.ts
import type { StripWaxPricingConfig } from "./stripWaxTypes";

export const stripWaxPricingConfig: StripWaxPricingConfig = {
  weeksPerMonth: 4.33,
  weeksPerYear: 52,

  minContractMonths: 2,
  maxContractMonths: 36,

  defaultFrequency: "weekly",
  defaultVariant: "standardFull",

  // Billing conversions for all 9 frequencies
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

// src/components/services/electrostaticSpray/electrostaticSprayConfig.ts

import type { ElectrostaticSprayPricingConfig } from "./electrostaticSprayTypes";

export const electrostaticSprayPricingConfig: ElectrostaticSprayPricingConfig = {
  // Room-based pricing
  ratePerRoom: 20, // $20 per moderately sized room

  // Square footage pricing
  ratePerThousandSqFt: 50, // $50 per 1000 sq ft
  sqFtUnit: 1000,

  // Trip charges (same as Sani-Clean)
  tripCharges: {
    insideBeltway: 10,
    outsideBeltway: 0,
    standard: 0,
  },

  // Frequency conversions
  billingConversions: {
    weekly: { monthlyMultiplier: 4.33, annualMultiplier: 52 },
    biweekly: { monthlyMultiplier: 2.165, annualMultiplier: 26 },
    monthly: { monthlyMultiplier: 1, annualMultiplier: 12 },
    bimonthly: { monthlyMultiplier: 0.5, annualMultiplier: 6 },
    quarterly: { monthlyMultiplier: 0.333, annualMultiplier: 4 },
    actualWeeksPerMonth: 4.33,
  },

  // Contract settings
  minContractMonths: 2,
  maxContractMonths: 36,

  // Value proposition
  valueProposition: {
    bacteriaReduction: "99.4%",
    cleanlinessLevel: "Almost surgically clean",
    applicableAreas: ["air", "walls", "surfaces"],
  },

  defaultFrequency: "weekly",
  allowedFrequencies: ["weekly", "biweekly", "monthly", "bimonthly", "quarterly"],
};

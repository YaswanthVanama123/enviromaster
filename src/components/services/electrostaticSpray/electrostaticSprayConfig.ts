

import type { ElectrostaticSprayPricingConfig } from "./electrostaticSprayTypes";

export const electrostaticSprayPricingConfig: ElectrostaticSprayPricingConfig = {

  ratePerRoom: 20, 


  ratePerThousandSqFt: 50, 
  sqFtUnit: 1000,


  tripCharges: {
    insideBeltway: 10,
    outsideBeltway: 0,
    standard: 0,
  },


  billingConversions: {
    oneTime: { monthlyMultiplier: 0, annualMultiplier: 1 },
    weekly: { monthlyMultiplier: 4.33, annualMultiplier: 52 },
    biweekly: { monthlyMultiplier: 2.165, annualMultiplier: 26 },
    twicePerMonth: { monthlyMultiplier: 2, annualMultiplier: 24 },
    monthly: { monthlyMultiplier: 1, annualMultiplier: 12 },
    everyFourWeeks: { monthlyMultiplier: 1.0833, annualMultiplier: 13 },
    bimonthly: { monthlyMultiplier: 0.5, annualMultiplier: 6 },
    quarterly: { monthlyMultiplier: 0, annualMultiplier: 4 },
    biannual: { monthlyMultiplier: 0, annualMultiplier: 2 },
    annual: { monthlyMultiplier: 0, annualMultiplier: 1 },
    actualWeeksPerMonth: 4.33,
  },


  minContractMonths: 2,
  maxContractMonths: 36,


  valueProposition: {
    bacteriaReduction: "99.4%",
    cleanlinessLevel: "Almost surgically clean",
    applicableAreas: ["air", "walls", "surfaces"],
  },

  defaultFrequency: "weekly",
  allowedFrequencies: ["oneTime", "weekly", "biweekly", "twicePerMonth", "monthly", "everyFourWeeks", "bimonthly", "quarterly", "biannual", "annual"],
};

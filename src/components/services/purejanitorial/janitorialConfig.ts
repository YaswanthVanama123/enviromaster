
import type { JanitorialPricingConfig, JanitorialFrequencyKey } from "./janitorialTypes";


export const janitorialFrequencyList: JanitorialFrequencyKey[] = [
  "oneTime",
  "weekly",
  "biweekly",
  "twicePerMonth",
  "monthly",
  "bimonthly",
  "quarterly",
  "biannual",
  "annual",
];

export const janitorialFrequencyLabels: Record<JanitorialFrequencyKey, string> = {
  oneTime: "One Time",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  twicePerMonth: "2× / Month",
  monthly: "Monthly",
  bimonthly: "Every 2 Months",
  quarterly: "Quarterly",
  biannual: "Bi-Annual",
  annual: "Annual",
};


export const janitorialPricingConfig: JanitorialPricingConfig = {
  baseHourlyRate: 30,
  shortJobHourlyRate: 50,
  minHoursPerVisit: 4,

  weeksPerMonth: 4.33,

  minContractMonths: 2,
  maxContractMonths: 36,

  dirtyInitialMultiplier: 3,
  infrequentMultiplier: 3,

  defaultFrequency: "weekly",

  dustingPlacesPerHour: 30,
  dustingPricePerPlace: 1,
  vacuumingDefaultHours: 1,


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

import type {
  SaniscrubPricingConfig,
  SaniscrubFrequency,
} from "./saniscrubTypes";


export const saniscrubFrequencyList: SaniscrubFrequency[] = [
  "oneTime",
  "weekly",
  "biweekly",
  "twicePerMonth",
  "monthly",
  "everyFourWeeks",
  "bimonthly",
  "quarterly",
  "biannual",
  "annual",
];

export const saniscrubFrequencyLabels: Record<SaniscrubFrequency, string> = {
  oneTime: "One Time",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  twicePerMonth: "2× / Month (with SaniClean)",
  monthly: "Monthly",
  everyFourWeeks: "Every 4 Weeks",
  bimonthly: "Every 2 Months",
  quarterly: "Quarterly",
  biannual: "Bi-Annual",
  annual: "Annual",
};


export const saniscrubPricingConfig: SaniscrubPricingConfig = {

  fixtureRates: {
    oneTime: 25,
    weekly: 25,
    biweekly: 25,
    monthly: 25,
    everyFourWeeks: 25,
    twicePerMonth: 25,
    bimonthly: 35,
    quarterly: 40,
    biannual: 40,
    annual: 40,
  },

  minimums: {
    oneTime: 175,
    weekly: 175,
    biweekly: 175,
    monthly: 175,
    everyFourWeeks: 175,
    twicePerMonth: 175,
    bimonthly: 250,
    quarterly: 250,
    biannual: 250,
    annual: 250,
  },


  nonBathroomUnitSqFt: 500,
  nonBathroomFirstUnitRate: 250,
  nonBathroomAdditionalUnitRate: 125,


  installMultipliers: {
    dirty: 3,
    clean: 1,
  },


  tripChargeBase: 0,
  parkingFee: 0,


  billingConversions: {
    oneTime: { annualMultiplier: 1, monthlyMultiplier: 0 },
    weekly: { annualMultiplier: 52, monthlyMultiplier: 4.33 },
    biweekly: { annualMultiplier: 26, monthlyMultiplier: 2.165 },
    twicePerMonth: { annualMultiplier: 24, monthlyMultiplier: 2 },
    monthly: { annualMultiplier: 12, monthlyMultiplier: 1 },
    everyFourWeeks: { annualMultiplier: 13, monthlyMultiplier: 1.0833 },
    bimonthly: { annualMultiplier: 6, monthlyMultiplier: 0.5 },
    quarterly: { annualMultiplier: 4, monthlyMultiplier: 0.333 },
    biannual: { annualMultiplier: 2, monthlyMultiplier: 0.167 },
    annual: { annualMultiplier: 1, monthlyMultiplier: 0.083 },
  },


  minContractMonths: 2,
  maxContractMonths: 36,


  frequencyMeta: {
    oneTime: { visitsPerYear: 1, monthlyMultiplier: 0 },
    weekly: { visitsPerYear: 52, monthlyMultiplier: 4.33 },
    biweekly: { visitsPerYear: 26, monthlyMultiplier: 2.165 },
    twicePerMonth: { visitsPerYear: 24, monthlyMultiplier: 2 },
    monthly: { visitsPerYear: 12, monthlyMultiplier: 1 },
    everyFourWeeks: { visitsPerYear: 13, monthlyMultiplier: 1.0833 },
    bimonthly: { visitsPerYear: 6, monthlyMultiplier: 0.5 },
    quarterly: { visitsPerYear: 4, monthlyMultiplier: 0.333 },
    biannual: { visitsPerYear: 2, monthlyMultiplier: 0.167 },
    annual: { visitsPerYear: 1, monthlyMultiplier: 0.083 },
  },


  twoTimesPerMonthDiscountFlat: 15,
};

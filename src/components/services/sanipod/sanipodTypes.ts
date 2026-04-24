

export type SanipodFrequencyKey = "oneTime" | "weekly" | "biweekly" | "twicePerMonth" | "monthly" | "everyFourWeeks" | "bimonthly" | "quarterly" | "biannual" | "annual";
export type SanipodRateCategory = "redRate" | "greenRate";


export type SanipodServiceRuleKey = "perPod8" | "perPod3Plus40";


export interface SanipodRateCategoryConfig {

  multiplier: number;
  commissionRate: string;
}


export interface SanipodAnnualFrequencyConfig {
  oneTime: number;
  weekly: number;
  biweekly: number;
  twicePerMonth: number;
  monthly: number;
  everyFourWeeks: number;
  bimonthly: number;
  quarterly: number;
  biannual: number;
  annual: number;
}


export interface SanipodPricingConfig {

  weeklyRatePerUnit: number;


  altWeeklyRatePerUnit: number;


  extraBagPrice: number;


  installChargePerUnit: number;


  standaloneExtraWeeklyCharge: number;


  tripChargePerVisit: number;


  defaultFrequency: SanipodFrequencyKey;


  allowedFrequencies: SanipodFrequencyKey[];


  annualFrequencies: SanipodAnnualFrequencyConfig;


  frequencyMultipliers: {
    oneTime: number;
    weekly: number;
    biweekly: number;
    twicePerMonth: number;
    monthly: number;
    everyFourWeeks: number;
    bimonthly: number;
    quarterly: number;
    biannual: number;
    annual: number;
  };


  weeksPerMonth: number; 
  weeksPerYear: number;  


  minContractMonths: number;
  maxContractMonths: number;


  rateCategories: {
    redRate: SanipodRateCategoryConfig;
    greenRate: SanipodRateCategoryConfig;
  };
}

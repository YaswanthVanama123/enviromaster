

export type StripWaxFrequencyKey = "oneTime" | "weekly" | "biweekly" | "twicePerMonth" | "monthly" | "everyFourWeeks" | "bimonthly" | "quarterly" | "biannual" | "annual";
export type StripWaxRateCategory = "redRate" | "greenRate";

export type StripWaxServiceVariant =
  | "standardFull"
  | "noSealant"
  | "wellMaintained";

export interface StripWaxRateCategoryConfig {
  multiplier: number;
  commissionRate: string;
}

export interface StripWaxVariantConfig {
  label: string;
  ratePerSqFt: number;
  minCharge: number;
}


export interface StripWaxPricingConfig {
  weeksPerMonth: number;
  weeksPerYear: number;
  minContractMonths: number;
  maxContractMonths: number;

  defaultFrequency: StripWaxFrequencyKey;
  defaultVariant: StripWaxServiceVariant;

  billingConversions: {
    [key in StripWaxFrequencyKey]: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
  };

  variants: {
    standardFull: StripWaxVariantConfig;
    noSealant: StripWaxVariantConfig;
    wellMaintained: StripWaxVariantConfig;
  };

  rateCategories: {
    redRate: StripWaxRateCategoryConfig;
    greenRate: StripWaxRateCategoryConfig;
  };
}

export interface StripWaxFormState {
  floorAreaSqFt: number;
  ratePerSqFt: number;
  minCharge: number;

  serviceVariant: StripWaxServiceVariant;

  frequency: StripWaxFrequencyKey;
  rateCategory: StripWaxRateCategory;


  contractMonths: number;


  weeksPerMonth: number;                           
  standardFullRatePerSqFt: number;                 
  standardFullMinCharge: number;                   
  noSealantRatePerSqFt: number;                    
  noSealantMinCharge: number;                      
  wellMaintainedRatePerSqFt: number;               
  wellMaintainedMinCharge: number;                 
  redRateMultiplier: number;                       
  greenRateMultiplier: number;                     


  customPerVisit?: number;
  customMonthly?: number;
  customOngoingMonthly?: number;
  customContractTotal?: number;
  customRatePerSqFt?: number;  
  customMinCharge?: number;    

  applyMinimum?: boolean;
}

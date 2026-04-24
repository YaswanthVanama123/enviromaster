
import type { BaseServiceFormState } from "../common/serviceTypes";

export type RpmFrequencyKey = "oneTime" | "weekly" | "biweekly" | "twicePerMonth" | "monthly" | "everyFourWeeks" | "bimonthly" | "quarterly" | "biannual" | "annual";
export type RpmRateCategory = "redRate" | "greenRate";

export interface RpmWindowPricingConfig {
  smallWindowRate: number;
  mediumWindowRate: number;
  largeWindowRate: number;

  tripCharge: number;

  installMultiplierFirstTime: number;
  installMultiplierClean: number;

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
    quarterlyFirstTime: number;
  };

  annualFrequencies: {
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

  monthlyConversions: {
    weekly: number;
    actualWeeksPerMonth: number;
    actualWeeksPerYear: number;
  };

  rateCategories: {
    redRate: {
      multiplier: number;
      commissionRate: string;
    };
    greenRate: {
      multiplier: number;
      commissionRate: string;
    };
  };

  allowedFrequencies: string[];

  additionalServices: {
    mirrorCleaning: boolean;
    mirrorCleaningRate: string;
  };

  businessRules: {
    quarterlyHandledByInstallers: boolean;
    installCanBeWaivedAsConcession: boolean;
    alwaysIncludeTripCharge: boolean;
    authorizationRequiredBelowRed: boolean;
    authorizers: string[];
  };

  contractOptions: {
    canIncludeInContract: boolean;
    compensateWithOtherServices: boolean;
  };
}


export interface RpmExtraChargeLine {
  id: string;
  calcText: string;
  description: string;
  amount: number; 
  orderNo?: number;
  isDisplay?: boolean;
}


export interface RpmWindowsFormState extends BaseServiceFormState {

  smallQty: number;
  mediumQty: number;
  largeQty: number;


  smallWindowRate: number;
  mediumWindowRate: number;
  largeWindowRate: number;


  customSmallTotal?: number;
  customMediumTotal?: number;
  customLargeTotal?: number;


  tripCharge: number;


  isFirstTimeInstall: boolean;           
  selectedRateCategory: RpmRateCategory; 
  includeMirrors: boolean;               


  installMultiplierFirstTime: number;    
  installMultiplierClean: number;        


  customInstallationFee?: number;        


  extraCharges: RpmExtraChargeLine[];


  contractMonths: number;


  customPerVisitPrice?: number;         
  customFirstMonthPrice?: number;       
  customMonthlyRecurring?: number;      
  customContractTotal?: number;         
  customFirstMonthTotal?: number;
  customAnnualPrice?: number;

  applyMinimum?: boolean;
}

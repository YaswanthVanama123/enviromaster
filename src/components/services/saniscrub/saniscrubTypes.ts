import type { BaseServiceFormState } from "../common/serviceTypes";

export type SaniscrubFrequency =
  | "oneTime"
  | "weekly"
  | "biweekly"
  | "twicePerMonth"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "biannual"
  | "annual";

export interface SaniscrubFrequencyMeta {

  visitsPerYear: number;

  monthlyMultiplier: number;
}


export interface SaniscrubPricingConfig {

  fixtureRates: Record<SaniscrubFrequency, number>;


  minimums: Record<SaniscrubFrequency, number>;


  nonBathroomUnitSqFt: number; 
  nonBathroomFirstUnitRate: number; 
  nonBathroomAdditionalUnitRate: number; 


  installMultipliers: {
    clean: number; 
    dirty: number; 
  };


  tripChargeBase: number;
  parkingFee: number;


  billingConversions: {
    [key in SaniscrubFrequency]: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
  };


  minContractMonths: number;
  maxContractMonths: number;


  frequencyMeta: Record<SaniscrubFrequency, SaniscrubFrequencyMeta>;


  twoTimesPerMonthDiscountFlat: number;
}


export interface SaniscrubFormState extends BaseServiceFormState {
  serviceId: "saniscrub";


  fixtureCount: number;


  nonBathroomSqFt: number;


  useExactNonBathroomSqft: boolean; 


  frequency: SaniscrubFrequency;


  hasSaniClean: boolean;


  location: "insideBeltway" | "outsideBeltway";
  needsParking: boolean;


  includeInstall: boolean;
  isDirtyInstall: boolean;


  contractMonths: number;


  fixtureRateMonthly: number;        
  fixtureRateBimonthly: number;      
  fixtureRateQuarterly: number;      
  minimumMonthly: number;            
  minimumBimonthly: number;          
  nonBathroomFirstUnitRate: number;  
  nonBathroomAdditionalUnitRate: number; 
  installMultiplierDirty: number;    
  installMultiplierClean: number;    
  twoTimesPerMonthDiscount: number;  


  customInstallationFee?: number;


  customPerVisitPrice?: number;
  customMonthlyRecurring?: number;
  customFirstMonthPrice?: number;
  customContractTotal?: number;
  customPerVisitMinimum?: number;
  perVisitMinimum?: number;

  applyMinimum?: boolean;
}

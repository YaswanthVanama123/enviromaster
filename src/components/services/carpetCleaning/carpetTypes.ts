import type { BaseServiceFormState } from "../common/serviceTypes";

export type CarpetFrequency =
  | "oneTime"
  | "weekly"
  | "biweekly"
  | "twicePerMonth"
  | "monthly"
  | "everyFourWeeks"
  | "bimonthly"
  | "quarterly"
  | "biannual"
  | "annual";

export interface CarpetFrequencyMeta {

  visitsPerYear: number;

  monthlyMultiplier: number;
}


export interface CarpetPricingConfig {
  unitSqFt: number; 
  firstUnitRate: number; 
  additionalUnitRate: number; 
  perVisitMinimum: number; 


  installMultipliers: {
    dirty: number;  
    clean: number;  
  };


  billingConversions: {
    [key in CarpetFrequency]: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
  };

  minContractMonths: number;
  maxContractMonths: number;

  frequencyMeta: Record<CarpetFrequency, CarpetFrequencyMeta>;
}


export interface CarpetFormState extends BaseServiceFormState {
  serviceId: "carpetCleaning";


  areaSqFt: number;


  useExactSqft: boolean;  


  frequency: CarpetFrequency;


  location: "insideBeltway" | "outsideBeltway";
  needsParking: boolean;


  contractMonths: number;


  includeInstall: boolean;
  isDirtyInstall: boolean;  


  unitSqFt: number;                
  firstUnitRate: number;           
  additionalUnitRate: number;      
  perVisitMinimum: number;         
  installMultiplierDirty: number;  
  installMultiplierClean: number;  


  customFirstUnitRate?: number;        
  customAdditionalUnitRate?: number;   
  customPerVisitMinimum?: number;      
  customPerVisitPrice?: number;
  customMonthlyRecurring?: number;
  customFirstMonthPrice?: number;
  customContractTotal?: number;
  customInstallationFee?: number;

  applyMinimum?: boolean;
}


import type { ServiceQuoteResult } from "../common/serviceTypes";

export type FoamingDrainFrequency =
  | "oneTime"
  | "weekly"
  | "biweekly"
  | "twicePerMonth"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "biannual"
  | "annual";
export type FoamingDrainLocation = "beltway" | "standard";
export type FoamingDrainCondition = "normal" | "filthy";

export interface FoamingDrainFormState {
  serviceId: "foamingDrain";


  standardDrainCount: number;   
  installDrainCount: number;    
  filthyDrainCount: number;     
  greaseTrapCount: number;      
  greenDrainCount: number;      
  plumbingDrainCount: number;   


  needsPlumbing: boolean;


  frequency: FoamingDrainFrequency;

  installFrequency: "weekly" | "bimonthly";
  facilityCondition: FoamingDrainCondition;
  location: FoamingDrainLocation;


  useSmallAltPricingWeekly: boolean; 
  useBigAccountTenWeekly: boolean;   
  isAllInclusive: boolean;           


  installServiceMode: "none" | "weekly" | "bimonth";


  chargeGreaseTrapInstall: boolean;


  tripChargeOverride?: number;


  contractMonths: number;

  notes: string;


  standardDrainRate: number;           
  altBaseCharge: number;               
  altExtraPerDrain: number;            
  volumeWeeklyRate: number;            
  volumeBimonthlyRate: number;         
  greaseWeeklyRate: number;            
  greaseInstallRate: number;           
  greenWeeklyRate: number;             
  greenInstallRate: number;            
  plumbingAddonRate: number;           
  filthyMultiplier: number;            


  customStandardDrainTotal?: number;
  customGreaseTrapTotal?: number;
  customGreenDrainTotal?: number;
  customPlumbingTotal?: number;
  customFilthyInstall?: number;
  customGreaseInstall?: number;
  customGreenInstall?: number;
  customWeeklyService?: number;
  customInstallationTotal?: number;
  customMonthlyRecurring?: number;
  customFirstMonthPrice?: number;
  customContractTotal?: number;


  customRatePerDrain?: number;
  customAltBaseCharge?: number;
  customAltExtraPerDrain?: number;
  customVolumeWeeklyRate?: number;
  customVolumeBimonthlyRate?: number;
  customGreaseWeeklyRate?: number;
  customGreaseInstallRate?: number;
  customGreenWeeklyRate?: number;
  customGreenInstallRate?: number;
  customPlumbingAddonRate?: number;
  customFilthyMultiplier?: number;


  customFields?: any[];

  applyMinimum?: boolean;
}

export interface FoamingDrainBreakdown {

  usedSmallAlt: boolean;      
  usedBigAccountAlt: boolean; 
  volumePricingApplied: boolean; 


  weeklyStandardDrains: number;
  weeklyInstallDrains: number;
  weeklyGreaseTraps: number;
  weeklyGreenDrains: number;
  weeklyPlumbing: number;


  filthyInstallOneTime: number;
  greaseInstallOneTime: number;
  greenInstallOneTime: number;


  tripCharge: number;
}

export interface FoamingDrainQuoteResult extends ServiceQuoteResult {
  serviceId: "foamingDrain";

  frequency: FoamingDrainFrequency;
  location: FoamingDrainLocation;
  facilityCondition: FoamingDrainCondition;


  useSmallAltPricingWeekly: boolean;
  useBigAccountTenWeekly: boolean;
  isAllInclusive: boolean;
  chargeGreaseTrapInstall: boolean;


  weeklyService: number;      
  weeklyTotal: number;        
  monthlyRecurring: number;   
  annualRecurring: number;    
  installation: number;       
  tripCharge: number;         


  firstVisitPrice: number;    
  firstMonthPrice: number;    
  contractMonths: number;

  notes: string;

  breakdown: FoamingDrainBreakdown;


  minimumChargePerVisit: number;


  originalContractTotal: number;
}

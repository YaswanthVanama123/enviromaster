

export type JanitorialFrequencyKey =
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

export type JanitorialRateCategory = "redRate" | "greenRate";
export type SchedulingMode = "normalRoute" | "standalone";
export type ServiceType = "recurring" | "oneTime";

export interface JanitorialRateCategoryConfig {
  multiplier: number;
  commissionRate: string;
}

export interface JanitorialPricingConfig {

  baseHourlyRate: number;


  shortJobHourlyRate: number;


  minHoursPerVisit: number;


  weeksPerMonth: number;


  minContractMonths: number;
  maxContractMonths: number;


  dirtyInitialMultiplier: number;


  infrequentMultiplier: number;


  defaultFrequency: JanitorialFrequencyKey;


  dustingPlacesPerHour: number;


  dustingPricePerPlace: number;


  vacuumingDefaultHours: number;


  billingConversions: {
    [key in JanitorialFrequencyKey]: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
  };

  rateCategories: {
    redRate: JanitorialRateCategoryConfig;
    greenRate: JanitorialRateCategoryConfig;
  };
}

export interface JanitorialFormState {
  manualHours: number;
  schedulingMode: SchedulingMode;
  serviceType: ServiceType; 
  vacuumingHours: number;

  dustingTotalPlaces: number;        
  dustingCalculatedHours: number;    
  dirtyInitial: boolean; 
  frequency: JanitorialFrequencyKey;
  visitsPerWeek: number; 
  rateCategory: JanitorialRateCategory;
  contractMonths: number;
  addonTimeMinutes: number; 
  installation: boolean; 


  notes?: string; 


  baseHourlyRate: number;               
  shortJobHourlyRate: number;           
  minHoursPerVisit: number;             
  weeksPerMonth: number;                
  dirtyInitialMultiplier: number;       
  infrequentMultiplier: number;         
  dustingPlacesPerHour: number;         
  dustingPricePerPlace: number;         
  vacuumingDefaultHours: number;        
  redRateMultiplier: number;            
  greenRateMultiplier: number;          


  customBaseHourlyRate?: number;        
  customShortJobHourlyRate?: number;    
  customMinHoursPerVisit?: number;      

  customDustingPlacesPerHour?: number;  


  customPerVisit?: number;
  customFirstVisit?: number;
  customMonthly?: number;
  customOngoingMonthly?: number;
  customContractTotal?: number;
}

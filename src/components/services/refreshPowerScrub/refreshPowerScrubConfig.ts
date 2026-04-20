
import type { RefreshFrequency } from "./refreshPowerScrubTypes";


export const REFRESH_DEFAULT_HOURLY = 200; 
export const REFRESH_DEFAULT_TRIP = 75;    
export const REFRESH_DEFAULT_MIN = 400;    


export const REFRESH_KITCHEN_SMALL_MED = 1500;  
export const REFRESH_KITCHEN_LARGE = 2500;      

export const REFRESH_FOH_RATE = 2500;           

export const REFRESH_PATIO_STANDALONE = 800;    
export const REFRESH_PATIO_UPSELL = 500;        


export const REFRESH_SQFT_FIXED_FEE = 200;
export const REFRESH_SQFT_INSIDE_RATE = 0.6;    
export const REFRESH_SQFT_OUTSIDE_RATE = 0.4;   


export const refreshFrequencyLabels: Record<RefreshFrequency, string> = {
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


export const refreshFrequencyList: RefreshFrequency[] = [
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

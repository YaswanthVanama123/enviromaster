
import type { SanipodPricingConfig } from "./sanipodTypes";


export const sanipodPricingConfig: SanipodPricingConfig = {
  weeklyRatePerUnit: 3.0,             
  altWeeklyRatePerUnit: 8.0,          
  extraBagPrice: 2.0,                 
  installChargePerUnit: 25.0,         
  standaloneExtraWeeklyCharge: 40.0,  


  tripChargePerVisit: 0.0,

  defaultFrequency: "weekly",
  allowedFrequencies: ["oneTime", "weekly", "biweekly", "twicePerMonth", "monthly", "bimonthly", "quarterly", "biannual", "annual"],


  annualFrequencies: {
    oneTime: 1,
    weekly: 52,
    biweekly: 26,
    twicePerMonth: 24,
    monthly: 12,
    bimonthly: 6,
    quarterly: 4,
    biannual: 2,
    annual: 1,
  },


  frequencyMultipliers: {
    oneTime: 0,      
    weekly: 4.33,    
    biweekly: 2.165, 
    twicePerMonth: 2, 
    monthly: 1.0,    
    bimonthly: 0.5,  
    quarterly: 0,    
    biannual: 0,     
    annual: 0,       
  },


  weeksPerMonth: 4.33,
  weeksPerYear: 52,


  minContractMonths: 2,
  maxContractMonths: 36,

  rateCategories: {
    redRate: {
      multiplier: 1.0,
      commissionRate: "20%",
    },
    greenRate: {
      multiplier: 1.3,
      commissionRate: "25%",
    },
  },
};

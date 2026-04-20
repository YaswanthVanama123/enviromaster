
export const JANITORIAL_CONFIG = {

  baseRates: {
    recurringService: 30,       
    oneTimeService: 35,         
  },


  additionalServices: {
    vacuuming: {
      baseHours: 0.5,           
      ratePerHour: 25,          
    },
    dusting: {
      baseHours: 0.33,          
      ratePerHour: 20,          
    },
  },


  frequencyMultipliers: {
    daily: 0.85,              
    weekly: 1.0,              
    biweekly: 1.1,            
    monthly: 1.25,            
    oneTime: 1.4,             
  },


  billingConversions: {
    weekly: 50,               
    biweekly: 25,             
    monthly: 12,              
    quarterly: 4,             
  },


  minimums: {
    perVisit: 50,             
    recurringContract: 200,    
  },


  tripCharges: {
    standard: 6,
    insideBeltway: 8,
    paidParking: 7,           
  },
} as const;

export const janitorialPricingConfig = JANITORIAL_CONFIG;
export type JanitorialConfig = typeof JANITORIAL_CONFIG;


export function isJanitorialFrequency(value: string): value is keyof typeof JANITORIAL_CONFIG.frequencyMultipliers {
  return value in JANITORIAL_CONFIG.frequencyMultipliers;
}

export function isJanitorialServiceType(value: string): value is keyof typeof JANITORIAL_CONFIG.baseRates {
  return value in JANITORIAL_CONFIG.baseRates;
}

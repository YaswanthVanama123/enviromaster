

export const FOAMING_DRAIN_CONFIG = {


  standardDrainRate: 10, 
  altBaseCharge: 20, 
  altExtraPerDrain: 4, 


  volumePricing: {
    minimumDrains: 10,
    weekly: {
      ratePerDrain: 20,
    },
    bimonthly: {
      ratePerDrain: 10,
    },
  },


  grease: {
    weeklyRatePerTrap: 125,
    installPerTrap: 300,
  },


  green: {
    weeklyRatePerDrain: 5,
    installPerDrain: 100,
  },


  plumbing: {
    weeklyAddonPerDrain: 10, 
  },


  installationRules: {
    filthyMultiplier: 3, 
  },


  tripCharges: {
    standard: 0,
    beltway: 0,
  },


  billingConversions: {
    oneTime: {
      monthlyMultiplier: 0, 
    },
    weekly: {
      monthlyVisits: 4.33,         
      monthlyMultiplier: 4.33,     
    },
    biweekly: {
      monthlyMultiplier: 2.165,    
    },
    twicePerMonth: {
      monthlyMultiplier: 2.0,      
    },
    monthly: {
      monthlyMultiplier: 1.0,      
    },
    bimonthly: {
      monthlyMultiplier: 0.5,      
    },
    quarterly: {
      monthlyMultiplier: 0.333,    
    },
    biannual: {
      monthlyMultiplier: 0.167,    
    },
    annual: {
      monthlyMultiplier: 0.083,    
    },

    actualWeeksPerYear: 52,
    actualWeeksPerMonth: 4.33,
  },


  contract: {
    minMonths: 2,
    maxMonths: 36,
    defaultMonths: 12,
  },

  defaultFrequency: "weekly" as const,
  allowedFrequencies: [
    "oneTime",
    "weekly",
    "biweekly",
    "twicePerMonth",
    "monthly",
    "bimonthly",
    "quarterly",
    "biannual",
    "annual"
  ] as const,
} as const;

export type FoamingDrainConfig = typeof FOAMING_DRAIN_CONFIG;

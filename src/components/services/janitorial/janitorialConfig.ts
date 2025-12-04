// src/components/services/janitorial/janitorialConfig.ts
export const JANITORIAL_CONFIG = {
  // Base hourly rates for different service types
  baseRates: {
    recurringService: 30,       // $30/hour for recurring
    oneTimeService: 35,         // $35/hour for one-time
  },

  // Additional services with tiered pricing
  additionalServices: {
    vacuuming: {
      baseHours: 0.5,           // 30 minutes base
      ratePerHour: 25,          // $25/hour for additional vacuuming time
    },
    dusting: {
      baseHours: 0.33,          // 20 minutes base
      ratePerHour: 20,          // $20/hour for additional dusting time
    },
  },

  // Frequency multipliers
  frequencyMultipliers: {
    daily: 0.85,              // 15% discount for daily
    weekly: 1.0,              // Base rate
    biweekly: 1.1,            // 10% premium
    monthly: 1.25,            // 25% premium
    oneTime: 1.4,             // 40% premium
  },

  // Billing conversions
  billingConversions: {
    weekly: 50,               // 50 visits per year
    biweekly: 25,             // 25 visits per year
    monthly: 12,              // 12 visits per year
    quarterly: 4,             // 4 visits per year
  },

  // Minimum charges
  minimums: {
    perVisit: 50,             // $50 minimum per visit
    recurringContract: 200,    // $200 minimum for recurring contracts
  },

  // Trip charges (inherited from global settings but can override)
  tripCharges: {
    standard: 6,
    insideBeltway: 8,
    paidParking: 7,           // + actual parking cost
  },
} as const;

export const janitorialPricingConfig = JANITORIAL_CONFIG;
export type JanitorialConfig = typeof JANITORIAL_CONFIG;

// Type guards for validation
export function isJanitorialFrequency(value: string): value is keyof typeof JANITORIAL_CONFIG.frequencyMultipliers {
  return value in JANITORIAL_CONFIG.frequencyMultipliers;
}

export function isJanitorialServiceType(value: string): value is keyof typeof JANITORIAL_CONFIG.baseRates {
  return value in JANITORIAL_CONFIG.baseRates;
}
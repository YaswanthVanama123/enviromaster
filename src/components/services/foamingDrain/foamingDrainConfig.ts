// src/features/services/foamingDrain/foamingDrainConfig.ts

export const FOAMING_DRAIN_CONFIG = {
  // 1. Standard drain pricing
  //    Option A: $10 / drain
  //    Option B: $20 + $4 / drain
  standardDrainRate: 10, // $10 / drain
  altBaseCharge: 20, // $20 base
  altExtraPerDrain: 4, // +$4 per drain

  // 2. Volume / install-level pricing (10+ drains)
  //    If they want install-level service (10+ drains):
  //      • Weekly      → $20 / drain per visit
  //      • Every 2 mo  → $10 / drain per visit
  volumePricing: {
    minimumDrains: 10,
    weekly: {
      ratePerDrain: 20,
    },
    bimonthly: {
      ratePerDrain: 10,
    },
  },

  // 3. Grease traps (NOT standard drains)
  //    • Weekly:  $125 / trap
  //    • Install: $300 PER TRAP (one-time)
  grease: {
    weeklyRatePerTrap: 125,
    installPerTrap: 300,
  },

  // 4. Green drains
  //    • Weekly:  $5 / drain
  //    • Install: $100 PER DRAIN (one-time)
  green: {
    weeklyRatePerDrain: 5,
    installPerDrain: 100,
  },

  // 5. Plumbing add-on
  plumbing: {
    weeklyAddonPerDrain: 10, // +$10 / drain per visit
  },

  // 6. Installation rules for filthy standard drains
  installationRules: {
    filthyMultiplier: 3, // filthy = 3× install
  },

  // 7. Trip charges – kept only for display; NOT in math
  tripCharges: {
    standard: 0,
    beltway: 0,
  },

  // 8. Billing conversions (NEW RULES - ALL 9 FREQUENCIES)
  //    Weekly is the primary frequency; others use monthly multipliers
  billingConversions: {
    oneTime: {
      monthlyMultiplier: 0, // One-time service
    },
    weekly: {
      monthlyVisits: 4.33,         // used to compute MonthlyServiceCharge
      monthlyMultiplier: 4.33,     // standard monthly multiplier
    },
    biweekly: {
      monthlyMultiplier: 2.165,    // ~2 visits per month
    },
    twicePerMonth: {
      monthlyMultiplier: 2.0,      // exactly 2 visits per month
    },
    monthly: {
      monthlyMultiplier: 1.0,      // 1 visit per month
    },
    bimonthly: {
      monthlyMultiplier: 0.5,      // 1 visit every 2 months
    },
    quarterly: {
      monthlyMultiplier: 0.333,    // 1 visit every 3 months
    },
    biannual: {
      monthlyMultiplier: 0.167,    // 1 visit every 6 months
    },
    annual: {
      monthlyMultiplier: 0.083,    // 1 visit every 12 months
    },
    // Global settings
    actualWeeksPerYear: 52,
    actualWeeksPerMonth: 4.33,
  },

  // 9. Contract settings (used for "Annual" field = contract total)
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

// src/features/services/foamingDrain/foamingDrainConfig.ts

export const FOAMING_DRAIN_CONFIG = {
  // 1. Base drain pricing (from schema/rules)
  standardDrainRate: 10,       // $10 / drain standard
  largeDrainBaseCharge: 20,    // $20 + $4 / drain alternative
  largeDrainExtraPerDrain: 4,  // $4 per drain on top of base

  // 2. Volume pricing (10+ drains)
  volumePricing: {
    minimumDrains: 10,
    weekly: {
      ratePerDrain: 20,        // $20 / drain weekly when 10+ drains
      canWaiveInstall: true,
    },
    bimonthly: {
      ratePerDrain: 10,        // $10 / drain bi-monthly when 10+ drains
    },
  },

  // 3. Special drain types: grease traps & green drains
  specialDrains: {
    greaseTrap: {
      weeklyRate: 125,         // $125 / week per trap
      installMinimum: 300,     // $300 minimum install
      perTrapInstall: 150,     // used in Math.max(300, trapCount * 150)
    },
    greenDrain: {
      installCost: 100,        // $100 install per green drain
      weeklyRate: 5,           // $5 / week per green drain
    },
  },

  // 4. Installation rules
  installationRules: {
    standardMultiplier: 1,     // normal condition
    filthyMultiplier: 3,       // filthy drains = 3x
    canWaiveAsConcession: true,
    waiveForLargeVolume: true, // used when big-account $10/wk/drain deal applies
  },

  // 5. Trip charges
  tripCharges: {
    beltway: 8,                // $8 inside beltway
    standard: 6,               // $6 standard
    includedInAllInclusive: true, // waived for all-inclusive contracts
  },

  // 6. Frequency options (matches JSON)
  frequencyOptions: {
    weekly: {
      available: true,
      multiplier: 1.0,
    },
    bimonthly: {
      available: true,
      multiplier: 0.5,         // once every 2 months
      minimumDrains: 10,
    },
  },

  // 7. All-inclusive integration
  allInclusiveIntegration: {
    includedInPackage: true,
    noAdditionalCharge: true,
    standardDrainsOnly: true,  // grease traps are separate
  },

  // 8. Pricing flexibility rules
  pricingRules: {
    canOfferAlternativePricing: true, // alternative modes enabled
    plumbingWorkAddon: 10,           // +$10 / drain when plumbing needed
    canBundleWithOtherServices: true,
    canPriceAsIncluded: true,
  },

  // 9. Billing conversions (JSON: 50 / 4.2 weekly, 6 / 0.5 bi-monthly)
  billingConversions: {
    weekly: {
      annualMultiplier: 50,
      monthlyMultiplier: 4.2,
    },
    bimonthly: {
      annualMultiplier: 6,
      monthlyMultiplier: 0.5,
    },
  },

  // 10. Value proposition flags (not used in math, but kept for completeness)
  valueProposition: {
    odorElimination: true,
    flyPrevention: true,
    plumbingCostReduction: true,
    restaurantHygiene: true,
  },

  defaultFrequency: "weekly" as const,
  allowedFrequencies: ["weekly", "bimonthly"] as const,
} as const;

export type FoamingDrainConfig = typeof FOAMING_DRAIN_CONFIG;

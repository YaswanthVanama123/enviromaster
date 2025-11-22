// src/features/services/foamingDrain/foamingDrainConfig.ts

export const FOAMING_DRAIN_CONFIG = {
  // 1. Base drain pricing (from rules)
  //   Normal: $10 / drain
  //   Alt small-job: $20 + $4 / drain (weekly, < 10 drains)
  standardDrainRate: 10,       // $10 / drain standard
  largeDrainBaseCharge: 20,    // $20 base charge
  largeDrainExtraPerDrain: 4,  // $4 per drain on top of base

  // 2. Volume / install-level pricing (10+ drains)
  //    If they want install-level service (10+ drains):
  //      • Every week → $20 / drain
  //      • Every 2 mo → $10 / drain
  volumePricing: {
    minimumDrains: 10,
    weekly: {
      ratePerDrain: 20,        // $20 / drain weekly when 10+ drains
      canWaiveInstall: true,
    },
    bimonthly: {
      ratePerDrain: 10,        // $10 / drain every 2 months when 10+ drains
      canWaiveInstall: false,
    },
  },

  // 3. Special drains
  specialDrains: {
    // Grease traps are NOT standard drains:
    //   Charge $125 / wk and if possible $300 minimum for install.
    greaseTrap: {
      weeklyRate: 125,         // $125 / week per trap
      installMinimum: 300,     // $300 minimum install
      perTrapInstall: 150,     // used in Math.max(300, trapCount * 150)
    },
    // Green drain: $100 install / $5 wk.
    greenDrain: {
      installCost: 100,        // $100 install per green drain
      weeklyRate: 5,           // $5 / week per green drain
    },
  },

  // 4. Installation rules
  installationRules: {
    standardMultiplier: 1,     // normal condition
    filthyMultiplier: 3,       // filthy = 3x install
    canWaiveAsConcession: true,
    // Alternative if $10/wk/drain flies for large number of drains definitely
    // waive the install fee (big-account mode).
    waiveForLargeVolume: true,
  },

  // 5. Trip charges (same pattern as other services)
  tripCharges: {
    beltway: 8,                // $8 inside beltway
    standard: 6,               // $6 standard
    includedInAllInclusive: true, // waived for all-inclusive
  },

  // 6. Frequency options
  frequencyOptions: {
    weekly: {
      available: true,
      multiplier: 1.0,
    },
    bimonthly: {
      available: true,
      multiplier: 0.5,         // every 2 months → 6 services/year
      minimumDrains: 10,       // install-level rule is for 10+ drains
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
    canOfferAlternativePricing: true, // 20+4/drain & big-account 10/wk mode
    plumbingWorkAddon: 10,            // $10 / drain for plumbing
    canBundleWithOtherServices: true,
    canPriceAsIncluded: true,
  },

  // 9. Billing conversions
  // Weekly:
  //   - 50 weeks per year
  //   - 4.2 weeks per month
  // Bi-monthly (every 2 months):
  //   - 6 services per year
  //   - 0.5 services per month
  billingConversions: {
    weekly: {
      annualMultiplier: 52,
      monthlyMultiplier: 4,
    },
    bimonthly: {
      annualMultiplier: 6,
      monthlyMultiplier: 0.5,
    },
  },

  // 10. Value proposition flags (non-math)
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

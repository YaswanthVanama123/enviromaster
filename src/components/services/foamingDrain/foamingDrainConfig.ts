// src/features/services/foamingDrain/foamingDrainConfig.ts

export const FOAMING_DRAIN_CONFIG = {
  // 1. Base drain pricing (from rules)
  //    Normal: $10 / drain
  //    Alt small-job: $20 + $4 / drain (weekly, < 10 drains)
  standardDrainRate: 10,      // $10 / drain standard
  largeDrainBaseCharge: 20,   // $20 base charge for small-job alt
  largeDrainExtraPerDrain: 4, // $4 per drain on top of base (small-job alt)

  // 2. Volume / install-level pricing (10+ drains, "install level service")
  //    If they want install-level service (10+ drains):
  //      • Every week  → $20 / drain (service)
  //      • Every 2 mo  → $10 / drain (service)
  //      • Installation for 10+ drains → $10 / install drain
  volumePricing: {
    minimumDrains: 10,
    weekly: {
      ratePerDrain: 20,   // service rate for 10+ drains, weekly
      installPerDrain: 20 // install-level fee per install drain
    },
    bimonthly: {
      ratePerDrain: 10,   // service rate for 10+ drains, every 2 months
      installPerDrain: 10 // install-level fee per install drain
    }
  },

  // 3. Special drains (not part of standard floor drains)
  specialDrains: {
    // Grease traps are NOT standard drains:
    //   Charge $125 / week, and if possible $300 minimum for install.
    greaseTrap: {
      weeklyRate: 125,
      installMinimum: 300,
      perTrapInstall: 0 // used with Math.max(installMinimum, perTrapInstall * count)
    },
    // Green drain: $100 install / $5 week.
    greenDrain: {
      installCost: 100,
      weeklyRate: 5
    }
  },

  // 4. Installation rules (standard drains)
  installationRules: {
    filthyMultiplier: 3,         // filthy drains → 3× install
    waiveForLargeVolume: true    // in big-account $10/wk/drain mode, waive install
  },

  // 5. Trip charges
  tripCharges: {
    beltway: 8,                  // $8 inside beltway
    standard: 6,                 // $6 standard
    includedInAllInclusive: true // waived when all-inclusive
  },

  // 6. Plumbing + flexibility rules
  pricingRules: {
    plumbingWorkAddon: 10,       // +$10 / drain when plumbing needed
    canOfferAlternativePricing: true, // 20 + 4/drain, or big-account modes
    canBundleWithOtherServices: true
  },

  // 7. Billing conversions
  billingConversions: {
    weekly: {
      annualMultiplier: 52,
      monthlyMultiplier: 4
    },
    bimonthly: {
      annualMultiplier: 6,   // every 2 months
      monthlyMultiplier: 0.5 // 6 services/year ≈ 0.5 per month
    }
  },

  // 8. All-inclusive integration (standard drains included)
  allInclusiveIntegration: {
    includedInPackage: true,
    noAdditionalCharge: true,
    standardDrainsOnly: true // grease traps & green drains still billed
  },

  // 9. Value proposition flags (non-math, just documentation)
  valueProposition: {
    odorElimination: true,
    flyPrevention: true,
    plumbingCostReduction: true,
    restaurantHygiene: true
  },

  defaultFrequency: "weekly" as const,
  allowedFrequencies: ["weekly", "bimonthly"] as const
} as const;

export type FoamingDrainConfig = typeof FOAMING_DRAIN_CONFIG;

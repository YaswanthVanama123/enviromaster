// src/features/services/saniclean/sanicleanConfig.ts
import type {
  SanicleanLocation,
  SanicleanRateTier,
  SanicleanPricingConfig,
} from "./sanicleanTypes";

// Concrete pricing config that encodes all SaniClean rules.
export const SANICLEAN_CONFIG: SanicleanPricingConfig = {
  geographicPricing: {
    insideBeltway: {
      ratePerFixture: 7, // $7 / fixture weekly
      weeklyMinimum: 40, // $40 minimum
      tripCharge: 8,
      parkingFee: 7, // extra if we have to pay for parking
    },
    outsideBeltway: {
      ratePerFixture: 6, // $6 / fixture weekly
      weeklyMinimum: 40,
      tripCharge: 8,
    },
  },

  smallFacilityMinimum: {
    fixtureThreshold: 5, // 4–5 or fewer fixtures
    minimumWeeklyCharge: 50, // $50/wk including trip
    includesTripCharge: true,
  },

  allInclusivePackage: {
    weeklyRatePerFixture: 20, // $20 / fixture / week (≈ $900/mo for 11 fixtures)
    includeAllAddOns: true, // drains, mopping, etc. conceptually bundled
    waiveTripCharge: true, // "We will waive trip charge"
    waiveWarrantyFees: true, // "Warranty fee waived"
    autoAllInclusiveMinFixtures: 10, // in auto mode, 10+ fixtures -> all-inclusive
  },

  soapUpgrades: {
    standardToLuxury: 5, // $5 / dispenser / week
    excessUsageCharges: {
      standardSoap: 13, // $13/gal/wk over one fill
      luxurySoap: 30, // $30/gal/wk over one fill
    },
  },

  warrantyFeePerDispenser: 1, // $1/wk per soap/air-freshener dispenser

  paperCredit: {
    creditPerFixturePerWeek: 5, // $5/fixture/week paper credit in all-inclusive
  },

  facilityComponents: {
    // Example in rules: 2 urinals -> $16/mo (screens + mats)
    urinals: {
      urinalScreen: 8, // monthly per urinal
      urinalMat: 8, // monthly per urinal
    },
    // Example: 2 male toilets -> ~$4/mo (clips + seat cover dispensers)
    maleToilets: {
      toiletClips: 1.5, // monthly per toilet
      seatCoverDispenser: 0.5, // monthly per toilet (1.5 + 0.5) * 2 ≈ $4
    },
    // Example: 3 female toilets -> $12/mo of SaniPod service
    femaleToilets: {
      sanipodService: 4, // monthly per female toilet
    },
    // 4 sinks -> 4 soap, 2 air fresheners (6 dispensers)
    sinks: {
      ratioSinkToSoap: 1, // 1 soap dispenser per sink
      ratioSinkToAirFreshener: 2, // 1 air freshener per 2 sinks
    },
  },

  addOnServices: {
    microfiberMopping: {
      pricePerBathroom: 10, // $10 / bathroom / week
    },
  },

  billingConversions: {
    weekly: {
      // Tuned so that the all-inclusive example in the rules
      // (11 fixtures at $20/fixture/week) is exactly $900/month.
      //
      // 11 fixtures × $20/week = $220/week
      // $220 × 4.090909... = $900/month
      monthlyMultiplier: 4.0909090909,
      annualMultiplier: 50, // 50 service weeks / year
    },
  },

  rateTiers: {
    redRate: {
      multiplier: 1.0,
      commissionRate: 0.1,
    },
    greenRate: {
      multiplier: 1.3,
      commissionRate: 0.12,
    },
  } as Record<
    SanicleanRateTier,
    { multiplier: number; commissionRate: number }
  >,

  valueProposition: [
    "Enviro-Master’s core service since the Swisher days.",
    "Bathroom cleanliness signals whether an establishment is luxury or value-driven.",
    "Along with SaniScrub, SaniClean significantly reduces bacteria migration to back-of-house.",
    "Reduces time and chemicals for in-house staff doing daily restroom cleaning.",
  ],
} as const;

// Named export used by hooks
export const sanicleanPricingConfig = SANICLEAN_CONFIG;

// Convenience type
export type SanicleanConfig = typeof SANICLEAN_CONFIG;

// Handy helpers for narrowing enums from strings, if needed elsewhere
export function isSanicleanLocation(value: string): value is SanicleanLocation {
  return value === "insideBeltway" || value === "outsideBeltway";
}

export function isSanicleanRateTier(value: string): value is SanicleanRateTier {
  return value === "redRate" || value === "greenRate";
}

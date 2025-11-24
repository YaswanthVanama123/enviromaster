// src/features/services/saniclean/sanicleanConfig.ts
import type {
  SanicleanLocation,
  SanicleanRateTier,
  SanicleanPricingConfig,
} from "./sanicleanTypes";

export const SANICLEAN_CONFIG: SanicleanPricingConfig = {
  geographicPricing: {
    // Inside the Beltway: $7 / fixture, $40 minimum, trip charge removed (set to 0)
    insideBeltway: {
      ratePerFixture: 7,
      weeklyMinimum: 40,
      tripCharge: 0, // trip concept removed from calculations
      parkingFee: 0, // parking folded into 0 as well
    },
    // Outside the Beltway: $6 / fixture, same $40 minimum, trip charge removed (set to 0)
    outsideBeltway: {
      ratePerFixture: 6,
      weeklyMinimum: 40,
      tripCharge: 0, // trip concept removed from calculations
    },
  },

  // For 4–5 or fewer fixtures → $50 minimum
  smallFacilityMinimum: {
    fixtureThreshold: 5,
    minimumWeeklyCharge: 50,
    includesTripCharge: true, // historical note; trip itself is $0 now
  },

  // All-inclusive package:
  //   - SaniClean
  //   - SaniPod, urinal mats, paper & dispensers
  //   - microfiber mopping
  //   - monthly SaniScrub
  //   - no warranty fee
  //   - no trip charge (already 0 in geo)
  //   - priced at $20 / fixture / week
  allInclusivePackage: {
    weeklyRatePerFixture: 20,
    includeAllAddOns: true,
    waiveTripCharge: true,
    waiveWarrantyFees: true,
    autoAllInclusiveMinFixtures: 10, // auto-switch to all-inclusive for 10+ fixtures
  },

  // Soap upgrades + extra usage
  soapUpgrades: {
    standardToLuxury: 5, // $5 / wk / dispenser to upgrade to luxury soap
    excessUsageCharges: {
      standardSoap: 13, // $13 / gal / wk beyond one fill
      luxurySoap: 30,   // $30 / gal / wk beyond one fill
    },
  },

  // Warranty on dispensers when NOT all-inclusive
  warrantyFeePerDispenser: 1, // $1 / wk / dispenser (soap + air freshener)

  // Paper credit in all-inclusive mode
  paperCredit: {
    creditPerFixturePerWeek: 5, // $5 / wk / fixture credit towards paper
  },

  // Monthly component pricing (when NOT all-inclusive)
  facilityComponents: {
    // per-urinal monthly cost: screens + mats
    urinals: {
      urinalScreen: 4,
      urinalMat: 4,
    },
    // per-male-toilet monthly cost: clips + seat covers
    maleToilets: {
      toiletClips: 1.5,
      seatCoverDispenser: 0.5,
    },
    // per-female-toilet monthly cost: SaniPod service
    femaleToilets: {
      sanipodService: 4,
    },
    // sink → dispenser ratios
    sinks: {
      ratioSinkToSoap: 1,         // 1 soap per sink
      ratioSinkToAirFreshener: 2, // 1 air freshener per 2 sinks
    },
  },

  // Microfiber mopping add-on (NOT charged in all-inclusive)
  addOnServices: {
    microfiberMopping: {
      pricePerBathroom: 10, // $10 / bathroom / week
    },
  },

  // Conversions — global rule: Monthly = 4.33 × weekly, annual still 50 service weeks
  billingConversions: {
    weekly: {
      monthlyMultiplier: 4.33, // new rule: 4.33 weeks/month
      annualMultiplier: 50,    // 50 service weeks / year (kept for compatibility)
    },
  },

  rateTiers: {
    redRate: {
      multiplier: 1.0,
      commissionRate: 0.1,
    },
    greenRate: {
      multiplier: 1.0,
      commissionRate: 0.12,
    },
  } as Record<
    SanicleanRateTier,
    { multiplier: number; commissionRate: number }
  >,

  valueProposition: [
    "Enviro-Master’s core service since the Swisher days.",
    "Bathroom cleanliness signals whether a location can charge premium pricing.",
    "With SaniScrub, SaniClean reduces bacteria that can migrate to back-of-house.",
    "Reduces time and chemicals for existing staff between weekly sanitization visits.",
  ],
};

export const sanicleanPricingConfig = SANICLEAN_CONFIG;
export type SanicleanConfig = typeof SANICLEAN_CONFIG;

export function isSanicleanLocation(value: string): value is SanicleanLocation {
  return value === "insideBeltway" || value === "outsideBeltway";
}

export function isSanicleanRateTier(value: string): value is SanicleanRateTier {
  return value === "redRate" || value === "greenRate";
}

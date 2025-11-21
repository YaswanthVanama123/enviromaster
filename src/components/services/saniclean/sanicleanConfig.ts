// src/features/services/saniclean/sanicleanConfig.ts
import type { SanicleanPricingConfig } from "./sanicleanTypes";

export const sanicleanPricingConfig: SanicleanPricingConfig = {
  geographicPricing: {
    insideBeltway: {
      ratePerFixture: 7,   // $7 / fixture / week
      weeklyMinimum: 40,   // $40 minimum
      tripCharge: 8,       // base trip charge
      parkingFee: 7,       // additional if parking
    },
    outsideBeltway: {
      ratePerFixture: 6,   // $6 / fixture / week
      weeklyMinimum: 40,   // inferred from doc
      tripCharge: 8,
    },
  },

  smallFacilityMinimum: {
    fixtureThreshold: 5,         // 4–5 or less → $50 includes trip
    minimumWeeklyCharge: 50,     // $50/week including trip
    includesTripCharge: true,
  },

  allInclusivePackage: {
    // Treat as WEEKLY rate (20 × 4.2 ≈ 84/mo → close to “$900/mo for 11 fixtures” example)
    weeklyRatePerFixture: 20,
    waiveTripCharge: true,
    waiveWarrantyFees: true,
  },

  soapUpgrades: {
    standardToLuxury: 5, // $5/dispenser/week upgrade to luxury
    excessUsageCharges: {
      standardSoap: 13, // $13/gallon
      luxurySoap: 30,   // $30/gallon
    },
  },

  facilityComponents: {
    sinks: {
      ratioSinkToSoap: 1, // 1 soap per sink
    },
    urinals: {
      urinalScreen: 8, // $8/month
      urinalMat: 8,    // $8/month  → $16/month per urinal
    },
    maleToilets: {
      toiletClips: 2,         // $2/month
      seatCoverDispenser: 2,  // $2/month → $4/month per male toilet
    },
    femaleToilets: {
      sanipodService: 4, // $4/month per female toilet
    },
  },

  addOnServices: {
    microfiberMopping: {
      pricePerBathroom: 10, // $10 / bathroom / week
    },
  },

  tripChargeRules: {
    alwaysInclude: true,
    waiveForAllInclusive: true,
    smallFacilityInclusion: true, // already baked into $50 minimum
  },

  rateTiers: {
    redRate: {
      multiplier: 1.0,
    },
    greenRate: {
      multiplier: 1.3, // 30% above red
    },
  },

  billingConversions: {
    weekly: {
      annualMultiplier: 50,
      monthlyMultiplier: 4.2,
    },
  },

  autoAllInclusiveMinFixtures: 8,
};

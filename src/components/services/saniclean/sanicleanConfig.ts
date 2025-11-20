// src/features/services/saniclean/sanicleanConfig.ts
import type { SanicleanLocation, SanicleanRateTier } from "./sanicleanTypes";

export const SANICLEAN_CONFIG = {
  geographicPricing: {
    insideBeltway: {
      ratePerFixture: 7, // $7 / fixture weekly
      weeklyMinimum: 40, // $40 minimum
      tripCharge: 8,
      parkingFee: 7,
    },
    outsideBeltway: {
      ratePerFixture: 6, // $6 / fixture weekly
      weeklyMinimum: 40,
      tripCharge: 8,
    },
  } satisfies Record<
    SanicleanLocation,
    {
      ratePerFixture: number;
      weeklyMinimum: number;
      tripCharge: number;
      parkingFee?: number;
    }
  >,

  smallFacilityMinimum: {
    fixtureThreshold: 5, // 4–5 fixtures or less
    minimumCharge: 50, // includes trip charge
    includesTripCharge: true,
  },

  allInclusivePackage: {
    ratePerFixture: 20, // $20 / fixture monthly
    waiveTripCharge: true,
    waiveWarrantyFees: true,
  },

  soapUpgrades: {
    standardToLuxury: 5, // $5 / dispenser / week
    excessUsageCharges: {
      standardSoap: 13,
      luxurySoap: 30,
    },
  },

  paperManagement: {
    creditPerFixturePerWeek: 5,
  },

  basicServiceIncludes: {
    airFreshener: true,
    soapDispenser: true,
    electrostaticSpray: true,
    warrantyChargePerDispenser: 1,
  },

  facilityComponents: {
    urinals: {
      urinalScreen: 8, // /month
      urinalMat: 8, // /month
    },
    maleToilets: {
      toiletClips: 2, // /month
      seatCoverDispenser: 2, // /month
    },
    femaleToilets: {
      sanipodService: 4, // /month
    },
  },

  addOnServices: {
    microfiberMopping: {
      pricePerBathroom: 10, // $10 / bathroom
    },
    drainLineService: {
      ratePerDrain: 10, // $10 / drain / week
    },
  },

  tripChargeRules: {
    alwaysInclude: true,
    waiveForAllInclusive: true,
    parkingConsiderations: true,
  },

  rateTiers: {
    redRate: {
      multiplier: 1.0,
      commissionRate: 0.09,
    },
    greenRate: {
      multiplier: 1.3,
      commissionRate: 0.12,
    },
  } satisfies Record<
    SanicleanRateTier,
    { multiplier: number; commissionRate: number }
  >,

  billingConversions: {
    weekly: {
      annualMultiplier: 50,
      monthlyMultiplier: 4.2,
    },
    // if ever needed later:
    biweekly: {
      annualMultiplier: 25,
      monthlyMultiplier: 2.1,
    },
    monthly: {
      annualMultiplier: 12,
      monthlyMultiplier: 1,
    },
  },
} as const;

export type SanicleanConfig = typeof SANICLEAN_CONFIG;

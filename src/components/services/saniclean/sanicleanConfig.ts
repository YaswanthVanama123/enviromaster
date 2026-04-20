
import type {
  SanicleanLocation,
  SanicleanRateTier,
  SanicleanPricingConfig,
} from "./sanicleanTypes";

export const SANICLEAN_CONFIG: SanicleanPricingConfig = {

  allInclusivePackage: {
    weeklyRatePerFixture: 20, 
    exampleCalculation: {
      fixtures: 11, 
      monthlyTotal: 900, 
    },
    includes: {
      saniclean: true, 
      sanipodService: true, 
      urinalMats: true, 
      paperDispensers: true, 
      mopping: true, 
      monthlySaniscrub: true, 
      electrostaticSpray: true, 
      airFreshenerService: true, 
      soapService: true, 
      fragranceBar: true, 
    },
    waivedFees: {
      tripCharge: true, 
      warrantyFees: true, 
    },
    soapUpgrade: {
      luxuryUpgradePerDispenser: 5, 
      oneeFillIncluded: true, 
      excessUsageCharges: {
        standardSoap: 13, 
        luxurySoap: 30, 
      },
    },
    paperCredit: {
      creditPerFixturePerWeek: 5, 
      reasonableUsageIncluded: true, 
    },
    microfiberMopping: {
      pricePerBathroom: 10, 
      includedWithSani: true, 
    },
  },


  perItemCharge: {

    insideBeltway: {
      ratePerFixture: 7, 
      weeklyMinimum: 40, 
      tripCharge: 8, 
      parkingFee: 7, 
    },
    outsideBeltway: {
      ratePerFixture: 6, 
      weeklyMinimum: 0, 
      tripCharge: 8, 
    },


    smallFacility: {
      fixtureThreshold: 5, 
      minimumWeekly: 50, 
      includesTripCharge: true, 
    },


    facilityComponents: {

      sinks: {
        soapRatio: 1, 
        airFreshenerRatio: 0.5, 
        monthlySupplyCostPer6Dispensers: 8, 
        totalCostPer4Sinks: 70, 
      },


      urinals: {
        screenRatio: 1, 
        matRatio: 1, 
        monthlyCostPerUrinal: 8, 
        components: {
          urinalScreen: 4, 
          urinalMat: 4, 
        },
      },


      maleToilets: {
        clipRatio: 1, 
        seatCoverRatio: 1, 
        monthlyCostPerToilet: 2, 
        components: {
          toiletClips: 1, 
          seatCoverDispenser: 1, 
        },
      },


      femaleToilets: {
        sanipodRatio: 1, 
        monthlyCostPerToilet: 4, 
        components: {
          sanipodService: 4, 
        },
      },
    },


    basicIncludes: {
      electrostaticSpray: true, 
      airFreshenerService: true, 
      soapService: true, 
    },


    warrantyFees: {
      perDispenserPerWeek: 1, 
      appliesToSoap: true, 
      appliesToAirFreshener: true, 
    },
  },


  billingConversions: {
    weekly: {
      monthlyMultiplier: 4.33, 
      annualMultiplier: 50, 
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
    "Enviro-Master's core service since the Swisher days. This is what built the company.",
    "Bathroom cleanliness is viewed by consumers as a major indicator of whether they are in a luxury establishment and should be less price conscious or a barebones one where they should be very value driven. Customers can raise prices/margins based on bathroom aesthetics.",
    "Along with SaniScrub, there is a massive reduction in bacteria, which for restaurants is going to make their way to the back of house and food.",
    "Reduction in time and chemicals for existing staff providing daily (or more frequent) bathroom service. It saves the customer money while they get an improvement. Existing staff can use microfiber towels and mops with just water in between the weekly sanitization visits.",
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

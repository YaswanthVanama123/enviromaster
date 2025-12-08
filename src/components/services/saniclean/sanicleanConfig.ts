// src/features/services/saniclean/sanicleanConfig.ts
import type {
  SanicleanLocation,
  SanicleanRateTier,
  SanicleanPricingConfig,
} from "./sanicleanTypes";

export const SANICLEAN_CONFIG: SanicleanPricingConfig = {
  // All-Inclusive Package ($20/fixture/week, example: 11 fixtures = $900/mo)
  allInclusivePackage: {
    weeklyRatePerFixture: 20, // $20/fixture/week
    exampleCalculation: {
      fixtures: 11, // 11 fixtures
      monthlyTotal: 900, // $900/month (11 × $20 × 4.33 = $954.6 ≈ $900)
    },
    includes: {
      saniclean: true, // SaniClean service
      sanipodService: true, // SaniPod service included
      urinalMats: true, // Urinal mats included
      paperDispensers: true, // Paper dispensers included
      mopping: true, // Mopping included
      monthlySaniscrub: true, // Monthly SaniScrub included
      electrostaticSpray: true, // Free electrostatic spray
      airFreshenerService: true, // Free air freshener service (no warranty)
      soapService: true, // Free soap service (no warranty)
    },
    waivedFees: {
      tripCharge: true, // Trip charge waived
      warrantyFees: true, // Warranty fees waived
    },
    soapUpgrade: {
      luxuryUpgradePerDispenser: 5, // $5/dispenser/week to upgrade to luxury
      oneeFillIncluded: true, // One fill per week included
      excessUsageCharges: {
        standardSoap: 13, // $13/gallon for excess standard soap
        luxurySoap: 30, // $30/gallon for excess luxury soap
      },
    },
    paperCredit: {
      creditPerFixturePerWeek: 5, // $5/fixture/week credit for paper
      reasonableUsageIncluded: true, // Reasonable usage included
    },
    microfiberMopping: {
      pricePerBathroom: 10, // $10/bathroom when included with Sani
      includedWithSani: true, // Included in all-inclusive
    },
  },

  // Per Item Charge Model
  perItemCharge: {
    // Regional Pricing
    insideBeltway: {
      ratePerFixture: 7, // $7/fixture
      weeklyMinimum: 40, // $40 minimum
      tripCharge: 8, // $8 trip charge
      parkingFee: 7, // $7 additional if parking needed (careful about parking)
    },
    outsideBeltway: {
      ratePerFixture: 6, // $6/fixture
      weeklyMinimum: 0, // No minimum stated for outside beltway
      tripCharge: 8, // $8 trip charge
    },

    // Small Facility Rule (4-5 fixtures or less = $50 minimum includes trip)
    smallFacility: {
      fixtureThreshold: 5, // 5 fixtures or less
      minimumWeekly: 50, // $50 minimum
      includesTripCharge: true, // Includes trip charge
    },

    // Component Calculations (monthly rates converted to weekly in calculations)
    facilityComponents: {
      // Example: 4 sinks = 4 soap + 2 air freshener = 6 dispensers = $70 total, $8/mo supplies
      sinks: {
        soapRatio: 1, // 1 soap dispenser per sink
        airFreshenerRatio: 0.5, // 1 air freshener per 2 sinks
        monthlySupplyCostPer6Dispensers: 8, // $8/month supply cost for 6 dispensers
        totalCostPer4Sinks: 70, // $70 total monthly cost for 4 sinks (6 dispensers)
      },

      // Example: 2 urinals = 2 screens + 2 mats = $16/mo total
      urinals: {
        screenRatio: 1, // 1 screen per urinal
        matRatio: 1, // 1 mat per urinal
        monthlyCostPerUrinal: 8, // $8/month per urinal ($16 for 2)
        components: {
          urinalScreen: 4, // $4/month per screen
          urinalMat: 4, // $4/month per mat
        },
      },

      // Example: 2 male toilets = 2 clips + 2 seat covers = $4/mo total
      maleToilets: {
        clipRatio: 1, // 1 clip per toilet
        seatCoverRatio: 1, // 1 seat cover dispenser per toilet
        monthlyCostPerToilet: 2, // $2/month per toilet ($4 for 2)
        components: {
          toiletClips: 1, // $1/month per clip
          seatCoverDispenser: 1, // $1/month per dispenser
        },
      },

      // Example: 3 female toilets = 3 SaniPods = $12/mo total
      femaleToilets: {
        sanipodRatio: 1, // 1 SaniPod per toilet
        monthlyCostPerToilet: 4, // $4/month per toilet ($12 for 3)
        components: {
          sanipodService: 4, // $4/month per SaniPod
        },
      },
    },

    // Basic Includes (always included in per-item charge)
    basicIncludes: {
      electrostaticSpray: true, // Free electrostatic spray
      airFreshenerService: true, // Free air freshener service
      soapService: true, // Free soap service
    },

    // Warranty Fees (additional in per-item charge model)
    warrantyFees: {
      perDispenserPerWeek: 1, // $1/dispenser/week warranty fee
      appliesToSoap: true, // Applies to soap dispensers
      appliesToAirFreshener: true, // Applies to air freshener dispensers
    },
  },

  // Billing & Contract Conversions
  billingConversions: {
    weekly: {
      monthlyMultiplier: 4.33, // 4.33 weeks per month
      annualMultiplier: 50, // 50 service weeks per year
    },
  },

  // Rate Tiers (Red vs Green rates)
  rateTiers: {
    redRate: {
      multiplier: 1.0, // Standard rate
      commissionRate: 0.1, // 10% commission
    },
    greenRate: {
      multiplier: 1.0, // Same as red for now
      commissionRate: 0.12, // 12% commission
    },
  } as Record<
    SanicleanRateTier,
    { multiplier: number; commissionRate: number }
  >,

  // Value Proposition
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

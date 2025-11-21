// src/features/services/saniclean/sanicleanTypes.ts
import type { BaseServiceFormState } from "../common/serviceTypes";

export type SanicleanLocation = "insideBeltway" | "outsideBeltway";

export type SanicleanPricingMode =
  | "auto"
  | "all_inclusive"
  | "geographic_standard";

export type SanicleanRateTier = "redRate" | "greenRate";

export type SanicleanSoapType = "standard" | "luxury";

export interface SanicleanPricingConfig {
  geographicPricing: {
    insideBeltway: {
      ratePerFixture: number;
      weeklyMinimum: number;
      tripCharge: number;
      parkingFee: number;
    };
    outsideBeltway: {
      ratePerFixture: number;
      weeklyMinimum: number;
      tripCharge: number;
    };
  };

  smallFacilityMinimum: {
    fixtureThreshold: number;
    minimumWeeklyCharge: number;
    includesTripCharge: boolean;
  };

  // We will treat this as a WEEKLY rate per fixture (doc example: 20 × 4.2 ≈ 84/mo)
  allInclusivePackage: {
    weeklyRatePerFixture: number;
    waiveTripCharge: boolean;
    waiveWarrantyFees: boolean;
  };

  soapUpgrades: {
    standardToLuxury: number; // $/dispenser/week
    excessUsageCharges: {
      standardSoap: number; // $/gallon
      luxurySoap: number; // $/gallon
    };
  };

  facilityComponents: {
    urinals: {
      urinalScreen: number; // $/month
      urinalMat: number;    // $/month
    };
    maleToilets: {
      toiletClips: number;         // $/month
      seatCoverDispenser: number;  // $/month
    };
    femaleToilets: {
      sanipodService: number;      // $/month
    };
    sinks: {
      ratioSinkToSoap: number;
    };
  };

  addOnServices: {
    microfiberMopping: {
      pricePerBathroom: number; // $/bathroom/week
    };
  };

  tripChargeRules: {
    alwaysInclude: boolean;
    waiveForAllInclusive: boolean;
    smallFacilityInclusion: boolean;
  };

  rateTiers: {
    redRate: {
      multiplier: number;
    };
    greenRate: {
      multiplier: number;
    };
  };

  billingConversions: {
    weekly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
  };

  autoAllInclusiveMinFixtures: number;
}

export interface SanicleanFormState extends BaseServiceFormState {
  serviceId: "saniclean";

  // Core facility / geography
  fixtureCount: number;
  location: SanicleanLocation;
  needsParking: boolean;

  // How we choose pricing logic
  pricingMode: SanicleanPricingMode;

  // Facility breakdown for components + dispensers
  sinks: number;
  urinals: number;
  maleToilets: number;
  femaleToilets: number;

  // Soap & upgrades
  soapType: SanicleanSoapType;
  excessSoapGallonsPerWeek: number;

  // Microfiber mopping as an add-on
  addMicrofiberMopping: boolean;
  microfiberBathrooms: number;

  // Rate tier
  rateTier: SanicleanRateTier;

  // Notes (from BaseServiceFormState)
  notes: string;
}

// src/features/services/saniclean/sanicleanTypes.ts

export type SanicleanLocation = "insideBeltway" | "outsideBeltway";
export type SanicleanSoapType = "standard" | "luxury";
export type SanicleanPricingMode =
  | "auto"
  | "all_inclusive"
  | "geographic_standard";
export type SanicleanRateTier = "redRate" | "greenRate";

// Back-compat aliases
export type LocationKey = SanicleanLocation;
export type SoapType = SanicleanSoapType;
export type PricingMode = SanicleanPricingMode;

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

  allInclusivePackage: {
    weeklyRatePerFixture: number;
    includeAllAddOns: boolean;
    waiveTripCharge: boolean;
    waiveWarrantyFees: boolean;
    autoAllInclusiveMinFixtures: number;
  };

  soapUpgrades: {
    standardToLuxury: number;
    excessUsageCharges: {
      standardSoap: number;
      luxurySoap: number;
    };
  };

  warrantyFeePerDispenser: number;

  paperCredit: {
    creditPerFixturePerWeek: number;
  };

  facilityComponents: {
    urinals: {
      urinalScreen: number;
      urinalMat: number;
    };
    maleToilets: {
      toiletClips: number;
      seatCoverDispenser: number;
    };
    femaleToilets: {
      sanipodService: number;
    };
    sinks: {
      ratioSinkToSoap: number;
      ratioSinkToAirFreshener: number;
    };
  };

  addOnServices: {
    microfiberMopping: {
      pricePerBathroom: number;
    };
  };

  billingConversions: {
    weekly: {
      monthlyMultiplier: number;
      annualMultiplier: number;
    };
  };

  rateTiers: Record<
    SanicleanRateTier,
    {
      multiplier: number;
      commissionRate: number;
    }
  >;

  valueProposition: string[];
}

export interface SanicleanFormState {
  serviceId: "saniclean";

  // derived from sinks/urinals/toilets
  fixtureCount: number;

  // geo
  location: SanicleanLocation;
  needsParking: boolean;
  pricingMode: SanicleanPricingMode;

  // fixture breakdown
  sinks: number;
  urinals: number;
  maleToilets: number;
  femaleToilets: number;

  // soap
  soapType: SanicleanSoapType;
  excessSoapGallonsPerWeek: number;

  // microfiber mopping
  addMicrofiberMopping: boolean;
  microfiberBathrooms: number;

  // paper usage (for all-inclusive credit/overage)
  estimatedPaperSpendPerWeek: number;

  // rate tier (multiplier currently = 1 so pricing rules are unchanged)
  rateTier: SanicleanRateTier;

  // notes
  notes: string;
}

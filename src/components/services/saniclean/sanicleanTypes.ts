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

  // contract length (replaces "annual" logic globally)
  contractMonths: number;

  // rate tier (multiplier currently = 1 so pricing rules are unchanged)
  rateTier: SanicleanRateTier;

  // notes
  notes: string;

  // ========== EDITABLE PRICING RATES (fetched from backend or config) ==========
  // Geographic pricing rates
  insideBeltwayRatePerFixture: number;
  insideBeltwayWeeklyMinimum: number;
  insideBeltwayTripCharge: number;
  insideBeltwayParkingFee: number;
  outsideBeltwayRatePerFixture: number;
  outsideBeltwayWeeklyMinimum: number;
  outsideBeltwayTripCharge: number;

  // Small facility minimum
  smallFacilityThreshold: number;
  smallFacilityMinimumWeekly: number;

  // All-inclusive package
  allInclusiveWeeklyRate: number;
  allInclusiveMinFixtures: number;

  // Soap upgrades
  standardToLuxuryRate: number;
  excessStandardSoapRate: number;
  excessLuxurySoapRate: number;

  // Warranty
  warrantyFeePerDispenser: number;

  // Paper credit
  paperCreditPerFixturePerWeek: number;

  // Facility components (monthly rates)
  urinalScreenRate: number;
  urinalMatRate: number;
  toiletClipsRate: number;
  seatCoverDispenserRate: number;
  sanipodServiceRate: number;

  // Add-on services
  microfiberMoppingPerBathroom: number;

  // Billing conversions
  weeklyToMonthlyMultiplier: number;
  weeklyToAnnualMultiplier: number;

  // Rate tier multipliers
  redRateMultiplier: number;
  greenRateMultiplier: number;

  // ========== INDEPENDENT FIXTURE RATES (no auto-population) ==========
  sinkRate: number;
  urinalRate: number;
  maleToiletRate: number;
  femaleToiletRate: number;

  // ========== INDEPENDENT FACILITY COMPONENT RATES (no auto-population) ==========
  urinalComponentsQty: number;
  urinalComponentsRate: number;
  maleToiletComponentsQty: number;
  maleToiletComponentsRate: number;
  femaleToiletComponentsQty: number;
  femaleToiletComponentsRate: number;

  // ========== INDEPENDENT WARRANTY (no auto-population from sinks) ==========
  warrantyQty: number;
  warrantyRate: number;

  // ========== CUSTOM OVERRIDES (user can manually set totals) ==========
  customWeeklyBase?: number;
  customWeeklyTrip?: number;
  customFacilityComponents?: number;
  customSoapUpgrade?: number;
  customWarranty?: number;
  customMicrofiber?: number;
  customWeeklyTotal?: number;
  customMonthlyTotal?: number;
  customAnnualTotal?: number;
}

// src/features/services/saniclean/sanicleanTypes.ts

export type SanicleanLocation = "insideBeltway" | "outsideBeltway";
export type SanicleanSoapType = "standard" | "luxury";
export type SanicleanPricingMode =
  | "auto"
  | "all_inclusive"
  | "geographic_standard";
export type SanicleanRateTier = "redRate" | "greenRate";

// Back-compat aliases (used by some older helpers)
export type LocationKey = SanicleanLocation;
export type SoapType = SanicleanSoapType;
export type PricingMode = SanicleanPricingMode;

export interface SanicleanPricingConfig {
  // Inside vs outside beltway per-fixture pricing
  geographicPricing: {
    insideBeltway: {
      ratePerFixture: number; // $7 / fixture weekly
      weeklyMinimum: number; // $40 minimum
      tripCharge: number; // weekly trip charge
      parkingFee: number; // additional parking / week if needed
    };
    outsideBeltway: {
      ratePerFixture: number; // $6 / fixture weekly
      weeklyMinimum: number;
      tripCharge: number;
    };
  };

  // For 4–5 or fewer fixtures, $50/wk minimum including trip
  smallFacilityMinimum: {
    fixtureThreshold: number; // e.g., 5 fixtures
    minimumWeeklyCharge: number; // $50/week includes trip
    includesTripCharge: boolean;
  };

  // All-inclusive bundle
  allInclusivePackage: {
    weeklyRatePerFixture: number; // $20 / fixture / week (≈ $900/mo for 11 fixtures)
    includeAllAddOns: boolean; // drains, mopping, etc. conceptually bundled
    waiveTripCharge: boolean; // no trip charge
    waiveWarrantyFees: boolean; // no $1/wk warranty fee
    autoAllInclusiveMinFixtures: number; // if fixtures >= this and pricingMode=auto -> all-inclusive
  };

  // Soap upgrade + over-usage
  soapUpgrades: {
    standardToLuxury: number; // $5 / dispenser / week
    excessUsageCharges: {
      standardSoap: number; // $13 / gallon / week
      luxurySoap: number; // $30 / gallon / week
    };
  };

  // Warranty fee per dispenser (air freshener + soap)
  warrantyFeePerDispenser: number; // $1 / wk / dispenser

  // Paper credit for all-inclusive
  paperCredit: {
    creditPerFixturePerWeek: number; // $5 credit / fixture / week
  };

  // Facility components that are normally charged separately
  facilityComponents: {
    urinals: {
      urinalScreen: number; // monthly rate / urinal
      urinalMat: number; // monthly rate / urinal
    };
    maleToilets: {
      toiletClips: number; // monthly rate / toilet
      seatCoverDispenser: number; // monthly rate / toilet
    };
    femaleToilets: {
      sanipodService: number; // monthly rate / female toilet
    };
    sinks: {
      ratioSinkToSoap: number; // sinks : soap dispensers (e.g., 1:1)
      ratioSinkToAirFreshener: number; // sinks : air fresheners (e.g., 2:1)
    };
  };

  addOnServices: {
    microfiberMopping: {
      pricePerBathroom: number; // $10 / bathroom / week
    };
  };

  billingConversions: {
    weekly: {
      monthlyMultiplier: number; // e.g., 4.09
      annualMultiplier: number; // e.g., 50
    };
  };

  rateTiers: Record<
    SanicleanRateTier,
    {
      multiplier: number; // pricing multiplier
      commissionRate: number; // sales commission %
    }
  >;

  valueProposition: string[];
}

export interface SanicleanFormState {
  serviceId: "saniclean";

  // derived total fixtures
  fixtureCount: number;

  // geo + logistics
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

  // paper usage (for all-inclusive credit)
  estimatedPaperSpendPerWeek: number; // $ / week

  // rate tier
  rateTier: SanicleanRateTier;

  // freeform notes
  notes: string;
}

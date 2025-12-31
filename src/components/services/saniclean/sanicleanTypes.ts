// src/features/services/saniclean/sanicleanTypes.ts

export type SanicleanLocation = "insideBeltway" | "outsideBeltway";
export type SanicleanSoapType = "standard" | "luxury";
export type SanicleanPricingMode = "all_inclusive" | "per_item_charge";
export type SanicleanRateTier = "redRate" | "greenRate";

// ✅ NEW: Proper frequency type definition for dual frequency support
export type SanicleanFrequency = "oneTime" | "weekly" | "biweekly" | "twicePerMonth" | "monthly" | "bimonthly" | "quarterly" | "biannual" | "annual";

// ✅ NEW: Calculation mode derived from main service frequency
export type SanicleanCalculationMode = "monthly" | "perVisit";

// ✅ NEW: Frequency categorization for dual frequency logic
export const MONTHLY_AND_BELOW: SanicleanFrequency[] = ["weekly", "biweekly", "twicePerMonth", "monthly"];
export const ABOVE_MONTHLY: SanicleanFrequency[] = ["bimonthly", "quarterly", "biannual", "annual"];

// Back-compat aliases
export type LocationKey = SanicleanLocation;
export type SoapType = SanicleanSoapType;
export type PricingMode = SanicleanPricingMode;

export interface SanicleanPricingConfig {
  // All-Inclusive Package ($20/fixture/week example: 11 fixtures = $900/mo)
  allInclusivePackage: {
    weeklyRatePerFixture: number; // $20/fixture/week
    exampleCalculation: {
      fixtures: number; // 11
      monthlyTotal: number; // $900
    };
    includes: {
      saniclean: boolean; // true
      sanipodService: boolean; // true
      urinalMats: boolean; // true
      paperDispensers: boolean; // true
      mopping: boolean; // true
      monthlySaniscrub: boolean; // true
      electrostaticSpray: boolean; // true (free)
      airFreshenerService: boolean; // true (free, no warranty)
      soapService: boolean; // true (free, no warranty)
    };
    waivedFees: {
      tripCharge: boolean; // true
      warrantyFees: boolean; // true
    };
    soapUpgrade: {
      luxuryUpgradePerDispenser: number; // $5/dispenser/week
      oneeFillIncluded: boolean; // true
      excessUsageCharges: {
        standardSoap: number; // $13/gallon
        luxurySoap: number; // $30/gallon
      };
    };
    paperCredit: {
      creditPerFixturePerWeek: number; // $5/fixture/week
      reasonableUsageIncluded: boolean; // true
    };
    microfiberMopping: {
      pricePerBathroom: number; // $10/bathroom
      includedWithSani: boolean; // true
    };
  };

  // Per Item Charge Model
  perItemCharge: {
    // Regional Pricing
    insideBeltway: {
      ratePerFixture: number; // $7/fixture
      weeklyMinimum: number; // $40 minimum
      tripCharge: number; // $8 trip charge
      parkingFee: number; // $7 additional if parking needed
    };
    outsideBeltway: {
      ratePerFixture: number; // $6/fixture
      weeklyMinimum: number; // $0 (no minimum stated)
      tripCharge: number; // $8 trip charge
    };

    // Small Facility Rule (4-5 fixtures or less)
    smallFacility: {
      fixtureThreshold: number; // 5 fixtures or less
      minimumWeekly: number; // $50 minimum
      includesTripCharge: boolean; // true
    };

    // Component Calculations (monthly rates converted to weekly)
    facilityComponents: {
      // Example: 4 sinks = 4 soap + 2 air freshener = 6 dispensers = $70 total, $8/mo supplies
      sinks: {
        soapRatio: number; // 1 soap per sink
        airFreshenerRatio: number; // 1 air freshener per 2 sinks (0.5)
        monthlySupplyCostPer6Dispensers: number; // $8/month for supplies
        totalCostPer4Sinks: number; // $70 total for 6 dispensers
      };

      // Example: 2 urinals = 2 screens + 2 mats = $16/mo total
      urinals: {
        screenRatio: number; // 1 screen per urinal
        matRatio: number; // 1 mat per urinal
        monthlyCostPerUrinal: number; // $8/month per urinal ($16 for 2)
        components: {
          urinalScreen: number; // monthly cost per screen
          urinalMat: number; // monthly cost per mat
        };
      };

      // Example: 2 male toilets = 2 clips + 2 seat covers = $4/mo total
      maleToilets: {
        clipRatio: number; // 1 clip per toilet
        seatCoverRatio: number; // 1 seat cover dispenser per toilet
        monthlyCostPerToilet: number; // $2/month per toilet ($4 for 2)
        components: {
          toiletClips: number; // monthly cost per clip
          seatCoverDispenser: number; // monthly cost per dispenser
        };
      };

      // Example: 3 female toilets = 3 SaniPods = $12/mo total
      femaleToilets: {
        sanipodRatio: number; // 1 SaniPod per toilet
        monthlyCostPerToilet: number; // $4/month per toilet ($12 for 3)
        components: {
          sanipodService: number; // monthly cost per SaniPod
        };
      };
    };

    // Basic Includes (always included)
    basicIncludes: {
      electrostaticSpray: boolean; // true (free)
      airFreshenerService: boolean; // true (free service)
      soapService: boolean; // true (free service)
    };

    // Warranty Fees (not included in per-item)
    warrantyFees: {
      perDispenserPerWeek: number; // $1/dispenser/week
      appliesToSoap: boolean; // true
      appliesToAirFreshener: boolean; // true
    };
  };

  // Billing & Contract
  billingConversions: {
    weekly: {
      monthlyMultiplier: number; // 4.33 weeks per month
      annualMultiplier: number; // 50 service weeks per year
    };
  };

  // Rate Tiers
  rateTiers: Record<
    SanicleanRateTier,
    {
      multiplier: number;
      commissionRate: number;
    }
  >;

  // Value Proposition
  valueProposition: string[];
}

export interface SanicleanFormState {
  serviceId: "saniclean";

  // Pricing Model Selection
  pricingMode: SanicleanPricingMode; // "all_inclusive" | "per_item_charge"

  // Fixture Breakdown (always required)
  sinks: number;
  urinals: number;
  maleToilets: number;
  femaleToilets: number;
  fixtureCount: number; // derived: sinks + urinals + maleToilets + femaleToilets

  // Geographic Settings (for per-item-charge only)
  location: SanicleanLocation; // "insideBeltway" | "outsideBeltway"
  needsParking: boolean; // adds $7 parking fee if insideBeltway

  // Soap Configuration
  soapType: SanicleanSoapType; // "standard" | "luxury"
  excessSoapGallonsPerWeek: number; // beyond "one fill" for all-inclusive

  // Microfiber Mopping (always available)
  addMicrofiberMopping: boolean;
  microfiberBathrooms: number;

  // Paper Usage (all-inclusive only)
  estimatedPaperSpendPerWeek: number; // to calculate overage vs $5 credit

  // Warranty (per-item-charge only)
  warrantyDispensers: number; // calculated or manually set

  // Trip Charge Control (per-item-charge only)
  addTripCharge: boolean; // enable trip charge

  // Facility Components Enable/Disable (per-item-charge only)
  addUrinalComponents: boolean; // enable urinal screens & mats
  urinalScreensQty: number; // manually entered by salesman
  urinalMatsQty: number; // manually entered by salesman
  addMaleToiletComponents: boolean; // enable toilet clips & seat covers
  toiletClipsQty: number; // manually entered by salesman
  seatCoverDispensersQty: number; // manually entered by salesman
  addFemaleToiletComponents: boolean; // enable SaniPods
  sanipodsQty: number; // manually entered by salesman

  // Contract Terms
  contractMonths: number; // 2-36 months

  // Rate Tier
  rateTier: SanicleanRateTier; // "redRate" | "greenRate"

  // ✅ UPDATED: Dual frequency fields with proper typing
  mainServiceFrequency: SanicleanFrequency; // Primary service frequency (was just "frequency")
  facilityComponentsFrequency: SanicleanFrequency; // Independent facility component frequency

  // ✅ NEW: Derived calculation mode for internal logic
  calculationMode?: SanicleanCalculationMode; // Derived from mainServiceFrequency, not user-editable

  // Notes
  notes: string;

  // ========== BACKEND CONFIG RATES (auto-populated from backend) ==========

  // All-Inclusive Package
  allInclusiveWeeklyRatePerFixture: number; // $20/fixture/week
  luxuryUpgradePerDispenser: number; // $5/dispenser/week
  excessStandardSoapRate: number; // $13/gallon
  excessLuxurySoapRate: number; // $30/gallon
  paperCreditPerFixture: number; // $5/fixture/week
  microfiberMoppingPerBathroom: number; // $10/bathroom

  // Per-Item Geographic Rates
  insideBeltwayRatePerFixture: number; // $7/fixture
  insideBeltwayMinimum: number; // $40 minimum
  insideBeltwayTripCharge: number; // $8 trip
  insideBeltwayParkingFee: number; // $7 parking
  outsideBeltwayRatePerFixture: number; // $6/fixture
  outsideBeltwayTripCharge: number; // $8 trip

  // Small Facility
  smallFacilityThreshold: number; // 5 fixtures
  smallFacilityMinimum: number; // $50 includes trip

  // Component Monthly Rates (converted to weekly in calculations)
  urinalScreenMonthly: number;
  urinalMatMonthly: number;
  toiletClipsMonthly: number;
  seatCoverDispenserMonthly: number;
  sanipodServiceMonthly: number;

  // Warranty
  warrantyFeePerDispenserPerWeek: number; // $1/dispenser/week

  // Billing
  weeklyToMonthlyMultiplier: number; // 4.33
  weeklyToAnnualMultiplier: number; // 50

  // Rate Tiers
  redRateMultiplier: number; // 1.0
  greenRateMultiplier: number; // 1.0 (or whatever backend sets)

  // ========== CUSTOM OVERRIDES (user can manually set individual components & totals) ==========
  // Individual component overrides
  customBaseService?: number;
  customTripCharge?: number;
  customFacilityComponents?: number;
  customSoapUpgrade?: number;
  customExcessSoap?: number;
  customMicrofiberMopping?: number;
  customWarrantyFees?: number;
  customPaperOverage?: number;

  // Total overrides
  customWeeklyTotal?: number;
  customMonthlyTotal?: number;
  customContractTotal?: number;
  facilityComponentsMonthly?: number;
}

// Result of SaniClean calculations
export interface SanicleanQuoteResult {
  serviceId: "saniclean";
  displayName: string;
  pricingMode: SanicleanPricingMode;

  // Core Totals
  weeklyTotal: number;
  monthlyTotal: number;
  contractTotal: number;
  oneTimeTotal?: number;

  // ✅ NEW: Separate monthly totals for display
  baseServiceMonthly: number; // Base service monthly total (service × frequency)
  facilityComponentsMonthly: number; // Facility components monthly total (components × facility frequency)

  // Breakdown Components
  breakdown: {
    baseService: number; // core saniclean charge
    tripCharge: number; // $0 for all-inclusive, calculated for per-item
    facilityComponents: number; // monthly components converted to weekly
    soapUpgrade: number; // luxury upgrade cost
    excessSoap: number; // overage charges
    microfiberMopping: number; // add-on mopping
    warrantyFees: number; // $0 for all-inclusive, calculated for per-item
    paperOverage: number; // only for all-inclusive if over $5/fixture credit
  };

  // Dispenser Counts (for transparency)
  dispenserCounts: {
    soapDispensers: number; // = sinks
    airFresheners: number; // = sinks ÷ 2
    totalDispensers: number; // for warranty calculation
  };

  // Component Counts (for transparency)
  componentCounts: {
    urinalScreens: number;
    urinalMats: number;
    toiletClips: number;
    seatCoverDispensers: number;
    sanipods: number;
  };

  // What's Included Summary
  included: string[];
  excluded: string[];

  // Applied Rules
  appliedRules: string[];

  // Minimum charge for redline/greenline indicator
  minimumChargePerWeek: number;
}

// ✅ NEW: Enhanced frequency metadata for dual frequency calculations
export interface SanicleanEnhancedFrequencyMetadata {
  [key: string]: {
    monthlyRecurringMultiplier: number;    // For monthly mode calculations (e.g., weekly: 4.33)
    perVisitMultiplier: number;            // For per-visit mode calculations (usually 1.0)
    visitsPerYear: number;                 // Total visits per year (e.g., weekly: 52)
    cycleMonths?: number;                  // For visit-based frequencies (e.g., quarterly: 3)
    firstMonthExtraMultiplier?: number;    // Additional multiplier for first month
  };
}

// ✅ NEW: Dual frequency calculation helpers
export interface SanicleanDualFrequencyResult {
  calculationMode: SanicleanCalculationMode;
  mainServiceTotal: number;
  facilityComponentsTotal: number;
  combinedTotal: number;

  // Mode-specific totals
  monthlyTotal?: number;         // Only for monthly mode
  perVisitTotal?: number;        // Only for per-visit mode

  // Contract calculations
  contractTotal: number;
  visitsInContract?: number;     // Only for per-visit mode
}

// ✅ NEW: Frequency conversion utilities
export function getCalculationMode(frequency: SanicleanFrequency): SanicleanCalculationMode {
  return MONTHLY_AND_BELOW.includes(frequency) ? "monthly" : "perVisit";
}

export function isMonthlyModeFrequency(frequency: SanicleanFrequency): boolean {
  return MONTHLY_AND_BELOW.includes(frequency);
}

export function isPerVisitModeFrequency(frequency: SanicleanFrequency): boolean {
  return ABOVE_MONTHLY.includes(frequency);
}

// src/features/services/microfiberMopping/microfiberMoppingTypes.ts
import type { BaseServiceFormState } from "../common/serviceTypes";

export type MicrofiberFrequencyKey = "weekly" | "biweekly" | "monthly";

export interface MicrofiberMoppingPricingConfig {
  // Bathroom pricing when included with Sani services
  includedBathroomRate: number; // $ per standard bathroom per visit

  // "Huge" bathrooms priced by square footage instead of per bathroom
  hugeBathroomPricing: {
    enabled: boolean;
    ratePerSqFt: number; // $ per 300 sq ft unit (see sqFtUnit)
    sqFtUnit: number;
    description: string;
  };

  // Non-bathroom area pricing (add-on to an existing service)
  extraAreaPricing: {
    singleLargeAreaRate: number;      // $100 flat for a single big area
    extraAreaSqFtUnit: number;        // e.g. 400 sq ft
    extraAreaRatePerUnit: number;     // $10 per 400 sq ft
    useHigherRate: boolean;           // if true, bill max(unit price, singleLargeAreaRate)
  };

  // Stand-alone microfiber mopping pricing
  standalonePricing: {
    standaloneSqFtUnit: number;       // e.g. 200 sq ft
    standaloneRatePerUnit: number;    // $10 per 200 sq ft
    standaloneMinimum: number;        // $40 minimum
    includeTripCharge: boolean;       // whether to add trip charge on top
  };

  // Chemical sold for customer self-mopping
  chemicalProducts: {
    dailyChemicalPerGallon: number;   // $27.34 / gallon
    customerSelfMopping: boolean;
    waterOnlyBetweenServices: boolean;
  };

  // Equipment we provide (for copy / proposal)
  equipmentProvision: {
    mopHandlesOnInstall: boolean;
    microfiberMopsLeftBehind: boolean;
    commercialGradeMicrofiber: boolean;
    designedWashes: number;
    enhancedCleaningSpeed: number;    // % faster vs traditional mops
    microfiberDensity: string;
  };

  // Trip charges by location
  tripCharges: {
    insideBeltway: number;
    outsideBeltway: number;
    standard: number;
    parkingFee: number;
    waiveForAllInclusive: boolean;
  };

  // How this behaves inside an all-inclusive package
  allInclusiveIntegration: {
    includedInPackage: boolean;
    noAdditionalCharge: boolean;
    standardBathroomCoverage: boolean;
  };

  // Integration with other services
  serviceIntegration: {
    recommendCombineWithSaniScrub: boolean;
    installUpkeepNeeded: boolean;
    preventsBacteriaSpread: boolean;
    optimalPairing: string[];
  };

  // Frequency conversions
  billingConversions: {
    weekly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    biweekly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    monthly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    actualWeeksPerYear: number;
    actualWeeksPerMonth: number;
  };

  // Pricing rules / guard rails
  pricingRules: {
    canBundleWithSani: boolean;
    canPriceAsIncluded: boolean;
    customPricingForHugeBathrooms: boolean;
    alwaysIncludeTripChargeStandalone: boolean;
    authorizationRequired: {
      belowRedRates: boolean;
      authorizers: string[];
    };
  };

  // Rate categories (currently meta only)
  rateCategories: {
    redRate: {
      multiplier: number;
      commissionRate: string;
    };
    greenRate: {
      multiplier: number;
      commissionRate: string;
    };
  };

  // Value proposition (for UI copy)
  valueProposition: {
    bacterialReduction: boolean;
    costSavingsForCustomer: boolean;
    professionalEquipment: boolean;
    waterOnlyCleaning: boolean;
    enhancedEfficiency: boolean;
  };

  // Specs for proposals
  serviceSpecs: {
    microfiberSize: string;
    microfiberQuality: string;
    washLifecycle: number;
    performanceEnhancement: string;
    bacteriaPrevention: string;
  };

  // Defaults
  defaultFrequency: MicrofiberFrequencyKey;
  allowedFrequencies: MicrofiberFrequencyKey[];

  serviceType: string;
  category: string;
  availablePricingMethods: string[];
}

// REAL form inputs we use
export interface MicrofiberMoppingFormState extends BaseServiceFormState {
  frequency: MicrofiberFrequencyKey;

  hasExistingSaniService: boolean;

  // Standard bathrooms
  bathroomCount: number;

  // Huge bathroom exception
  isHugeBathroom: boolean;
  hugeBathroomSqFt: number;

  // Extra non-bath area (add-on)
  extraAreaSqFt: number;

  // Stand-alone mopping area (no Sani)
  standaloneSqFt: number;

  // Chemical for self-mopping (gallons/month)
  chemicalGallons: number;

  // All-inclusive package flag
  isAllInclusive: boolean;

  // For stand-alone trip charges
  location: "insideBeltway" | "outsideBeltway";
  needsParking: boolean;
}

// Calculator result
export interface MicrofiberMoppingCalcResult {
  standardBathroomPrice: number;
  hugeBathroomPrice: number;
  bathroomPrice: number;

  extraAreaPrice: number;

  standaloneServicePrice: number;
  standaloneTripCharge: number;
  standaloneTotal: number;

  chemicalSupplyMonthly: number;

  weeklyServiceTotal: number;
  weeklyTotalWithChemicals: number;
  perVisitPrice: number;
  annualPrice: number;
  monthlyRecurring: number;
}

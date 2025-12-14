// src/features/services/microfiberMopping/microfiberMoppingTypes.ts
import type { BaseServiceFormState } from "../common/serviceTypes";

export type MicrofiberFrequencyKey = "oneTime" | "weekly" | "biweekly" | "twicePerMonth" | "monthly" | "bimonthly" | "quarterly" | "biannual" | "annual";

/**
 * Static config for the Microfiber Mopping pricing engine.
 * Most of this is descriptive / guard-rail data used by the calculator + UI.
 */
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
    singleLargeAreaRate: number; // e.g. $100 flat for a single big area
    extraAreaSqFtUnit: number; // e.g. 400 sq ft
    extraAreaRatePerUnit: number; // e.g. $10 per 400 sq ft
    useHigherRate: boolean; // if true, bill max(unit price, singleLargeAreaRate)
  };

  // Stand-alone microfiber mopping pricing
  standalonePricing: {
    standaloneSqFtUnit: number; // e.g. 200 sq ft
    standaloneRatePerUnit: number; // e.g. $10 per 200 sq ft
    standaloneMinimum: number; // e.g. $40 minimum
    includeTripCharge: boolean; // kept for copy; math uses 0 trip now
  };

  // Chemical sold for customer self-mopping
  chemicalProducts: {
    dailyChemicalPerGallon: number; // e.g. $27.34 / gallon
    customerSelfMopping: boolean;
    waterOnlyBetweenServices: boolean;
  };

  // Equipment we provide (for proposal copy only)
  equipmentProvision: {
    mopHandlesOnInstall: boolean;
    microfiberMopsLeftBehind: boolean;
    commercialGradeMicrofiber: boolean;
    designedWashes: number;
    enhancedCleaningSpeed: number; // % faster vs traditional mops
    microfiberDensity: string;
  };

  // Trip charges by location – NOT used in math anymore, only for reference
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

  // Integration with other services (for copy)
  serviceIntegration: {
    recommendCombineWithSaniScrub: boolean;
    installUpkeepNeeded: boolean;
    preventsBacteriaSpread: boolean;
    optimalPairing: string[];
  };

  // Frequency conversions (key: actualWeeksPerMonth = 4.33)
  billingConversions: {
    oneTime: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    weekly: {
      annualMultiplier: number;
      monthlyMultiplier: number; // visits per month (4.33)
    };
    biweekly: {
      annualMultiplier: number;
      monthlyMultiplier: number; // visits per month (~2.17)
    };
    twicePerMonth: {
      annualMultiplier: number;
      monthlyMultiplier: number; // visits per month (2)
    };
    monthly: {
      annualMultiplier: number;
      monthlyMultiplier: number; // visits per month (1)
    };
    bimonthly: {
      annualMultiplier: number;
      monthlyMultiplier: number; // visits per month (0.5)
    };
    quarterly: {
      annualMultiplier: number;
      monthlyMultiplier: number; // visits per month (0.333)
    };
    biannual: {
      annualMultiplier: number;
      monthlyMultiplier: number; // visits per month (0.167)
    };
    annual: {
      annualMultiplier: number;
      monthlyMultiplier: number; // visits per month (0.083)
    };
    actualWeeksPerYear: number;
    actualWeeksPerMonth: number; // 4.33
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

  // Rate categories (meta only)
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

  // Value proposition (for copy)
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

/**
 * Actual form state used on the Microfiber Mopping screen.
 */
export interface MicrofiberMoppingFormState extends BaseServiceFormState {
  frequency: MicrofiberFrequencyKey;

  // NEW: contract length dropdown (2–36 months)
  contractTermMonths: number;

  // Tied to Sani program?
  hasExistingSaniService: boolean;

  // Standard bathrooms (per-bathroom pricing path)
  bathroomCount: number;

  // Huge bathroom exception
  isHugeBathroom: boolean;
  hugeBathroomSqFt: number;

  // Extra non-bathroom floor area (add-on)
  extraAreaSqFt: number;
  useExactExtraAreaSqft: boolean;  // true = exact calculation, false = block pricing

  // Stand-alone microfiber mopping area
  standaloneSqFt: number;
  useExactStandaloneSqft: boolean;  // true = exact calculation, false = direct pricing

  // Chemical we sell them for self-mopping (gallons/month)
  chemicalGallons: number;

  // If true, all microfiber is baked into an "all-inclusive" package pricing
  isAllInclusive: boolean;

  // Trip info (kept for UI only)
  location: "insideBeltway" | "outsideBeltway";
  needsParking: boolean;

  // ========== EDITABLE PRICING RATES (fetched from backend or config) ==========
  includedBathroomRate: number;         // $10 per bathroom
  hugeBathroomRatePerSqFt: number;      // $10 per 300 sq ft
  extraAreaRatePerUnit: number;         // $10 per 400 sq ft
  standaloneRatePerUnit: number;        // $10 per 200 sq ft
  dailyChemicalPerGallon: number;       // $27.34 per gallon

  // ========== CUSTOM OVERRIDES (user can manually set totals) ==========
  customStandardBathroomTotal?: number;
  customHugeBathroomTotal?: number;
  customExtraAreaTotal?: number;
  customStandaloneTotal?: number;
  customChemicalTotal?: number;
  customPerVisitPrice?: number;
  customMonthlyRecurring?: number;
  customFirstMonthPrice?: number;
  customContractTotal?: number;
}

/**
 * Calculator outputs (used both for UI display and quote summary).
 */
export interface MicrofiberMoppingCalcResult {
  standardBathroomPrice: number;
  hugeBathroomPrice: number;
  bathroomPrice: number;

  extraAreaPrice: number;

  standaloneServicePrice: number;
  standaloneTripCharge: number; // always 0 in math now
  standaloneTotal: number;

  chemicalSupplyMonthly: number;

  weeklyServiceTotal: number;
  weeklyTotalWithChemicals: number;

  perVisitPrice: number;
  annualPrice: number;
  monthlyRecurring: number;

  // NEW: first visit / first month / contract math
  firstVisitPrice: number;
  firstMonthPrice: number;
  contractMonths: number;
  contractTotal: number;
}

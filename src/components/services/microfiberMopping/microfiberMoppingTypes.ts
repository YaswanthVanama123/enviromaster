// src/features/services/microfiberMopping/microfiberMoppingTypes.ts
import type { BaseServiceFormState } from "../common/serviceTypes";

export type MicrofiberFrequencyKey = "weekly" | "biweekly" | "monthly";

export interface MicrofiberMoppingPricingConfig {
  includedBathroomRate: number;
  hugeBathroomException: boolean;

  extraAreaPricing: {
    singleLargeAreaRate: number;
    extraAreaSqFtUnit: number;
    extraAreaRatePerUnit: number;
    useHigherRate: boolean;
  };

  standalonePricing: {
    standaloneSqFtUnit: number;
    standaloneRatePerUnit: number;
    standaloneMinimum: number;
    includeTripCharge: boolean;
  };

  chemicalProducts: {
    dailyChemicalPerGallon: number;
    customerSelfMopping: boolean;
    waterOnlyBetweenServices: boolean;
  };

  equipmentProvision: {
    mopHandlesOnInstall: boolean;
    microfiberMopsLeftBehind: boolean;
    commercialGradeMicrofiber: boolean;
    designedWashes: number;
    enhancedCleaningSpeed: number;
    microfiberDensity: string;
  };

  tripCharges: {
    insideBeltway: number;
    outsideBeltway: number;
    parkingFee: number;
    waiveForAllInclusive: boolean;
  };

  allInclusiveIntegration: {
    includedInPackage: boolean;
    noAdditionalCharge: boolean;
    standardBathroomCoverage: boolean;
  };

  serviceIntegration: {
    recommendCombineWithSaniScrub: boolean;
    installUpkeepNeeded: boolean;
    preventsBacteriaSpread: boolean;
    optimalPairing: string[];
  };

  billingConversions: {
    weekly: { annualMultiplier: number; monthlyMultiplier: number };
    biweekly: { annualMultiplier: number; monthlyMultiplier: number };
    monthly: { annualMultiplier: number; monthlyMultiplier: number };
  };

  pricingRules: {
    canBundleWithSani: boolean;
    canPriceAsIncluded: boolean;
    customPricingForHugeBathrooms: boolean;
    alwaysIncludeTripChargeStandalone: boolean;
  };

  valueProposition: {
    bacterialReduction: boolean;
    costSavingsForCustomer: boolean;
    professionalEquipment: boolean;
    waterOnlyCleaning: boolean;
    enhancedEfficiency: boolean;
  };

  serviceSpecs: {
    microfiberSize: string;
    microfiberQuality: string;
    washLifecycle: number;
    performanceEnhancement: string;
    bacteriaPrevention: string;
  };

  defaultFrequency: string;
  allowedFrequencies: string[];

  serviceType: string;
  category: string;
  availablePricingMethods: string[];
}

// What the form actually edits
export interface MicrofiberMoppingFormState extends BaseServiceFormState {
  // a) “Is Combined with Sani?”
  hasExistingSaniService: boolean;

  // Bathrooms bundled with Sani
  bathroomCount: number;

  // Extra non-bathroom area (sq ft) added on top
  extraAreaSqFt: number;

  // Standalone mopping area (sq ft) when NOT bundled with Sani
  standaloneSqFt: number;

  // Chemical supply (for customer self-mopping)
  chemicalGallons: number;

  // All-inclusive toggle (usually false in UI, but kept for completeness)
  isAllInclusive: boolean;

  // Location / parking only affect standalone trip charges.
  location: "insideBeltway" | "outsideBeltway";
  needsParking: boolean;
}

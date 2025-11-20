// src/features/services/microfiberMopping/microfiberMoppingConfig.ts
import type { MicrofiberMoppingPricingConfig } from "./microfiberMoppingTypes";

export const microfiberMoppingPricingConfig: MicrofiberMoppingPricingConfig = {
  includedBathroomRate: 10,
  hugeBathroomException: true,

  extraAreaPricing: {
    singleLargeAreaRate: 100,
    extraAreaSqFtUnit: 400,
    extraAreaRatePerUnit: 10,
    useHigherRate: true,
  },

  standalonePricing: {
    standaloneSqFtUnit: 200,
    standaloneRatePerUnit: 10,
    standaloneMinimum: 40,
    includeTripCharge: true,
  },

  chemicalProducts: {
    dailyChemicalPerGallon: 27.34,
    customerSelfMopping: true,
    waterOnlyBetweenServices: true,
  },

  equipmentProvision: {
    mopHandlesOnInstall: true,
    microfiberMopsLeftBehind: true,
    commercialGradeMicrofiber: true,
    designedWashes: 300,
    enhancedCleaningSpeed: 0.1,
    microfiberDensity: "33% more than standard",
  },

  tripCharges: {
    insideBeltway: 8,
    outsideBeltway: 8,
    parkingFee: 7,
    waiveForAllInclusive: true,
  },

  allInclusiveIntegration: {
    includedInPackage: true,
    noAdditionalCharge: true,
    standardBathroomCoverage: true,
  },

  serviceIntegration: {
    recommendCombineWithSaniScrub: true,
    installUpkeepNeeded: true,
    preventsBacteriaSpread: true,
    optimalPairing: ["SaniClean", "SaniScrub"],
  },

  billingConversions: {
    weekly: { annualMultiplier: 50, monthlyMultiplier: 4.2 },
    biweekly: { annualMultiplier: 25, monthlyMultiplier: 2.1 },
    monthly: { annualMultiplier: 12, monthlyMultiplier: 1 },
  },

  pricingRules: {
    canBundleWithSani: true,
    canPriceAsIncluded: true,
    customPricingForHugeBathrooms: true,
    alwaysIncludeTripChargeStandalone: true,
  },

  valueProposition: {
    bacterialReduction: true,
    costSavingsForCustomer: true,
    professionalEquipment: true,
    waterOnlyCleaning: true,
    enhancedEfficiency: true,
  },

  serviceSpecs: {
    microfiberSize: "16x24 inches",
    microfiberQuality: "Commercial cleaning grade",
    washLifecycle: 300,
    performanceEnhancement: "10% enhanced speed in cleaning tests",
    bacteriaPrevention: "Prevents driving bacteria into grout",
  },

  defaultFrequency: "Weekly",
  allowedFrequencies: ["Weekly", "Bi-Weekly", "Monthly"],

  serviceType: "MicrofiberMopping",
  category: "Floor Maintenance",
  availablePricingMethods: ["included_with_sani", "standalone", "extra_area"],
};

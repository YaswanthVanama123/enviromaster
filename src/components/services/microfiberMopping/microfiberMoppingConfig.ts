// src/features/services/microfiberMopping/microfiberMoppingConfig.ts
import type { MicrofiberMoppingPricingConfig } from "./microfiberMoppingTypes";

export const microfiberMoppingPricingConfig: MicrofiberMoppingPricingConfig = {
  // $10 per bathroom when bundled with Sani (per visit)
  includedBathroomRate: 10,

  // Huge bathrooms: $10 per 300 sq ft
  hugeBathroomPricing: {
    enabled: true,
    ratePerSqFt: 10,
    sqFtUnit: 300,
    description:
      "For huge bathrooms charge $10 per 300 sq ft instead of $10 per bathroom.",
  },

  // Extra non-bathroom area when customer already has Sani
  // Rule: For a single large area, $100 OR $10 per 400 sq ft, whichever is more.
  extraAreaPricing: {
    singleLargeAreaRate: 100,
    extraAreaSqFtUnit: 400,
    extraAreaRatePerUnit: 10,
    useHigherRate: true,
  },

  // Stand-alone microfiber mopping (no Sani program)
  // Rule: $10 per 200 sq ft, $40 minimum, + trip charges.
  standalonePricing: {
    standaloneSqFtUnit: 200,
    standaloneRatePerUnit: 10,
    standaloneMinimum: 40,
    includeTripCharge: true,
  },

  // Chemical for customers doing their own mopping
  // Rule: sell Daily at $27.34 / gallon (diluted).
  chemicalProducts: {
    dailyChemicalPerGallon: 27.34,
    customerSelfMopping: true,
    waterOnlyBetweenServices: true,
  },

  equipmentProvision: {
    mopHandlesOnInstall: true,
    microfiberMopsLeftBehind: true,
    commercialGradeMicrofiber: true,
    designedWashes: 500,
    enhancedCleaningSpeed: 30,
    microfiberDensity: "High-density commercial microfiber",
  },

  tripCharges: {
    insideBeltway: 8,
    outsideBeltway: 8,
    standard: 6,
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
    optimalPairing: ["SaniScrub"],
  },

  billingConversions: {
    weekly: {
      annualMultiplier: 52, // treat as ~50 service weeks / year
      monthlyMultiplier: 4,
    },
    biweekly: {
      annualMultiplier: 25,
      monthlyMultiplier: 25 / 12,
    },
    monthly: {
      annualMultiplier: 12,
      monthlyMultiplier: 1,
    },
    actualWeeksPerYear: 52,
    actualWeeksPerMonth: 4,
  },

  pricingRules: {
    canBundleWithSani: true,
    canPriceAsIncluded: true,
    customPricingForHugeBathrooms: true,
    alwaysIncludeTripChargeStandalone: true,
    authorizationRequired: {
      belowRedRates: true,
      authorizers: ["Owner", "GM"],
    },
  },

  rateCategories: {
    redRate: {
      multiplier: 1,
      commissionRate: "20%",
    },
    greenRate: {
      multiplier: 1.3,
      commissionRate: "25%",
    },
  },

  valueProposition: {
    bacterialReduction: true,
    costSavingsForCustomer: true,
    professionalEquipment: true,
    waterOnlyCleaning: true,
    enhancedEfficiency: true,
  },

  serviceSpecs: {
    microfiberSize: '16" x 24"',
    microfiberQuality: "Commercial cleaning grade",
    washLifecycle: 500,
    performanceEnhancement: "Reduces grout damage vs wet mopping.",
    bacteriaPrevention: "Not driving bacteria into grout between scrubs.",
  },

  defaultFrequency: "weekly",
  allowedFrequencies: ["weekly", "biweekly", "monthly"],

  serviceType: "microfiberMopping",
  category: "Floor Maintenance",
  availablePricingMethods: [
    "included_with_sani",
    "standalone",
    "extra_area",
    "huge_bathroom",
  ],
};

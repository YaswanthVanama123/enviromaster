// src/features/services/microfiberMopping/microfiberMoppingConfig.ts
import type { MicrofiberMoppingPricingConfig } from "./microfiberMoppingTypes";

/**
 * Microfiber Mopping Pricing Configuration
 *
 * NOTE: These are DEFAULT/FALLBACK values.
 * The application will attempt to fetch pricing from the backend API first.
 * If the backend is unavailable or returns an error, these values will be used.
 *
 * To update production pricing:
 * 1. Update the backend ServiceConfig in MongoDB
 * 2. OR run: node scripts/seedMicrofiberMoppingPricing.js (when created)
 * 3. OR use the admin panel (when implemented)
 *
 * Basic rates are fetched from backend on component mount and override these defaults.
 */
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

  // Extra non-bathroom area:
  // $100 minimum for a single large area, or $10 per 400 sq ft (whichever is more)
  extraAreaPricing: {
    singleLargeAreaRate: 100,
    extraAreaSqFtUnit: 400,
    extraAreaRatePerUnit: 10,
    useHigherRate: true,
  },

  // Stand-alone microfiber mopping (no Sani program)
  // Rule: $10 per 200 sq ft, $40 minimum.
  standalonePricing: {
    standaloneSqFtUnit: 200,
    standaloneRatePerUnit: 10,
    standaloneMinimum: 40,
    includeTripCharge: true, // kept only for copy; math sets trip = 0
  },

  // Chemical for customers doing their own mopping
  // Rule: sell Daily at $27.34 / gallon (diluted).
  chemicalProducts: {
    dailyChemicalPerGallon: 27.34,
    customerSelfMopping: true,
    waterOnlyBetweenServices: true,
  },

  // What we provide physically
  equipmentProvision: {
    mopHandlesOnInstall: true,
    microfiberMopsLeftBehind: true,
    commercialGradeMicrofiber: true,
    designedWashes: 500,
    enhancedCleaningSpeed: 30, // ~30% faster
    microfiberDensity: "High-density commercial-grade microfiber",
  },

  // Trip charges (NOT used in math anymore, only for reference/UI copy)
  tripCharges: {
    insideBeltway: 75,
    outsideBeltway: 100,
    standard: 75,
    parkingFee: 0,
    waiveForAllInclusive: true,
  },

  // All-inclusive behavior
  allInclusiveIntegration: {
    includedInPackage: true,
    noAdditionalCharge: true,
    standardBathroomCoverage: true,
  },

  // Integration with other services
  serviceIntegration: {
    recommendCombineWithSaniScrub: true,
    installUpkeepNeeded: true,
    preventsBacteriaSpread: true,
    optimalPairing: ["SaniScrub", "SaniClean", "RPM Windows"],
  },

  // Frequency conversions
  // KEY CHANGE: Monthly = 4.33 weeks everywhere.
  billingConversions: {
    weekly: {
      annualMultiplier: 52,
      monthlyMultiplier: 52 / 12, // 4.33 visits / month
    },
    biweekly: {
      annualMultiplier: 26,
      monthlyMultiplier: 26 / 12, // ~2.17 visits / month
    },
    monthly: {
      annualMultiplier: 12,
      monthlyMultiplier: 1, // 1 visit / month
    },
    actualWeeksPerYear: 52,
    actualWeeksPerMonth: 52 / 12, // 4.33 weeks / month
  },

  // Guard rails
  pricingRules: {
    canBundleWithSani: true,
    canPriceAsIncluded: true,
    customPricingForHugeBathrooms: true,
    alwaysIncludeTripChargeStandalone: false,
    authorizationRequired: {
      belowRedRates: true,
      authorizers: ["Franchise Owner", "VP of Sales"],
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
    microfiberSize: "24-inch commercial microfiber mop pads",
    microfiberQuality: "High-density commercial-grade microfiber",
    washLifecycle: 500,
    performanceEnhancement:
      "30% faster and more effective than traditional mops",
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

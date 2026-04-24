
import type { MicrofiberMoppingPricingConfig } from "./microfiberMoppingTypes";


export const microfiberMoppingPricingConfig: MicrofiberMoppingPricingConfig = {

  includedBathroomRate: 10,


  hugeBathroomPricing: {
    enabled: true,
    ratePerSqFt: 10,
    sqFtUnit: 300,
    description:
      "For huge bathrooms charge $10 per 300 sq ft instead of $10 per bathroom.",
  },


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
    designedWashes: 500,
    enhancedCleaningSpeed: 30, 
    microfiberDensity: "High-density commercial-grade microfiber",
  },


  tripCharges: {
    insideBeltway: 75,
    outsideBeltway: 100,
    standard: 75,
    parkingFee: 0,
    waiveForAllInclusive: true,
  },


  minimumChargePerVisit: 50,


  allInclusiveIntegration: {
    includedInPackage: true,
    noAdditionalCharge: true,
    standardBathroomCoverage: true,
  },


  serviceIntegration: {
    recommendCombineWithSaniScrub: true,
    installUpkeepNeeded: true,
    preventsBacteriaSpread: true,
    optimalPairing: ["SaniScrub", "SaniClean", "RPM Windows"],
  },


  billingConversions: {
    oneTime: {
      annualMultiplier: 1,
      monthlyMultiplier: 0, 
    },
    weekly: {
      annualMultiplier: 52,
      monthlyMultiplier: 52 / 12, 
    },
    biweekly: {
      annualMultiplier: 26,
      monthlyMultiplier: 26 / 12, 
    },
    twicePerMonth: {
      annualMultiplier: 24,
      monthlyMultiplier: 2, 
    },
    monthly: {
      annualMultiplier: 12,
      monthlyMultiplier: 1,
    },
    everyFourWeeks: {
      annualMultiplier: 13,
      monthlyMultiplier: 1.0833,
    },
    bimonthly: {
      annualMultiplier: 6,
      monthlyMultiplier: 0.5, 
    },
    quarterly: {
      annualMultiplier: 4,
      monthlyMultiplier: 0.333, 
    },
    biannual: {
      annualMultiplier: 2,
      monthlyMultiplier: 0.167, 
    },
    annual: {
      annualMultiplier: 1,
      monthlyMultiplier: 0.083, 
    },
    actualWeeksPerYear: 52,
    actualWeeksPerMonth: 52 / 12, 
  },


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
  allowedFrequencies: ["weekly", "biweekly", "monthly", "everyFourWeeks"],

  serviceType: "microfiberMopping",
  category: "Floor Maintenance",
  availablePricingMethods: [
    "included_with_sani",
    "standalone",
    "extra_area",
    "huge_bathroom",
  ],
};


import type { BaseServiceFormState } from "../common/serviceTypes";

export type MicrofiberFrequencyKey = "oneTime" | "weekly" | "biweekly" | "twicePerMonth" | "monthly" | "everyFourWeeks" | "bimonthly" | "quarterly" | "biannual" | "annual";


export interface MicrofiberMoppingPricingConfig {

  includedBathroomRate: number; 


  hugeBathroomPricing: {
    enabled: boolean;
    ratePerSqFt: number; 
    sqFtUnit: number;
    description: string;
  };


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
    standard: number;
    parkingFee: number;
    waiveForAllInclusive: boolean;
  };


  minimumChargePerVisit: number;


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
    oneTime: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    weekly: {
      annualMultiplier: number;
      monthlyMultiplier: number; 
    };
    biweekly: {
      annualMultiplier: number;
      monthlyMultiplier: number; 
    };
    twicePerMonth: {
      annualMultiplier: number;
      monthlyMultiplier: number; 
    };
    monthly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    everyFourWeeks: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    bimonthly: {
      annualMultiplier: number;
      monthlyMultiplier: number; 
    };
    quarterly: {
      annualMultiplier: number;
      monthlyMultiplier: number; 
    };
    biannual: {
      annualMultiplier: number;
      monthlyMultiplier: number; 
    };
    annual: {
      annualMultiplier: number;
      monthlyMultiplier: number; 
    };
    actualWeeksPerYear: number;
    actualWeeksPerMonth: number; 
  };


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


  defaultFrequency: MicrofiberFrequencyKey;
  allowedFrequencies: MicrofiberFrequencyKey[];

  serviceType: string;
  category: string;
  availablePricingMethods: string[];
}


export interface MicrofiberMoppingFormState extends BaseServiceFormState {
  frequency: MicrofiberFrequencyKey;


  contractTermMonths: number;


  hasExistingSaniService: boolean;


  bathroomCount: number;


  isHugeBathroom: boolean;
  hugeBathroomSqFt: number;


  extraAreaSqFt: number;
  useExactExtraAreaSqft: boolean;  


  standaloneSqFt: number;
  useExactStandaloneSqft: boolean;  


  chemicalGallons: number;


  isAllInclusive: boolean;


  location: "insideBeltway" | "outsideBeltway";
  needsParking: boolean;


  includedBathroomRate: number;         
  hugeBathroomRatePerSqFt: number;      
  extraAreaRatePerUnit: number;         
  standaloneRatePerUnit: number;        
  dailyChemicalPerGallon: number;       


  customIncludedBathroomRate?: number;
  customHugeBathroomRatePerSqFt?: number;
  customExtraAreaRatePerUnit?: number;
  customStandaloneRatePerUnit?: number;
  customDailyChemicalPerGallon?: number;


  customStandardBathroomTotal?: number;
  customHugeBathroomTotal?: number;
  customExtraAreaTotal?: number;
  customStandaloneTotal?: number;
  customChemicalTotal?: number;
  customPerVisitPrice?: number;
  customMonthlyRecurring?: number;
  customFirstMonthPrice?: number;
  customContractTotal?: number;

  applyMinimum?: boolean;
}


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


  firstVisitPrice: number;
  firstMonthPrice: number;
  contractMonths: number;
  contractTotal: number;
  originalContractTotal: number;


  minimumChargePerVisit: number;
}

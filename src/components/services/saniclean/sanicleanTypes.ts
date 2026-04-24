

export type SanicleanLocation = "insideBeltway" | "outsideBeltway";
export type SanicleanSoapType = "standard" | "luxury";
export type SanicleanPricingMode = "all_inclusive" | "per_item_charge";
export type SanicleanRateTier = "redRate" | "greenRate";


export type SanicleanFrequency = "oneTime" | "weekly" | "biweekly" | "twicePerMonth" | "monthly" | "everyFourWeeks" | "bimonthly" | "quarterly" | "biannual" | "annual";


export type SanicleanCalculationMode = "monthly" | "perVisit";


export const MONTHLY_AND_BELOW: SanicleanFrequency[] = ["weekly", "biweekly", "twicePerMonth", "monthly", "everyFourWeeks"];
export const ABOVE_MONTHLY: SanicleanFrequency[] = ["bimonthly", "quarterly", "biannual", "annual"];


export type LocationKey = SanicleanLocation;
export type SoapType = SanicleanSoapType;
export type PricingMode = SanicleanPricingMode;

export interface SanicleanPricingConfig {

  allInclusivePackage: {
    weeklyRatePerFixture: number; 
    exampleCalculation: {
      fixtures: number; 
      monthlyTotal: number; 
    };
    includes: {
      saniclean: boolean; 
      sanipodService: boolean; 
      urinalMats: boolean; 
      paperDispensers: boolean; 
      mopping: boolean; 
      monthlySaniscrub: boolean; 
      electrostaticSpray: boolean; 
      airFreshenerService: boolean; 
      soapService: boolean; 
      fragranceBar: boolean; 
    };
    waivedFees: {
      tripCharge: boolean; 
      warrantyFees: boolean; 
    };
    soapUpgrade: {
      luxuryUpgradePerDispenser: number; 
      oneeFillIncluded: boolean; 
      excessUsageCharges: {
        standardSoap: number; 
        luxurySoap: number; 
      };
    };
    paperCredit: {
      creditPerFixturePerWeek: number; 
      reasonableUsageIncluded: boolean; 
    };
    microfiberMopping: {
      pricePerBathroom: number; 
      includedWithSani: boolean; 
    };
  };


  perItemCharge: {

    insideBeltway: {
      ratePerFixture: number; 
      weeklyMinimum: number; 
      tripCharge: number; 
      parkingFee: number; 
    };
    outsideBeltway: {
      ratePerFixture: number; 
      weeklyMinimum: number; 
      tripCharge: number; 
    };


    smallFacility: {
      fixtureThreshold: number; 
      minimumWeekly: number; 
      includesTripCharge: boolean; 
    };


    facilityComponents: {

      sinks: {
        soapRatio: number; 
        airFreshenerRatio: number; 
        monthlySupplyCostPer6Dispensers: number; 
        totalCostPer4Sinks: number; 
      };


      urinals: {
        screenRatio: number; 
        matRatio: number; 
        monthlyCostPerUrinal: number; 
        components: {
          urinalScreen: number; 
          urinalMat: number; 
        };
      };


      maleToilets: {
        clipRatio: number; 
        seatCoverRatio: number; 
        monthlyCostPerToilet: number; 
        components: {
          toiletClips: number; 
          seatCoverDispenser: number; 
        };
      };


      femaleToilets: {
        sanipodRatio: number; 
        monthlyCostPerToilet: number; 
        components: {
          sanipodService: number; 
        };
      };
    };


    basicIncludes: {
      electrostaticSpray: boolean; 
      airFreshenerService: boolean; 
      soapService: boolean; 
    };


    warrantyFees: {
      perDispenserPerWeek: number; 
      appliesToSoap: boolean; 
      appliesToAirFreshener: boolean; 
    };
  };


  billingConversions: {
    weekly: {
      monthlyMultiplier: number; 
      annualMultiplier: number; 
    };
  };


  rateTiers: Record<
    SanicleanRateTier,
    {
      multiplier: number;
      commissionRate: number;
    }
  >;


  valueProposition: string[];
}

export interface SanicleanFormState {
  serviceId: "saniclean";


  pricingMode: SanicleanPricingMode; 


  sinks: number;
  urinals: number;
  maleToilets: number;
  femaleToilets: number;
  fixtureCount: number; 


  location: SanicleanLocation; 
  needsParking: boolean; 


  soapType: SanicleanSoapType; 
  luxuryUpgradeQty?: number;
  excessSoapGallonsPerWeek: number; 


  addMicrofiberMopping: boolean;
  microfiberBathrooms: number;


  estimatedPaperSpendPerWeek: number; 


  warrantyDispensers: number; 


  addTripCharge: boolean; 


  addUrinalComponents: boolean; 
  urinalScreensQty: number; 
  urinalMatsQty: number; 
  addMaleToiletComponents: boolean; 
  toiletClipsQty: number; 
  seatCoverDispensersQty: number; 
  addFemaleToiletComponents: boolean; 
  sanipodsQty: number; 


  contractMonths: number; 


  rateTier: SanicleanRateTier; 


  mainServiceFrequency: SanicleanFrequency; 
  facilityComponentsFrequency: SanicleanFrequency; 


  calculationMode?: SanicleanCalculationMode; 


  notes: string;


  includedItems?: string[] | null;


  allInclusiveWeeklyRatePerFixture: number; 
  luxuryUpgradePerDispenser: number; 
  excessStandardSoapRate: number; 
  excessLuxurySoapRate: number; 
  paperCreditPerFixture: number; 
  microfiberMoppingPerBathroom: number; 


  insideBeltwayRatePerFixture: number; 
  insideBeltwayMinimum: number; 
  insideBeltwayTripCharge: number; 
  insideBeltwayParkingFee: number; 
  outsideBeltwayRatePerFixture: number; 
  outsideBeltwayTripCharge: number; 


  smallFacilityThreshold: number; 
  smallFacilityMinimum: number; 


  urinalScreenMonthly: number;
  urinalMatMonthly: number;
  toiletClipsMonthly: number;
  seatCoverDispenserMonthly: number;
  sanipodServiceMonthly: number;


  warrantyFeePerDispenserPerWeek: number; 


  weeklyToMonthlyMultiplier: number; 
  weeklyToAnnualMultiplier: number; 


  redRateMultiplier: number; 
  greenRateMultiplier: number; 


  customBaseService?: number;
  customTripCharge?: number;
  customFacilityComponents?: number;
  customSoapUpgrade?: number;
  customExcessSoap?: number;
  customMicrofiberMopping?: number;
  customWarrantyFees?: number;
  customPaperOverage?: number;


  customWeeklyTotal?: number;
  customMonthlyTotal?: number;
  customContractTotal?: number;
  facilityComponentsMonthly?: number;

  applyMinimum?: boolean;
}


export interface SanicleanQuoteResult {
  serviceId: "saniclean";
  displayName: string;
  pricingMode: SanicleanPricingMode;


  weeklyTotal: number;
  monthlyTotal: number;
  contractTotal: number;
  oneTimeTotal?: number;


  baseServiceMonthly: number; 
  facilityComponentsMonthly: number; 


  breakdown: {
    baseService: number; 
    tripCharge: number; 
    facilityComponents: number; 
    soapUpgrade: number; 
    excessSoap: number; 
    microfiberMopping: number; 
    warrantyFees: number; 
    paperOverage: number; 
  };


  dispenserCounts: {
    soapDispensers: number; 
    airFresheners: number; 
    totalDispensers: number; 
  };


  componentCounts: {
    urinalScreens: number;
    urinalMats: number;
    toiletClips: number;
    seatCoverDispensers: number;
    sanipods: number;
  };


  included: string[];
  excluded: string[];


  appliedRules: string[];


  minimumChargePerWeek: number;
}


export interface SanicleanEnhancedFrequencyMetadata {
  [key: string]: {
    monthlyRecurringMultiplier: number;    
    perVisitMultiplier: number;            
    visitsPerYear: number;                 
    cycleMonths?: number;                  
    firstMonthExtraMultiplier?: number;    
  };
}


export interface SanicleanDualFrequencyResult {
  calculationMode: SanicleanCalculationMode;
  mainServiceTotal: number;
  facilityComponentsTotal: number;
  combinedTotal: number;


  monthlyTotal?: number;         
  perVisitTotal?: number;        


  contractTotal: number;
  visitsInContract?: number;     
}


export function getCalculationMode(frequency: SanicleanFrequency): SanicleanCalculationMode {
  return MONTHLY_AND_BELOW.includes(frequency) ? "monthly" : "perVisit";
}

export function isMonthlyModeFrequency(frequency: SanicleanFrequency): boolean {
  return MONTHLY_AND_BELOW.includes(frequency);
}

export function isPerVisitModeFrequency(frequency: SanicleanFrequency): boolean {
  return ABOVE_MONTHLY.includes(frequency);
}

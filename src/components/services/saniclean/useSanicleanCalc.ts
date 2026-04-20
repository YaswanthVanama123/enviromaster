
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import type {
  SanicleanFormState,
  SanicleanPricingConfig,
  SanicleanQuoteResult,
  SanicleanPricingMode,
  SanicleanRateTier,
  SanicleanFrequency,
  SanicleanCalculationMode,
  SanicleanDualFrequencyResult,
} from "./sanicleanTypes";
import { getCalculationMode } from "./sanicleanTypes";
import { SANICLEAN_CONFIG } from "./sanicleanConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";


interface BackendSanicleanConfig {
  includedItems: {
    electrostaticSprayIncluded: boolean;
    includedWeeklyRefillsDefault: number;
  };
  warrantyFees: {
    airFreshenerDispenserWarrantyFeePerWeek: number;
    soapDispenserWarrantyFeePerWeek: number;
  };
  smallBathroomMinimums: {
    minimumFixturesThreshold: number;
    minimumPriceUnderThreshold: number;
  };
  allInclusivePricing: {
    pricePerFixture: number;
    includeAllAddOns: boolean;
    waiveTripCharge: boolean;
    waiveWarrantyFees: boolean;
    autoAllInclusiveMinFixtures: number;
  };
  soapUpgrades: {
    standardToLuxuryPerDispenserPerWeek: number;
    excessUsageCharges: {
      standardSoapPerGallon: number;
      luxurySoapPerGallon: number;
    };
  };
  paperCredit: {
    creditPerFixturePerWeek: number;
  };
  standardALaCartePricing: {
    insideBeltway: {
      pricePerFixture: number;
      minimumPrice: number;
      tripCharge: number;
      parkingFeeAddOn: number;
    };
    outsideBeltway: {
      pricePerFixture: number;
      tripCharge: number;
    };
  };
  monthlyAddOnSupplyPricing: {
    urinalMatMonthlyPrice: number;
    urinalScreenMonthlyPrice: string | number; 
    toiletClipMonthlyPrice: number;
    toiletSeatCoverDispenserMonthlyPrice: string | number; 
    sanipodMonthlyPricePerPod: number;
  };
  microfiberMoppingIncludedWithSaniClean: {
    pricePerBathroom: number;
    hugeBathroomSqFtUnit: number;
    hugeBathroomRate: number;
  };
  tripChargesNonAllInclusiveOnly: {
    standard: number;
    beltway: number;
  };
  minimumChargePerVisit: number;
  frequencyMetadata: {
    weekly: {
      monthlyRecurringMultiplier: number;
      firstMonthExtraMultiplier: number;
    };
    biweekly: {
      monthlyRecurringMultiplier: number;
      firstMonthExtraMultiplier: number;
    };
    monthly: { cycleMonths: number };
    bimonthly: { cycleMonths: number };
    quarterly: { cycleMonths: number };
    biannual: { cycleMonths: number };
    annual: { cycleMonths: number };
  };
  minContractMonths: number;
  maxContractMonths: number;
}

const resolveLuxuryUpgradeQty = (form: SanicleanFormState): number => {

  const sinkCount = Number.isFinite(form.sinks) ? form.sinks : 0;

  const overrideQty = Number.isFinite(form.luxuryUpgradeQty) ? form.luxuryUpgradeQty : sinkCount;

  return Math.max(0, overrideQty);

};


const DEFAULT_FORM: SanicleanFormState = {
  serviceId: "saniclean",


  pricingMode: "per_item_charge", 


  sinks: 0,
  urinals: 0,
  maleToilets: 0,
  femaleToilets: 0,
  fixtureCount: 0, 


  location: "insideBeltway",
  needsParking: false,


  soapType: "standard",
  excessSoapGallonsPerWeek: 0,


  addMicrofiberMopping: false,
  microfiberBathrooms: 0,


  estimatedPaperSpendPerWeek: 0,


  warrantyDispensers: 0,


  addTripCharge: false, 


  addUrinalComponents: false,
  urinalScreensQty: 0,
  urinalMatsQty: 0,
  addMaleToiletComponents: false,
  toiletClipsQty: 0,
  seatCoverDispensersQty: 0,
  addFemaleToiletComponents: false,
  sanipodsQty: 0,


  contractMonths: 12,


  rateTier: "redRate",


  mainServiceFrequency: "weekly" as SanicleanFrequency,          
  facilityComponentsFrequency: "weekly" as SanicleanFrequency,   


  frequency: "weekly", 
  facilityComponentFrequency: "weekly", 


  notes: "",


  allInclusiveWeeklyRatePerFixture: SANICLEAN_CONFIG.allInclusivePackage.weeklyRatePerFixture,
  luxuryUpgradePerDispenser: SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.luxuryUpgradePerDispenser,
  excessStandardSoapRate: SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.excessUsageCharges.standardSoap,
  excessLuxurySoapRate: SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.excessUsageCharges.luxurySoap,
  paperCreditPerFixture: SANICLEAN_CONFIG.allInclusivePackage.paperCredit.creditPerFixturePerWeek,
  microfiberMoppingPerBathroom: SANICLEAN_CONFIG.allInclusivePackage.microfiberMopping.pricePerBathroom,


  insideBeltwayRatePerFixture: SANICLEAN_CONFIG.perItemCharge.insideBeltway.ratePerFixture,
  insideBeltwayMinimum: SANICLEAN_CONFIG.perItemCharge.insideBeltway.weeklyMinimum,
  insideBeltwayTripCharge: SANICLEAN_CONFIG.perItemCharge.insideBeltway.tripCharge,
  insideBeltwayParkingFee: SANICLEAN_CONFIG.perItemCharge.insideBeltway.parkingFee,
  outsideBeltwayRatePerFixture: SANICLEAN_CONFIG.perItemCharge.outsideBeltway.ratePerFixture,
  outsideBeltwayTripCharge: SANICLEAN_CONFIG.perItemCharge.outsideBeltway.tripCharge,


  smallFacilityThreshold: SANICLEAN_CONFIG.perItemCharge.smallFacility.fixtureThreshold,
  smallFacilityMinimum: SANICLEAN_CONFIG.perItemCharge.smallFacility.minimumWeekly,


  urinalScreenMonthly: SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalScreen,
  urinalMatMonthly: SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalMat,
  toiletClipsMonthly: SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.toiletClips,
  seatCoverDispenserMonthly: SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.seatCoverDispenser,
  sanipodServiceMonthly: SANICLEAN_CONFIG.perItemCharge.facilityComponents.femaleToilets.components.sanipodService,


  warrantyFeePerDispenserPerWeek: SANICLEAN_CONFIG.perItemCharge.warrantyFees.perDispenserPerWeek,


  weeklyToMonthlyMultiplier: SANICLEAN_CONFIG.billingConversions.weekly.monthlyMultiplier,
  weeklyToAnnualMultiplier: SANICLEAN_CONFIG.billingConversions.weekly.annualMultiplier,


  redRateMultiplier: SANICLEAN_CONFIG.rateTiers.redRate.multiplier,
  greenRateMultiplier: SANICLEAN_CONFIG.rateTiers.greenRate.multiplier,

  applyMinimum: true,
};


const getFrequencyMultiplier = (frequency: string, backendConfig?: any): number => {

  if (backendConfig?.frequencyMetadata?.[frequency]) {
    const metadata = backendConfig.frequencyMetadata[frequency];


    if (typeof metadata.monthlyRecurringMultiplier === 'number') {
      return metadata.monthlyRecurringMultiplier;
    }


    if (typeof metadata.cycleMonths === 'number') {
      if (metadata.cycleMonths === 0) {
        return 1.0; 
      }
      return 1 / metadata.cycleMonths; 
    }
  }


  if (frequency === 'oneTime') {
    return 0; 
  }

  if (frequency === 'twicePerMonth') {
    return 2.0; 
  }


  const fallbackMultipliers: Record<string, number> = {
    weekly: 4.33,      
    biweekly: 2.165,   
    monthly: 1.0,      
    bimonthly: 0.5,    
    quarterly: 0.33,   
    biannual: 0.17,    
    annual: 0.083,     
  };

  console.log(`⚠️ [SaniClean] Using fallback multiplier for frequency: ${frequency}. Consider adding to backend frequencyMetadata.`);
  return fallbackMultipliers[frequency] || 4.33; 
};


const getDualFrequencyMultiplier = (
  frequency: SanicleanFrequency,
  mode: SanicleanCalculationMode,
  backendConfig?: any
): number => {

  if (mode === "monthly") {
    return getFrequencyMultiplier(frequency, backendConfig);
  }


  return 1.0; 
};


const calculateVisitsInContract = (
  frequency: SanicleanFrequency,
  contractMonths: number,
  backendConfig?: any
): number => {

  let visitsPerYear = 12; 

  if (backendConfig?.frequencyMetadata?.[frequency]?.visitsPerYear) {
    visitsPerYear = backendConfig.frequencyMetadata[frequency].visitsPerYear;
  } else if (backendConfig?.frequencyMetadata?.[frequency]?.cycleMonths) {


    const cycleMonths = backendConfig.frequencyMetadata[frequency].cycleMonths;
    visitsPerYear = cycleMonths > 0 ? 12 / cycleMonths : 12;
    console.log(`✅ [SaniClean] Calculated visitsPerYear from cycleMonths for ${frequency}: 12/${cycleMonths} = ${visitsPerYear}`);
  } else {

    const visitsPerYearMap: Record<string, number> = {
      weekly: 52,
      biweekly: 26,
      twicePerMonth: 24,
      monthly: 12,
      bimonthly: 6,
      quarterly: 4,
      biannual: 2,
      annual: 1,
    };
    visitsPerYear = visitsPerYearMap[frequency] || 12;
  }

  return Math.round((visitsPerYear * contractMonths) / 12);
};


const calculateDualFrequency = (
  mainServiceFrequency: SanicleanFrequency,
  facilityComponentsFrequency: SanicleanFrequency,
  mainServiceBasePrice: number,
  facilityComponentsBasePrice: number,
  contractMonths: number,
  backendConfig?: any
): SanicleanDualFrequencyResult => {

  const calculationMode = getCalculationMode(mainServiceFrequency);

  console.log(`🔧 [SaniClean] Dual frequency calculation:`, {
    mainServiceFrequency,
    facilityComponentsFrequency,
    calculationMode,
    mainServiceBasePrice,
    facilityComponentsBasePrice,
  });


  const facilityMultiplier = getFrequencyMultiplier(facilityComponentsFrequency, backendConfig);
  const facilityComponentsMonthly = facilityComponentsBasePrice * facilityMultiplier;
  const facilityContractTotal = facilityComponentsMonthly * contractMonths;

  if (calculationMode === "monthly") {

    const mainServiceMultiplier = getDualFrequencyMultiplier(mainServiceFrequency, "monthly", backendConfig);

    const mainServiceMonthly = mainServiceBasePrice * mainServiceMultiplier;
    const monthlyTotal = mainServiceMonthly + facilityComponentsMonthly;
    const contractTotal = (mainServiceMonthly * contractMonths) + facilityContractTotal;

    console.log(`📊 [SaniClean] Monthly mode calculation:`, {
      mainServiceMonthly,
      facilityComponentsMonthly,
      monthlyTotal,
      contractTotal,
    });

    return {
      calculationMode,
      mainServiceTotal: mainServiceMonthly,
      facilityComponentsTotal: facilityComponentsMonthly,
      combinedTotal: monthlyTotal,
      monthlyTotal,
      contractTotal,
    };
  } else {

    const mainServicePerVisit = mainServiceBasePrice; 

    const visitsInContract = calculateVisitsInContract(mainServiceFrequency, contractMonths, backendConfig);
    const mainServiceContractTotal = mainServicePerVisit * visitsInContract;
    const contractTotal = mainServiceContractTotal + facilityContractTotal;

    console.log(`📊 [SaniClean] Per-visit mode calculation:`, {
      mainServicePerVisit,
      facilityComponentsMonthly,
      perVisitTotal: mainServicePerVisit,
      visitsInContract,
      mainServiceContractTotal,
      facilityContractTotal,
      contractTotal,
    });

    return {
      calculationMode,
      mainServiceTotal: mainServicePerVisit,
      facilityComponentsTotal: facilityComponentsMonthly,
      combinedTotal: mainServicePerVisit, 
      perVisitTotal: mainServicePerVisit,
      monthlyTotal: facilityComponentsMonthly, 
      contractTotal,
      visitsInContract,
    };
  }
};

function recomputeFixtureCount(state: SanicleanFormState): SanicleanFormState {
  const total = Math.max(0, state.sinks) + Math.max(0, state.urinals) +
                Math.max(0, state.maleToilets) + Math.max(0, state.femaleToilets);
  return { ...state, fixtureCount: total };
}


function calculateAllInclusive(
  form: SanicleanFormState,
  config: BackendSanicleanConfig | SanicleanPricingConfig
): SanicleanQuoteResult {
  const fixtureCount = form.fixtureCount;


  if (fixtureCount === 0) {
    console.log('📊 [SaniClean] Service is inactive (0 fixtures), returning $0 totals');
    return {
      serviceId: "saniclean",
      displayName: "SaniClean",
      pricingMode: "all_inclusive",
      weeklyTotal: 0,
      monthlyTotal: 0,
      contractTotal: 0,
      baseServiceMonthly: 0,
      facilityComponentsMonthly: 0,
      breakdown: {
        baseService: 0,
        tripCharge: 0,
        facilityComponents: 0,
        soapUpgrade: 0,
        excessSoap: 0,
        microfiberMopping: 0,
        warrantyFees: 0,
        paperOverage: 0,
      },
      dispenserCounts: {
        soapDispensers: 0,
        airFresheners: 0,
        totalDispensers: 0,
      },
      componentCounts: {
        urinalScreens: 0,
        urinalMats: 0,
        toiletClips: 0,
        seatCoverDispensers: 0,
        sanipods: 0,
      },
      included: [],
      excluded: [],
      appliedRules: ["Service is inactive - no fixtures entered"],
      minimumChargePerWeek: 0,
    };
  }

  const rateTierMultiplier = form.rateTier === "greenRate" ? form.greenRateMultiplier : form.redRateMultiplier;


  const baseServiceCalc = fixtureCount * form.allInclusiveWeeklyRatePerFixture * rateTierMultiplier;
  const baseService = form.customBaseService ?? baseServiceCalc;
  const luxuryUpgradeQty = resolveLuxuryUpgradeQty(form);


  const soapUpgradeCalc = form.soapType === "luxury" ? luxuryUpgradeQty * form.luxuryUpgradePerDispenser : 0;
  const soapUpgrade = form.customSoapUpgrade ?? soapUpgradeCalc;


  const excessSoapCalc = form.excessSoapGallonsPerWeek > 0 ?
    form.excessSoapGallonsPerWeek * (form.soapType === "luxury" ? form.excessLuxurySoapRate : form.excessStandardSoapRate) : 0;
  const excessSoap = form.customExcessSoap ?? excessSoapCalc;


  const microfiberMoppingCalc = 0; 
  const microfiberMopping = form.customMicrofiberMopping ?? microfiberMoppingCalc;


  const paperCredit = fixtureCount * form.paperCreditPerFixture;
  const paperOverageCalc = Math.max(0, form.estimatedPaperSpendPerWeek - paperCredit);
  const paperOverage = form.customPaperOverage ?? paperOverageCalc;


  const tripChargeCalc = 0;
  const tripCharge = form.customTripCharge ?? tripChargeCalc;

  const warrantyFeesCalc = 0;
  const warrantyFees = form.customWarrantyFees ?? warrantyFeesCalc;

  const facilityComponentsCalc = 0;
  const facilityComponents = form.customFacilityComponents ?? facilityComponentsCalc;


  const mainServiceTotal = baseService + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage + tripCharge;


  const facilityComponentsTotal = facilityComponents;


  const dualFreqResult = calculateDualFrequency(
    form.mainServiceFrequency,
    form.facilityComponentsFrequency,
    mainServiceTotal,
    facilityComponentsTotal,
    form.contractMonths,
    config
  );


  const calculationMode = getCalculationMode(form.mainServiceFrequency);


  const weeklyTotal = calculationMode === "monthly"
    ? mainServiceTotal  
    : dualFreqResult.combinedTotal; 

  const monthlyTotal = dualFreqResult.monthlyTotal ?? dualFreqResult.combinedTotal;
  const contractTotal = dualFreqResult.contractTotal;

  console.log(`🔍 [SaniClean All-Inclusive] Frequency: ${form.mainServiceFrequency}, Mode: ${calculationMode}, ContractMonths: ${form.contractMonths}`, {
    mainServiceTotal_base: mainServiceTotal,
    facilityComponentsTotal_base: facilityComponentsTotal,
    weeklyTotal,
    monthlyTotal,
    contractTotal,
    dualFreqResult
  });


  const soapDispensers = form.sinks; 
  const airFresheners = Math.ceil(form.sinks / 2); 
  const totalDispensers = soapDispensers + airFresheners;


  const urinalScreens = form.urinals;
  const urinalMats = form.urinals;
  const toiletClips = form.maleToilets;
  const seatCoverDispensers = form.maleToilets;
  const sanipods = form.femaleToilets;


  const minimumChargePerWeek = 0;

  return {
    serviceId: "saniclean",
    displayName: "SaniClean - All Inclusive Package",
    pricingMode: "all_inclusive",
    weeklyTotal,
    monthlyTotal,
    contractTotal,

    baseServiceMonthly: dualFreqResult.mainServiceTotal,
    facilityComponentsMonthly: dualFreqResult.facilityComponentsTotal,
    breakdown: {
      baseService,
      tripCharge,
      facilityComponents,
      soapUpgrade,
      excessSoap,
      microfiberMopping,
      warrantyFees,
      paperOverage,
    },
    dispenserCounts: {
      soapDispensers,
      airFresheners,
      totalDispensers,
    },
    componentCounts: {
      urinalScreens,
      urinalMats,
      toiletClips,
      seatCoverDispensers,
      sanipods,
    },
    included: form.includedItems ?? [
      "SaniClean service",
      "SaniPod service",
      "Urinal mats",
      "Paper dispensers & reasonable usage",
      "Microfiber mopping",
      "Monthly SaniScrub",
      "Electrostatic spray (free)",
      "Air freshener service (no warranty fee)",
      "Soap service (no warranty fee)",
      "Fragrance Bar",
      `Paper credit: $${paperCredit.toFixed(2)}/week`,
    ],
    excluded: [
      "Trip charges (waived)",
      "Warranty fees (waived)",
    ],
    appliedRules: [
      `All-Inclusive: ${fixtureCount} fixtures ?- $${form.allInclusiveWeeklyRatePerFixture}/fixture/week`,
      form.soapType === "luxury" && luxuryUpgradeQty > 0 ? `Luxury soap upgrade: ${luxuryUpgradeQty} dispensers ?- $${form.luxuryUpgradePerDispenser}/week` : "",
      form.excessSoapGallonsPerWeek > 0 ? `Excess soap: ${form.excessSoapGallonsPerWeek} gallons ?- $${form.soapType === "luxury" ? form.excessLuxurySoapRate : form.excessStandardSoapRate}/gallon` : "",
      paperOverage > 0 ? `Paper overage: $${form.estimatedPaperSpendPerWeek} spend - $${paperCredit.toFixed(2)} credit = $${paperOverage.toFixed(2)}` : "",
      "All fees waived (trip, warranty)",
    ].filter(Boolean),
    minimumChargePerWeek,
  };
}


function calculatePerItemCharge(
  form: SanicleanFormState,
  config: BackendSanicleanConfig | SanicleanPricingConfig
): SanicleanQuoteResult {
  const fixtureCount = form.fixtureCount;


  if (fixtureCount === 0) {
    console.log('📊 [SaniClean] Service is inactive (0 fixtures), returning $0 totals');
    return {
      serviceId: "saniclean",
      displayName: "SaniClean",
      pricingMode: "per_item_charge",
      weeklyTotal: 0,
      monthlyTotal: 0,
      contractTotal: 0,
      baseServiceMonthly: 0,
      facilityComponentsMonthly: 0,
      breakdown: {
        baseService: 0,
        tripCharge: 0,
        facilityComponents: 0,
        soapUpgrade: 0,
        excessSoap: 0,
        microfiberMopping: 0,
        warrantyFees: 0,
        paperOverage: 0,
      },
      dispenserCounts: {
        soapDispensers: 0,
        airFresheners: 0,
        totalDispensers: 0,
      },
      componentCounts: {
        urinalScreens: 0,
        urinalMats: 0,
        toiletClips: 0,
        seatCoverDispensers: 0,
        sanipods: 0,
      },
      included: [],
      excluded: [],
      appliedRules: ["Service is inactive - no fixtures entered"],
      minimumChargePerWeek: 0,
    };
  }

  const rateTierMultiplier = form.rateTier === "greenRate" ? form.greenRateMultiplier : form.redRateMultiplier;


  const isInsideBeltway = form.location === "insideBeltway";
  const fixtureRate = isInsideBeltway ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture;
  const regionMinimum = isInsideBeltway ? form.insideBeltwayMinimum : 0;


  let baseServiceCalc = fixtureCount * fixtureRate * rateTierMultiplier;


  const isSmallFacility = fixtureCount <= form.smallFacilityThreshold;
  let tripChargeCalc = 0;

  if (isSmallFacility) {
    baseServiceCalc = form.applyMinimum !== false ? Math.max(baseServiceCalc, form.smallFacilityMinimum) : baseServiceCalc; 
    tripChargeCalc = 0; 
  } else {

    baseServiceCalc = Math.max(baseServiceCalc, regionMinimum);


    if (form.addTripCharge) {
      tripChargeCalc = isInsideBeltway ? form.insideBeltwayTripCharge : form.outsideBeltwayTripCharge;


      if (isInsideBeltway && form.needsParking) {
        tripChargeCalc += form.insideBeltwayParkingFee;
      }
    } else {
      tripChargeCalc = 0;
    }
  }


  const baseService = form.customBaseService ?? baseServiceCalc;
  const tripCharge = form.customTripCharge ?? tripChargeCalc;


  let facilityComponentsCalc = 0;


  const facilityFrequency = form.facilityComponentFrequency || 'weekly'; 


  if (form.addUrinalComponents) {
    const urinalComponentsBase = form.urinalScreensQty * form.urinalScreenMonthly + form.urinalMatsQty * form.urinalMatMonthly;
    facilityComponentsCalc += urinalComponentsBase;
  }

  if (form.addMaleToiletComponents) {
    const maleToiletComponentsBase = form.toiletClipsQty * form.toiletClipsMonthly + form.seatCoverDispensersQty * form.seatCoverDispenserMonthly;
    facilityComponentsCalc += maleToiletComponentsBase;
  }

  if (form.addFemaleToiletComponents) {
    const femaleToiletComponentsBase = form.sanipodsQty * form.sanipodServiceMonthly;
    facilityComponentsCalc += femaleToiletComponentsBase;
  }


  const facilityComponents = form.customFacilityComponents ?? facilityComponentsCalc;

  const luxuryUpgradeQty = resolveLuxuryUpgradeQty(form);


  const soapUpgradeCalc = form.soapType === "luxury" ? luxuryUpgradeQty * form.luxuryUpgradePerDispenser : 0;
  const soapUpgrade = form.customSoapUpgrade ?? soapUpgradeCalc;


  const excessSoapCalc = 0;
  const excessSoap = form.customExcessSoap ?? excessSoapCalc;


  const microfiberMoppingCalc = form.addMicrofiberMopping ?
    form.microfiberBathrooms * form.microfiberMoppingPerBathroom : 0;
  const microfiberMopping = form.customMicrofiberMopping ?? microfiberMoppingCalc;


  const soapDispensers = form.sinks;
  const airFresheners = Math.ceil(form.sinks / 2);
  const totalDispensers = soapDispensers + airFresheners;
  const warrantyFeesCalc = form.warrantyDispensers > 0 ?
    form.warrantyDispensers * form.warrantyFeePerDispenserPerWeek : 0;
  const warrantyFees = form.customWarrantyFees ?? warrantyFeesCalc;


  const paperOverageCalc = 0;
  const paperOverage = form.customPaperOverage ?? paperOverageCalc;


  const mainServiceTotal = baseService + tripCharge + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage;


  const facilityComponentsTotal = facilityComponents;


  const dualFreqResult = calculateDualFrequency(
    form.mainServiceFrequency,
    form.facilityComponentsFrequency,
    mainServiceTotal,
    facilityComponentsTotal,
    form.contractMonths,
    config
  );


  const calculationMode = getCalculationMode(form.mainServiceFrequency);


  const weeklyTotal = calculationMode === "monthly"
    ? mainServiceTotal  
    : dualFreqResult.combinedTotal; 

  const monthlyTotal = dualFreqResult.monthlyTotal ?? dualFreqResult.combinedTotal;
  const contractTotal = dualFreqResult.contractTotal;

  console.log(`🔍 [SaniClean Per-Item] Frequency: ${form.mainServiceFrequency}, Mode: ${calculationMode}, ContractMonths: ${form.contractMonths}`, {
    mainServiceTotal_base: mainServiceTotal,
    facilityComponentsTotal_base: facilityComponentsTotal,
    weeklyTotal,
    monthlyTotal,
    contractTotal,
    dualFreqResult
  });


  const urinalScreens = form.urinals;
  const urinalMats = form.urinals;
  const toiletClips = form.maleToilets;
  const seatCoverDispensers = form.maleToilets;
  const sanipods = form.femaleToilets;


  const minimumChargePerWeek = isSmallFacility
    ? form.smallFacilityMinimum
    : regionMinimum;

  return {
    serviceId: "saniclean",
    displayName: "SaniClean - Per Item Charge",
    pricingMode: "per_item_charge",
    weeklyTotal,
    monthlyTotal,
    contractTotal,

    baseServiceMonthly: dualFreqResult.mainServiceTotal,
    facilityComponentsMonthly: dualFreqResult.facilityComponentsTotal,
    breakdown: {
      baseService,
      tripCharge,
      facilityComponents: dualFreqResult.facilityComponentsTotal, 
      soapUpgrade,
      excessSoap,
      microfiberMopping,
      warrantyFees,
      paperOverage,
    },
    dispenserCounts: {
      soapDispensers,
      airFresheners,
      totalDispensers,
    },
    componentCounts: {
      urinalScreens,
      urinalMats,
      toiletClips,
      seatCoverDispensers,
      sanipods,
    },
    included: form.includedItems ?? [
      "SaniClean service",
      "Electrostatic spray (free)",
      "Air freshener service (free)",
      "Soap service (free)",
    ],
    excluded: [
      "SaniPod service ($4/month each)",
      "Urinal components ($8/month per urinal)",
      "Toilet components ($2/month per male toilet)",
      "Warranty fees ($1/dispenser/week)",
      "Microfiber mopping (optional add-on)",
    ],
    appliedRules: [
      `${isInsideBeltway ? "Inside" : "Outside"} Beltway: ${fixtureCount} fixtures × $${fixtureRate}/fixture`,
      isSmallFacility ? `Small facility (≤${form.smallFacilityThreshold} fixtures): $${form.smallFacilityMinimum} minimum includes trip` : "",
      !isSmallFacility && regionMinimum > 0 ? `Regional minimum: $${regionMinimum}` : "",
      !isSmallFacility ? `Trip charge: $${tripCharge - (form.needsParking && isInsideBeltway ? form.insideBeltwayParkingFee : 0)}` : "",
      form.needsParking && isInsideBeltway && !isSmallFacility ? `Parking fee: $${form.insideBeltwayParkingFee}` : "",
      dualFreqResult.facilityComponentsTotal > 0 ? `Facility components: $${dualFreqResult.facilityComponentsTotal.toFixed(2)}/month (${form.facilityComponentsFrequency})` : "",
      warrantyFees > 0 ? `Warranty: ${totalDispensers} dispensers × $${form.warrantyFeePerDispenserPerWeek}/week` : "",
      microfiberMopping > 0 ? `Microfiber mopping: ${form.microfiberBathrooms} bathrooms × $${form.microfiberMoppingPerBathroom}/week` : "",
    ].filter(Boolean),
    minimumChargePerWeek,
  };
}

export function useSanicleanCalc(initial?: Partial<SanicleanFormState>, customFields?: any[]) {

  const servicesContext = useServicesContextOptional();
  const isEditMode = useRef(!!initial);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);


  const calcFieldsTotal = useMemo(() => {
    if (!customFields || customFields.length === 0) return 0;

    const total = customFields.reduce((sum, field) => {
      if (field.type === "calc" && field.calcValues?.right) {
        const fieldTotal = parseFloat(field.calcValues.right) || 0;
        return sum + fieldTotal;
      }
      return sum;
    }, 0);

    console.log(`💰 [SANICLEAN-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
    return total;
  }, [customFields]);


  const dollarFieldsTotal = useMemo(() => {
    if (!customFields || customFields.length === 0) return 0;

    const total = customFields.reduce((sum, field) => {
      if (field.type === "dollar" && field.value) {
        const fieldValue = parseFloat(field.value) || 0;
        return sum + fieldValue;
      }
      return sum;
    }, 0);

    console.log(`💰 [SANICLEAN-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [form, setForm] = useState<SanicleanFormState>(() => {

    const initialFixtureCount = (initial?.sinks || 0) + (initial?.urinals || 0) +
                                 (initial?.maleToilets || 0) + (initial?.femaleToilets || 0);
    const isInitiallyActive = initialFixtureCount > 0;


    const defaultContractMonths = initial?.contractMonths
      ? initial.contractMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : 12;

    console.log(`📅 [SANICLEAN-INIT] Initializing contract months:`, {
      initialFixtureCount,
      isInitiallyActive,
      globalContractMonths: servicesContext?.globalContractMonths,
      defaultContractMonths,
      hasInitialValue: !!initial?.contractMonths
    });

    return recomputeFixtureCount({
      ...DEFAULT_FORM,
      ...initial,
      contractMonths: defaultContractMonths, 
    });
  });

  const [backendConfig, setBackendConfig] = useState<BackendSanicleanConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);


  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("saniclean");
        if (backendData?.config) {
          console.log('✅ [SaniClean] Using cached pricing data from context');
          const config = backendData.config as BackendSanicleanConfig;
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [SANICLEAN] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              customBaseService: undefined,
              customTripCharge: undefined,
              customFacilityComponents: undefined,
              customSoapUpgrade: undefined,
              customExcessSoap: undefined,
              customMicrofiberMopping: undefined,
              customWarrantyFees: undefined,
              customPaperOverage: undefined,
              customWeeklyTotal: undefined,
              customMonthlyTotal: undefined,
              customContractTotal: undefined,
            }));
          }

          console.log('✅ SaniClean CONFIG loaded from context:', {
            allInclusivePricing: config.allInclusivePricing,
            soapUpgrades: config.soapUpgrades,
            paperCredit: config.paperCredit,
            microfiberMoppingAddOn: config.microfiberMoppingAddOn,
            warrantyFees: config.warrantyFees,
            frequencyMetadata: config.frequencyMetadata,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for SaniClean, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch SaniClean config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("saniclean");
        if (fallbackConfig?.config) {
          console.log('✅ [SaniClean] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendSanicleanConfig;
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [SANICLEAN] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              customBaseService: undefined,
              customTripCharge: undefined,
              customFacilityComponents: undefined,
              customSoapUpgrade: undefined,
              customExcessSoap: undefined,
              customMicrofiberMopping: undefined,
              customWarrantyFees: undefined,
              customPaperOverage: undefined,
              customWeeklyTotal: undefined,
              customMonthlyTotal: undefined,
              customContractTotal: undefined,
            }));
          }

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };


  const updateFormWithConfig = (config: BackendSanicleanConfig, forceUpdate: boolean = false) => {
    if (isEditMode.current && !forceUpdate) {
      console.log('ÐY"< [SANICLEAN] Edit mode: skipping auto-overwrite from backend');
      return;
    }
    setForm((prev) => ({
      ...prev,


      allInclusiveWeeklyRatePerFixture: config.allInclusivePricing?.pricePerFixture ?? prev.allInclusiveWeeklyRatePerFixture,

      luxuryUpgradePerDispenser: config.soapUpgrades?.standardToLuxuryPerDispenserPerWeek ?? prev.luxuryUpgradePerDispenser,

      excessStandardSoapRate: config.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon ?? prev.excessStandardSoapRate,

      excessLuxurySoapRate: config.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon ?? prev.excessLuxurySoapRate,

      paperCreditPerFixture: config.paperCredit?.creditPerFixturePerWeek ?? prev.paperCreditPerFixture,

      microfiberMoppingPerBathroom: config.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom ?? prev.microfiberMoppingPerBathroom,


      insideBeltwayRatePerFixture: config.standardALaCartePricing?.insideBeltway?.pricePerFixture ?? prev.insideBeltwayRatePerFixture,

      insideBeltwayMinimum: config.standardALaCartePricing?.insideBeltway?.minimumPrice ?? prev.insideBeltwayMinimum,

      insideBeltwayTripCharge: config.standardALaCartePricing?.insideBeltway?.tripCharge ?? prev.insideBeltwayTripCharge,

      insideBeltwayParkingFee: config.standardALaCartePricing?.insideBeltway?.parkingFeeAddOn ?? prev.insideBeltwayParkingFee,

      outsideBeltwayRatePerFixture: config.standardALaCartePricing?.outsideBeltway?.pricePerFixture ?? prev.outsideBeltwayRatePerFixture,

      outsideBeltwayTripCharge: config.standardALaCartePricing?.outsideBeltway?.tripCharge ?? prev.outsideBeltwayTripCharge,


      smallFacilityThreshold: config.smallBathroomMinimums?.minimumFixturesThreshold ?? prev.smallFacilityThreshold,

      smallFacilityMinimum: config.smallBathroomMinimums?.minimumPriceUnderThreshold ?? prev.smallFacilityMinimum,


      urinalScreenMonthly: typeof config.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'number' ?
                           config.monthlyAddOnSupplyPricing.urinalScreenMonthlyPrice :
                           (config.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'included' ?
                            config.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice ?? prev.urinalScreenMonthly :
                            prev.urinalScreenMonthly),

      urinalMatMonthly: config.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice ?? prev.urinalMatMonthly,

      toiletClipsMonthly: config.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice ?? prev.toiletClipsMonthly,


      seatCoverDispenserMonthly: typeof config.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'number' ?
                                 config.monthlyAddOnSupplyPricing.toiletSeatCoverDispenserMonthlyPrice :
                                 (config.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'included' ?
                                  config.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice ?? prev.seatCoverDispenserMonthly :
                                  prev.seatCoverDispenserMonthly),

      sanipodServiceMonthly: config.monthlyAddOnSupplyPricing?.sanipodMonthlyPricePerPod ?? prev.sanipodServiceMonthly,


      warrantyFeePerDispenserPerWeek: (config.warrantyFees?.soapDispenserWarrantyFeePerWeek ??
                                       config.warrantyFees?.airFreshenerDispenserWarrantyFeePerWeek ??
                                       prev.warrantyFeePerDispenserPerWeek),


      weeklyToMonthlyMultiplier: config.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? prev.weeklyToMonthlyMultiplier,


      redRateMultiplier: prev.redRateMultiplier,
      greenRateMultiplier: prev.greenRateMultiplier,
    }));
  };


  useEffect(() => {
    console.log('�Y"< [SANICLEAN-PRICING] Fetching backend prices for baseline/override detection');
    fetchPricing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing(false);
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

  useEffect(() => {
    if (baselineInitialized.current) return;
    if (!backendConfig) return;

    baselineInitialized.current = true;

    const urinalScreenMonthlyDefault =
      typeof backendConfig.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'number'
        ? Number(backendConfig.monthlyAddOnSupplyPricing.urinalScreenMonthlyPrice)
        : backendConfig.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'included'
          ? Number(backendConfig.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice)
          : undefined;

    const seatCoverDispenserMonthlyDefault =
      typeof backendConfig.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'number'
        ? Number(backendConfig.monthlyAddOnSupplyPricing.toiletSeatCoverDispenserMonthlyPrice)
        : backendConfig.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'included'
          ? Number(backendConfig.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice)
          : undefined;

    const setBaseline = (field: keyof SanicleanFormState, value: unknown) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        (baselineValues.current as any)[field] = value;
      }
    };


    setBaseline('allInclusiveWeeklyRatePerFixture', (initial?.allInclusiveWeeklyRatePerFixture ?? backendConfig.allInclusivePricing?.pricePerFixture));
    setBaseline('luxuryUpgradePerDispenser', (initial?.luxuryUpgradePerDispenser ?? backendConfig.soapUpgrades?.standardToLuxuryPerDispenserPerWeek));
    setBaseline('excessStandardSoapRate', (initial?.excessStandardSoapRate ?? backendConfig.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon));
    setBaseline('excessLuxurySoapRate', (initial?.excessLuxurySoapRate ?? backendConfig.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon));
    setBaseline('paperCreditPerFixture', (initial?.paperCreditPerFixture ?? backendConfig.paperCredit?.creditPerFixturePerWeek));
    setBaseline('microfiberMoppingPerBathroom', (initial?.microfiberMoppingPerBathroom ?? backendConfig.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom));

    setBaseline('insideBeltwayRatePerFixture', (initial?.insideBeltwayRatePerFixture ?? backendConfig.standardALaCartePricing?.insideBeltway?.pricePerFixture));
    setBaseline('insideBeltwayMinimum', (initial?.insideBeltwayMinimum ?? backendConfig.standardALaCartePricing?.insideBeltway?.minimumPrice));
    setBaseline('insideBeltwayTripCharge', (initial?.insideBeltwayTripCharge ?? backendConfig.standardALaCartePricing?.insideBeltway?.tripCharge));
    setBaseline('insideBeltwayParkingFee', (initial?.insideBeltwayParkingFee ?? backendConfig.standardALaCartePricing?.insideBeltway?.parkingFeeAddOn));
    setBaseline('outsideBeltwayRatePerFixture', (initial?.outsideBeltwayRatePerFixture ?? backendConfig.standardALaCartePricing?.outsideBeltway?.pricePerFixture));
    setBaseline('outsideBeltwayTripCharge', (initial?.outsideBeltwayTripCharge ?? backendConfig.standardALaCartePricing?.outsideBeltway?.tripCharge));

    setBaseline('smallFacilityThreshold', (initial?.smallFacilityThreshold ?? backendConfig.smallBathroomMinimums?.minimumFixturesThreshold));
    setBaseline('smallFacilityMinimum', (initial?.smallFacilityMinimum ?? backendConfig.smallBathroomMinimums?.minimumPriceUnderThreshold));

    setBaseline('urinalMatMonthly', (initial?.urinalMatMonthly ?? backendConfig.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice));
    setBaseline('urinalScreenMonthly', (initial?.urinalScreenMonthly ?? urinalScreenMonthlyDefault));
    setBaseline('toiletClipsMonthly', (initial?.toiletClipsMonthly ?? backendConfig.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice));
    setBaseline('seatCoverDispenserMonthly', (initial?.seatCoverDispenserMonthly ?? seatCoverDispenserMonthlyDefault));
    setBaseline('sanipodServiceMonthly', (initial?.sanipodServiceMonthly ?? backendConfig.monthlyAddOnSupplyPricing?.sanipodMonthlyPricePerPod));

    setBaseline('warrantyFeePerDispenserPerWeek', (initial?.warrantyFeePerDispenserPerWeek ?? backendConfig.warrantyFees?.soapDispenserWarrantyFeePerWeek ?? backendConfig.warrantyFees?.airFreshenerDispenserWarrantyFeePerWeek));
    setBaseline('weeklyToMonthlyMultiplier', (initial?.weeklyToMonthlyMultiplier ?? backendConfig.frequencyMetadata?.weekly?.monthlyRecurringMultiplier));

    console.log('�o. [SANICLEAN-BASELINE] Initialized baseline values for logging:', baselineValues.current);
  }, [backendConfig, initial]);

  const pricingOverrides = useMemo(() => {
    if (!backendConfig) return {};

    const urinalScreenMonthlyDefault = typeof backendConfig.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'number'
      ? Number(backendConfig.monthlyAddOnSupplyPricing.urinalScreenMonthlyPrice)
      : backendConfig.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'included'
        ? Number(backendConfig.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice)
        : undefined;

    const seatCoverDispenserMonthlyDefault = typeof backendConfig.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'number'
      ? Number(backendConfig.monthlyAddOnSupplyPricing.toiletSeatCoverDispenserMonthlyPrice)
      : backendConfig.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'included'
        ? Number(backendConfig.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice)
        : undefined;

    const isOverride = (current: number, backendDefault: unknown) =>
      typeof backendDefault === 'number' && Number.isFinite(backendDefault) && current !== backendDefault;

    return {
      allInclusiveWeeklyRatePerFixture: isOverride(form.allInclusiveWeeklyRatePerFixture, backendConfig.allInclusivePricing?.pricePerFixture),
      luxuryUpgradePerDispenser: isOverride(form.luxuryUpgradePerDispenser, backendConfig.soapUpgrades?.standardToLuxuryPerDispenserPerWeek),
      excessStandardSoapRate: isOverride(form.excessStandardSoapRate, backendConfig.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon),
      excessLuxurySoapRate: isOverride(form.excessLuxurySoapRate, backendConfig.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon),
      paperCreditPerFixture: isOverride(form.paperCreditPerFixture, backendConfig.paperCredit?.creditPerFixturePerWeek),
      microfiberMoppingPerBathroom: isOverride(form.microfiberMoppingPerBathroom, backendConfig.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom),

      insideBeltwayRatePerFixture: isOverride(form.insideBeltwayRatePerFixture, backendConfig.standardALaCartePricing?.insideBeltway?.pricePerFixture),
      insideBeltwayMinimum: isOverride(form.insideBeltwayMinimum, backendConfig.standardALaCartePricing?.insideBeltway?.minimumPrice),
      insideBeltwayTripCharge: isOverride(form.insideBeltwayTripCharge, backendConfig.standardALaCartePricing?.insideBeltway?.tripCharge),
      insideBeltwayParkingFee: isOverride(form.insideBeltwayParkingFee, backendConfig.standardALaCartePricing?.insideBeltway?.parkingFeeAddOn),
      outsideBeltwayRatePerFixture: isOverride(form.outsideBeltwayRatePerFixture, backendConfig.standardALaCartePricing?.outsideBeltway?.pricePerFixture),
      outsideBeltwayTripCharge: isOverride(form.outsideBeltwayTripCharge, backendConfig.standardALaCartePricing?.outsideBeltway?.tripCharge),

      smallFacilityThreshold: isOverride(form.smallFacilityThreshold, backendConfig.smallBathroomMinimums?.minimumFixturesThreshold),
      smallFacilityMinimum: isOverride(form.smallFacilityMinimum, backendConfig.smallBathroomMinimums?.minimumPriceUnderThreshold),

      urinalMatMonthly: isOverride(form.urinalMatMonthly, backendConfig.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice),
      urinalScreenMonthly: isOverride(form.urinalScreenMonthly, urinalScreenMonthlyDefault),
      toiletClipsMonthly: isOverride(form.toiletClipsMonthly, backendConfig.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice),
      seatCoverDispenserMonthly: isOverride(form.seatCoverDispenserMonthly, seatCoverDispenserMonthlyDefault),
      sanipodServiceMonthly: isOverride(form.sanipodServiceMonthly, backendConfig.monthlyAddOnSupplyPricing?.sanipodMonthlyPricePerPod),

      warrantyFeePerDispenserPerWeek: isOverride(form.warrantyFeePerDispenserPerWeek, backendConfig.warrantyFees?.soapDispenserWarrantyFeePerWeek ?? backendConfig.warrantyFees?.airFreshenerDispenserWarrantyFeePerWeek),
      weeklyToMonthlyMultiplier: isOverride(form.weeklyToMonthlyMultiplier, backendConfig.frequencyMetadata?.weekly?.monthlyRecurringMultiplier),
    };
  }, [
    backendConfig,
    form.allInclusiveWeeklyRatePerFixture,
    form.luxuryUpgradePerDispenser,
    form.excessStandardSoapRate,
    form.excessLuxurySoapRate,
    form.paperCreditPerFixture,
    form.microfiberMoppingPerBathroom,
    form.insideBeltwayRatePerFixture,
    form.insideBeltwayMinimum,
    form.insideBeltwayTripCharge,
    form.insideBeltwayParkingFee,
    form.outsideBeltwayRatePerFixture,
    form.outsideBeltwayTripCharge,
    form.smallFacilityThreshold,
    form.smallFacilityMinimum,
    form.urinalMatMonthly,
    form.urinalScreenMonthly,
    form.toiletClipsMonthly,
    form.seatCoverDispenserMonthly,
    form.sanipodServiceMonthly,
    form.warrantyFeePerDispenserPerWeek,
    form.weeklyToMonthlyMultiplier,
  ]);


  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number,
    quantityOverride?: number,
    frequencyOverride?: string
  ) => {
    addPriceChange({
      productKey: `saniclean_${fieldName}`,
      productName: `SaniClean - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: quantityOverride ?? (form.fixtureCount || 1),
      frequency: frequencyOverride ?? (form.mainServiceFrequency || 'weekly')
    });

    console.log(`📝 [SANICLEAN-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.fixtureCount, form.mainServiceFrequency]);


  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef(form.fixtureCount > 0); 

  useEffect(() => {
    const isServiceActive = form.fixtureCount > 0;
    const wasActive = wasActiveRef.current;


    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {

      console.log(`📅 [SANICLEAN-CONTRACT] Service just became active, adopting global contract months`);
      if (servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
        const globalMonths = servicesContext.globalContractMonths;
        console.log(`📅 [SANICLEAN-CONTRACT] Syncing global contract months: ${globalMonths} (service just activated with ${form.fixtureCount} fixtures)`);
        setForm(prev => ({
          ...prev,
          contractMonths: globalMonths,
        }));
      }
    } else if (isServiceActive && servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {

      const globalMonths = servicesContext.globalContractMonths;
      if (form.contractMonths !== globalMonths) {
        console.log(`📅 [SANICLEAN-CONTRACT] Syncing global contract months: ${globalMonths} (service is active with ${form.fixtureCount} fixtures)`);
        setForm(prev => ({
          ...prev,
          contractMonths: globalMonths,
        }));
      }
    }


    wasActiveRef.current = isServiceActive;
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.fixtureCount, servicesContext]);


  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({
      ...prev,
      contractMonths: months,
    }));
    console.log(`📅 [SANICLEAN-CONTRACT] User override: ${months} months`);
  }, []);


  const quote: SanicleanQuoteResult = useMemo(() => {
    const config = backendConfig || SANICLEAN_CONFIG;


    const mappedForm = {
      ...form,

      mainServiceFrequency: form.mainServiceFrequency || (form.frequency as SanicleanFrequency) || "weekly",

      facilityComponentsFrequency: form.facilityComponentsFrequency || form.mainServiceFrequency || (form.frequency as SanicleanFrequency) || "weekly",
    };

    let baseQuote: SanicleanQuoteResult;
    if (mappedForm.pricingMode === "all_inclusive") {
      baseQuote = calculateAllInclusive(mappedForm, config);
    } else {
      baseQuote = calculatePerItemCharge(mappedForm, config);
    }


    const effectiveWeeklyTotal = mappedForm.customWeeklyTotal ?? baseQuote.weeklyTotal;
    const effectiveMonthlyTotal = mappedForm.customMonthlyTotal ?? baseQuote.monthlyTotal;
    const contractTotalBeforeCustomFields = mappedForm.customContractTotal ?? baseQuote.contractTotal;


    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const effectiveContractTotal = contractTotalBeforeCustomFields + customFieldsTotal;

    console.log(`📊 [SANICLEAN-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotalBeforeCustomFields.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: effectiveContractTotal.toFixed(2)
    });

    console.log(`🎯 [SaniClean Final Quote] Frequency: ${mappedForm.mainServiceFrequency}`, {
      baseQuote_weeklyTotal: baseQuote.weeklyTotal,
      baseQuote_monthlyTotal: baseQuote.monthlyTotal,
      baseQuote_contractTotal: baseQuote.contractTotal,
      effectiveWeeklyTotal,
      effectiveMonthlyTotal,
      effectiveContractTotal,
      customOverrides: {
        customWeeklyTotal: mappedForm.customWeeklyTotal,
        customMonthlyTotal: mappedForm.customMonthlyTotal,
        customContractTotal: mappedForm.customContractTotal
      }
    });

    return {
      ...baseQuote,
      weeklyTotal: effectiveWeeklyTotal,
      monthlyTotal: effectiveMonthlyTotal,
      contractTotal: effectiveContractTotal, 
    };
  }, [form, backendConfig, calcFieldsTotal, dollarFieldsTotal]);


  const updateForm = (updates: Partial<SanicleanFormState>) => {
    setForm((prev) => {

      const originalValues: any = {};
      Object.keys(updates).forEach(key => {
        originalValues[key] = prev[key as keyof SanicleanFormState];
      });

      const next = { ...prev, ...updates };


      const baseInputFields = [
        'sinks', 'urinals', 'maleToilets', 'femaleToilets',
        'location', 'needsParking', 'soapType', 'excessSoapGallonsPerWeek',
        'addMicrofiberMopping', 'microfiberBathrooms', 'estimatedPaperSpendPerWeek',
        'warrantyDispensers', 'addTripCharge', 'pricingMode',
        'addUrinalComponents', 'urinalScreensQty', 'urinalMatsQty',
        'addMaleToiletComponents', 'toiletClipsQty', 'seatCoverDispensersQty',
        'addFemaleToiletComponents', 'sanipodsQty',
        'contractMonths', 'rateTier'
      ];

      const isBaseInputChange = Object.keys(updates).some(key =>
        baseInputFields.includes(key)
      );

      if (isBaseInputChange) {

        next.customBaseService = undefined;
        next.customTripCharge = undefined;
        next.customFacilityComponents = undefined;
        next.customSoapUpgrade = undefined;
        next.customExcessSoap = undefined;
        next.customMicrofiberMopping = undefined;
        next.customWarrantyFees = undefined;
        next.customPaperOverage = undefined;
        next.customWeeklyTotal = undefined;
        next.customMonthlyTotal = undefined;
        next.customContractTotal = undefined;
      }


      const normalizedNext = recomputeFixtureCount(next);
      const logQuantity = normalizedNext.fixtureCount || 1;
      const logFrequency = normalizedNext.mainServiceFrequency || 'weekly';


      const pricingFields = [

        'allInclusiveWeeklyRatePerFixture', 'luxuryUpgradePerDispenser', 'excessStandardSoapRate', 'excessLuxurySoapRate',
        'paperCreditPerFixture', 'microfiberMoppingPerBathroom',

        'insideBeltwayRatePerFixture', 'insideBeltwayMinimum', 'insideBeltwayTripCharge', 'insideBeltwayParkingFee',
        'outsideBeltwayRatePerFixture', 'outsideBeltwayTripCharge', 'smallFacilityThreshold', 'smallFacilityMinimum',

        'urinalScreenMonthly', 'urinalMatMonthly', 'toiletClipsMonthly', 'seatCoverDispenserMonthly', 'sanipodServiceMonthly',

        'warrantyFeePerDispenserPerWeek', 'weeklyToMonthlyMultiplier', 'weeklyToAnnualMultiplier',
        'redRateMultiplier', 'greenRateMultiplier',

        'customBaseService', 'customTripCharge', 'customFacilityComponents', 'customSoapUpgrade', 'customExcessSoap',
        'customMicrofiberMopping', 'customWarrantyFees', 'customPaperOverage', 'customWeeklyTotal', 'customMonthlyTotal', 'customContractTotal'
      ];


      Object.keys(updates).forEach(fieldName => {
        if (pricingFields.includes(fieldName)) {
          const newValue = updates[fieldName as keyof SanicleanFormState] as number | undefined;
          const oldValue = originalValues[fieldName] as number | undefined;
          const baselineValue = (baselineValues.current as any)[fieldName] as number | undefined ?? oldValue;

          if (newValue !== undefined && baselineValue !== undefined &&
              typeof newValue === 'number' && typeof baselineValue === 'number' &&
              newValue !== baselineValue && newValue > 0) {
            addServiceFieldChange(fieldName, baselineValue, newValue, logQuantity, logFrequency);
          }
        }
      });

      return normalizedNext;
    });
  };


  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;


    const updates: Partial<SanicleanFormState> = {};

    if (!form.addUrinalComponents && (form.urinalScreensQty > 0 || form.urinalMatsQty > 0)) {
      console.log('🧹 [SANICLEAN-INIT] Fixing inconsistent urinal components state on load');
      updates.urinalScreensQty = 0;
      updates.urinalMatsQty = 0;
    }

    if (!form.addMaleToiletComponents && (form.toiletClipsQty > 0 || form.seatCoverDispensersQty > 0)) {
      console.log('🧹 [SANICLEAN-INIT] Fixing inconsistent male toilet components state on load');
      updates.toiletClipsQty = 0;
      updates.seatCoverDispensersQty = 0;
    }

    if (!form.addFemaleToiletComponents && form.sanipodsQty > 0) {
      console.log('🧹 [SANICLEAN-INIT] Fixing inconsistent female toilet components state on load');
      updates.sanipodsQty = 0;
    }

    if (!form.addMicrofiberMopping && form.microfiberBathrooms > 0) {
      console.log('🧹 [SANICLEAN-INIT] Fixing inconsistent microfiber mopping state on load');
      updates.microfiberBathrooms = 0;
    }


    if (Object.keys(updates).length > 0) {
      setForm(prev => ({ ...prev, ...updates }));
    }
  }, []); 


  useEffect(() => {
    if (!hasInitialized.current) return; 

    if (!form.addUrinalComponents && (form.urinalScreensQty > 0 || form.urinalMatsQty > 0)) {
      console.log('🧹 [SANICLEAN-AUTO-CLEAR] Urinal components unchecked, clearing quantities');
      setForm(prev => ({
        ...prev,
        urinalScreensQty: 0,
        urinalMatsQty: 0
      }));
    }
  }, [form.addUrinalComponents]);

  useEffect(() => {
    if (!hasInitialized.current) return; 

    if (!form.addMaleToiletComponents && (form.toiletClipsQty > 0 || form.seatCoverDispensersQty > 0)) {
      console.log('🧹 [SANICLEAN-AUTO-CLEAR] Male toilet components unchecked, clearing quantities');
      setForm(prev => ({
        ...prev,
        toiletClipsQty: 0,
        seatCoverDispensersQty: 0
      }));
    }
  }, [form.addMaleToiletComponents]);

  useEffect(() => {
    if (!hasInitialized.current) return; 

    if (!form.addFemaleToiletComponents && form.sanipodsQty > 0) {
      console.log('🧹 [SANICLEAN-AUTO-CLEAR] Female toilet components unchecked, clearing quantities');
      setForm(prev => ({
        ...prev,
        sanipodsQty: 0
      }));
    }
  }, [form.addFemaleToiletComponents]);

  useEffect(() => {
    if (!hasInitialized.current) return; 

    if (!form.addMicrofiberMopping && form.microfiberBathrooms > 0) {
      console.log('🧹 [SANICLEAN-AUTO-CLEAR] Microfiber mopping unchecked, clearing bathrooms');
      setForm(prev => ({
        ...prev,
        microfiberBathrooms: 0
      }));
    }
  }, [form.addMicrofiberMopping]);

  const setField = (field: keyof SanicleanFormState, value: any) => {
    updateForm({ [field]: value });
  };

  const setPricingMode = (mode: SanicleanPricingMode) => {
    updateForm({ pricingMode: mode });
  };

  const setLocation = (location: "insideBeltway" | "outsideBeltway") => {
    updateForm({ location });
  };

  const setSoapType = (soapType: "standard" | "luxury") => {
    updateForm({ soapType });
  };

  const setRateTier = (rateTier: SanicleanRateTier) => {
    updateForm({ rateTier });
  };

  const setNotes = (notes: string) => {
    updateForm({ notes });
  };


  const setMainServiceFrequency = (frequency: SanicleanFrequency) => {
    updateForm({
      mainServiceFrequency: frequency,

      frequency: frequency
    });
  };

  const setFacilityComponentsFrequency = (frequency: SanicleanFrequency) => {
    updateForm({
      facilityComponentsFrequency: frequency,

      facilityComponentFrequency: frequency
    });
  };

  return {
    form,
    quote,
    backendConfig,
    isLoadingConfig,
    pricingOverrides,
    fetchPricing,
    updateForm,
    setField,
    setPricingMode,
    setLocation,
    setSoapType,
    setRateTier,
    setNotes,

    setMainServiceFrequency,
    setFacilityComponentsFrequency,

    setContractMonths,
  };
}

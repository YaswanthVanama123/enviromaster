// src/features/services/saniclean/useSanicleanCalc.ts
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

// ✅ Backend config interface matching the ACTUAL MongoDB JSON structure
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
    urinalScreenMonthlyPrice: string | number; // "included" or number
    toiletClipMonthlyPrice: number;
    toiletSeatCoverDispenserMonthlyPrice: string | number; // "included" or number
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

  // Pricing Model Selection
  pricingMode: "per_item_charge", // Default to per-item-charge

  // Fixture Breakdown
  sinks: 0,
  urinals: 0,
  maleToilets: 0,
  femaleToilets: 0,
  fixtureCount: 0, // derived

  // Geographic Settings (for per-item-charge only)
  location: "insideBeltway",
  needsParking: false,

  // Soap Configuration
  soapType: "standard",
  excessSoapGallonsPerWeek: 0,

  // Microfiber Mopping
  addMicrofiberMopping: false,
  microfiberBathrooms: 0,

  // Paper Usage (all-inclusive only)
  estimatedPaperSpendPerWeek: 0,

  // Warranty (per-item-charge only)
  warrantyDispensers: 0,

  // Trip Charge Control (per-item-charge only)
  addTripCharge: false, // enable trip charge

  // Facility Components Enable/Disable (per-item-charge only) - Default to false
  addUrinalComponents: false,
  urinalScreensQty: 0,
  urinalMatsQty: 0,
  addMaleToiletComponents: false,
  toiletClipsQty: 0,
  seatCoverDispensersQty: 0,
  addFemaleToiletComponents: false,
  sanipodsQty: 0,

  // Contract Terms
  contractMonths: 12,

  // Rate Tier
  rateTier: "redRate",

  // ✅ UPDATED: Dual frequency fields with proper typing
  mainServiceFrequency: "weekly" as SanicleanFrequency,          // Primary service frequency
  facilityComponentsFrequency: "weekly" as SanicleanFrequency,   // Independent facility frequency

  // ✅ BACKWARD COMPATIBILITY: Keep old field for existing code
  frequency: "weekly", // Mapped to mainServiceFrequency for compatibility
  facilityComponentFrequency: "weekly", // Mapped to facilityComponentsFrequency for compatibility

  // Notes
  notes: "",

  // Backend Config Rates (populated from config/backend)
  // All-Inclusive Package
  allInclusiveWeeklyRatePerFixture: SANICLEAN_CONFIG.allInclusivePackage.weeklyRatePerFixture,
  luxuryUpgradePerDispenser: SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.luxuryUpgradePerDispenser,
  excessStandardSoapRate: SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.excessUsageCharges.standardSoap,
  excessLuxurySoapRate: SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.excessUsageCharges.luxurySoap,
  paperCreditPerFixture: SANICLEAN_CONFIG.allInclusivePackage.paperCredit.creditPerFixturePerWeek,
  microfiberMoppingPerBathroom: SANICLEAN_CONFIG.allInclusivePackage.microfiberMopping.pricePerBathroom,

  // Per-Item Geographic Rates
  insideBeltwayRatePerFixture: SANICLEAN_CONFIG.perItemCharge.insideBeltway.ratePerFixture,
  insideBeltwayMinimum: SANICLEAN_CONFIG.perItemCharge.insideBeltway.weeklyMinimum,
  insideBeltwayTripCharge: SANICLEAN_CONFIG.perItemCharge.insideBeltway.tripCharge,
  insideBeltwayParkingFee: SANICLEAN_CONFIG.perItemCharge.insideBeltway.parkingFee,
  outsideBeltwayRatePerFixture: SANICLEAN_CONFIG.perItemCharge.outsideBeltway.ratePerFixture,
  outsideBeltwayTripCharge: SANICLEAN_CONFIG.perItemCharge.outsideBeltway.tripCharge,

  // Small Facility
  smallFacilityThreshold: SANICLEAN_CONFIG.perItemCharge.smallFacility.fixtureThreshold,
  smallFacilityMinimum: SANICLEAN_CONFIG.perItemCharge.smallFacility.minimumWeekly,

  // Component Monthly Rates
  urinalScreenMonthly: SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalScreen,
  urinalMatMonthly: SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalMat,
  toiletClipsMonthly: SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.toiletClips,
  seatCoverDispenserMonthly: SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.seatCoverDispenser,
  sanipodServiceMonthly: SANICLEAN_CONFIG.perItemCharge.facilityComponents.femaleToilets.components.sanipodService,

  // Warranty
  warrantyFeePerDispenserPerWeek: SANICLEAN_CONFIG.perItemCharge.warrantyFees.perDispenserPerWeek,

  // Billing
  weeklyToMonthlyMultiplier: SANICLEAN_CONFIG.billingConversions.weekly.monthlyMultiplier,
  weeklyToAnnualMultiplier: SANICLEAN_CONFIG.billingConversions.weekly.annualMultiplier,

  // Rate Tiers
  redRateMultiplier: SANICLEAN_CONFIG.rateTiers.redRate.multiplier,
  greenRateMultiplier: SANICLEAN_CONFIG.rateTiers.greenRate.multiplier,
};

// Frequency to multiplier mapping for billing calculations (backend-driven)
const getFrequencyMultiplier = (frequency: string, backendConfig?: any): number => {
  // First try to get from backend frequencyMetadata
  if (backendConfig?.frequencyMetadata?.[frequency]) {
    const metadata = backendConfig.frequencyMetadata[frequency];

    // Use monthlyRecurringMultiplier if available
    if (typeof metadata.monthlyRecurringMultiplier === 'number') {
      return metadata.monthlyRecurringMultiplier;
    }

    // Calculate from cycleMonths if available
    if (typeof metadata.cycleMonths === 'number') {
      if (metadata.cycleMonths === 0) {
        return 1.0; // Monthly (cycleMonths: 0 means monthly)
      }
      return 1 / metadata.cycleMonths; // Convert cycle months to monthly multiplier
    }
  }

  // Special handling for frequencies not in backend yet
  if (frequency === 'oneTime') {
    return 0; // One-time service (no monthly recurring)
  }

  if (frequency === 'twicePerMonth') {
    return 2.0; // 2 visits per month
  }

  // Fallback multipliers based on backend pattern for missing frequencies
  const fallbackMultipliers: Record<string, number> = {
    weekly: 4.33,      // 4.33 visits per month (should come from backend)
    biweekly: 2.165,   // 2.165 visits per month (should come from backend)
    monthly: 1.0,      // 1 visit per month
    bimonthly: 0.5,    // 0.5 visits per month (every 2 months) - calculated from cycleMonths: 2
    quarterly: 0.33,   // 0.33 visits per month (every 3 months) - calculated from cycleMonths: 3
    biannual: 0.17,    // 0.17 visits per month (every 6 months) - calculated from cycleMonths: 6
    annual: 0.083,     // 0.083 visits per month (every 12 months) - calculated from cycleMonths: 12
  };

  console.log(`⚠️ [SaniClean] Using fallback multiplier for frequency: ${frequency}. Consider adding to backend frequencyMetadata.`);
  return fallbackMultipliers[frequency] || 4.33; // Default to weekly if frequency not found
};

// ✅ NEW: Dual frequency calculation functions

/**
 * ✅ FIXED: Enhanced frequency multiplier that handles both monthly and per-visit modes
 */
const getDualFrequencyMultiplier = (
  frequency: SanicleanFrequency,
  mode: SanicleanCalculationMode,
  backendConfig?: any
): number => {
  // For monthly mode: use existing logic (monthly recurring multipliers)
  if (mode === "monthly") {
    return getFrequencyMultiplier(frequency, backendConfig);
  }

  // ✅ FIXED: For per-visit mode, per-visit price = base price (NO multiplier!)
  // The backend doesn't provide perVisitMultiplier because all frequencies use the SAME per-visit price
  // Only the NUMBER of visits changes based on cycleMonths
  return 1.0; // Always return 1.0 for per-visit mode
};

/**
 * ✅ NEW: Calculate visits in contract period for per-visit mode
 */
const calculateVisitsInContract = (
  frequency: SanicleanFrequency,
  contractMonths: number,
  backendConfig?: any
): number => {
  // Try to get visits per year from backend
  let visitsPerYear = 12; // Default fallback

  if (backendConfig?.frequencyMetadata?.[frequency]?.visitsPerYear) {
    visitsPerYear = backendConfig.frequencyMetadata[frequency].visitsPerYear;
  } else if (backendConfig?.frequencyMetadata?.[frequency]?.cycleMonths) {
    // ✅ FIXED: Calculate visitsPerYear from cycleMonths
    // cycleMonths = how many months between visits
    // visitsPerYear = 12 / cycleMonths
    const cycleMonths = backendConfig.frequencyMetadata[frequency].cycleMonths;
    visitsPerYear = cycleMonths > 0 ? 12 / cycleMonths : 12;
    console.log(`✅ [SaniClean] Calculated visitsPerYear from cycleMonths for ${frequency}: 12/${cycleMonths} = ${visitsPerYear}`);
  } else {
    // Calculate based on frequency (fallback)
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

/**
 * ✅ FIXED: Main dual frequency calculation function
 * Main service and facility components are calculated INDEPENDENTLY:
 * - Main service: Uses its frequency (monthly mode or per-visit mode)
 * - Facility components: ALWAYS uses monthly mode (weekly, biweekly, or monthly)
 */
const calculateDualFrequency = (
  mainServiceFrequency: SanicleanFrequency,
  facilityComponentsFrequency: SanicleanFrequency,
  mainServiceBasePrice: number,
  facilityComponentsBasePrice: number,
  contractMonths: number,
  backendConfig?: any
): SanicleanDualFrequencyResult => {
  // Determine calculation mode based on main service frequency
  const calculationMode = getCalculationMode(mainServiceFrequency);

  console.log(`🔧 [SaniClean] Dual frequency calculation:`, {
    mainServiceFrequency,
    facilityComponentsFrequency,
    calculationMode,
    mainServiceBasePrice,
    facilityComponentsBasePrice,
  });

  // ✅ FIXED: Facility components ALWAYS use monthly mode, regardless of main service frequency
  const facilityMultiplier = getFrequencyMultiplier(facilityComponentsFrequency, backendConfig);
  const facilityComponentsMonthly = facilityComponentsBasePrice * facilityMultiplier;
  const facilityContractTotal = facilityComponentsMonthly * contractMonths;

  if (calculationMode === "monthly") {
    // MONTHLY MODE: Main service also uses monthly calculation
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
    // PER-VISIT MODE: Main service uses per-visit, facility components use monthly
    const mainServicePerVisit = mainServiceBasePrice; // No multiplier for per-visit

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
      combinedTotal: mainServicePerVisit, // Per-visit doesn't include facility in per-visit total
      perVisitTotal: mainServicePerVisit,
      monthlyTotal: facilityComponentsMonthly, // Only facility components have monthly total in per-visit mode
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

// All-Inclusive Pricing Calculation
function calculateAllInclusive(
  form: SanicleanFormState,
  config: BackendSanicleanConfig | SanicleanPricingConfig
): SanicleanQuoteResult {
  const fixtureCount = form.fixtureCount;

  // ✅ FIX: Return complete $0 quote structure if service is inactive (no fixtures)
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

  // Base Service: Uses backend pricePerFixture
  const baseServiceCalc = fixtureCount * form.allInclusiveWeeklyRatePerFixture * rateTierMultiplier;
  const baseService = form.customBaseService ?? baseServiceCalc;
  const luxuryUpgradeQty = resolveLuxuryUpgradeQty(form);

  // Soap Upgrade: Uses backend standardToLuxuryPerDispenserPerWeek
  const soapUpgradeCalc = form.soapType === "luxury" ? luxuryUpgradeQty * form.luxuryUpgradePerDispenser : 0;
  const soapUpgrade = form.customSoapUpgrade ?? soapUpgradeCalc;

  // Excess Soap: Uses backend excess usage charges
  const excessSoapCalc = form.excessSoapGallonsPerWeek > 0 ?
    form.excessSoapGallonsPerWeek * (form.soapType === "luxury" ? form.excessLuxurySoapRate : form.excessStandardSoapRate) : 0;
  const excessSoap = form.customExcessSoap ?? excessSoapCalc;

  // Microfiber Mopping: Included in all-inclusive (no extra charge)
  const microfiberMoppingCalc = 0; // Included in base price
  const microfiberMopping = form.customMicrofiberMopping ?? microfiberMoppingCalc;

  // Paper Overage: Uses backend creditPerFixturePerWeek
  const paperCredit = fixtureCount * form.paperCreditPerFixture;
  const paperOverageCalc = Math.max(0, form.estimatedPaperSpendPerWeek - paperCredit);
  const paperOverage = form.customPaperOverage ?? paperOverageCalc;

  // All-Inclusive: No trip charge, no warranty fees, no facility components
  const tripChargeCalc = 0;
  const tripCharge = form.customTripCharge ?? tripChargeCalc;

  const warrantyFeesCalc = 0;
  const warrantyFees = form.customWarrantyFees ?? warrantyFeesCalc;

  const facilityComponentsCalc = 0;
  const facilityComponents = form.customFacilityComponents ?? facilityComponentsCalc;

  // ✅ NEW: Use dual frequency calculation for All-Inclusive
  // Main service includes: baseService + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage + tripCharge
  const mainServiceTotal = baseService + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage + tripCharge;

  // Facility components total (All-Inclusive has no facility components, but kept for consistency)
  const facilityComponentsTotal = facilityComponents;

  // ✅ Use new dual frequency calculation engine
  const dualFreqResult = calculateDualFrequency(
    form.mainServiceFrequency,
    form.facilityComponentsFrequency,
    mainServiceTotal,
    facilityComponentsTotal,
    form.contractMonths,
    config
  );

  // ✅ FIXED: Calculate service and facility components INDEPENDENTLY to avoid double-counting
  // Service and facility are calculated at their own frequencies and added separately to contract
  const calculationMode = getCalculationMode(form.mainServiceFrequency);

  // ✅ FIXED: weeklyTotal should ONLY include main service (NOT facility components)
  // Facility components are calculated separately and added to monthly/contract independently
  const weeklyTotal = calculationMode === "monthly"
    ? mainServiceTotal  // ✅ FIXED: Only main service per-visit price (facility calculated separately)
    : dualFreqResult.combinedTotal; // For per-visit mode, use frequency-adjusted price

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

  // Dispenser counts for transparency
  const soapDispensers = form.sinks; // 1 soap per sink
  const airFresheners = Math.ceil(form.sinks / 2); // 1 air freshener per 2 sinks
  const totalDispensers = soapDispensers + airFresheners;

  // Component counts
  const urinalScreens = form.urinals;
  const urinalMats = form.urinals;
  const toiletClips = form.maleToilets;
  const seatCoverDispensers = form.maleToilets;
  const sanipods = form.femaleToilets;

  // All-inclusive has no explicit minimum charge (based on fixture count)
  const minimumChargePerWeek = 0;

  return {
    serviceId: "saniclean",
    displayName: "SaniClean - All Inclusive Package",
    pricingMode: "all_inclusive",
    weeklyTotal,
    monthlyTotal,
    contractTotal,
    // ✅ NEW: Separate monthly totals for base service and facility components
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
    included: [
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

// Per-Item-Charge Pricing Calculation
function calculatePerItemCharge(
  form: SanicleanFormState,
  config: BackendSanicleanConfig | SanicleanPricingConfig
): SanicleanQuoteResult {
  const fixtureCount = form.fixtureCount;

  // ✅ FIX: Return complete $0 quote structure if service is inactive (no fixtures)
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

  // Geographic rates
  const isInsideBeltway = form.location === "insideBeltway";
  const fixtureRate = isInsideBeltway ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture;
  const regionMinimum = isInsideBeltway ? form.insideBeltwayMinimum : 0;

  // Base fixture charge
  let baseServiceCalc = fixtureCount * fixtureRate * rateTierMultiplier;

  // Small facility rule: 5 fixtures or less = $50 minimum (includes trip)
  const isSmallFacility = fixtureCount <= form.smallFacilityThreshold;
  let tripChargeCalc = 0;

  if (isSmallFacility) {
    baseServiceCalc = Math.max(baseServiceCalc, form.smallFacilityMinimum); // $50 minimum includes trip
    tripChargeCalc = 0; // Already included in minimum
  } else {
    // Apply regional minimum
    baseServiceCalc = Math.max(baseServiceCalc, regionMinimum);

    // Add trip charge ONLY if checkbox is enabled
    if (form.addTripCharge) {
      tripChargeCalc = isInsideBeltway ? form.insideBeltwayTripCharge : form.outsideBeltwayTripCharge;

      // Add parking fee if inside beltway and parking needed
      if (isInsideBeltway && form.needsParking) {
        tripChargeCalc += form.insideBeltwayParkingFee;
      }
    } else {
      tripChargeCalc = 0;
    }
  }

  // Apply custom overrides
  const baseService = form.customBaseService ?? baseServiceCalc;
  const tripCharge = form.customTripCharge ?? tripChargeCalc;

  // ✅ FIXED: Facility Components calculation with separate frequency handling
  // Component rates are base rates - frequency determines if they're weekly, biweekly, or monthly
  let facilityComponentsCalc = 0;

  // Get the facility component frequency (separate from main service frequency)
  const facilityFrequency = form.facilityComponentFrequency || 'weekly'; // Default to weekly

  // Calculate facility components base total
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

  // ✅ NEW: The base rates are treated as rates for the selected frequency
  // No conversion needed - if user selects "weekly", the $24 is weekly price
  // If user selects "monthly", the $24 is monthly price

  const facilityComponents = form.customFacilityComponents ?? facilityComponentsCalc;

  const luxuryUpgradeQty = resolveLuxuryUpgradeQty(form);

  // Soap upgrades (only applicable if they want luxury)
  const soapUpgradeCalc = form.soapType === "luxury" ? luxuryUpgradeQty * form.luxuryUpgradePerDispenser : 0;
  const soapUpgrade = form.customSoapUpgrade ?? soapUpgradeCalc;

  // Excess soap (not really applicable in per-item model, but kept for compatibility)
  const excessSoapCalc = 0;
  const excessSoap = form.customExcessSoap ?? excessSoapCalc;

  // Microfiber mopping (additional service)
  const microfiberMoppingCalc = form.addMicrofiberMopping ?
    form.microfiberBathrooms * form.microfiberMoppingPerBathroom : 0;
  const microfiberMopping = form.customMicrofiberMopping ?? microfiberMoppingCalc;

  // Warranty fees: Only charge if salesman explicitly enters warranty dispensers
  const soapDispensers = form.sinks;
  const airFresheners = Math.ceil(form.sinks / 2);
  const totalDispensers = soapDispensers + airFresheners;
  const warrantyFeesCalc = form.warrantyDispensers > 0 ?
    form.warrantyDispensers * form.warrantyFeePerDispenserPerWeek : 0;
  const warrantyFees = form.customWarrantyFees ?? warrantyFeesCalc;

  // No paper overage in per-item model
  const paperOverageCalc = 0;
  const paperOverage = form.customPaperOverage ?? paperOverageCalc;

  // ✅ NEW: Use dual frequency calculation for Per-Item-Charge
  // Main service includes: baseService + tripCharge + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage
  const mainServiceTotal = baseService + tripCharge + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage;

  // Facility components total (at their own frequency)
  const facilityComponentsTotal = facilityComponents;

  // ✅ Use new dual frequency calculation engine
  const dualFreqResult = calculateDualFrequency(
    form.mainServiceFrequency,
    form.facilityComponentsFrequency,
    mainServiceTotal,
    facilityComponentsTotal,
    form.contractMonths,
    config
  );

  // ✅ FIXED: Calculate service and facility components INDEPENDENTLY to avoid double-counting
  // Service and facility are calculated at their own frequencies and added separately to contract
  const calculationMode = getCalculationMode(form.mainServiceFrequency);

  // ✅ FIXED: weeklyTotal should ONLY include main service (NOT facility components)
  // Facility components are calculated separately and added to monthly/contract independently
  const weeklyTotal = calculationMode === "monthly"
    ? mainServiceTotal  // ✅ FIXED: Only main service per-visit price (facility calculated separately)
    : dualFreqResult.combinedTotal; // For per-visit mode, use frequency-adjusted price

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

  // Component counts
  const urinalScreens = form.urinals;
  const urinalMats = form.urinals;
  const toiletClips = form.maleToilets;
  const seatCoverDispensers = form.maleToilets;
  const sanipods = form.femaleToilets;

  // Minimum charge for redline/greenline indicator
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
    // ✅ NEW: Separate monthly totals for base service and facility components
    baseServiceMonthly: dualFreqResult.mainServiceTotal,
    facilityComponentsMonthly: dualFreqResult.facilityComponentsTotal,
    breakdown: {
      baseService,
      tripCharge,
      facilityComponents: dualFreqResult.facilityComponentsTotal, // ✅ Use monthly total from dual freq calc
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
    included: [
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
  // Get services context for fallback pricing data AND global contract months
  const servicesContext = useServicesContextOptional();
  const isEditMode = useRef(!!initial);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);

  // ✅ NEW: Calculate sum of all calc field totals (add directly to contract, no frequency)
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

  // ✅ NEW: Calculate sum of all dollar field values (add directly to contract, no frequency)
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
    // ✅ FIX: Only use global contract months if service starts with fixtures (is active)
    const initialFixtureCount = (initial?.sinks || 0) + (initial?.urinals || 0) +
                                 (initial?.maleToilets || 0) + (initial?.femaleToilets || 0);
    const isInitiallyActive = initialFixtureCount > 0;

    // ✅ NEW: Use global contract months as default if available, no initial value provided, AND service is active
    const defaultContractMonths = initial?.contractMonths
      ? initial.contractMonths
      : (isInitiallyActive && servicesContext?.globalContractMonths)
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
      contractMonths: defaultContractMonths, // ✅ NEW: Use global only if service is initially active
    });
  });

  const [backendConfig, setBackendConfig] = useState<BackendSanicleanConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // ⚡ OPTIMIZED: Fetch pricing config from context (NO API call)
  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {
      // ⚡ Use context's backend pricing data directly (already loaded by useAllServicePricing)
      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("saniclean");
        if (backendData?.config) {
          console.log('✅ [SaniClean] Using cached pricing data from context');
          const config = backendData.config as BackendSanicleanConfig;
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);

          // ✅ Only clear custom overrides on manual refresh
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

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("saniclean");
        if (fallbackConfig?.config) {
          console.log('✅ [SaniClean] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendSanicleanConfig;
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);

          // ✅ FIXED: Only clear custom overrides on manual refresh
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

  // Helper function to update form with config data from the actual backend structure
  const updateFormWithConfig = (config: BackendSanicleanConfig, forceUpdate: boolean = false) => {
    if (isEditMode.current && !forceUpdate) {
      console.log('ÐY"< [SANICLEAN] Edit mode: skipping auto-overwrite from backend');
      return;
    }
    setForm((prev) => ({
      ...prev,
      // ✅ Extract from nested backend structure
      // All-Inclusive rates
      allInclusiveWeeklyRatePerFixture: config.allInclusivePricing?.pricePerFixture ?? prev.allInclusiveWeeklyRatePerFixture,

      luxuryUpgradePerDispenser: config.soapUpgrades?.standardToLuxuryPerDispenserPerWeek ?? prev.luxuryUpgradePerDispenser,

      excessStandardSoapRate: config.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon ?? prev.excessStandardSoapRate,

      excessLuxurySoapRate: config.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon ?? prev.excessLuxurySoapRate,

      paperCreditPerFixture: config.paperCredit?.creditPerFixturePerWeek ?? prev.paperCreditPerFixture,

      microfiberMoppingPerBathroom: config.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom ?? prev.microfiberMoppingPerBathroom,

      // Per-Item rates
      insideBeltwayRatePerFixture: config.standardALaCartePricing?.insideBeltway?.pricePerFixture ?? prev.insideBeltwayRatePerFixture,

      insideBeltwayMinimum: config.standardALaCartePricing?.insideBeltway?.minimumPrice ?? prev.insideBeltwayMinimum,

      insideBeltwayTripCharge: config.standardALaCartePricing?.insideBeltway?.tripCharge ?? prev.insideBeltwayTripCharge,

      insideBeltwayParkingFee: config.standardALaCartePricing?.insideBeltway?.parkingFeeAddOn ?? prev.insideBeltwayParkingFee,

      outsideBeltwayRatePerFixture: config.standardALaCartePricing?.outsideBeltway?.pricePerFixture ?? prev.outsideBeltwayRatePerFixture,

      outsideBeltwayTripCharge: config.standardALaCartePricing?.outsideBeltway?.tripCharge ?? prev.outsideBeltwayTripCharge,

      // Small facility
      smallFacilityThreshold: config.smallBathroomMinimums?.minimumFixturesThreshold ?? prev.smallFacilityThreshold,

      smallFacilityMinimum: config.smallBathroomMinimums?.minimumPriceUnderThreshold ?? prev.smallFacilityMinimum,

      // ✅ FIXED: Urinal Screens should use Urinal Mats rate when marked as "included"
      urinalScreenMonthly: typeof config.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'number' ?
                           config.monthlyAddOnSupplyPricing.urinalScreenMonthlyPrice :
                           (config.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'included' ?
                            config.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice ?? prev.urinalScreenMonthly :
                            prev.urinalScreenMonthly),

      urinalMatMonthly: config.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice ?? prev.urinalMatMonthly,

      toiletClipsMonthly: config.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice ?? prev.toiletClipsMonthly,

      // ✅ FIXED: Seat Cover Dispenser should use toilet clips rate when marked as "included"
      seatCoverDispenserMonthly: typeof config.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'number' ?
                                 config.monthlyAddOnSupplyPricing.toiletSeatCoverDispenserMonthlyPrice :
                                 (config.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'included' ?
                                  config.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice ?? prev.seatCoverDispenserMonthly :
                                  prev.seatCoverDispenserMonthly),

      sanipodServiceMonthly: config.monthlyAddOnSupplyPricing?.sanipodMonthlyPricePerPod ?? prev.sanipodServiceMonthly,

      // Warranty
      warrantyFeePerDispenserPerWeek: (config.warrantyFees?.soapDispenserWarrantyFeePerWeek ??
                                       config.warrantyFees?.airFreshenerDispenserWarrantyFeePerWeek ??
                                       prev.warrantyFeePerDispenserPerWeek),

      // Billing
      weeklyToMonthlyMultiplier: config.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? prev.weeklyToMonthlyMultiplier,

      // Rate tiers (keeping existing multipliers since not in backend config)
      redRateMultiplier: prev.redRateMultiplier,
      greenRateMultiplier: prev.greenRateMultiplier,
    }));
  };

  // Fetch on mount (used for baseline/override detection)
  useEffect(() => {
    console.log('�Y"< [SANICLEAN-PRICING] Fetching backend prices for baseline/override detection');
    fetchPricing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also fetch when services context becomes available (for fallback pricing)
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

    // Baseline = loaded/saved value (edit mode) OR backend default (new document)
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

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
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

  // ✅ NEW: Sync global contract months to service (unless service has explicitly overridden it)
  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef(form.fixtureCount > 0); // Track if service was previously active

  useEffect(() => {
    const isServiceActive = form.fixtureCount > 0;
    const wasActive = wasActiveRef.current;

    // ✅ FIX: Detect transition from inactive to active
    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {
      // Service just became active - adopt global contract months
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
      // Service is already active - sync with global if it changes
      const globalMonths = servicesContext.globalContractMonths;
      if (form.contractMonths !== globalMonths) {
        console.log(`📅 [SANICLEAN-CONTRACT] Syncing global contract months: ${globalMonths} (service is active with ${form.fixtureCount} fixtures)`);
        setForm(prev => ({
          ...prev,
          contractMonths: globalMonths,
        }));
      }
    }
    // ✅ IMPORTANT: If service is inactive, do NOT sync global months

    // Update the ref for next render
    wasActiveRef.current = isServiceActive;
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.fixtureCount, servicesContext]);

  // ✅ NEW: Track when user manually changes contract months (this sets the override flag)
  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({
      ...prev,
      contractMonths: months,
    }));
    console.log(`📅 [SANICLEAN-CONTRACT] User override: ${months} months`);
  }, []);

  // Calculate quote based on pricing mode
  const quote: SanicleanQuoteResult = useMemo(() => {
    const config = backendConfig || SANICLEAN_CONFIG;

    // ✅ NEW: Ensure backward compatibility by mapping old frequency fields to new ones
    const mappedForm = {
      ...form,
      // Map old frequency field to mainServiceFrequency if needed
      mainServiceFrequency: form.mainServiceFrequency || (form.frequency as SanicleanFrequency) || "weekly",
      // Default facilityComponentsFrequency to match main service if not set
      facilityComponentsFrequency: form.facilityComponentsFrequency || form.mainServiceFrequency || (form.frequency as SanicleanFrequency) || "weekly",
    };

    let baseQuote: SanicleanQuoteResult;
    if (mappedForm.pricingMode === "all_inclusive") {
      baseQuote = calculateAllInclusive(mappedForm, config);
    } else {
      baseQuote = calculatePerItemCharge(mappedForm, config);
    }

    // ✅ Apply custom overrides (dual frequency calculations already handled in calculate functions)
    // Custom overrides allow user to manually override any calculated value
    const effectiveWeeklyTotal = mappedForm.customWeeklyTotal ?? baseQuote.weeklyTotal;
    const effectiveMonthlyTotal = mappedForm.customMonthlyTotal ?? baseQuote.monthlyTotal;
    const contractTotalBeforeCustomFields = mappedForm.customContractTotal ?? baseQuote.contractTotal;

    // ✅ NEW: Add calc field totals AND dollar field totals directly to contract (no frequency dependency)
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
      contractTotal: effectiveContractTotal, // ✅ UPDATED: Total contract value with custom fields
    };
  }, [form, backendConfig, calcFieldsTotal, dollarFieldsTotal]);

  // Form update helpers
  const updateForm = (updates: Partial<SanicleanFormState>) => {
    setForm((prev) => {
      // ✅ Capture original values before update for price override logging
      const originalValues: any = {};
      Object.keys(updates).forEach(key => {
        originalValues[key] = prev[key as keyof SanicleanFormState];
      });

      const next = { ...prev, ...updates };

      // ✅ AUTO-CLEAR CUSTOM OVERRIDES when base inputs change
      // Check if any base input fields are being updated
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
        // Clear all custom overrides when base inputs change
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

      // ✅ NEW: Log all form field changes using universal logger
      const normalizedNext = recomputeFixtureCount(next);
      const logQuantity = normalizedNext.fixtureCount || 1;
      const logFrequency = normalizedNext.mainServiceFrequency || 'weekly';

      // ✅ Log price override for numeric pricing fields
      const pricingFields = [
        // All-inclusive rates
        'allInclusiveWeeklyRatePerFixture', 'luxuryUpgradePerDispenser', 'excessStandardSoapRate', 'excessLuxurySoapRate',
        'paperCreditPerFixture', 'microfiberMoppingPerBathroom',
        // Per-item rates
        'insideBeltwayRatePerFixture', 'insideBeltwayMinimum', 'insideBeltwayTripCharge', 'insideBeltwayParkingFee',
        'outsideBeltwayRatePerFixture', 'outsideBeltwayTripCharge', 'smallFacilityThreshold', 'smallFacilityMinimum',
        // Component rates
        'urinalScreenMonthly', 'urinalMatMonthly', 'toiletClipsMonthly', 'seatCoverDispenserMonthly', 'sanipodServiceMonthly',
        // Warranty & billing
        'warrantyFeePerDispenserPerWeek', 'weeklyToMonthlyMultiplier', 'weeklyToAnnualMultiplier',
        'redRateMultiplier', 'greenRateMultiplier',
        // Custom overrides
        'customBaseService', 'customTripCharge', 'customFacilityComponents', 'customSoapUpgrade', 'customExcessSoap',
        'customMicrofiberMopping', 'customWarrantyFees', 'customPaperOverage', 'customWeeklyTotal', 'customMonthlyTotal', 'customContractTotal'
      ];

      // Check each updated field for price overrides
      Object.keys(updates).forEach(fieldName => {
        if (pricingFields.includes(fieldName)) {
          const newValue = updates[fieldName as keyof SanicleanFormState] as number | undefined;
          const oldValue = originalValues[fieldName] as number | undefined;
          const baselineValue = (baselineValues.current as any)[fieldName] as number | undefined ?? oldValue;
          // Handle undefined values (when cleared) - don't log clearing to undefined
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

  // ✅ NEW: Initialize - clear any inconsistent quantities on mount if checkboxes are unchecked
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Check for inconsistent state and fix it immediately
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

    // Apply all fixes at once if any were needed
    if (Object.keys(updates).length > 0) {
      setForm(prev => ({ ...prev, ...updates }));
    }
  }, []); // Run once on mount

  // ✅ NEW: Auto-clear quantities when facility component checkboxes are toggled OFF
  useEffect(() => {
    if (!hasInitialized.current) return; // Skip until after initialization

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
    if (!hasInitialized.current) return; // Skip until after initialization

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
    if (!hasInitialized.current) return; // Skip until after initialization

    if (!form.addFemaleToiletComponents && form.sanipodsQty > 0) {
      console.log('🧹 [SANICLEAN-AUTO-CLEAR] Female toilet components unchecked, clearing quantities');
      setForm(prev => ({
        ...prev,
        sanipodsQty: 0
      }));
    }
  }, [form.addFemaleToiletComponents]);

  useEffect(() => {
    if (!hasInitialized.current) return; // Skip until after initialization

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

  // ✅ NEW: Dual frequency setters
  const setMainServiceFrequency = (frequency: SanicleanFrequency) => {
    updateForm({
      mainServiceFrequency: frequency,
      // Also update old frequency field for backward compatibility
      frequency: frequency
    });
  };

  const setFacilityComponentsFrequency = (frequency: SanicleanFrequency) => {
    updateForm({
      facilityComponentsFrequency: frequency,
      // Also update old field for backward compatibility
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
    // ✅ NEW: Dual frequency functions
    setMainServiceFrequency,
    setFacilityComponentsFrequency,
    // ✅ NEW: Contract months with override support
    setContractMonths,
  };
}

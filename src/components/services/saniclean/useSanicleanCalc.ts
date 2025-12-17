// src/features/services/saniclean/useSanicleanCalc.ts
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import type {
  SanicleanFormState,
  SanicleanPricingConfig,
  SanicleanQuoteResult,
  SanicleanPricingMode,
  SanicleanRateTier,
} from "./sanicleanTypes";
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

  // Service Frequency
  frequency: "weekly",

  // ✅ NEW: Facility Components Frequency (separate from main service)
  facilityComponentFrequency: "weekly", // Default to weekly for components

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
  const rateTierMultiplier = form.rateTier === "greenRate" ? form.greenRateMultiplier : form.redRateMultiplier;

  // Base Service: Uses backend pricePerFixture
  const baseServiceCalc = fixtureCount * form.allInclusiveWeeklyRatePerFixture * rateTierMultiplier;
  const baseService = form.customBaseService ?? baseServiceCalc;

  // Soap Upgrade: Uses backend standardToLuxuryPerDispenserPerWeek
  const soapUpgradeCalc = form.soapType === "luxury" ? form.sinks * form.luxuryUpgradePerDispenser : 0;
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

  const weeklyTotal = baseService + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage + tripCharge + facilityComponents;

  // ✅ Use frequency-based multiplier from backend instead of fixed weeklyToMonthlyMultiplier
  const frequencyMultiplier = getFrequencyMultiplier(form.frequency, config);
  const monthlyTotal = frequencyMultiplier > 0 ? weeklyTotal * frequencyMultiplier : weeklyTotal; // For oneTime, don't multiply
  const contractTotal = monthlyTotal * form.contractMonths;

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

  return {
    serviceId: "saniclean",
    displayName: "SaniClean - All Inclusive Package",
    pricingMode: "all_inclusive",
    weeklyTotal,
    monthlyTotal,
    contractTotal,
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
      `Paper credit: $${paperCredit.toFixed(2)}/week`,
    ],
    excluded: [
      "Trip charges (waived)",
      "Warranty fees (waived)",
    ],
    appliedRules: [
      `All-Inclusive: ${fixtureCount} fixtures × $${form.allInclusiveWeeklyRatePerFixture}/fixture/week`,
      form.soapType === "luxury" ? `Luxury soap upgrade: ${soapDispensers} dispensers × $${form.luxuryUpgradePerDispenser}/week` : "",
      form.excessSoapGallonsPerWeek > 0 ? `Excess soap: ${form.excessSoapGallonsPerWeek} gallons × $${form.soapType === "luxury" ? form.excessLuxurySoapRate : form.excessStandardSoapRate}/gallon` : "",
      paperOverage > 0 ? `Paper overage: $${form.estimatedPaperSpendPerWeek} spend - $${paperCredit.toFixed(2)} credit = $${paperOverage.toFixed(2)}` : "",
      "All fees waived (trip, warranty)",
    ].filter(Boolean),
  };
}

// Per-Item-Charge Pricing Calculation
function calculatePerItemCharge(
  form: SanicleanFormState,
  config: BackendSanicleanConfig | SanicleanPricingConfig
): SanicleanQuoteResult {
  const fixtureCount = form.fixtureCount;
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
  // Don't divide by service frequency - use separate facility component frequency
  let facilityComponentsCalc = 0;

  // Get the facility component frequency (separate from main service frequency)
  const facilityFrequency = form.facilityComponentFrequency || 'weekly'; // Default to weekly
  const facilityFrequencyMultiplier = getFrequencyMultiplier(facilityFrequency, config);

  // Calculate facility components at their own frequency (weekly/biweekly/monthly)
  if (form.addUrinalComponents) {
    const urinalComponentsMonthly = form.urinalScreensQty * form.urinalScreenMonthly + form.urinalMatsQty * form.urinalMatMonthly;
    // Convert monthly to the facility frequency (weekly/biweekly/monthly only)
    const urinalComponentsAtFrequency = facilityFrequencyMultiplier > 0 ? urinalComponentsMonthly / facilityFrequencyMultiplier : urinalComponentsMonthly;
    facilityComponentsCalc += urinalComponentsAtFrequency;
  }

  if (form.addMaleToiletComponents) {
    const maleToiletComponentsMonthly = form.toiletClipsQty * form.toiletClipsMonthly + form.seatCoverDispensersQty * form.seatCoverDispenserMonthly;
    // Convert monthly to the facility frequency (weekly/biweekly/monthly only)
    const maleToiletComponentsAtFrequency = facilityFrequencyMultiplier > 0 ? maleToiletComponentsMonthly / facilityFrequencyMultiplier : maleToiletComponentsMonthly;
    facilityComponentsCalc += maleToiletComponentsAtFrequency;
  }

  if (form.addFemaleToiletComponents) {
    const femaleToiletComponentsMonthly = form.sanipodsQty * form.sanipodServiceMonthly;
    // Convert monthly to the facility frequency (weekly/biweekly/monthly only)
    const femaleToiletComponentsAtFrequency = facilityFrequencyMultiplier > 0 ? femaleToiletComponentsMonthly / facilityFrequencyMultiplier : femaleToiletComponentsMonthly;
    facilityComponentsCalc += femaleToiletComponentsAtFrequency;
  }

  const facilityComponents = form.customFacilityComponents ?? facilityComponentsCalc;

  // Soap upgrades (only applicable if they want luxury)
  const soapUpgradeCalc = form.soapType === "luxury" ? form.sinks * form.luxuryUpgradePerDispenser : 0;
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

  // ✅ FIXED: Calculate weekly total properly adding facility components at their frequency
  // Convert facility components from their frequency to match service frequency for weekly total
  const serviceFrequencyMultiplier = getFrequencyMultiplier(form.frequency, config);
  let facilityComponentsAtServiceFrequency = facilityComponents;

  // If facility frequency is different from service frequency, adjust the rate
  if (form.facilityComponentFrequency !== form.frequency) {
    const facilityToServiceRatio = facilityFrequencyMultiplier / serviceFrequencyMultiplier;
    facilityComponentsAtServiceFrequency = facilityComponents * facilityToServiceRatio;
  }

  const weeklyTotal = baseService + tripCharge + facilityComponentsAtServiceFrequency + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage;

  // ✅ Use frequency-based multiplier instead of fixed weeklyToMonthlyMultiplier
  const monthlyTotal = serviceFrequencyMultiplier > 0 ? weeklyTotal * serviceFrequencyMultiplier : weeklyTotal; // For oneTime, don't multiply
  const contractTotal = monthlyTotal * form.contractMonths;

  // Component counts
  const urinalScreens = form.urinals;
  const urinalMats = form.urinals;
  const toiletClips = form.maleToilets;
  const seatCoverDispensers = form.maleToilets;
  const sanipods = form.femaleToilets;

  return {
    serviceId: "saniclean",
    displayName: "SaniClean - Per Item Charge",
    pricingMode: "per_item_charge",
    weeklyTotal,
    monthlyTotal,
    contractTotal,
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
      facilityComponents > 0 ? `Facility components: $${facilityComponents.toFixed(2)}/week (monthly rates ÷ 4.33)` : "",
      warrantyFees > 0 ? `Warranty: ${totalDispensers} dispensers × $${form.warrantyFeePerDispenserPerWeek}/week` : "",
      microfiberMopping > 0 ? `Microfiber mopping: ${form.microfiberBathrooms} bathrooms × $${form.microfiberMoppingPerBathroom}/week` : "",
    ].filter(Boolean),
  };
}

export function useSanicleanCalc(initial?: Partial<SanicleanFormState>) {
  const [form, setForm] = useState<SanicleanFormState>(() =>
    recomputeFixtureCount({
      ...DEFAULT_FORM,
      ...initial,
    })
  );

  const [backendConfig, setBackendConfig] = useState<BackendSanicleanConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // Fetch configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      console.log('🔄 [SaniClean] Fetching configuration...');

      // First try to get active service config
      const response = await serviceConfigApi.getActive("saniclean");

      if (!response || response.error || !response.data) {
        console.warn('⚠️ SaniClean config not found in active services, trying fallback pricing...');

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("saniclean");
          if (fallbackConfig?.config) {
            console.log('✅ [SaniClean] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendSanicleanConfig;
            setBackendConfig(config);
            updateFormWithConfig(config);

            // ✅ Clear all custom overrides when refreshing config
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

            return;
          }
        }

        console.warn('⚠️ No backend pricing available, using static fallback values');
        return;
      }

      const document = response.data;
      if (!document.config) {
        console.warn('⚠️ SaniClean document has no config property');
        return;
      }

      const config = document.config as BackendSanicleanConfig;
      setBackendConfig(config);

      console.log('📊 [SaniClean] Active backend config received:', config);
      updateFormWithConfig(config);

      // ✅ Clear all custom overrides when refreshing config
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

    } catch (error) {
      console.error('❌ [SaniClean] Failed to fetch config from backend:', error);

      // Log the full error details for debugging
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      }

      // Log any response details if it's a fetch error
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('❌ Response status:', (error as any).response?.status);
        console.error('❌ Response data:', (error as any).response?.data);
      }

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("saniclean");
        if (fallbackConfig?.config) {
          console.log('✅ [SaniClean] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendSanicleanConfig;
          setBackendConfig(config);
          updateFormWithConfig(config);

          // ✅ Clear all custom overrides when refreshing config
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

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Helper function to update form with config data from the actual backend structure
  const updateFormWithConfig = (config: BackendSanicleanConfig) => {
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

  // Fetch on mount
  useEffect(() => {
    fetchPricing();
  }, []);

  // Also fetch when services context becomes available
  useEffect(() => {
    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `saniclean_${fieldName}`,
      productName: `SaniClean - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.fixtureCount || 1,
      frequency: 'weekly'
    });

    console.log(`📝 [SANICLEAN-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.fixtureCount]);

  // Calculate quote based on pricing mode
  const quote: SanicleanQuoteResult = useMemo(() => {
    const config = backendConfig || SANICLEAN_CONFIG;

    let baseQuote: SanicleanQuoteResult;
    if (form.pricingMode === "all_inclusive") {
      baseQuote = calculateAllInclusive(form, config);
    } else {
      baseQuote = calculatePerItemCharge(form, config);
    }

    // ✅ Cascade behavior: component overrides → weeklyTotal → monthlyTotal → contractTotal
    // 1. Component overrides are already applied in calculate functions
    // 2. Apply customWeeklyTotal override if set
    const effectiveWeeklyTotal = form.customWeeklyTotal ?? baseQuote.weeklyTotal;

    // 3. Calculate monthly/contract from effective weekly (cascade) using frequency-based multiplier
    const frequencyMultiplier = getFrequencyMultiplier(form.frequency, config);
    const calculatedMonthly = frequencyMultiplier > 0 ? effectiveWeeklyTotal * frequencyMultiplier : effectiveWeeklyTotal;
    const calculatedContract = calculatedMonthly * form.contractMonths;

    // 4. Apply custom monthly/contract overrides if set (they override the cascade)
    const effectiveMonthlyTotal = form.customMonthlyTotal ?? calculatedMonthly;
    const effectiveContractTotal = form.customContractTotal ?? calculatedContract;

    // ✅ Apply custom overrides with cascade
    return {
      ...baseQuote,
      weeklyTotal: effectiveWeeklyTotal,
      monthlyTotal: effectiveMonthlyTotal,
      contractTotal: effectiveContractTotal,
    };
  }, [form, backendConfig]);

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

          // Handle undefined values (when cleared) - don't log clearing to undefined
          if (newValue !== undefined && oldValue !== undefined &&
              typeof newValue === 'number' && typeof oldValue === 'number' &&
              newValue !== oldValue && newValue > 0) {
            addServiceFieldChange(fieldName, oldValue, newValue);
          }
        }
      });

      return recomputeFixtureCount(next);
    });
  };

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

  return {
    form,
    quote,
    backendConfig,
    isLoadingConfig,
    fetchPricing,
    updateForm,
    setField,
    setPricingMode,
    setLocation,
    setSoapType,
    setRateTier,
    setNotes,
  };
}

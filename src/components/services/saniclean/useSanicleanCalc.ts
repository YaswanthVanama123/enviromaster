// src/features/services/saniclean/useSanicleanCalc.ts
import { useEffect, useMemo, useState } from "react";
import type {
  SanicleanFormState,
  SanicleanPricingConfig,
  SanicleanQuoteResult,
  SanicleanPricingMode,
  SanicleanRateTier,
} from "./sanicleanTypes";
import { SANICLEAN_CONFIG } from "./sanicleanConfig";
import { serviceConfigApi } from "../../../backendservice/api";

// Backend config interface matching MongoDB structure
interface BackendSanicleanConfig extends SanicleanPricingConfig {}

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

  // Contract Terms
  contractMonths: 12,

  // Rate Tier
  rateTier: "redRate",

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

function recomputeFixtureCount(state: SanicleanFormState): SanicleanFormState {
  const total = Math.max(0, state.sinks) + Math.max(0, state.urinals) +
                Math.max(0, state.maleToilets) + Math.max(0, state.femaleToilets);
  return { ...state, fixtureCount: total };
}

// All-Inclusive Pricing Calculation
function calculateAllInclusive(
  form: SanicleanFormState,
  config: SanicleanPricingConfig
): SanicleanQuoteResult {
  const fixtureCount = form.fixtureCount;
  const rateTierMultiplier = form.rateTier === "greenRate" ? form.greenRateMultiplier : form.redRateMultiplier;

  // Base Service: $20/fixture/week
  const baseService = fixtureCount * form.allInclusiveWeeklyRatePerFixture * rateTierMultiplier;

  // Soap Upgrade: $5/dispenser/week for luxury (sinks = soap dispensers)
  const soapUpgrade = form.soapType === "luxury" ? form.sinks * form.luxuryUpgradePerDispenser : 0;

  // Excess Soap: beyond "one fill"
  const excessSoap = form.excessSoapGallonsPerWeek > 0 ?
    form.excessSoapGallonsPerWeek * (form.soapType === "luxury" ? form.excessLuxurySoapRate : form.excessStandardSoapRate) : 0;

  // Microfiber Mopping: Included in all-inclusive (no extra charge)
  const microfiberMopping = 0; // Included in base price

  // Paper Overage: $5/fixture/week credit, charge for anything above
  const paperCredit = fixtureCount * form.paperCreditPerFixture;
  const paperOverage = Math.max(0, form.estimatedPaperSpendPerWeek - paperCredit);

  // All-Inclusive: No trip charge, no warranty fees, no facility components
  const tripCharge = 0;
  const warrantyFees = 0;
  const facilityComponents = 0;

  const weeklyTotal = baseService + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage + tripCharge + facilityComponents;
  const monthlyTotal = weeklyTotal * form.weeklyToMonthlyMultiplier;
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
  config: SanicleanPricingConfig
): SanicleanQuoteResult {
  const fixtureCount = form.fixtureCount;
  const rateTierMultiplier = form.rateTier === "greenRate" ? form.greenRateMultiplier : form.redRateMultiplier;

  // Geographic rates
  const isInsideBeltway = form.location === "insideBeltway";
  const fixtureRate = isInsideBeltway ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture;
  const regionMinimum = isInsideBeltway ? form.insideBeltwayMinimum : 0;

  // Base fixture charge
  let baseService = fixtureCount * fixtureRate * rateTierMultiplier;

  // Small facility rule: 5 fixtures or less = $50 minimum (includes trip)
  const isSmallFacility = fixtureCount <= form.smallFacilityThreshold;
  let tripCharge = 0;

  if (isSmallFacility) {
    baseService = Math.max(baseService, form.smallFacilityMinimum); // $50 minimum includes trip
    tripCharge = 0; // Already included in minimum
  } else {
    // Apply regional minimum
    baseService = Math.max(baseService, regionMinimum);

    // Add trip charge
    tripCharge = isInsideBeltway ? form.insideBeltwayTripCharge : form.outsideBeltwayTripCharge;

    // Add parking fee if inside beltway and parking needed
    if (isInsideBeltway && form.needsParking) {
      tripCharge += form.insideBeltwayParkingFee;
    }
  }

  // Facility Components (monthly converted to weekly)
  const monthlyToWeekly = 1 / form.weeklyToMonthlyMultiplier;

  const urinalComponents = form.urinals * (form.urinalScreenMonthly + form.urinalMatMonthly) * monthlyToWeekly;
  const maleToiletComponents = form.maleToilets * (form.toiletClipsMonthly + form.seatCoverDispenserMonthly) * monthlyToWeekly;
  const femaleToiletComponents = form.femaleToilets * form.sanipodServiceMonthly * monthlyToWeekly;
  const facilityComponents = urinalComponents + maleToiletComponents + femaleToiletComponents;

  // Soap upgrades (only applicable if they want luxury)
  const soapUpgrade = form.soapType === "luxury" ? form.sinks * form.luxuryUpgradePerDispenser : 0;

  // Excess soap (not really applicable in per-item model, but kept for compatibility)
  const excessSoap = 0;

  // Microfiber mopping (additional service)
  const microfiberMopping = form.addMicrofiberMopping ?
    form.microfiberBathrooms * form.microfiberMoppingPerBathroom : 0;

  // Warranty fees: Only charge if salesman explicitly enters warranty dispensers
  const soapDispensers = form.sinks;
  const airFresheners = Math.ceil(form.sinks / 2);
  const totalDispensers = soapDispensers + airFresheners;
  const warrantyFees = form.warrantyDispensers > 0 ?
    form.warrantyDispensers * form.warrantyFeePerDispenserPerWeek : 0;

  // No paper overage in per-item model
  const paperOverage = 0;

  const weeklyTotal = baseService + tripCharge + facilityComponents + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage;
  const monthlyTotal = weeklyTotal * form.weeklyToMonthlyMultiplier;
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

  // Fetch configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("saniclean");

      if (!response || response.error || !response.data) {
        console.warn('⚠️ SaniClean config not found in backend, using default values');
        return;
      }

      const document = response.data;
      if (!document.config) {
        console.warn('⚠️ SaniClean document has no config property');
        return;
      }

      const config = document.config as BackendSanicleanConfig;
      setBackendConfig(config);

      console.log('📊 [SaniClean] Backend Config Received:', config);

      // Update form with backend rates
      setForm((prev) => ({
        ...prev,
        // All-Inclusive rates
        allInclusiveWeeklyRatePerFixture: config.allInclusivePackage?.weeklyRatePerFixture ?? prev.allInclusiveWeeklyRatePerFixture,
        luxuryUpgradePerDispenser: config.allInclusivePackage?.soapUpgrade?.luxuryUpgradePerDispenser ?? prev.luxuryUpgradePerDispenser,
        excessStandardSoapRate: config.allInclusivePackage?.soapUpgrade?.excessUsageCharges?.standardSoap ?? prev.excessStandardSoapRate,
        excessLuxurySoapRate: config.allInclusivePackage?.soapUpgrade?.excessUsageCharges?.luxurySoap ?? prev.excessLuxurySoapRate,
        paperCreditPerFixture: config.allInclusivePackage?.paperCredit?.creditPerFixturePerWeek ?? prev.paperCreditPerFixture,
        microfiberMoppingPerBathroom: config.allInclusivePackage?.microfiberMopping?.pricePerBathroom ?? prev.microfiberMoppingPerBathroom,

        // Per-Item rates
        insideBeltwayRatePerFixture: config.perItemCharge?.insideBeltway?.ratePerFixture ?? prev.insideBeltwayRatePerFixture,
        insideBeltwayMinimum: config.perItemCharge?.insideBeltway?.weeklyMinimum ?? prev.insideBeltwayMinimum,
        insideBeltwayTripCharge: config.perItemCharge?.insideBeltway?.tripCharge ?? prev.insideBeltwayTripCharge,
        insideBeltwayParkingFee: config.perItemCharge?.insideBeltway?.parkingFee ?? prev.insideBeltwayParkingFee,
        outsideBeltwayRatePerFixture: config.perItemCharge?.outsideBeltway?.ratePerFixture ?? prev.outsideBeltwayRatePerFixture,
        outsideBeltwayTripCharge: config.perItemCharge?.outsideBeltway?.tripCharge ?? prev.outsideBeltwayTripCharge,

        // Small facility
        smallFacilityThreshold: config.perItemCharge?.smallFacility?.fixtureThreshold ?? prev.smallFacilityThreshold,
        smallFacilityMinimum: config.perItemCharge?.smallFacility?.minimumWeekly ?? prev.smallFacilityMinimum,

        // Components
        urinalScreenMonthly: config.perItemCharge?.facilityComponents?.urinals?.components?.urinalScreen ?? prev.urinalScreenMonthly,
        urinalMatMonthly: config.perItemCharge?.facilityComponents?.urinals?.components?.urinalMat ?? prev.urinalMatMonthly,
        toiletClipsMonthly: config.perItemCharge?.facilityComponents?.maleToilets?.components?.toiletClips ?? prev.toiletClipsMonthly,
        seatCoverDispenserMonthly: config.perItemCharge?.facilityComponents?.maleToilets?.components?.seatCoverDispenser ?? prev.seatCoverDispenserMonthly,
        sanipodServiceMonthly: config.perItemCharge?.facilityComponents?.femaleToilets?.components?.sanipodService ?? prev.sanipodServiceMonthly,

        // Warranty
        warrantyFeePerDispenserPerWeek: config.perItemCharge?.warrantyFees?.perDispenserPerWeek ?? prev.warrantyFeePerDispenserPerWeek,

        // Billing
        weeklyToMonthlyMultiplier: config.billingConversions?.weekly?.monthlyMultiplier ?? prev.weeklyToMonthlyMultiplier,

        // Rate tiers
        redRateMultiplier: config.rateTiers?.redRate?.multiplier ?? prev.redRateMultiplier,
        greenRateMultiplier: config.rateTiers?.greenRate?.multiplier ?? prev.greenRateMultiplier,
      }));

    } catch (error) {
      console.error('❌ Failed to fetch SaniClean config from backend:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchPricing();
  }, []);

  // Calculate quote based on pricing mode
  const quote: SanicleanQuoteResult = useMemo(() => {
    const config = backendConfig || SANICLEAN_CONFIG;

    if (form.pricingMode === "all_inclusive") {
      return calculateAllInclusive(form, config);
    } else {
      return calculatePerItemCharge(form, config);
    }
  }, [form, backendConfig]);

  // Form update helpers
  const updateForm = (updates: Partial<SanicleanFormState>) => {
    setForm((prev) => recomputeFixtureCount({ ...prev, ...updates }));
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

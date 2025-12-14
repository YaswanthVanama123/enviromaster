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
import { useServicesContextOptional } from "../ServicesContext";

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
  const baseServiceCalc = fixtureCount * form.allInclusiveWeeklyRatePerFixture * rateTierMultiplier;
  const baseService = form.customBaseService ?? baseServiceCalc;

  // Soap Upgrade: $5/dispenser/week for luxury (sinks = soap dispensers)
  const soapUpgradeCalc = form.soapType === "luxury" ? form.sinks * form.luxuryUpgradePerDispenser : 0;
  const soapUpgrade = form.customSoapUpgrade ?? soapUpgradeCalc;

  // Excess Soap: beyond "one fill"
  const excessSoapCalc = form.excessSoapGallonsPerWeek > 0 ?
    form.excessSoapGallonsPerWeek * (form.soapType === "luxury" ? form.excessLuxurySoapRate : form.excessStandardSoapRate) : 0;
  const excessSoap = form.customExcessSoap ?? excessSoapCalc;

  // Microfiber Mopping: Included in all-inclusive (no extra charge)
  const microfiberMoppingCalc = 0; // Included in base price
  const microfiberMopping = form.customMicrofiberMopping ?? microfiberMoppingCalc;

  // Paper Overage: $5/fixture/week credit, charge for anything above
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

  // Facility Components (monthly converted to weekly) - Only if enabled and quantities > 0
  const monthlyToWeekly = 1 / form.weeklyToMonthlyMultiplier;

  const urinalComponents = form.addUrinalComponents ?
    (form.urinalScreensQty * form.urinalScreenMonthly + form.urinalMatsQty * form.urinalMatMonthly) * monthlyToWeekly : 0;
  const maleToiletComponents = form.addMaleToiletComponents ?
    (form.toiletClipsQty * form.toiletClipsMonthly + form.seatCoverDispensersQty * form.seatCoverDispenserMonthly) * monthlyToWeekly : 0;
  const femaleToiletComponents = form.addFemaleToiletComponents ?
    form.sanipodsQty * form.sanipodServiceMonthly * monthlyToWeekly : 0;
  const facilityComponentsCalc = urinalComponents + maleToiletComponents + femaleToiletComponents;
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

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // Fetch configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
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
      console.error('❌ Failed to fetch SaniClean config from backend:', error);

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

  // Helper function to update form with config data
  const updateFormWithConfig = (config: any) => {
    setForm((prev) => ({
      ...prev,
      // ✅ Map backend API fields to form state (supports both old and new format)
      // All-Inclusive rates
      allInclusiveWeeklyRatePerFixture: config.allInclusivePricing?.pricePerFixture ??
                                        config.allInclusivePackage?.weeklyRatePerFixture ??
                                        prev.allInclusiveWeeklyRatePerFixture,

      luxuryUpgradePerDispenser: config.soapUpgrades?.standardToLuxuryPerDispenserPerWeek ??
                                 config.allInclusivePackage?.soapUpgrade?.luxuryUpgradePerDispenser ??
                                 prev.luxuryUpgradePerDispenser,

      excessStandardSoapRate: config.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon ??
                              config.allInclusivePackage?.soapUpgrade?.excessUsageCharges?.standardSoap ??
                              prev.excessStandardSoapRate,

      excessLuxurySoapRate: config.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon ??
                            config.allInclusivePackage?.soapUpgrade?.excessUsageCharges?.luxurySoap ??
                            prev.excessLuxurySoapRate,

      paperCreditPerFixture: config.paperCredit?.creditPerFixturePerWeek ??
                             config.allInclusivePackage?.paperCredit?.creditPerFixturePerWeek ??
                             prev.paperCreditPerFixture,

      microfiberMoppingPerBathroom: config.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom ??
                                     config.allInclusivePackage?.microfiberMopping?.pricePerBathroom ??
                                     prev.microfiberMoppingPerBathroom,

      // Per-Item rates
      insideBeltwayRatePerFixture: config.standardALaCartePricing?.insideBeltway?.pricePerFixture ??
                                    config.perItemCharge?.insideBeltway?.ratePerFixture ??
                                    prev.insideBeltwayRatePerFixture,

      insideBeltwayMinimum: config.standardALaCartePricing?.insideBeltway?.minimumPrice ??
                            config.perItemCharge?.insideBeltway?.weeklyMinimum ??
                            prev.insideBeltwayMinimum,

      insideBeltwayTripCharge: config.standardALaCartePricing?.insideBeltway?.tripCharge ??
                               config.tripChargesNonAllInclusiveOnly?.beltway ??
                               config.perItemCharge?.insideBeltway?.tripCharge ??
                               prev.insideBeltwayTripCharge,

      insideBeltwayParkingFee: config.standardALaCartePricing?.insideBeltway?.parkingFeeAddOn ??
                               config.perItemCharge?.insideBeltway?.parkingFee ??
                               prev.insideBeltwayParkingFee,

      outsideBeltwayRatePerFixture: config.standardALaCartePricing?.outsideBeltway?.pricePerFixture ??
                                     config.perItemCharge?.outsideBeltway?.ratePerFixture ??
                                     prev.outsideBeltwayRatePerFixture,

      outsideBeltwayTripCharge: config.standardALaCartePricing?.outsideBeltway?.tripCharge ??
                                config.tripChargesNonAllInclusiveOnly?.standard ??
                                config.perItemCharge?.outsideBeltway?.tripCharge ??
                                prev.outsideBeltwayTripCharge,

      // Small facility
      smallFacilityThreshold: config.smallBathroomMinimums?.minimumFixturesThreshold ??
                              config.perItemCharge?.smallFacility?.fixtureThreshold ??
                              prev.smallFacilityThreshold,

      smallFacilityMinimum: config.smallBathroomMinimums?.minimumPriceUnderThreshold ??
                            config.minimumChargePerVisit ??
                            config.perItemCharge?.smallFacility?.minimumWeekly ??
                            prev.smallFacilityMinimum,

      // Components
      urinalScreenMonthly: typeof config.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'number' ?
                           config.monthlyAddOnSupplyPricing.urinalScreenMonthlyPrice :
                           (config.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'included' ? 0 :
                           (config.perItemCharge?.facilityComponents?.urinals?.components?.urinalScreen ?? prev.urinalScreenMonthly)),

      urinalMatMonthly: config.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice ??
                        config.perItemCharge?.facilityComponents?.urinals?.components?.urinalMat ??
                        prev.urinalMatMonthly,

      toiletClipsMonthly: config.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice ??
                          config.perItemCharge?.facilityComponents?.maleToilets?.components?.toiletClips ??
                          prev.toiletClipsMonthly,

      seatCoverDispenserMonthly: typeof config.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'number' ?
                                 config.monthlyAddOnSupplyPricing.toiletSeatCoverDispenserMonthlyPrice :
                                 (config.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'included' ? 0 :
                                 (config.perItemCharge?.facilityComponents?.maleToilets?.components?.seatCoverDispenser ?? prev.seatCoverDispenserMonthly)),

      sanipodServiceMonthly: config.monthlyAddOnSupplyPricing?.sanipodMonthlyPricePerPod ??
                             config.perItemCharge?.facilityComponents?.femaleToilets?.components?.sanipodService ??
                             prev.sanipodServiceMonthly,

      // Warranty
      warrantyFeePerDispenserPerWeek: (config.warrantyFees?.soapDispenserWarrantyFeePerWeek ??
                                       config.warrantyFees?.airFreshenerDispenserWarrantyFeePerWeek ??
                                       config.perItemCharge?.warrantyFees?.perDispenserPerWeek ??
                                       prev.warrantyFeePerDispenserPerWeek),

      // Billing
      weeklyToMonthlyMultiplier: config.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ??
                                 config.billingConversions?.weekly?.monthlyMultiplier ??
                                 prev.weeklyToMonthlyMultiplier,

      // Rate tiers
      redRateMultiplier: config.rateTiers?.redRate?.multiplier ?? prev.redRateMultiplier,
      greenRateMultiplier: config.rateTiers?.greenRate?.multiplier ?? prev.greenRateMultiplier,
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

    // 3. Calculate monthly/contract from effective weekly (cascade)
    const calculatedMonthly = effectiveWeeklyTotal * form.weeklyToMonthlyMultiplier;
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

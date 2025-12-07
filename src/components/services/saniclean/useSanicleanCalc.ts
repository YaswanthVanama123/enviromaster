// src/features/services/saniclean/useSanicleanCalc.ts
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  SanicleanFormState,
  SanicleanPricingMode,
  SanicleanRateTier,
} from "./sanicleanTypes";
import { sanicleanPricingConfig as cfg } from "./sanicleanConfig";
import { serviceConfigApi } from "../../../backendservice/api";

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendSanicleanConfig {
  geographicPricing: {
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
  };
  smallFacilityMinimum: {
    fixtureThreshold: number;
    minimumWeeklyCharge: number;
    includesTripCharge: boolean;
  };
  allInclusivePackage: {
    weeklyRatePerFixture: number;
    includeAllAddOns: boolean;
    waiveTripCharge: boolean;
    waiveWarrantyFees: boolean;
    autoAllInclusiveMinFixtures: number;
  };
  soapUpgrades: {
    standardToLuxury: number;
    excessUsageCharges: {
      standardSoap: number;
      luxurySoap: number;
    };
  };
  warrantyFeePerDispenser: number;
  paperCredit: {
    creditPerFixturePerWeek: number;
  };
  facilityComponents: {
    urinals: {
      urinalScreen: number;
      urinalMat: number;
    };
    maleToilets: {
      toiletClips: number;
      seatCoverDispenser: number;
    };
    femaleToilets: {
      sanipodService: number;
    };
    sinks: {
      ratioSinkToSoap: number;
      ratioSinkToAirFreshener: number;
    };
  };
  addOnServices: {
    microfiberMopping: {
      pricePerBathroom: number;
    };
  };
  billingConversions: {
    weekly: {
      monthlyMultiplier: number;
      annualMultiplier: number;
    };
  };
  rateTiers: {
    redRate: {
      multiplier: number;
      commissionRate: number;
    };
    greenRate: {
      multiplier: number;
      commissionRate: number;
    };
  };
}

const DEFAULT_FORM: SanicleanFormState = {
  serviceId: "saniclean",

  fixtureCount: 0,

  location: "insideBeltway",
  needsParking: false,
  pricingMode: "auto",

  sinks: 0,
  urinals: 0,
  maleToilets: 0,
  femaleToilets: 0,

  soapType: "standard",
  excessSoapGallonsPerWeek: 0,

  addMicrofiberMopping: false,
  microfiberBathrooms: 0,

  estimatedPaperSpendPerWeek: 0,

  // global new rule: contract dropdown (2–36 months)
  contractMonths: 12,

  rateTier: "redRate",

  notes: "",

  // ✅ NEW: Editable pricing rates from config (will be overridden by backend)
  insideBeltwayRatePerFixture: cfg.geographicPricing.insideBeltway.ratePerFixture,
  insideBeltwayWeeklyMinimum: cfg.geographicPricing.insideBeltway.weeklyMinimum,
  insideBeltwayTripCharge: cfg.geographicPricing.insideBeltway.tripCharge,
  insideBeltwayParkingFee: cfg.geographicPricing.insideBeltway.parkingFee,
  outsideBeltwayRatePerFixture: cfg.geographicPricing.outsideBeltway.ratePerFixture,
  outsideBeltwayWeeklyMinimum: cfg.geographicPricing.outsideBeltway.weeklyMinimum,
  outsideBeltwayTripCharge: cfg.geographicPricing.outsideBeltway.tripCharge,
  smallFacilityThreshold: cfg.smallFacilityMinimum.fixtureThreshold,
  smallFacilityMinimumWeekly: cfg.smallFacilityMinimum.minimumWeeklyCharge,
  allInclusiveWeeklyRate: cfg.allInclusivePackage.weeklyRatePerFixture,
  allInclusiveMinFixtures: cfg.allInclusivePackage.autoAllInclusiveMinFixtures,
  standardToLuxuryRate: cfg.soapUpgrades.standardToLuxury,
  excessStandardSoapRate: cfg.soapUpgrades.excessUsageCharges.standardSoap,
  excessLuxurySoapRate: cfg.soapUpgrades.excessUsageCharges.luxurySoap,
  warrantyFeePerDispenser: cfg.warrantyFeePerDispenser,
  paperCreditPerFixturePerWeek: cfg.paperCredit.creditPerFixturePerWeek,
  urinalScreenRate: cfg.facilityComponents.urinals.urinalScreen,
  urinalMatRate: cfg.facilityComponents.urinals.urinalMat,
  toiletClipsRate: cfg.facilityComponents.maleToilets.toiletClips,
  seatCoverDispenserRate: cfg.facilityComponents.maleToilets.seatCoverDispenser,
  sanipodServiceRate: cfg.facilityComponents.femaleToilets.sanipodService,
  microfiberMoppingPerBathroom: cfg.addOnServices.microfiberMopping.pricePerBathroom,
  weeklyToMonthlyMultiplier: cfg.billingConversions.weekly.monthlyMultiplier,
  weeklyToAnnualMultiplier: cfg.billingConversions.weekly.annualMultiplier,
  redRateMultiplier: cfg.rateTiers.redRate.multiplier,
  greenRateMultiplier: cfg.rateTiers.greenRate.multiplier,

  // ✅ NEW: Independent fixture rates (no auto-population)
  sinkRate: cfg.geographicPricing.insideBeltway.ratePerFixture,
  urinalRate: cfg.geographicPricing.insideBeltway.ratePerFixture,
  maleToiletRate: cfg.geographicPricing.insideBeltway.ratePerFixture,
  femaleToiletRate: cfg.geographicPricing.insideBeltway.ratePerFixture,

  // ✅ NEW: Independent facility component quantities and rates (no auto-population)
  urinalComponentsQty: 0,
  urinalComponentsRate: (cfg.facilityComponents.urinals.urinalScreen || 0) + (cfg.facilityComponents.urinals.urinalMat || 0),
  maleToiletComponentsQty: 0,
  maleToiletComponentsRate: (cfg.facilityComponents.maleToilets.toiletClips || 0) + (cfg.facilityComponents.maleToilets.seatCoverDispenser || 0),
  femaleToiletComponentsQty: 0,
  femaleToiletComponentsRate: cfg.facilityComponents.femaleToilets.sanipodService || 0,

  // ✅ NEW: Independent warranty (no auto-population from sinks)
  warrantyQty: 0,
  warrantyRate: cfg.warrantyFeePerDispenser || 0,
};

function recomputeFixtureCount(state: SanicleanFormState): SanicleanFormState {
  const total =
    Math.max(0, state.sinks) +
    Math.max(0, state.urinals) +
    Math.max(0, state.maleToilets) +
    Math.max(0, state.femaleToilets);

  return { ...state, fixtureCount: total };
}

export function useSanicleanCalc(initial?: Partial<SanicleanFormState>) {
  const [form, setForm] = useState<SanicleanFormState>(() =>
    recomputeFixtureCount({
      ...DEFAULT_FORM,
      ...initial,
    } as SanicleanFormState)
  );

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendSanicleanConfig | null>(null);

  // ✅ Loading state for refresh button
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("saniclean");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ SaniClean config not found in backend, using default fallback values');
        return;
      }

      // ✅ Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ SaniClean document has no config property');
        return;
      }

      const config = document.config as BackendSanicleanConfig;

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);

      console.log('📊 [SaniClean] Backend Config Received:', {
        allInclusiveRate: config.allInclusivePackage?.weeklyRatePerFixture,
        smallFacilityMinimum: config.smallFacilityMinimum?.minimumWeeklyCharge,
        insideBeltway: {
          ratePerFixture: config.geographicPricing?.insideBeltway?.ratePerFixture,
          weeklyMinimum: config.geographicPricing?.insideBeltway?.weeklyMinimum,
        },
        outsideBeltway: {
          ratePerFixture: config.geographicPricing?.outsideBeltway?.ratePerFixture,
          weeklyMinimum: config.geographicPricing?.outsideBeltway?.weeklyMinimum,
        },
      });

      setForm((prev) => {
        console.log('📊 [SaniClean] Updating Form State:', {
          before: {
            allInclusiveWeeklyRate: prev.allInclusiveWeeklyRate,
            smallFacilityMinimumWeekly: prev.smallFacilityMinimumWeekly,
            insideBeltwayRatePerFixture: prev.insideBeltwayRatePerFixture,
          },
          after: {
            allInclusiveWeeklyRate: config.allInclusivePackage?.weeklyRatePerFixture ?? prev.allInclusiveWeeklyRate,
            smallFacilityMinimumWeekly: config.smallFacilityMinimum?.minimumWeeklyCharge ?? prev.smallFacilityMinimumWeekly,
            insideBeltwayRatePerFixture: config.geographicPricing?.insideBeltway?.ratePerFixture ?? prev.insideBeltwayRatePerFixture,
          },
        });

        return {
          ...prev,
          // Update all rate fields from backend if available
          insideBeltwayRatePerFixture: config.geographicPricing?.insideBeltway?.ratePerFixture ?? prev.insideBeltwayRatePerFixture,
          insideBeltwayWeeklyMinimum: config.geographicPricing?.insideBeltway?.weeklyMinimum ?? prev.insideBeltwayWeeklyMinimum,
          insideBeltwayTripCharge: config.geographicPricing?.insideBeltway?.tripCharge ?? prev.insideBeltwayTripCharge,
          insideBeltwayParkingFee: config.geographicPricing?.insideBeltway?.parkingFee ?? prev.insideBeltwayParkingFee,
          outsideBeltwayRatePerFixture: config.geographicPricing?.outsideBeltway?.ratePerFixture ?? prev.outsideBeltwayRatePerFixture,
          outsideBeltwayWeeklyMinimum: config.geographicPricing?.outsideBeltway?.weeklyMinimum ?? prev.outsideBeltwayWeeklyMinimum,
          outsideBeltwayTripCharge: config.geographicPricing?.outsideBeltway?.tripCharge ?? prev.outsideBeltwayTripCharge,
          smallFacilityThreshold: config.smallFacilityMinimum?.fixtureThreshold ?? prev.smallFacilityThreshold,
          smallFacilityMinimumWeekly: config.smallFacilityMinimum?.minimumWeeklyCharge ?? prev.smallFacilityMinimumWeekly,
          allInclusiveWeeklyRate: config.allInclusivePackage?.weeklyRatePerFixture ?? prev.allInclusiveWeeklyRate,
          allInclusiveMinFixtures: config.allInclusivePackage?.autoAllInclusiveMinFixtures ?? prev.allInclusiveMinFixtures,
          standardToLuxuryRate: config.soapUpgrades?.standardToLuxury ?? prev.standardToLuxuryRate,
          excessStandardSoapRate: config.soapUpgrades?.excessUsageCharges?.standardSoap ?? prev.excessStandardSoapRate,
          excessLuxurySoapRate: config.soapUpgrades?.excessUsageCharges?.luxurySoap ?? prev.excessLuxurySoapRate,
          warrantyFeePerDispenser: config.warrantyFeePerDispenser ?? prev.warrantyFeePerDispenser,
          paperCreditPerFixturePerWeek: config.paperCredit?.creditPerFixturePerWeek ?? prev.paperCreditPerFixturePerWeek,
          urinalScreenRate: config.facilityComponents?.urinals?.urinalScreen ?? prev.urinalScreenRate,
          urinalMatRate: config.facilityComponents?.urinals?.urinalMat ?? prev.urinalMatRate,
          toiletClipsRate: config.facilityComponents?.maleToilets?.toiletClips ?? prev.toiletClipsRate,
          seatCoverDispenserRate: config.facilityComponents?.maleToilets?.seatCoverDispenser ?? prev.seatCoverDispenserRate,
          sanipodServiceRate: config.facilityComponents?.femaleToilets?.sanipodService ?? prev.sanipodServiceRate,
          microfiberMoppingPerBathroom: config.addOnServices?.microfiberMopping?.pricePerBathroom ?? prev.microfiberMoppingPerBathroom,
          weeklyToMonthlyMultiplier: config.billingConversions?.weekly?.monthlyMultiplier ?? prev.weeklyToMonthlyMultiplier,
          weeklyToAnnualMultiplier: config.billingConversions?.weekly?.annualMultiplier ?? prev.weeklyToAnnualMultiplier,
          redRateMultiplier: config.rateTiers?.redRate?.multiplier ?? prev.redRateMultiplier,
          greenRateMultiplier: config.rateTiers?.greenRate?.multiplier ?? prev.greenRateMultiplier,

          // ✅ NEW: Initialize individual fixture rates from backend
          sinkRate: config.geographicPricing?.insideBeltway?.ratePerFixture ?? prev.sinkRate,
          urinalRate: config.geographicPricing?.insideBeltway?.ratePerFixture ?? prev.urinalRate,
          maleToiletRate: config.geographicPricing?.insideBeltway?.ratePerFixture ?? prev.maleToiletRate,
          femaleToiletRate: config.geographicPricing?.insideBeltway?.ratePerFixture ?? prev.femaleToiletRate,

          // ✅ NEW: Initialize facility component rates from backend
          urinalComponentsRate: ((config.facilityComponents?.urinals?.urinalScreen || 0) + (config.facilityComponents?.urinals?.urinalMat || 0)) || prev.urinalComponentsRate,
          maleToiletComponentsRate: ((config.facilityComponents?.maleToilets?.toiletClips || 0) + (config.facilityComponents?.maleToilets?.seatCoverDispenser || 0)) || prev.maleToiletComponentsRate,
          femaleToiletComponentsRate: (config.facilityComponents?.femaleToilets?.sanipodService || 0) || prev.femaleToiletComponentsRate,

          // ✅ NEW: Initialize warranty rate from backend
          warrantyRate: config.warrantyFeePerDispenser || prev.warrantyRate,
        };
      });

      console.log('✅ SaniClean FULL CONFIG loaded from backend:', {
        geographicPricing: config.geographicPricing,
        smallFacilityMinimum: config.smallFacilityMinimum,
        allInclusivePackage: config.allInclusivePackage,
        soapUpgrades: config.soapUpgrades,
        warrantyFee: config.warrantyFeePerDispenser,
        paperCredit: config.paperCredit,
        facilityComponents: config.facilityComponents,
        addOnServices: config.addOnServices,
        billingConversions: config.billingConversions,
        rateTiers: config.rateTiers,
      });
    } catch (error) {
      console.error('❌ Failed to fetch SaniClean config from backend:', error);
      console.log('⚠️ Using default hardcoded values as fallback');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchPricing();
  }, []); // Run once on mount

  const onChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {
      let next: SanicleanFormState = { ...prev };

      switch (name) {
        case "needsParking":
        case "addMicrofiberMopping":
          next = { ...next, [name]: type === "checkbox" ? !!checked : !!value };
          break;

        case "fixtureCount":
        case "sinks":
        case "urinals":
        case "maleToilets":
        case "femaleToilets":
        case "excessSoapGallonsPerWeek":
        case "microfiberBathrooms":
        case "estimatedPaperSpendPerWeek":
        case "contractMonths": {
          const num = value === "" ? 0 : Number(value);
          next = { ...next, [name]: Number.isFinite(num) ? num : 0 };
          break;
        }

        // ✅ NEW: Handle editable rate fields
        case "insideBeltwayRatePerFixture":
        case "insideBeltwayWeeklyMinimum":
        case "insideBeltwayTripCharge":
        case "insideBeltwayParkingFee":
        case "outsideBeltwayRatePerFixture":
        case "outsideBeltwayWeeklyMinimum":
        case "outsideBeltwayTripCharge":
        case "smallFacilityThreshold":
        case "smallFacilityMinimumWeekly":
        case "allInclusiveWeeklyRate":
        case "allInclusiveMinFixtures":
        case "standardToLuxuryRate":
        case "excessStandardSoapRate":
        case "excessLuxurySoapRate":
        case "warrantyFeePerDispenser":
        case "paperCreditPerFixturePerWeek":
        case "urinalScreenRate":
        case "urinalMatRate":
        case "toiletClipsRate":
        case "seatCoverDispenserRate":
        case "sanipodServiceRate":
        case "microfiberMoppingPerBathroom":
        case "weeklyToMonthlyMultiplier":
        case "weeklyToAnnualMultiplier":
        case "redRateMultiplier":
        case "greenRateMultiplier":
        case "sinkRate":
        case "urinalRate":
        case "maleToiletRate":
        case "femaleToiletRate":
        case "urinalComponentsQty":
        case "urinalComponentsRate":
        case "maleToiletComponentsQty":
        case "maleToiletComponentsRate":
        case "femaleToiletComponentsQty":
        case "femaleToiletComponentsRate":
        case "warrantyQty":
        case "warrantyRate": {
          const num = parseFloat(String(value));
          next = { ...next, [name]: Number.isFinite(num) && num >= 0 ? num : 0 };
          break;
        }

        // ✅ NEW: Handle custom override fields
        case "customWeeklyBase":
        case "customWeeklyTrip":
        case "customFacilityComponents":
        case "customSoapUpgrade":
        case "customWarranty":
        case "customMicrofiber":
        case "customWeeklyTotal":
        case "customMonthlyTotal":
        case "customAnnualTotal": {
          const numVal = value === '' ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            next = { ...next, [name]: numVal };
          }
          return next;
        }

        case "location":
          next = { ...next, location: value as SanicleanFormState["location"] };
          break;

        case "pricingMode":
          next = {
            ...next,
            pricingMode: value as SanicleanPricingMode,
          };
          break;

        case "soapType":
          next = { ...next, soapType: value as SanicleanFormState["soapType"] };
          break;

        case "rateTier":
          next = { ...next, rateTier: value as SanicleanRateTier };
          break;

        case "notes":
          next = { ...next, notes: value };
          break;

        default:
          next = { ...next, [name]: value };
          break;
      }

      next = recomputeFixtureCount(next);
      return next;
    });
  };

  const { quote, calc } = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = backendConfig || {
      geographicPricing: cfg.geographicPricing,
      smallFacilityMinimum: cfg.smallFacilityMinimum,
      allInclusivePackage: cfg.allInclusivePackage,
      soapUpgrades: cfg.soapUpgrades,
      warrantyFeePerDispenser: cfg.warrantyFeePerDispenser,
      paperCredit: cfg.paperCredit,
      facilityComponents: cfg.facilityComponents,
      addOnServices: cfg.addOnServices,
      billingConversions: cfg.billingConversions,
      rateTiers: cfg.rateTiers,
    };

    const {
      fixtureCount,
      location,
      needsParking,
      pricingMode,
      sinks,
      urinals,
      maleToilets,
      femaleToilets,
      soapType,
      excessSoapGallonsPerWeek,
      addMicrofiberMopping,
      microfiberBathrooms,
      estimatedPaperSpendPerWeek,
      rateTier,
    } = form;

    const fixtures = Math.max(0, fixtureCount);
    const visitsPerWeek = 1; // SaniClean is weekly

    // No fixtures → no charge
    if (fixtures === 0) {
      const zeroQuote: ServiceQuoteResult = {
        serviceId: "saniclean",
        displayName: "SaniClean",
        perVisitPrice: 0,
        annualPrice: 0,
        detailsBreakdown: [
          "No restroom fixtures configured – no SaniClean charge.",
        ],
      };

      const zeroCalc = {
        method: "geographic_standard" as const,
        weeklyBase: 0,
        weeklyTrip: 0,
        weeklyFacilityComponents: 0,
        weeklySoapUpgrade: 0,
        weeklySoapLuxuryUpgrade: 0,
        weeklySoapExtraUsage: 0,
        weeklyWarranty: 0,
        weeklyMicrofiber: 0,
        weeklyPaperCredit: 0,
        weeklyPaperOverage: 0,
        weeklySubtotal: 0,
        weeklyTotal: 0,
        monthlyTotal: 0,
        annualTotal: 0,
        dispenserCount: 0,  // ✅ No longer used - kept for compatibility
        soapDispensers: 0,
        airFreshDispensers: 0,
        monthlyFacilityComponents: 0,
        rateMultiplier: 1,
        baseFixtureRateUsed: 0,
        baseFixtureChargeRaw: 0,
        smallFacilityMinApplied: false,
        tripUnits: 0,
        tripRateUsed: 0,
        microfiberRatePerBathroom: form.microfiberMoppingPerBathroom,  // ✅ USE FORM VALUE
        warrantyRatePerDispenser: form.warrantyFeePerDispenser,  // ✅ USE FORM VALUE
        paperCreditRatePerFixture: form.paperCreditPerFixturePerWeek,  // ✅ USE FORM VALUE
        extraSoapRatePerGallon: 0,
        sinksChargeRaw: 0,
        urinalsChargeRaw: 0,
        maleToiletsChargeRaw: 0,
        femaleToiletsChargeRaw: 0,
        paperSpendPerWeek: 0,
      };

      return { quote: zeroQuote, calc: zeroCalc };
    }

    // ---------- Decide pricing method ----------
    type InternalMethod =
      | "all_inclusive"
      | "geographic_standard"
      | "small_facility_minimum";

    let method: InternalMethod = "geographic_standard";

    if (pricingMode === "all_inclusive") {
      method = "all_inclusive";
    } else if (pricingMode === "geographic_standard") {
      if (
        fixtures > 0 &&
        fixtures <= form.smallFacilityThreshold  // ✅ USE FORM VALUE (from backend)
      ) {
        method = "small_facility_minimum";
      } else {
        method = "geographic_standard";
      }
    } else {
      // auto mode
      if (fixtures >= form.allInclusiveMinFixtures) {  // ✅ USE FORM VALUE (from backend)
        method = "all_inclusive";
      } else if (
        fixtures > 0 &&
        fixtures <= form.smallFacilityThreshold  // ✅ USE FORM VALUE (from backend)
      ) {
        method = "small_facility_minimum";
      } else {
        method = "geographic_standard";
      }
    }

    // ---------- Base weekly charges ----------
    // ✅ Use form values for geographic pricing (from backend)
    const ratePerFixture = location === "insideBeltway"
      ? form.insideBeltwayRatePerFixture
      : form.outsideBeltwayRatePerFixture;

    const weeklyMinimum = location === "insideBeltway"
      ? form.insideBeltwayWeeklyMinimum
      : form.outsideBeltwayWeeklyMinimum;

    const tripCharge = location === "insideBeltway"
      ? form.insideBeltwayTripCharge
      : form.outsideBeltwayTripCharge;

    const parkingFee = location === "insideBeltway"
      ? form.insideBeltwayParkingFee
      : 0;

    const parkingAddon =
      location === "insideBeltway" && needsParking ? parkingFee : 0;

    const baseFixtureRateUsed =
      method === "all_inclusive"
        ? form.allInclusiveWeeklyRate  // ✅ USE FORM VALUE (from backend, $20 / fixture / wk)
        : ratePerFixture;

    const baseFixtureChargeRaw = fixtures * baseFixtureRateUsed;

    // ✅ Individual fixture charges using separate rates (no auto-population)
    const sinksChargeRaw = sinks * form.sinkRate;
    const urinalsChargeRaw = urinals * form.urinalRate;
    const maleToiletsChargeRaw = maleToilets * form.maleToiletRate;
    const femaleToiletsChargeRaw = femaleToilets * form.femaleToiletRate;

    let weeklyBase = 0;
    let weeklyTrip = 0;
    let smallFacilityMinApplied = false;

    if (method === "all_inclusive") {
      // All-inclusive: fixtures × $20, no trip charges
      weeklyBase = baseFixtureChargeRaw;
      weeklyTrip = 0;
    } else if (method === "small_facility_minimum") {
      // $50 minimum, no trip charges
      weeklyBase = form.smallFacilityMinimumWeekly;  // ✅ USE FORM VALUE (from backend)

      console.log('📊 [SaniClean Calc] Small Facility Minimum Applied:', {
        weeklyBase: form.smallFacilityMinimumWeekly,
        fromFormValue: form.smallFacilityMinimumWeekly,
        fixtureThreshold: form.smallFacilityThreshold,
        currentFixtures: fixtures,
      });

      weeklyTrip = 0; // No trip charges
      smallFacilityMinApplied = weeklyBase > baseFixtureChargeRaw;
    } else {
      // Geographic per-fixture with weekly facility minimum, no trip charges
      const perFixtureWeekly = baseFixtureChargeRaw;
      weeklyBase = Math.max(perFixtureWeekly, weeklyMinimum);  // ✅ USE weeklyMinimum from form

      console.log('📊 [SaniClean Calc] Geographic Standard Applied:', {
        perFixtureWeekly,
        weeklyMinimum: weeklyMinimum,
        weeklyBase,
        location: form.location,
        ratePerFixture: ratePerFixture,
        fixtures: fixtures,
      });

      weeklyTrip = 0; // No trip charges
    }

    const tripUnits = weeklyTrip > 0 ? 1 : 0;
    const tripRateUsed = weeklyTrip;

    // ---------- Facility components (NOT in all-inclusive) ----------
    let weeklyFacilityComponents = 0;
    let monthlyFacilityComponents = 0;

    const includeFacilityComponentsAsAddOns = !(
      method === "all_inclusive" && activeConfig.allInclusivePackage.includeAllAddOns  // ✅ FROM BACKEND
    );

    if (includeFacilityComponentsAsAddOns) {
      // ✅ NEW: Use independent facility component quantities and rates (no auto-population)
      // Ensure all values are numbers and default to 0 if NaN
      const urinalQty = isNaN(form.urinalComponentsQty) ? 0 : form.urinalComponentsQty;
      const urinalRate = isNaN(form.urinalComponentsRate) ? 0 : form.urinalComponentsRate;
      const maleQty = isNaN(form.maleToiletComponentsQty) ? 0 : form.maleToiletComponentsQty;
      const maleRate = isNaN(form.maleToiletComponentsRate) ? 0 : form.maleToiletComponentsRate;
      const femaleQty = isNaN(form.femaleToiletComponentsQty) ? 0 : form.femaleToiletComponentsQty;
      const femaleRate = isNaN(form.femaleToiletComponentsRate) ? 0 : form.femaleToiletComponentsRate;

      const monthlyUrinals = urinalQty * urinalRate;
      const monthlyMale = maleQty * maleRate;
      const monthlyFemale = femaleQty * femaleRate;

      monthlyFacilityComponents = monthlyUrinals + monthlyMale + monthlyFemale;

      const weeklyMultiplier = isNaN(form.weeklyToMonthlyMultiplier) ? 4.33 : form.weeklyToMonthlyMultiplier;
      weeklyFacilityComponents = monthlyFacilityComponents / weeklyMultiplier;
    }

    // ---------- Dispensers, warranty & soap ----------
    const soapDispensers =
      sinks * activeConfig.facilityComponents.sinks.ratioSinkToSoap;  // ✅ FROM BACKEND

    const airFreshDispensers =
      sinks > 0
        ? Math.ceil(
            sinks / activeConfig.facilityComponents.sinks.ratioSinkToAirFreshener  // ✅ FROM BACKEND
          )
        : 0;

    const dispenserCount = soapDispensers + airFreshDispensers;  // ✅ Kept for display only - no longer used in warranty calculation

    const luxuryUpgradeRatePerDispenser = form.standardToLuxuryRate;  // ✅ USE FORM VALUE (from backend)

    let weeklySoapLuxuryUpgrade = 0;
    let weeklySoapExtraUsage = 0;
    let extraSoapRatePerGallon = 0;

    if (soapType === "luxury" && soapDispensers > 0) {
      weeklySoapLuxuryUpgrade =
        soapDispensers * luxuryUpgradeRatePerDispenser;
    }

    if (excessSoapGallonsPerWeek > 0) {
      extraSoapRatePerGallon =
        soapType === "luxury"
          ? form.excessLuxurySoapRate  // ✅ USE FORM VALUE (from backend)
          : form.excessStandardSoapRate;  // ✅ USE FORM VALUE (from backend)

      weeklySoapExtraUsage =
        excessSoapGallonsPerWeek * extraSoapRatePerGallon;
    }

    const weeklySoapUpgrade =
      weeklySoapLuxuryUpgrade + weeklySoapExtraUsage;

    // ---------- Warranty (NOT in all-inclusive) - MANUAL ENTRY ----------
    let weeklyWarranty = 0;
    const warrantyApplies = !(
      method === "all_inclusive" && activeConfig.allInclusivePackage.waiveWarrantyFees  // ✅ FROM BACKEND
    );

    if (warrantyApplies) {
      // ✅ NEW: Use manual warranty quantity and rate (no auto-calculation from sinks)
      const warrantyQty = isNaN(form.warrantyQty) ? 0 : form.warrantyQty;
      const warrantyRate = isNaN(form.warrantyRate) ? 0 : form.warrantyRate;
      weeklyWarranty = warrantyQty * warrantyRate;
    }

    // Microfiber mopping $10 / bathroom / week (NOT in all-inclusive)
    const microfiberRatePerBathroom = form.microfiberMoppingPerBathroom;  // ✅ USE FORM VALUE (from backend)

    let weeklyMicrofiber = 0;
    if (
      addMicrofiberMopping &&
      microfiberBathrooms > 0 &&
      method !== "all_inclusive"
    ) {
      weeklyMicrofiber = microfiberBathrooms * microfiberRatePerBathroom;
    }

    // ---------- Paper credit & overage (ALL-INCLUSIVE ONLY) ----------
    let weeklyPaperCredit = 0;
    let weeklyPaperOverage = 0;
    const paperCreditRatePerFixture = form.paperCreditPerFixturePerWeek;  // ✅ USE FORM VALUE (from backend)

    if (method === "all_inclusive") {
      const credit = fixtures * paperCreditRatePerFixture;
      weeklyPaperCredit = credit;

      if (estimatedPaperSpendPerWeek > credit) {
        weeklyPaperOverage = estimatedPaperSpendPerWeek - credit;
      }
    }

    // ---------- Rate tier multiplier ----------
    // ✅ USE FORM VALUES (from backend) for rate multipliers
    const rateMultiplier = rateTier === "greenRate"
      ? form.greenRateMultiplier
      : form.redRateMultiplier;

    // Weekly total calculation - only include add-ons if salesman manually enters them (> 0)
    const weeklyRaw = weeklyBase +
      (weeklyFacilityComponents > 0 ? weeklyFacilityComponents : 0) +
      (weeklySoapUpgrade > 0 ? weeklySoapUpgrade : 0) +
      (weeklyWarranty > 0 ? weeklyWarranty : 0) +
      (weeklyMicrofiber > 0 ? weeklyMicrofiber : 0) +
      (weeklyPaperOverage > 0 ? weeklyPaperOverage : 0);

    const weeklySubtotal = weeklyRaw * rateMultiplier;

    const weeklyTotal = weeklySubtotal;
    const monthlyTotal =
      weeklyTotal * form.weeklyToMonthlyMultiplier;  // ✅ USE FORM VALUE (from backend)
    const annualTotal =
      weeklyTotal * form.weeklyToAnnualMultiplier;  // ✅ USE FORM VALUE (from backend)

    const perVisitPrice =
      visitsPerWeek > 0 ? weeklyTotal / visitsPerWeek : weeklyTotal;

    const methodLabel =
      method === "all_inclusive"
        ? "All Inclusive"
        : method === "small_facility_minimum"
        ? "Small Facility Minimum"
        : "Geographic Standard";

    const quote: ServiceQuoteResult = {
      serviceId: "saniclean",
      displayName: "SaniClean",
      perVisitPrice,
      // still returning annualPrice for global aggregator, but UI won’t show it
      annualPrice: annualTotal,
      detailsBreakdown: [
        `Method: ${methodLabel}`,
        `Weekly base (before add-ons): $${weeklyBase.toFixed(2)}`,
        `Facility components (weekly eq.): $${weeklyFacilityComponents.toFixed(
          2
        )}`,
        `Soap upgrade (weekly): $${weeklySoapUpgrade.toFixed(2)}`,
        `Warranty (weekly): $${weeklyWarranty.toFixed(2)}`,
        `Microfiber (weekly): $${weeklyMicrofiber.toFixed(2)}`,
        `Paper credit allowance (weekly): $${weeklyPaperCredit.toFixed(2)}`,
        `Paper overage charged (weekly): $${weeklyPaperOverage.toFixed(2)}`,
        `Rate tier multiplier: x${rateMultiplier.toFixed(2)}`,
      ],
    };

    const calc = {
      method,
      weeklyBase,
      weeklyTrip,
      weeklyFacilityComponents,
      weeklySoapUpgrade,
      weeklySoapLuxuryUpgrade,
      weeklySoapExtraUsage,
      weeklyWarranty,
      weeklyMicrofiber,
      weeklyPaperCredit,
      weeklyPaperOverage,
      weeklySubtotal,
      weeklyTotal,
      monthlyTotal,
      annualTotal,
      dispenserCount,  // ✅ Kept for display only - no longer used in warranty calculation
      soapDispensers,
      airFreshDispensers,
      monthlyFacilityComponents,
      rateMultiplier,
      baseFixtureRateUsed,
      baseFixtureChargeRaw,
      smallFacilityMinApplied,
      tripUnits,
      tripRateUsed,
      microfiberRatePerBathroom,
      warrantyRatePerDispenser: form.warrantyRate,  // ✅ USE NEW MANUAL WARRANTY RATE
      paperCreditRatePerFixture,
      extraSoapRatePerGallon,
      sinksChargeRaw,
      urinalsChargeRaw,
      maleToiletsChargeRaw,
      femaleToiletsChargeRaw,
      paperSpendPerWeek: estimatedPaperSpendPerWeek,
    };

    return { quote, calc };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form.fixtureCount,
    form.location,
    form.needsParking,
    form.pricingMode,
    form.sinks,
    form.urinals,
    form.maleToilets,
    form.femaleToilets,
    form.soapType,
    form.excessSoapGallonsPerWeek,
    form.addMicrofiberMopping,
    form.microfiberBathrooms,
    form.estimatedPaperSpendPerWeek,
    form.rateTier,
    form.contractMonths,
    // ✅ NEW: Editable rate fields (from backend)
    form.insideBeltwayRatePerFixture,
    form.insideBeltwayWeeklyMinimum,
    form.insideBeltwayTripCharge,
    form.insideBeltwayParkingFee,
    form.outsideBeltwayRatePerFixture,
    form.outsideBeltwayWeeklyMinimum,
    form.outsideBeltwayTripCharge,
    form.smallFacilityThreshold,
    form.smallFacilityMinimumWeekly,
    form.allInclusiveWeeklyRate,
    form.allInclusiveMinFixtures,
    form.standardToLuxuryRate,
    form.excessStandardSoapRate,
    form.excessLuxurySoapRate,
    form.warrantyFeePerDispenser,
    form.paperCreditPerFixturePerWeek,
    form.urinalScreenRate,
    form.urinalMatRate,
    form.toiletClipsRate,
    form.seatCoverDispenserRate,
    form.sanipodServiceRate,
    form.microfiberMoppingPerBathroom,
    form.weeklyToMonthlyMultiplier,
    form.weeklyToAnnualMultiplier,
    form.redRateMultiplier,
    form.greenRateMultiplier,
    // ✅ NEW: Custom override fields
    form.customWeeklyBase,
    form.customWeeklyTrip,
    form.customFacilityComponents,
    form.customSoapUpgrade,
    form.customWarranty,
    form.customMicrofiber,
    form.customWeeklyTotal,
    form.customMonthlyTotal,
    form.customAnnualTotal,
    // ✅ NEW: Individual fixture rates (no auto-population)
    form.sinkRate,
    form.urinalRate,
    form.maleToiletRate,
    form.femaleToiletRate,
    // ✅ NEW: Independent facility component quantities and rates (no auto-population)
    form.urinalComponentsQty,
    form.urinalComponentsRate,
    form.maleToiletComponentsQty,
    form.maleToiletComponentsRate,
    form.femaleToiletComponentsQty,
    form.femaleToiletComponentsRate,
    // ✅ NEW: Independent warranty quantity and rate (no auto-population from sinks)
    form.warrantyQty,
    form.warrantyRate,
  ]);

  return {
    form,
    setForm,
    onChange,
    quote,
    calc,
    refreshConfig: fetchPricing,
    isLoadingConfig,
  };
}

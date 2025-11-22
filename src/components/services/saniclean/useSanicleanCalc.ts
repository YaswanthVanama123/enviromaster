// src/features/services/saniclean/useSanicleanCalc.ts
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  SanicleanFormState,
  SanicleanPricingMode,
  SanicleanRateTier,
} from "./sanicleanTypes";
import { sanicleanPricingConfig as cfg } from "./sanicleanConfig";

const DEFAULT_FORM: SanicleanFormState = {
  serviceId: "saniclean",

  // fixtureCount will be AUTO from sinks/urinals/toilets
  fixtureCount: 0,

  // geo + logistics
  location: "insideBeltway",
  needsParking: false,
  pricingMode: "auto",

  // fixture breakdown
  sinks: 0,
  urinals: 0,
  maleToilets: 0,
  femaleToilets: 0,

  // soap
  soapType: "standard",
  excessSoapGallonsPerWeek: 0,

  // microfiber
  addMicrofiberMopping: false,
  microfiberBathrooms: 0,

  // paper
  estimatedPaperSpendPerWeek: 0,

  // rate tier
  rateTier: "redRate",

  notes: "",
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

  const onChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {
      let next: SanicleanFormState = { ...prev };

      switch (name) {
        // booleans
        case "needsParking":
        case "addMicrofiberMopping":
          next = { ...next, [name]: type === "checkbox" ? !!checked : !!value };
          break;

        // numeric fields
        case "fixtureCount":
        case "sinks":
        case "urinals":
        case "maleToilets":
        case "femaleToilets":
        case "excessSoapGallonsPerWeek":
        case "microfiberBathrooms":
        case "estimatedPaperSpendPerWeek": {
          const num = value === "" ? 0 : Number(value);
          next = { ...next, [name]: Number.isFinite(num) ? num : 0 };
          break;
        }

        // enums / selects
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

        // text / notes
        case "notes":
          next = { ...next, notes: value };
          break;

        default:
          // any other field just assign raw value
          next = { ...next, [name]: value };
          break;
      }

      // after any change, recompute fixtureCount from breakdown
      next = recomputeFixtureCount(next);
      return next;
    });
  };

  const { quote, calc } = useMemo(() => {
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
    const visitsPerWeek = 1; // weekly service

    // 🔴 NEW: if there are literally no fixtures, there is no SaniClean charge.
    if (fixtures === 0) {
      const zeroQuote: ServiceQuoteResult = {
        serviceId: "saniclean",
        displayName: "SaniClean",
        perVisitPrice: 0,
        annualPrice: 0,
        detailsBreakdown: ["No restroom fixtures configured – no SaniClean charge."],
      };

      const zeroCalc = {
        method: "geographic_standard" as const,
        weeklyBase: 0,
        weeklyTrip: 0,
        weeklyFacilityComponents: 0,
        weeklySoapUpgrade: 0,
        weeklyWarranty: 0,
        weeklyMicrofiber: 0,
        weeklyPaperCredit: 0,
        weeklyPaperOverage: 0,
        weeklySubtotal: 0,
        weeklyTotal: 0,
        monthlyTotal: 0,
        annualTotal: 0,
        dispenserCount: 0,
        monthlyFacilityComponents: 0,
        rateMultiplier: 1,
      };

      return { quote: zeroQuote, calc: zeroCalc };
    }

    // ---- 1) Decide pricing method ----
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
        fixtures <= cfg.smallFacilityMinimum.fixtureThreshold
      ) {
        method = "small_facility_minimum";
      } else {
        method = "geographic_standard";
      }
    } else {
      // auto mode
      if (fixtures >= cfg.allInclusivePackage.autoAllInclusiveMinFixtures) {
        method = "all_inclusive";
      } else if (
        fixtures > 0 &&
        fixtures <= cfg.smallFacilityMinimum.fixtureThreshold
      ) {
        method = "small_facility_minimum";
      } else {
        method = "geographic_standard";
      }
    }

    // ---- 2) Base weekly + trip/parking ----
    let weeklyBase = 0;
    let weeklyTrip = 0;

    if (method === "all_inclusive") {
      weeklyBase = fixtures * cfg.allInclusivePackage.weeklyRatePerFixture;
      weeklyTrip = 0; // waived
    } else if (method === "small_facility_minimum") {
      weeklyBase = cfg.smallFacilityMinimum.minimumWeeklyCharge;

      if (cfg.smallFacilityMinimum.includesTripCharge) {
        weeklyTrip = 0;
      } else {
        const geo = cfg.geographicPricing[location];
        const parkingAddon =
          location === "insideBeltway" && needsParking ? geo.parkingFee : 0;
        weeklyTrip = geo.tripCharge + parkingAddon;
      }
    } else {
      // geographic_standard
      const geo = cfg.geographicPricing[location];
      const perFixtureWeekly = fixtures * geo.ratePerFixture;
      weeklyBase = Math.max(perFixtureWeekly, geo.weeklyMinimum);

      const parkingAddon =
        location === "insideBeltway" && needsParking ? geo.parkingFee : 0;
      weeklyTrip = geo.tripCharge + parkingAddon;
    }

    // ---- 3) Facility components (urinals, toilets, sanipods) ----
    let weeklyFacilityComponents = 0;
    let monthlyFacilityComponents = 0;

    const includeFacilityComponentsAsAddOns = !(
      method === "all_inclusive" && cfg.allInclusivePackage.includeAllAddOns
    );

    if (includeFacilityComponentsAsAddOns) {
      const u = cfg.facilityComponents.urinals;
      const m = cfg.facilityComponents.maleToilets;
      const f = cfg.facilityComponents.femaleToilets;

      const monthlyUrinals = urinals * (u.urinalScreen + u.urinalMat);
      const monthlyMale =
        maleToilets * (m.toiletClips + m.seatCoverDispenser);
      const monthlyFemale = femaleToilets * f.sanipodService;

      monthlyFacilityComponents = monthlyUrinals + monthlyMale + monthlyFemale;

      weeklyFacilityComponents =
        monthlyFacilityComponents /
        cfg.billingConversions.weekly.monthlyMultiplier;
    }

    // ---- 4) Soap upgrades (weekly) ----
    const soapDispensers =
      sinks * cfg.facilityComponents.sinks.ratioSinkToSoap;

    const airFreshDispensers =
      sinks > 0
        ? Math.ceil(
            sinks / cfg.facilityComponents.sinks.ratioSinkToAirFreshener
          )
        : 0;

    const dispenserCount = soapDispensers + airFreshDispensers;

    let weeklySoapUpgrade = 0;

    if (soapType === "luxury" && soapDispensers > 0) {
      weeklySoapUpgrade +=
        soapDispensers * cfg.soapUpgrades.standardToLuxury;
    }

    if (excessSoapGallonsPerWeek > 0) {
      const ratePerGallon =
        soapType === "luxury"
          ? cfg.soapUpgrades.excessUsageCharges.luxurySoap
          : cfg.soapUpgrades.excessUsageCharges.standardSoap;

      weeklySoapUpgrade += excessSoapGallonsPerWeek * ratePerGallon;
    }

    // ---- 5) Warranty fee per dispenser (weekly) ----
    let weeklyWarranty = 0;
    const warrantyApplies = !(
      method === "all_inclusive" && cfg.allInclusivePackage.waiveWarrantyFees
    );

    if (warrantyApplies && dispenserCount > 0) {
      weeklyWarranty = dispenserCount * cfg.warrantyFeePerDispenser;
    }

    // ---- 6) Microfiber mopping (weekly) ----
    let weeklyMicrofiber = 0;
    if (
      addMicrofiberMopping &&
      microfiberBathrooms > 0 &&
      method !== "all_inclusive" // included in all-inclusive
    ) {
      weeklyMicrofiber =
        microfiberBathrooms *
        cfg.addOnServices.microfiberMopping.pricePerBathroom;
    }

    // ---- 7) Paper credit / overage (weekly) ----
    let weeklyPaperCredit = 0;
    let weeklyPaperOverage = 0;

    if (method === "all_inclusive") {
      const paperCredit =
        fixtures * cfg.paperCredit.creditPerFixturePerWeek;

      weeklyPaperCredit = paperCredit;

      if (estimatedPaperSpendPerWeek > paperCredit) {
        weeklyPaperOverage = estimatedPaperSpendPerWeek - paperCredit;
      }
    }

    // ---- 8) Rate tier multiplier ----
    const tier = cfg.rateTiers[rateTier];
    const rateMultiplier = tier?.multiplier ?? 1;

    // ---- 9) Totals ----
    const weeklyRaw =
      weeklyBase +
      weeklyTrip +
      weeklyFacilityComponents +
      weeklySoapUpgrade +
      weeklyWarranty +
      weeklyMicrofiber +
      weeklyPaperOverage -
      weeklyPaperCredit;

    const weeklySubtotal = weeklyRaw * rateMultiplier;

    const weeklyTotal = weeklySubtotal;
    const monthlyTotal =
      weeklyTotal * cfg.billingConversions.weekly.monthlyMultiplier;
    const annualTotal =
      weeklyTotal * cfg.billingConversions.weekly.annualMultiplier;

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
      annualPrice: annualTotal,
      detailsBreakdown: [
        `Method: ${methodLabel}`,
        `Weekly base (before trip): $${weeklyBase.toFixed(2)}`,
        `Weekly trip/parking: $${weeklyTrip.toFixed(2)}`,
        `Facility components (weekly eq.): $${weeklyFacilityComponents.toFixed(
          2
        )}`,
        `Soap upgrades (weekly): $${weeklySoapUpgrade.toFixed(2)}`,
        `Warranty (weekly): $${weeklyWarranty.toFixed(2)}`,
        `Microfiber (weekly): $${weeklyMicrofiber.toFixed(2)}`,
        `Paper credit (weekly): -$${weeklyPaperCredit.toFixed(2)}`,
        `Paper overage (weekly): $${weeklyPaperOverage.toFixed(2)}`,
        `Rate tier multiplier: x${rateMultiplier.toFixed(2)}`,
      ],
    };

    const calc = {
      method,
      weeklyBase,
      weeklyTrip,
      weeklyFacilityComponents,
      weeklySoapUpgrade,
      weeklyWarranty,
      weeklyMicrofiber,
      weeklyPaperCredit,
      weeklyPaperOverage,
      weeklySubtotal,
      weeklyTotal,
      monthlyTotal,
      annualTotal,
      dispenserCount,
      monthlyFacilityComponents,
      rateMultiplier,
    };

    return { quote, calc };
  }, [form]);

  return {
    form,
    setForm,
    onChange,
    quote,
    calc,
  };
}

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

  rateTier: "redRate",

  notes: "",
};

function clampPricingMode(mode: string): SanicleanPricingMode {
  if (mode === "all_inclusive" || mode === "geographic_standard") {
    return mode;
  }
  return "auto";
}

function clampRateTier(rt: string): SanicleanRateTier {
  return rt === "greenRate" ? "greenRate" : "redRate";
}

export function useSanicleanCalc(initial?: Partial<SanicleanFormState>) {
  const [form, setForm] = useState<SanicleanFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {
      switch (name) {
        // booleans
        case "needsParking":
        case "addMicrofiberMopping":
          return { ...prev, [name]: !!checked };

        // numeric fields
        case "fixtureCount":
        case "sinks":
        case "urinals":
        case "maleToilets":
        case "femaleToilets":
        case "microfiberBathrooms":
        case "excessSoapGallonsPerWeek": {
          const num = Number(value);
          return { ...prev, [name]: Number.isFinite(num) ? Math.max(0, num) : 0 };
        }

        // enums / selects
        case "location":
          return {
            ...prev,
            location: value === "insideBeltway" ? "insideBeltway" : "outsideBeltway",
          };

        case "pricingMode":
          return {
            ...prev,
            pricingMode: clampPricingMode(value),
          };

        case "rateTier":
          return {
            ...prev,
            rateTier: clampRateTier(value),
          };

        case "soapType":
          return {
            ...prev,
            soapType: value === "luxury" ? "luxury" : "standard",
          };

        // notes (free text)
        case "notes":
          return { ...prev, notes: value };

        default:
          return prev;
      }
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
      rateTier,
    } = form;

    const fixtures = Math.max(0, fixtureCount);
    const visits = 1; // SaniClean is weekly service; “per visit” == per week.

    // ---- 1) Decide pricing method ----
    let method: "all_inclusive" | "geographic_standard" | "small_facility_minimum";

    if (pricingMode === "all_inclusive") {
      method = "all_inclusive";
    } else if (pricingMode === "geographic_standard") {
      if (fixtures > 0 && fixtures <= cfg.smallFacilityMinimum.fixtureThreshold) {
        method = "small_facility_minimum";
      } else {
        method = "geographic_standard";
      }
    } else {
      // auto
      if (fixtures >= cfg.autoAllInclusiveMinFixtures) {
        method = "all_inclusive";
      } else if (fixtures > 0 && fixtures <= cfg.smallFacilityMinimum.fixtureThreshold) {
        method = "small_facility_minimum";
      } else {
        method = "geographic_standard";
      }
    }

    // ---- 2) Base weekly SaniClean (before components / add-ons / tier) ----
    let weeklyBase = 0;

    if (fixtures > 0) {
      if (method === "all_inclusive") {
        // All-inclusive: weekly rate per fixture; no trip charge.
        weeklyBase = fixtures * cfg.allInclusivePackage.weeklyRatePerFixture;
      } else if (method === "small_facility_minimum") {
        weeklyBase = cfg.smallFacilityMinimum.minimumWeeklyCharge;
      } else {
        // geographic_standard
        const geo = cfg.geographicPricing[location];
        const fixtureWeekly = Math.max(
          fixtures * geo.ratePerFixture,
          geo.weeklyMinimum
        );
        let trip = geo.tripCharge;
        if (location === "insideBeltway" && needsParking) {
          trip += cfg.geographicPricing.insideBeltway.parkingFee;
        }
        weeklyBase = fixtureWeekly + trip;
      }
    }

    // ---- 3) Facility components (urinals, toilets, sanipods) – only non all-inclusive ----
    const { urinals: uCfg, maleToilets: mCfg, femaleToilets: fCfg } =
      cfg.facilityComponents;

    let monthlyFacilityComponents = 0;
    if (method !== "all_inclusive") {
      if (urinals > 0) {
        monthlyFacilityComponents +=
          urinals * (uCfg.urinalScreen + uCfg.urinalMat);
      }
      if (maleToilets > 0) {
        monthlyFacilityComponents +=
          maleToilets * (mCfg.toiletClips + mCfg.seatCoverDispenser);
      }
      if (femaleToilets > 0) {
        monthlyFacilityComponents +=
          femaleToilets * fCfg.sanipodService;
      }
    }

    const weeklyFacilityComponents =
      monthlyFacilityComponents > 0
        ? monthlyFacilityComponents / cfg.billingConversions.weekly.monthlyMultiplier
        : 0;

    // ---- 4) Soap upgrades (weekly) ----
    const dispenserCount = sinks * cfg.facilityComponents.sinks.ratioSinkToSoap;

    let weeklySoapUpgrade = 0;

    // Luxury upgrade on each dispenser
    if (soapType === "luxury" && dispenserCount > 0) {
      weeklySoapUpgrade +=
        dispenserCount * cfg.soapUpgrades.standardToLuxury;
    }

    // Excess gallons beyond included weekly fill
    if (excessSoapGallonsPerWeek > 0) {
      const ratePerGallon =
        soapType === "luxury"
          ? cfg.soapUpgrades.excessUsageCharges.luxurySoap
          : cfg.soapUpgrades.excessUsageCharges.standardSoap;

      weeklySoapUpgrade += excessSoapGallonsPerWeek * ratePerGallon;
    }

    // ---- 5) Microfiber mopping (weekly) – charge only if NOT all-inclusive ----
    let weeklyMicrofiber = 0;
    if (
      method !== "all_inclusive" &&
      addMicrofiberMopping &&
      microfiberBathrooms > 0
    ) {
      weeklyMicrofiber =
        microfiberBathrooms * cfg.addOnServices.microfiberMopping.pricePerBathroom;
    }

    // ---- 6) Subtotal before rate tier ----
    const weeklySubtotal =
      weeklyBase + weeklyFacilityComponents + weeklySoapUpgrade + weeklyMicrofiber;

    // ---- 7) Apply rate tier ----
    const tierConfig = cfg.rateTiers[rateTier];
    const rateMultiplier = tierConfig?.multiplier ?? 1.0;
    const weeklyTotal = weeklySubtotal * rateMultiplier;

    // ---- 8) Convert to monthly / annual ----
    const { monthlyMultiplier, annualMultiplier } = cfg.billingConversions.weekly;
    const monthlyTotal = weeklyTotal * monthlyMultiplier;
    const annualTotal = weeklyTotal * annualMultiplier;

    // Effective per-visit (per weekly SaniClean visit)
    const perVisitPrice = weeklyTotal / Math.max(visits, 1);

    const calc = {
      method,
      weeklyBase,
      weeklyFacilityComponents,
      weeklySoapUpgrade,
      weeklyMicrofiber,
      weeklySubtotal,
      weeklyTotal,
      monthlyTotal,
      annualTotal,
      dispenserCount,
      monthlyFacilityComponents,
      rateMultiplier,
    };

    const quote: ServiceQuoteResult = {
      serviceId: "saniclean",
      displayName: "SaniClean",
      perVisitPrice,
      annualPrice: annualTotal,
      detailsBreakdown: [
        `Method: ${method}`,
        `Base weekly SaniClean: $${weeklyBase.toFixed(2)}`,
        `Facility components (weekly eq.): $${weeklyFacilityComponents.toFixed(2)}`,
        `Soap upgrades (weekly): $${weeklySoapUpgrade.toFixed(2)}`,
        `Microfiber (weekly): $${weeklyMicrofiber.toFixed(2)}`,
        `Rate tier multiplier: ×${rateMultiplier.toFixed(2)}`,
        `Weekly total: $${weeklyTotal.toFixed(2)}`,
        `Monthly total: $${monthlyTotal.toFixed(2)}`,
      ],
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

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

  estimatedPaperSpendPerWeek: 0,

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
        case "estimatedPaperSpendPerWeek": {
          const num = value === "" ? 0 : Number(value);
          next = { ...next, [name]: Number.isFinite(num) ? num : 0 };
          break;
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
        dispenserCount: 0,
        soapDispensers: 0,
        airFreshDispensers: 0,
        monthlyFacilityComponents: 0,
        rateMultiplier: 1,
        baseFixtureRateUsed: 0,
        baseFixtureChargeRaw: 0,
        smallFacilityMinApplied: false,
        tripUnits: 0,
        tripRateUsed: 0,
        microfiberRatePerBathroom:
          cfg.addOnServices.microfiberMopping.pricePerBathroom,
        warrantyRatePerDispenser: cfg.warrantyFeePerDispenser,
        paperCreditRatePerFixture:
          cfg.paperCredit.creditPerFixturePerWeek,
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

    // ---------- Base weekly charges ----------
    const geo = cfg.geographicPricing[location];
    const parkingAddon =
      location === "insideBeltway" && needsParking ? geo.parkingFee : 0;

    const baseFixtureRateUsed =
      method === "all_inclusive"
        ? cfg.allInclusivePackage.weeklyRatePerFixture // $20 / fixture / wk
        : geo.ratePerFixture;

    const baseFixtureChargeRaw = fixtures * baseFixtureRateUsed;

    const sinksChargeRaw = sinks * baseFixtureRateUsed;
    const urinalsChargeRaw = urinals * baseFixtureRateUsed;
    const maleToiletsChargeRaw = maleToilets * baseFixtureRateUsed;
    const femaleToiletsChargeRaw = femaleToilets * baseFixtureRateUsed;

    let weeklyBase = 0;
    let weeklyTrip = 0;
    let smallFacilityMinApplied = false;

    if (method === "all_inclusive") {
      // All-inclusive: fixtures × $20, trip waived
      weeklyBase = baseFixtureChargeRaw;
      weeklyTrip = 0;
    } else if (method === "small_facility_minimum") {
      // $50 minimum including trip
      weeklyBase = cfg.smallFacilityMinimum.minimumWeeklyCharge;
      if (cfg.smallFacilityMinimum.includesTripCharge) {
        weeklyTrip = 0;
      } else {
        weeklyTrip = geo.tripCharge + parkingAddon;
      }
      smallFacilityMinApplied = weeklyBase > baseFixtureChargeRaw;
    } else {
      // Geographic per-fixture with weekly facility minimum
      const perFixtureWeekly = baseFixtureChargeRaw;
      weeklyBase = Math.max(perFixtureWeekly, geo.weeklyMinimum);
      weeklyTrip = geo.tripCharge + parkingAddon;
    }

    const tripUnits = weeklyTrip > 0 ? 1 : 0;
    const tripRateUsed = weeklyTrip;

    // ---------- Facility components (NOT in all-inclusive) ----------
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

    // ---------- Dispensers, warranty & soap ----------
    const soapDispensers =
      sinks * cfg.facilityComponents.sinks.ratioSinkToSoap;

    const airFreshDispensers =
      sinks > 0
        ? Math.ceil(
            sinks / cfg.facilityComponents.sinks.ratioSinkToAirFreshener
          )
        : 0;

    const dispenserCount = soapDispensers + airFreshDispensers;

    const luxuryUpgradeRatePerDispenser =
      cfg.soapUpgrades.standardToLuxury;

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
          ? cfg.soapUpgrades.excessUsageCharges.luxurySoap
          : cfg.soapUpgrades.excessUsageCharges.standardSoap;

      weeklySoapExtraUsage =
        excessSoapGallonsPerWeek * extraSoapRatePerGallon;
    }

    const weeklySoapUpgrade =
      weeklySoapLuxuryUpgrade + weeklySoapExtraUsage;

    // Warranty (NOT in all-inclusive)
    let weeklyWarranty = 0;
    const warrantyRatePerDispenser = cfg.warrantyFeePerDispenser;
    const warrantyApplies = !(
      method === "all_inclusive" && cfg.allInclusivePackage.waiveWarrantyFees
    );

    if (warrantyApplies && dispenserCount > 0) {
      weeklyWarranty = dispenserCount * warrantyRatePerDispenser;
    }

    // Microfiber mopping $10 / bathroom / week (NOT in all-inclusive)
    const microfiberRatePerBathroom =
      cfg.addOnServices.microfiberMopping.pricePerBathroom;

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
    const paperCreditRatePerFixture =
      cfg.paperCredit.creditPerFixturePerWeek;

    if (method === "all_inclusive") {
      const credit = fixtures * paperCreditRatePerFixture;
      weeklyPaperCredit = credit;

      if (estimatedPaperSpendPerWeek > credit) {
        weeklyPaperOverage = estimatedPaperSpendPerWeek - credit;
      }
    }

    // ---------- Rate tier multiplier ----------
    const tier = cfg.rateTiers[rateTier];
    const rateMultiplier = tier?.multiplier ?? 1;

    // IMPORTANT: we **do not subtract** paper credit from pricing.
    // Base $20/fixture already assumes the credit – only overage is charged.
    const weeklyRaw =
      weeklyBase +
      weeklyTrip +
      weeklyFacilityComponents +
      weeklySoapUpgrade +
      weeklyWarranty +
      weeklyMicrofiber +
      weeklyPaperOverage;

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
        `Weekly base (before add-ons): $${weeklyBase.toFixed(2)}`,
        `Weekly trip/parking: $${weeklyTrip.toFixed(2)}`,
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
      dispenserCount,
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
      warrantyRatePerDispenser,
      paperCreditRatePerFixture,
      extraSoapRatePerGallon,
      sinksChargeRaw,
      urinalsChargeRaw,
      maleToiletsChargeRaw,
      femaleToiletsChargeRaw,
      paperSpendPerWeek: estimatedPaperSpendPerWeek,
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

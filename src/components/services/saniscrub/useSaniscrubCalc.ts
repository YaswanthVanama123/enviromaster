import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type { SaniscrubFormState, SaniscrubFrequency } from "./saniscrubTypes";
import {
  saniscrubPricingConfig as cfg,
  saniscrubFrequencyList,
} from "./saniscrubConfig";

const DEFAULT_FORM: SaniscrubFormState = {
  serviceId: "saniscrub",
  fixtureCount: 0,
  nonBathroomSqFt: 0,
  frequency: "monthly",
  hasSaniClean: true,
  location: "insideBeltway",
  needsParking: false,
  tripChargeIncluded: true,
  includeInstall: false,
  isDirtyInstall: false,
  notes: "",
};

function clampFrequency(f: string): SaniscrubFrequency {
  return saniscrubFrequencyList.includes(f as SaniscrubFrequency)
    ? (f as SaniscrubFrequency)
    : "monthly";
}

export function useSaniscrubCalc(initial?: Partial<SaniscrubFormState>) {
  const [form, setForm] = useState<SaniscrubFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {
      switch (name as keyof SaniscrubFormState) {
        case "fixtureCount":
        case "nonBathroomSqFt": {
          const num = parseFloat(String(value));
          return {
            ...prev,
            [name]: Number.isFinite(num) && num > 0 ? num : 0,
          };
        }

        case "frequency":
          return {
            ...prev,
            frequency: clampFrequency(String(value)),
          };

        case "hasSaniClean":
        case "needsParking":
        case "tripChargeIncluded":
        case "includeInstall":
        case "isDirtyInstall":
          return {
            ...prev,
            [name]: type === "checkbox" ? !!checked : Boolean(value),
          };

        case "location":
          return {
            ...prev,
            location:
              value === "outsideBeltway" ? "outsideBeltway" : "insideBeltway",
          };

        case "notes":
          return {
            ...prev,
            notes: String(value ?? ""),
          };

        default:
          return prev;
      }
    });
  };

  const {
    fixtureMonthly,
    fixturePerVisit,
    fixtureRawForMinimum,
    fixtureMinimumApplied,
    nonBathroomPerVisit,
    nonBathroomMonthly,
    monthlyBase,
    perVisitTrip,
    monthlyTrip,
    monthlyTotal,
    annualTotal,
    visitsPerYear,
    perVisitEffective,
    installOneTime,
  } = useMemo(() => {
    const freq = clampFrequency(form.frequency);
    const visitsPerYear = cfg.frequencyMeta[freq]?.visitsPerYear ?? 12;

    const fixtureCount = form.fixtureCount ?? 0;
    const nonBathSqFt = form.nonBathroomSqFt ?? 0;
    const serviceActive = fixtureCount > 0 || nonBathSqFt > 0;

    // ---------------- 1) Bathroom fixtures ----------------
    let fixtureMonthly = 0;
    let fixturePerVisit = 0;
    let fixtureRawForMinimum = 0;
    let fixtureMinimumApplied = 0;

    if (fixtureCount > 0) {
      const baseMonthlyRate = cfg.fixtureRates.monthly; // 25
      const baseMonthlyMin = cfg.minimums.monthly;       // 175
      const rawMonthlyAtBase = fixtureCount * baseMonthlyRate;
      const baseMonthlyWithMin = Math.max(rawMonthlyAtBase, baseMonthlyMin);

      if (freq === "monthly") {
        // Monthly: $25/fixture or $175 minimum (per MONTH)
        fixtureMonthly = baseMonthlyWithMin;
        fixturePerVisit = baseMonthlyWithMin; // 1 visit / month

        fixtureRawForMinimum = rawMonthlyAtBase;
        if (rawMonthlyAtBase > 0 && rawMonthlyAtBase <= baseMonthlyMin) {
          fixtureMinimumApplied = baseMonthlyMin;
        }
      } else if (freq === "twicePerMonth") {
        // 2×/month: normal monthly (with 175 minimum), then 2×, then -$15 if SaniClean.
        let twiceMonthly = baseMonthlyWithMin * 2;
        if (form.hasSaniClean) {
          twiceMonthly = Math.max(
            0,
            twiceMonthly - cfg.twoTimesPerMonthDiscountFlat
          );
        }

        fixtureMonthly = twiceMonthly;
        // convert that monthly to per-visit using 24 visits/year
        fixturePerVisit = (fixtureMonthly * 12) / visitsPerYear;

        fixtureRawForMinimum = rawMonthlyAtBase;
        if (rawMonthlyAtBase > 0 && rawMonthlyAtBase <= baseMonthlyMin) {
          fixtureMinimumApplied = baseMonthlyMin;
        }
      } else if (freq === "bimonthly") {
        // Bi-Monthly: $35 / fixture, $250 minimum PER VISIT
        const perVisitRate = cfg.fixtureRates.bimonthly; // 35
        const perVisitMin = cfg.minimums.bimonthly;       // 250

        const rawPerVisit = fixtureCount * perVisitRate;
        const perVisitCharge = Math.max(rawPerVisit, perVisitMin);

        fixturePerVisit = perVisitCharge;
        fixtureMonthly = (perVisitCharge * visitsPerYear) / 12;

        fixtureRawForMinimum = rawPerVisit;
        if (rawPerVisit > 0 && rawPerVisit <= perVisitMin) {
          fixtureMinimumApplied = perVisitMin;
        }
      } else {
        // Quarterly: $40 / fixture, $250 minimum PER VISIT
        const perVisitRate = cfg.fixtureRates.quarterly; // 40
        const perVisitMin = cfg.minimums.quarterly;       // 250

        const rawPerVisit = fixtureCount * perVisitRate;
        const perVisitCharge = Math.max(rawPerVisit, perVisitMin);

        fixturePerVisit = perVisitCharge;
        fixtureMonthly = (perVisitCharge * visitsPerYear) / 12;

        fixtureRawForMinimum = rawPerVisit;
        if (rawPerVisit > 0 && rawPerVisit <= perVisitMin) {
          fixtureMinimumApplied = perVisitMin;
        }
      }
    }

    // ---------------- 2) Non-bathroom Sq Ft ----------------
    let nonBathroomPerVisit = 0;
    let nonBathroomMonthly = 0;

    if (nonBathSqFt > 0) {
      const units = Math.ceil(nonBathSqFt / cfg.nonBathroomUnitSqFt);
      if (units > 0) {
        const extraUnits = Math.max(units - 1, 0);
        nonBathroomPerVisit =
          cfg.nonBathroomFirstUnitRate +
          extraUnits * cfg.nonBathroomAdditionalUnitRate;

        nonBathroomMonthly =
          (nonBathroomPerVisit * visitsPerYear) / 12;
      }
    }

    // ---------------- 3) Trip charge ----------------
    let perVisitTrip = 0;
    let monthlyTrip = 0;

    if (serviceActive && form.tripChargeIncluded) {
      perVisitTrip =
        cfg.tripChargeBase +
        (form.location === "insideBeltway" && form.needsParking
          ? cfg.parkingFee
          : 0);

      monthlyTrip = (perVisitTrip * visitsPerYear) / 12;
    }

    // ---------------- 4) Recurring totals (no install) ----------------
    const monthlyBase = fixtureMonthly + nonBathroomMonthly;

    // "Install is 3x this price if dirty or 1x job."
    // Use MONTHLY BASE (fixtures + non-bath) as the reference price.
    const installOneTime =
      serviceActive && form.includeInstall
        ? monthlyBase *
          (form.isDirtyInstall
            ? cfg.installMultipliers.dirty
            : cfg.installMultipliers.clean)
        : 0;

    // Recurring monthly (no install)
    const monthlyRecurring = monthlyBase + monthlyTrip;

    // What you want on the UI:
    //  - Per-Visit Effective = NO install
    //  - Monthly SaniScrub   = recurring + FULL install
    //  - Annual SaniScrub    = recurring*12 + FULL install
    const monthlyTotal = monthlyRecurring + installOneTime;
    const annualTotal = monthlyRecurring * 12 + installOneTime;

    // ---------------- 5) Per-Visit Effective (NO install) ----------------
    const perVisitEffective =
      serviceActive && visitsPerYear > 0
        ? fixturePerVisit + nonBathroomPerVisit + perVisitTrip
        : 0;

    return {
      fixtureMonthly,
      fixturePerVisit,
      fixtureRawForMinimum,
      fixtureMinimumApplied,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      monthlyBase,
      perVisitTrip,
      monthlyTrip,
      monthlyTotal,   // recurring + full install (for display)
      annualTotal,    // recurring*12 + full install
      visitsPerYear,
      perVisitEffective, // recurring per visit – NO install
      installOneTime,    // one-time install
    };
  }, [form]);

  const quote: ServiceQuoteResult = useMemo(
    () => ({
      serviceId: form.serviceId,
      perVisit: perVisitEffective,
      monthly: monthlyTotal,
      annual: annualTotal,
    }),
    [form.serviceId, perVisitEffective, monthlyTotal, annualTotal]
  );

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: {
      fixtureMonthly,
      fixturePerVisit,
      fixtureRawForMinimum,
      fixtureMinimumApplied,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      monthlyBase,
      perVisitTrip,
      monthlyTrip,
      monthlyTotal,
      annualTotal,
      visitsPerYear,
      perVisitEffective,
      installOneTime,
    },
  };
}

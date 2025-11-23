// src/features/services/saniscrub/useSaniscrubCalc.ts
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

    // 2× / month special behavior only when combined with SaniClean
    const effectiveFreq: SaniscrubFrequency =
      freq === "twicePerMonth" && !form.hasSaniClean ? "monthly" : freq;

    const freqMeta = cfg.frequencyMeta[effectiveFreq];
    const visitsPerYear = freqMeta?.visitsPerYear ?? 12;

    const fixtureCount = form.fixtureCount ?? 0;
    const nonBathSqFt = form.nonBathroomSqFt ?? 0;

    const serviceActive = fixtureCount > 0 || nonBathSqFt > 0;

    // --- 1) Fixtures ---
    let fixtureMonthly = 0;

    if (fixtureCount > 0) {
      if (freq === "twicePerMonth" && form.hasSaniClean) {
        // your current 2× / month logic (25 - 15 = 10/fixture, with 175 min)
        const baseRate = cfg.fixtureRates.monthly;
        const discount = cfg.twoTimesPerMonthDiscountPerFixture;
        const effectiveRate = Math.max(baseRate - discount, 0);

        const raw = fixtureCount * effectiveRate;
        const minimum = cfg.minimums.monthly;
        fixtureMonthly = Math.max(raw, minimum);
      } else {
        const rate = cfg.fixtureRates[effectiveFreq];
        const minimum = cfg.minimums[effectiveFreq];

        const raw = fixtureCount * rate;
        fixtureMonthly = Math.max(raw, minimum);
      }
    }

    // --- 2) Non-bathroom area ---
    let nonBathroomPerVisit = 0;
    let nonBathroomMonthly = 0;

    if (nonBathSqFt > 0) {
      const units = Math.ceil(nonBathSqFt / cfg.nonBathroomUnitSqFt);
      if (units > 0) {
        const extraUnits = Math.max(units - 1, 0);
        nonBathroomPerVisit =
          cfg.nonBathroomFirstUnitRate +
          extraUnits * cfg.nonBathroomAdditionalUnitRate;
        nonBathroomMonthly = (nonBathroomPerVisit * visitsPerYear) / 12;
      }
    }

    // --- 3) Base monthly (fixtures + non-bathroom, no trip, no install) ---
    const monthlyBase = fixtureMonthly + nonBathroomMonthly;

    // --- 4) Trip charge ($8 + parking) converted to monthly ---
    let perVisitTrip = 0;
    let monthlyTrip = 0;

    if (serviceActive && form.tripChargeIncluded && monthlyBase > 0) {
      perVisitTrip =
        cfg.tripChargeBase +
        (form.location === "insideBeltway" && form.needsParking
          ? cfg.parkingFee
          : 0);
      monthlyTrip = (perVisitTrip * visitsPerYear) / 12;
    }

    // --- 5) Recurring totals (trip included, NO install) ---
    // This is the "183" style number you mentioned.
    const monthlyTotal = monthlyBase + monthlyTrip;

    // --- 6) Install cost (one-time job) ---
    const installOneTime =
      serviceActive && form.includeInstall
        ? monthlyBase *
          (form.isDirtyInstall
            ? cfg.installMultipliers.dirty
            : cfg.installMultipliers.clean)
        : 0;

    // Annual = 12× recurring + full install (no dividing the install)
    const annualTotal = monthlyTotal * 12 + installOneTime;

    // Per-visit effective uses the annual that includes install
    const perVisitEffective =
      serviceActive && visitsPerYear > 0
        ? annualTotal / visitsPerYear
        : 0;

    return {
      fixtureMonthly,
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
      nonBathroomPerVisit,
      nonBathroomMonthly,
      monthlyBase,
      perVisitTrip,
      monthlyTrip,
      monthlyTotal,   // recurring only
      annualTotal,    // recurring*12 + install
      visitsPerYear,
      perVisitEffective,
      installOneTime,
    },
  };
}

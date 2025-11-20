// src/features/services/saniscrub/useSaniscrubCalc.ts
import { useMemo, useState } from "react";
import type {ChangeEvent} from 'react';
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
  includeInstall: false,
  isDirtyInstall: true,
  tripChargeIncluded: true,
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
      switch (name) {
        case "frequency":
          return { ...prev, frequency: clampFrequency(value) };

        case "hasSaniClean":
        case "needsParking":
        case "includeInstall":
        case "isDirtyInstall":
        case "tripChargeIncluded":
          return { ...prev, [name]: !!checked };

        case "fixtureCount":
        case "nonBathroomSqFt":
          return { ...prev, [name]: Number(value) || 0 };

        case "location":
          return {
            ...prev,
            location: value === "insideBeltway" ? "insideBeltway" : "outsideBeltway",
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
    const freq = form.frequency;
    const freqMeta = cfg.frequencyMeta[freq];
    const visitsPerYear = freqMeta.visitsPerYear || 12;

    // --- 1) Fixtures (bathroom SaniScrub) monthly price ---
    let fixtureMonthly = 0;

    if (freq === "monthly") {
      // Monthly: $25/fixture or $175 min
      const baseMonthly = Math.max(
        form.fixtureCount * cfg.fixtureRates.monthly,
        cfg.minimums.monthly
      );
      fixtureMonthly = baseMonthly;
    } else if (freq === "twicePerMonth") {
      // 2x month: "Combine with Sani. -$15 from what the monthly charge would be."
      const baseMonthly = Math.max(
        form.fixtureCount * cfg.fixtureRates.monthly,
        cfg.minimums.monthly
      );
      const discount = form.hasSaniClean
        ? form.fixtureCount * cfg.twicePerMonthDiscountPerFixture
        : 0;
      fixtureMonthly = Math.max(baseMonthly - discount, 0);
    } else {
      // Bimonthly / Quarterly: use per-visit rate, then convert to monthly
      const perVisitRate = cfg.fixtureRates[freq];
      const perVisitMin = cfg.minimums[freq];
      const perVisitFixture = Math.max(
        form.fixtureCount * perVisitRate,
        perVisitMin
      );
      fixtureMonthly = (perVisitFixture * visitsPerYear) / 12;
    }

    // --- 2) Non-bathroom floors (rule: first 500 sq ft = 250, then 125 per 500) ---
    let nonBathroomPerVisit = 0;
    let nonBathroomMonthly = 0;

    if (form.nonBathroomSqFt > 0) {
      const units = Math.ceil(form.nonBathroomSqFt / cfg.nonBathroom.unitSqFt);
      if (units > 0) {
        nonBathroomPerVisit =
          cfg.nonBathroom.firstUnitPrice +
          (units - 1) * cfg.nonBathroom.additionalUnitPrice;
      }

      nonBathroomMonthly = (nonBathroomPerVisit * visitsPerYear) / 12;
    }

    // --- 3) Base monthly SaniScrub (bath + non-bath, no trip, no install) ---
    const monthlyBase = fixtureMonthly + nonBathroomMonthly;

    // --- 4) Trip charge ($8 + parking) converted to monthly ---
    const perVisitTrip =
      form.tripChargeIncluded && monthlyBase > 0
        ? cfg.tripChargeBase +
          (form.location === "insideBeltway" && form.needsParking
            ? cfg.parkingFee
            : 0)
        : 0;

    const monthlyTrip = (perVisitTrip * visitsPerYear) / 12;

    // --- 5) Recurring totals (trip included) ---
    const monthlyTotal = monthlyBase + monthlyTrip;
    const annualTotal = monthlyTotal * 12;

    // Effective per visit price
    const perVisitEffective =
      visitsPerYear > 0 ? (monthlyTotal * 12) / visitsPerYear : 0;

    // --- 6) Install: 3× (dirty) or 1× (clean) of *monthlyBase* as a one-time job ---
    let installOneTime = 0;
    if (form.includeInstall && monthlyBase > 0) {
      const mult = form.isDirtyInstall
        ? cfg.installMultipliers.dirty
        : cfg.installMultipliers.clean;
      installOneTime = monthlyBase * mult;
    }

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

  const quote: ServiceQuoteResult = {
    serviceId: "saniscrub",
    displayName: "SaniScrub",
    perVisitPrice: perVisitEffective,
    annualPrice: annualTotal,
    detailsBreakdown: [
      `Fixtures monthly: $${fixtureMonthly.toFixed(2)}`,
      `Non-bathroom floors monthly: $${nonBathroomMonthly.toFixed(2)}`,
      `Trip (monthly): $${monthlyTrip.toFixed(2)}`,
      `Install (one-time): $${installOneTime.toFixed(2)}`,
      `Visits per year: ${visitsPerYear}`,
    ],
  };

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
      monthlyTotal,
      annualTotal,
      visitsPerYear,
      perVisitEffective,
      installOneTime,
    },
  };
}

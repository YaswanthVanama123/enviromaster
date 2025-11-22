// src/features/services/refreshPowerScrub/useRefreshPowerScrubCalc.ts
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type {
  RefreshAreaCalcState,
  RefreshAreaKey,
  RefreshAreaTotals,
  RefreshPowerScrubFormState,
  RefreshRateType,
} from "./refreshPowerScrubTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import {
  REFRESH_DEFAULT_HOURLY,
  REFRESH_DEFAULT_MIN,
  REFRESH_DEFAULT_TRIP,
  REFRESH_FOH_RATE,
  REFRESH_KITCHEN_LARGE,
  REFRESH_KITCHEN_SMALL_MED,
  REFRESH_PATIO_STANDALONE,
  REFRESH_PATIO_UPSELL,
  REFRESH_SQFT_FIXED_FEE,
  REFRESH_SQFT_INSIDE_RATE,
  REFRESH_SQFT_OUTSIDE_RATE,
} from "./refreshPowerScrubConfig";

const AREA_KEYS: RefreshAreaKey[] = [
  "dumpster",
  "patio",
  "walkway",
  "foh",
  "boh",
  "other",
];

const DEFAULT_AREA: RefreshAreaCalcState = {
  pricingMethod: "area_specific",
  workers: 2,
  hours: 0,
  insideSqFt: 0,
  outsideSqFt: 0,
  kitchenSize: "smallMedium",
  patioMode: "standalone",
  freqText: "",
};

const DEFAULT_FORM: RefreshPowerScrubFormState = {
  // BaseServiceFormState fields
  serviceId: "refreshPowerScrub",
  // if your ServiceFrequency union doesn’t have "one_time", adjust to "monthly"
  frequency: "one_time" as any,
  tripChargeIncluded: true,
  notes: "",

  // Refresh-specific
  rateType: "red_rate",
  tripCharge: REFRESH_DEFAULT_TRIP,
  minimumVisit: REFRESH_DEFAULT_MIN,

  dumpster: { ...DEFAULT_AREA },
  patio: { ...DEFAULT_AREA, patioMode: "standalone" },
  walkway: { ...DEFAULT_AREA },
  foh: { ...DEFAULT_AREA },
  boh: { ...DEFAULT_AREA, kitchenSize: "large" },
  other: { ...DEFAULT_AREA },
};

const numericAreaFields: (keyof RefreshAreaCalcState)[] = [
  "workers",
  "hours",
  "insideSqFt",
  "outsideSqFt",
];

const getRateMultiplier = (rateType: RefreshRateType): number =>
  rateType === "green_rate" ? 1.3 : 1.0;

// "Area specific" base prices that match the rules
function calcAreaSpecificBase(
  area: RefreshAreaKey,
  state: RefreshAreaCalcState
): number {
  switch (area) {
    case "dumpster":
      // Dumpster area uses minimum visit (no fancy sizing)
      return REFRESH_DEFAULT_MIN;

    case "patio":
      // Patio: $875 standalone OR $500 upsell
      return state.patioMode === "upsell"
        ? REFRESH_PATIO_UPSELL
        : REFRESH_PATIO_STANDALONE;

    case "walkway": {
      // Treat walkway as outside sq-ft based power wash
      const outsideCost =
        state.outsideSqFt * REFRESH_SQFT_OUTSIDE_RATE;
      const subtotal =
        REFRESH_SQFT_FIXED_FEE + outsideCost + REFRESH_DEFAULT_TRIP;
      return Math.max(subtotal, REFRESH_DEFAULT_MIN);
    }

    case "foh":
      // Front of House fixed rate, no trip
      return REFRESH_FOH_RATE;

    case "boh":
      // Back of House kitchens: small/med vs large
      return state.kitchenSize === "large"
        ? REFRESH_KITCHEN_LARGE
        : REFRESH_KITCHEN_SMALL_MED;

    case "other":
    default:
      // Fallback: use minimum
      return REFRESH_DEFAULT_MIN;
  }
}

function calcHourly(state: RefreshAreaCalcState): number {
  const labour =
    state.workers * state.hours * REFRESH_DEFAULT_HOURLY;
  const total = REFRESH_DEFAULT_TRIP + labour;
  return Math.max(total, REFRESH_DEFAULT_MIN);
}

function calcSquareFootage(state: RefreshAreaCalcState): number {
  const insideCost =
    state.insideSqFt * REFRESH_SQFT_INSIDE_RATE;
  const outsideCost =
    state.outsideSqFt * REFRESH_SQFT_OUTSIDE_RATE;
  const subtotal =
    REFRESH_SQFT_FIXED_FEE +
    insideCost +
    outsideCost +
    REFRESH_DEFAULT_TRIP;
  return Math.max(subtotal, REFRESH_DEFAULT_MIN);
}

function calcAreaTotal(
  area: RefreshAreaKey,
  form: RefreshPowerScrubFormState
): number {
  const state = form[area] as RefreshAreaCalcState;
  let base = 0;

  switch (state.pricingMethod) {
    case "area_specific":
      base = calcAreaSpecificBase(area, state);
      break;
    case "hourly":
      base = calcHourly(state);
      break;
    case "square_footage":
      base = calcSquareFootage(state);
      break;
    default:
      base = 0;
  }

  const multiplier = getRateMultiplier(form.rateType);
  const withRate = base * multiplier;
  // keep it nicely rounded
  return Math.round(withRate * 100) / 100;
}

export function useRefreshPowerScrubCalc(
  initial?: Partial<RefreshPowerScrubFormState>
) {
  const [form, setForm] = useState<RefreshPowerScrubFormState>(() => {
    const base: RefreshPowerScrubFormState = {
      ...DEFAULT_FORM,
      ...initial,
    };

    // Ensure each area gets DEFAULT_AREA merged with any initial partial
    AREA_KEYS.forEach((area) => {
      const incoming = (initial as any)?.[area] || {};
      (base as any)[area] = {
        ...DEFAULT_AREA,
        ...incoming,
      } as RefreshAreaCalcState;
    });

    return base;
  });

  // Root level (rateType, notes, etc.)
  const onChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, type, value, checked } = e.target;

    setForm((prev) => {
      if (type === "checkbox") {
        return { ...prev, [name]: !!checked };
      }

      if (name === "tripCharge" || name === "minimumVisit") {
        const n = parseFloat(value);
        return {
          ...prev,
          [name]: Number.isFinite(n) ? n : 0,
        };
      }

      // rateType, frequency, notes, etc.
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  // Column-specific setters: Dumpster / Patio / Walkway / FOH / BOH / Other
  const setAreaField = (
    area: RefreshAreaKey,
    field: keyof RefreshAreaCalcState,
    raw: string
  ) => {
    setForm((prev) => {
      const current = prev[area] as RefreshAreaCalcState;
      let value: any = raw;

      if (numericAreaFields.includes(field)) {
        const n = parseFloat(raw);
        value = Number.isFinite(n) ? n : 0;
      }

      return {
        ...prev,
        [area]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const areaTotals: RefreshAreaTotals = useMemo(() => {
    const totals: any = {};
    for (const area of AREA_KEYS) {
      totals[area] = calcAreaTotal(area, form);
    }
    return totals as RefreshAreaTotals;
  }, [form]);

  const quote: ServiceQuoteResult = useMemo(() => {
    const perVisit = AREA_KEYS.reduce(
      (sum, area) => sum + areaTotals[area],
      0
    );
    const rounded = Math.round(perVisit * 100) / 100;

    const details: string[] = [];
    AREA_KEYS.forEach((area) => {
      const amount = areaTotals[area];
      if (amount > 0) {
        const prettyArea =
          area === "boh"
            ? "BOH"
            : area === "foh"
            ? "FOH"
            : area[0].toUpperCase() + area.slice(1);
        const method = (form[area] as RefreshAreaCalcState)
          .pricingMethod;
        details.push(
          `${prettyArea}: $${amount.toFixed(2)} (${method})`
        );
      }
    });

    // Refresh is typically a one-time deep clean,
    // so annual = per-visit (you can adjust if needed).
    return {
      serviceId: "refreshPowerScrub",
      displayName: "Refresh Power Scrub",
      perVisitPrice: rounded,
      annualPrice: rounded,
      detailsBreakdown: details,
    };
  }, [areaTotals, form]);

  return {
    form,
    setForm,
    onChange,
    setAreaField,
    areaTotals,
    quote,
  };
}

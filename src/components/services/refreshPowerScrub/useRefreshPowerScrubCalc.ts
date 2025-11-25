// src/features/services/refreshPowerScrub/useRefreshPowerScrubCalc.ts
import { useMemo, useState } from "react";
import type {
  RefreshAreaCalcState,
  RefreshAreaKey,
  RefreshAreaTotals,
  RefreshPowerScrubFormState,
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
  enabled: false,
  workers: 2,
  hours: 0,
  insideSqFt: 0,
  outsideSqFt: 0,
  kitchenSize: "smallMedium",
  patioMode: "standalone",
  frequencyLabel: "",
};

const DEFAULT_FORM: RefreshPowerScrubFormState = {
  // BaseServiceFormState (actual type lives elsewhere)
  serviceId: "refreshPowerScrub",
  frequency: "one_time" as any,
  tripChargeIncluded: true,
  notes: "",

  // Global Refresh rules
  tripCharge: REFRESH_DEFAULT_TRIP,   // $75
  hourlyRate: REFRESH_DEFAULT_HOURLY, // $200/hr/worker
  minimumVisit: REFRESH_DEFAULT_MIN,  // $475 minimum

  // Columns (Dumpster on by default)
  dumpster: { ...DEFAULT_AREA, enabled: true },
  patio: { ...DEFAULT_AREA },
  walkway: { ...DEFAULT_AREA },
  foh: { ...DEFAULT_AREA },
  boh: { ...DEFAULT_AREA },
  other: { ...DEFAULT_AREA },
};

const numericAreaFields: (keyof RefreshAreaCalcState)[] = [
  "workers",
  "hours",
  "insideSqFt",
  "outsideSqFt",
];

/** Hourly rule:
 *  Workers × hours × hourlyRate (NO trip charge here - applied at visit level).
 *  Returns the labour cost only.
 */
function calcHourlyLabour(
  state: RefreshAreaCalcState,
  hourlyRate: number
): number {
  return (state.workers || 0) * (state.hours || 0) * hourlyRate;
}

/** Sq-ft rule:
 *  $200 fixed fee + $.60 / inside sq ft + $.40 / outside sq ft.
 *  Returns the service cost only (trip applied at visit level).
 */
function calcSquareFootage(
  state: RefreshAreaCalcState
): number {
  const insideCost =
    (state.insideSqFt || 0) * REFRESH_SQFT_INSIDE_RATE;
  const outsideCost =
    (state.outsideSqFt || 0) * REFRESH_SQFT_OUTSIDE_RATE;
  return REFRESH_SQFT_FIXED_FEE + insideCost + outsideCost;
}

/** Default / preset prices when no hours / sq-ft are supplied.
 *  These are PACKAGE prices that already include trip charge.
 */
function calcPresetPackage(
  area: RefreshAreaKey,
  state: RefreshAreaCalcState
): number {
  switch (area) {
    case "dumpster":
      // Dumpster — charge the $475 minimum visit (includes trip + minimal labour).
      return REFRESH_DEFAULT_MIN;

    case "patio":
      // Patio — standalone $875 (includes trip), upsell +$500 (labour only, trip already in FOH).
      return state.patioMode === "upsell"
        ? REFRESH_PATIO_UPSELL
        : REFRESH_PATIO_STANDALONE;

    case "foh":
      // Front of house — $2500 package (includes trip).
      return REFRESH_FOH_RATE;

    case "boh":
      // Back of house — $1500 small/medium, $2500 large kitchen (includes trip).
      return state.kitchenSize === "large"
        ? REFRESH_KITCHEN_LARGE
        : REFRESH_KITCHEN_SMALL_MED;

    case "walkway":
    case "other":
    default:
      // These are usually custom, so by default $0 until you
      // either enter hours or square-footage.
      return 0;
  }
}

/** Decide which rule applies to this column and whether it's a package price.
 *  Returns { cost, isPackage }
 *  - isPackage=true means the cost already includes trip charge
 *  - isPackage=false means the cost is labour/service only (trip added at visit level)
 */
function calcAreaCost(
  area: RefreshAreaKey,
  form: RefreshPowerScrubFormState
): { cost: number; isPackage: boolean } {
  const state = form[area];
  if (!state.enabled) return { cost: 0, isPackage: false };

  const hasSqFt =
    (state.insideSqFt || 0) > 0 ||
    (state.outsideSqFt || 0) > 0;
  const hasHours = (state.hours || 0) > 0;

  // Priority: sq-ft > hourly > preset
  if (hasSqFt) {
    return { cost: calcSquareFootage(state), isPackage: false };
  }
  if (hasHours) {
    return { cost: calcHourlyLabour(state, form.hourlyRate), isPackage: false };
  }

  // Preset prices are package prices (trip included)
  return { cost: calcPresetPackage(area, state), isPackage: true };
}

export function useRefreshPowerScrubCalc(
  initial?: Partial<RefreshPowerScrubFormState>
) {
  const [form, setForm] = useState<RefreshPowerScrubFormState>(() => {
    // Merge defaults with any initial data.
    const base: RefreshPowerScrubFormState = {
      ...DEFAULT_FORM,
      ...initial,
    };

    // Deep-merge per-area overrides
    AREA_KEYS.forEach((area) => {
      const incoming = (initial as any)?.[area] || {};
      (base as any)[area] = {
        ...DEFAULT_AREA,
        ...(DEFAULT_FORM as any)[area],
        ...incoming,
      } as RefreshAreaCalcState;
    });

    // Override global config if initial data provided
    if (initial?.tripCharge != null) {
      base.tripCharge = initial.tripCharge;
    }
    if (initial?.hourlyRate != null) {
      base.hourlyRate = initial.hourlyRate;
    }
    if (initial?.minimumVisit != null) {
      base.minimumVisit = initial.minimumVisit;
    }

    return base;
  });

  /** Toggle whether a column is included */
  const toggleAreaEnabled = (area: RefreshAreaKey, enabled: boolean) => {
    setForm((prev) => ({
      ...prev,
      [area]: {
        ...(prev as any)[area],
        enabled,
      } as RefreshAreaCalcState,
    }));
  };

  /** Update a single area field from the form */
  const setAreaField = (
    area: RefreshAreaKey,
    field: keyof RefreshAreaCalcState,
    raw: string
  ) => {
    setForm((prev) => {
      const current = prev[area];
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

  /** Root config helpers */
  const setTripCharge = (raw: string) => {
    const n = parseFloat(raw);
    setForm((prev) => ({
      ...prev,
      tripCharge: Number.isFinite(n) ? n : 0,
    }));
  };

  const setHourlyRate = (raw: string) => {
    const n = parseFloat(raw);
    setForm((prev) => ({
      ...prev,
      hourlyRate: Number.isFinite(n) ? n : 0,
    }));
  };

  const setMinimumVisit = (raw: string) => {
    const n = parseFloat(raw);
    setForm((prev) => ({
      ...prev,
      minimumVisit: Number.isFinite(n) ? n : 0,
    }));
  };

  // Calculate area totals and track if any use package pricing
  const { areaTotals, hasPackagePrice } = useMemo(() => {
    const totals: any = {};
    let hasPackage = false;

    for (const area of AREA_KEYS) {
      const { cost, isPackage } = calcAreaCost(area, form);
      totals[area] = cost;
      if (isPackage && cost > 0) {
        hasPackage = true;
      }
    }

    return {
      areaTotals: totals as RefreshAreaTotals,
      hasPackagePrice: hasPackage,
    };
  }, [form]);

  const quote: ServiceQuoteResult = useMemo(() => {
    // Sum all area costs
    const areasSubtotal = AREA_KEYS.reduce(
      (sum, area) => sum + areaTotals[area],
      0
    );

    let perVisit: number;

    if (hasPackagePrice) {
      // At least one area uses package pricing (trip already included).
      // Just use the sum as-is.
      perVisit = areasSubtotal;
    } else {
      // All areas are labour/service only (hourly or sq-ft).
      // Add trip charge once at visit level.
      const withTrip = form.tripCharge + areasSubtotal;
      perVisit = Math.max(withTrip, form.minimumVisit);
    }

    const rounded = Math.round(perVisit * 100) / 100;

    const details: string[] = [];
    AREA_KEYS.forEach((area) => {
      const amount = areaTotals[area];
      if (amount <= 0) return;

      const state = form[area];
      const prettyArea =
        area === "boh"
          ? "Back of House"
          : area === "foh"
          ? "Front of House"
          : area[0].toUpperCase() + area.slice(1);

      const hasSqFt =
        (state.insideSqFt || 0) > 0 ||
        (state.outsideSqFt || 0) > 0;
      const hasHours = (state.hours || 0) > 0;

      const method = hasSqFt
        ? "sq-ft rule"
        : hasHours
        ? "hourly rule"
        : "package price";

      details.push(
        `${prettyArea}: $${amount.toFixed(2)} (${method})`
      );
    });

    if (!hasPackagePrice && areasSubtotal > 0) {
      details.push(`Trip charge: $${form.tripCharge.toFixed(2)} (one-time per visit)`);
    }

    // Refresh is essentially a one-time deep clean,
    // so annual == per-visit in this model.
    return {
      serviceId: "refreshPowerScrub",
      displayName: "Refresh Power Scrub",
      perVisitPrice: rounded,
      annualPrice: rounded,
      detailsBreakdown: details,
    };
  }, [areaTotals, hasPackagePrice, form.tripCharge, form.minimumVisit]);

  return {
    form,
    setTripCharge,
    setHourlyRate,
    setMinimumVisit,
    toggleAreaEnabled,
    setAreaField,
    areaTotals,
    quote,
  };
}

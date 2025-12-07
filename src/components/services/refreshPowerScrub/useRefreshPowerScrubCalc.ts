// src/features/services/refreshPowerScrub/useRefreshPowerScrubCalc.ts
import { useEffect, useMemo, useState } from "react";
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
import { serviceConfigApi } from "../../../backendservice/api";

// ✅ Backend config interface matching MongoDB JSON structure
interface BackendRefreshPowerScrubConfig {
  coreRates: {
    defaultHourlyRate: number;
    tripCharge: number;
    minimumVisit: number;
  };
  areaSpecificPricing: {
    kitchen: {
      smallMedium: number;
      large: number;
    };
    frontOfHouse: number;
    patio: {
      standalone: number;
      upsell: number;
    };
  };
  squareFootagePricing: {
    fixedFee: number;
    insideRate: number;
    outsideRate: number;
  };
}

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
  pricingType: "preset",
  workers: 2,
  hours: 0,
  hourlyRate: REFRESH_DEFAULT_HOURLY, // $200/hr default
  insideSqFt: 0,
  outsideSqFt: 0,
  insideRate: REFRESH_SQFT_INSIDE_RATE, // $0.60/sq ft default
  outsideRate: REFRESH_SQFT_OUTSIDE_RATE, // $0.40/sq ft default
  sqFtFixedFee: REFRESH_SQFT_FIXED_FEE, // $200 fixed fee default
  customAmount: 0,
  kitchenSize: "smallMedium",
  patioMode: "standalone",
  frequencyLabel: "",
};

const DEFAULT_FORM: RefreshPowerScrubFormState = {
  // BaseServiceFormState (actual type lives elsewhere)
  serviceId: "refreshPowerScrub",
  frequency: "monthly" as any,
  tripChargeIncluded: true,
  notes: "",

  // Global Refresh rules
  tripCharge: REFRESH_DEFAULT_TRIP,   // $75
  hourlyRate: REFRESH_DEFAULT_HOURLY, // $200/hr/worker
  minimumVisit: REFRESH_DEFAULT_MIN,  // $475 minimum

  // Global frequency and contract settings
  frequency: "monthly",
  contractMonths: 12,

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
  "hourlyRate",
  "insideSqFt",
  "outsideSqFt",
  "insideRate",
  "outsideRate",
  "sqFtFixedFee",
  "customAmount",
];

/** Hourly rule:
 *  Workers × hours × hourlyRate (NO trip charge here - applied at visit level).
 *  Returns the labour cost only. Uses backend rate when available.
 */
function calcHourlyLabour(
  state: RefreshAreaCalcState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  const hourlyRate = backendConfig?.coreRates?.defaultHourlyRate ?? state.hourlyRate ?? REFRESH_DEFAULT_HOURLY;
  return (state.workers || 0) * (state.hours || 0) * hourlyRate;
}

/** Sq-ft rule:
 *  Fixed fee + inside rate × inside sq ft + outside rate × outside sq ft.
 *  Returns the service cost only (trip applied at visit level). Uses backend rates when available.
 */
function calcSquareFootage(
  state: RefreshAreaCalcState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  const fixedFee = backendConfig?.squareFootagePricing?.fixedFee ?? state.sqFtFixedFee ?? REFRESH_SQFT_FIXED_FEE;
  const insideRate = backendConfig?.squareFootagePricing?.insideRate ?? state.insideRate ?? REFRESH_SQFT_INSIDE_RATE;
  const outsideRate = backendConfig?.squareFootagePricing?.outsideRate ?? state.outsideRate ?? REFRESH_SQFT_OUTSIDE_RATE;

  const insideCost = (state.insideSqFt || 0) * insideRate;
  const outsideCost = (state.outsideSqFt || 0) * outsideRate;
  return fixedFee + insideCost + outsideCost;
}

/** Default / preset prices when no hours / sq-ft are supplied.
 *  These are PACKAGE prices that already include trip charge.
 */
function calcPresetPackage(
  area: RefreshAreaKey,
  state: RefreshAreaCalcState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  // ✅ Use backend config with fallback for missing properties only
  // Create a merged config that uses backend values when available, defaults otherwise
  const defaultConfig = {
    coreRates: {
      defaultHourlyRate: REFRESH_DEFAULT_HOURLY,
      tripCharge: REFRESH_DEFAULT_TRIP,
      minimumVisit: REFRESH_DEFAULT_MIN,
    },
    areaSpecificPricing: {
      kitchen: {
        smallMedium: REFRESH_KITCHEN_SMALL_MED,
        large: REFRESH_KITCHEN_LARGE,
      },
      frontOfHouse: REFRESH_FOH_RATE,
      patio: {
        standalone: REFRESH_PATIO_STANDALONE,
        upsell: REFRESH_PATIO_UPSELL,
      },
    },
    squareFootagePricing: {
      fixedFee: REFRESH_SQFT_FIXED_FEE,
      insideRate: REFRESH_SQFT_INSIDE_RATE,
      outsideRate: REFRESH_SQFT_OUTSIDE_RATE,
    },
  };

  // Merge backend config with defaults, ensuring all required properties exist
  const config = {
    coreRates: {
      ...defaultConfig.coreRates,
      ...(backendConfig?.coreRates || {}),
    },
    areaSpecificPricing: {
      kitchen: {
        ...defaultConfig.areaSpecificPricing.kitchen,
        ...(backendConfig?.areaSpecificPricing?.kitchen || {}),
      },
      frontOfHouse: backendConfig?.areaSpecificPricing?.frontOfHouse ?? defaultConfig.areaSpecificPricing.frontOfHouse,
      patio: {
        ...defaultConfig.areaSpecificPricing.patio,
        ...(backendConfig?.areaSpecificPricing?.patio || {}),
      },
    },
    squareFootagePricing: {
      ...defaultConfig.squareFootagePricing,
      ...(backendConfig?.squareFootagePricing || {}),
    },
  };

  switch (area) {
    case "dumpster":
      // Dumpster — charge the minimum visit (includes trip + minimal labour).
      return config.coreRates.minimumVisit;

    case "patio":
      // Patio — standalone or upsell pricing from backend config.
      return state.patioMode === "upsell"
        ? config.areaSpecificPricing.patio.upsell
        : config.areaSpecificPricing.patio.standalone;

    case "foh":
      // Front of house — package price from backend config.
      return config.areaSpecificPricing.frontOfHouse;

    case "boh":
      // Back of house — kitchen size pricing from backend config.
      return state.kitchenSize === "large"
        ? config.areaSpecificPricing.kitchen.large
        : config.areaSpecificPricing.kitchen.smallMedium;

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
  form: RefreshPowerScrubFormState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): { cost: number; isPackage: boolean } {
  const state = form[area];
  if (!state.enabled) return { cost: 0, isPackage: false };

  // Use the selected pricing type
  switch (state.pricingType) {
    case "preset":
      // Preset prices are package prices (trip included)
      return { cost: calcPresetPackage(area, state, backendConfig), isPackage: true };

    case "hourly":
      // Hourly pricing - labor only (trip added at visit level)
      return { cost: calcHourlyLabour(state, backendConfig), isPackage: false };

    case "squareFeet":
      // Square footage pricing - service only (trip added at visit level)
      return { cost: calcSquareFootage(state, backendConfig), isPackage: false };

    case "custom":
      // Custom amount - assume it's a package price (trip included)
      return { cost: state.customAmount || 0, isPackage: true };

    default:
      return { cost: 0, isPackage: false };
  }
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

  // ✅ State to store backend config
  const [backendConfig, setBackendConfig] = useState<BackendRefreshPowerScrubConfig | null>(null);

  // ✅ Loading state for refresh button
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // ✅ Fetch configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("refreshPowerScrub");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ Refresh Power Scrub config not found in backend, using default fallback values');
        return;
      }

      // ✅ Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ Refresh Power Scrub document has no config property');
        return;
      }

      const config = document.config as BackendRefreshPowerScrubConfig;

      // ✅ Store the backend config
      setBackendConfig(config);

      console.log('📊 [Refresh Power Scrub] Backend Config Received:', {
        coreRates: config.coreRates,
        areaSpecificPricing: config.areaSpecificPricing,
        squareFootagePricing: config.squareFootagePricing,
      });

      setForm((prev) => ({
        ...prev,
        // Update rates from backend if available
        tripCharge: config.coreRates?.tripCharge ?? prev.tripCharge,
        hourlyRate: config.coreRates?.defaultHourlyRate ?? prev.hourlyRate,
        minimumVisit: config.coreRates?.minimumVisit ?? prev.minimumVisit,
      }));

      console.log('✅ Refresh Power Scrub config loaded from backend:', config);
    } catch (error) {
      console.error('❌ Failed to fetch Refresh Power Scrub config from backend:', error);
      console.log('⚠️ Using default hardcoded values as fallback');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchPricing();
  }, []); // Run once on mount

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
      const { cost, isPackage } = calcAreaCost(area, form, backendConfig);
      totals[area] = cost;
      if (isPackage && cost > 0) {
        hasPackage = true;
      }
    }

    return {
      areaTotals: totals as RefreshAreaTotals,
      hasPackagePrice: hasPackage,
    };
  }, [form, backendConfig]);

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

    // Calculate monthly and contract totals based on frequency
    let monthlyRecurring = 0;
    let contractTotal = 0;

    switch (form.frequency) {
      case "weekly":
        monthlyRecurring = rounded * 4.33; // 4.33 weeks per month
        break;
      case "biweekly":
        monthlyRecurring = rounded * 2.17; // ~2.17 visits per month
        break;
      case "monthly":
        monthlyRecurring = rounded; // 1 visit per month
        break;
      case "bimonthly":
        monthlyRecurring = rounded * 0.5; // 0.5 visits per month
        break;
      case "quarterly":
        monthlyRecurring = rounded * 0.33; // ~0.33 visits per month
        break;
      default:
        monthlyRecurring = rounded;
    }

    contractTotal = monthlyRecurring * (form.contractMonths || 12);

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

      const method =
        state.pricingType === "preset"
          ? "preset package"
          : state.pricingType === "hourly"
          ? "hourly rate"
          : state.pricingType === "squareFeet"
          ? "sq-ft rule"
          : "custom amount";

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
      annualPrice: contractTotal,
      detailsBreakdown: details,
      monthlyRecurring,
      contractTotal,
    };
  }, [areaTotals, hasPackagePrice, form.tripCharge, form.minimumVisit, form.frequency, form.contractMonths, backendConfig]);

  const setNotes = (notes: string) => {
    setForm((prev) => ({
      ...prev,
      notes,
    }));
  };

  return {
    form,
    setTripCharge,
    setHourlyRate,
    setMinimumVisit,
    setNotes,
    toggleAreaEnabled,
    setAreaField,
    areaTotals,
    quote,
    refreshConfig: fetchPricing,
    isLoadingConfig,
    backendConfig, // ✅ Expose backend config for auto-populated rates
  };
}

// src/features/services/refreshPowerScrub/useRefreshPowerScrubCalc.ts
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type {
  RefreshAreaCalcState,
  RefreshAreaKey,
  RefreshAreaTotals,
  RefreshPowerScrubFormState,
} from "./refreshPowerScrubTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";

// ✅ Fallback constants (only used when backend is unavailable)
const FALLBACK_DEFAULT_HOURLY = 200;
const FALLBACK_DEFAULT_MIN = 475;
const FALLBACK_DEFAULT_TRIP = 75;
const FALLBACK_FOH_RATE = 2500;
const FALLBACK_KITCHEN_LARGE = 2500;
const FALLBACK_KITCHEN_SMALL_MED = 1500;
const FALLBACK_PATIO_STANDALONE = 800;
const FALLBACK_PATIO_UPSELL = 500;
const FALLBACK_SQFT_FIXED_FEE = 200;
const FALLBACK_SQFT_INSIDE_RATE = 0.6;
const FALLBACK_SQFT_OUTSIDE_RATE = 0.4;
const FALLBACK_PER_HOUR_RATE = 400;

// ✅ Backend config interface matching the EXACT MongoDB JSON structure provided
interface BackendRefreshPowerScrubConfig {
  coreRates: {
    defaultHourlyRate: number;      // 200
    perWorkerRate: number;          // 200
    perHourRate: number;            // 400
    tripCharge: number;             // 75
    minimumVisit: number;           // 400
  };
  areaSpecificPricing: {
    kitchen: {
      smallMedium: number;          // 1500
      large: number;                // 2500
    };
    frontOfHouse: number;           // 2500
    patio: {
      standalone: number;           // 800
      upsell: number;               // 500
    };
  };
  squareFootagePricing: {
    fixedFee: number;               // 200
    insideRate: number;             // 0.6
    outsideRate: number;            // 0.4
  };
  billingConversions: {
    weekly: {
      monthlyMultiplier: number;    // 4.33
      annualMultiplier: number;     // 52
      description: string;
    };
    biweekly: {
      monthlyMultiplier: number;    // 2.165
      annualMultiplier: number;     // 26
      description: string;
    };
    monthly: {
      monthlyMultiplier: number;    // 1
      annualMultiplier: number;     // 12
      description: string;
    };
    bimonthly: {
      monthlyMultiplier: number;    // 0.5
      annualMultiplier: number;     // 6
      description: string;
    };
    quarterly: {
      monthlyMultiplier: number;    // 0.333
      annualMultiplier: number;     // 4
      description: string;
    };
  };
  frequencyOptions: string[];       // ["weekly", "biweekly", "monthly", "bimonthly", "quarterly"]
  areaTypes: string[];              // ["dumpster", "patio", "walkway", "foh", "boh", "other"]
  pricingTypes: string[];           // ["preset", "perWorker", "perHour", "squareFeet", "custom"]
  frequencyMetadata: {
    weekly: {
      monthlyRecurringMultiplier: number;     // 4.33
      firstMonthExtraMultiplier: number;      // 3.33
    };
    biweekly: {
      monthlyRecurringMultiplier: number;     // 2.165
      firstMonthExtraMultiplier: number;      // 1.165
    };
    monthly: { cycleMonths: number };         // 1
    bimonthly: { cycleMonths: number };       // 2
    quarterly: { cycleMonths: number };       // 3
    biannual: { cycleMonths: number };        // 6
    annual: { cycleMonths: number };          // 12
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

// ✅ Helper function to transform backend frequencyMetadata to frontend format
function transformBackendFrequencyMeta(backendMeta: BackendRefreshPowerScrubConfig['frequencyMetadata'] | undefined) {
  if (!backendMeta) {
    console.warn('⚠️ No backend frequencyMetadata available, using static fallback values');
    return null;
  }

  console.log('🔧 [Refresh Power Scrub] Transforming backend frequencyMetadata:', backendMeta);

  // Transform backend structure to frontend billingConversions format
  const transformedBilling: any = {};

  // Handle weekly and biweekly with their special multipliers
  if (backendMeta.weekly) {
    transformedBilling.weekly = {
      monthlyMultiplier: backendMeta.weekly.monthlyRecurringMultiplier,
      annualMultiplier: backendMeta.weekly.monthlyRecurringMultiplier * 12,
    };
  }

  if (backendMeta.biweekly) {
    transformedBilling.biweekly = {
      monthlyMultiplier: backendMeta.biweekly.monthlyRecurringMultiplier,
      annualMultiplier: backendMeta.biweekly.monthlyRecurringMultiplier * 12,
    };
  }

  // Handle cycle-based frequencies (monthly, bimonthly, quarterly, biannual, annual)
  const cycleBased = ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'] as const;

  for (const freq of cycleBased) {
    const backendFreqData = backendMeta[freq];
    if (backendFreqData?.cycleMonths) {
      const cycleMonths = backendFreqData.cycleMonths;
      const monthlyMultiplier = 1 / cycleMonths; // e.g., bimonthly: 1/2=0.5, quarterly: 1/3=0.333
      const annualMultiplier = 12 / cycleMonths; // e.g., bimonthly: 12/2=6, quarterly: 12/3=4

      transformedBilling[freq] = {
        monthlyMultiplier,
        annualMultiplier,
      };
    }
  }

  console.log('✅ [Refresh Power Scrub] Transformed frequencyMetadata to billingConversions:', transformedBilling);
  return transformedBilling;
}

// ✅ Helper function to get billing multipliers from backend with fallbacks
function getBillingMultiplier(
  frequency: string,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  // ✅ FIXED: Handle special characters in frequency labels
  let normalizedFrequency = frequency.toLowerCase().replace("-", "").replace(/\s+/g, "");

  // ✅ Special handling for "2× / Month" → "twicepermonth"
  if (normalizedFrequency.includes("2×") || normalizedFrequency.includes("2x") || normalizedFrequency === "2/month") {
    normalizedFrequency = "twicepermonth";
  }

  // Default multipliers as fallback
  const defaultMultipliers: Record<string, number> = {
    "onetime": 0,
    "weekly": 4.33,
    "biweekly": 2.165,
    "twicepermonth": 2.0,  // 2 visits per month
    "monthly": 1.0,
    "bimonthly": 0.5,
    "quarterly": 0.333,
    "biannual": 0.167,
    "annual": 0.083,
  };

  // Get from backend config if available
  if (backendConfig?.billingConversions) {
    const conversions = backendConfig.billingConversions;
    switch (normalizedFrequency) {
      case "weekly":
        return conversions.weekly?.monthlyMultiplier ?? defaultMultipliers.weekly;
      case "biweekly":
        return conversions.biweekly?.monthlyMultiplier ?? defaultMultipliers.biweekly;
      case "twicepermonth":
        return defaultMultipliers.twicepermonth; // Always use 2.0 for twice per month
      case "monthly":
        return conversions.monthly?.monthlyMultiplier ?? defaultMultipliers.monthly;
      case "bimonthly":
        return conversions.bimonthly?.monthlyMultiplier ?? defaultMultipliers.bimonthly;
      case "quarterly":
        return conversions.quarterly?.monthlyMultiplier ?? defaultMultipliers.quarterly;
    }
  }

  // Also try transformed frequencyMetadata if billingConversions not available
  const transformedMeta = transformBackendFrequencyMeta(backendConfig?.frequencyMetadata);
  if (transformedMeta && transformedMeta[normalizedFrequency]) {
    return transformedMeta[normalizedFrequency].monthlyMultiplier;
  }

  // Return default multiplier
  return defaultMultipliers[normalizedFrequency] ?? 1.0;
}

// ✅ Helper function to create DEFAULT_AREA with backend fallbacks
function createDefaultArea(backendConfig?: BackendRefreshPowerScrubConfig | null): RefreshAreaCalcState {
  return {
    enabled: false,
    pricingType: "preset",
    workers: 2,
    hours: 0,
    hourlyRate: backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE, // Use per-hour rate for hourly pricing
    workerRate: backendConfig?.coreRates?.perWorkerRate ?? backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY, // Use per-worker rate
    insideSqFt: 0,
    outsideSqFt: 0,
    insideRate: backendConfig?.squareFootagePricing?.insideRate ?? FALLBACK_SQFT_INSIDE_RATE,
    outsideRate: backendConfig?.squareFootagePricing?.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE,
    sqFtFixedFee: backendConfig?.squareFootagePricing?.fixedFee ?? FALLBACK_SQFT_FIXED_FEE,
    workerRateIsCustom: false,
    hourlyRateIsCustom: false,
    insideRateIsCustom: false,
    outsideRateIsCustom: false,
    sqFtFixedFeeIsCustom: false,
    presetRateIsCustom: false,
    smallMediumRateIsCustom: false,
    largeRateIsCustom: false,
    customAmount: 0,
    presetQuantity: 1, // Default quantity for preset calculations
    presetRate: undefined, // ✅ FIXED: Use undefined so ?? operator falls back to backend defaults
    kitchenSize: "smallMedium",
    smallMediumQuantity: 0, // ✅ NEW: Separate tracking for small/medium kitchens
    smallMediumRate: undefined, // ✅ NEW: Use undefined to fall back to backend default
    smallMediumCustomAmount: 0, // ✅ NEW: Custom override for small/medium
    largeQuantity: 0, // ✅ NEW: Separate tracking for large kitchens
    largeRate: undefined, // ✅ NEW: Use undefined to fall back to backend default
    largeCustomAmount: 0, // ✅ NEW: Custom override for large
    patioMode: "standalone",
    includePatioAddon: false,
    patioAddonRate: undefined, // ✅ NEW: undefined = use backend default
    frequencyLabel: "",
    contractMonths: 12,
  };
}

// ✅ Helper function to create DEFAULT_FORM with backend fallbacks
function createDefaultForm(backendConfig?: BackendRefreshPowerScrubConfig | null): RefreshPowerScrubFormState {
  const defaultArea = createDefaultArea(backendConfig);

  return {
    // BaseServiceFormState
    frequency: "monthly" as any,
    tripChargeIncluded: true,
    notes: "",

    // Global Refresh rules from backend or fallbacks
    tripCharge: backendConfig?.coreRates?.tripCharge ?? FALLBACK_DEFAULT_TRIP,
    hourlyRate: backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY,
    minimumVisit: backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN,

    // Global contract settings
    contractMonths: 12,

    // Columns (All unchecked by default)
    dumpster: { ...defaultArea },
    patio: { ...defaultArea },
    walkway: { ...defaultArea },
    foh: { ...defaultArea },
    boh: { ...defaultArea },
    other: { ...defaultArea },
  };
}

const DEFAULT_AREA: RefreshAreaCalcState = {
  enabled: false,
  pricingType: "preset",
  workers: 2,
  hours: 0,
  hourlyRate: FALLBACK_PER_HOUR_RATE, // $400/hr default for per-hour pricing
  workerRate: FALLBACK_DEFAULT_HOURLY, // $200/worker default for per-worker pricing
  insideSqFt: 0,
  outsideSqFt: 0,
  insideRate: FALLBACK_SQFT_INSIDE_RATE, // $0.60/sq ft default
  outsideRate: FALLBACK_SQFT_OUTSIDE_RATE, // $0.40/sq ft default
  sqFtFixedFee: FALLBACK_SQFT_FIXED_FEE, // $200 fixed fee default
  workerRateIsCustom: false,
  hourlyRateIsCustom: false,
  insideRateIsCustom: false,
  outsideRateIsCustom: false,
  sqFtFixedFeeIsCustom: false,
  presetRateIsCustom: false,
  smallMediumRateIsCustom: false,
  largeRateIsCustom: false,
  customAmount: 0,
  presetQuantity: 1, // Default quantity for preset calculations
  presetRate: undefined, // ✅ FIXED: Use undefined so ?? operator falls back to backend defaults
  kitchenSize: "smallMedium",
  smallMediumQuantity: 0, // ✅ NEW: Separate tracking for small/medium kitchens
  smallMediumRate: undefined, // ✅ NEW: Use undefined to fall back to backend default
  smallMediumCustomAmount: 0, // ✅ NEW: Custom override for small/medium
  largeQuantity: 0, // ✅ NEW: Separate tracking for large kitchens
  largeRate: undefined, // ✅ NEW: Use undefined to fall back to backend default
  largeCustomAmount: 0, // ✅ NEW: Custom override for large
  patioMode: "standalone",
  includePatioAddon: false, // Default to no add-on
  patioAddonRate: undefined, // ✅ NEW: undefined = use backend default
  frequencyLabel: "",
  contractMonths: 12, // Default contract length for individual areas
};

const resetAreaCustoms = (area: RefreshAreaCalcState): RefreshAreaCalcState => ({
  ...area,
  customAmount: 0,
  smallMediumCustomAmount: 0,
  largeCustomAmount: 0,
  patioAddonRate: undefined,
  workerRateIsCustom: false,
  hourlyRateIsCustom: false,
  insideRateIsCustom: false,
  outsideRateIsCustom: false,
  sqFtFixedFeeIsCustom: false,
  presetRateIsCustom: false,
  smallMediumRateIsCustom: false,
  largeRateIsCustom: false,
});

const clearAllCustomOverrides = (state: RefreshPowerScrubFormState): RefreshPowerScrubFormState => ({
  ...state,
  hourlyRateIsCustom: false,
  minimumVisitIsCustom: false,
  dumpster: resetAreaCustoms(state.dumpster),
  patio: resetAreaCustoms(state.patio),
  walkway: resetAreaCustoms(state.walkway),
  foh: resetAreaCustoms(state.foh),
  boh: resetAreaCustoms(state.boh),
  other: resetAreaCustoms(state.other),
});

const DEFAULT_FORM: RefreshPowerScrubFormState = {
  // BaseServiceFormState (actual type lives elsewhere)
  frequency: "monthly" as any,
  tripChargeIncluded: true,
  notes: "",

  // Global Refresh rules
  tripCharge: FALLBACK_DEFAULT_TRIP,   // $75
  hourlyRate: FALLBACK_DEFAULT_HOURLY, // $200/hr/worker
  minimumVisit: FALLBACK_DEFAULT_MIN,  // $475 minimum
  hourlyRateIsCustom: false,
  minimumVisitIsCustom: false,

  // Global contract settings
  contractMonths: 12,

  // Columns (All unchecked by default)
  dumpster: { ...DEFAULT_AREA },
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
  "workerRate",
  "insideSqFt",
  "outsideSqFt",
  "insideRate",
  "outsideRate",
  "sqFtFixedFee",
  "customAmount",
  "contractMonths",
  "presetQuantity",
  "presetRate",
  "smallMediumQuantity", // ✅ NEW: BOH small/medium fields
  "smallMediumRate",
  "smallMediumCustomAmount",
  "largeQuantity", // ✅ NEW: BOH large fields
  "largeRate",
  "largeCustomAmount",
  "patioAddonRate", // ✅ NEW: Patio addon rate
];

const priceFieldsForLogging: (keyof RefreshAreaCalcState)[] = [
  "hourlyRate",
  "workerRate",
  "insideRate",
  "outsideRate",
  "sqFtFixedFee",
  "customAmount",
  "presetRate",
  "smallMediumRate",
  "largeRate",
  "patioAddonRate",
];

/** Per Worker rule:
 *  Workers × perWorkerRate (NO trip charge here - applied at visit level).
 *  Returns the labour cost only. Uses area rate first, then form global rate, then backend rate.
 *  Applies minimum visit amount if calculated amount is below minimum.
 */
function calcPerWorker(
  state: RefreshAreaCalcState,
  formGlobalRate: number,  // ✅ Use form's global hourly rate as fallback
  formMinimumVisit: number, // ✅ Use form's global minimum visit
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  // ✅ PRIORITY: Use area rate first (user edited this field), then form global rate, then backend rate, then fallback
  const perWorkerRate = state.workerRate > 0
    ? state.workerRate
    : (formGlobalRate > 0
        ? formGlobalRate
        : (backendConfig?.coreRates?.perWorkerRate ?? backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY));

  // ✅ PRIORITY: Use form global minimum first, then backend, then fallback
  const minimumVisit = formMinimumVisit > 0
    ? formMinimumVisit
    : (backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN);

  const calculatedAmount = (state.workers || 0) * perWorkerRate;

  // Apply minimum if calculated amount is below minimum - ONLY when there are workers
  return state.workers > 0 ? Math.max(calculatedAmount, minimumVisit) : 0;
}

/** Per Hour rule:
 *  Hours × perHourRate (NO trip charge here - applied at visit level).
 *  Returns the labour cost only. Uses area rate first, then form global rate, then backend rate.
 *  Applies minimum visit amount if calculated amount is below minimum.
 */
function calcPerHour(
  state: RefreshAreaCalcState,
  formGlobalRate: number,  // ✅ Use form's global hourly rate as fallback
  formMinimumVisit: number, // ✅ Use form's global minimum visit
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  // ✅ PRIORITY: Use area rate first (user edited this field), then form global rate, then backend per-hour rate, then fallback
  const perHourRate = state.hourlyRate > 0
    ? state.hourlyRate
    : (formGlobalRate > 0
        ? formGlobalRate
        : (backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE));

  // ✅ PRIORITY: Use form global minimum first, then backend, then fallback
  const minimumVisit = formMinimumVisit > 0
    ? formMinimumVisit
    : (backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN);

  const calculatedAmount = (state.hours || 0) * perHourRate;

  // Apply minimum if calculated amount is below minimum - ONLY when there are hours
  return state.hours > 0 ? Math.max(calculatedAmount, minimumVisit) : 0;
}

/** Sq-ft rule:
 *  Fixed fee + inside rate × inside sq ft + outside rate × outside sq ft.
 *  Returns the service cost only (trip applied at visit level). Uses backend rates when available.
 *  Applies minimum visit amount if calculated amount is below minimum.
 */
function calcSquareFootage(
  state: RefreshAreaCalcState,
  formMinimumVisit: number, // ✅ NEW: Use form's global minimum visit
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  // ✅ FIXED: Use area's sq ft fixed fee if explicitly set (even if 0), otherwise use backend/fallback
  // Check if fixed fee has been explicitly set by comparing against default
  const fixedFee = state.sqFtFixedFee !== undefined && state.sqFtFixedFee !== null
    ? state.sqFtFixedFee
    : (backendConfig?.squareFootagePricing?.fixedFee ?? FALLBACK_SQFT_FIXED_FEE);

  const insideRate = state.insideRate > 0
    ? state.insideRate
    : (backendConfig?.squareFootagePricing?.insideRate ?? FALLBACK_SQFT_INSIDE_RATE);

  const outsideRate = state.outsideRate > 0
    ? state.outsideRate
    : (backendConfig?.squareFootagePricing?.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE);

  // ✅ PRIORITY: Use form global minimum first, then backend, then fallback
  const minimumVisit = formMinimumVisit > 0
    ? formMinimumVisit
    : (backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN);

  const insideCost = (state.insideSqFt || 0) * insideRate;
  const outsideCost = (state.outsideSqFt || 0) * outsideRate;
  const calculatedAmount = fixedFee + insideCost + outsideCost;

  // ✅ FIXED: Apply the fixed fee calculation even when there's 0 sq ft (if pricing type is set to squareFeet)
  // If user selected square footage pricing, they want to see the total including fixed fee
  const hasAnyValue = (state.insideSqFt || 0) > 0 || (state.outsideSqFt || 0) > 0 || fixedFee > 0;
  return hasAnyValue ? Math.max(calculatedAmount, minimumVisit) : 0;
}

/** Default / preset prices when no hours / sq-ft are supplied.
 *  These are PACKAGE prices that already include trip charge.
 *  ✅ NEW: Uses presetQuantity and presetRate when available, falls back to area defaults.
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
      defaultHourlyRate: FALLBACK_DEFAULT_HOURLY,
      perWorkerRate: FALLBACK_DEFAULT_HOURLY, // Default to same as hourly rate
      perHourRate: FALLBACK_PER_HOUR_RATE, // Default per hour rate
      tripCharge: FALLBACK_DEFAULT_TRIP,
      minimumVisit: FALLBACK_DEFAULT_MIN,
    },
    areaSpecificPricing: {
      kitchen: {
        smallMedium: FALLBACK_KITCHEN_SMALL_MED,
        large: FALLBACK_KITCHEN_LARGE,
      },
      frontOfHouse: FALLBACK_FOH_RATE,
      patio: {
        standalone: FALLBACK_PATIO_STANDALONE,
        upsell: FALLBACK_PATIO_UPSELL,
      },
    },
    squareFootagePricing: {
      fixedFee: FALLBACK_SQFT_FIXED_FEE,
      insideRate: FALLBACK_SQFT_INSIDE_RATE,
      outsideRate: FALLBACK_SQFT_OUTSIDE_RATE,
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

  // ✅ Get default rate for this area from backend config
  let defaultRate: number;

  switch (area) {
    case "dumpster":
      defaultRate = config.coreRates.minimumVisit;
      break;
    case "patio":
      // For patio, use base rate only (addon is added separately below)
      defaultRate = config.areaSpecificPricing.patio.standalone;
      break;
    case "foh":
      defaultRate = config.areaSpecificPricing.frontOfHouse;
      break;
    case "boh":
      // ✅ NEW: Calculate BOTH small/medium AND large kitchens, sum them together
      const smallMediumQty = state.smallMediumQuantity || 0;
      // ✅ Handle null (user cleared) vs undefined (use default)
      const smallMediumRate = state.smallMediumRate === null ? 0 : (state.smallMediumRate ?? config.areaSpecificPricing.kitchen.smallMedium);
      const smallMediumTotal = state.smallMediumCustomAmount > 0
        ? state.smallMediumCustomAmount
        : (smallMediumQty * smallMediumRate);

      const largeQty = state.largeQuantity || 0;
      // ✅ Handle null (user cleared) vs undefined (use default)
      const largeRate = state.largeRate === null ? 0 : (state.largeRate ?? config.areaSpecificPricing.kitchen.large);
      const largeTotal = state.largeCustomAmount > 0
        ? state.largeCustomAmount
        : (largeQty * largeRate);

      return smallMediumTotal + largeTotal;
    case "walkway":
    case "other":
    default:
      defaultRate = 0;
      break;
  }

  // ✅ Use custom quantity and rate when available, otherwise use defaults
  const quantity = (state.presetQuantity && state.presetQuantity > 0) ? state.presetQuantity : 1;
  // ✅ Handle null (user cleared) vs undefined (use default)
  const rate = state.presetRate === null ? 0 : (state.presetRate ?? defaultRate);

  // ✅ Calculate base amount
  let baseAmount = quantity * rate;

  // ✅ For patio, add the addon separately (after qty × rate calculation)
  if (area === "patio" && state.includePatioAddon) {
    // ✅ Use editable patio addon rate (null = 0, undefined = backend default)
    const addonRate = state.patioAddonRate === null ? 0 : (state.patioAddonRate ?? config.areaSpecificPricing.patio.upsell);
    baseAmount += addonRate;
  }

  return baseAmount;
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

  // ✅ Check for price override first (if customAmount is set and > 0)
  if (state.customAmount && state.customAmount > 0) {
    return { cost: state.customAmount, isPackage: true }; // Assume overrides are package prices
  }

  // Use the selected pricing type for automatic calculation
  switch (state.pricingType) {
    case "preset":
      // Preset prices are package prices (trip included)
      return { cost: calcPresetPackage(area, state, backendConfig), isPackage: true };

    case "perWorker":
      // Per worker pricing - labor only (trip added at visit level)
      // ✅ Pass form's global rates
      return { cost: calcPerWorker(state, form.hourlyRate, form.minimumVisit, backendConfig), isPackage: false };

    case "perHour":
      // Per hour pricing - labor only (trip added at visit level)
      // ✅ Pass form's global rates
      return { cost: calcPerHour(state, form.hourlyRate, form.minimumVisit, backendConfig), isPackage: false };

    case "squareFeet":
      // Square footage pricing - service only (trip added at visit level)
      // ✅ Pass form's global minimum visit
      return { cost: calcSquareFootage(state, form.minimumVisit, backendConfig), isPackage: false };

    case "custom":
      // Custom amount - assume it's a package price (trip included)
      return { cost: state.customAmount || 0, isPackage: true };

    default:
      return { cost: 0, isPackage: false };
  }
}

export function useRefreshPowerScrubCalc(
  initial?: Partial<RefreshPowerScrubFormState>,
  customFields?: any[]
) {
  // ✅ Add refs for tracking override and active state
  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);
  const initialAppliedRef = useRef(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // ✅ NEW: Calculate sum of all calc field totals (add directly to contract, no frequency)
  const calcFieldsTotal = useMemo(() => {
    if (!customFields || customFields.length === 0) return 0;

    const total = customFields.reduce((sum, field) => {
      if (field.type === "calc" && field.calcValues?.right) {
        const fieldTotal = parseFloat(field.calcValues.right) || 0;
        return sum + fieldTotal;
      }
      return sum;
    }, 0);

    console.log(`💰 [REFRESH-POWER-SCRUB-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
    return total;
  }, [customFields]);

  // ✅ NEW: Calculate sum of all dollar field values (add directly to contract, no frequency)
  const dollarFieldsTotal = useMemo(() => {
    if (!customFields || customFields.length === 0) return 0;

    const total = customFields.reduce((sum, field) => {
      if (field.type === "dollar" && field.value) {
        const fieldValue = parseFloat(field.value) || 0;
        return sum + fieldValue;
      }
      return sum;
    }, 0);

    console.log(`💰 [REFRESH-POWER-SCRUB-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

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

    // ✅ Initialize with global months ONLY if service starts with inputs
    const isInitiallyActive = AREA_KEYS.some(area => (initial as any)?.[area]?.enabled);
    const defaultContractMonths = initial?.contractMonths
      ? initial.contractMonths
      : (isInitiallyActive && servicesContext?.globalContractMonths)
        ? servicesContext.globalContractMonths
        : 12;

    base.contractMonths = defaultContractMonths;

    return base;
  });

  // Helper function to add service field changes
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number,
    frequencyOverride?: string
  ) => {
    addPriceChange({
      productKey: `refreshPowerScrub_${fieldName}`,
      productName: `Refresh Power Scrub - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: 1, // Default quantity for service changes
      frequency: frequencyOverride || form.frequency || 'monthly'
    });

    console.log(`📝 [REFRESH-POWER-SCRUB-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.frequency]);

  // ✅ State to store backend config
  const [backendConfig, setBackendConfig] = useState<BackendRefreshPowerScrubConfig | null>(null);

  // ✅ Loading state for refresh button
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Helper function to update form with config data
  const updateFormWithConfig = (config: BackendRefreshPowerScrubConfig) => {
    console.log('🔧 [Refresh Power Scrub] Updating form with backend config:', config);

    setForm((prev) => {
      const updatedDefaultArea = createDefaultArea(config);
      const backendForm = createDefaultForm(config);

      // ✅ FIXED: Preserve user input state (enabled/disabled areas) while updating backend rates
      // Only update rates that come from backend, don't override user customizations
      const updatedForm = {
        ...prev, // Keep all current form state

        // ✅ Update global rates from backend (only if not already customized)
        tripCharge: config.coreRates?.tripCharge ?? prev.tripCharge,
        hourlyRate: config.coreRates?.defaultHourlyRate ?? prev.hourlyRate,
        minimumVisit: config.coreRates?.minimumVisit ?? prev.minimumVisit,

        // ✅ Update each area's default rates from backend while preserving user settings
        dumpster: {
          ...prev.dumpster, // Keep user's enabled state and custom amounts
          // Update default rates from backend
          hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
          workerRate: config.coreRates?.perWorkerRate ?? config.coreRates?.defaultHourlyRate ?? updatedDefaultArea.workerRate,
          insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
        },
        patio: {
          ...prev.patio, // Keep user's enabled state and custom amounts
          hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
          workerRate: config.coreRates?.perWorkerRate ?? config.coreRates?.defaultHourlyRate ?? updatedDefaultArea.workerRate,
          insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
        },
        walkway: {
          ...prev.walkway, // Keep user's enabled state and custom amounts
          hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
          workerRate: config.coreRates?.perWorkerRate ?? config.coreRates?.defaultHourlyRate ?? updatedDefaultArea.workerRate,
          insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
        },
        foh: {
          ...prev.foh, // Keep user's enabled state and custom amounts
          hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
          workerRate: config.coreRates?.perWorkerRate ?? config.coreRates?.defaultHourlyRate ?? updatedDefaultArea.workerRate,
          insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
        },
        boh: {
          ...prev.boh, // Keep user's enabled state and custom amounts
          hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
          workerRate: config.coreRates?.perWorkerRate ?? config.coreRates?.defaultHourlyRate ?? updatedDefaultArea.workerRate,
          insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
        },
        other: {
          ...prev.other, // Keep user's enabled state and custom amounts
          hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
          workerRate: config.coreRates?.perWorkerRate ?? config.coreRates?.defaultHourlyRate ?? updatedDefaultArea.workerRate,
          insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
        },
      };

      console.log('🔧 [Refresh Power Scrub] Form updated with new rates:', {
        hourlyRate: updatedForm.hourlyRate,
        minimumVisit: updatedForm.minimumVisit,
        patioWorkerRate: updatedForm.patio.workerRate,
        fohWorkerRate: updatedForm.foh.workerRate,
      });

      return updatedForm;
    });
  };

  // ✅ Fetch configuration from backend
  const fetchPricing = useCallback(async () => {
    if (initial) {
      console.log('📋 [REFRESH-POWER-SCRUB-PRICING] Edit mode detected, skipping fetchPricing');
      return;
    }
    setIsLoadingConfig(true);
    try {
      console.log('🔄 [Refresh Power Scrub] Fetching fresh configuration from backend...');

      // First try to get active service config
      const response = await serviceConfigApi.getActive("refreshPowerScrub");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ Refresh Power Scrub config not found in active services, trying fallback pricing...');

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("refreshPowerScrub");
          if (fallbackConfig?.config) {
            console.log('✅ [Refresh Power Scrub] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendRefreshPowerScrubConfig;
            setBackendConfig(config);
            updateFormWithConfig(config);

            // ✅ Clear any custom amounts to ensure backend values are used
            setForm(clearAllCustomOverrides);

            console.log('✅ Refresh Power Scrub FALLBACK CONFIG loaded from context:', {
              coreRates: config.coreRates,
              areaSpecificPricing: config.areaSpecificPricing,
              squareFootagePricing: config.squareFootagePricing,
              billingConversions: config.billingConversions,
            });
            return;
          }
        }

        console.warn('⚠️ No backend pricing available, using static fallback values');
        return;
      }

      // ✅ Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ Refresh Power Scrub document has no config property');
        return;
      }

      const config = document.config as BackendRefreshPowerScrubConfig;

      // ✅ Store the backend config and update form
      setBackendConfig(config);
      updateFormWithConfig(config);

      // ✅ Clear any custom amounts to ensure backend values are used
      setForm(clearAllCustomOverrides);

      console.log('📊 [Refresh Power Scrub] Active Backend Config Received:', {
        coreRates: config.coreRates,
        areaSpecificPricing: config.areaSpecificPricing,
        squareFootagePricing: config.squareFootagePricing,
        billingConversions: config.billingConversions,
      });

      console.log('✅ Refresh Power Scrub config loaded from backend, custom amounts cleared');
    } catch (error) {
      console.error('❌ Failed to fetch Refresh Power Scrub config from backend:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("refreshPowerScrub");
        if (fallbackConfig?.config) {
          console.log('✅ [Refresh Power Scrub] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendRefreshPowerScrubConfig;
          setBackendConfig(config);
          updateFormWithConfig(config);

          // ✅ Clear any custom amounts to ensure backend values are used
          setForm(clearAllCustomOverrides);

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  }, [servicesContext?.getBackendPricingForService]);

  // Fetch on mount ONLY if no initial data (new service)
  useEffect(() => {
    if (initial) {
      console.log('📋 [REFRESH-POWER-SCRUB-PRICING] Skipping price fetch - using saved historical prices from initial data');
      return;
    }

    console.log('📋 [REFRESH-POWER-SCRUB-PRICING] Fetching current prices - new service or no initial data');
    fetchPricing();
  }, [initial, fetchPricing]); // Run once on mount (re-run if initial changes)

  // Also fetch when services context becomes available (but NOT in edit mode)
  useEffect(() => {
    if (initial) return;

    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [initial, servicesContext?.backendPricingData, backendConfig, fetchPricing]);

  // ƒo. In edit mode we still need backend defaults to compare overrides
  useEffect(() => {
    if (!initial || backendConfig) return;
    const fallbackConfig = servicesContext?.getBackendPricingForService?.("refreshPowerScrub");
    if (fallbackConfig?.config) {
      setBackendConfig(fallbackConfig.config as BackendRefreshPowerScrubConfig);
    }
  }, [initial, backendConfig, servicesContext?.getBackendPricingForService]);

  useEffect(() => {
    if (!initial) {
      initialAppliedRef.current = false;
      return;
    }
    if (initialAppliedRef.current) return;

    const baselineForm = {
      ...DEFAULT_FORM,
      ...initial,
    };
    setForm(baselineForm);
    initialAppliedRef.current = true;
    console.log('📋 [REFRESH-POWER-SCRUB] Applied saved edit-mode data to form');
  }, [initial]);

  // ✅ Add sync effect to adopt global months when service becomes active or when global months change
  useEffect(() => {
    const isServiceActive = AREA_KEYS.some(area => form[area].enabled);
    const wasActive = wasActiveRef.current;
    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {
      if (servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
        const globalMonths = servicesContext.globalContractMonths;
        console.log(`📅 [REFRESH-POWER-SCRUB-CONTRACT] Service just became active, syncing global contract months: ${globalMonths}`);
        setForm(prev => {
          const updated = {
            ...prev,
            contractMonths: globalMonths,
          };
          // ✅ FIXED: Update contract months for ALL areas
          AREA_KEYS.forEach(area => {
            updated[area] = {
              ...updated[area],
              contractMonths: globalMonths,
            };
          });
          return updated;
        });
      }
    } else if (isServiceActive && servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
      const globalMonths = servicesContext.globalContractMonths;
      if (form.contractMonths !== globalMonths) {
        console.log(`📅 [REFRESH-POWER-SCRUB-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => {
          const updated = {
            ...prev,
            contractMonths: globalMonths,
          };
          // ✅ FIXED: Update contract months for ALL areas
          AREA_KEYS.forEach(area => {
            updated[area] = {
              ...updated[area],
              contractMonths: globalMonths,
            };
          });
          return updated;
        });
      }
    }

    wasActiveRef.current = isServiceActive;
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.dumpster.enabled, form.patio.enabled, form.walkway.enabled, form.foh.enabled, form.boh.enabled, form.other.enabled, servicesContext]);

  /** Toggle whether a column is included */
  const toggleAreaEnabled = (area: RefreshAreaKey, enabled: boolean) => {
    setForm((prev) => {
      const originalValue = prev[area].enabled;

      // Log the area toggle change
      return {
        ...prev,
        [area]: {
          ...(prev as any)[area],
          enabled,
        } as RefreshAreaCalcState,
      };
    });
  };

  const getAreaFieldFallback = (
    areaKey: RefreshAreaKey,
    fieldName: keyof RefreshAreaCalcState,
    state: RefreshAreaCalcState
  ): number => {
    switch (fieldName) {
      case "hourlyRate":
        return backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE;
      case "workerRate":
        return backendConfig?.coreRates?.perWorkerRate ?? backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY;
      case "insideRate":
        return backendConfig?.squareFootagePricing?.insideRate ?? FALLBACK_SQFT_INSIDE_RATE;
      case "outsideRate":
        return backendConfig?.squareFootagePricing?.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE;
      case "sqFtFixedFee":
        return backendConfig?.squareFootagePricing?.fixedFee ?? FALLBACK_SQFT_FIXED_FEE;
      case "patioAddonRate":
        return backendConfig?.areaSpecificPricing?.patio?.upsell ?? FALLBACK_PATIO_UPSELL;
      case "smallMediumRate":
        return backendConfig?.areaSpecificPricing?.kitchen?.smallMedium ?? FALLBACK_KITCHEN_SMALL_MED;
      case "largeRate":
        return backendConfig?.areaSpecificPricing?.kitchen?.large ?? FALLBACK_KITCHEN_LARGE;
      case "customAmount":
        return typeof state.customAmount === "number" ? state.customAmount : 0;
      default:
        return typeof state[fieldName] === "number"
          ? (state[fieldName] as number)
          : 0;
    }
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
      let originalValue: any = current[field];

      if (numericAreaFields.includes(field)) {
        // ✅ FIXED: Distinguish between "never set" (undefined) and "user cleared" (null)
        if (raw === '' || raw === null) {
          value = null; // User explicitly cleared the field - show empty
        } else if (raw === undefined) {
          value = undefined; // Never been set - use backend default
        } else {
          const n = parseFloat(raw);
          value = Number.isFinite(n) ? n : null;
        }
        originalValue = typeof originalValue === 'number' ? originalValue : 0;

        // ✅ Log price override for numeric pricing fields (only if value is a valid number)
        if (value !== undefined && value !== null && value !== originalValue && value > 0 &&
            priceFieldsForLogging.includes(field)) {

          const areaName = area === 'boh' ? 'Back of House' :
                          area === 'foh' ? 'Front of House' :
                          area.charAt(0).toUpperCase() + area.slice(1);

          const getPresetBaseline = (areaKey: RefreshAreaKey): number => {
            if (areaKey === "dumpster") {
              return backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;
            }
            if (areaKey === "patio") {
              return backendConfig?.areaSpecificPricing?.patio?.standalone ?? 800;
            }
            if (areaKey === "foh") {
              return backendConfig?.areaSpecificPricing?.frontOfHouse ?? 2500;
            }
            if (areaKey === "boh") {
              const kitchenSize = current.kitchenSize === "large" ? "large" : "smallMedium";
              return kitchenSize === "large"
                ? backendConfig?.areaSpecificPricing?.kitchen?.large ?? 2500
                : backendConfig?.areaSpecificPricing?.kitchen?.smallMedium ?? 1500;
            }
            return 0;
          };

          const isPresetField = field === "presetRate";
          const shouldUseBaseline = isPresetField && !current.presetRateIsCustom && originalValue === 0;
          const baseOriginal = shouldUseBaseline ? getPresetBaseline(area) : originalValue;
          const fallbackBaseline = getAreaFieldFallback(area, field, current);
          const logOriginalValue = baseOriginal > 0 ? baseOriginal : fallbackBaseline;
          const areaFieldKey = `${areaName}_${field}`;
          const areaFrequency = current.frequencyLabel || form.frequency || 'monthly';

          addServiceFieldChange(
            areaFieldKey,
            logOriginalValue,
            value,
            areaFrequency
          );
        }
      }

      // ✅ FIXED: Clear custom amount when kitchen size OR pricing type changes to prevent wrong price showing
      const updatedArea = {
        ...current,
        [field]: value,
      };

      const hasValidNumber = (val: number | null | undefined) => val !== null && val !== undefined;
      const changedNumber = hasValidNumber(value) && value !== originalValue;

      if (field === "workerRate") {
        updatedArea.workerRateIsCustom = changedNumber;
      }
      if (field === "hourlyRate") {
        updatedArea.hourlyRateIsCustom = changedNumber;
      }
      if (field === "insideRate") {
        updatedArea.insideRateIsCustom = changedNumber;
      }
      if (field === "outsideRate") {
        updatedArea.outsideRateIsCustom = changedNumber;
      }
      if (field === "sqFtFixedFee") {
        updatedArea.sqFtFixedFeeIsCustom = changedNumber;
      }
      if (field === "presetRate") {
        updatedArea.presetRateIsCustom = hasValidNumber(value) && value !== originalValue;
      }
      if (field === "smallMediumRate") {
        updatedArea.smallMediumRateIsCustom = changedNumber;
      }
      if (field === "largeRate") {
        updatedArea.largeRateIsCustom = changedNumber;
      }

      // If kitchen size is being changed, clear preset values and custom amount
      if (field === 'kitchenSize') {
        updatedArea.customAmount = 0;
        updatedArea.presetQuantity = 1;  // Reset to default quantity
        updatedArea.presetRate = undefined;  // Reset so fallback can repopulate from backend
        console.log(`🔧 [Refresh Power Scrub] Cleared custom values for ${area} when kitchen size changed from ${originalValue} to ${value}`);
      }

      // ✅ NEW: If pricing type is being changed, clear ALL pricing-related fields
      if (field === 'pricingType') {
        updatedArea.customAmount = 0;
        // Clear preset fields
        updatedArea.presetQuantity = 1;
        updatedArea.presetRate = undefined;
        // Clear per-worker fields
        updatedArea.workers = 2;
        updatedArea.workerRate = backendConfig?.coreRates?.perWorkerRate ?? backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY;
        // Clear per-hour fields
        updatedArea.hours = 0;
        updatedArea.hourlyRate = backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE;
        // Clear square footage fields
        updatedArea.insideSqFt = 0;
        updatedArea.outsideSqFt = 0;
        updatedArea.insideRate = backendConfig?.squareFootagePricing?.insideRate ?? FALLBACK_SQFT_INSIDE_RATE;
        updatedArea.outsideRate = backendConfig?.squareFootagePricing?.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE;
        updatedArea.sqFtFixedFee = backendConfig?.squareFootagePricing?.fixedFee ?? FALLBACK_SQFT_FIXED_FEE;
        console.log(`🔧 [Refresh Power Scrub] Cleared all pricing fields for ${area} when pricing type changed from ${originalValue} to ${value}`);
      }

      return {
        ...prev,
        [area]: updatedArea,
      };
    });
  };

  /** Root config helpers */
  const setHourlyRate = (raw: string) => {
    const n = parseFloat(raw);
    const newValue = Number.isFinite(n) ? n : 0;
    const originalValue = form.hourlyRate;
    const baselineHourlyRate = backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY;
    const hasOverride = newValue !== baselineHourlyRate;

    setForm((prev) => ({
      ...prev,
      hourlyRate: newValue,
      hourlyRateIsCustom: hasOverride,
    }));

    // ƒo. Log price override if value changed
    if (newValue !== originalValue && newValue > 0) {
      addServiceFieldChange('global', 'hourlyRate', originalValue, newValue);
    }
  };

  const setMinimumVisit = (raw: string) => {
    const n = parseFloat(raw);
    const newValue = Number.isFinite(n) ? n : 0;
    const originalValue = form.minimumVisit;
    const baselineMinimum = backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;
    const hasOverride = newValue !== baselineMinimum;

    setForm((prev) => ({
      ...prev,
      minimumVisit: newValue,
      minimumVisitIsCustom: hasOverride,
    }));

    // ƒo. Log price override if value changed
    if (newValue !== originalValue && newValue > 0) {
      addServiceFieldChange('global', 'minimumVisit', originalValue, newValue);
    }
  };

  const setFrequency = (frequency: string) => {
    const originalValue = form.frequency;

    setForm((prev) => ({
      ...prev,
      frequency: frequency as any,
    }));

  };

  const setContractMonths = (months: number) => {
    hasContractMonthsOverride.current = true;
    const originalValue = form.contractMonths;

    setForm((prev) => ({
      ...prev,
      contractMonths: months,
    }));

  };

  // Calculate area totals and track if any use package pricing
  const { areaTotals, hasPackagePrice, areaMonthlyTotals, areaContractTotals } = useMemo(() => {
    const totals: any = {};
    const monthlyTotals: any = {};
    const contractTotals: any = {};
    let hasPackage = false;

    for (const area of AREA_KEYS) {
      const { cost, isPackage } = calcAreaCost(area, form, backendConfig);
      totals[area] = cost;

      // Calculate monthly total based on area's frequency label OR global frequency
      let monthlyRecurring = 0;
      const areaFrequencyLabel = form[area].frequencyLabel?.toLowerCase();

      // ✅ FIXED: Use area frequency label if set, otherwise use global frequency
      const effectiveFrequency = areaFrequencyLabel || form.frequency.toLowerCase();

      // ✅ Use backend billing multipliers with fallbacks
      const multiplier = getBillingMultiplier(effectiveFrequency, backendConfig);
      monthlyRecurring = cost * multiplier;

      monthlyTotals[area] = monthlyRecurring;

      // Calculate contract total - handle special frequencies
      if (effectiveFrequency === "quarterly") {
        const quarterlyVisits = (form[area].contractMonths || 12) / 3;
        contractTotals[area] = cost * quarterlyVisits;
      } else if (effectiveFrequency === "bi-annual" || effectiveFrequency === "biannual") {
        const biannualVisits = (form[area].contractMonths || 12) / 6;
        contractTotals[area] = cost * biannualVisits;
      } else if (effectiveFrequency === "annual") {
        const annualVisits = (form[area].contractMonths || 12) / 12;
        contractTotals[area] = cost * annualVisits;
      } else {
        contractTotals[area] = monthlyRecurring * (form[area].contractMonths || 12);
      }

      if (isPackage && cost > 0) {
        hasPackage = true;
      }
    }

    return {
      areaTotals: totals as RefreshAreaTotals,
      hasPackagePrice: hasPackage,
      areaMonthlyTotals: monthlyTotals as RefreshAreaTotals,
      areaContractTotals: contractTotals as RefreshAreaTotals,
    };
  }, [form, backendConfig]);

  const quote: ServiceQuoteResult = useMemo(() => {
    // Sum all area costs
    const areasSubtotal = AREA_KEYS.reduce(
      (sum, area) => sum + areaTotals[area],
      0
    );

    // ✅ REMOVED TRIP CHARGE LOGIC: No trip charge added since it's handled separately
    // Use areas subtotal as-is, only apply minimum visit if needed - ONLY when there's actual service
    const calculatedPerVisit = areasSubtotal > 0 ? Math.max(areasSubtotal, form.minimumVisit) : 0;

    const rounded = Math.round(calculatedPerVisit * 100) / 100;

    // Calculate monthly and contract totals based on frequency
    let monthlyRecurring = 0;
    let contractTotal = 0;

    // ✅ Use backend billing multipliers with fallbacks
    const frequencyMultiplier = getBillingMultiplier(form.frequency, backendConfig);
    monthlyRecurring = rounded * frequencyMultiplier;

    // Calculate contract total - handle special frequencies
    if (form.frequency === "quarterly") {
      const quarterlyVisits = (form.contractMonths || 12) / 3;
      contractTotal = rounded * quarterlyVisits;
    } else if (form.frequency === "biannual") {
      const biannualVisits = (form.contractMonths || 12) / 6;
      contractTotal = rounded * biannualVisits;
    } else if (form.frequency === "annual") {
      const annualVisits = (form.contractMonths || 12) / 12;
      contractTotal = rounded * annualVisits;
    } else {
      contractTotal = monthlyRecurring * (form.contractMonths || 12);
    }

    // ✅ NEW: Add calc field totals AND dollar field totals directly to contract (no frequency dependency)
    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

    console.log(`📊 [REFRESH-POWER-SCRUB-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotal.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });

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
          : state.pricingType === "perWorker"
          ? "per worker"
          : state.pricingType === "perHour"
          ? "per hour"
          : state.pricingType === "squareFeet"
          ? "sq-ft rule"
          : "custom amount";

      details.push(
        `${prettyArea}: $${amount.toFixed(2)} (${method})`
      );
    });

    // ✅ REMOVED: Trip charge is handled separately elsewhere, no longer included in details

    // Refresh is essentially a one-time deep clean,
    // so annual == per-visit in this model.
    return {
      serviceId: "refreshPowerScrub",
      displayName: "Refresh Power Scrub",
      perVisitPrice: rounded,
      annualPrice: contractTotalWithCustomFields, // ✅ UPDATED: Uses contract total with custom fields
      detailsBreakdown: details,
      monthlyRecurring,
      contractTotal: contractTotalWithCustomFields, // ✅ UPDATED: Total contract value with custom fields
    };
  }, [areaTotals, hasPackagePrice, form.minimumVisit, form.frequency, form.contractMonths, areaMonthlyTotals, areaContractTotals, backendConfig, calcFieldsTotal, dollarFieldsTotal]);

  const setNotes = (notes: string) => {
    setForm((prev) => ({
      ...prev,
      notes,
    }));
  };

  return {
    form,
    setHourlyRate,
    setMinimumVisit,
    setFrequency,
    setContractMonths,
    setNotes,
    toggleAreaEnabled,
    setAreaField,
    areaTotals,
    areaMonthlyTotals,
    areaContractTotals,
    quote,
    refreshConfig: fetchPricing,
    isLoadingConfig,
    backendConfig, // ✅ Expose backend config for auto-populated rates
  };
}

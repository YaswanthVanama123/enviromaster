// src/features/services/refreshPowerScrub/useRefreshPowerScrubCalc.ts
import { useEffect, useMemo, useState, useCallback } from "react";
import type {
  RefreshAreaCalcState,
  RefreshAreaKey,
  RefreshAreaTotals,
  RefreshPowerScrubFormState,
} from "./refreshPowerScrubTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { useVersionChangeCollection } from "../../../hooks/useVersionChangeCollection";

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
  const normalizedFrequency = frequency.toLowerCase().replace("-", "").replace(/\s+/g, "");

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
      case "monthly":
        return conversions.monthly?.monthlyMultiplier ?? defaultMultipliers.monthly;
      case "bimonthly":
        return conversions.bimonthly?.monthlyMultiplier ?? defaultMultipliers.bimonthly;
      case "quarterly":
        return conversions.quarterly?.monthlyMultiplier ?? defaultMultipliers.quarterly;
      case "twicepermonth":
        // Always use 2.0 for twicePerMonth (2 visits per month)
        return 2.0;
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
    customAmount: 0,
    kitchenSize: "smallMedium",
    patioMode: "standalone",
    includePatioAddon: false,
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

    // Columns (Dumpster on by default)
    dumpster: { ...defaultArea, enabled: true },
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
  customAmount: 0,
  kitchenSize: "smallMedium",
  patioMode: "standalone",
  includePatioAddon: false, // Default to no add-on
  frequencyLabel: "",
  contractMonths: 12, // Default contract length for individual areas
};

const DEFAULT_FORM: RefreshPowerScrubFormState = {
  // BaseServiceFormState (actual type lives elsewhere)
  frequency: "monthly" as any,
  tripChargeIncluded: true,
  notes: "",

  // Global Refresh rules
  tripCharge: FALLBACK_DEFAULT_TRIP,   // $75
  hourlyRate: FALLBACK_DEFAULT_HOURLY, // $200/hr/worker
  minimumVisit: FALLBACK_DEFAULT_MIN,  // $475 minimum

  // Global contract settings
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
  "contractMonths",
];

/** Per Worker rule:
 *  Workers × perWorkerRate (NO trip charge here - applied at visit level).
 *  Returns the labour cost only. Uses backend rate when available.
 *  Applies minimum visit amount if calculated amount is below minimum.
 */
function calcPerWorker(
  state: RefreshAreaCalcState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  // Use area's worker rate if set, otherwise use backend rate, otherwise fallback
  const perWorkerRate = state.workerRate > 0 ? state.workerRate : (backendConfig?.coreRates?.perWorkerRate ?? backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY);
  const minimumVisit = backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;

  const calculatedAmount = (state.workers || 0) * perWorkerRate;

  // Apply minimum if calculated amount is below minimum - ONLY when there are workers
  return state.workers > 0 ? Math.max(calculatedAmount, minimumVisit) : 0;
}

/** Per Hour rule:
 *  Hours × perHourRate (NO trip charge here - applied at visit level).
 *  Returns the labour cost only. Uses backend rate when available.
 *  Applies minimum visit amount if calculated amount is below minimum.
 */
function calcPerHour(
  state: RefreshAreaCalcState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  // Use area's hourly rate if set, otherwise use backend rate, otherwise fallback
  const perHourRate = state.hourlyRate > 0 ? state.hourlyRate : (backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE);
  const minimumVisit = backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;

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
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {
  const fixedFee = backendConfig?.squareFootagePricing?.fixedFee ?? state.sqFtFixedFee ?? FALLBACK_SQFT_FIXED_FEE;
  const insideRate = backendConfig?.squareFootagePricing?.insideRate ?? state.insideRate ?? FALLBACK_SQFT_INSIDE_RATE;
  const outsideRate = backendConfig?.squareFootagePricing?.outsideRate ?? state.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE;
  const minimumVisit = backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;

  const insideCost = (state.insideSqFt || 0) * insideRate;
  const outsideCost = (state.outsideSqFt || 0) * outsideRate;
  const calculatedAmount = fixedFee + insideCost + outsideCost;

  // Apply minimum if calculated amount is below minimum - ONLY when there's actual sq ft
  const hasSqFt = (state.insideSqFt || 0) > 0 || (state.outsideSqFt || 0) > 0;
  return hasSqFt ? Math.max(calculatedAmount, minimumVisit) : 0;
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

  switch (area) {
    case "dumpster":
      // Dumpster — charge the minimum visit (includes trip + minimal labour).
      return config.coreRates.minimumVisit;

    case "patio":
      // Patio — Always start with base $800 service + optional $500 add-on
      const basePatioPrice = config.areaSpecificPricing.patio.standalone; // $800

      // Add the $500 add-on if selected
      const addonPrice = state.includePatioAddon ? config.areaSpecificPricing.patio.upsell : 0; // $500 if selected

      return basePatioPrice + addonPrice; // $800 base + $500 addon = $1300 total

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
      return { cost: calcPerWorker(state, backendConfig), isPackage: false };

    case "perHour":
      // Per hour pricing - labor only (trip added at visit level)
      return { cost: calcPerHour(state, backendConfig), isPackage: false };

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

  // Version change collection
  const { addChange } = useVersionChangeCollection();

  // Helper function to add service field changes
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addChange({
      fieldName: fieldName,
      fieldDisplayName: `Refresh Power Scrub - ${fieldName}`,
      originalValue,
      newValue,
      serviceId: 'refreshPowerScrub',
    });
  }, [addChange]);

  // ✅ State to store backend config
  const [backendConfig, setBackendConfig] = useState<BackendRefreshPowerScrubConfig | null>(null);

  // ✅ Loading state for refresh button
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

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
  const fetchPricing = async () => {
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
            setForm(prev => ({
              ...prev,
              dumpster: { ...prev.dumpster, customAmount: 0 },
              patio: { ...prev.patio, customAmount: 0 },
              walkway: { ...prev.walkway, customAmount: 0 },
              foh: { ...prev.foh, customAmount: 0 },
              boh: { ...prev.boh, customAmount: 0 },
              other: { ...prev.other, customAmount: 0 },
            }));

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
      setForm(prev => ({
        ...prev,
        // Clear all custom amounts that might override backend values
        dumpster: { ...prev.dumpster, customAmount: 0 },
        patio: { ...prev.patio, customAmount: 0 },
        walkway: { ...prev.walkway, customAmount: 0 },
        foh: { ...prev.foh, customAmount: 0 },
        boh: { ...prev.boh, customAmount: 0 },
        other: { ...prev.other, customAmount: 0 },
      }));

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
          setForm(prev => ({
            ...prev,
            dumpster: { ...prev.dumpster, customAmount: 0 },
            patio: { ...prev.patio, customAmount: 0 },
            walkway: { ...prev.walkway, customAmount: 0 },
            foh: { ...prev.foh, customAmount: 0 },
            boh: { ...prev.boh, customAmount: 0 },
            other: { ...prev.other, customAmount: 0 },
          }));

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchPricing();
  }, []); // Run once on mount

  // Also fetch when services context becomes available
  useEffect(() => {
    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

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
      let originalValue: any = current[field];

      if (numericAreaFields.includes(field)) {
        const n = parseFloat(raw);
        value = Number.isFinite(n) ? n : 0;
        originalValue = typeof originalValue === 'number' ? originalValue : 0;

        // ✅ Log price override for numeric pricing fields
        if (value !== originalValue && value > 0 &&
            ['workers', 'hours', 'hourlyRate', 'workerRate', 'insideSqFt', 'outsideSqFt',
             'insideRate', 'outsideRate', 'sqFtFixedFee', 'customAmount'].includes(field as string)) {

          // Convert area key to readable name
          const areaName = area === 'boh' ? 'Back of House' :
                          area === 'foh' ? 'Front of House' :
                          area.charAt(0).toUpperCase() + area.slice(1);

          addServiceFieldChange(
            areaName,
            field as string,
            originalValue,
            value,
            current
          );
        }
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
  const setHourlyRate = (raw: string) => {
    const n = parseFloat(raw);
    const newValue = Number.isFinite(n) ? n : 0;
    const originalValue = form.hourlyRate;

    setForm((prev) => ({
      ...prev,
      hourlyRate: newValue,
    }));

    // ✅ Log price override if value changed
    if (newValue !== originalValue && newValue > 0) {
      addServiceFieldChange('global', 'hourlyRate', originalValue, newValue);
    }
  };

  const setMinimumVisit = (raw: string) => {
    const n = parseFloat(raw);
    const newValue = Number.isFinite(n) ? n : 0;
    const originalValue = form.minimumVisit;

    setForm((prev) => ({
      ...prev,
      minimumVisit: newValue,
    }));

    // ✅ Log price override if value changed
    if (newValue !== originalValue && newValue > 0) {
      addServiceFieldChange('global', 'minimumVisit', originalValue, newValue);
    }
  };

  const setFrequency = (frequency: string) => {
    setForm((prev) => ({
      ...prev,
      frequency: frequency as any,
    }));
  };

  const setContractMonths = (months: number) => {
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

      // Calculate monthly total based on area's frequency label
      let monthlyRecurring = 0;
      const frequencyLabel = form[area].frequencyLabel?.toLowerCase();

      // ✅ Use backend billing multipliers with fallbacks
      if (frequencyLabel) {
        const multiplier = getBillingMultiplier(frequencyLabel, backendConfig);
        monthlyRecurring = cost * multiplier;
      } else {
        monthlyRecurring = cost; // Default to monthly
      }

      monthlyTotals[area] = monthlyRecurring;

      // Calculate contract total - handle special frequencies
      // Note: frequencyLabel already declared above, reusing it here
      if (frequencyLabel === "quarterly") {
        const quarterlyVisits = (form[area].contractMonths || 12) / 3;
        contractTotals[area] = cost * quarterlyVisits;
      } else if (frequencyLabel === "bi-annual") {
        const biannualVisits = (form[area].contractMonths || 12) / 6;
        contractTotals[area] = cost * biannualVisits;
      } else if (frequencyLabel === "annual") {
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
      annualPrice: contractTotal,
      detailsBreakdown: details,
      monthlyRecurring,
      contractTotal,
    };
  }, [areaTotals, hasPackagePrice, form.minimumVisit, form.frequency, form.contractMonths, areaMonthlyTotals, areaContractTotals, backendConfig]);

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

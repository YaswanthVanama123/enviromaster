// src/features/services/refreshPowerScrub/useRefreshPowerScrubCalc.ts
import { useEffect, useMemo, useState } from "react";
import type {
  RefreshAreaCalcState,
  RefreshAreaKey,
  RefreshAreaTotals,
  RefreshPowerScrubFormState,
} from "./refreshPowerScrubTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";

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

// ✅ Backend config interface matching MongoDB JSON structure
interface BackendRefreshPowerScrubConfig {
  coreRates: {
    defaultHourlyRate: number;
    perWorkerRate?: number;    // Backend rate per worker
    perHourRate?: number;      // Backend rate per hour
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
  billingConversions: {
    oneTime: { monthlyMultiplier: number; annualMultiplier: number; };
    weekly: { monthlyMultiplier: number; annualMultiplier: number; };
    biweekly: { monthlyMultiplier: number; annualMultiplier: number; };
    twicePerMonth: { monthlyMultiplier: number; annualMultiplier: number; };
    monthly: { monthlyMultiplier: number; annualMultiplier: number; };
    bimonthly: { monthlyMultiplier: number; annualMultiplier: number; };
    quarterly: { monthlyMultiplier: number; annualMultiplier: number; };
    biannual: { monthlyMultiplier: number; annualMultiplier: number; };
    annual: { monthlyMultiplier: number; annualMultiplier: number; };
  };
  frequencyOptions?: string[];
  areaTypes?: string[];
  pricingTypes?: string[];
}

const AREA_KEYS: RefreshAreaKey[] = [
  "dumpster",
  "patio",
  "walkway",
  "foh",
  "boh",
  "other",
];

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
    "twicepermonth": 2.0,
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
      case "onetime":
        return conversions.oneTime?.monthlyMultiplier ?? defaultMultipliers.onetime;
      case "weekly":
        return conversions.weekly?.monthlyMultiplier ?? defaultMultipliers.weekly;
      case "biweekly":
        return conversions.biweekly?.monthlyMultiplier ?? defaultMultipliers.biweekly;
      case "twicepermonth":
        return conversions.twicePerMonth?.monthlyMultiplier ?? defaultMultipliers.twicepermonth;
      case "monthly":
        return conversions.monthly?.monthlyMultiplier ?? defaultMultipliers.monthly;
      case "bimonthly":
        return conversions.bimonthly?.monthlyMultiplier ?? defaultMultipliers.bimonthly;
      case "quarterly":
        return conversions.quarterly?.monthlyMultiplier ?? defaultMultipliers.quarterly;
      case "biannual":
        return conversions.biannual?.monthlyMultiplier ?? defaultMultipliers.biannual;
      case "annual":
        return conversions.annual?.monthlyMultiplier ?? defaultMultipliers.annual;
    }
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
    hourlyRate: backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY,
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
  hourlyRate: FALLBACK_DEFAULT_HOURLY, // $200/hr default
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
  const perWorkerRate = backendConfig?.coreRates?.perWorkerRate ?? backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY;
  const minimumVisit = backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;

  const calculatedAmount = (state.workers || 0) * perWorkerRate;

  // Apply minimum if calculated amount is below minimum
  return Math.max(calculatedAmount, minimumVisit);
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
  const perHourRate = backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE;
  const minimumVisit = backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;

  const calculatedAmount = (state.hours || 0) * perHourRate;

  // Apply minimum if calculated amount is below minimum
  return Math.max(calculatedAmount, minimumVisit);
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

  // Apply minimum if calculated amount is below minimum
  return Math.max(calculatedAmount, minimumVisit);
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

  // Use the selected pricing type
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

  // ✅ State to store backend config
  const [backendConfig, setBackendConfig] = useState<BackendRefreshPowerScrubConfig | null>(null);

  // ✅ Loading state for refresh button
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // Helper function to update form with config data
  const updateFormWithConfig = (config: BackendRefreshPowerScrubConfig) => {
    setForm((prev) => {
      const updatedDefaultArea = createDefaultArea(config);
      const backendForm = createDefaultForm(config);

      // Merge with existing form state, preserving user inputs but updating defaults
      return {
        ...backendForm,
        ...prev, // Keep any user-modified values

        // Update rates from backend
        tripCharge: config.coreRates?.tripCharge ?? prev.tripCharge,
        hourlyRate: config.coreRates?.defaultHourlyRate ?? prev.hourlyRate,
        minimumVisit: config.coreRates?.minimumVisit ?? prev.minimumVisit,

        // Update area defaults while preserving enabled states and user inputs
        dumpster: {
          ...updatedDefaultArea,
          ...prev.dumpster,
          hourlyRate: config.coreRates?.defaultHourlyRate ?? prev.dumpster.hourlyRate,
          insideRate: config.squareFootagePricing?.insideRate ?? prev.dumpster.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? prev.dumpster.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? prev.dumpster.sqFtFixedFee,
        },
        patio: {
          ...updatedDefaultArea,
          ...prev.patio,
          hourlyRate: config.coreRates?.defaultHourlyRate ?? prev.patio.hourlyRate,
          insideRate: config.squareFootagePricing?.insideRate ?? prev.patio.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? prev.patio.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? prev.patio.sqFtFixedFee,
        },
        walkway: {
          ...updatedDefaultArea,
          ...prev.walkway,
          hourlyRate: config.coreRates?.defaultHourlyRate ?? prev.walkway.hourlyRate,
          insideRate: config.squareFootagePricing?.insideRate ?? prev.walkway.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? prev.walkway.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? prev.walkway.sqFtFixedFee,
        },
        foh: {
          ...updatedDefaultArea,
          ...prev.foh,
          hourlyRate: config.coreRates?.defaultHourlyRate ?? prev.foh.hourlyRate,
          insideRate: config.squareFootagePricing?.insideRate ?? prev.foh.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? prev.foh.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? prev.foh.sqFtFixedFee,
        },
        boh: {
          ...updatedDefaultArea,
          ...prev.boh,
          hourlyRate: config.coreRates?.defaultHourlyRate ?? prev.boh.hourlyRate,
          insideRate: config.squareFootagePricing?.insideRate ?? prev.boh.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? prev.boh.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? prev.boh.sqFtFixedFee,
        },
        other: {
          ...updatedDefaultArea,
          ...prev.other,
          hourlyRate: config.coreRates?.defaultHourlyRate ?? prev.other.hourlyRate,
          insideRate: config.squareFootagePricing?.insideRate ?? prev.other.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? prev.other.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? prev.other.sqFtFixedFee,
        },
      };
    });
  };

  // ✅ Fetch configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
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

      // ✅ Store the backend config
      setBackendConfig(config);
      updateFormWithConfig(config);

      console.log('📊 [Refresh Power Scrub] Active Backend Config Received:', {
        coreRates: config.coreRates,
        areaSpecificPricing: config.areaSpecificPricing,
        squareFootagePricing: config.squareFootagePricing,
        billingConversions: config.billingConversions,
      });

      console.log('✅ Refresh Power Scrub config loaded from backend:', config);
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
    // Use areas subtotal as-is, only apply minimum visit if needed
    const calculatedPerVisit = Math.max(areasSubtotal, form.minimumVisit);

    // ✅ Apply custom override if set
    const perVisit = form.customPerVisitTotal ?? calculatedPerVisit;

    const rounded = Math.round(perVisit * 100) / 100;

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
  }, [areaTotals, hasPackagePrice, form.minimumVisit, form.frequency, form.contractMonths, form.customPerVisitTotal, areaMonthlyTotals, areaContractTotals, backendConfig]);

  const setNotes = (notes: string) => {
    setForm((prev) => ({
      ...prev,
      notes,
    }));
  };

  const setCustomPerVisitTotal = (value: number | undefined) => {
    setForm((prev) => ({
      ...prev,
      customPerVisitTotal: value,
    }));
  };

  return {
    form,
    setHourlyRate,
    setMinimumVisit,
    setFrequency,
    setContractMonths,
    setNotes,
    setCustomPerVisitTotal,
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


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
import { addPriceChange, getFieldDisplayName, updateRefreshPowerScrubFrequency } from "../../../utils/fileLogger";


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

const AREA_LOG_NAMES: Record<RefreshAreaKey, string> = {
  dumpster: "Dumpster",
  patio: "Patio",
  walkway: "Walkway",
  foh: "Front of House",
  boh: "Back of House",
  other: "Other",
};


interface BackendRefreshPowerScrubConfig {
  coreRates: {
    defaultHourlyRate: number;      
    perWorkerRate: number;          
    perHourRate: number;            
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
    weekly: {
      monthlyMultiplier: number;    
      annualMultiplier: number;     
      description: string;
    };
    biweekly: {
      monthlyMultiplier: number;    
      annualMultiplier: number;     
      description: string;
    };
    monthly: {
      monthlyMultiplier: number;    
      annualMultiplier: number;     
      description: string;
    };
    bimonthly: {
      monthlyMultiplier: number;    
      annualMultiplier: number;     
      description: string;
    };
    quarterly: {
      monthlyMultiplier: number;    
      annualMultiplier: number;     
      description: string;
    };
  };
  frequencyOptions: string[];       
  areaTypes: string[];              
  pricingTypes: string[];           
  frequencyMetadata: {
    weekly: {
      monthlyRecurringMultiplier: number;     
      firstMonthExtraMultiplier: number;      
    };
    biweekly: {
      monthlyRecurringMultiplier: number;     
      firstMonthExtraMultiplier: number;      
    };
    monthly: { cycleMonths: number };         
    bimonthly: { cycleMonths: number };       
    quarterly: { cycleMonths: number };       
    biannual: { cycleMonths: number };        
    annual: { cycleMonths: number };          
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


function transformBackendFrequencyMeta(backendMeta: BackendRefreshPowerScrubConfig['frequencyMetadata'] | undefined) {
  if (!backendMeta) {
    console.warn('⚠️ No backend frequencyMetadata available, using static fallback values');
    return null;
  }

  console.log('🔧 [Refresh Power Scrub] Transforming backend frequencyMetadata:', backendMeta);


  const transformedBilling: any = {};


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


  const cycleBased = ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'] as const;

  for (const freq of cycleBased) {
    const backendFreqData = backendMeta[freq];
    if (backendFreqData?.cycleMonths) {
      const cycleMonths = backendFreqData.cycleMonths;
      const monthlyMultiplier = 1 / cycleMonths; 
      const annualMultiplier = 12 / cycleMonths; 

      transformedBilling[freq] = {
        monthlyMultiplier,
        annualMultiplier,
      };
    }
  }

  console.log('✅ [Refresh Power Scrub] Transformed frequencyMetadata to billingConversions:', transformedBilling);
  return transformedBilling;
}


function getBillingMultiplier(
  frequency: string,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {

  let normalizedFrequency = frequency.toLowerCase().replace("-", "").replace(/\s+/g, "");


  if (normalizedFrequency.includes("2×") || normalizedFrequency.includes("2x") || normalizedFrequency === "2/month") {
    normalizedFrequency = "twicepermonth";
  }


  const defaultMultipliers: Record<string, number> = {
    "onetime": 0,
    "weekly": 4.33,
    "biweekly": 2.165,
    "twicepermonth": 2.0,
    "monthly": 1.0,
    "everyfourweeks": 1.0833,
    "bimonthly": 0.5,
    "quarterly": 0.333,
    "biannual": 0.167,
    "annual": 0.083,
  };


  if (backendConfig?.billingConversions) {
    const conversions = backendConfig.billingConversions;
    switch (normalizedFrequency) {
      case "weekly":
        return conversions.weekly?.monthlyMultiplier ?? defaultMultipliers.weekly;
      case "biweekly":
        return conversions.biweekly?.monthlyMultiplier ?? defaultMultipliers.biweekly;
      case "twicepermonth":
        return defaultMultipliers.twicepermonth; 
      case "monthly":
        return conversions.monthly?.monthlyMultiplier ?? defaultMultipliers.monthly;
      case "everyfourweeks":
        return defaultMultipliers.everyfourweeks;
      case "bimonthly":
        return conversions.bimonthly?.monthlyMultiplier ?? defaultMultipliers.bimonthly;
      case "quarterly":
        return conversions.quarterly?.monthlyMultiplier ?? defaultMultipliers.quarterly;
    }
  }


  const transformedMeta = transformBackendFrequencyMeta(backendConfig?.frequencyMetadata);
  if (transformedMeta && transformedMeta[normalizedFrequency]) {
    return transformedMeta[normalizedFrequency].monthlyMultiplier;
  }


  return defaultMultipliers[normalizedFrequency] ?? 1.0;
}


function createDefaultArea(backendConfig?: BackendRefreshPowerScrubConfig | null): RefreshAreaCalcState {
  return {
    enabled: false,
    pricingType: "preset",
    workers: 2,
    hours: 0,
    hourlyRate: backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE, 
    workerRate: backendConfig?.coreRates?.perWorkerRate ?? backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY, 
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
    presetQuantity: 1, 
    presetRate: undefined, 
    kitchenSize: "smallMedium",
    smallMediumQuantity: 0, 
    smallMediumRate: undefined, 
    smallMediumCustomAmount: 0, 
    largeQuantity: 0, 
    largeRate: undefined, 
    largeCustomAmount: 0, 
    patioMode: "standalone",
    includePatioAddon: false,
    patioAddonRate: undefined, 
    frequencyLabel: "",
    contractMonths: 12,
  };
}


function createDefaultForm(backendConfig?: BackendRefreshPowerScrubConfig | null): RefreshPowerScrubFormState {
  const defaultArea = createDefaultArea(backendConfig);

  return {

    frequency: "monthly" as any,
    tripChargeIncluded: true,
    notes: "",


    tripCharge: backendConfig?.coreRates?.tripCharge ?? FALLBACK_DEFAULT_TRIP,
    hourlyRate: backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY,
    minimumVisit: backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN,


    contractMonths: 12,


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
  hourlyRate: FALLBACK_PER_HOUR_RATE, 
  workerRate: FALLBACK_DEFAULT_HOURLY, 
  insideSqFt: 0,
  outsideSqFt: 0,
  insideRate: FALLBACK_SQFT_INSIDE_RATE, 
  outsideRate: FALLBACK_SQFT_OUTSIDE_RATE, 
  sqFtFixedFee: FALLBACK_SQFT_FIXED_FEE, 
  workerRateIsCustom: false,
  hourlyRateIsCustom: false,
  insideRateIsCustom: false,
  outsideRateIsCustom: false,
  sqFtFixedFeeIsCustom: false,
  presetRateIsCustom: false,
  smallMediumRateIsCustom: false,
  largeRateIsCustom: false,
  customAmount: 0,
  presetQuantity: 1, 
  presetRate: undefined, 
  kitchenSize: "smallMedium",
  smallMediumQuantity: 0, 
  smallMediumRate: undefined, 
  smallMediumCustomAmount: 0, 
  largeQuantity: 0, 
  largeRate: undefined, 
  largeCustomAmount: 0, 
  patioMode: "standalone",
  includePatioAddon: false, 
  patioAddonRate: undefined, 
  frequencyLabel: "",
  contractMonths: 12, 
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

  frequency: "monthly" as any,
  tripChargeIncluded: true,
  notes: "",


  tripCharge: FALLBACK_DEFAULT_TRIP,   
  hourlyRate: FALLBACK_DEFAULT_HOURLY, 
  minimumVisit: FALLBACK_DEFAULT_MIN,  
  hourlyRateIsCustom: false,
  minimumVisitIsCustom: false,
  applyMinimum: true,


  contractMonths: 12,


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
  "smallMediumQuantity", 
  "smallMediumRate",
  "smallMediumCustomAmount",
  "largeQuantity", 
  "largeRate",
  "largeCustomAmount",
  "patioAddonRate", 
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


function calcPerWorker(
  state: RefreshAreaCalcState,
  formGlobalRate: number,  
  formMinimumVisit: number, 
  backendConfig?: BackendRefreshPowerScrubConfig | null,
  applyMinimum: boolean = true
): number {

  const perWorkerRate = state.workerRate > 0
    ? state.workerRate
    : (formGlobalRate > 0
        ? formGlobalRate
        : (backendConfig?.coreRates?.perWorkerRate ?? backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY));


  const minimumVisit = formMinimumVisit > 0
    ? formMinimumVisit
    : (backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN);

  const calculatedAmount = (state.workers || 0) * perWorkerRate;


  return state.workers > 0 ? (applyMinimum ? Math.max(calculatedAmount, minimumVisit) : calculatedAmount) : 0;
}


function calcPerHour(
  state: RefreshAreaCalcState,
  formGlobalRate: number,  
  formMinimumVisit: number, 
  backendConfig?: BackendRefreshPowerScrubConfig | null,
  applyMinimum: boolean = true
): number {

  const perHourRate = state.hourlyRate > 0
    ? state.hourlyRate
    : (formGlobalRate > 0
        ? formGlobalRate
        : (backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE));


  const minimumVisit = formMinimumVisit > 0
    ? formMinimumVisit
    : (backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN);

  const calculatedAmount = (state.hours || 0) * perHourRate;


  return state.hours > 0 ? (applyMinimum ? Math.max(calculatedAmount, minimumVisit) : calculatedAmount) : 0;
}


function calcSquareFootage(
  state: RefreshAreaCalcState,
  formMinimumVisit: number, 
  backendConfig?: BackendRefreshPowerScrubConfig | null,
  applyMinimum: boolean = true
): number {


  const fixedFee = state.sqFtFixedFee !== undefined && state.sqFtFixedFee !== null
    ? state.sqFtFixedFee
    : (backendConfig?.squareFootagePricing?.fixedFee ?? FALLBACK_SQFT_FIXED_FEE);

  const insideRate = state.insideRate > 0
    ? state.insideRate
    : (backendConfig?.squareFootagePricing?.insideRate ?? FALLBACK_SQFT_INSIDE_RATE);

  const outsideRate = state.outsideRate > 0
    ? state.outsideRate
    : (backendConfig?.squareFootagePricing?.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE);


  const minimumVisit = formMinimumVisit > 0
    ? formMinimumVisit
    : (backendConfig?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN);

  const insideCost = (state.insideSqFt || 0) * insideRate;
  const outsideCost = (state.outsideSqFt || 0) * outsideRate;
  const calculatedAmount = fixedFee + insideCost + outsideCost;


  const hasAnyValue = (state.insideSqFt || 0) > 0 || (state.outsideSqFt || 0) > 0 || fixedFee > 0;
  return hasAnyValue ? (applyMinimum ? Math.max(calculatedAmount, minimumVisit) : calculatedAmount) : 0;
}


function calcPresetPackage(
  area: RefreshAreaKey,
  state: RefreshAreaCalcState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): number {


  const defaultConfig = {
    coreRates: {
      defaultHourlyRate: FALLBACK_DEFAULT_HOURLY,
      perWorkerRate: FALLBACK_DEFAULT_HOURLY, 
      perHourRate: FALLBACK_PER_HOUR_RATE, 
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


  let defaultRate: number;

  switch (area) {
    case "dumpster":
      defaultRate = config.coreRates.minimumVisit;
      break;
    case "patio":

      defaultRate = config.areaSpecificPricing.patio.standalone;
      break;
    case "foh":
      defaultRate = config.areaSpecificPricing.frontOfHouse;
      break;
    case "boh":

      const smallMediumQty = state.smallMediumQuantity || 0;

      const smallMediumRate = state.smallMediumRate === null ? 0 : (state.smallMediumRate ?? config.areaSpecificPricing.kitchen.smallMedium);
      const smallMediumTotal = state.smallMediumCustomAmount > 0
        ? state.smallMediumCustomAmount
        : (smallMediumQty * smallMediumRate);

      const largeQty = state.largeQuantity || 0;

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


  const quantity = (state.presetQuantity && state.presetQuantity > 0) ? state.presetQuantity : 1;

  const rate = state.presetRate === null ? 0 : (state.presetRate ?? defaultRate);


  let baseAmount = quantity * rate;


  if (area === "patio" && state.includePatioAddon) {

    const addonRate = state.patioAddonRate === null ? 0 : (state.patioAddonRate ?? config.areaSpecificPricing.patio.upsell);
    baseAmount += addonRate;
  }

  return baseAmount;
}


function calcAreaCost(
  area: RefreshAreaKey,
  form: RefreshPowerScrubFormState,
  backendConfig?: BackendRefreshPowerScrubConfig | null
): { cost: number; isPackage: boolean } {
  const state = form[area];
  if (!state.enabled) return { cost: 0, isPackage: false };


  if (state.customAmount && state.customAmount > 0) {
    return { cost: state.customAmount, isPackage: true }; 
  }


  switch (state.pricingType) {
    case "preset":

      return { cost: calcPresetPackage(area, state, backendConfig), isPackage: true };

    case "perWorker":


      return { cost: calcPerWorker(state, form.hourlyRate, form.minimumVisit, backendConfig, form.applyMinimum !== false), isPackage: false };

    case "perHour":


      return { cost: calcPerHour(state, form.hourlyRate, form.minimumVisit, backendConfig, form.applyMinimum !== false), isPackage: false };

    case "squareFeet":


      return { cost: calcSquareFootage(state, form.minimumVisit, backendConfig, form.applyMinimum !== false), isPackage: false };

    case "custom":

      return { cost: state.customAmount || 0, isPackage: true };

    default:
      return { cost: 0, isPackage: false };
  }
}

export function useRefreshPowerScrubCalc(
  initial?: Partial<RefreshPowerScrubFormState>,
  customFields?: any[]
) {

  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);
  const initialAppliedRef = useRef(false);


  const servicesContext = useServicesContextOptional();


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

    const base: RefreshPowerScrubFormState = {
      ...DEFAULT_FORM,
      ...initial,
    };


    AREA_KEYS.forEach((area) => {
      const incoming = (initial as any)?.[area] || {};
      (base as any)[area] = {
        ...DEFAULT_AREA,
        ...(DEFAULT_FORM as any)[area],
        ...incoming,
      } as RefreshAreaCalcState;
    });


    if (initial?.tripCharge != null) {
      base.tripCharge = initial.tripCharge;
    }
    if (initial?.hourlyRate != null) {
      base.hourlyRate = initial.hourlyRate;
    }
    if (initial?.minimumVisit != null) {
      base.minimumVisit = initial.minimumVisit;
    }


    const defaultContractMonths = initial?.contractMonths
      ? initial.contractMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : 12;

    base.contractMonths = defaultContractMonths;

    return base;
  });


  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number,
    frequencyOverride?: string
  ) => {
    const appliedFrequency = frequencyOverride || form.frequency || 'monthly';

    addPriceChange({
      productKey: `refreshPowerScrub_${fieldName}`,
      productName: `Refresh Power Scrub - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: 1, 
      frequency: appliedFrequency
    });

    console.log(`📝 [REFRESH-POWER-SCRUB-FILE-LOGGER] Added change for ${fieldName} with frequency "${appliedFrequency}":`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.frequency]);


  const [backendConfig, setBackendConfig] = useState<BackendRefreshPowerScrubConfig | null>(null);


  const [isLoadingConfig, setIsLoadingConfig] = useState(false);


  const updateFormWithConfig = (config: BackendRefreshPowerScrubConfig) => {
    console.log('🔧 [Refresh Power Scrub] Updating form with backend config:', config);

    setForm((prev) => {
      const updatedDefaultArea = createDefaultArea(config);
      const backendForm = createDefaultForm(config);


      const updatedForm = {
        ...prev, 


        tripCharge: config.coreRates?.tripCharge ?? prev.tripCharge,
        hourlyRate: config.coreRates?.defaultHourlyRate ?? prev.hourlyRate,
        minimumVisit: config.coreRates?.minimumVisit ?? prev.minimumVisit,


        dumpster: {
          ...prev.dumpster, 

          hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
          workerRate: config.coreRates?.perWorkerRate ?? config.coreRates?.defaultHourlyRate ?? updatedDefaultArea.workerRate,
          insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
        },
        patio: {
          ...prev.patio, 
          hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
          workerRate: config.coreRates?.perWorkerRate ?? config.coreRates?.defaultHourlyRate ?? updatedDefaultArea.workerRate,
          insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
        },
        walkway: {
          ...prev.walkway, 
          hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
          workerRate: config.coreRates?.perWorkerRate ?? config.coreRates?.defaultHourlyRate ?? updatedDefaultArea.workerRate,
          insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
        },
        foh: {
          ...prev.foh, 
          hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
          workerRate: config.coreRates?.perWorkerRate ?? config.coreRates?.defaultHourlyRate ?? updatedDefaultArea.workerRate,
          insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
        },
        boh: {
          ...prev.boh, 
          hourlyRate: config.coreRates?.perHourRate ?? updatedDefaultArea.hourlyRate,
          workerRate: config.coreRates?.perWorkerRate ?? config.coreRates?.defaultHourlyRate ?? updatedDefaultArea.workerRate,
          insideRate: config.squareFootagePricing?.insideRate ?? updatedDefaultArea.insideRate,
          outsideRate: config.squareFootagePricing?.outsideRate ?? updatedDefaultArea.outsideRate,
          sqFtFixedFee: config.squareFootagePricing?.fixedFee ?? updatedDefaultArea.sqFtFixedFee,
        },
        other: {
          ...prev.other, 
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


  const fetchPricing = useCallback(async (forceRefresh: boolean = false) => {
    if (initial && !forceRefresh) {
      console.log('📋 [REFRESH-POWER-SCRUB-PRICING] Edit mode detected, skipping fetchPricing');
      return;
    }
    setIsLoadingConfig(true);
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("refreshPowerScrub");
        if (backendData?.config) {
          console.log('✅ [RefreshPowerScrub] Using cached pricing data from context');
          const config = backendData.config as BackendRefreshPowerScrubConfig;
          setBackendConfig(config);
          updateFormWithConfig(config);


          if (forceRefresh) {
            console.log('🔄 [REFRESH-POWER-SCRUB] Manual refresh: Clearing all custom overrides');
            setForm(clearAllCustomOverrides);
          }

          console.log('✅ RefreshPowerScrub CONFIG loaded from context:', {
            coreRates: config.coreRates,
            areaSpecificPricing: config.areaSpecificPricing,
            squareFootagePricing: config.squareFootagePricing,
            billingConversions: config.billingConversions,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for RefreshPowerScrub, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch RefreshPowerScrub config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("refreshPowerScrub");
        if (fallbackConfig?.config) {
          console.log('✅ [RefreshPowerScrub] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendRefreshPowerScrubConfig;
          setBackendConfig(config);
          updateFormWithConfig(config);


          if (forceRefresh) {
            console.log('🔄 [REFRESH-POWER-SCRUB] Manual refresh: Clearing all custom overrides');
            setForm(clearAllCustomOverrides);
          }

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  }, [servicesContext?.getBackendPricingForService, initial]);


  useEffect(() => {
    if (initial) {
      console.log('📋 [REFRESH-POWER-SCRUB-PRICING] Skipping price fetch - using saved historical prices from initial data');
      return;
    }

    console.log('📋 [REFRESH-POWER-SCRUB-PRICING] Fetching current prices - new service or no initial data');
    fetchPricing();
  }, [initial, fetchPricing]); 


  useEffect(() => {
    if (initial) return;

    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [initial, servicesContext?.backendPricingData, backendConfig, fetchPricing]);


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


  const toggleAreaEnabled = (area: RefreshAreaKey, enabled: boolean) => {
    setForm((prev) => {
      const originalValue = prev[area].enabled;


      return {
        ...prev,
        [area]: {
          ...(prev as any)[area],
          enabled,
        } as RefreshAreaCalcState,
      };
    });
  };

const getPresetBaselineForArea = (
  areaKey: RefreshAreaKey,
  state: RefreshAreaCalcState,
  config?: BackendRefreshPowerScrubConfig | null
): number => {
  if (areaKey === "dumpster") {
    return config?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;
  }
  if (areaKey === "patio") {
    return config?.areaSpecificPricing?.patio?.standalone ?? FALLBACK_PATIO_STANDALONE;
  }
  if (areaKey === "foh") {
    return config?.areaSpecificPricing?.frontOfHouse ?? FALLBACK_FOH_RATE;
  }
  if (areaKey === "boh") {
    const kitchenSize = state.kitchenSize === "large" ? "large" : "smallMedium";
    return kitchenSize === "large"
      ? config?.areaSpecificPricing?.kitchen?.large ?? FALLBACK_KITCHEN_LARGE
      : config?.areaSpecificPricing?.kitchen?.smallMedium ?? FALLBACK_KITCHEN_SMALL_MED;
  }
  return 0;
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
      return 0;
    case "presetRate":
      return getPresetBaselineForArea(areaKey, state, backendConfig);
    default:
      return 0;
  }
};


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

        if (raw === '' || raw === null) {
          value = null; 
        } else if (raw === undefined) {
          value = undefined; 
        } else {
          const n = parseFloat(raw);
          value = Number.isFinite(n) ? n : null;
        }
        originalValue = typeof originalValue === 'number' ? originalValue : 0;


        if (value !== undefined && value !== null && value !== originalValue && value > 0 &&
            priceFieldsForLogging.includes(field)) {

          const areaName = area === 'boh' ? 'Back of House' :
                          area === 'foh' ? 'Front of House' :
                          area.charAt(0).toUpperCase() + area.slice(1);

          const isPresetField = field === "presetRate";
          const logOriginalValue = isPresetField
            ? getPresetBaselineForArea(area, current, backendConfig)
            : getAreaFieldFallback(area, field, current);
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


      if (field === 'kitchenSize') {
        updatedArea.customAmount = 0;
        updatedArea.presetQuantity = 1;  
        updatedArea.presetRate = undefined;  
        console.log(`🔧 [Refresh Power Scrub] Cleared custom values for ${area} when kitchen size changed from ${originalValue} to ${value}`);
      }


      if (field === 'pricingType') {
        updatedArea.customAmount = 0;

        updatedArea.presetQuantity = 1;
        updatedArea.presetRate = undefined;

        updatedArea.workers = 2;
        updatedArea.workerRate = backendConfig?.coreRates?.perWorkerRate ?? backendConfig?.coreRates?.defaultHourlyRate ?? FALLBACK_DEFAULT_HOURLY;

        updatedArea.hours = 0;
        updatedArea.hourlyRate = backendConfig?.coreRates?.perHourRate ?? FALLBACK_PER_HOUR_RATE;

        updatedArea.insideSqFt = 0;
        updatedArea.outsideSqFt = 0;
        updatedArea.insideRate = backendConfig?.squareFootagePricing?.insideRate ?? FALLBACK_SQFT_INSIDE_RATE;
        updatedArea.outsideRate = backendConfig?.squareFootagePricing?.outsideRate ?? FALLBACK_SQFT_OUTSIDE_RATE;
        updatedArea.sqFtFixedFee = backendConfig?.squareFootagePricing?.fixedFee ?? FALLBACK_SQFT_FIXED_FEE;
        console.log(`🔧 [Refresh Power Scrub] Cleared all pricing fields for ${area} when pricing type changed from ${originalValue} to ${value}`);
      }

      if (field === "frequencyLabel") {
        const areaLogLabel = AREA_LOG_NAMES[area];
        const normalizedFrequency = value || form.frequency || "monthly";
        updateRefreshPowerScrubFrequency(areaLogLabel, normalizedFrequency);
        console.log(`📝 [REFRESH-POWER-SCRUB-FILE-LOGGER] Frequency label for ${areaLogLabel} set to "${normalizedFrequency}"`);
      }

      return {
        ...prev,
        [area]: updatedArea,
      };
    });
  };


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


  const { areaTotals, hasPackagePrice, areaMonthlyTotals, areaContractTotals } = useMemo(() => {
    const totals: any = {};
    const monthlyTotals: any = {};
    const contractTotals: any = {};
    let hasPackage = false;

    for (const area of AREA_KEYS) {
      const { cost, isPackage } = calcAreaCost(area, form, backendConfig);
      totals[area] = cost;


      let monthlyRecurring = 0;
      const areaFrequencyLabel = form[area].frequencyLabel?.toLowerCase();


      const effectiveFrequency = areaFrequencyLabel || form.frequency.toLowerCase();


      const multiplier = getBillingMultiplier(effectiveFrequency, backendConfig);
      monthlyRecurring = cost * multiplier;

      monthlyTotals[area] = monthlyRecurring;


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

    const areasSubtotal = AREA_KEYS.reduce(
      (sum, area) => sum + areaTotals[area],
      0
    );


    const calculatedPerVisit = areasSubtotal > 0 ? (form.applyMinimum !== false ? Math.max(areasSubtotal, form.minimumVisit) : areasSubtotal) : 0;

    const rounded = Math.round(calculatedPerVisit * 100) / 100;


    let monthlyRecurring = 0;
    let contractTotal = 0;


    const frequencyMultiplier = getBillingMultiplier(form.frequency, backendConfig);
    monthlyRecurring = rounded * frequencyMultiplier;


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


    return {
      serviceId: "refreshPowerScrub",
      displayName: "Refresh Power Scrub",
      perVisitPrice: rounded,
      annualPrice: contractTotalWithCustomFields, 
      detailsBreakdown: details,
      monthlyRecurring,
      contractTotal: contractTotalWithCustomFields, 
    };
  }, [areaTotals, hasPackagePrice, form.minimumVisit, form.applyMinimum, form.frequency, form.contractMonths, areaMonthlyTotals, areaContractTotals, backendConfig, calcFieldsTotal, dollarFieldsTotal]);

  const setNotes = (notes: string) => {
    setForm((prev) => ({
      ...prev,
      notes,
    }));
  };

  const setApplyMinimum = (value: boolean) => {
    setForm((prev) => ({
      ...prev,
      applyMinimum: value,
    }));
  };

  return {
    form,
    setHourlyRate,
    setMinimumVisit,
    setFrequency,
    setContractMonths,
    setNotes,
    setApplyMinimum,
    toggleAreaEnabled,
    setAreaField,
    areaTotals,
    areaMonthlyTotals,
    areaContractTotals,
    quote,
    refreshConfig: fetchPricing,
    isLoadingConfig,
    backendConfig, 
  };
}

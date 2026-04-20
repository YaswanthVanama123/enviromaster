
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  RpmWindowsFormState,
  RpmFrequencyKey,
  RpmRateCategory,
} from "./rpmWindowsTypes";
import { rpmWindowPricingConfig as cfg } from "./rpmWindowsConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";

export const RPM_OVERRIDE_TOLERANCE = 0.005;


interface BackendRpmConfig {
  windowPricingBothSidesIncluded: {
    smallWindowPrice: number;      
    mediumWindowPrice: number;     
    largeWindowPrice: number;      
  };
  installPricing: {
    installationMultiplier: number; 
    cleanInstallationMultiplier: number; 
  };
  minimumChargePerVisit: number;   
  tripCharges: {
    standard: number;              
    beltway: number;               
  };
  frequencyPriceMultipliers: {
    biweeklyPriceMultiplier: number;              
    monthlyPriceMultiplier: number;               
    quarterlyPriceMultiplierAfterFirstTime: number; 
    quarterlyFirstTimeMultiplier: number;         
  };
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
  minContractMonths: number;         
  maxContractMonths: number;         
}

const DEFAULT_FORM: RpmWindowsFormState = {
  smallQty: 0,
  mediumQty: 0,
  largeQty: 0,
  smallWindowRate: cfg.smallWindowRate,
  mediumWindowRate: cfg.mediumWindowRate,
  largeWindowRate: cfg.largeWindowRate,
  tripCharge: cfg.tripCharge,
  isFirstTimeInstall: false,
  selectedRateCategory: "redRate",
  includeMirrors: false,
  extraCharges: [],
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
  contractMonths: 12,


  installMultiplierFirstTime: cfg.installMultiplierFirstTime,
  installMultiplierClean: cfg.installMultiplierClean,
  applyMinimum: true,
};

function mapFrequency(v: string): RpmFrequencyKey {
  if (v === "oneTime" || v === "weekly" || v === "biweekly" || v === "twicePerMonth" ||
      v === "monthly" || v === "bimonthly" || v === "quarterly" || v === "biannual" || v === "annual") {
    return v;
  }
  return "weekly";
}

function getEffectiveFrequencyKey(freqKey: RpmFrequencyKey): RpmFrequencyKey {
  if (freqKey === "twicePerMonth" || freqKey === "bimonthly") {
    return "monthly";
  }
  if (freqKey === "biannual" || freqKey === "annual") {
    return "quarterly";
  }
  return freqKey;
}

function getFrequencyMultiplier(
  effectiveFreqKey: RpmFrequencyKey,
  backendConfig: BackendRpmConfig | null
): number {
  if (backendConfig?.frequencyPriceMultipliers) {
    if (effectiveFreqKey === "weekly") return 1;
    if (effectiveFreqKey === "biweekly" && backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier) {
      return backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
    }
    if (effectiveFreqKey === "monthly" && backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier) {
      return backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
    }
    if (effectiveFreqKey === "quarterly" && backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime) {
      return backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
    }
  }

  return cfg.frequencyMultipliers[effectiveFreqKey] || 1;
}

function getBackendBaseRates(backendConfig: BackendRpmConfig | null) {
  return {
    small: backendConfig?.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
    medium: backendConfig?.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
    large: backendConfig?.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
    trip: backendConfig?.tripCharges?.standard ?? cfg.tripCharge,
  };
}

export function useRpmWindowsCalc(initial?: Partial<RpmWindowsFormState>, customFields?: any[]) {

  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);
  const isEditMode = useRef(!!initial);
  const forceRefreshRef = useRef(false);
  const skipInitialOverridesRef = useRef(false);
  const skipInitCustomSmall = useRef(!!initial);
  const skipInitCustomMedium = useRef(!!initial);
  const skipInitCustomLarge = useRef(!!initial);
  const skipInitCustomInstallationFee = useRef(!!initial);
  const skipInitCustomTotals = useRef(!!initial);
  const prevFrequencyRef = useRef<string | null>(initial?.frequency ?? null);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);
  const baseRatesInitialized = useRef(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});
  const [baselineReady, setBaselineReady] = useState(false);
  const overrideFieldsList: Array<keyof RpmWindowsFormState> = [
    "smallWindowRate",
    "mediumWindowRate",
    "largeWindowRate",
    "tripCharge",
    "installMultiplierFirstTime",
    "installMultiplierClean",
  ];
  const markManualOverride = (name: string, value: number) => {
    setManualOverrides(prev => {
      const next = { ...prev };
      const baseline = baselineValues.current[name];
      const shouldOverride =
        typeof baseline !== "number"
          ? true
      : Math.abs(value - baseline) > RPM_OVERRIDE_TOLERANCE;

      if (shouldOverride) {
        next[name] = true;
      } else {
        delete next[name];
      }

      return next;
    });
  };


  const [backendConfig, setBackendConfig] = useState<BackendRpmConfig | null>(null);


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

    console.log(`💰 [RPM-WINDOWS-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [RPM-WINDOWS-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);


  const [baseWeeklyRates, setBaseWeeklyRates] = useState({
    small: cfg.smallWindowRate,
    medium: cfg.mediumWindowRate,
    large: cfg.largeWindowRate,
    trip: cfg.tripCharge,
  });


  const [form, setForm] = useState<RpmWindowsFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM,
      ...initial,
    };


    const isInitiallyActive = (initial?.smallQty || 0) + (initial?.mediumQty || 0) + (initial?.largeQty || 0) > 0;
    const defaultContractMonths = initial?.contractMonths
      ? initial.contractMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : 12;

    return {
      ...baseForm,
      contractMonths: defaultContractMonths,
    };
  });


  const [isLoadingConfig, setIsLoadingConfig] = useState(false);


  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    forceRefreshRef.current = forceRefresh;
    if (forceRefresh) {
      baselineInitialized.current = false;
      baselineValues.current = {};
      skipInitialOverridesRef.current = true;
    }
    const shouldApplyConfig = !isEditMode.current || forceRefresh;
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("rpmWindows");
        if (backendData?.config) {
          console.log('✅ [RPM Windows] Using cached pricing data from context');
          const config = backendData.config as BackendRpmConfig;
          setBackendConfig(config);

          if (!shouldApplyConfig) {
            return;
          }

          const newBaseRates = {
            small: config.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
            medium: config.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
            large: config.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
            trip: config.tripCharges?.standard ?? cfg.tripCharge,
          };

          console.log('📊 [RPM Windows] Updating base rates from config:', newBaseRates);
          setBaseWeeklyRates(newBaseRates);


          setForm(prev => ({
            ...prev,
            smallWindowRate: newBaseRates.small,
            mediumWindowRate: newBaseRates.medium,
            largeWindowRate: newBaseRates.large,
            tripCharge: newBaseRates.trip,

            installMultiplierFirstTime: config.installPricing?.installationMultiplier ?? prev.installMultiplierFirstTime,
            installMultiplierClean: config.installPricing?.cleanInstallationMultiplier ?? prev.installMultiplierClean,
          }));


          if (forceRefresh) {
            console.log('🔄 [RPM-WINDOWS] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customContractTotal: undefined,
              customInstallationFee: undefined,
              customFirstMonthTotal: undefined,
              customAnnualPrice: undefined,
            }));
            setManualOverrides({});
          }

          console.log('✅ RPM Windows CONFIG loaded from context:', {
            windowRates: {
              small: config.windowPricingBothSidesIncluded?.smallWindowPrice,
              medium: config.windowPricingBothSidesIncluded?.mediumWindowPrice,
              large: config.windowPricingBothSidesIncluded?.largeWindowPrice,
            },
            installMultiplier: config.installPricing?.installationMultiplier,
            minimumCharge: config.minimumChargePerVisit,
            tripCharges: config.tripCharges,
            frequencyMetadata: config.frequencyMetadata,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for RPM Windows, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch RPM Windows config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("rpmWindows");
        if (fallbackConfig?.config) {
          console.log('✅ [RPM Windows] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendRpmConfig;
          setBackendConfig(config);

          if (!shouldApplyConfig) {
            return;
          }

          const newBaseRates = {
            small: config.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
            medium: config.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
            large: config.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
            trip: config.tripCharges?.standard ?? cfg.tripCharge,
          };

          setBaseWeeklyRates(newBaseRates);


          setForm(prev => ({
            ...prev,
            smallWindowRate: newBaseRates.small,
            mediumWindowRate: newBaseRates.medium,
            largeWindowRate: newBaseRates.large,
            tripCharge: newBaseRates.trip,

            installMultiplierFirstTime: config.installPricing?.installationMultiplier ?? prev.installMultiplierFirstTime,
            installMultiplierClean: config.installPricing?.cleanInstallationMultiplier ?? prev.installMultiplierClean,
          }));


          if (forceRefresh) {
            console.log('🔄 [RPM-WINDOWS] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customContractTotal: undefined,
              customInstallationFee: undefined,
              customFirstMonthTotal: undefined,
              customAnnualPrice: undefined,
            }));
            setManualOverrides({});
          }

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };


  useEffect(() => {
    console.log('[RPM-WINDOWS-PRICING] Fetching backend prices for baseline/override detection');
    fetchPricing(false);
  }, [initial]); 


  useEffect(() => {
    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing(false);
    }
  }, [initial, servicesContext?.backendPricingData, backendConfig]);


  useEffect(() => {
    if (!initial || baseRatesInitialized.current) return;

    const freqKey = mapFrequency(form.frequency);
    const effectiveFreqKey = getEffectiveFrequencyKey(freqKey);
    const freqMult = getFrequencyMultiplier(effectiveFreqKey, backendConfig);

    if (freqMult > 0) {
      setBaseWeeklyRates({
        small: (form.smallWindowRate || 0) / freqMult,
        medium: (form.mediumWindowRate || 0) / freqMult,
        large: (form.largeWindowRate || 0) / freqMult,
        trip: (form.tripCharge || 0) / freqMult,
      });
    }

    baseRatesInitialized.current = true;
  }, [
    initial,
    form.frequency,
    form.smallWindowRate,
    form.mediumWindowRate,
    form.largeWindowRate,
    form.tripCharge,
    backendConfig,
  ]);


  useEffect(() => {
    setBaselineReady(false);
    if (!backendConfig) {
      return;
    }

    const freqKey = mapFrequency(form.frequency);
    const effectiveFreqKey = getEffectiveFrequencyKey(freqKey);
    const freqMult = getFrequencyMultiplier(effectiveFreqKey, backendConfig);
    const backendBase = getBackendBaseRates(backendConfig);
    const expectedRates = {
      small: backendBase.small * freqMult,
      medium: backendBase.medium * freqMult,
      large: backendBase.large * freqMult,
      trip: backendBase.trip * freqMult,
    };

    baselineValues.current.smallWindowRate = expectedRates.small;
    baselineValues.current.mediumWindowRate = expectedRates.medium;
    baselineValues.current.largeWindowRate = expectedRates.large;
    baselineValues.current.tripCharge = expectedRates.trip;
    baselineValues.current.installMultiplierFirstTime =
      backendConfig.installPricing?.installationMultiplier ?? cfg.installMultiplierFirstTime;
    baselineValues.current.installMultiplierClean =
      backendConfig.installPricing?.cleanInstallationMultiplier ?? cfg.installMultiplierClean;

    baselineInitialized.current = true;
    setBaselineReady(true);

    if (forceRefreshRef.current) {
      setManualOverrides({});
    }
  }, [
    backendConfig,
    form.frequency,
  ]);

  useEffect(() => {
    if (skipInitialOverridesRef.current) {
      skipInitialOverridesRef.current = false;
      return;
    }

    if (forceRefreshRef.current) {
      return;
    }

    if (!baselineReady || !initial) {
      return;
    }

    const overrides: Record<string, boolean> = {};

    overrideFieldsList.forEach(field => {
      const savedRaw = initial[field];
      const savedValue =
        typeof savedRaw === "number"
          ? savedRaw
          : typeof savedRaw === "string"
            ? parseFloat(savedRaw)
            : undefined;
      const baseline = baselineValues.current[field as string];

      if (
        typeof savedValue === "number" &&
        typeof baseline === "number" &&
        Math.abs(savedValue - baseline) > RPM_OVERRIDE_TOLERANCE
      ) {
        overrides[field] = true;
      }
    });

    setManualOverrides(prev => ({ ...prev, ...overrides }));
  }, [baselineReady, initial]);


  useEffect(() => {
    const isServiceActive = (form.smallQty || 0) + (form.mediumQty || 0) + (form.largeQty || 0) > 0;
    const wasActive = wasActiveRef.current;
    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {
      if (servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
        setForm(prev => ({
          ...prev,
          contractMonths: servicesContext.globalContractMonths,
        }));
      }
    } else if (isServiceActive && servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
      if (form.contractMonths !== servicesContext.globalContractMonths) {
        setForm(prev => ({
          ...prev,
          contractMonths: servicesContext.globalContractMonths,
        }));
      }
    }

    wasActiveRef.current = isServiceActive;
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.smallQty, form.mediumQty, form.largeQty, servicesContext]);


  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `rpmWindows_${fieldName}`,
      productName: `RPM Windows - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: (form.smallQty || 0) + (form.mediumQty || 0) + (form.largeQty || 0) || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [RPM-WINDOWS-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.smallQty, form.mediumQty, form.largeQty, form.frequency]);

  const pricingOverrides = useMemo(() => {
    if (!backendConfig) return {};

    const freqKey = mapFrequency(form.frequency);
    const effectiveFreqKey = getEffectiveFrequencyKey(freqKey);
    const freqMult = getFrequencyMultiplier(effectiveFreqKey, backendConfig);
    const backendBase = getBackendBaseRates(backendConfig);

    const expectedRates = {
      small: backendBase.small * freqMult,
      medium: backendBase.medium * freqMult,
      large: backendBase.large * freqMult,
      trip: backendBase.trip * freqMult,
    };

    const isOverride = (current: number, expected: number | undefined) =>
      typeof expected === "number" && Number.isFinite(expected) && current !== expected;

    return {
      smallWindowRate: isOverride(form.smallWindowRate, expectedRates.small),
      mediumWindowRate: isOverride(form.mediumWindowRate, expectedRates.medium),
      largeWindowRate: isOverride(form.largeWindowRate, expectedRates.large),
      tripCharge: isOverride(form.tripCharge, expectedRates.trip),
      installMultiplierFirstTime: isOverride(
        form.installMultiplierFirstTime,
        backendConfig.installPricing?.installationMultiplier
      ),
      installMultiplierClean: isOverride(
        form.installMultiplierClean,
        backendConfig.installPricing?.cleanInstallationMultiplier
      ),
    };
  }, [
    backendConfig,
    form.frequency,
    form.smallWindowRate,
    form.mediumWindowRate,
    form.largeWindowRate,
    form.tripCharge,
    form.installMultiplierFirstTime,
    form.installMultiplierClean,
  ]);


  useEffect(() => {
    const freqKey = mapFrequency(form.frequency);
    const freqChanged = prevFrequencyRef.current !== form.frequency;
    if (freqChanged) {
      prevFrequencyRef.current = form.frequency;
      setManualOverrides({});
    }

    if (isEditMode.current && !forceRefreshRef.current && !freqChanged) {
      return;
    }

    const effectiveFreqKey = getEffectiveFrequencyKey(freqKey);
    const freqMult = getFrequencyMultiplier(effectiveFreqKey, backendConfig);

    console.log('[RPM Windows] Applying frequency multiplier:', {
      originalFrequency: freqKey,
      effectiveFrequency: effectiveFreqKey,
      multiplier: freqMult,
      baseRates: baseWeeklyRates,
    });


    setForm((prev) => ({
      ...prev,
      smallWindowRate: baseWeeklyRates.small * freqMult,
      mediumWindowRate: baseWeeklyRates.medium * freqMult,
      largeWindowRate: baseWeeklyRates.large * freqMult,
      tripCharge: baseWeeklyRates.trip * freqMult,
    }));

    if (forceRefreshRef.current) {
      forceRefreshRef.current = false;
    }
  }, [form.frequency, backendConfig, baseWeeklyRates]); 


  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({
      ...prev,
      contractMonths: months,
    }));
  }, []);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, checked } = e.target as any;

    setForm((prev) => {

      const originalValue = prev[name as keyof RpmWindowsFormState];

      let newFormState = prev;

      switch (name) {
        case "frequency":
          newFormState = { ...prev, frequency: mapFrequency(value) };
          break;

        case "selectedRateCategory":
          newFormState = { ...prev, selectedRateCategory: value as RpmRateCategory };
          break;

        case "includeMirrors":
          newFormState = { ...prev, includeMirrors: !!checked };
          break;

        case "applyMinimum":
          newFormState = { ...prev, applyMinimum: !!checked };
          break;

        case "smallQty":
        case "mediumQty":
        case "largeQty":
          newFormState = { ...prev, [name]: Number(value) || 0 };
          break;

        case "contractMonths":
          newFormState = { ...prev, contractMonths: Number(value) || 0 };
          break;


        case "customSmallTotal":
        case "customMediumTotal":
        case "customLargeTotal":
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customAnnualPrice":
        case "customContractTotal": {

          if (value === '') {
            newFormState = { ...prev, [name]: undefined };
          } else {
            const numVal = parseFloat(value);
            if (!isNaN(numVal)) {
              newFormState = { ...prev, [name]: numVal };
            } else {
              newFormState = prev;
            }
          }
          break;
        }

        case "customInstallationFee": {
          if (value === '') {
            newFormState = { ...prev, customInstallationFee: undefined };
          } else {
            const numVal = parseFloat(value);
            if (!isNaN(numVal)) {
              newFormState = { ...prev, customInstallationFee: numVal };
            } else {
              newFormState = prev;
            }
          }
          break;
        }


        case "smallWindowRate":
        case "mediumWindowRate":
        case "largeWindowRate":
        case "tripCharge": {
          const displayVal = Number(value) || 0;


          const freqKey = mapFrequency(prev.frequency);


          let effectiveFreqKey = freqKey;
          if (freqKey === "twicePerMonth" || freqKey === "bimonthly") {
            effectiveFreqKey = "monthly";
          } else if (freqKey === "biannual" || freqKey === "annual") {
            effectiveFreqKey = "quarterly";
          }


          let freqMult = 1;
          if (backendConfig?.frequencyPriceMultipliers) {

            if (effectiveFreqKey === "weekly") {
              freqMult = 1; 
            } else if (effectiveFreqKey === "biweekly" && backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier) {
              freqMult = backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
            } else if (effectiveFreqKey === "monthly" && backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier) {
              freqMult = backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
            } else if (effectiveFreqKey === "quarterly" && backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime) {
              freqMult = backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
            } else {

              const activeFreqMult = cfg.frequencyMultipliers;
              freqMult = activeFreqMult[effectiveFreqKey] || 1;
            }
          } else {

            const activeFreqMult = cfg.frequencyMultipliers;
            freqMult = activeFreqMult[effectiveFreqKey] || 1;
          }

          const weeklyBase = displayVal / freqMult;


          if (name === "smallWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, small: weeklyBase }));
          } else if (name === "mediumWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, medium: weeklyBase }));
          } else if (name === "largeWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, large: weeklyBase }));
          } else if (name === "tripCharge") {
            setBaseWeeklyRates(b => ({ ...b, trip: weeklyBase }));
          }

          markManualOverride(name, displayVal);

          newFormState = { ...prev, [name]: displayVal };
          break;
        }


        case "installMultiplierFirstTime":
        case "installMultiplierClean": {
          const displayVal = Number(value) || 0;
          markManualOverride(name, displayVal);
          newFormState = { ...prev, [name]: displayVal };
          break;
        }

        default:
          newFormState = prev;
          break;
      }


      const pricingFields = [
        'smallWindowRate', 'mediumWindowRate', 'largeWindowRate', 'tripCharge',
        'customSmallTotal', 'customMediumTotal', 'customLargeTotal',
        'customPerVisitPrice', 'customMonthlyRecurring', 'customFirstMonthTotal',
        'customAnnualPrice', 'customInstallationFee', 'customContractTotal',

        'installMultiplierFirstTime', 'installMultiplierClean'
      ];

      if (pricingFields.includes(name)) {
        const newValue = newFormState[name as keyof RpmWindowsFormState] as number | undefined;
        const oldValue = originalValue as number | undefined;
        const baselineValue = baselineValues.current[name] ?? oldValue;


        if (newValue !== undefined && baselineValue !== undefined &&
            typeof newValue === 'number' && typeof baselineValue === 'number' &&
            newValue !== baselineValue) {
          addServiceFieldChange(name, baselineValue, newValue);
        }
      }

      return newFormState;
    });
  };


  const addExtraCharge = () => {
    setForm((prev) => ({
      ...prev,
      extraCharges: [
        ...prev.extraCharges,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          calcText: "",
          description: "",
          amount: 0,
        },
      ],
    }));
  };

  const updateExtraCharge = (
    id: string,
    field: "calcText" | "description" | "amount",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.map((line) =>
        line.id === id
          ? { ...line, [field]: field === "amount" ? Number(value) || 0 : value }
          : line
      ),
    }));
  };

  const removeExtraCharge = (id: string) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.filter((line) => line.id !== id),
    }));
  };


  const getCycleMonths = (frequency: string, backendConfig: any): number => {
    const cycleMonths = backendConfig?.frequencyMetadata?.[frequency]?.cycleMonths;


    if (frequency === "monthly") {
      return cycleMonths === 0 ? 1 : (cycleMonths ?? 1);
    }


    if (typeof cycleMonths === 'number' && cycleMonths > 0) {
      return cycleMonths;
    }


    const fallbackCycles: Record<string, number> = {
      bimonthly: 2,
      quarterly: 3,
      biannual: 6,
      annual: 12,
    };

    return fallbackCycles[frequency] ?? 1;
  };

  const calc = useMemo(() => {

    const activeConfig = {
      smallWindowRate: backendConfig?.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
      mediumWindowRate: backendConfig?.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
      largeWindowRate: backendConfig?.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
      tripCharge: backendConfig?.tripCharges?.standard ?? cfg.tripCharge,
      installMultiplierFirstTime: backendConfig?.installPricing?.installationMultiplier ?? cfg.installMultiplierFirstTime,
      installMultiplierClean: backendConfig?.installPricing?.cleanInstallationMultiplier ?? cfg.installMultiplierClean,
      minimumChargePerVisit: backendConfig?.minimumChargePerVisit ?? 0,

      frequencyMultipliers: {
        weekly: 1,
        biweekly: backendConfig?.frequencyPriceMultipliers?.biweeklyPriceMultiplier ?? cfg.frequencyMultipliers.biweekly,
        monthly: backendConfig?.frequencyPriceMultipliers?.monthlyPriceMultiplier ?? cfg.frequencyMultipliers.monthly,
        quarterly: backendConfig?.frequencyPriceMultipliers?.quarterlyPriceMultiplierAfterFirstTime ?? cfg.frequencyMultipliers.quarterly,
        bimonthly: cfg.frequencyMultipliers.bimonthly, 
        annual: cfg.frequencyMultipliers.annual,
        biannual: cfg.frequencyMultipliers.biannual,
        twicePerMonth: cfg.frequencyMultipliers.twicePerMonth,
        oneTime: cfg.frequencyMultipliers.oneTime,
        quarterlyFirstTime: backendConfig?.frequencyPriceMultipliers?.quarterlyFirstTimeMultiplier ?? cfg.frequencyMultipliers.quarterlyFirstTime,
      },

      monthlyConversions: {
        weekly: backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? cfg.monthlyConversions.weekly,
        biweekly: backendConfig?.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? (cfg.monthlyConversions.weekly / 2),
        actualWeeksPerMonth: backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? cfg.monthlyConversions.actualWeeksPerMonth,
        actualWeeksPerYear: 52,
      },

      annualFrequencies: cfg.annualFrequencies,

      rateCategories: cfg.rateCategories,
    };

    const freqKey = mapFrequency(form.frequency);


    let effectiveFreqKey = freqKey;


    if (freqKey === "twicePerMonth" || freqKey === "bimonthly") {
      effectiveFreqKey = "monthly";
    }

    else if (freqKey === "biannual" || freqKey === "annual") {
      effectiveFreqKey = "quarterly";
    }


    let freqMult = 1;

    if (backendConfig?.frequencyPriceMultipliers) {

      if (effectiveFreqKey === "weekly") {
        freqMult = 1; 
      } else if (effectiveFreqKey === "biweekly" && backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier) {
        freqMult = backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
      } else if (effectiveFreqKey === "monthly" && backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier) {
        freqMult = backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
      } else if (effectiveFreqKey === "quarterly" && backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime) {
        freqMult = backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
      } else {

        const activeFreqMult = cfg.frequencyMultipliers;
        freqMult = activeFreqMult[effectiveFreqKey] || 1;
      }
    } else {

      const activeFreqMult = cfg.frequencyMultipliers;
      freqMult = activeFreqMult[effectiveFreqKey] || 1;
    }


    const weeklySmall = baseWeeklyRates.small;
    const weeklyMedium = baseWeeklyRates.medium;
    const weeklyLarge = baseWeeklyRates.large;
    const weeklyTrip = baseWeeklyRates.trip; 


    const weeklyWindows =
      form.smallQty * weeklySmall +
      form.mediumQty * weeklyMedium +
      form.largeQty * weeklyLarge;

    const hasWindows = weeklyWindows > 0;


    const effSmall = form.smallWindowRate;
    const effMedium = form.mediumWindowRate;
    const effLarge = form.largeWindowRate;
    const effTrip = form.tripCharge; 


    const perVisitWindows =
      form.smallQty * effSmall +
      form.mediumQty * effMedium +
      form.largeQty * effLarge;

    const perVisitService = hasWindows ? perVisitWindows : 0;

    const extrasTotal = form.extraCharges.reduce(
      (s, l) => s + (l.amount || 0),
      0
    );

    const recurringPerVisitBase = perVisitService + extrasTotal;


    const rateCfg =
      activeConfig.rateCategories[form.selectedRateCategory] ??
      activeConfig.rateCategories.redRate;

    const recurringPerVisitRated = recurringPerVisitBase * (rateCfg?.multiplier ?? 1);


    const installMultiplier = form.isFirstTimeInstall
      ? (form.installMultiplierFirstTime ?? activeConfig.installMultiplierFirstTime ?? cfg.installMultiplierFirstTime)
      : (form.installMultiplierClean ?? activeConfig.installMultiplierClean ?? cfg.installMultiplierClean);


    const minimumChargePerVisit = backendConfig?.minimumChargePerVisit ?? activeConfig.minimumChargePerVisit ?? cfg.minimumChargePerVisit ?? 50;
    const weeklyWindowsWithMinimum = hasWindows ? (form.applyMinimum !== false ? Math.max(weeklyWindows, minimumChargePerVisit) : weeklyWindows) : 0;

    const installOneTimeBase =
      form.isFirstTimeInstall && hasWindows
        ? weeklyWindowsWithMinimum * installMultiplier  
        : 0;

    const installOneTime = installOneTimeBase * (rateCfg?.multiplier ?? 1);


    const effectiveInstallation = form.customInstallationFee ?? installOneTime;
    const effectivePerVisit = form.customPerVisitPrice ?? recurringPerVisitRated;


    const firstVisitTotalRated = effectiveInstallation;


    let monthlyVisits = 0;
    const weeksPerMonth = activeConfig.monthlyConversions.actualWeeksPerMonth ?? 4.33;


    if (freqKey === "oneTime") {
      monthlyVisits = 0; 
    } else if (freqKey === "weekly") {

      monthlyVisits = backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? weeksPerMonth;
    } else if (freqKey === "biweekly") {

      monthlyVisits = backendConfig?.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? (weeksPerMonth / 2);
      console.log(`🔧 [RPM Windows] Using biweekly monthly multiplier: ${monthlyVisits} (backend: ${backendConfig?.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier}, fallback: ${weeksPerMonth / 2})`);
    } else if (freqKey === "twicePerMonth") {
      monthlyVisits = 2; 
    } else if (freqKey === "monthly") {
      monthlyVisits = 1; 
    } else if (freqKey === "bimonthly") {
      monthlyVisits = 0.5; 
    } else if (freqKey === "quarterly") {
      monthlyVisits = 0; 
    } else if (freqKey === "biannual") {
      monthlyVisits = 0; 
    } else if (freqKey === "annual") {
      monthlyVisits = 0; 
    }


    let standardMonthlyBillRated = effectivePerVisit * monthlyVisits;

    console.log(`🔧 [RPM Windows] Frequency calculation summary:`, {
      freqKey,
      monthlyVisits,
      standardMonthlyBillRated,
      backendWeeklyMultiplier: backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier,
      backendBiweeklyMultiplier: backendConfig?.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier,
      fallbackWeeksPerMonth: weeksPerMonth,
    });


    if (freqKey === "twicePerMonth") {

      standardMonthlyBillRated = effectivePerVisit * 1;
    }


    let displayMonthlyBillRated = standardMonthlyBillRated;
    if (standardMonthlyBillRated === 0 && effectivePerVisit > 0) {

      if (freqKey === "quarterly") {
        const cycleMonths = getCycleMonths("quarterly", backendConfig); 
        displayMonthlyBillRated = effectivePerVisit / cycleMonths;
      } else if (freqKey === "biannual") {
        const cycleMonths = getCycleMonths("biannual", backendConfig); 
        displayMonthlyBillRated = effectivePerVisit / cycleMonths;
      } else if (freqKey === "annual") {
        const cycleMonths = getCycleMonths("annual", backendConfig); 
        displayMonthlyBillRated = effectivePerVisit / cycleMonths;
      } else if (freqKey === "bimonthly") {
        const cycleMonths = getCycleMonths("bimonthly", backendConfig); 
        displayMonthlyBillRated = effectivePerVisit / cycleMonths;
      }
    }


    const isVisitBasedFrequency = freqKey === "oneTime" || freqKey === "quarterly" || freqKey === "biannual" || freqKey === "annual" || freqKey === "bimonthly";
    const effectiveServiceVisitsFirstMonth =
      isVisitBasedFrequency ? 0 : (monthlyVisits > 1 ? monthlyVisits - 1 : 0);

    let firstMonthBillRated = 0;
    if (form.isFirstTimeInstall) {
      if (isVisitBasedFrequency) {

        firstMonthBillRated = effectiveInstallation;
      } else {

        firstMonthBillRated = effectiveInstallation +
          effectivePerVisit * effectiveServiceVisitsFirstMonth;
      }
    } else {

      firstMonthBillRated = effectivePerVisit * monthlyVisits;
    }


    const monthlyBillRated = displayMonthlyBillRated;


    const contractMonths = Math.max(form.contractMonths ?? 0, 0);

    let contractTotalRated = 0;
    if (contractMonths > 0) {
      if (freqKey === "oneTime") {

        contractTotalRated = firstMonthBillRated;
      } else if (freqKey === "quarterly" || freqKey === "biannual" || freqKey === "annual" || freqKey === "bimonthly") {

        const cycleMonths = getCycleMonths(freqKey, backendConfig);
        const totalVisits = Math.max(Math.floor(contractMonths / cycleMonths), 1);

        if (form.isFirstTimeInstall) {

          const serviceVisits = Math.max(totalVisits - 1, 0);
          contractTotalRated = effectiveInstallation + (serviceVisits * effectivePerVisit);
        } else {

          contractTotalRated = totalVisits * effectivePerVisit;
        }
      } else {

        if (form.isFirstTimeInstall) {
          const remainingMonths = Math.max(contractMonths - 1, 0);
          contractTotalRated =
            firstMonthBillRated + standardMonthlyBillRated * remainingMonths;
        } else {
          contractTotalRated = standardMonthlyBillRated * contractMonths;
        }
      }
    }


    const recurringPerVisitWithMinimum = hasWindows ? (form.applyMinimum !== false ? Math.max(effectivePerVisit, minimumChargePerVisit) : effectivePerVisit) : 0;


    const standardMonthlyBillWithMinimum = recurringPerVisitWithMinimum * monthlyVisits;
    let displayMonthlyBillWithMinimum = standardMonthlyBillWithMinimum;


    if (isVisitBasedFrequency) {
      if (freqKey === "quarterly") {
        const cycleMonths = getCycleMonths("quarterly", backendConfig); 
        displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
      } else if (freqKey === "biannual") {
        const cycleMonths = getCycleMonths("biannual", backendConfig); 
        displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
      } else if (freqKey === "annual") {
        const cycleMonths = getCycleMonths("annual", backendConfig); 
        displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
      } else if (freqKey === "bimonthly") {
        const cycleMonths = getCycleMonths("bimonthly", backendConfig); 
        displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
      }
    }


    let firstMonthBillWithMinimum = 0;
    if (form.isFirstTimeInstall) {
      if (isVisitBasedFrequency) {

        firstMonthBillWithMinimum = effectiveInstallation;
      } else {

        firstMonthBillWithMinimum = effectiveInstallation +
          recurringPerVisitWithMinimum * effectiveServiceVisitsFirstMonth;
      }
    } else {

      firstMonthBillWithMinimum = recurringPerVisitWithMinimum * monthlyVisits;
    }


    let contractTotalWithMinimum = 0;
    if (contractMonths > 0) {
      if (isVisitBasedFrequency) {


        const cycleMonths = getCycleMonths(freqKey, backendConfig);
        const totalVisits = Math.max(Math.floor(contractMonths / cycleMonths), 1);
        contractTotalWithMinimum = (form.isFirstTimeInstall ? effectiveInstallation : 0) +
          recurringPerVisitWithMinimum * (totalVisits - (form.isFirstTimeInstall ? 1 : 0));
      } else {

        if (form.isFirstTimeInstall && firstMonthBillWithMinimum !== standardMonthlyBillWithMinimum) {
          const remainingMonths = Math.max(contractMonths - 1, 0);
          contractTotalWithMinimum = firstMonthBillWithMinimum + standardMonthlyBillWithMinimum * remainingMonths;
        } else {
          contractTotalWithMinimum = standardMonthlyBillWithMinimum * contractMonths;
        }
      }
    }


    const finalFirstMonth = firstMonthBillWithMinimum;
    const finalMonthlyRecurring = form.customMonthlyRecurring ?? standardMonthlyBillWithMinimum;


    let finalContractTotal = contractTotalWithMinimum;
    if (contractMonths > 0 && !isVisitBasedFrequency) {

      if (form.isFirstTimeInstall && finalFirstMonth !== finalMonthlyRecurring) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        finalContractTotal = finalFirstMonth + finalMonthlyRecurring * remainingMonths;
      } else {
        finalContractTotal = finalMonthlyRecurring * contractMonths;
      }
    }


    const contractTotalBeforeCustomFields = form.customContractTotal ?? finalContractTotal;


    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = contractTotalBeforeCustomFields + customFieldsTotal;

    console.log(`📊 [RPM-WINDOWS-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotalBeforeCustomFields.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });


    const pricingTableSmall = backendConfig?.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate;
    const pricingTableMedium = backendConfig?.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate;
    const pricingTableLarge = backendConfig?.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate;

    const baselineSmallRate = pricingTableSmall * freqMult;
    const baselineMediumRate = pricingTableMedium * freqMult;
    const baselineLargeRate = pricingTableLarge * freqMult;

    const originalPerVisitWindows = hasWindows
      ? form.smallQty * baselineSmallRate + form.mediumQty * baselineMediumRate + form.largeQty * baselineLargeRate
      : 0;
    const originalPerVisitRated = originalPerVisitWindows * (rateCfg?.multiplier ?? 1);

    const originalPerVisitWithMinimum = hasWindows ? (form.applyMinimum !== false ? Math.max(originalPerVisitRated, minimumChargePerVisit) : originalPerVisitRated) : 0;
    const originalStandardMonthlyBill = originalPerVisitWithMinimum * monthlyVisits;

    let originalContractTotal = 0;
    if (contractMonths > 0 && hasWindows) {
      if (freqKey === "oneTime") {
        originalContractTotal = originalPerVisitWithMinimum;
      } else if (isVisitBasedFrequency) {
        const cycleMonths = getCycleMonths(freqKey, backendConfig);
        const totalVisits = Math.max(Math.floor(contractMonths / cycleMonths), 1);
        originalContractTotal = totalVisits * originalPerVisitWithMinimum;
      } else {
        originalContractTotal = originalStandardMonthlyBill * contractMonths;
      }
    }

    return {
      effSmall,
      effMedium,
      effLarge,
      effTrip,

      recurringPerVisitRated: form.customPerVisitPrice ?? recurringPerVisitWithMinimum,
      installOneTime: effectiveInstallation, 
      firstVisitTotalRated: firstVisitTotalRated, 
      standardMonthlyBillRated: finalMonthlyRecurring,
      firstMonthBillRated: finalFirstMonth,
      monthlyBillRated: form.customMonthlyRecurring ?? displayMonthlyBillWithMinimum,
      contractTotalRated: contractTotalWithCustomFields, 
      minimumChargePerVisit, 
      originalContractTotal, 
    };
  }, [
    backendConfig, 
    baseWeeklyRates, 
    form.smallQty,
    form.mediumQty,
    form.largeQty,
    form.smallWindowRate,
    form.mediumWindowRate,
    form.largeWindowRate,
    form.tripCharge,
    form.frequency,
    form.selectedRateCategory,
    form.isFirstTimeInstall,
    form.extraCharges,
    form.contractMonths,

    form.installMultiplierFirstTime,
    form.installMultiplierClean,

    form.customPerVisitPrice,
    form.customMonthlyRecurring,
    form.customContractTotal,
    form.customInstallationFee,

    calcFieldsTotal,
    dollarFieldsTotal,
    form.applyMinimum,
  ]);

  const quote: ServiceQuoteResult = {
    serviceId: "rpmWindows",
    displayName: "RPM Window",
    perVisitPrice: calc.recurringPerVisitRated,

    annualPrice: calc.contractTotalRated,
    detailsBreakdown: [],
  };

  const persistedOverrides = manualOverrides;

  return {
    form,
    setForm,
    onChange,
    addExtraCharge,
    updateExtraCharge,
    removeExtraCharge,
    calc,
    quote,
    pricingOverrides,
    manualOverrides,
    persistedOverrides,
    baselineValues: baselineValues.current,
    baselineReady,
    refreshConfig: () => fetchPricing(true),
    isLoadingConfig,
    setContractMonths,
  };
}

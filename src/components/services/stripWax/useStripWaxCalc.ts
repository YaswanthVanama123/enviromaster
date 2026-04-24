
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import { stripWaxPricingConfig as cfg } from "./stripWaxConfig";
import type {
  StripWaxFrequencyKey,
  StripWaxRateCategory,
  StripWaxServiceVariant,
  StripWaxVariantConfig,
  StripWaxFormState,
} from "./stripWaxTypes";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";


interface BackendStripWaxConfig {
  variants: {
    standardFull: {
      label: string;
      ratePerSqFt: number;
      minCharge: number;
      coatsIncluded: number;
      sealantIncluded: boolean;
    };
    noSealant: {
      label: string;
      alternateRatePerSqFt: number;  
      minCharge: number;
      includeExtraCoatFourthFree: boolean;
    };
    wellMaintained: {
      label: string;
      ratePerSqFt: number;
      minCharge: number;
      coatsIncluded: number;
    };
  };
  tripCharges: {
    standard: number;
    beltway: number;
  };
  frequencyMetadata: {
    weekly?: {
      monthlyRecurringMultiplier: number;
      firstMonthExtraMultiplier: number;
    };
    biweekly?: {
      monthlyRecurringMultiplier: number;
      firstMonthExtraMultiplier: number;
    };
    bimonthly?: { cycleMonths: number };
    quarterly?: { cycleMonths: number };
    biannual?: { cycleMonths: number };
    annual?: { cycleMonths: number };
  };
  minContractMonths: number;
  maxContractMonths: number;
  defaultFrequency: string;
  defaultVariant: string;
  rateCategories: {
    redRate: {
      multiplier: number;
      commissionRate: string;
    };
    greenRate: {
      multiplier: number;
      commissionRate: string;
    };
  };
}


function buildActiveConfig(backendConfig: BackendStripWaxConfig | null) {

  const defaults = {
    weeksPerMonth: cfg.weeksPerMonth || 4.33,
    weeksPerYear: cfg.weeksPerYear || 52,
    minContractMonths: cfg.minContractMonths || 2,
    maxContractMonths: cfg.maxContractMonths || 36,
    defaultFrequency: cfg.defaultFrequency || 'weekly',
    defaultVariant: cfg.defaultVariant || 'standardFull',
    variants: cfg.variants || {
      standardFull: { label: "Standard Full", ratePerSqFt: 0.75, minCharge: 550 },
      noSealant: { label: "No Sealant", ratePerSqFt: 0.7, minCharge: 550 },
      wellMaintained: { label: "Well Maintained", ratePerSqFt: 0.4, minCharge: 400 }
    },
    rateCategories: cfg.rateCategories || {
      redRate: { multiplier: 1, commissionRate: "20%" },
      greenRate: { multiplier: 1.3, commissionRate: "25%" }
    }
  };

  if (!backendConfig) {
    console.log('📊 [Strip & Wax] Using static config fallback values');
    return {
      ...defaults,
      frequencyMultipliers: {
        oneTime: 0,
        weekly: 4.33,
        biweekly: 2.165,
        twicePerMonth: 2,
        monthly: 1.0,
        everyFourWeeks: 1.0833,
        bimonthly: 0.5,
        quarterly: 0,
        biannual: 0,
        annual: 0,
      },
      annualFrequencies: {
        oneTime: 1,
        weekly: 52,
        biweekly: 26,
        twicePerMonth: 24,
        monthly: 12,
        everyFourWeeks: 13,
        bimonthly: 6,
        quarterly: 4,
        biannual: 2,
        annual: 1,
      }
    };
  }

  console.log('📊 [Strip & Wax] Building active config from backend:', backendConfig);


  const activeConfig = {

    minContractMonths: backendConfig.minContractMonths ?? defaults.minContractMonths,
    maxContractMonths: backendConfig.maxContractMonths ?? defaults.maxContractMonths,
    defaultFrequency: backendConfig.defaultFrequency ?? defaults.defaultFrequency,
    defaultVariant: backendConfig.defaultVariant ?? defaults.defaultVariant,


    variants: {
      standardFull: {
        label: backendConfig.variants?.standardFull?.label ?? defaults.variants.standardFull.label,
        ratePerSqFt: backendConfig.variants?.standardFull?.ratePerSqFt ?? defaults.variants.standardFull.ratePerSqFt,
        minCharge: backendConfig.variants?.standardFull?.minCharge ?? defaults.variants.standardFull.minCharge,
      },
      noSealant: {
        label: backendConfig.variants?.noSealant?.label ?? defaults.variants.noSealant.label,

        ratePerSqFt: backendConfig.variants?.noSealant?.alternateRatePerSqFt ?? defaults.variants.noSealant.ratePerSqFt,
        minCharge: backendConfig.variants?.noSealant?.minCharge ?? defaults.variants.noSealant.minCharge,
      },
      wellMaintained: {
        label: backendConfig.variants?.wellMaintained?.label ?? defaults.variants.wellMaintained.label,
        ratePerSqFt: backendConfig.variants?.wellMaintained?.ratePerSqFt ?? defaults.variants.wellMaintained.ratePerSqFt,
        minCharge: backendConfig.variants?.wellMaintained?.minCharge ?? defaults.variants.wellMaintained.minCharge,
      }
    },


    rateCategories: backendConfig.rateCategories ?? defaults.rateCategories,


    tripCharges: backendConfig.tripCharges ?? { standard: 0, beltway: 0 },


    frequencyMultipliers: {
      oneTime: 0,
      weekly: backendConfig.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? 4.33,
      biweekly: backendConfig.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? 2.165,
      twicePerMonth: 2,
      monthly: 1.0,
      everyFourWeeks: 1.0833,
      bimonthly: 0.5,
      quarterly: 0,
      biannual: 0,
      annual: 0,
    },


    annualFrequencies: {
      oneTime: 1,
      weekly: 52,
      biweekly: 26,
      twicePerMonth: 24,
      monthly: 12,
      everyFourWeeks: 13,
      bimonthly: backendConfig.frequencyMetadata?.bimonthly?.cycleMonths ? 12 / backendConfig.frequencyMetadata.bimonthly.cycleMonths : 6,
      quarterly: backendConfig.frequencyMetadata?.quarterly?.cycleMonths ? 12 / backendConfig.frequencyMetadata.quarterly.cycleMonths : 4,
      biannual: backendConfig.frequencyMetadata?.biannual?.cycleMonths ? 12 / backendConfig.frequencyMetadata.biannual.cycleMonths : 2,
      annual: backendConfig.frequencyMetadata?.annual?.cycleMonths ? 12 / backendConfig.frequencyMetadata.annual.cycleMonths : 1,
    },


    frequencyMetadata: backendConfig.frequencyMetadata,
  };

  console.log('✅ [Strip & Wax] Active config built:', {
    variants: {
      standardFull: activeConfig.variants.standardFull,
      noSealant: activeConfig.variants.noSealant,
      wellMaintained: activeConfig.variants.wellMaintained,
    },
    rateCategories: activeConfig.rateCategories,
    frequencyMultipliers: activeConfig.frequencyMultipliers,
    annualFrequencies: activeConfig.annualFrequencies,
    contractLimits: {
      min: activeConfig.minContractMonths,
      max: activeConfig.maxContractMonths,
    }
  });

  return activeConfig;
}

function resolveVariantDefaultsFromConfig(
  config: ReturnType<typeof buildActiveConfig>,
  variant?: StripWaxServiceVariant
): StripWaxVariantConfig {
  const key = variant ?? config.defaultVariant;
  return config.variants[key] ?? config.variants[config.defaultVariant];
}

function getVariantConfigFromState(state: StripWaxFormState): StripWaxVariantConfig {
  if (state.serviceVariant === "standardFull") {
    return {
      ratePerSqFt: state.standardFullRatePerSqFt,
      minCharge: state.standardFullMinCharge,
    };
  }

  if (state.serviceVariant === "noSealant") {
    return {
      ratePerSqFt: state.noSealantRatePerSqFt,
      minCharge: state.noSealantMinCharge,
    };
  }

  return {
    ratePerSqFt: state.wellMaintainedRatePerSqFt,
    minCharge: state.wellMaintainedMinCharge,
  };
}

export interface StripWaxCalcResult {

  perVisit: number;


  monthly: number;


  annual: number;


  firstVisit: number;


  ongoingMonthly: number;


  contractTotal: number;


  originalContractTotal: number;


  rawPrice: number;
}

const DEFAULT_FORM_STATE: StripWaxFormState = {
  floorAreaSqFt: 0,
  ratePerSqFt: cfg.variants[cfg.defaultVariant].ratePerSqFt,
  minCharge: cfg.variants[cfg.defaultVariant].minCharge,
  serviceVariant: cfg.defaultVariant,
  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",
  contractMonths: cfg.minContractMonths ?? 12,


  weeksPerMonth: cfg.weeksPerMonth,
  standardFullRatePerSqFt: cfg.variants.standardFull.ratePerSqFt,
  standardFullMinCharge: cfg.variants.standardFull.minCharge,
  noSealantRatePerSqFt: cfg.variants.noSealant.ratePerSqFt,
  noSealantMinCharge: cfg.variants.noSealant.minCharge,
  wellMaintainedRatePerSqFt: cfg.variants.wellMaintained.ratePerSqFt,
  wellMaintainedMinCharge: cfg.variants.wellMaintained.minCharge,
  redRateMultiplier: cfg.rateCategories.redRate.multiplier,
  greenRateMultiplier: cfg.rateCategories.greenRate.multiplier,
  applyMinimum: true,
};

export function useStripWaxCalc(initialData?: Partial<StripWaxFormState>, customFields?: any[]) {

  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);


  const servicesContext = useServicesContextOptional();

  const baselineRef = useRef<Record<string, number>>({});
  const setBaselineVariant = useCallback((state: StripWaxFormState) => {
    const variantDefaults = getVariantConfigFromState(state);
    baselineRef.current.ratePerSqFt = variantDefaults.ratePerSqFt;
    baselineRef.current.minCharge = variantDefaults.minCharge;
  }, []);


  const calcFieldsTotal = useMemo(() => {
    if (!customFields || customFields.length === 0) return 0;

    const total = customFields.reduce((sum, field) => {
      if (field.type === "calc" && field.calcValues?.right) {
        const fieldTotal = parseFloat(field.calcValues.right) || 0;
        return sum + fieldTotal;
      }
      return sum;
    }, 0);

    console.log(`💰 [STRIP-WAX-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [STRIP-WAX-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [form, setForm] = useState<StripWaxFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM_STATE,
      ...initialData,
    };


    const isInitiallyActive = (initialData?.floorAreaSqFt || 0) > 0;
    const defaultContractMonths = initialData?.contractMonths
      ? initialData.contractMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : 12;

    return {
      ...baseForm,
      contractMonths: defaultContractMonths,
    };
  });

  useEffect(() => {
    setBaselineVariant(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setForm((prev) => {
      const variantDefaults = getVariantConfigFromState(prev);
      const nextCustomRate =
        prev.ratePerSqFt !== variantDefaults.ratePerSqFt ? prev.ratePerSqFt : undefined;
      const nextCustomMin =
        prev.minCharge !== variantDefaults.minCharge ? prev.minCharge : undefined;

      if (
        prev.customRatePerSqFt === nextCustomRate &&
        prev.customMinCharge === nextCustomMin
      ) {
        return prev;
      }

      return {
        ...prev,
        customRatePerSqFt: nextCustomRate,
        customMinCharge: nextCustomMin,
      };
    });
  }, [
    form.ratePerSqFt,
    form.minCharge,
    form.serviceVariant,
    form.standardFullRatePerSqFt,
    form.standardFullMinCharge,
    form.noSealantRatePerSqFt,
    form.noSealantMinCharge,
    form.wellMaintainedRatePerSqFt,
    form.wellMaintainedMinCharge,
  ]);


  const [backendConfig, setBackendConfig] = useState<BackendStripWaxConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const updateFormWithConfig = (activeConfig: any) => {
    setForm((prev) => {
      const next = {
        ...prev,

        weeksPerMonth: activeConfig.frequencyMultipliers?.weekly ?? prev.weeksPerMonth,
        standardFullRatePerSqFt: activeConfig.variants?.standardFull?.ratePerSqFt ?? prev.standardFullRatePerSqFt,
        standardFullMinCharge: activeConfig.variants?.standardFull?.minCharge ?? prev.standardFullMinCharge,
        noSealantRatePerSqFt: activeConfig.variants?.noSealant?.ratePerSqFt ?? prev.noSealantRatePerSqFt,
        noSealantMinCharge: activeConfig.variants?.noSealant?.minCharge ?? prev.noSealantMinCharge,
        wellMaintainedRatePerSqFt: activeConfig.variants?.wellMaintained?.ratePerSqFt ?? prev.wellMaintainedRatePerSqFt,
        wellMaintainedMinCharge: activeConfig.variants?.wellMaintained?.minCharge ?? prev.wellMaintainedMinCharge,
        redRateMultiplier: activeConfig.rateCategories?.redRate?.multiplier ?? prev.redRateMultiplier,
        greenRateMultiplier: activeConfig.rateCategories?.greenRate?.multiplier ?? prev.greenRateMultiplier,
      };
      setBaselineVariant(next);
      return next;
    });

    console.log('✅ [Strip & Wax] Form updated with backend config values:', {
      standardFullRate: activeConfig.variants?.standardFull?.ratePerSqFt,
      standardFullMinimum: activeConfig.variants?.standardFull?.minCharge,
      noSealantRate: activeConfig.variants?.noSealant?.ratePerSqFt,
      noSealantMinimum: activeConfig.variants?.noSealant?.minCharge,
      wellMaintainedRate: activeConfig.variants?.wellMaintained?.ratePerSqFt,
      wellMaintainedMinimum: activeConfig.variants?.wellMaintained?.minCharge,
      redRateMultiplier: activeConfig.rateCategories?.redRate?.multiplier,
      greenRateMultiplier: activeConfig.rateCategories?.greenRate?.multiplier,
    });
  };


  const fetchPricing = async (forceRefresh: boolean = false) => {
    const applyBackendConfig = (config: BackendStripWaxConfig, forceOverride: boolean = forceRefresh) => {
      const activeCfg = buildActiveConfig(config);
      setBackendConfig(config);
      updateFormWithConfig(activeCfg);

      if (initialData && !forceOverride) {
        return activeCfg;
      }

      setForm((prev) => {
        const defaults = forceOverride
          ? resolveVariantDefaultsFromConfig(activeCfg, prev.serviceVariant)
          : undefined;

        return {
          ...prev,
          customPerVisit: undefined,
          customMonthly: undefined,
          customOngoingMonthly: undefined,
          customContractTotal: undefined,
          ...(defaults
            ? {
                ratePerSqFt: defaults.ratePerSqFt,
                minCharge: defaults.minCharge,
                customRatePerSqFt: undefined,
                customMinCharge: undefined,
              }
            : {}),
        };
      });

      return activeCfg;
    };
    setIsLoadingConfig(true);
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("stripWax");
        if (backendData?.config) {
          console.log('✅ [StripWax] Using cached pricing data from context');
          const config = backendData.config as BackendStripWaxConfig;

          applyBackendConfig(config, forceRefresh);

          console.log('✅ StripWax CONFIG loaded from context:', {
            variants: {
              standardFull: config.variants?.standardFull,
              noSealant: config.variants?.noSealant,
              wellMaintained: config.variants?.wellMaintained,
            },
            rateCategories: config.rateCategories,
            frequencyMetadata: config.frequencyMetadata,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for StripWax, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch StripWax config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("stripWax");
        if (fallbackConfig?.config) {
          console.log('✅ [StripWax] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendStripWaxConfig;

          applyBackendConfig(config, forceRefresh);
          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };


  useEffect(() => {

    if (initialData) {
      console.log('📋 [STRIP-WAX-PRICING] Skipping price fetch - using saved historical prices from initialData');
      return;
    }

    console.log('📋 [STRIP-WAX-PRICING] Fetching current prices - new service or no initial data');
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {

    if (initialData) return;

    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);


  useEffect(() => {
    const isServiceActive = (form.floorAreaSqFt || 0) > 0;
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
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.floorAreaSqFt, servicesContext]);

  const getFallbackFieldValue = useCallback((fieldName: string, state: StripWaxFormState): number | undefined => {
    const baseline = baselineRef.current[fieldName];
    if (baseline !== undefined) {
      return baseline;
    }

    const variantDefaults = getVariantConfigFromState(state);
    switch (fieldName) {
      case "ratePerSqFt":
        return variantDefaults.ratePerSqFt;
      case "minCharge":
        return variantDefaults.minCharge;
      case "weeksPerMonth":
        return state.weeksPerMonth;
      case "standardFullRatePerSqFt":
        return state.standardFullRatePerSqFt;
      case "standardFullMinCharge":
        return state.standardFullMinCharge;
      case "noSealantRatePerSqFt":
        return state.noSealantRatePerSqFt;
      case "noSealantMinCharge":
        return state.noSealantMinCharge;
      case "wellMaintainedRatePerSqFt":
        return state.wellMaintainedRatePerSqFt;
      case "wellMaintainedMinCharge":
        return state.wellMaintainedMinCharge;
      case "redRateMultiplier":
        return state.redRateMultiplier;
      case "greenRateMultiplier":
        return state.greenRateMultiplier;
      default:
        return undefined;
    }
  }, []);

  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `stripWax_${fieldName}`,
      productName: `Strip & Wax - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.floorAreaSqFt || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [STRIP-WAX-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.floorAreaSqFt, form.frequency]);


  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({
      ...prev,
      contractMonths: months,
    }));
  }, []);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type } = e.target;
    const t: any = e.target;

    setForm((prev) => {

      const originalValue = prev[name as keyof StripWaxFormState];

      const next: StripWaxFormState = { ...prev };


      if (name === "serviceVariant") {
        const variantKey = t.value as StripWaxServiceVariant;
        next.serviceVariant = variantKey;


        if (variantKey === "standardFull") {
          next.ratePerSqFt = prev.standardFullRatePerSqFt;
          next.minCharge = prev.standardFullMinCharge;
        } else if (variantKey === "noSealant") {
          next.ratePerSqFt = prev.noSealantRatePerSqFt;
          next.minCharge = prev.noSealantMinCharge;
        } else if (variantKey === "wellMaintained") {
          next.ratePerSqFt = prev.wellMaintainedRatePerSqFt;
          next.minCharge = prev.wellMaintainedMinCharge;
        }
        setBaselineVariant(next);
        return next;
      }

      if (type === "checkbox") {
        (next as any)[name] = t.checked;
      } else if (
        name === "customPerVisit" ||
        name === "customMonthly" ||
        name === "customOngoingMonthly" ||
        name === "customContractTotal"
      ) {

        if (t.value === '') {
          (next as any)[name] = undefined;
        } else {
          const numVal = parseFloat(t.value);
          if (!isNaN(numVal)) {
            (next as any)[name] = numVal;
          }
        }
      } else if (type === "number") {
        const raw = t.value;
        if (raw === "") {
          (next as any)[name] = undefined;
        } else {
          const num = Number(raw);
          (next as any)[name] = Number.isFinite(num) && num >= 0 ? num : (next as any)[name];
        }
      } else {
        (next as any)[name] = t.value;
      }


      const pricingFields = [
      'ratePerSqFt', 'minCharge', 'weeksPerMonth',
        'standardFullRatePerSqFt', 'standardFullMinCharge', 'noSealantRatePerSqFt', 'noSealantMinCharge',
        'wellMaintainedRatePerSqFt', 'wellMaintainedMinCharge', 'redRateMultiplier', 'greenRateMultiplier',
        'customPerVisit', 'customMonthly', 'customOngoingMonthly', 'customContractTotal'
      ];

      if (pricingFields.includes(name)) {
      const newValue = (next as any)[name] as number | undefined;
      const oldValue = originalValue as number | undefined;
      const fallbackValue = getFallbackFieldValue(name, prev);
      const resolvedOriginal = fallbackValue !== undefined
        ? fallbackValue
        : oldValue;

        if (
          newValue !== undefined &&
          typeof newValue === 'number' &&
          newValue > 0 &&
        resolvedOriginal !== undefined &&
          typeof resolvedOriginal === 'number' &&
          newValue !== resolvedOriginal
        ) {
          addServiceFieldChange(name, resolvedOriginal, newValue);
        }
      }

      return next;
    });
  };

  const calc: StripWaxCalcResult = useMemo(() => {

    const activeConfig = buildActiveConfig(backendConfig);

    const areaSqFt = Math.max(0, Number(form.floorAreaSqFt) || 0);


    if (areaSqFt === 0) {
      return {
        perVisit: 0,
        monthly: 0,
        annual: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
        originalContractTotal: 0,
        rawPrice: 0,
      };
    }


    const rateCfg = {
      multiplier: form.rateCategory === "greenRate"
        ? form.greenRateMultiplier
        : form.redRateMultiplier,
    };

    const weeksPerMonth = activeConfig.frequencyMultipliers?.weekly ?? form.weeksPerMonth;  


    let monthlyVisits: number;
    if (activeConfig.frequencyMultipliers && activeConfig.frequencyMultipliers[form.frequency] !== undefined) {
      monthlyVisits = activeConfig.frequencyMultipliers[form.frequency];
    } else {

      const conv = cfg.billingConversions?.[form.frequency];
      monthlyVisits = conv?.monthlyMultiplier ?? 0;
    }


    const isVisitBasedFrequency = form.frequency === "oneTime" ||
                                   form.frequency === "quarterly" ||
                                   form.frequency === "biannual" ||
                                   form.frequency === "annual" ||
                                   form.frequency === "bimonthly" ||
                                   form.frequency === "everyFourWeeks";

    const getVariantConfig = (variant: StripWaxServiceVariant) => {
      if (variant === "standardFull") {
        return {
          ratePerSqFt: form.standardFullRatePerSqFt,
          minCharge: form.standardFullMinCharge,
        };
      } else if (variant === "noSealant") {
        return {
          ratePerSqFt: form.noSealantRatePerSqFt,
          minCharge: form.noSealantMinCharge,
        };
      } else {
        return {
          ratePerSqFt: form.wellMaintainedRatePerSqFt,
          minCharge: form.wellMaintainedMinCharge,
        };
      }
    };

    const variantCfg = getVariantConfig(form.serviceVariant);

    const ratePerSqFt =
      form.ratePerSqFt > 0
        ? form.ratePerSqFt
        : variantCfg.ratePerSqFt;

    const minCharge =
      form.minCharge > 0 ? form.minCharge : variantCfg.minCharge;


    const rawPriceRed = areaSqFt * ratePerSqFt;
    const perVisitRed = form.applyMinimum !== false ? Math.max(rawPriceRed, minCharge) : rawPriceRed;

    const perVisit = perVisitRed * rateCfg.multiplier;

    const firstVisit = perVisit;


    let monthlyPrice: number;
    let calculatedContractTotal: number;

    const minMonths = activeConfig.minContractMonths ?? 2;  
    const maxMonths = activeConfig.maxContractMonths ?? 36;  
    const rawMonths = Number(form.contractMonths) || minMonths;
    const contractMonths = Math.min(
      Math.max(rawMonths, minMonths),
      maxMonths
    );

    if (form.frequency === "oneTime") {

      monthlyPrice = perVisit;
      calculatedContractTotal = perVisit;
    } else if (isVisitBasedFrequency) {

      let visitsPerYear: number;
      if (activeConfig.annualFrequencies && activeConfig.annualFrequencies[form.frequency] !== undefined) {
        visitsPerYear = activeConfig.annualFrequencies[form.frequency];
      } else {

        const conv = cfg.billingConversions[form.frequency];
        visitsPerYear = conv.annualMultiplier;
      }

      const totalVisits = (contractMonths / 12) * visitsPerYear;
      monthlyPrice = monthlyVisits * perVisit;
      calculatedContractTotal = totalVisits * perVisit;
    } else {

      monthlyPrice = monthlyVisits * perVisit;
      calculatedContractTotal = monthlyPrice * contractMonths;
    }


    const finalPerVisit = form.customPerVisit ?? perVisit;
    const finalMonthly = form.customMonthly ?? monthlyPrice;
    const finalOngoingMonthly = form.customOngoingMonthly ?? monthlyPrice;
    const calculatedContractTotalBeforeCustomFields = form.customContractTotal ?? calculatedContractTotal;


    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const finalContractTotal = calculatedContractTotalBeforeCustomFields + customFieldsTotal;

    console.log(`📊 [STRIP-WAX-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: calculatedContractTotal.toFixed(2),
      customOverride: form.customContractTotal?.toFixed(2) ?? 'none',
      contractBeforeCustomFields: calculatedContractTotalBeforeCustomFields.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: finalContractTotal.toFixed(2)
    });


    const baselineVariantRatePerSqFt = activeConfig.variants[form.serviceVariant]?.ratePerSqFt ?? activeConfig.variants[activeConfig.defaultVariant]?.ratePerSqFt ?? 0;
    const baselineVariantMinCharge = activeConfig.variants[form.serviceVariant]?.minCharge ?? activeConfig.variants[activeConfig.defaultVariant]?.minCharge ?? 0;
    const baselineRawPrice = areaSqFt * baselineVariantRatePerSqFt;

    const baselinePerVisit = form.applyMinimum !== false ? Math.max(baselineRawPrice, baselineVariantMinCharge) : baselineRawPrice;
    let originalContractTotal = 0;
    if (form.frequency === "oneTime") {
      originalContractTotal = baselinePerVisit;
    } else if (isVisitBasedFrequency) {
      let visitsPerYear: number;
      if (activeConfig.annualFrequencies && activeConfig.annualFrequencies[form.frequency] !== undefined) {
        visitsPerYear = activeConfig.annualFrequencies[form.frequency];
      } else {
        visitsPerYear = 1;
      }
      const totalVisits = (contractMonths / 12) * visitsPerYear;
      originalContractTotal = totalVisits * baselinePerVisit;
    } else {
      originalContractTotal = monthlyVisits * baselinePerVisit * contractMonths;
    }

    return {
      perVisit: finalPerVisit,
      monthly: finalMonthly,
      annual: finalContractTotal,
      firstVisit: finalPerVisit,
      ongoingMonthly: finalOngoingMonthly,
      contractTotal: finalContractTotal,
      originalContractTotal,
      rawPrice: rawPriceRed,
    };
  }, [
    backendConfig,  
    form.floorAreaSqFt,
    form.ratePerSqFt,
    form.minCharge,
    form.serviceVariant,
    form.frequency,
    form.rateCategory,
    form.contractMonths,
    form.weeksPerMonth,
    form.standardFullRatePerSqFt,
    form.standardFullMinCharge,
    form.noSealantRatePerSqFt,
    form.noSealantMinCharge,
    form.wellMaintainedRatePerSqFt,
    form.wellMaintainedMinCharge,
    form.redRateMultiplier,
    form.greenRateMultiplier,
    form.customPerVisit,
    form.customMonthly,
    form.customOngoingMonthly,
    form.customContractTotal,

    calcFieldsTotal,
    dollarFieldsTotal,
    form.applyMinimum,
  ]);

  return {
    form,
    setForm,
    onChange,
    calc,
    refreshConfig: fetchPricing,
    isLoadingConfig,
    setContractMonths,
  };
}

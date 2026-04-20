
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import { sanipodPricingConfig as cfg } from "./sanipodConfig";
import type {
  SanipodFrequencyKey,
  SanipodRateCategory,
  SanipodServiceRuleKey,
} from "./sanipodTypes";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";


interface BackendSanipodConfig {
  corePricingIncludedWithSaniClean: {
    weeklyPricePerUnit: number;        
    installPricePerUnit: number;       
    includedWeeklyRefills: number;     
  };
  extraBagPricing: {
    pricePerBag: number;               
    refillPackQuantity: number | null; 
  };
  standalonePricingWithoutSaniClean: {
    pricePerUnitPerWeek: number;           
    alternatePricePerUnitPerWeek: number;  
    weeklyMinimumPrice: number;            
    useCheapestOption: boolean;            
  };
  tripChargesStandaloneOnly: {
    standard: number;  
    beltway: number;   
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


function buildActiveConfig(backendConfig: BackendSanipodConfig | null) {

  const defaults = {
    weeklyRatePerUnit: cfg.weeklyRatePerUnit || 3,
    altWeeklyRatePerUnit: cfg.altWeeklyRatePerUnit || 8,
    extraBagPrice: cfg.extraBagPrice || 2,
    installChargePerUnit: cfg.installChargePerUnit || 25,
    standaloneExtraWeeklyCharge: cfg.standaloneExtraWeeklyCharge || 40,
    tripChargePerVisit: cfg.tripChargePerVisit || 0,
    minContractMonths: cfg.minContractMonths || 2,
    maxContractMonths: cfg.maxContractMonths || 36,
    weeksPerMonth: cfg.weeksPerMonth || 4.33,
    weeksPerYear: cfg.weeksPerYear || 52,
    rateCategories: cfg.rateCategories || {
      redRate: { multiplier: 1, commissionRate: "20%" },
      greenRate: { multiplier: 1.3, commissionRate: "25%" }
    }
  };

  if (!backendConfig) {
    console.log('📊 [SaniPod] Using static config fallback values');
    return {
      ...defaults,
      frequencyMultipliers: {
        oneTime: 0,
        weekly: 4.33,
        biweekly: 2.165,
        twicePerMonth: 2,
        monthly: 1.0,
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
        bimonthly: 6,
        quarterly: 4,
        biannual: 2,
        annual: 1,
      }
    };
  }

  console.log('📊 [SaniPod] Building active config from backend:', backendConfig);


  const activeConfig = {

    weeklyRatePerUnit: backendConfig.corePricingIncludedWithSaniClean?.weeklyPricePerUnit ?? defaults.weeklyRatePerUnit,
    installChargePerUnit: backendConfig.corePricingIncludedWithSaniClean?.installPricePerUnit ?? defaults.installChargePerUnit,


    altWeeklyRatePerUnit: backendConfig.standalonePricingWithoutSaniClean?.pricePerUnitPerWeek ?? defaults.altWeeklyRatePerUnit,
    standaloneExtraWeeklyCharge: backendConfig.standalonePricingWithoutSaniClean?.weeklyMinimumPrice ?? defaults.standaloneExtraWeeklyCharge,
    useCheapestOption: backendConfig.standalonePricingWithoutSaniClean?.useCheapestOption ?? true,


    extraBagPrice: backendConfig.extraBagPricing?.pricePerBag ?? defaults.extraBagPrice,


    tripChargePerVisit: backendConfig.tripChargesStandaloneOnly?.standard ?? defaults.tripChargePerVisit,
    tripChargeBeltway: backendConfig.tripChargesStandaloneOnly?.beltway ?? defaults.tripChargePerVisit,


    minContractMonths: backendConfig.minContractMonths ?? defaults.minContractMonths,
    maxContractMonths: backendConfig.maxContractMonths ?? defaults.maxContractMonths,


    rateCategories: backendConfig.rateCategories ?? defaults.rateCategories,


    frequencyMultipliers: {
      oneTime: 0,
      weekly: backendConfig.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? 4.33,
      biweekly: backendConfig.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? 2.165,
      twicePerMonth: 2, 
      monthly: 1.0, 
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
      bimonthly: backendConfig.frequencyMetadata?.bimonthly?.cycleMonths ? 12 / backendConfig.frequencyMetadata.bimonthly.cycleMonths : 6,
      quarterly: backendConfig.frequencyMetadata?.quarterly?.cycleMonths ? 12 / backendConfig.frequencyMetadata.quarterly.cycleMonths : 4,
      biannual: backendConfig.frequencyMetadata?.biannual?.cycleMonths ? 12 / backendConfig.frequencyMetadata.biannual.cycleMonths : 2,
      annual: backendConfig.frequencyMetadata?.annual?.cycleMonths ? 12 / backendConfig.frequencyMetadata.annual.cycleMonths : 1,
    },


    frequencyMetadata: backendConfig.frequencyMetadata,
  };

  console.log('✅ [SaniPod] Active config built:', {
    coreIncludedPricing: {
      weeklyRate: activeConfig.weeklyRatePerUnit,
      installRate: activeConfig.installChargePerUnit,
    },
    standalonePricing: {
      altWeeklyRate: activeConfig.altWeeklyRatePerUnit,
      extraWeeklyCharge: activeConfig.standaloneExtraWeeklyCharge,
      useCheapestOption: activeConfig.useCheapestOption,
    },
    extraBags: {
      pricePerBag: activeConfig.extraBagPrice,
    },
    tripCharges: {
      standard: activeConfig.tripChargePerVisit,
      beltway: activeConfig.tripChargeBeltway,
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

export interface SanipodFormState {
  podQuantity: number;
  extraBagsPerWeek: number;

  extraBagsRecurring: boolean;


  frequency: SanipodFrequencyKey;


  weeklyRatePerUnit: number;        
  altWeeklyRatePerUnit: number;     
  extraBagPrice: number;            
  standaloneExtraWeeklyCharge: number; 

  includeTrip: boolean;
  tripChargePerVisit: number;

  isNewInstall: boolean;
  installQuantity: number;
  installRatePerPod: number;


  customInstallationFee?: number;


  customPerVisitPrice?: number;


  customMonthlyPrice?: number;


  customAnnualPrice?: number;


  customWeeklyPodRate?: number;


  customPodServiceTotal?: number;


  customExtraBagsTotal?: number;

  rateCategory: SanipodRateCategory;


  contractMonths: number;


  isStandalone: boolean;
  notes?: string;
}

export interface SanipodCalcResult {

  perVisit: number;


  monthly: number;


  annual: number;


  installCost: number;


  chosenServiceRule: SanipodServiceRuleKey;


  weeklyPodServiceRed: number;


  firstVisit: number;


  ongoingMonthly: number;


  contractTotal: number;


  adjustedPerVisit: number;


  adjustedMonthly: number;


  adjustedAnnual: number;


  adjustedPodServiceTotal: number;


  adjustedBagsTotal: number;


  effectiveRatePerPod: number;


  minimumChargePerVisit: number;
}

const DEFAULT_FORM_STATE: SanipodFormState = {
  podQuantity: 0,
  extraBagsPerWeek: 0,
  extraBagsRecurring: true,


  weeklyRatePerUnit: cfg.weeklyRatePerUnit,
  altWeeklyRatePerUnit: cfg.altWeeklyRatePerUnit,
  extraBagPrice: cfg.extraBagPrice,
  standaloneExtraWeeklyCharge: cfg.standaloneExtraWeeklyCharge,

  includeTrip: false,
  tripChargePerVisit: cfg.tripChargePerVisit, 

  isNewInstall: false,
  installQuantity: 0,
  installRatePerPod: cfg.installChargePerUnit,

  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",

  contractMonths: cfg.minContractMonths ?? 12,

  isStandalone: true, 
};

export function useSanipodCalc(initialData?: Partial<SanipodFormState>, customFields?: any[]) {

  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);


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

    console.log(`💰 [SANIPOD-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [SANIPOD-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const baselineRatesRef = useRef({
    weeklyRatePerUnit: DEFAULT_FORM_STATE.weeklyRatePerUnit,
    altWeeklyRatePerUnit: DEFAULT_FORM_STATE.altWeeklyRatePerUnit,
    extraBagPrice: DEFAULT_FORM_STATE.extraBagPrice,
    standaloneExtraWeeklyCharge: DEFAULT_FORM_STATE.standaloneExtraWeeklyCharge,
    tripChargePerVisit: DEFAULT_FORM_STATE.tripChargePerVisit,
    installRatePerPod: DEFAULT_FORM_STATE.installRatePerPod,
  });
  const deriveBaselineFromData = (data: Partial<SanipodFormState>) => ({
    weeklyRatePerUnit: data.weeklyRatePerUnit ?? DEFAULT_FORM_STATE.weeklyRatePerUnit,
    altWeeklyRatePerUnit: data.altWeeklyRatePerUnit ?? DEFAULT_FORM_STATE.altWeeklyRatePerUnit,
    extraBagPrice: data.extraBagPrice ?? DEFAULT_FORM_STATE.extraBagPrice,
    standaloneExtraWeeklyCharge:
      data.standaloneExtraWeeklyCharge ?? DEFAULT_FORM_STATE.standaloneExtraWeeklyCharge,
    tripChargePerVisit: data.tripChargePerVisit ?? DEFAULT_FORM_STATE.tripChargePerVisit,
    installRatePerPod: data.installRatePerPod ?? DEFAULT_FORM_STATE.installRatePerPod,
  });
  baselineRatesRef.current = deriveBaselineFromData(initialData || {});
  const calcRef = useRef<SanipodCalcResult | null>(null);

  const [form, setForm] = useState<SanipodFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM_STATE,
      ...initialData,
    };


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


  const [backendConfig, setBackendConfig] = useState<BackendSanipodConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);


  const updateFormWithConfig = (activeConfig: any) => {
    setForm((prev) => {
      const nextWeeklyRate = activeConfig.weeklyRatePerUnit ?? prev.weeklyRatePerUnit;
      const nextAltWeeklyRate = activeConfig.altWeeklyRatePerUnit ?? prev.altWeeklyRatePerUnit;
      const nextExtraBagPrice = activeConfig.extraBagPrice ?? prev.extraBagPrice;
      const nextStandaloneExtra = activeConfig.standaloneExtraWeeklyCharge ?? prev.standaloneExtraWeeklyCharge;
      const nextTripCharge = activeConfig.tripChargePerVisit ?? prev.tripChargePerVisit;
      const nextInstallRate = activeConfig.installChargePerUnit ?? prev.installRatePerPod;
      baselineRatesRef.current = {
        weeklyRatePerUnit: nextWeeklyRate,
        altWeeklyRatePerUnit: nextAltWeeklyRate,
        extraBagPrice: nextExtraBagPrice,
        standaloneExtraWeeklyCharge: nextStandaloneExtra,
        tripChargePerVisit: nextTripCharge,
        installRatePerPod: nextInstallRate,
      };

      return {
        ...prev,

        weeklyRatePerUnit: nextWeeklyRate,
        altWeeklyRatePerUnit: nextAltWeeklyRate,
        extraBagPrice: nextExtraBagPrice,
        standaloneExtraWeeklyCharge: nextStandaloneExtra,
        installRatePerPod: nextInstallRate,
        tripChargePerVisit: nextTripCharge,

        customInstallationFee: undefined,
        customPerVisitPrice: undefined,
        customMonthlyPrice: undefined,
        customAnnualPrice: undefined,
        customWeeklyPodRate: undefined,
        customPodServiceTotal: undefined,
        customExtraBagsTotal: undefined,
      };
    });
  };


  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("sanipod");
        if (backendData?.config) {
          console.log('✅ [SaniPod] Using cached pricing data from context');
          const config = backendData.config as BackendSanipodConfig;


          const activeConfig = buildActiveConfig(config);

          setBackendConfig(config);
          updateFormWithConfig(activeConfig);


          if (forceRefresh) {
            console.log('🔄 [SANIPOD] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              customExtraBagPrice: undefined,
              customInstallRatePerPod: undefined,
              customPodWeeklyPrice: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthTotal: undefined,
              customContractTotal: undefined,
            }));
          }

          console.log('✅ SaniPod CONFIG loaded from context:', {
            podSizes: activeConfig.podSizes,
            extraBagPrice: activeConfig.extraBagPrice,
            installCharge: activeConfig.installChargePerUnit,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for SaniPod, using static fallback values');
    } catch (error: any) {
      console.error('❌ Failed to fetch SaniPod config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("sanipod");
        if (fallbackConfig?.config) {
          console.log('✅ [SaniPod] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendSanipodConfig;


          const activeConfig = buildActiveConfig(config);

          setBackendConfig(config);
          updateFormWithConfig(activeConfig);


          if (forceRefresh) {
            console.log('🔄 [SANIPOD] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              customExtraBagPrice: undefined,
              customInstallRatePerPod: undefined,
              customPodWeeklyPrice: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthTotal: undefined,
              customContractTotal: undefined,
            }));
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

    if (initialData) {
      console.log('📋 [SANIPOD-PRICING] Skipping price fetch - using saved historical prices from initialData');
      return;
    }

    console.log('📋 [SANIPOD-PRICING] Fetching current prices - new service or no initial data');
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
    const backendConfigEntry = servicesContext?.getBackendPricingForService("sanipod");
    if (backendConfigEntry?.config) {
      const activeConfig = buildActiveConfig(
        backendConfigEntry.config as BackendSanipodConfig
      );
      baselineRatesRef.current = {
        extraBagPrice: activeConfig.extraBagPrice,
        installRatePerPod: activeConfig.installChargePerUnit,
      };
    }
  }, [servicesContext?.getBackendPricingForService, servicesContext?.backendPricingData]);


  useEffect(() => {
    const isServiceActive = (form.podQuantity || 0) > 0;
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
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.podQuantity, servicesContext]);


  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number | undefined,
    newValue: number | undefined
  ) => {
    if (typeof newValue !== "number" || Number.isNaN(newValue) || newValue <= 0) {
      return;
    }

    const fallbackValues: Record<string, number | undefined> = {
      ...baselineRatesRef.current,
      customWeeklyPodRate: calcRef.current?.effectiveRatePerPod,
      customPodServiceTotal: calcRef.current?.adjustedPodServiceTotal,
      customExtraBagsTotal: calcRef.current?.adjustedBagsTotal,
      customInstallationFee: calcRef.current?.installCost,
      customPerVisitPrice: calcRef.current?.adjustedPerVisit,
      customMonthlyPrice: calcRef.current?.adjustedMonthly,
      customAnnualPrice: calcRef.current?.contractTotal,
    };

    const fallbackValue = fallbackValues[fieldName];
    let resolvedOriginal = originalValue;
    if ((resolvedOriginal === undefined || resolvedOriginal === null || resolvedOriginal === 0) &&
        fallbackValue !== undefined) {
      resolvedOriginal = fallbackValue;
    }
    if (resolvedOriginal === undefined || resolvedOriginal === newValue) {
      return;
    }

    addPriceChange({
      productKey: `sanipod_${fieldName}`,
      productName: `SaniPod - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue: resolvedOriginal,
      newValue,
      quantity: form.podQuantity || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [SANIPOD-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: resolvedOriginal,
      to: newValue,
      change: newValue - resolvedOriginal,
      changePercent: resolvedOriginal ? ((newValue - resolvedOriginal) / resolvedOriginal * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.podQuantity, form.frequency]);


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

      const originalValue = prev[name as keyof SanipodFormState];

      const next: SanipodFormState = { ...prev };

      if (type === "checkbox") {
        (next as any)[name] = t.checked;
      } else if (
        name === "customInstallationFee" ||
        name === "customPerVisitPrice" ||
        name === "customMonthlyPrice" ||
        name === "customAnnualPrice" ||
        name === "customWeeklyPodRate" ||
        name === "customPodServiceTotal" ||
        name === "customExtraBagsTotal"
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
        const num = raw === "" ? 0 : parseFloat(raw);
        (next as any)[name] =
          Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        (next as any)[name] = t.value;
      }


      if (name === "frequency") {
        next.frequency = t.value as SanipodFrequencyKey;
      }


      const pricingFields = [
        'weeklyRatePerUnit', 'altWeeklyRatePerUnit', 'extraBagPrice',
        'standaloneExtraWeeklyCharge', 'tripChargePerVisit', 'installRatePerPod',
        'customInstallationFee', 'customPerVisitPrice', 'customMonthlyPrice',
        'customAnnualPrice', 'customWeeklyPodRate', 'customPodServiceTotal', 'customExtraBagsTotal'
      ];

      if (pricingFields.includes(name)) {
        const newValue = (next as any)[name] as number | undefined;
        addServiceFieldChange(name, originalValue as number | undefined, newValue);
      }


      return next;
    });
  };

  const calc: SanipodCalcResult = useMemo(() => {

    const activeConfig = buildActiveConfig(backendConfig);

    const pods = Math.max(0, Number(form.podQuantity) || 0);
    const bags = Math.max(0, Number(form.extraBagsPerWeek) || 0);
    const installQtyRaw = Math.max(0, Number(form.installQuantity) || 0);

    const anyActivity =
      pods > 0 ||
      bags > 0 ||
      (form.isNewInstall && installQtyRaw > 0);

    if (!anyActivity) {
      return {
        perVisit: 0,
        monthly: 0,
        annual: 0,
        installCost: 0,
        chosenServiceRule: "perPod8",
        weeklyPodServiceRed: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
        adjustedPerVisit: 0,
        adjustedMonthly: 0,
        adjustedAnnual: 0,
        adjustedPodServiceTotal: 0,
        adjustedBagsTotal: 0,
        effectiveRatePerPod: 0,
      };
    }


    const rateCfg = activeConfig.rateCategories[form.rateCategory] ?? activeConfig.rateCategories.redRate;


    const tripPerVisit = 0;

    const installRate =
      form.installRatePerPod > 0
        ? form.installRatePerPod
        : activeConfig.installChargePerUnit;  


    const weeklyBagsRed = form.extraBagsRecurring
      ? bags * form.extraBagPrice
      : 0;

    const oneTimeBagsCost = form.extraBagsRecurring
      ? 0
      : bags * form.extraBagPrice;


    const weeklyRatePerUnit = Number(form.weeklyRatePerUnit) || 0;
    const standaloneCharge = Number(form.standaloneExtraWeeklyCharge) || 0;
    const customPodRate = form.customWeeklyPodRate !== undefined
      ? Number(form.customWeeklyPodRate)
      : undefined;
    const effectiveOptAPerPodRate = (customPodRate ?? Number(form.altWeeklyRatePerUnit)) || 0;
    const weeklyPodOptA_Red = form.customPodServiceTotal !== undefined
      ? form.customPodServiceTotal
      : pods * effectiveOptAPerPodRate;
    const weeklyPodOptB_Red =
      pods * weeklyRatePerUnit + standaloneCharge;

    const weeklyServiceOptA_Red = weeklyPodOptA_Red + weeklyBagsRed;
    const weeklyServiceOptB_Red = weeklyPodOptB_Red + weeklyBagsRed;

    console.log('[SANIPOD-VALUES]', {
      weeklyPodOptA_Red,
      weeklyPodOptB_Red,
      weeklyServiceOptA_Red,
      weeklyServiceOptB_Red,
      weeklyBagsRed,
      weeklyRatePerUnit: Number(form.weeklyRatePerUnit),
      standaloneExtraWeeklyCharge: Number(form.standaloneExtraWeeklyCharge),
      bags,
      pods
    });

    const serviceRuleSelection = form.serviceRule || "auto";
    const applyStandaloneMinimum = (value: number) => {
      if (form.isStandalone) {
        return Math.max(value, standaloneCharge);
      }
      return value;
    };

    const optionATotalBeforeMin = weeklyServiceOptA_Red * rateCfg.multiplier;
    const optionBTotalBeforeMin = weeklyServiceOptB_Red * rateCfg.multiplier;
    const optionATotalWithMin = applyStandaloneMinimum(optionATotalBeforeMin);
    const optionBTotalWithMin = applyStandaloneMinimum(optionBTotalBeforeMin);

    let usingOptA: boolean;
    if (serviceRuleSelection === "perPod8") {
      usingOptA = true;
    } else if (serviceRuleSelection === "perPod3Plus40") {
      usingOptA = false;
    } else {
      usingOptA = optionATotalWithMin <= optionBTotalWithMin;
    }

    const weeklyServiceRed = usingOptA
      ? weeklyServiceOptA_Red
      : weeklyServiceOptB_Red;

    const weeklyPodServiceRed = usingOptA
      ? weeklyPodOptA_Red
      : weeklyPodOptB_Red;

    const chosenServiceRule: SanipodServiceRuleKey = usingOptA
      ? "perPod8"
      : "perPod3Plus40";

    console.log(' [SANIPOD-RULE]',
      {usingOptA, chosenServiceRule, optionATotalBeforeMin, optionBTotalBeforeMin, optionATotalWithMin, optionBTotalWithMin}
    );

    const weeklyServiceBeforeMinimum = usingOptA
      ? optionATotalBeforeMin
      : optionBTotalBeforeMin;

    const weeklyService = usingOptA
      ? optionATotalWithMin
      : optionBTotalWithMin;

    console.log(`💰 [SANIPOD-MINIMUM] Applying minimum charge check:`, {
      isStandalone: form.isStandalone,
      beforeMinimum: weeklyServiceBeforeMinimum.toFixed(2),
      minimum: form.standaloneExtraWeeklyCharge,
      afterMinimum: weeklyService.toFixed(2),
      minimumApplied: form.isStandalone && weeklyServiceBeforeMinimum < form.standaloneExtraWeeklyCharge
    });


    const perVisitService = weeklyService;
    const perVisit = perVisitService + tripPerVisit; 


    const installQty = form.isNewInstall ? installQtyRaw : 0;
    const calculatedInstallOnlyCost = installQty * installRate;


    const installOnlyCost = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOnlyCost;


    const servicePods = Math.max(0, pods - installQty);

    let firstVisitServiceCost = 0;
    if (servicePods > 0) {
      if (usingOptA) {

        const perPodRate = form.altWeeklyRatePerUnit;
        firstVisitServiceCost = servicePods * perPodRate * rateCfg.multiplier;
      } else {

        const optBServiceCost = (servicePods * form.weeklyRatePerUnit) + form.standaloneExtraWeeklyCharge;
        firstVisitServiceCost = optBServiceCost * rateCfg.multiplier;
      }
    }


    const firstVisitBagsCost = bags > 0 ? (bags * form.extraBagPrice * rateCfg.multiplier) : 0;


    const firstVisit = installOnlyCost + firstVisitServiceCost + firstVisitBagsCost;
    const installCost = installOnlyCost;


    const selectedFrequency = form.frequency || "weekly";
    const monthlyVisits = activeConfig.frequencyMultipliers[selectedFrequency];


    const isVisitBasedFrequency = selectedFrequency === "oneTime" || selectedFrequency === "quarterly" ||
      selectedFrequency === "biannual" || selectedFrequency === "annual" || selectedFrequency === "bimonthly";


    let firstMonth;

    if (selectedFrequency === "oneTime") {

      firstMonth = firstVisit;
    } else if (isVisitBasedFrequency) {

      firstMonth = firstVisit;
    } else if (selectedFrequency === "monthly") {

      firstMonth = firstVisit;
    } else {


      firstMonth = firstVisit + Math.max(monthlyVisits - 1, 0) * perVisit;
    }


    const ongoingMonthly = monthlyVisits * perVisit;


    const minMonths = activeConfig.minContractMonths;
    const maxMonths = activeConfig.maxContractMonths;
    const rawMonths = Number(form.contractMonths) || minMonths;
    const contractMonths = Math.min(
      Math.max(rawMonths, minMonths),
      maxMonths
    );


    let contractTotal: number;
    if (selectedFrequency === "oneTime") {

      contractTotal = firstVisit;
    } else if (isVisitBasedFrequency) {

      const visitsPerYear = activeConfig.annualFrequencies[selectedFrequency];
      const totalVisits = (contractMonths / 12) * visitsPerYear;


      if (form.isNewInstall && installQty > 0) {

        const serviceVisits = Math.max(totalVisits - 1, 0);
        contractTotal = firstVisit + (serviceVisits * perVisit);
      } else {

        contractTotal = totalVisits * perVisit;
      }
    } else {

      if (contractMonths <= 0) {
        contractTotal = 0;
      } else {
        contractTotal = firstMonth + Math.max(contractMonths - 1, 0) * ongoingMonthly;
      }
    }


    const effectiveRatePerPod = pods > 0 ? weeklyPodServiceRed / pods : 0;


    const bagLineAmount = bags * form.extraBagPrice;


    const adjustedPodServiceTotal = form.customPodServiceTotal !== undefined
      ? form.customPodServiceTotal
      : (pods > 0 ? (form.customWeeklyPodRate !== undefined ? form.customWeeklyPodRate : effectiveRatePerPod) * pods : 0);


    const adjustedBagsTotal = form.customExtraBagsTotal !== undefined
      ? form.customExtraBagsTotal
      : bagLineAmount;


    const adjustedPerVisitBeforeMinimum = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : (adjustedPodServiceTotal + (form.extraBagsRecurring ? adjustedBagsTotal : 0)) * rateCfg.multiplier;


    const adjustedPerVisit = form.isStandalone
      ? Math.max(adjustedPerVisitBeforeMinimum, form.standaloneExtraWeeklyCharge)
      : adjustedPerVisitBeforeMinimum;

    console.log(`💰 [SANIPOD-ADJUSTED-MINIMUM] Applying minimum to adjusted per visit:`, {
      isStandalone: form.isStandalone,
      beforeMinimum: adjustedPerVisitBeforeMinimum.toFixed(2),
      minimum: form.standaloneExtraWeeklyCharge,
      afterMinimum: adjustedPerVisit.toFixed(2),
      minimumApplied: form.isStandalone && adjustedPerVisitBeforeMinimum < form.standaloneExtraWeeklyCharge
    });


    let adjustedFirstVisitServiceCost = 0;
    if (servicePods > 0 && installQty > 0) {

      const effectiveRateForServicePods = form.customWeeklyPodRate !== undefined
        ? form.customWeeklyPodRate
        : effectiveRatePerPod;

      if (usingOptA) {

        adjustedFirstVisitServiceCost = servicePods * effectiveRateForServicePods * rateCfg.multiplier;
      } else {

        const optBServiceCost = (servicePods * form.weeklyRatePerUnit) + form.standaloneExtraWeeklyCharge;
        adjustedFirstVisitServiceCost = optBServiceCost * rateCfg.multiplier;
      }
    }


    const weeksPerMonthCalc = monthlyVisits;  
    const oneTimeBagsCostCalc = form.extraBagsRecurring ? 0 : adjustedBagsTotal;
    const installCostCalc = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : installOnlyCost;


    let adjustedFirstVisitTotal;
    if (installQty > 0) {

      const adjustedFirstVisitBags = bags > 0 ? adjustedBagsTotal * rateCfg.multiplier : 0;
      adjustedFirstVisitTotal = installCostCalc + adjustedFirstVisitServiceCost + adjustedFirstVisitBags;
    } else {

      adjustedFirstVisitTotal = adjustedPerVisit + oneTimeBagsCostCalc;
    }

    const adjustedMonthly = form.customMonthlyPrice !== undefined
      ? form.customMonthlyPrice
      : selectedFrequency === "oneTime" || isVisitBasedFrequency || selectedFrequency === "monthly"
        ? adjustedFirstVisitTotal
        : adjustedFirstVisitTotal + Math.max(monthlyVisits - 1, 0) * adjustedPerVisit;


    const ongoingMonthlyCalc = weeksPerMonthCalc * adjustedPerVisit;

    let adjustedAnnualBeforeCustomFields: number;
    if (form.customAnnualPrice !== undefined) {
      adjustedAnnualBeforeCustomFields = form.customAnnualPrice;
    } else if (selectedFrequency === "oneTime") {

      adjustedAnnualBeforeCustomFields = adjustedFirstVisitTotal;
    } else if (isVisitBasedFrequency) {

      const visitsPerYear = activeConfig.annualFrequencies[selectedFrequency];
      const totalVisits = (contractMonths / 12) * visitsPerYear;

      if (form.isNewInstall && installQty > 0) {

        const serviceVisits = Math.max(totalVisits - 1, 0);
        adjustedAnnualBeforeCustomFields = adjustedFirstVisitTotal + (serviceVisits * adjustedPerVisit);
      } else {

        adjustedAnnualBeforeCustomFields = totalVisits * adjustedPerVisit;
      }
    } else {

      if (contractMonths <= 0) {
        adjustedAnnualBeforeCustomFields = 0;
      } else {
        adjustedAnnualBeforeCustomFields = adjustedMonthly + Math.max(contractMonths - 1, 0) * ongoingMonthlyCalc;
      }
    }


    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const adjustedAnnual = adjustedAnnualBeforeCustomFields + customFieldsTotal;
    const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

    console.log(`📊 [SANIPOD-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotal.toFixed(2),
      adjustedBeforeCustomFields: adjustedAnnualBeforeCustomFields.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalAdjustedAnnual: adjustedAnnual.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });

    return {
      perVisit,
      monthly: firstMonth,
      annual: contractTotalWithCustomFields, 
      installCost,
      chosenServiceRule,
      weeklyPodServiceRed,
      firstVisit,
      ongoingMonthly: ongoingMonthlyCalc, 
      contractTotal: contractTotalWithCustomFields, 
      adjustedPerVisit,
      adjustedMonthly,
      adjustedAnnual, 
      adjustedPodServiceTotal,
      adjustedBagsTotal,
      effectiveRatePerPod,

      minimumChargePerVisit: form.isStandalone ? form.standaloneExtraWeeklyCharge : 0,
    };
  }, [
    backendConfig,  
    form.podQuantity,
    form.extraBagsPerWeek,
    form.extraBagsRecurring,
    form.weeklyRatePerUnit,
    form.altWeeklyRatePerUnit,
    form.extraBagPrice,
    form.standaloneExtraWeeklyCharge,
    form.includeTrip,
    form.tripChargePerVisit,
    form.isNewInstall,
    form.installQuantity,
    form.installRatePerPod,
    form.customInstallationFee,
    form.frequency,
    form.rateCategory,
    form.contractMonths,
    form.isStandalone,
    form.customWeeklyPodRate,
    form.customPodServiceTotal,
    form.customExtraBagsTotal,
    form.customPerVisitPrice,
    form.customMonthlyPrice,
    form.customAnnualPrice,

    calcFieldsTotal,
    dollarFieldsTotal,
  ]);

  calcRef.current = calc;

  return {
    form,
    setForm,
    onChange,
    calc,
    refreshConfig: fetchPricing,
    isLoadingConfig,
    setContractMonths,
    baselineRates: baselineRatesRef.current,
  };
}

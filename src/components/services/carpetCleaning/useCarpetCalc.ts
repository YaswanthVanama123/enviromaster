import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type { CarpetFormState, CarpetFrequency } from "./carpetTypes";
import {
  carpetPricingConfig as cfg,
  carpetFrequencyList,
} from "./carpetConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";


interface BackendCarpetConfig {
  baseSqFtUnit: number;
  basePrice: number;
  additionalSqFtUnit: number;
  additionalUnitPrice: number;
  minimumChargePerVisit: number;
  installationMultipliers: {
    dirtyInstallMultiplier: number;
    cleanInstallMultiplier: number;
  };
  frequencyMetadata: {
    weekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    biweekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    monthly?: { cycleMonths: number };
    bimonthly?: { cycleMonths: number };
    quarterly?: { cycleMonths: number };
    biannual?: { cycleMonths: number };
    annual?: { cycleMonths: number };
  };
  minContractMonths: number;
  maxContractMonths: number;
}

const DEFAULT_FORM: CarpetFormState = {
  serviceId: "carpetCleaning",
  areaSqFt: 0,
  useExactSqft: true,  
  frequency: "monthly",
  location: "insideBeltway",
  needsParking: false,
  tripChargeIncluded: true, 
  notes: "",
  contractMonths: 12,
  includeInstall: false,
  isDirtyInstall: false,


  unitSqFt: cfg.unitSqFt,
  firstUnitRate: cfg.firstUnitRate,
  additionalUnitRate: cfg.additionalUnitRate,
  perVisitMinimum: cfg.perVisitMinimum,
  installMultiplierDirty: cfg.installMultipliers.dirty,
  installMultiplierClean: cfg.installMultipliers.clean,
  applyMinimum: true,
};


function transformBackendFrequencyMeta(backendMeta: BackendCarpetConfig['frequencyMetadata'] | undefined) {
  if (!backendMeta) {
    console.warn('⚠️ No backend frequencyMetadata available, using static fallback values');
    return cfg.frequencyMeta;
  }

  console.log('🔧 [Carpet] Transforming backend frequencyMetadata:', backendMeta);


  const transformedMeta: any = {};


  if (backendMeta.weekly) {
    transformedMeta.weekly = {
      monthlyMultiplier: backendMeta.weekly.monthlyRecurringMultiplier,
      firstMonthExtraMultiplier: backendMeta.weekly.firstMonthExtraMultiplier,
      visitsPerYear: Math.round(backendMeta.weekly.monthlyRecurringMultiplier * 12),
      annualMultiplier: Math.round(backendMeta.weekly.monthlyRecurringMultiplier * 12),
    };
  }

  if (backendMeta.biweekly) {
    transformedMeta.biweekly = {
      monthlyMultiplier: backendMeta.biweekly.monthlyRecurringMultiplier,
      firstMonthExtraMultiplier: backendMeta.biweekly.firstMonthExtraMultiplier,
      visitsPerYear: Math.round(backendMeta.biweekly.monthlyRecurringMultiplier * 12),
      annualMultiplier: Math.round(backendMeta.biweekly.monthlyRecurringMultiplier * 12),
    };
  }


  const cycleBased = ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'] as const;

  for (const freq of cycleBased) {
    const backendFreqData = backendMeta[freq];
    if (backendFreqData?.cycleMonths) {
      const cycleMonths = backendFreqData.cycleMonths;
      const visitsPerYear = 12 / cycleMonths; 
      const monthlyMultiplier = visitsPerYear / 12; 

      transformedMeta[freq] = {
        cycleMonths,
        monthlyMultiplier,
        visitsPerYear,
        annualMultiplier: visitsPerYear,
      };
    }
  }


  const finalMeta = {
    ...cfg.frequencyMeta, 
    ...transformedMeta,   
  };

  console.log('✅ [Carpet] Transformed frequencyMetadata:', finalMeta);
  return finalMeta;
}

function clampFrequency(f: string): CarpetFrequency {
  return carpetFrequencyList.includes(f as CarpetFrequency)
    ? (f as CarpetFrequency)
    : "monthly";
}

function clampContractMonths(value: unknown): number {
  const num = parseInt(String(value), 10);
  if (!Number.isFinite(num)) return 12;
  if (num < 2) return 2;
  if (num > 36) return 36;
  return num;
}

export function useCarpetCalc(initial?: Partial<CarpetFormState>, customFields?: any[]) {

  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);
  const isEditMode = useRef(!!initial); 


  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);


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

    console.log(`💰 [CARPET-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [CARPET-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [form, setForm] = useState<CarpetFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM,
      ...initial,
    };


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


  const [backendConfig, setBackendConfig] = useState<BackendCarpetConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);


  const updateFormWithConfig = (config: BackendCarpetConfig, forceUpdate: boolean = false) => {


    if (initial && !forceUpdate) {
      console.log('📋 [CARPET] Edit mode: Skipping form update to preserve loaded values');
      return; 
    }

    console.log('📋 [CARPET] Updating form with backend config', forceUpdate ? '(FORCED by refresh button)' : '');
    setForm((prev) => ({
      ...prev,

      unitSqFt: config.baseSqFtUnit ?? prev.unitSqFt,
      firstUnitRate: config.basePrice ?? prev.firstUnitRate,
      additionalUnitRate: config.additionalUnitPrice ?? prev.additionalUnitRate,
      perVisitMinimum: config.minimumChargePerVisit ?? prev.perVisitMinimum,
      installMultiplierDirty: config.installationMultipliers?.dirtyInstallMultiplier ?? prev.installMultiplierDirty,
      installMultiplierClean: config.installationMultipliers?.cleanInstallMultiplier ?? prev.installMultiplierClean,
    }));
  };


  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("carpetCleaning");
        if (backendData?.config) {
          console.log('✅ [Carpet Cleaning] Using cached pricing data from context');
          const config = backendData.config as BackendCarpetConfig;
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [CARPET] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              customFirstUnitRate: undefined,
              customAdditionalUnitRate: undefined,
              customPerVisitMinimum: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthPrice: undefined,
              customContractTotal: undefined,
              customInstallationFee: undefined,
            }));
          }

          console.log('✅ Carpet Cleaning CONFIG loaded from context:', {
            baseSqFtUnit: config.baseSqFtUnit,
            basePrice: config.basePrice,
            additionalUnitPrice: config.additionalUnitPrice,
            minimumChargePerVisit: config.minimumChargePerVisit,
            installationMultipliers: config.installationMultipliers,
            frequencyMetadata: config.frequencyMetadata,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for Carpet Cleaning, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch Carpet Cleaning config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("carpetCleaning");
        if (fallbackConfig?.config) {
          console.log('✅ [Carpet Cleaning] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendCarpetConfig;
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [CARPET] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              customFirstUnitRate: undefined,
              customAdditionalUnitRate: undefined,
              customPerVisitMinimum: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthPrice: undefined,
              customContractTotal: undefined,
              customInstallationFee: undefined,
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

    console.log('📋 [CARPET-PRICING] Fetching backend config (initial load, will not overwrite edit mode values)');
    fetchPricing(false); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!backendConfig) return;


    if (!baselineInitialized.current) {
      baselineInitialized.current = true;


      baselineValues.current = {
        firstUnitRate: initial?.firstUnitRate ?? backendConfig.basePrice,
        additionalUnitRate: initial?.additionalUnitRate ?? backendConfig.additionalUnitPrice,
        perVisitMinimum: initial?.perVisitMinimum ?? backendConfig.minimumChargePerVisit,
        installMultiplierDirty: initial?.installMultiplierDirty ?? backendConfig.installationMultipliers?.dirtyInstallMultiplier,
        installMultiplierClean: initial?.installMultiplierClean ?? backendConfig.installationMultipliers?.cleanInstallMultiplier,
      };

      console.log('✅ [CARPET-BASELINE] Initialized baseline values for logging:', {
        firstUnitRate: baselineValues.current.firstUnitRate,
        additionalUnitRate: baselineValues.current.additionalUnitRate,
        perVisitMinimum: baselineValues.current.perVisitMinimum,
        note: initial ? 'Edit mode: using loaded/saved values' : 'New document: using backend defaults'
      });


      if (initial) {
        console.log('🔍 [CARPET-PRICING] Detecting price overrides for yellow highlighting...');


        const hasFirstUnitRateOverride = initial.firstUnitRate !== undefined &&
                                          initial.firstUnitRate !== backendConfig.basePrice;
        const hasAdditionalUnitRateOverride = initial.additionalUnitRate !== undefined &&
                                               initial.additionalUnitRate !== backendConfig.additionalUnitPrice;
        const hasPerVisitMinimumOverride = initial.perVisitMinimum !== undefined &&
                                            initial.perVisitMinimum !== backendConfig.minimumChargePerVisit;

        if (hasFirstUnitRateOverride || hasAdditionalUnitRateOverride || hasPerVisitMinimumOverride) {
          setForm(prev => ({
            ...prev,

            customFirstUnitRate: hasFirstUnitRateOverride ? initial.firstUnitRate : prev.customFirstUnitRate,
            customAdditionalUnitRate: hasAdditionalUnitRateOverride ? initial.additionalUnitRate : prev.customAdditionalUnitRate,
            customPerVisitMinimum: hasPerVisitMinimumOverride ? initial.perVisitMinimum : prev.customPerVisitMinimum,
          }));

          console.log('✅ [CARPET-PRICING] Set custom override fields for yellow highlighting:', {
            customFirstUnitRate: hasFirstUnitRateOverride ? initial.firstUnitRate : 'none',
            customAdditionalUnitRate: hasAdditionalUnitRateOverride ? initial.additionalUnitRate : 'none',
            customPerVisitMinimum: hasPerVisitMinimumOverride ? initial.perVisitMinimum : 'none',
          });
        } else {
          console.log('ℹ️ [CARPET-PRICING] No price overrides detected - using backend defaults');
        }
      }
    }
  }, [backendConfig, initial]);


  useEffect(() => {

    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);


  useEffect(() => {
    const isServiceActive = (form.areaSqFt || 0) > 0;
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
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.areaSqFt, servicesContext]);


  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `carpetCleaning_${fieldName}`,
      productName: `Carpet Cleaning - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.sqFt || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [CARPET-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.sqFt, form.frequency]);


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
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {

      const originalValue = prev[name as keyof CarpetFormState];

      let newFormState = prev;

      switch (name as keyof CarpetFormState) {
        case "areaSqFt": {
          const num = parseFloat(String(value));
          const newValue = Number.isFinite(num) && num > 0 ? num : 0;
          newFormState = {
            ...prev,
            areaSqFt: newValue,
          };
          break;
        }


        case "unitSqFt":
        case "firstUnitRate":
        case "additionalUnitRate":
        case "perVisitMinimum":
        case "installMultiplierDirty":
        case "installMultiplierClean": {
          const num = parseFloat(String(value));
          if (Number.isFinite(num) && num >= 0) {
            newFormState = {
              ...prev,
              [name]: num,
            };
          } else {
            newFormState = prev;
          }
          break;
        }


        case "customFirstUnitRate":
        case "customAdditionalUnitRate":
        case "customPerVisitMinimum":
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customFirstMonthPrice":
        case "customContractTotal":
        case "customInstallationFee": {
          const numVal = value === '' ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            newFormState = { ...prev, [name]: numVal };
          } else {
            newFormState = prev;
          }
          break;
        }

        case "frequency":
          newFormState = {
            ...prev,
            frequency: clampFrequency(String(value)),
          };
          break;

        case "contractMonths":
          newFormState = {
            ...prev,
            contractMonths: clampContractMonths(value),
          };
          break;

        case "needsParking":
        case "tripChargeIncluded":
        case "includeInstall":
        case "isDirtyInstall":
        case "useExactSqft":
        case "applyMinimum":
          newFormState = {
            ...prev,
            [name]: type === "checkbox" ? !!checked : Boolean(value),
          };
          break;

        case "location":
          newFormState = {
            ...prev,
            location:
              value === "outsideBeltway" ? "outsideBeltway" : "insideBeltway",
          };
          break;

        case "notes":
          newFormState = {
            ...prev,
            notes: String(value ?? ""),
          };
          break;

        default:
          newFormState = prev;
          break;
      }


      const baseEditableFields = [
        'unitSqFt', 'firstUnitRate', 'additionalUnitRate', 'perVisitMinimum',
        'installMultiplierDirty', 'installMultiplierClean'
      ];


      const customOverrideFields = [
        'customFirstUnitRate', 'customAdditionalUnitRate', 'customPerVisitMinimum',
        'customPerVisitPrice', 'customMonthlyRecurring', 'customFirstMonthPrice',
        'customContractTotal', 'customInstallationFee'
      ];

      const allPricingFields = [...baseEditableFields, ...customOverrideFields];

      if (allPricingFields.includes(name)) {
        const newValue = newFormState[name as keyof CarpetFormState] as number | undefined;


        let baselineValue = baselineValues.current[name];


        if (baselineValue === undefined && name.startsWith('custom')) {
          const baseFieldMap: Record<string, string> = {
            'customFirstUnitRate': 'firstUnitRate',
            'customAdditionalUnitRate': 'additionalUnitRate',
            'customPerVisitMinimum': 'perVisitMinimum',
          };

          const baseFieldName = baseFieldMap[name];
          if (baseFieldName) {
            baselineValue = baselineValues.current[baseFieldName];
          }
        }


        if (newValue !== undefined && baselineValue !== undefined &&
            typeof newValue === 'number' && typeof baselineValue === 'number' &&
            newValue !== baselineValue) {
          console.log(`📝 [CARPET-BASELINE-LOG] Logging change for ${name}:`, {
            baseline: baselineValue,
            newValue,
            change: newValue - baselineValue,
            note: 'Always comparing to baseline (not previous value)'
          });
          addServiceFieldChange(name, baselineValue, newValue);
        }
      }


      const allFormFields = [

        'rooms', 'totalSqFt', 'contractMonths',

        'frequency', 'dirtLevel', 'rateTier',

        'needsStainProtection'
      ];


      if (allFormFields.includes(name)) {
        logServiceFieldChanges(
          'carpetCleaning',
          'Carpet Cleaning',
          { [name]: newFormState[name as keyof CarpetFormState] },
          { [name]: originalValue },
          [name],
          newFormState.rooms || 1,
          newFormState.frequency || 'monthly'
        );
      }

      return newFormState;
    });
  };

  const {
    perVisitBase,
    perVisitCharge,
    monthlyTotal,
    contractTotal,
    originalContractTotal,
    visitsPerYear,
    visitsPerMonth,
    perVisitTrip,
    monthlyTrip,
    installOneTime,
    firstMonthTotal,
    perVisitEffective,
    frequency,
    isVisitBasedFrequency,
    monthsPerVisit,
    totalVisitsForContract,
  } = useMemo(() => {


    const baseConfig = backendConfig ? {
      unitSqFt: backendConfig.baseSqFtUnit ?? cfg.unitSqFt,
      firstUnitRate: backendConfig.basePrice ?? cfg.firstUnitRate,
      additionalUnitRate: backendConfig.additionalUnitPrice ?? cfg.additionalUnitRate,
      perVisitMinimum: backendConfig.minimumChargePerVisit ?? cfg.perVisitMinimum,
      installMultipliers: {
        dirty: backendConfig.installationMultipliers?.dirtyInstallMultiplier ?? cfg.installMultipliers.dirty,
        clean: backendConfig.installationMultipliers?.cleanInstallMultiplier ?? cfg.installMultipliers.clean,
      },

      frequencyMeta: transformBackendFrequencyMeta(backendConfig.frequencyMetadata),
    } : {
      unitSqFt: cfg.unitSqFt,
      firstUnitRate: cfg.firstUnitRate,
      additionalUnitRate: cfg.additionalUnitRate,
      perVisitMinimum: cfg.perVisitMinimum,
      installMultipliers: cfg.installMultipliers,
      frequencyMeta: cfg.frequencyMeta,
    };


    const activeConfig = {
      unitSqFt: baseConfig.unitSqFt,
      firstUnitRate: form.customFirstUnitRate ?? form.firstUnitRate ?? baseConfig.firstUnitRate,
      additionalUnitRate: form.customAdditionalUnitRate ?? form.additionalUnitRate ?? baseConfig.additionalUnitRate,
      perVisitMinimum: form.customPerVisitMinimum ?? form.perVisitMinimum ?? baseConfig.perVisitMinimum,
      installMultipliers: {

        dirty: form.installMultiplierDirty ?? baseConfig.installMultipliers.dirty,
        clean: form.installMultiplierClean ?? baseConfig.installMultipliers.clean,
      },
      frequencyMeta: baseConfig.frequencyMeta,
    };

    const freq = clampFrequency(form.frequency);


    const conv = activeConfig.frequencyMeta[freq];
    let monthlyVisits = 1;
    let visitsPerYear = 12;

    if (conv) {

      if (conv.monthlyMultiplier !== undefined) {
        monthlyVisits = conv.monthlyMultiplier;
        visitsPerYear = conv.visitsPerYear || conv.annualMultiplier || (monthlyVisits * 12);
      } else if (conv.cycleMonths !== undefined) {

        visitsPerYear = 12 / conv.cycleMonths;
        monthlyVisits = visitsPerYear / 12;
      }
    } else {

      const fallbackConv = cfg.billingConversions[freq];
      if (fallbackConv) {
        monthlyVisits = fallbackConv.monthlyMultiplier || 1;
        visitsPerYear = fallbackConv.annualMultiplier || 12;
      }
    }

    const visitsPerMonth = visitsPerYear / 12;

    const frequentFrequencies: CarpetFrequency[] = ["weekly", "biweekly", "twicePerMonth", "monthly"];
    const infrequentFrequencies: CarpetFrequency[] = ["bimonthly", "quarterly", "biannual", "annual", "everyFourWeeks"];

    const shouldShowMonthlyRecurring = frequentFrequencies.includes(freq);
    const shouldShowVisitRecurring = infrequentFrequencies.includes(freq);
    const isVisitBasedFrequency = shouldShowVisitRecurring;

    const areaSqFt = form.areaSqFt ?? 0;

    let calculatedPerVisitBase = 0;
    let calculatedPerVisitCharge = 0;

    if (areaSqFt > 0) {

      if (areaSqFt <= activeConfig.unitSqFt) {

        calculatedPerVisitBase = activeConfig.firstUnitRate;
      } else {

        const extraSqFt = areaSqFt - activeConfig.unitSqFt;

        if (form.useExactSqft) {

          const ratePerSqFt = activeConfig.additionalUnitRate / activeConfig.unitSqFt;
          calculatedPerVisitBase = activeConfig.firstUnitRate + (extraSqFt * ratePerSqFt);
        } else {

          const additionalBlocks = Math.ceil(extraSqFt / activeConfig.unitSqFt);
          calculatedPerVisitBase = activeConfig.firstUnitRate + (additionalBlocks * activeConfig.additionalUnitRate);
        }
      }

      calculatedPerVisitCharge = form.applyMinimum !== false ? Math.max(calculatedPerVisitBase, activeConfig.perVisitMinimum) : calculatedPerVisitBase;
    }


    const perVisitBase = calculatedPerVisitBase;
    const perVisitCharge = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : calculatedPerVisitCharge;


    const perVisitTrip = 0;
    const monthlyTrip = 0;

    const serviceActive = areaSqFt > 0;


    const installationBasePrice = form.applyMinimum !== false ? Math.max(calculatedPerVisitBase, activeConfig.perVisitMinimum) : calculatedPerVisitBase;
    const calculatedInstallOneTime =
      serviceActive && form.includeInstall
        ? installationBasePrice *
          (form.isDirtyInstall
            ? activeConfig.installMultipliers.dirty
            : activeConfig.installMultipliers.clean)
        : 0;


    const installOneTime = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOneTime;


    let calculatedMonthlyRecurring = 0;

    if (serviceActive) {
      if (freq === "oneTime") {

        calculatedMonthlyRecurring = perVisitCharge;
      } else if (isVisitBasedFrequency) {

        calculatedMonthlyRecurring = monthlyVisits * perVisitCharge;
      } else if (monthlyVisits > 0) {

        calculatedMonthlyRecurring = perVisitCharge * monthlyVisits;
      }
    }


    const monthlyRecurring = form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : calculatedMonthlyRecurring;


    let calculatedFirstMonthTotal = 0;

    if (serviceActive) {
      if (freq === "oneTime") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; 
        } else {
          calculatedFirstMonthTotal = perVisitCharge; 
        }
      } else if (freq === "weekly") {

        if (form.includeInstall && installOneTime > 0) {
          const backendWeeklyMeta = backendConfig?.frequencyMetadata?.weekly;
          if (backendWeeklyMeta?.firstMonthExtraMultiplier !== undefined) {

            const extraVisits = backendWeeklyMeta.firstMonthExtraMultiplier;
            calculatedFirstMonthTotal = installOneTime + (extraVisits * perVisitCharge);
            console.log(`🔧 [Carpet Weekly] Backend first month: install + ${extraVisits} extra visits = $${calculatedFirstMonthTotal.toFixed(2)}`);
          } else {

            const remainingVisits = monthlyVisits - 1; 
            calculatedFirstMonthTotal = installOneTime + (remainingVisits * perVisitCharge);
          }
        } else {
          calculatedFirstMonthTotal = monthlyVisits * perVisitCharge;
        }
      } else if (freq === "biweekly") {

        if (form.includeInstall && installOneTime > 0) {
          const backendBiweeklyMeta = backendConfig?.frequencyMetadata?.biweekly;
          if (backendBiweeklyMeta?.firstMonthExtraMultiplier !== undefined) {

            const extraVisits = backendBiweeklyMeta.firstMonthExtraMultiplier;
            calculatedFirstMonthTotal = installOneTime + (extraVisits * perVisitCharge);
            console.log(`🔧 [Carpet Biweekly] Backend first month: install + ${extraVisits} extra visits = $${calculatedFirstMonthTotal.toFixed(2)}`);
          } else {

            const remainingVisits = monthlyVisits - 1; 
            calculatedFirstMonthTotal = installOneTime + (remainingVisits * perVisitCharge);
          }
        } else {
          calculatedFirstMonthTotal = monthlyVisits * perVisitCharge;
        }
      } else if (freq === "monthly") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime;
        } else {
          calculatedFirstMonthTotal = perVisitCharge;
        }
      } else if (freq === "everyFourWeeks") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime;
        } else {
          calculatedFirstMonthTotal = perVisitCharge;
        }
      } else if (freq === "bimonthly") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; 
        } else {
          calculatedFirstMonthTotal = perVisitCharge;
        }
      } else if (freq === "quarterly") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; 
        } else {
          calculatedFirstMonthTotal = perVisitCharge;
        }
      } else if (freq === "biannual") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; 
        } else {
          calculatedFirstMonthTotal = perVisitCharge;
        }
      } else if (freq === "annual") {

        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; 
        } else {
          calculatedFirstMonthTotal = perVisitCharge;
        }
      } else if (freq === "twicePerMonth") {

        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; 
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * perVisitCharge);
        } else {
          calculatedFirstMonthTotal = monthlyVisits * perVisitCharge;
        }
      }
    }


    const firstMonthTotal = form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthTotal;


    const contractMonths = clampContractMonths(form.contractMonths);

    let calculatedContractTotal = 0;
    let monthsPerVisit = 1;
    let totalVisitsForContract = 0;

    if (contractMonths > 0 && serviceActive) {
      if (freq === "oneTime") {

        calculatedContractTotal = firstMonthTotal;
        totalVisitsForContract = 1;
      } else if (freq === "weekly") {

        const backendWeeklyMeta = backendConfig?.frequencyMetadata?.weekly;
        const effectiveMonthlyVisits = backendWeeklyMeta?.monthlyRecurringMultiplier ?? monthlyVisits;
        totalVisitsForContract = Math.round(contractMonths * effectiveMonthlyVisits);

        if (form.includeInstall && installOneTime > 0) {


          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyRecurring);
          console.log(`🔧 [Carpet Weekly Contract] Override-aware: first=$${firstMonthTotal.toFixed(2)}, remaining=${remainingMonths}mo × $${monthlyRecurring.toFixed(2)} = $${calculatedContractTotal.toFixed(2)}`);
        } else {

          calculatedContractTotal = contractMonths * monthlyRecurring;
        }
      } else if (freq === "biweekly") {

        const backendBiweeklyMeta = backendConfig?.frequencyMetadata?.biweekly;
        const effectiveMonthlyVisits = backendBiweeklyMeta?.monthlyRecurringMultiplier ?? monthlyVisits;
        totalVisitsForContract = Math.round(contractMonths * effectiveMonthlyVisits);

        if (form.includeInstall && installOneTime > 0) {


          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyRecurring);
          console.log(`🔧 [Carpet Biweekly Contract] Override-aware: first=$${firstMonthTotal.toFixed(2)}, remaining=${remainingMonths}mo × $${monthlyRecurring.toFixed(2)} = $${calculatedContractTotal.toFixed(2)}`);
        } else {

          calculatedContractTotal = contractMonths * monthlyRecurring;
        }
      } else if (freq === "monthly") {

        const backendMonthlyMeta = backendConfig?.frequencyMetadata?.monthly;
        const cycleMonths = backendMonthlyMeta?.cycleMonths ?? 1;
        totalVisitsForContract = Math.round(contractMonths / cycleMonths);

        if (form.includeInstall && installOneTime > 0) {
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyRecurring);
        } else {
          calculatedContractTotal = contractMonths * monthlyRecurring;
        }
      } else if (freq === "everyFourWeeks") {

        totalVisitsForContract = Math.round(contractMonths * 1.0833);

        if (form.includeInstall && installOneTime > 0) {
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyRecurring);
        } else {
          calculatedContractTotal = contractMonths * monthlyRecurring;
        }
      } else if (freq === "bimonthly") {

        const backendBimonthlyMeta = backendConfig?.frequencyMetadata?.bimonthly;
        const cycleMonths = backendBimonthlyMeta?.cycleMonths ?? 2;
        const totalVisits = Math.round(contractMonths / cycleMonths);
        totalVisitsForContract = totalVisits;

        if (form.includeInstall && installOneTime > 0) {

          const remainingVisits = Math.max(totalVisits - 1, 0);
          calculatedContractTotal = installOneTime + (remainingVisits * perVisitCharge);
        } else {

          calculatedContractTotal = totalVisits * perVisitCharge;
        }
      } else if (freq === "quarterly") {

        const backendQuarterlyMeta = backendConfig?.frequencyMetadata?.quarterly;
        const cycleMonths = backendQuarterlyMeta?.cycleMonths ?? 3;
        const totalVisits = Math.round(contractMonths / cycleMonths);
        totalVisitsForContract = totalVisits;

        if (form.includeInstall && installOneTime > 0) {

          const remainingVisits = Math.max(totalVisits - 1, 0);
          calculatedContractTotal = installOneTime + (remainingVisits * perVisitCharge);
        } else {

          calculatedContractTotal = totalVisits * perVisitCharge;
        }
      } else if (freq === "biannual") {

        const backendBiannualMeta = backendConfig?.frequencyMetadata?.biannual;
        const cycleMonths = backendBiannualMeta?.cycleMonths ?? 6;
        const totalServices = Math.round(contractMonths / cycleMonths);
        totalVisitsForContract = totalServices;

        if (form.includeInstall && installOneTime > 0) {

          const remainingServices = Math.max(totalServices - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingServices * perVisitCharge);
        } else {

          calculatedContractTotal = totalServices * perVisitCharge;
        }
      } else if (freq === "annual") {

        const backendAnnualMeta = backendConfig?.frequencyMetadata?.annual;
        const cycleMonths = backendAnnualMeta?.cycleMonths ?? 12;
        const totalServices = Math.round(contractMonths / cycleMonths);
        totalVisitsForContract = totalServices;

        if (form.includeInstall && installOneTime > 0) {

          calculatedContractTotal = installOneTime;
        } else {

          calculatedContractTotal = totalServices * perVisitCharge;
        }
      } else if (freq === "twicePerMonth") {

        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {


          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyRecurring);
        } else {

          calculatedContractTotal = contractMonths * monthlyRecurring;
        }
      }
    }


    const contractTotal = form.customContractTotal !== undefined
      ? form.customContractTotal
      : calculatedContractTotal;


    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

    console.log(`📊 [CARPET-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotal.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });


    const perVisitEffective = perVisitCharge;


    let originalContractTotal = 0;
    if (serviceActive && contractMonths > 0) {
      const baselineUnitSqFt = baseConfig.unitSqFt;
      const baselineFirstUnitRate = baseConfig.firstUnitRate;
      const baselineAdditionalUnitRate = baseConfig.additionalUnitRate;
      let baselinePerVisitBase = 0;
      if (areaSqFt <= baselineUnitSqFt) {
        baselinePerVisitBase = baselineFirstUnitRate;
      } else {
        const extraSqFt = areaSqFt - baselineUnitSqFt;
        if (form.useExactSqft) {
          const ratePerSqFt = baselineAdditionalUnitRate / baselineUnitSqFt;
          baselinePerVisitBase = baselineFirstUnitRate + (extraSqFt * ratePerSqFt);
        } else {
          const additionalBlocks = Math.ceil(extraSqFt / baselineUnitSqFt);
          baselinePerVisitBase = baselineFirstUnitRate + (additionalBlocks * baselineAdditionalUnitRate);
        }
      }
      if (freq === "oneTime") {
        originalContractTotal = baselinePerVisitBase;
      } else if (isVisitBasedFrequency) {
        const totalVisits = totalVisitsForContract;
        originalContractTotal = totalVisits * baselinePerVisitBase;
      } else {
        originalContractTotal = contractMonths * monthlyVisits * baselinePerVisitBase;
      }
    }

    return {
      perVisitBase,
      perVisitCharge,
      monthlyTotal: monthlyRecurring,
      contractTotal: contractTotalWithCustomFields,  
      originalContractTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitTrip,
      monthlyTrip,
      installOneTime,
      firstMonthTotal,
      perVisitEffective,

      frequency: freq,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
    };
  }, [
    backendConfig,  
    form.areaSqFt,
    form.useExactSqft,  
    form.frequency,
    form.contractMonths,
    form.includeInstall,
    form.isDirtyInstall,

    form.firstUnitRate,
    form.additionalUnitRate,
    form.perVisitMinimum,
    form.installMultiplierDirty,
    form.installMultiplierClean,

    form.customFirstUnitRate,
    form.customAdditionalUnitRate,
    form.customPerVisitMinimum,

    form.customPerVisitPrice,
    form.customMonthlyRecurring,
    form.customFirstMonthPrice,
    form.customContractTotal,
    form.customInstallationFee,

    calcFieldsTotal,
    dollarFieldsTotal,
    form.applyMinimum,
  ]);

  const quote: ServiceQuoteResult = useMemo(
    () => {
      const result = {
        serviceId: form.serviceId,
        perVisit: perVisitEffective,
        monthly: monthlyTotal,
        annual: contractTotal,
      };
      return result;
    },
    [form.serviceId, perVisitEffective, monthlyTotal, contractTotal]
  );

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: {
      perVisitBase,
      perVisitCharge,
      monthlyTotal,
      contractTotal,
      originalContractTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitTrip,
      monthlyTrip,
      installOneTime,
      firstMonthTotal,
      perVisitEffective,

      frequency,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
    },
    refreshConfig: () => fetchPricing(true), 
    isLoadingConfig,
    setContractMonths,
  };
}

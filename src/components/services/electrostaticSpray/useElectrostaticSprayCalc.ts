

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import type {
  ElectrostaticSprayFormState,
  ElectrostaticSprayCalcResult,
} from "./electrostaticSprayTypes";
import { electrostaticSprayPricingConfig as cfg } from "./electrostaticSprayConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";


interface BackendElectrostaticSprayConfig {
  pricingMethodOptions: string[]; 
  combinedServiceOptions: string[]; 
  locationOptions: string[]; 

  standardSprayPricing: {
    sprayRatePerRoom: number; 
    sqFtUnit: number; 
    sprayRatePerSqFtUnit: number; 
    minimumPriceOptional: number; 
  };

  tripCharges: {
    standard: number; 
    beltway: number; 
  };

  minimumChargePerVisit: number; 

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


function transformBackendFrequencyMeta(backendMeta: BackendElectrostaticSprayConfig['frequencyMetadata'] | undefined) {
  if (!backendMeta) {
    console.warn('⚠️ No backend frequencyMetadata available, using static fallback values');
    return cfg.billingConversions;
  }

  console.log('🔧 [Electrostatic Spray] Transforming backend frequencyMetadata:', backendMeta);


  const transformedBilling: any = { ...cfg.billingConversions }; 


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

  console.log('✅ [Electrostatic Spray] Transformed frequencyMetadata to billingConversions:', transformedBilling);
  return transformedBilling;
}


function updateFormWithConfig(config: BackendElectrostaticSprayConfig, setForm: any, initialData?: any, forceUpdate: boolean = false) {


  if (initialData && !forceUpdate) {
    console.log('📋 [ELECTROSTATIC-SPRAY] Edit mode: Skipping form update to preserve loaded values');
    return; 
  }

  console.log('📋 [ELECTROSTATIC-SPRAY] Updating form with backend config', forceUpdate ? '(FORCED by refresh button)' : '');
  setForm((prev: any) => ({
    ...prev,

    ratePerRoom: config.standardSprayPricing?.sprayRatePerRoom ?? prev.ratePerRoom,
    ratePerThousandSqFt: config.standardSprayPricing?.sprayRatePerSqFtUnit ?? prev.ratePerThousandSqFt,
    tripChargePerVisit: config.tripCharges?.standard ?? prev.tripChargePerVisit,
  }));
}

const DEFAULT_FORM_STATE: ElectrostaticSprayFormState = {
  serviceId: "electrostaticSpray",
  pricingMethod: "byRoom",
  roomCount: 0,
  squareFeet: 0,
  useExactCalculation: true, 
  frequency: cfg.defaultFrequency,
  location: "standard",
  isCombinedWithSaniClean: false,
  contractMonths: cfg.minContractMonths,
  notes: "",
  ratePerRoom: cfg.ratePerRoom,
  ratePerThousandSqFt: cfg.ratePerThousandSqFt,
  tripChargePerVisit: cfg.tripCharges.standard,
  applyMinimum: true,
};

export function useElectrostaticSprayCalc(initialData?: Partial<ElectrostaticSprayFormState>, customFields?: any[]) {

  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);
  const isEditMode = useRef(!!initialData); 
  const isInitialMount = useRef(true); 


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

    console.log(`💰 [ELECTROSTATIC-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [ELECTROSTATIC-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [form, setForm] = useState<ElectrostaticSprayFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM_STATE,
      ...initialData,
    };


    const isInitiallyActive = (initialData?.roomCount || 0) > 0 || (initialData?.squareFeet || 0) > 0;
    const defaultContractMonths = initialData?.contractMonths
      ? initialData.contractMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : cfg.minContractMonths;

    return {
      ...baseForm,
      contractMonths: defaultContractMonths,
    };
  });

  const [backendConfig, setBackendConfig] = useState<BackendElectrostaticSprayConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);


  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("electrostaticSpray");
        if (backendData?.config) {
          console.log('✅ [ElectrostaticSpray] Using cached pricing data from context');
          const config = backendData.config as BackendElectrostaticSprayConfig;
          setBackendConfig(config);
          updateFormWithConfig(config, setForm, initialData, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [ELECTROSTATIC-SPRAY] Manual refresh: Clearing all custom overrides');
            setForm((prev: any) => ({
              ...prev,
              customRatePerRoom: undefined,
              customRatePerThousandSqFt: undefined,
              customTripChargePerVisit: undefined,
              customServiceCharge: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customContractTotal: undefined,
              customFirstMonthTotal: undefined,
            }));
          }

          console.log('✅ ElectrostaticSpray CONFIG loaded from context:', {
            standardSprayPricing: config.standardSprayPricing,
            tripCharges: config.tripCharges,
            frequencyMetadata: config.frequencyMetadata,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for ElectrostaticSpray, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch ElectrostaticSpray config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("electrostaticSpray");
        if (fallbackConfig?.config) {
          console.log('✅ [ElectrostaticSpray] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendElectrostaticSprayConfig;
          setBackendConfig(config);
          updateFormWithConfig(config, setForm, initialData, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [ELECTROSTATIC-SPRAY] Manual refresh: Clearing all custom overrides');
            setForm((prev: any) => ({
              ...prev,
              customRatePerRoom: undefined,
              customRatePerThousandSqFt: undefined,
              customTripChargePerVisit: undefined,
              customServiceCharge: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customContractTotal: undefined,
              customFirstMonthTotal: undefined,
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

    console.log('📋 [ELECTROSTATIC-SPRAY-PRICING] Fetching backend config (initial load, will not overwrite edit mode values)');
    fetchPricing(false); 
    isInitialMount.current = false; 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!backendConfig) return;


    if (!baselineInitialized.current) {
      baselineInitialized.current = true;


      baselineValues.current = {
        ratePerRoom: initialData?.ratePerRoom ?? backendConfig.standardSprayPricing?.sprayRatePerRoom ?? cfg.ratePerRoom,
        ratePerThousandSqFt: initialData?.ratePerThousandSqFt ?? backendConfig.standardSprayPricing?.sprayRatePerSqFtUnit ?? cfg.ratePerThousandSqFt,
        tripChargePerVisit: initialData?.tripChargePerVisit ?? backendConfig.tripCharges?.standard ?? cfg.tripCharges.standard,
      };

      console.log('✅ [ELECTROSTATIC-BASELINE] Initialized baseline values for logging:', {
        ratePerRoom: baselineValues.current.ratePerRoom,
        ratePerThousandSqFt: baselineValues.current.ratePerThousandSqFt,
        tripChargePerVisit: baselineValues.current.tripChargePerVisit,
        note: initialData ? 'Edit mode: using loaded/saved values' : 'New document: using backend defaults'
      });


      if (initialData) {
        console.log('🔍 [ELECTROSTATIC-SPRAY-PRICING] Detecting price overrides for yellow highlighting...');


        const hasRatePerRoomOverride = initialData.ratePerRoom !== undefined &&
                                       initialData.ratePerRoom !== backendConfig.standardSprayPricing?.sprayRatePerRoom;
        const hasRatePerSqFtOverride = initialData.ratePerThousandSqFt !== undefined &&
                                        initialData.ratePerThousandSqFt !== backendConfig.standardSprayPricing?.sprayRatePerSqFtUnit;
        const hasTripChargeOverride = initialData.tripChargePerVisit !== undefined &&
                                       initialData.tripChargePerVisit !== backendConfig.tripCharges?.standard;

        if (hasRatePerRoomOverride || hasRatePerSqFtOverride || hasTripChargeOverride) {
          setForm(prev => ({
            ...prev,

            customRatePerRoom: hasRatePerRoomOverride ? initialData.ratePerRoom : prev.customRatePerRoom,
            customRatePerThousandSqFt: hasRatePerSqFtOverride ? initialData.ratePerThousandSqFt : prev.customRatePerThousandSqFt,
            customTripChargePerVisit: hasTripChargeOverride ? initialData.tripChargePerVisit : prev.customTripChargePerVisit,
          }));

          console.log('✅ [ELECTROSTATIC-SPRAY-PRICING] Set custom override fields for yellow highlighting:', {
            customRatePerRoom: hasRatePerRoomOverride ? initialData.ratePerRoom : 'none',
            customRatePerThousandSqFt: hasRatePerSqFtOverride ? initialData.ratePerThousandSqFt : 'none',
            customTripChargePerVisit: hasTripChargeOverride ? initialData.tripChargePerVisit : 'none',
          });
        } else {
          console.log('ℹ️ [ELECTROSTATIC-SPRAY-PRICING] No price overrides detected - using backend defaults');
        }
      }
    }
  }, [backendConfig, initialData]);


  useEffect(() => {

    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);


  useEffect(() => {
    const isServiceActive = (form.roomCount || 0) > 0 || (form.squareFeet || 0) > 0;
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
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.roomCount, form.squareFeet, servicesContext]);


  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `electrostaticSpray_${fieldName}`,
      productName: `Electrostatic Spray - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.roomCount || form.squareFeet || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [ELECTROSTATIC-SPRAY-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.roomCount, form.squareFeet, form.frequency]);


  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({
      ...prev,
      contractMonths: months,
    }));
  }, []);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const target: any = e.target;

    setForm((prev) => {

      const originalValue = prev[name as keyof ElectrostaticSprayFormState];

      const next: ElectrostaticSprayFormState = { ...prev };

      if (type === "checkbox") {
        next[name as keyof ElectrostaticSprayFormState] = target.checked;
      } else if (

        name === "customRatePerRoom" ||
        name === "customRatePerThousandSqFt" ||
        name === "customTripChargePerVisit" ||
        name === "customServiceCharge" ||
        name === "customPerVisitPrice" ||
        name === "customMonthlyRecurring" ||
        name === "customContractTotal" ||
        name === "customFirstMonthTotal"
      ) {
        if (target.value === '') {
          next[name as keyof ElectrostaticSprayFormState] = undefined;
        } else {
          const numVal = parseFloat(target.value);
          if (!isNaN(numVal)) {
            next[name as keyof ElectrostaticSprayFormState] = numVal;
          } else {
            return prev; 
          }
        }
      } else if (type === "number") {
        const val = parseFloat(target.value);
        next[name as keyof ElectrostaticSprayFormState] = isNaN(val) ? 0 : val;
      } else {
        next[name as keyof ElectrostaticSprayFormState] = target.value;
      }


      const baseEditableFields = [
        'ratePerRoom', 'ratePerThousandSqFt', 'tripChargePerVisit'
      ];

      const customOverrideFields = [
        'customRatePerRoom', 'customRatePerThousandSqFt', 'customTripChargePerVisit',
        'customServiceCharge', 'customPerVisitPrice', 'customMonthlyRecurring',
        'customContractTotal', 'customFirstMonthTotal'
      ];

      const allPricingFields = [...baseEditableFields, ...customOverrideFields];

      if (allPricingFields.includes(name)) {
        const newValue = next[name as keyof ElectrostaticSprayFormState] as number | undefined;


        let baselineValue = baselineValues.current[name];


        if (baselineValue === undefined && name.startsWith('custom')) {
          const baseFieldMap: Record<string, string> = {
            'customRatePerRoom': 'ratePerRoom',
            'customRatePerThousandSqFt': 'ratePerThousandSqFt',
            'customTripChargePerVisit': 'tripChargePerVisit',
            'customServiceCharge': 'ratePerRoom',
            'customPerVisitPrice': 'ratePerRoom',
          };

          const baseFieldName = baseFieldMap[name];
          if (baseFieldName) {
            baselineValue = baselineValues.current[baseFieldName];
          }
        }


        if (newValue !== undefined && baselineValue !== undefined &&
            typeof newValue === 'number' && typeof baselineValue === 'number' &&
            newValue !== baselineValue) {
          console.log(`📝 [ELECTROSTATIC-BASELINE-LOG] Logging change for ${name}:`, {
            baseline: baselineValue,
            newValue,
            change: newValue - baselineValue,
            note: 'Always comparing to baseline (not previous value)'
          });
          addServiceFieldChange(name, baselineValue, newValue);
        }
      }


      const allFormFields = [

        'rooms', 'squareFeet', 'contractMonths', 'frequency',

        'pricingMethod', 'rateTier',

        'includesTripCharge'
      ];


      if (allFormFields.includes(name)) {
        logServiceFieldChanges(
          'electrostaticSpray',
          'Electrostatic Spray',
          { [name]: next[name as keyof ElectrostaticSprayFormState] },
          { [name]: originalValue },
          [name],
          next.rooms || next.squareFeet || 1,
          next.frequency || 'monthly'
        );
      }

      return next;
    });
  };


  const activeConfig = useMemo(() => {
    return {
      standardSprayPricing: backendConfig?.standardSprayPricing ?? {
        sprayRatePerRoom: cfg.ratePerRoom,
        sqFtUnit: cfg.sqFtUnit,
        sprayRatePerSqFtUnit: cfg.ratePerThousandSqFt,
        minimumPriceOptional: 0,
      },
      tripCharges: backendConfig?.tripCharges ?? cfg.tripCharges,
      minimumChargePerVisit: backendConfig?.minimumChargePerVisit ?? 0,
      minContractMonths: backendConfig?.minContractMonths ?? cfg.minContractMonths,
      maxContractMonths: backendConfig?.maxContractMonths ?? cfg.maxContractMonths,

      billingConversions: transformBackendFrequencyMeta(backendConfig?.frequencyMetadata),
    };
  }, [backendConfig]);

  const calc: ElectrostaticSprayCalcResult = useMemo(() => {


    if (!backendConfig) {
      console.warn('⚠️ [ElectrostaticSpray] Using fallback config - backend not loaded yet');
    } else {
      console.log('✅ [ElectrostaticSpray] Using backend config:', {
        standardSprayPricing: activeConfig.standardSprayPricing,
        tripCharges: activeConfig.tripCharges,
      });
    }


    let calculatedServiceCharge = 0;
    let effectiveRate = 0;
    let pricingMethodUsed = form.pricingMethod;


    const effectiveRatePerRoom = form.customRatePerRoom ?? form.ratePerRoom;
    const effectiveRatePerThousandSqFt = form.customRatePerThousandSqFt ?? form.ratePerThousandSqFt;

    if (form.pricingMethod === "byRoom") {
      calculatedServiceCharge = form.roomCount * effectiveRatePerRoom;
      effectiveRate = effectiveRatePerRoom;
    } else {

      let calculateForSqFt = form.squareFeet;

      if (!form.useExactCalculation) {


        const minTier = activeConfig.standardSprayPricing.sqFtUnit; 
        if (calculateForSqFt <= minTier) {
          calculateForSqFt = minTier; 
        } else {

          calculateForSqFt = Math.ceil(calculateForSqFt / activeConfig.standardSprayPricing.sqFtUnit) * activeConfig.standardSprayPricing.sqFtUnit;
        }
      }

      const units = calculateForSqFt / activeConfig.standardSprayPricing.sqFtUnit; 
      calculatedServiceCharge = units * effectiveRatePerThousandSqFt;
      effectiveRate = effectiveRatePerThousandSqFt;
    }


    const hasService = (form.pricingMethod === "byRoom" && form.roomCount > 0) ||
                      (form.pricingMethod === "bySqFt" && form.squareFeet > 0);

    if (activeConfig.minimumChargePerVisit > 0 && hasService) {
      calculatedServiceCharge = form.applyMinimum !== false ? Math.max(calculatedServiceCharge, activeConfig.minimumChargePerVisit) : calculatedServiceCharge;
    } else if (!hasService) {
      calculatedServiceCharge = 0;
    }


    const serviceCharge = form.customServiceCharge ?? calculatedServiceCharge;


    const effectiveTripChargePerVisit = form.customTripChargePerVisit ?? form.tripChargePerVisit;
    const tripCharge = form.isCombinedWithSaniClean ? 0 : effectiveTripChargePerVisit;


    const perVisit = form.customPerVisitPrice ?? (serviceCharge + tripCharge);


    const freqConfig = activeConfig.billingConversions[form.frequency];
    const monthlyMultiplier = freqConfig?.monthlyMultiplier ?? 0;
    const annualMultiplier = freqConfig?.annualMultiplier ?? 0;


    const isVisitBasedFrequency = form.frequency === "oneTime" || form.frequency === "quarterly" ||
      form.frequency === "biannual" || form.frequency === "annual" || form.frequency === "bimonthly";
    const monthsPerVisit = form.frequency === "oneTime" ? 0 :
      form.frequency === "bimonthly" ? 2 :
      form.frequency === "quarterly" ? 3 :
      form.frequency === "biannual" ? 6 :
      form.frequency === "annual" ? 12 : 1;


    const monthlyRecurring = form.customMonthlyRecurring ?? (perVisit * monthlyMultiplier);


    let contractTotal: number;
    if (form.frequency === "oneTime") {

      contractTotal = form.customContractTotal ?? perVisit;
    } else if (isVisitBasedFrequency) {

      const visitsPerYear = annualMultiplier;
      const totalVisits = (form.contractMonths / 12) * visitsPerYear;
      contractTotal = form.customContractTotal ?? (totalVisits * perVisit);
    } else {

      contractTotal = form.customContractTotal ?? (monthlyRecurring * form.contractMonths);
    }


    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

    console.log(`📊 [ELECTROSTATIC-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotal.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });


    let originalContractTotal = 0;
    if (hasService) {
      const baselineRatePerRoom = activeConfig.standardSprayPricing.sprayRatePerRoom;
      const baselineRatePerSqFtUnit = activeConfig.standardSprayPricing.sprayRatePerSqFtUnit;
      let baselineServiceCharge = 0;
      if (form.pricingMethod === "byRoom") {
        baselineServiceCharge = form.roomCount * baselineRatePerRoom;
      } else {
        let calcSqFt = form.squareFeet;
        if (!form.useExactCalculation) {
          const minTier = activeConfig.standardSprayPricing.sqFtUnit;
          calcSqFt = calcSqFt <= minTier ? minTier : Math.ceil(calcSqFt / minTier) * minTier;
        }
        const units = calcSqFt / activeConfig.standardSprayPricing.sqFtUnit;
        baselineServiceCharge = units * baselineRatePerSqFtUnit;
      }
      if (activeConfig.minimumChargePerVisit > 0) {
        baselineServiceCharge = form.applyMinimum !== false ? Math.max(baselineServiceCharge, activeConfig.minimumChargePerVisit) : baselineServiceCharge;
      }
      const baselinePerVisit = baselineServiceCharge + tripCharge;
      const baselineMonthlyRecurring = baselinePerVisit * monthlyMultiplier;
      if (form.frequency === "oneTime") {
        originalContractTotal = baselinePerVisit;
      } else if (isVisitBasedFrequency) {
        const visitsPerYear = annualMultiplier;
        const totalVisits = (form.contractMonths / 12) * visitsPerYear;
        originalContractTotal = totalVisits * baselinePerVisit;
      } else {
        originalContractTotal = baselineMonthlyRecurring * form.contractMonths;
      }
    }

    return {
      serviceCharge,
      tripCharge,
      perVisit,
      monthlyRecurring,
      contractTotal: contractTotalWithCustomFields,  
      originalContractTotal,
      effectiveRate,
      pricingMethodUsed,

      isVisitBasedFrequency,
      monthsPerVisit,

      minimumChargePerVisit: activeConfig.minimumChargePerVisit,
    };
  }, [
    activeConfig,  
    form,

    calcFieldsTotal,
    dollarFieldsTotal,
  ]);

  return {
    form,
    setForm,
    onChange,
    calc,
    backendConfig,
    isLoadingConfig,
    refreshConfig: () => fetchPricing(true), 
    activeConfig, 
    setContractMonths,
  };
}

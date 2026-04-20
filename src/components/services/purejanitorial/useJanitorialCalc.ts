
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type {
  JanitorialRateCategory,
  SchedulingMode,
  ServiceType,
  JanitorialFormState,
} from "./janitorialTypes";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";


interface TieredPricingTier {
  upToMinutes?: number;
  upToHours?: number;
  price?: number;
  ratePerHour?: number;
  description: string;
  addonOnly?: boolean;
  standalonePrice?: number;
}


interface BackendJanitorialConfig {
  standardHourlyPricing: {
    standardHourlyRate: number; 
    minimumHoursPerTrip: number; 
  };
  shortJobHourlyPricing: {
    shortJobHourlyRate: number; 
  };
  vacuuming: {
    estimatedTimeHoursPerJob: number; 
    largeJobMinimumTimeHours: number; 
  };
  dusting: {
    itemsPerHour: number; 
    pricePerItem: number; 
    dirtyFirstTimeMultiplier: number; 
    infrequentServiceMultiplier4PerYear: number; 
  };
  smoothBreakdownPricingTable: TieredPricingTier[];
  minimumChargePerVisit: number; 
  tripCharges: {
    standard: number; 
    beltway: number; 
  };
  contract: {
    minMonths: number; 
    maxMonths: number; 
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
    bimonthly: { cycleMonths: number }; 
    quarterly: { cycleMonths: number }; 
    biannual: { cycleMonths: number }; 
    annual: { cycleMonths: number }; 
    monthly: { cycleMonths: number }; 
  };
}

export interface JanitorialCalcResult {
  totalHours: number;
  perVisit: number;
  weekly: number; 
  monthly: number;
  firstMonth: number; 
  recurringMonthly: number; 
  annual: number;
  firstVisit: number;
  ongoingMonthly: number;
  contractTotal: number;
  originalContractTotal: number;
  minimumChargePerVisit: number; 
  breakdown: {
    manualHours: number;
    vacuumingHours: number;
    dustingHours: number;
    pricingMode: string;
    basePrice: number;
    appliedMultiplier: number;
    installationFee?: number;
    monthlyVisits?: number;
  };
}

const DEFAULT_FORM_STATE: JanitorialFormState = {
  manualHours: 0,
  schedulingMode: "normalRoute",
  serviceType: "recurring", 
  vacuumingHours: 0,

  dustingTotalPlaces: 0,        
  dustingCalculatedHours: 0,    
  dirtyInitial: false,
  frequency: cfg.defaultFrequency,
  visitsPerWeek: 1, 
  rateCategory: "redRate",
  contractMonths: cfg.minContractMonths ?? 12,
  addonTimeMinutes: 0, 
  installation: false, 


  baseHourlyRate: cfg.baseHourlyRate,
  shortJobHourlyRate: cfg.shortJobHourlyRate,
  minHoursPerVisit: cfg.minHoursPerVisit,
  weeksPerMonth: cfg.weeksPerMonth,
  dirtyInitialMultiplier: cfg.dirtyInitialMultiplier,
  infrequentMultiplier: cfg.infrequentMultiplier,
  dustingPlacesPerHour: cfg.dustingPlacesPerHour,
  dustingPricePerPlace: cfg.dustingPricePerPlace, 
  vacuumingDefaultHours: cfg.vacuumingDefaultHours,
  redRateMultiplier: cfg.rateCategories.redRate.multiplier,
  greenRateMultiplier: cfg.rateCategories.greenRate.multiplier,


  customBaseHourlyRate: undefined,
  customShortJobHourlyRate: undefined,
  customMinHoursPerVisit: undefined,
  customDustingPlacesPerHour: undefined,
};


function calculateAddonTimePrice(
  minutes: number,
  tieredPricing: TieredPricingTier[],
  isAddon: boolean = true
): number {
  console.log(`🔧 calculateAddonTimePrice called:`, {
    minutes,
    tieredPricingLength: tieredPricing?.length || 0,
    isAddon,
    firstTier: tieredPricing?.[0]
  });

  if (minutes <= 0 || !tieredPricing || tieredPricing.length === 0) {
    console.log(`⚠️ Early return: minutes=${minutes}, tieredPricing=${!!tieredPricing}, length=${tieredPricing?.length}`);
    return 0;
  }

  const hours = minutes / 60;


  for (const tier of tieredPricing) {
    console.log(`🔍 Checking tier:`, tier);


    if (tier.upToMinutes !== undefined && minutes <= tier.upToMinutes) {
      console.log(`✅ Matched minute tier: ${tier.upToMinutes} mins, price: ${tier.price}`);

      if (!isAddon && tier.standalonePrice !== undefined) {
        console.log(`✅ Using standalone price: ${tier.standalonePrice}`);
        return tier.standalonePrice;
      }
      console.log(`✅ Using regular price: ${tier.price}`);
      return tier.price || 0;
    }


    if (tier.upToHours !== undefined && hours <= tier.upToHours) {
      console.log(`✅ Matched hour tier: ${tier.upToHours} hrs`);

      if (tier.ratePerHour !== undefined) {
        const calculated = hours * tier.ratePerHour;
        console.log(`✅ Using hourly rate: ${tier.ratePerHour}/hr * ${hours} = ${calculated}`);
        return calculated;
      }

      console.log(`✅ Using fixed hour price: ${tier.price}`);
      return tier.price || 0;
    }
  }


  console.log(`❌ No tier matched for ${minutes} minutes`);
  return 0;
}


function getDefaultTieredPricing(): TieredPricingTier[] {
  return [
    { upToMinutes: 15, price: 10, description: "0-15 minutes", addonOnly: true },
    { upToMinutes: 30, price: 20, description: "15-30 minutes", addonOnly: true, standalonePrice: 35 },
    { upToHours: 1, price: 50, description: "30 min - 1 hour" },
    { upToHours: 2, price: 80, description: "1-2 hours" },
    { upToHours: 3, price: 100, description: "2-3 hours" },
    { upToHours: 4, price: 120, description: "3-4 hours" },
    { upToHours: 999, ratePerHour: 30, description: "4+ hours" },
  ];
}


function transformTieredPricing(backendTiers: any[] | undefined): TieredPricingTier[] | null {
  if (!Array.isArray(backendTiers) || backendTiers.length === 0) {
    console.warn('⚠️ Backend smoothBreakdownPricingTable is not an array or is empty, using default structure');
    return null;
  }

  console.log('🔧 Transforming backend smoothBreakdownPricingTable:', backendTiers);

  const transformedTiers: TieredPricingTier[] = [];

  for (const tier of backendTiers) {
    if (!tier || typeof tier !== 'object') continue;


    if (tier.upToMinutes !== undefined) {
      transformedTiers.push({
        upToMinutes: tier.upToMinutes,
        price: tier.price,
        description: tier.description || `0-${tier.upToMinutes} minutes`,
        addonOnly: tier.addonOnly,
        standalonePrice: tier.standalonePrice,
      });
    } else if (tier.upToHours !== undefined) {
      transformedTiers.push({
        upToHours: tier.upToHours,
        price: tier.price,
        ratePerHour: tier.ratePerHour,
        description: tier.description || `Up to ${tier.upToHours} hour${tier.upToHours !== 1 ? 's' : ''}`,
        addonOnly: tier.addonOnly,
        standalonePrice: tier.standalonePrice,
      });
    } else {
      console.warn('⚠️ Unrecognized tier format:', tier);
    }
  }

  console.log('✅ Transformed smoothBreakdownPricingTable:', transformedTiers);
  return transformedTiers.length > 0 ? transformedTiers : null;
}

export function useJanitorialCalc(initialData?: Partial<JanitorialFormState>, customFields?: any[]) {

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

    console.log(`💰 [JANITORIAL-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [JANITORIAL-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [form, setForm] = useState<JanitorialFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM_STATE,
      ...initialData,
    };


    const defaultContractMonths = initialData?.contractMonths
      ? initialData.contractMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : cfg.minContractMonths ?? 12;

    return {
      ...baseForm,
      contractMonths: defaultContractMonths,
    };
  });


  const [backendConfig, setBackendConfig] = useState<BackendJanitorialConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const isEditMode = Boolean(initialData && Object.keys(initialData).length > 0);
  const forceOverrideConfigRef = useRef(false);

  const pricingBaselines = useMemo(() => ({
    baseHourlyRate: backendConfig?.standardHourlyPricing?.standardHourlyRate ?? cfg.baseHourlyRate,
    shortJobHourlyRate: backendConfig?.shortJobHourlyPricing?.shortJobHourlyRate ?? cfg.shortJobHourlyRate,
    minHoursPerVisit: backendConfig?.standardHourlyPricing?.minimumHoursPerTrip ?? cfg.minHoursPerVisit,
    dustingPlacesPerHour: backendConfig?.dusting?.itemsPerHour ?? cfg.dustingPlacesPerHour,
  }), [backendConfig]);


  const updateFormWithConfig = (
    config: BackendJanitorialConfig,
    options?: { forceOverride?: boolean }
  ) => {
    setForm((prev) => {
      const shouldOverrideConfigValues =
        (options?.forceOverride ?? false) || !isEditMode;

      const applyConfigValue = (prevValue: number, configValue?: number) =>
        shouldOverrideConfigValues ? (configValue ?? prevValue) : prevValue;

      return {
        ...prev,

        baseHourlyRate: applyConfigValue(
          prev.baseHourlyRate,
          config.standardHourlyPricing?.standardHourlyRate
        ),
        shortJobHourlyRate: applyConfigValue(
          prev.shortJobHourlyRate,
          config.shortJobHourlyPricing?.shortJobHourlyRate
        ),
        minHoursPerVisit: applyConfigValue(
          prev.minHoursPerVisit,
          config.standardHourlyPricing?.minimumHoursPerTrip
        ),
        weeksPerMonth: applyConfigValue(
          prev.weeksPerMonth,
          config.frequencyMetadata?.weekly?.monthlyRecurringMultiplier
        ),
        dustingPlacesPerHour: applyConfigValue(
          prev.dustingPlacesPerHour,
          config.dusting?.itemsPerHour
        ),
        dustingPricePerPlace: applyConfigValue(
          prev.dustingPricePerPlace,
          config.dusting?.pricePerItem
        ),
        vacuumingDefaultHours: applyConfigValue(
          prev.vacuumingDefaultHours,
          config.vacuuming?.estimatedTimeHoursPerJob
        ),

        dirtyInitialMultiplier: applyConfigValue(
          prev.dirtyInitialMultiplier,
          config.dusting?.dirtyFirstTimeMultiplier
        ),
        infrequentMultiplier: applyConfigValue(
          prev.infrequentMultiplier,
          config.dusting?.infrequentServiceMultiplier4PerYear
        ),
      };
    });
  };

  useEffect(() => {
    setForm(prev => {
      const customBase = prev.baseHourlyRate !== pricingBaselines.baseHourlyRate
        ? prev.baseHourlyRate
        : undefined;
      const customShort = prev.shortJobHourlyRate !== pricingBaselines.shortJobHourlyRate
        ? prev.shortJobHourlyRate
        : undefined;
      const customMin = prev.minHoursPerVisit !== pricingBaselines.minHoursPerVisit
        ? prev.minHoursPerVisit
      : undefined;
      const customDusting = prev.dustingPlacesPerHour !== pricingBaselines.dustingPlacesPerHour
        ? prev.dustingPlacesPerHour
        : undefined;

      if (
        prev.customBaseHourlyRate === customBase &&
        prev.customShortJobHourlyRate === customShort &&
        prev.customMinHoursPerVisit === customMin
      ) {
        return prev;
      }

      return {
        ...prev,
        customBaseHourlyRate: customBase,
        customShortJobHourlyRate: customShort,
        customMinHoursPerVisit: customMin,
        customDustingPlacesPerHour: customDusting,
      };
    });
  }, [pricingBaselines]);


  const fetchPricing = async (forceRefresh: boolean = false) => {
    const shouldForceOverrideConfig = forceOverrideConfigRef.current || forceRefresh;
    forceOverrideConfigRef.current = false;
    setIsLoadingConfig(true);
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("pureJanitorial");
        if (backendData?.config) {
          console.log('✅ [PureJanitorial] Using cached pricing data from context');
          const rawConfig = backendData.config;


          const config: BackendJanitorialConfig = {
            ...rawConfig,
            smoothBreakdownPricingTable: transformTieredPricing(rawConfig.smoothBreakdownPricingTable) || getDefaultTieredPricing()
          } as BackendJanitorialConfig;

          setBackendConfig(config);
          updateFormWithConfig(config, { forceOverride: shouldForceOverrideConfig });

          console.log('✅ PureJanitorial CONFIG loaded from context:', {
            baseHourlyRate: config.standardHourlyPricing?.standardHourlyRate,
            shortJobHourlyRate: config.shortJobHourlyPricing?.shortJobHourlyRate,
            minHoursPerVisit: config.standardHourlyPricing?.minimumHoursPerTrip,
            weeksPerMonth: config.frequencyMetadata?.weekly?.monthlyRecurringMultiplier,
            dustingPlacesPerHour: config.dusting?.itemsPerHour,
            dustingPricePerPlace: config.dusting?.pricePerItem,
            vacuumingDefaultHours: config.vacuuming?.estimatedTimeHoursPerJob,
            tieredPricing: config.smoothBreakdownPricingTable,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for PureJanitorial, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch PureJanitorial config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("pureJanitorial");
        if (fallbackConfig?.config) {
          console.log('✅ [PureJanitorial] Using backend pricing data from context after error');
          const rawConfig = fallbackConfig.config;


          const config: BackendJanitorialConfig = {
            ...rawConfig,
            smoothBreakdownPricingTable: transformTieredPricing(rawConfig.smoothBreakdownPricingTable) || getDefaultTieredPricing()
          } as BackendJanitorialConfig;

          setBackendConfig(config);
          updateFormWithConfig(config, { forceOverride: shouldForceOverrideConfig });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const refreshConfig = () => {
    fetchPricing(true); 
  };


  useEffect(() => {

    if (initialData) {
      console.log('📋 [PURE-JANITORIAL-PRICING] Skipping price fetch - using saved historical prices from initialData');
      return;
    }

    console.log('📋 [PURE-JANITORIAL-PRICING] Fetching current prices - new service or no initial data');
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {

    if (initialData) return;

    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);


  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef(false); 

  useEffect(() => {

    const isServiceActive = (form.manualHours > 0) || (form.vacuumingHours > 0) || (form.dustingCalculatedHours > 0);
    const wasActive = wasActiveRef.current;


    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {

      console.log(`📅 [PURE-JANITORIAL-CONTRACT] Service just became active, adopting global contract months`);
      if (servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
        const globalMonths = servicesContext.globalContractMonths;
        console.log(`📅 [PURE-JANITORIAL-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({
          ...prev,
          contractMonths: globalMonths,
        }));
      }
    } else if (isServiceActive && servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {

      const globalMonths = servicesContext.globalContractMonths;
      if (form.contractMonths !== globalMonths) {
        console.log(`📅 [PURE-JANITORIAL-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({
          ...prev,
          contractMonths: globalMonths,
        }));
      }
    }


    wasActiveRef.current = isServiceActive;
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.manualHours, form.vacuumingHours, form.dustingCalculatedHours, servicesContext]);


  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `pureJanitorial_${fieldName}`,
      productName: `Pure Janitorial - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.manualHours || form.vacuumingHours || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [PURE-JANITORIAL-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.manualHours, form.vacuumingHours, form.frequency]);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type } = e.target;
    const t: any = e.target;

    setForm((prev) => {

      const originalValue = prev[name as keyof JanitorialFormState];

      const next: JanitorialFormState = { ...prev };


      if (
        name === "customPerVisit" ||
        name === "customFirstVisit" ||
        name === "customMonthly" ||
        name === "customOngoingMonthly" ||
        name === "customContractTotal"
      ) {
        const numVal = t.value === '' ? undefined : parseFloat(t.value);
        if (numVal === undefined || !isNaN(numVal)) {
          (next as any)[name] = numVal;
        }
      } else if (type === "checkbox") {
        (next as any)[name] = t.checked;
      } else if (type === "number") {
        const raw = t.value;
        const num = raw === "" ? 0 : Number(raw);
        (next as any)[name] = Number.isFinite(num) && num >= 0 ? num : 0;


        if (name === "contractMonths") {
          hasContractMonthsOverride.current = true;
          console.log(`📅 [PURE-JANITORIAL-CONTRACT] User override: ${num} months`);
        }
      } else {
        (next as any)[name] = t.value;
      }


      if (name === 'dustingTotalPlaces' || name === 'dustingPlacesPerHour') {
        const totalPlaces = name === 'dustingTotalPlaces' ? (next.dustingTotalPlaces || 0) : prev.dustingTotalPlaces;
        const placesPerHour = name === 'dustingPlacesPerHour' ? (next.dustingPlacesPerHour || 0) : prev.dustingPlacesPerHour;

        next.dustingCalculatedHours = totalPlaces > 0 && placesPerHour > 0
          ? totalPlaces / placesPerHour
          : 0;

        console.log(`🔧 [Pure Janitorial] Auto-calculated dusting hours: ${totalPlaces} places ÷ ${placesPerHour} places/hr = ${next.dustingCalculatedHours.toFixed(2)} hours`);
      }


      const pricingFields = [
        'baseHourlyRate', 'shortJobHourlyRate', 'minHoursPerVisit', 'weeksPerMonth',
        'dirtyInitialMultiplier', 'infrequentMultiplier', 'dustingPlacesPerHour',
        'dustingPricePerPlace', 'vacuumingDefaultHours', 'redRateMultiplier', 'greenRateMultiplier',
        'customPerVisit', 'customFirstVisit', 'customMonthly', 'customOngoingMonthly', 'customContractTotal'
      ];

      if (pricingFields.includes(name)) {
        const newValue = (next as any)[name] as number | undefined;
        const oldValue = originalValue as number | undefined;


        if (newValue !== undefined && oldValue !== undefined &&
            typeof newValue === 'number' && typeof oldValue === 'number' &&
            newValue !== oldValue && newValue > 0) {
          addServiceFieldChange(name, oldValue, newValue);
        }
      }

  const overrideMapping: Record<string, keyof JanitorialFormState> = {
    baseHourlyRate: 'customBaseHourlyRate',
    shortJobHourlyRate: 'customShortJobHourlyRate',
    minHoursPerVisit: 'customMinHoursPerVisit',
    dustingPlacesPerHour: 'customDustingPlacesPerHour',
  };

      if (overrideMapping[name]) {
        const overrideKey = overrideMapping[name];
        const baselineValue = (pricingBaselines as any)[name] ?? 0;
        const overriddenValue = (next as any)[name];
        (next as any)[overrideKey] =
          typeof overriddenValue === 'number' && overriddenValue !== baselineValue
            ? overriddenValue
            : undefined;
      }

      console.log(`📝 Form updated: ${name} =`, (next as any)[name]);
      return next;
    });
  };

  const calc: JanitorialCalcResult = useMemo(() => {

    const activeConfig = backendConfig ? {

      baseHourlyRate: backendConfig.standardHourlyPricing?.standardHourlyRate ?? cfg.baseHourlyRate,
      shortJobHourlyRate: backendConfig.shortJobHourlyPricing?.shortJobHourlyRate ?? cfg.shortJobHourlyRate,
      minHoursPerVisit: backendConfig.standardHourlyPricing?.minimumHoursPerTrip ?? cfg.minHoursPerVisit,
      weeksPerMonth: backendConfig.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? cfg.weeksPerMonth,
      minContractMonths: backendConfig.contract?.minMonths ?? cfg.minContractMonths,
      maxContractMonths: backendConfig.contract?.maxMonths ?? cfg.maxContractMonths,
      dustingPlacesPerHour: backendConfig.dusting?.itemsPerHour ?? cfg.dustingPlacesPerHour,
      dustingPricePerPlace: backendConfig.dusting?.pricePerItem ?? cfg.dustingPricePerPlace,
      vacuumingDefaultHours: backendConfig.vacuuming?.estimatedTimeHoursPerJob ?? cfg.vacuumingDefaultHours,
      smoothBreakdownPricingTable: backendConfig.smoothBreakdownPricingTable ?? getDefaultTieredPricing(),
    } : {

      baseHourlyRate: cfg.baseHourlyRate,
      shortJobHourlyRate: cfg.shortJobHourlyRate,
      minHoursPerVisit: cfg.minHoursPerVisit,
      weeksPerMonth: cfg.weeksPerMonth,
      minContractMonths: cfg.minContractMonths,
      maxContractMonths: cfg.maxContractMonths,
      dustingPlacesPerHour: cfg.dustingPlacesPerHour,
      dustingPricePerPlace: cfg.dustingPricePerPlace,
      vacuumingDefaultHours: cfg.vacuumingDefaultHours,
      smoothBreakdownPricingTable: getDefaultTieredPricing(),
    };

    if (!backendConfig) {
      console.warn('⚠️ Using fallback config - backend not loaded yet');
    } else {
      console.log('✅ Using backend smoothBreakdownPricingTable:', activeConfig.smoothBreakdownPricingTable);
    }


    const manualHours = Math.max(0, Number(form.manualHours) || 0);
    const vacuumingHours = Math.max(0, Number(form.vacuumingHours) || 0);


    const dustingTotalPlaces = Math.max(0, Number(form.dustingTotalPlaces) || 0);
    const dustingPlacesPerHour = form.dustingPlacesPerHour || activeConfig.dustingPlacesPerHour;


    const dustingCalculatedHours = dustingTotalPlaces > 0
      ? dustingTotalPlaces / dustingPlacesPerHour
      : 0;
    const dustingHoursBase = dustingCalculatedHours;

    const totalHoursBase =
      manualHours + vacuumingHours + dustingCalculatedHours;

    console.log(`💰 Calculating - Hours: ${totalHoursBase.toFixed(2)}, Manual: ${manualHours}, Vacuuming: ${vacuumingHours}, Dusting: ${dustingTotalPlaces} places = ${dustingCalculatedHours.toFixed(2)} hrs (${dustingPlacesPerHour} places/hr)`);

    const pricingMode = form.serviceType === "oneTime"
      ? `One-Time Service ($${form.shortJobHourlyRate}/hr, min ${form.minHoursPerVisit} hrs)`
      : `Recurring Service ($${form.baseHourlyRate}/hr, min ${form.minHoursPerVisit} hrs)`;

    if (totalHoursBase === 0) {
      return {
        totalHours: 0,
        perVisit: 0,
        monthly: 0,
        annual: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
        originalContractTotal: 0,
        breakdown: {
          manualHours: 0,
          vacuumingHours: 0,
          dustingHours: 0,
          pricingMode,
          basePrice: 0,
          appliedMultiplier: 1,
        },
      };
    }


    if (form.serviceType === "oneTime") {

      const billableHours = Math.max(totalHoursBase, form.minHoursPerVisit);
      const baseServicePrice = billableHours * form.shortJobHourlyRate;


      const addonTimePrice = calculateAddonTimePrice(
        form.addonTimeMinutes,
        activeConfig.smoothBreakdownPricingTable,
        true
      );
      const totalPrice = baseServicePrice + addonTimePrice;

      console.log(`✅ One-Time Calculation - Base: $${baseServicePrice.toFixed(2)}, Add-on: $${addonTimePrice.toFixed(2)}, Total: $${totalPrice.toFixed(2)}`);

      return {
        totalHours: totalHoursBase,
        perVisit: totalPrice, 
        monthly: totalPrice, 
        annual: totalPrice,
        firstVisit: totalPrice,
        ongoingMonthly: totalPrice,
        contractTotal: totalPrice,
        originalContractTotal: totalPrice,
        breakdown: {
          manualHours,
          vacuumingHours,
          dustingHours: dustingHoursBase,
          pricingMode: `One-Time Service ($${form.shortJobHourlyRate}/hr, min ${form.minHoursPerVisit} hrs)`,
          basePrice: baseServicePrice,
          appliedMultiplier: 1,
        },
      };
    }


    const weeksPerMonth = form.weeksPerMonth;  
    const monthlyVisits = weeksPerMonth * form.visitsPerWeek; 


    const billableHours = Math.max(totalHoursBase, form.minHoursPerVisit);
    const recurringBasePrice = billableHours * form.baseHourlyRate;


    const addonTimePrice = calculateAddonTimePrice(
      form.addonTimeMinutes,
      activeConfig.smoothBreakdownPricingTable,
      true
    );
    const recurringPerVisit = recurringBasePrice + addonTimePrice;

    console.log(`✅ Recurring Calculation Debug:`, {
      addonTimeMinutes: form.addonTimeMinutes,
      smoothBreakdownPricingTiers: activeConfig.smoothBreakdownPricingTable?.length || 0,
      recurringBasePrice,
      addonTimePrice,
      recurringPerVisit,
      totalHoursBase,
      billableHours
    });


    const effectivePerVisit = form.customPerVisit ?? recurringPerVisit;


    const recurringMonthly = effectivePerVisit * monthlyVisits;


    const recurringWeekly = effectivePerVisit * form.visitsPerWeek;


    const hourlyRate = form.serviceType === "oneTime" ? form.shortJobHourlyRate : form.baseHourlyRate;
    const dustingCostPerVisit = dustingCalculatedHours * hourlyRate;


    const installationFee = form.installation && dustingTotalPlaces > 0
      ? dustingCostPerVisit * 2  
      : 0;


    const firstMonth = recurringMonthly + installationFee;


    const minMonths = activeConfig.minContractMonths ?? 2;
    const maxMonths = activeConfig.maxContractMonths ?? 36;
    const rawMonths = Number(form.contractMonths) || minMonths;
    const contractMonths = Math.min(
      Math.max(rawMonths, minMonths),
      maxMonths
    );


    const recurringContractTotal = contractMonths <= 0
      ? 0
      : firstMonth + Math.max(contractMonths - 1, 0) * recurringMonthly;

    console.log(`✅ Contract Calculation Details:`);
    console.log(`   - Regular Monthly: $${recurringMonthly.toFixed(2)}`);
    console.log(`   - Installation Fee: $${installationFee.toFixed(2)}`);
    console.log(`   - First Month: $${firstMonth.toFixed(2)} (regular + installation)`);
    console.log(`   - Contract Months: ${contractMonths}`);
    console.log(`   - Remaining Months: ${Math.max(contractMonths - 1, 0)}`);
    console.log(`   - Contract Total: $${recurringContractTotal.toFixed(2)}`);

    console.log(`✅ Final Calculation - Per Visit: $${effectivePerVisit.toFixed(2)}, Contract Total: $${recurringContractTotal.toFixed(2)}`);


    const finalPerVisit = effectivePerVisit; 
    const finalWeekly = recurringWeekly; 
    const finalFirstMonth = form.customMonthly ?? firstMonth;
    const finalRecurringMonthly = form.customOngoingMonthly ?? recurringMonthly; 
    const finalContractTotal = form.customContractTotal ?? recurringContractTotal; 


    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = finalContractTotal + customFieldsTotal;

    console.log(`📊 [JANITORIAL-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: finalContractTotal.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });

    const minimumChargePerVisit = form.serviceType === "oneTime"
      ? form.minHoursPerVisit * form.shortJobHourlyRate
      : form.minHoursPerVisit * form.baseHourlyRate;


    const baselineHourlyRate = activeConfig.baseHourlyRate;
    const baselineBillableHours = Math.max(totalHoursBase, activeConfig.minHoursPerVisit);
    const baselinePerVisitRated = baselineBillableHours * baselineHourlyRate;

    const baselineMinimumCharge = activeConfig.minHoursPerVisit * baselineHourlyRate;
    const baselinePerVisit = Math.max(baselinePerVisitRated, baselineMinimumCharge);
    const baselineMonthly = baselinePerVisit * monthlyVisits;
    let originalContractTotal = contractMonths <= 0
      ? 0
      : baselineMonthly + Math.max(contractMonths - 1, 0) * baselineMonthly;

    return {
      totalHours: totalHoursBase,
      perVisit: finalPerVisit,
      weekly: finalWeekly,
      monthly: finalFirstMonth, 
      firstMonth: finalFirstMonth, 
      recurringMonthly: finalRecurringMonthly, 
      annual: contractTotalWithCustomFields, 
      firstVisit: finalPerVisit,
      ongoingMonthly: finalRecurringMonthly, 
      contractTotal: contractTotalWithCustomFields, 
      originalContractTotal,
      minimumChargePerVisit, 
      breakdown: {
        manualHours,
        vacuumingHours,
        dustingHours: dustingCalculatedHours,  
        dustingTotalPlaces,                    
        dustingPlacesPerHour,                  
        pricingMode: `Recurring Service ($${form.baseHourlyRate}/hr, min ${form.minHoursPerVisit} hrs)`,
        basePrice: recurringBasePrice,
        appliedMultiplier: 1,
        installationFee,
        monthlyVisits,
      },
    };
  }, [
    backendConfig,  
    form,

    calcFieldsTotal,
    dollarFieldsTotal,
  ]);

  return {
    form,
    setForm,
    onChange,
    calc,
    refreshConfig,
    isLoadingConfig,
  };
}


import { useState, useEffect, useMemo, ChangeEvent, useCallback, useRef } from "react";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";
import type {
  JanitorialFormState,
  JanitorialQuoteResult,
  JanitorialCalcDetails,
  JanitorialPricingConfig
} from "./janitorialTypes";


interface BackendJanitorialConfig {
  baseRates: {
    recurringService: number;
    oneTimeService: number;
  };
  additionalServices: {
    vacuuming: {
      baseHours: number;
      ratePerHour: number;
    };
    dusting: {
      baseHours: number;
      ratePerHour: number;
    };
  };
  frequencyMultipliers: Record<string, number>;
  billingConversions: Record<string, number>;
  minimums: {
    perVisit: number;
    recurringContract: number;
  };
  tripCharges: {
    standard: number;
    insideBeltway: number;
    paidParking: number;
  };
}


const DEFAULT_FORM: JanitorialFormState = {
  serviceId: "janitorial",


  serviceType: "recurringService",
  frequency: "weekly",
  location: "insideBeltway",
  contractMonths: 12,
  baseHours: 5.07,
  vacuumingHours: 4,
  dustingHours: 2,
  needsParking: false,
  parkingCost: 0,


  recurringServiceRate: cfg.baseRates.recurringService,
  oneTimeServiceRate: cfg.baseRates.oneTimeService,
  vacuumingRatePerHour: cfg.additionalServices.vacuuming.ratePerHour,
  dustingRatePerHour: cfg.additionalServices.dusting.ratePerHour,


  dailyMultiplier: cfg.frequencyMultipliers.daily,
  weeklyMultiplier: cfg.frequencyMultipliers.weekly,
  biweeklyMultiplier: cfg.frequencyMultipliers.biweekly,
  monthlyMultiplier: cfg.frequencyMultipliers.monthly,
  oneTimeMultiplier: cfg.frequencyMultipliers.oneTime,


  perVisitMinimum: cfg.minimums.perVisit,
  recurringContractMinimum: cfg.minimums.recurringContract,


  standardTripCharge: cfg.tripCharges.standard,
  beltwayTripCharge: cfg.tripCharges.insideBeltway,
  paidParkingTripCharge: cfg.tripCharges.paidParking,
};


export function useJanitorialCalc(initial?: Partial<JanitorialFormState>) {

  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);


  const isEditMode = useRef(!!initial);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);


  const servicesContext = useServicesContextOptional();


  const [form, setForm] = useState<JanitorialFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM,
      ...initial
    };


    const isInitiallyActive = (initial?.baseHours || 0) > 0;
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


  const [backendConfig, setBackendConfig] = useState<BackendJanitorialConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);


  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `janitorial_${fieldName}`,
      productName: `Janitorial - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.baseHours || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [JANITORIAL-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.baseHours, form.frequency]);


  const updateFormWithConfig = (config: BackendJanitorialConfig, forceUpdate: boolean = false) => {


    if (initial && !forceUpdate) {
      console.log('📋 [JANITORIAL] Edit mode: Skipping form update to preserve loaded values');
      return; 
    }

    console.log('📋 [JANITORIAL] Updating form with backend config', forceUpdate ? '(FORCED by refresh button)' : '');
    setForm((prev) => ({
      ...prev,

      recurringServiceRate: config.baseRates?.recurringService ?? prev.recurringServiceRate,
      oneTimeServiceRate: config.baseRates?.oneTimeService ?? prev.oneTimeServiceRate,
      vacuumingRatePerHour: config.additionalServices?.vacuuming?.ratePerHour ?? prev.vacuumingRatePerHour,
      dustingRatePerHour: config.additionalServices?.dusting?.ratePerHour ?? prev.dustingRatePerHour,
      perVisitMinimum: config.minimums?.perVisit ?? prev.perVisitMinimum,
      recurringContractMinimum: config.minimums?.recurringContract ?? prev.recurringContractMinimum,
      standardTripCharge: config.tripCharges?.standard ?? prev.standardTripCharge,
      beltwayTripCharge: config.tripCharges?.insideBeltway ?? prev.beltwayTripCharge,
      paidParkingTripCharge: config.tripCharges?.paidParking ?? prev.paidParkingTripCharge,
      dailyMultiplier: config.frequencyMultipliers?.daily ?? prev.dailyMultiplier,
      weeklyMultiplier: config.frequencyMultipliers?.weekly ?? prev.weeklyMultiplier,
      biweeklyMultiplier: config.frequencyMultipliers?.biweekly ?? prev.biweeklyMultiplier,
      monthlyMultiplier: config.frequencyMultipliers?.monthly ?? prev.monthlyMultiplier,
      oneTimeMultiplier: config.frequencyMultipliers?.oneTime ?? prev.oneTimeMultiplier,
    }));
  };


  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {

      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("janitorial");
        if (backendData?.config) {
          console.log('✅ [Janitorial] Using cached pricing data from context');
          const config = backendData.config as BackendJanitorialConfig;


          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [JANITORIAL] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,

              customRecurringServiceRate: undefined,
              customOneTimeServiceRate: undefined,
              customVacuumingRatePerHour: undefined,
              customDustingRatePerHour: undefined,
              customDailyMultiplier: undefined,
              customWeeklyMultiplier: undefined,
              customBiweeklyMultiplier: undefined,
              customMonthlyMultiplier: undefined,
              customOneTimeMultiplier: undefined,
              customPerVisitMinimum: undefined,
              customRecurringContractMinimum: undefined,
              customStandardTripCharge: undefined,
              customBeltwayTripCharge: undefined,
              customPaidParkingTripCharge: undefined,

              customPerVisitTotal: undefined,
              customMonthlyTotal: undefined,
              customAnnualTotal: undefined,
              customContractTotal: undefined,
            }));
          }

          console.log('✅ Janitorial CONFIG loaded from context:', {
            baseRates: config.baseRates,
            additionalServices: config.additionalServices,
            minimums: config.minimums,
            tripCharges: config.tripCharges,
            frequencyMultipliers: config.frequencyMultipliers,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for Janitorial, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch Janitorial config from context:', error);


      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("janitorial");
        if (fallbackConfig?.config) {
          console.log('✅ [Janitorial] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendJanitorialConfig;


          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);


          if (forceRefresh) {
            console.log('🔄 [JANITORIAL] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,

              customRecurringServiceRate: undefined,
              customOneTimeServiceRate: undefined,
              customVacuumingRatePerHour: undefined,
              customDustingRatePerHour: undefined,
              customDailyMultiplier: undefined,
              customWeeklyMultiplier: undefined,
              customBiweeklyMultiplier: undefined,
              customMonthlyMultiplier: undefined,
              customOneTimeMultiplier: undefined,
              customPerVisitMinimum: undefined,
              customRecurringContractMinimum: undefined,
              customStandardTripCharge: undefined,
              customBeltwayTripCharge: undefined,
              customPaidParkingTripCharge: undefined,

              customPerVisitTotal: undefined,
              customMonthlyTotal: undefined,
              customAnnualTotal: undefined,
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

    console.log('📋 [JANITORIAL-PRICING] Fetching backend config (initial load, will not overwrite edit mode values)');
    fetchPricing(false); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!backendConfig) return;


    if (!baselineInitialized.current) {
      baselineInitialized.current = true;


      baselineValues.current = {
        recurringServiceRate: initial?.recurringServiceRate ?? backendConfig.baseRates?.recurringService ?? form.recurringServiceRate,
        oneTimeServiceRate: initial?.oneTimeServiceRate ?? backendConfig.baseRates?.oneTimeService ?? form.oneTimeServiceRate,
        vacuumingRatePerHour: initial?.vacuumingRatePerHour ?? backendConfig.additionalServices?.vacuuming?.ratePerHour ?? form.vacuumingRatePerHour,
        dustingRatePerHour: initial?.dustingRatePerHour ?? backendConfig.additionalServices?.dusting?.ratePerHour ?? form.dustingRatePerHour,
        perVisitMinimum: initial?.perVisitMinimum ?? backendConfig.minimums?.perVisit ?? form.perVisitMinimum,
        recurringContractMinimum: initial?.recurringContractMinimum ?? backendConfig.minimums?.recurringContract ?? form.recurringContractMinimum,
        standardTripCharge: initial?.standardTripCharge ?? backendConfig.tripCharges?.standard ?? form.standardTripCharge,
        beltwayTripCharge: initial?.beltwayTripCharge ?? backendConfig.tripCharges?.insideBeltway ?? form.beltwayTripCharge,
        paidParkingTripCharge: initial?.paidParkingTripCharge ?? backendConfig.tripCharges?.paidParking ?? form.paidParkingTripCharge,
        dailyMultiplier: initial?.dailyMultiplier ?? backendConfig.frequencyMultipliers?.daily ?? form.dailyMultiplier,
        weeklyMultiplier: initial?.weeklyMultiplier ?? backendConfig.frequencyMultipliers?.weekly ?? form.weeklyMultiplier,
        biweeklyMultiplier: initial?.biweeklyMultiplier ?? backendConfig.frequencyMultipliers?.biweekly ?? form.biweeklyMultiplier,
        monthlyMultiplier: initial?.monthlyMultiplier ?? backendConfig.frequencyMultipliers?.monthly ?? form.monthlyMultiplier,
        oneTimeMultiplier: initial?.oneTimeMultiplier ?? backendConfig.frequencyMultipliers?.oneTime ?? form.oneTimeMultiplier,
      };

      console.log('✅ [JANITORIAL-BASELINE] Initialized baseline values for logging (ALL fields):', {
        ...baselineValues.current,
        note: initial ? 'Edit mode: using loaded/saved values' : 'New document: using backend defaults'
      });


      if (initial) {
        console.log('🔍 [JANITORIAL-PRICING] Detecting price overrides for yellow highlighting...');


        const overrides = {
          customRecurringServiceRate: (initial.recurringServiceRate !== undefined &&
                                       initial.recurringServiceRate !== backendConfig.baseRates?.recurringService)
                                       ? initial.recurringServiceRate : undefined,

          customOneTimeServiceRate: (initial.oneTimeServiceRate !== undefined &&
                                     initial.oneTimeServiceRate !== backendConfig.baseRates?.oneTimeService)
                                     ? initial.oneTimeServiceRate : undefined,

          customVacuumingRatePerHour: (initial.vacuumingRatePerHour !== undefined &&
                                       initial.vacuumingRatePerHour !== backendConfig.additionalServices?.vacuuming?.ratePerHour)
                                       ? initial.vacuumingRatePerHour : undefined,

          customDustingRatePerHour: (initial.dustingRatePerHour !== undefined &&
                                     initial.dustingRatePerHour !== backendConfig.additionalServices?.dusting?.ratePerHour)
                                     ? initial.dustingRatePerHour : undefined,

          customPerVisitMinimum: (initial.perVisitMinimum !== undefined &&
                                 initial.perVisitMinimum !== backendConfig.minimums?.perVisit)
                                 ? initial.perVisitMinimum : undefined,

          customRecurringContractMinimum: (initial.recurringContractMinimum !== undefined &&
                                          initial.recurringContractMinimum !== backendConfig.minimums?.recurringContract)
                                          ? initial.recurringContractMinimum : undefined,

          customStandardTripCharge: (initial.standardTripCharge !== undefined &&
                                    initial.standardTripCharge !== backendConfig.tripCharges?.standard)
                                    ? initial.standardTripCharge : undefined,

          customBeltwayTripCharge: (initial.beltwayTripCharge !== undefined &&
                                   initial.beltwayTripCharge !== backendConfig.tripCharges?.insideBeltway)
                                   ? initial.beltwayTripCharge : undefined,

          customPaidParkingTripCharge: (initial.paidParkingTripCharge !== undefined &&
                                       initial.paidParkingTripCharge !== backendConfig.tripCharges?.paidParking)
                                       ? initial.paidParkingTripCharge : undefined,

          customDailyMultiplier: (initial.dailyMultiplier !== undefined &&
                                 initial.dailyMultiplier !== backendConfig.frequencyMultipliers?.daily)
                                 ? initial.dailyMultiplier : undefined,

          customWeeklyMultiplier: (initial.weeklyMultiplier !== undefined &&
                                  initial.weeklyMultiplier !== backendConfig.frequencyMultipliers?.weekly)
                                  ? initial.weeklyMultiplier : undefined,

          customBiweeklyMultiplier: (initial.biweeklyMultiplier !== undefined &&
                                    initial.biweeklyMultiplier !== backendConfig.frequencyMultipliers?.biweekly)
                                    ? initial.biweeklyMultiplier : undefined,

          customMonthlyMultiplier: (initial.monthlyMultiplier !== undefined &&
                                   initial.monthlyMultiplier !== backendConfig.frequencyMultipliers?.monthly)
                                   ? initial.monthlyMultiplier : undefined,

          customOneTimeMultiplier: (initial.oneTimeMultiplier !== undefined &&
                                   initial.oneTimeMultiplier !== backendConfig.frequencyMultipliers?.oneTime)
                                   ? initial.oneTimeMultiplier : undefined,
        };


        const hasAnyOverrides = Object.values(overrides).some(v => v !== undefined);

        if (hasAnyOverrides) {
          setForm(prev => ({
            ...prev,
            ...overrides, 
          }));

          console.log('✅ [JANITORIAL-PRICING] Set custom override fields for yellow highlighting:',
            Object.fromEntries(
              Object.entries(overrides).filter(([_, value]) => value !== undefined)
            )
          );
        } else {
          console.log('ℹ️ [JANITORIAL-PRICING] No price overrides detected - using backend defaults');
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
    const isServiceActive = (form.baseHours || 0) > 0;
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
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.baseHours, servicesContext]);


  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({
      ...prev,
      contractMonths: months,
    }));
  }, []);


  const updateField = <K extends keyof JanitorialFormState>(
    field: K,
    value: JanitorialFormState[K]
  ) => {

    const originalValue = form[field];

    setForm(prev => ({
      ...prev,
      [field]: value
    }));


    const customToBaseFieldMap: Record<string, string> = {
      'customRecurringServiceRate': 'recurringServiceRate',
      'customOneTimeServiceRate': 'oneTimeServiceRate',
      'customVacuumingRatePerHour': 'vacuumingRatePerHour',
      'customDustingRatePerHour': 'dustingRatePerHour',
      'customDailyMultiplier': 'dailyMultiplier',
      'customWeeklyMultiplier': 'weeklyMultiplier',
      'customBiweeklyMultiplier': 'biweeklyMultiplier',
      'customMonthlyMultiplier': 'monthlyMultiplier',
      'customOneTimeMultiplier': 'oneTimeMultiplier',
      'customPerVisitMinimum': 'perVisitMinimum',
      'customRecurringContractMinimum': 'recurringContractMinimum',
      'customStandardTripCharge': 'standardTripCharge',
      'customBeltwayTripCharge': 'beltwayTripCharge',
      'customPaidParkingTripCharge': 'paidParkingTripCharge',
      'customPerVisitTotal': 'perVisitMinimum',
      'customMonthlyTotal': 'recurringServiceRate',
      'customAnnualTotal': 'recurringServiceRate',
      'customContractTotal': 'recurringServiceRate',
    };


    const baseEditableFields = [
      'recurringServiceRate', 'oneTimeServiceRate', 'vacuumingRatePerHour', 'dustingRatePerHour',
      'perVisitMinimum', 'recurringContractMinimum', 'standardTripCharge', 'beltwayTripCharge',
      'paidParkingTripCharge', 'parkingCost', 'baseHours', 'vacuumingHours', 'dustingHours',
      'dailyMultiplier', 'weeklyMultiplier', 'biweeklyMultiplier', 'monthlyMultiplier', 'oneTimeMultiplier'
    ];


    const customRateOverrideFields = [
      'customRecurringServiceRate', 'customOneTimeServiceRate', 'customVacuumingRatePerHour',
      'customDustingRatePerHour', 'customDailyMultiplier', 'customWeeklyMultiplier',
      'customBiweeklyMultiplier', 'customMonthlyMultiplier', 'customOneTimeMultiplier',
      'customPerVisitMinimum', 'customRecurringContractMinimum', 'customStandardTripCharge',
      'customBeltwayTripCharge', 'customPaidParkingTripCharge'
    ];


    const customTotalOverrideFields = [
      'customPerVisitTotal', 'customMonthlyTotal', 'customAnnualTotal', 'customContractTotal'
    ];

    const allPricingFields = [...baseEditableFields, ...customRateOverrideFields, ...customTotalOverrideFields];

    if (allPricingFields.includes(field as string)) {
      const newValue = value as number | undefined;
      const keyStr = field as string;


      const baseFieldForLookup = customToBaseFieldMap[keyStr] || keyStr;
      const baselineValue = baselineValues.current[baseFieldForLookup];

      console.log(`🔍 [JANITORIAL-LOGGING] Field: ${keyStr}`, {
        newValue,
        baseFieldForLookup,
        baselineValue,
        isCustomField: keyStr.startsWith('custom'),
      });


      if (newValue !== undefined && baselineValue !== undefined &&
          typeof newValue === 'number' && typeof baselineValue === 'number' &&
          newValue !== baselineValue) {
        console.log(`📝 [JANITORIAL-BASELINE-LOG] Logging change for ${keyStr}:`, {
          baseline: baselineValue,
          newValue,
          change: newValue - baselineValue,
          changePercent: ((newValue - baselineValue) / baselineValue * 100).toFixed(1) + '%'
        });
        addServiceFieldChange(keyStr, baselineValue, newValue);
      } else {
        console.log(`⚠️ [JANITORIAL-LOGGING] NOT logging for ${keyStr}:`, {
          reason: newValue === undefined ? 'newValue is undefined' :
                  baselineValue === undefined ? 'baselineValue is undefined' :
                  typeof newValue !== 'number' ? `newValue is ${typeof newValue}, not number` :
                  typeof baselineValue !== 'number' ? `baselineValue is ${typeof baselineValue}, not number` :
                  'values are equal',
          newValue,
          baselineValue,
        });
      }
    }


    const allFormFields = [

      'hoursPerWeek', 'weeksPerMonth', 'contractMonths', 'squareFootage',

      'frequency', 'serviceType', 'rateTier',

      'includesVacuuming', 'includesDusting', 'includesRestroom', 'includesKitchen',
      'includesTrash', 'includesWindows'
    ];


    if (allFormFields.includes(field as string)) {
      logServiceFieldChanges(
        'janitorial',
        'Janitorial',
        { [field]: value },
        { [field]: originalValue },
        [field as string],
        form.hoursPerWeek || 1,
        form.frequency || 'weekly'
      );
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const target: any = e.target;

    const value = type === 'checkbox'
      ? target.checked
      : type === 'number'
        ? parseFloat(target.value) || 0
        : target.value;

    updateField(name as keyof JanitorialFormState, value);
  };


  useEffect(() => {
    fetchPricing();
  }, []);


  const calc = useMemo(() => {

    const activeConfig = backendConfig || {
      baseRates: cfg.baseRates,
      additionalServices: cfg.additionalServices,
      frequencyMultipliers: cfg.frequencyMultipliers,
      billingConversions: cfg.billingConversions,
      minimums: cfg.minimums,
      tripCharges: cfg.tripCharges,
    };


    const effectiveRecurringServiceRate = form.customRecurringServiceRate ?? form.recurringServiceRate;
    const effectiveOneTimeServiceRate = form.customOneTimeServiceRate ?? form.oneTimeServiceRate;
    const effectiveVacuumingRatePerHour = form.customVacuumingRatePerHour ?? form.vacuumingRatePerHour;
    const effectiveDustingRatePerHour = form.customDustingRatePerHour ?? form.dustingRatePerHour;
    const effectivePerVisitMinimum = form.customPerVisitMinimum ?? form.perVisitMinimum;
    const effectiveRecurringContractMinimum = form.customRecurringContractMinimum ?? form.recurringContractMinimum;
    const effectiveStandardTripCharge = form.customStandardTripCharge ?? form.standardTripCharge;
    const effectiveBeltwayTripCharge = form.customBeltwayTripCharge ?? form.beltwayTripCharge;
    const effectivePaidParkingTripCharge = form.customPaidParkingTripCharge ?? form.paidParkingTripCharge;
    const effectiveDailyMultiplier = form.customDailyMultiplier ?? form.dailyMultiplier;
    const effectiveWeeklyMultiplier = form.customWeeklyMultiplier ?? form.weeklyMultiplier;
    const effectiveBiweeklyMultiplier = form.customBiweeklyMultiplier ?? form.biweeklyMultiplier;
    const effectiveMonthlyMultiplier = form.customMonthlyMultiplier ?? form.monthlyMultiplier;
    const effectiveOneTimeMultiplier = form.customOneTimeMultiplier ?? form.oneTimeMultiplier;

    console.log('🔧 [JANITORIAL-CALC] Using effective values:', {
      effectiveRecurringServiceRate,
      effectiveOneTimeServiceRate,
      effectiveVacuumingRatePerHour,
      effectiveDustingRatePerHour,
      effectivePerVisitMinimum,
      effectiveRecurringContractMinimum,
      effectiveStandardTripCharge,
      effectiveBeltwayTripCharge,
      effectivePaidParkingTripCharge,
    });


    const baseServiceRate = form.serviceType === "recurringService"
      ? effectiveRecurringServiceRate
      : effectiveOneTimeServiceRate;
    const baseServiceCost = form.baseHours * baseServiceRate;


    const vacuumingCost = form.vacuumingHours * effectiveVacuumingRatePerHour;
    const dustingCost = form.dustingHours * effectiveDustingRatePerHour;


    let tripCharge = 0;
    if (form.location === "insideBeltway") {
      tripCharge = effectiveBeltwayTripCharge;
    } else {
      tripCharge = effectiveStandardTripCharge;
    }


    if (form.needsParking) {
      tripCharge += form.parkingCost || effectivePaidParkingTripCharge;
    }


    const perVisit = Math.max(
      baseServiceCost + vacuumingCost + dustingCost + tripCharge,
      effectivePerVisitMinimum
    );


    let frequencyMultiplier = 1;
    if (activeConfig.frequencyMultipliers && form.frequency in activeConfig.frequencyMultipliers) {
      frequencyMultiplier = activeConfig.frequencyMultipliers[form.frequency];
    } else {

      switch (form.frequency) {
        case "daily": frequencyMultiplier = effectiveDailyMultiplier; break;
        case "weekly": frequencyMultiplier = effectiveWeeklyMultiplier; break;
        case "biweekly": frequencyMultiplier = effectiveBiweeklyMultiplier; break;
        case "monthly": frequencyMultiplier = effectiveMonthlyMultiplier; break;
        case "oneTime": frequencyMultiplier = effectiveOneTimeMultiplier; break;
        default: frequencyMultiplier = 1;
      }
    }


    const monthlyTotal = perVisit * frequencyMultiplier;
    const contractTotal = Math.max(
      monthlyTotal * form.contractMonths,
      effectiveRecurringContractMinimum
    );


    const appliedRules: string[] = [];
    if (baseServiceCost + vacuumingCost + dustingCost + tripCharge < effectivePerVisitMinimum) {
      appliedRules.push(`Per visit minimum applied: $${effectivePerVisitMinimum.toFixed(2)}`);
    }
    if (monthlyTotal * form.contractMonths < effectiveRecurringContractMinimum && form.serviceType === "recurringService") {
      appliedRules.push(`Contract minimum applied: $${effectiveRecurringContractMinimum.toFixed(2)}`);
    }

    return {
      baseServiceCost,
      vacuumingCost,
      dustingCost,
      tripCharge,
      perVisit,
      monthlyTotal,
      contractTotal,
      frequencyMultiplier,
      appliedRules,
    };
  }, [backendConfig, form]); 


  const quote: JanitorialQuoteResult = {
    serviceId: "janitorial",
    displayName: "Janitorial Services",
    perVisitPrice: calc.perVisit,
    monthlyTotal: calc.monthlyTotal,
    contractTotal: calc.contractTotal,
    detailsBreakdown: [
      `Base service: ${form.baseHours} hrs @ $${(form.serviceType === "recurringService" ? form.recurringServiceRate : form.oneTimeServiceRate).toFixed(2)}/hr`,
      `Vacuuming: ${form.vacuumingHours} hrs @ $${form.vacuumingRatePerHour.toFixed(2)}/hr`,
      `Dusting: ${form.dustingHours} hrs @ $${form.dustingRatePerHour.toFixed(2)}/hr`,
      `Frequency: ${form.frequency}`,
    ],
  };

  return {
    form,
    setForm,
    updateField,
    onChange,
    calc,
    quote,
    backendConfig,
    isLoadingConfig,
    refreshConfig: () => fetchPricing(true), 
    setContractMonths,
  };
}

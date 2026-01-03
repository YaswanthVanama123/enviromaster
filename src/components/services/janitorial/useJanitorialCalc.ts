// src/components/services/janitorial/useJanitorialCalc.ts
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

// Backend interface (matches MongoDB structure)
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

// Default form state (from config)
const DEFAULT_FORM: JanitorialFormState = {
  serviceId: "janitorial",

  // Business logic fields
  serviceType: "recurringService",
  frequency: "weekly",
  location: "insideBeltway",
  contractMonths: 12,
  baseHours: 5.07,
  vacuumingHours: 4,
  dustingHours: 2,
  needsParking: false,
  parkingCost: 0,

  // Editable pricing rates (initialized from config)
  recurringServiceRate: cfg.baseRates.recurringService,
  oneTimeServiceRate: cfg.baseRates.oneTimeService,
  vacuumingRatePerHour: cfg.additionalServices.vacuuming.ratePerHour,
  dustingRatePerHour: cfg.additionalServices.dusting.ratePerHour,

  // Frequency multipliers
  dailyMultiplier: cfg.frequencyMultipliers.daily,
  weeklyMultiplier: cfg.frequencyMultipliers.weekly,
  biweeklyMultiplier: cfg.frequencyMultipliers.biweekly,
  monthlyMultiplier: cfg.frequencyMultipliers.monthly,
  oneTimeMultiplier: cfg.frequencyMultipliers.oneTime,

  // Minimums
  perVisitMinimum: cfg.minimums.perVisit,
  recurringContractMinimum: cfg.minimums.recurringContract,

  // Trip charges
  standardTripCharge: cfg.tripCharges.standard,
  beltwayTripCharge: cfg.tripCharges.insideBeltway,
  paidParkingTripCharge: cfg.tripCharges.paidParking,
};

// Main hook
export function useJanitorialCalc(initial?: Partial<JanitorialFormState>) {
  // ✅ Add refs for tracking override and active state
  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);

  // ✅ Add refs for tracking baseline values and edit mode
  const isEditMode = useRef(!!initial);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // State
  const [form, setForm] = useState<JanitorialFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM,
      ...initial
    };

    // ✅ Initialize with global months ONLY if service starts with inputs
    const isInitiallyActive = (initial?.baseHours || 0) > 0;
    const defaultContractMonths = initial?.contractMonths
      ? initial.contractMonths
      : (isInitiallyActive && servicesContext?.globalContractMonths)
        ? servicesContext.globalContractMonths
        : 12;

    return {
      ...baseForm,
      contractMonths: defaultContractMonths,
    };
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendJanitorialConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
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

  // Helper function to update form with config data
  const updateFormWithConfig = (config: BackendJanitorialConfig, forceUpdate: boolean = false) => {
    // ✅ FIXED: In edit mode, NEVER overwrite user's loaded values (unless force refresh)
    // Only update on manual refresh (when user explicitly clicks refresh button)
    if (initial && !forceUpdate) {
      console.log('📋 [JANITORIAL] Edit mode: Skipping form update to preserve loaded values');
      return; // Don't overwrite loaded values in edit mode
    }

    console.log('📋 [JANITORIAL] Updating form with backend config', forceUpdate ? '(FORCED by refresh button)' : '');
    setForm((prev) => ({
      ...prev,
      // Update all rate fields from backend if available
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

  // ⚡ OPTIMIZED: Fetch pricing config from context (NO API call)
  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {
      // ⚡ Use context's backend pricing data directly (already loaded by useAllServicePricing)
      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("janitorial");
        if (backendData?.config) {
          console.log('✅ [Janitorial] Using cached pricing data from context');
          const config = backendData.config as BackendJanitorialConfig;

          // ✅ Store the ENTIRE backend config for use in calculations
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);

          // ✅ Only clear custom overrides on manual refresh
          if (forceRefresh) {
            console.log('🔄 [JANITORIAL] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              // Clear custom RATE overrides
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
              // Clear custom TOTAL overrides
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

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("janitorial");
        if (fallbackConfig?.config) {
          console.log('✅ [Janitorial] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendJanitorialConfig;

          // ✅ Store the ENTIRE backend config for use in calculations
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);

          // ✅ FIXED: Only clear custom overrides on manual refresh
          if (forceRefresh) {
            console.log('🔄 [JANITORIAL] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              // Clear custom RATE overrides
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
              // Clear custom TOTAL overrides
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

  // ✅ FIXED: Always fetch backend config on mount (but do not overwrite in edit mode)
  useEffect(() => {
    // Always fetch backend config to enable override detection in edit mode
    console.log('📋 [JANITORIAL-PRICING] Fetching backend config (initial load, will not overwrite edit mode values)');
    fetchPricing(false); // false = don't force update in edit mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ NEW: Detect overrides after backend config loads (for yellow highlighting in edit mode)
  useEffect(() => {
    if (!backendConfig) return;

    // ✅ STEP 1: Initialize baseline values ONCE (for logging)
    if (!baselineInitialized.current) {
      baselineInitialized.current = true;

      // Baseline = loaded/saved value (edit mode) OR backend default (new document) OR current state (fallback)
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

      // ✅ STEP 2: Detect overrides for yellow highlighting (edit mode only) - ONLY ONCE!
      if (initial) {
        console.log('🔍 [JANITORIAL-PRICING] Detecting price overrides for yellow highlighting...');

        // ✅ FIXED: Compare ALL rate fields against backend defaults
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

        // Only set overrides that are actually different
        const hasAnyOverrides = Object.values(overrides).some(v => v !== undefined);

        if (hasAnyOverrides) {
          setForm(prev => ({
            ...prev,
            ...overrides, // Spread all override fields
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

  // Also fetch when services context becomes available (for fallback pricing)
  useEffect(() => {
    // Fetch from context if backend config not loaded yet (even in edit mode, for override detection)
    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

  // ✅ Add sync effect to adopt global months when service becomes active or when global months change
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

  // ✅ Add setContractMonths function
  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({
      ...prev,
      contractMonths: months,
    }));
  }, []);

  // Form handlers
  const updateField = <K extends keyof JanitorialFormState>(
    field: K,
    value: JanitorialFormState[K]
  ) => {
    // ✅ Capture original value before update
    const originalValue = form[field];

    setForm(prev => ({
      ...prev,
      [field]: value
    }));

    // ✅ EXPLICIT: Map custom field names to base field names for baseline lookup
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

    // ✅ Log price override for numeric pricing fields (BASE fields and CUSTOM override fields)
    const baseEditableFields = [
      'recurringServiceRate', 'oneTimeServiceRate', 'vacuumingRatePerHour', 'dustingRatePerHour',
      'perVisitMinimum', 'recurringContractMinimum', 'standardTripCharge', 'beltwayTripCharge',
      'paidParkingTripCharge', 'parkingCost', 'baseHours', 'vacuumingHours', 'dustingHours',
      'dailyMultiplier', 'weeklyMultiplier', 'biweeklyMultiplier', 'monthlyMultiplier', 'oneTimeMultiplier'
    ];

    // ✅ CRITICAL: Custom RATE override fields (set by user editing in UI)
    const customRateOverrideFields = [
      'customRecurringServiceRate', 'customOneTimeServiceRate', 'customVacuumingRatePerHour',
      'customDustingRatePerHour', 'customDailyMultiplier', 'customWeeklyMultiplier',
      'customBiweeklyMultiplier', 'customMonthlyMultiplier', 'customOneTimeMultiplier',
      'customPerVisitMinimum', 'customRecurringContractMinimum', 'customStandardTripCharge',
      'customBeltwayTripCharge', 'customPaidParkingTripCharge'
    ];

    // Custom TOTAL override fields
    const customTotalOverrideFields = [
      'customPerVisitTotal', 'customMonthlyTotal', 'customAnnualTotal', 'customContractTotal'
    ];

    const allPricingFields = [...baseEditableFields, ...customRateOverrideFields, ...customTotalOverrideFields];

    if (allPricingFields.includes(field as string)) {
      const newValue = value as number | undefined;
      const keyStr = field as string;

      // ✅ FIXED: Always use base field name for baseline lookup
      const baseFieldForLookup = customToBaseFieldMap[keyStr] || keyStr;
      const baselineValue = baselineValues.current[baseFieldForLookup];

      console.log(`🔍 [JANITORIAL-LOGGING] Field: ${keyStr}`, {
        newValue,
        baseFieldForLookup,
        baselineValue,
        isCustomField: keyStr.startsWith('custom'),
      });

      // ✅ CRITICAL: Always compare newValue with BASELINE (not with previous value)
      // This ensures Map replaces previous entry with updated value still comparing to baseline
      // Example: First change 10→15 logs "10→15", second change 15→20 REPLACES with "10→20"
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

    // ✅ NEW: Log form field changes using universal logger
    const allFormFields = [
      // Quantity fields
      'hoursPerWeek', 'weeksPerMonth', 'contractMonths', 'squareFootage',
      // Selection fields
      'frequency', 'serviceType', 'rateTier',
      // Boolean fields
      'includesVacuuming', 'includesDusting', 'includesRestroom', 'includesKitchen',
      'includesTrash', 'includesWindows'
    ];

    // Log non-pricing field changes
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

  // Fetch on mount
  useEffect(() => {
    fetchPricing();
  }, []);

  // Core calculation logic
  const calc = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = backendConfig || {
      baseRates: cfg.baseRates,
      additionalServices: cfg.additionalServices,
      frequencyMultipliers: cfg.frequencyMultipliers,
      billingConversions: cfg.billingConversions,
      minimums: cfg.minimums,
      tripCharges: cfg.tripCharges,
    };

    // ========== EFFECTIVE VALUES (use custom overrides if set, otherwise base values) ==========
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

    // Base service cost calculation (use effective rates)
    const baseServiceRate = form.serviceType === "recurringService"
      ? effectiveRecurringServiceRate
      : effectiveOneTimeServiceRate;
    const baseServiceCost = form.baseHours * baseServiceRate;

    // Additional services (use effective rates)
    const vacuumingCost = form.vacuumingHours * effectiveVacuumingRatePerHour;
    const dustingCost = form.dustingHours * effectiveDustingRatePerHour;

    // Trip charge based on location (use effective rates)
    let tripCharge = 0;
    if (form.location === "insideBeltway") {
      tripCharge = effectiveBeltwayTripCharge;
    } else {
      tripCharge = effectiveStandardTripCharge;
    }

    // Add parking cost if needed (use effective rate)
    if (form.needsParking) {
      tripCharge += form.parkingCost || effectivePaidParkingTripCharge;
    }

    // Per visit total (use effective minimum)
    const perVisit = Math.max(
      baseServiceCost + vacuumingCost + dustingCost + tripCharge,
      effectivePerVisitMinimum
    );

    // Frequency multiplier from backend config or form (use effective multipliers)
    let frequencyMultiplier = 1;
    if (activeConfig.frequencyMultipliers && form.frequency in activeConfig.frequencyMultipliers) {
      frequencyMultiplier = activeConfig.frequencyMultipliers[form.frequency];
    } else {
      // Fallback to form values (use effective multipliers)
      switch (form.frequency) {
        case "daily": frequencyMultiplier = effectiveDailyMultiplier; break;
        case "weekly": frequencyMultiplier = effectiveWeeklyMultiplier; break;
        case "biweekly": frequencyMultiplier = effectiveBiweeklyMultiplier; break;
        case "monthly": frequencyMultiplier = effectiveMonthlyMultiplier; break;
        case "oneTime": frequencyMultiplier = effectiveOneTimeMultiplier; break;
        default: frequencyMultiplier = 1;
      }
    }

    // Monthly and contract calculations (use effective minimum)
    const monthlyTotal = perVisit * frequencyMultiplier;
    const contractTotal = Math.max(
      monthlyTotal * form.contractMonths,
      effectiveRecurringContractMinimum
    );

    // Applied rules tracking
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
  }, [backendConfig, form]); // ✅ CRITICAL: Re-calculate when backend config loads OR form changes!

  // Create quote result
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
    refreshConfig: () => fetchPricing(true), // ✅ FIXED: Force refresh when button clicked
    setContractMonths,
  };
}
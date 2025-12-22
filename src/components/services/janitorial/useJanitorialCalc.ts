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
  const updateFormWithConfig = (config: BackendJanitorialConfig) => {
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
    }));
  };

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("janitorial");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ Janitorial config not found in active services, trying fallback pricing...');
        console.warn('⚠️ [Janitorial] Error:', response?.error);

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("janitorial");
          if (fallbackConfig?.config) {
            console.log('✅ [Janitorial] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendJanitorialConfig;
            setBackendConfig(config);
            updateFormWithConfig(config);

            console.log('✅ Janitorial FALLBACK CONFIG loaded from context:', {
              baseRates: config.baseRates,
              additionalServices: config.additionalServices,
              minimums: config.minimums,
              tripCharges: config.tripCharges,
              frequencyMultipliers: config.frequencyMultipliers,
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
        console.warn('⚠️ Janitorial document has no config property');
        return;
      }

      const config = document.config as BackendJanitorialConfig;

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);
      updateFormWithConfig(config);

      console.log('✅ Janitorial FULL CONFIG loaded from backend:', {
        baseRates: config.baseRates,
        additionalServices: config.additionalServices,
        minimums: config.minimums,
        tripCharges: config.tripCharges,
        frequencyMultipliers: config.frequencyMultipliers,
      });
    } catch (error) {
      console.error('❌ Failed to fetch Janitorial config from backend:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("janitorial");
        if (fallbackConfig?.config) {
          console.log('✅ [Janitorial] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendJanitorialConfig;
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

  // ✅ Fetch pricing configuration on mount
  useEffect(() => {
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also fetch when services context becomes available
  useEffect(() => {
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

    // ✅ Log price override for numeric pricing fields
    const pricingFields = [
      'recurringServiceRate', 'oneTimeServiceRate', 'vacuumingRatePerHour', 'dustingRatePerHour',
      'perVisitMinimum', 'recurringContractMinimum', 'standardTripCharge', 'beltwayTripCharge',
      'paidParkingTripCharge', 'parkingCost', 'baseHours', 'vacuumingHours', 'dustingHours'
    ];

    if (pricingFields.includes(field as string) &&
        typeof value === 'number' && typeof originalValue === 'number' &&
        value !== originalValue && value > 0) {

      addServiceFieldChange(field as string, originalValue, value);
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

    // Base service cost calculation
    const baseServiceRate = form.serviceType === "recurringService"
      ? form.recurringServiceRate
      : form.oneTimeServiceRate;
    const baseServiceCost = form.baseHours * baseServiceRate;

    // Additional services
    const vacuumingCost = form.vacuumingHours * form.vacuumingRatePerHour;
    const dustingCost = form.dustingHours * form.dustingRatePerHour;

    // Trip charge based on location
    let tripCharge = 0;
    if (form.location === "insideBeltway") {
      tripCharge = form.beltwayTripCharge;
    } else {
      tripCharge = form.standardTripCharge;
    }

    // Add parking cost if needed
    if (form.needsParking) {
      tripCharge += form.parkingCost || form.paidParkingTripCharge;
    }

    // Per visit total
    const perVisit = Math.max(
      baseServiceCost + vacuumingCost + dustingCost + tripCharge,
      form.perVisitMinimum
    );

    // Frequency multiplier from backend config or form
    let frequencyMultiplier = 1;
    if (activeConfig.frequencyMultipliers && form.frequency in activeConfig.frequencyMultipliers) {
      frequencyMultiplier = activeConfig.frequencyMultipliers[form.frequency];
    } else {
      // Fallback to form values
      switch (form.frequency) {
        case "daily": frequencyMultiplier = form.dailyMultiplier; break;
        case "weekly": frequencyMultiplier = form.weeklyMultiplier; break;
        case "biweekly": frequencyMultiplier = form.biweeklyMultiplier; break;
        case "monthly": frequencyMultiplier = form.monthlyMultiplier; break;
        case "oneTime": frequencyMultiplier = form.oneTimeMultiplier; break;
        default: frequencyMultiplier = 1;
      }
    }

    // Monthly and contract calculations
    const monthlyTotal = perVisit * frequencyMultiplier;
    const contractTotal = Math.max(
      monthlyTotal * form.contractMonths,
      form.recurringContractMinimum
    );

    return {
      baseServiceCost,
      vacuumingCost,
      dustingCost,
      tripCharge,
      perVisit,
      monthlyTotal,
      contractTotal,
      frequencyMultiplier,
    };
  }, [backendConfig, form]); // ✅ CRITICAL: Re-calculate when backend config loads!

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
    refreshConfig: fetchPricing,
    setContractMonths,
  };
}
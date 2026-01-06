// src/features/services/greaseTrap/useGreaseTrapCalc.ts

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import type { GreaseTrapFormState } from "./greaseTrapTypes";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import { annualFromPerVisit } from "../common/pricingUtils";
import { GREASE_TRAP_PER_TRAP_RATE, GREASE_TRAP_PER_GALLON_RATE } from "./greaseTrapConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendGreaseTrapConfig {
  perTrapRate: number;
  perGallonRate: number;
  frequencyMultipliers: {
    daily: number;
    weekly: number;
    biweekly: number;
    monthly: number;
  };
  contractLimits: {
    minMonths: number;
    maxMonths: number;
    defaultMonths: number;
  };
  allowedFrequencies: string[];
}

export function useGreaseTrapCalc(initialData: GreaseTrapFormState) {
  // ✅ Add refs for tracking override and active state
  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  const [form, setForm] = useState<GreaseTrapFormState>(() => {
    const baseForm = {
      // Set defaults for new rate fields if not provided in initialData
      perTrapRate: GREASE_TRAP_PER_TRAP_RATE,
      perGallonRate: GREASE_TRAP_PER_GALLON_RATE,
      ...initialData
    };

    // ✅ Initialize with global months ONLY if service starts with inputs
    const isInitiallyActive = (initialData?.numberOfTraps || 0) > 0;
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

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendGreaseTrapConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Helper function to update form with config data
  const updateFormWithConfig = (config: BackendGreaseTrapConfig) => {
    setForm((prev) => ({
      ...prev,
      // Update rate fields from backend if available
      perTrapRate: config.perTrapRate ?? prev.perTrapRate,
      perGallonRate: config.perGallonRate ?? prev.perGallonRate,
    }));
  };

  // ⚡ OPTIMIZED: Fetch pricing config from context (NO API call)
  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {
      // ⚡ Use context's backend pricing data directly (already loaded by useAllServicePricing)
      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("greaseTrap");
        if (backendData?.config) {
          console.log('✅ [GreaseTrap] Using cached pricing data from context');
          const config = backendData.config as BackendGreaseTrapConfig;
          setBackendConfig(config);
          updateFormWithConfig(config);

          // ✅ Only clear custom overrides on manual refresh
          if (forceRefresh) {
            console.log('🔄 [GREASE-TRAP] Manual refresh: Clearing all custom overrides');
            // Note: Grease Trap doesn't have custom override fields in the current implementation
          }

          console.log('✅ GreaseTrap CONFIG loaded from context:', {
            perTrapRate: config.perTrapRate,
            perGallonRate: config.perGallonRate,
            frequencyMultipliers: config.frequencyMultipliers,
            contractLimits: config.contractLimits,
            allowedFrequencies: config.allowedFrequencies,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for GreaseTrap, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch GreaseTrap config from context:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("greaseTrap");
        if (fallbackConfig?.config) {
          console.log('✅ [GreaseTrap] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendGreaseTrapConfig;
          setBackendConfig(config);
          updateFormWithConfig(config);

          // ✅ FIXED: Only clear custom overrides on manual refresh
          if (forceRefresh) {
            console.log('🔄 [GREASE-TRAP] Manual refresh: Clearing all custom overrides');
            // Note: Grease Trap doesn't have custom override fields in the current implementation
          }

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // ✅ Fetch pricing configuration on mount ONLY if no initialData (new service)
  useEffect(() => {
    // Skip fetching if we have initialData (editing existing service with saved prices)
    if (initialData) {
      console.log('📋 [GREASE-TRAP-PRICING] Skipping price fetch - using saved historical prices from initialData');
      return;
    }

    console.log('📋 [GREASE-TRAP-PRICING] Fetching current prices - new service or no initial data');
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also fetch when services context becomes available (but NOT in edit mode)
  useEffect(() => {
    // Skip if we have initialData (editing existing service)
    if (initialData) return;

    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

  // ✅ Add sync effect to adopt global months when service becomes active or when global months change
  useEffect(() => {
    const isServiceActive = (form.numberOfTraps || 0) > 0;
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
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.numberOfTraps, servicesContext]);

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `greaseTrap_${fieldName}`,
      productName: `Grease Trap - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.numberOfTraps || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [GREASE-TRAP-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.numberOfTraps, form.frequency]);

  // ✅ Add setContractMonths function
  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({
      ...prev,
      contractMonths: months,
    }));
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => {
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[name as keyof GreaseTrapFormState];

      let newFormState = prev;

      if (name === "numberOfTraps") {
        newFormState = { ...prev, numberOfTraps: Number(value) || 0 };
      } else if (name === "sizeOfTraps") {
        newFormState = { ...prev, sizeOfTraps: Number(value) || 0 };
      } else if (name === "frequency") {
        newFormState = { ...prev, frequency: value as GreaseTrapFormState["frequency"] };
      } else if (name === "contractMonths") {
        newFormState = { ...prev, contractMonths: Number(value) || 12 };
      } else if (name === "notes") {
        newFormState = { ...prev, notes: value };
      } else if (name === "perTrapRate") {
        newFormState = { ...prev, perTrapRate: Number(value) || 0 };
      } else if (name === "perGallonRate") {
        newFormState = { ...prev, perGallonRate: Number(value) || 0 };
      } else {
        newFormState = prev;
      }

      // ✅ Log price override for numeric pricing fields
      const pricingFields = ['perTrapRate', 'perGallonRate'];
      if (pricingFields.includes(name) &&
          typeof newFormState[name as keyof GreaseTrapFormState] === 'number' &&
          typeof originalValue === 'number') {

        const newValue = newFormState[name as keyof GreaseTrapFormState] as number;
        const oldValue = originalValue as number;

        if (newValue !== oldValue && newValue > 0) {
          addServiceFieldChange(name, oldValue, newValue);
        }
      }

      // ✅ NEW: Log form field changes using universal logger
      const allFormFields = [
        // Quantity fields
        'trapsQuantity', 'gallonsPerTrap', 'frequency',
        // Selection fields
        'rateTier'
      ];

      // Log non-pricing field changes
      if (allFormFields.includes(name)) {
        logServiceFieldChanges(
          'greaseTrap',
          'Grease Trap',
          { [name]: newFormState[name as keyof GreaseTrapFormState] },
          { [name]: originalValue },
          [name],
          newFormState.trapsQuantity || 1,
          newFormState.frequency || 'monthly'
        );
      }

      return newFormState;
    });
  };

  const quote: ServiceQuoteResult = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = backendConfig || {
      perTrapRate: GREASE_TRAP_PER_TRAP_RATE,
      perGallonRate: GREASE_TRAP_PER_GALLON_RATE,
      frequencyMultipliers: {
        daily: 30,
        weekly: 4.33,
        biweekly: 2.165,
        monthly: 1,
      },
      contractLimits: {
        minMonths: 2,
        maxMonths: 36,
        defaultMonths: 12,
      },
      allowedFrequencies: ["daily", "weekly", "biweekly", "monthly"],
    };

    // Use form values instead of hardcoded constants (form values come from backend)
    const perVisit = (form.numberOfTraps * form.perTrapRate) + (form.sizeOfTraps * form.perGallonRate);
    const annual = annualFromPerVisit(perVisit, form.frequency);

    // Calculate monthly based on frequency using backend config
    let monthlyTotal = 0;
    const frequencyMultiplier = activeConfig.frequencyMultipliers[form.frequency] || activeConfig.frequencyMultipliers.weekly;
    monthlyTotal = perVisit * frequencyMultiplier;

    const contractMonths = Math.min(
      Math.max(form.contractMonths || activeConfig.contractLimits.defaultMonths, activeConfig.contractLimits.minMonths),
      activeConfig.contractLimits.maxMonths
    );
    const contractTotal = monthlyTotal * contractMonths;

    return {
      serviceId: "greaseTrap",
      displayName: "Grease Trap",
      perVisitPrice: perVisit,
      perVisitTotal: perVisit,
      annualPrice: annual,
      monthlyTotal,
      contractTotal,
      detailsBreakdown: [
        `Number of traps: ${form.numberOfTraps} @ $${form.perTrapRate.toFixed(2)}`,
        `Size of traps (gallons): ${form.sizeOfTraps} @ $${form.perGallonRate.toFixed(2)}`,
        `Frequency: ${form.frequency}`,
      ],
    };
  }, [backendConfig, form]); // ✅ CRITICAL: Re-calculate when backend config loads!

  return {
    form,
    setForm,
    handleChange,
    quote,
    backendConfig,
    isLoadingConfig,
    refreshConfig: fetchPricing,
    setContractMonths,
  };
}

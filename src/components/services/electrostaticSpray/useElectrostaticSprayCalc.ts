// src/components/services/electrostaticSpray/useElectrostaticSprayCalc.ts

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

// Backend config interface matching the ACTUAL MongoDB JSON structure
interface BackendElectrostaticSprayConfig {
  pricingMethodOptions: string[]; // ["By Room", "By Square Feet"]
  combinedServiceOptions: string[]; // ["Sani-Clean", "None"]
  locationOptions: string[]; // ["Inside Beltway", "Outside Beltway"]

  standardSprayPricing: {
    sprayRatePerRoom: number; // 20
    sqFtUnit: number; // 1000
    sprayRatePerSqFtUnit: number; // 50
    minimumPriceOptional: number; // 0
  };

  tripCharges: {
    standard: number; // 0
    beltway: number; // 0
  };

  minimumChargePerVisit: number; // 50

  frequencyMetadata: {
    weekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    biweekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    monthly?: { cycleMonths: number };
    bimonthly?: { cycleMonths: number };
    quarterly?: { cycleMonths: number };
    biannual?: { cycleMonths: number };
    annual?: { cycleMonths: number };
  };

  minContractMonths: number; // 2
  maxContractMonths: number; // 36
}

// ✅ Helper function to transform backend frequencyMetadata to frontend format
function transformBackendFrequencyMeta(backendMeta: BackendElectrostaticSprayConfig['frequencyMetadata'] | undefined) {
  if (!backendMeta) {
    console.warn('⚠️ No backend frequencyMetadata available, using static fallback values');
    return cfg.billingConversions;
  }

  console.log('🔧 [Electrostatic Spray] Transforming backend frequencyMetadata:', backendMeta);

  // Transform backend structure to frontend billingConversions format
  const transformedBilling: any = { ...cfg.billingConversions }; // Start with fallback

  // Handle weekly and biweekly with their special multipliers
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

  // Handle cycle-based frequencies (monthly, bimonthly, quarterly, biannual, annual)
  const cycleBased = ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'] as const;

  for (const freq of cycleBased) {
    const backendFreqData = backendMeta[freq];
    if (backendFreqData?.cycleMonths) {
      const cycleMonths = backendFreqData.cycleMonths;
      const monthlyMultiplier = 1 / cycleMonths; // e.g., bimonthly: 1/2=0.5, quarterly: 1/3=0.333
      const annualMultiplier = 12 / cycleMonths; // e.g., bimonthly: 12/2=6, quarterly: 12/3=4

      transformedBilling[freq] = {
        monthlyMultiplier,
        annualMultiplier,
      };
    }
  }

  console.log('✅ [Electrostatic Spray] Transformed frequencyMetadata to billingConversions:', transformedBilling);
  return transformedBilling;
}

/**
 * Helper function to update form state with backend config data
 * @param config - Backend configuration object
 * @param setForm - React setState function
 * @param initialData - Initial data (if in edit mode)
 * @param forceUpdate - If true, force update even in edit mode (for refresh button)
 */
function updateFormWithConfig(config: BackendElectrostaticSprayConfig, setForm: any, initialData?: any, forceUpdate: boolean = false) {
  // ✅ FIXED: In edit mode, NEVER overwrite user's loaded values (unless force refresh)
  // Only update on manual refresh (when user explicitly clicks refresh button)
  if (initialData && !forceUpdate) {
    console.log('📋 [ELECTROSTATIC-SPRAY] Edit mode: Skipping form update to preserve loaded values');
    return; // Don't overwrite loaded values in edit mode
  }

  console.log('📋 [ELECTROSTATIC-SPRAY] Updating form with backend config', forceUpdate ? '(FORCED by refresh button)' : '');
  setForm((prev: any) => ({
    ...prev,
    // ✅ Map backend config properties to form properties
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
  useExactCalculation: true, // Default to exact calculation
  frequency: cfg.defaultFrequency,
  location: "standard",
  isCombinedWithSaniClean: false,
  contractMonths: cfg.minContractMonths,
  notes: "",
  ratePerRoom: cfg.ratePerRoom,
  ratePerThousandSqFt: cfg.ratePerThousandSqFt,
  tripChargePerVisit: cfg.tripCharges.standard,
};

export function useElectrostaticSprayCalc(initialData?: Partial<ElectrostaticSprayFormState>, customFields?: any[]) {
  // ✅ Add refs for tracking override and active state
  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);
  const isEditMode = useRef(!!initialData); // ✅ NEW: Track if we're in edit mode (has initial data)
  const isInitialMount = useRef(true); // ✅ NEW: Track if this is initial mount or manual refresh

  // ✅ NEW: Track baseline values for logging (set ONCE on mount)
  // Baseline = backend default for new documents, or loaded/saved value for edit mode
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // ✅ NEW: Calculate sum of all calc field totals (add directly to contract, no frequency)
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

  // ✅ NEW: Calculate sum of all dollar field values (add directly to contract, no frequency)
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

    // ✅ Initialize with global months ONLY if service starts with inputs
    const isInitiallyActive = (initialData?.roomCount || 0) > 0 || (initialData?.squareFeet || 0) > 0;
    const defaultContractMonths = initialData?.contractMonths
      ? initialData.contractMonths
      : (isInitiallyActive && servicesContext?.globalContractMonths)
        ? servicesContext.globalContractMonths
        : cfg.minContractMonths;

    return {
      ...baseForm,
      contractMonths: defaultContractMonths,
    };
  });

  const [backendConfig, setBackendConfig] = useState<BackendElectrostaticSprayConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Fetch pricing config from backend
  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {
      // First try to get active service config
      const response = await serviceConfigApi.getActive("electrostaticSpray");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ ElectrostaticSpray config not found in active services, trying fallback pricing...');

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("electrostaticSpray");
          if (fallbackConfig?.config) {
            console.log('✅ [ElectrostaticSpray] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendElectrostaticSprayConfig;
            setBackendConfig(config);
            updateFormWithConfig(config, setForm, initialData, forceRefresh);

            // ✅ FIXED: Only clear custom overrides on manual refresh
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

            console.log('✅ ElectrostaticSpray FALLBACK CONFIG loaded from context:', {
              standardSprayPricing: config.standardSprayPricing,
              tripCharges: config.tripCharges,
              frequencyMetadata: config.frequencyMetadata,
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
        console.warn('⚠️ ElectrostaticSpray document has no config property');
        return;
      }

      const config = document.config as BackendElectrostaticSprayConfig;

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);
      updateFormWithConfig(config, setForm, initialData, forceRefresh);

      // ✅ FIXED: Only clear custom overrides on manual refresh
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

      console.log('✅ ElectrostaticSpray ACTIVE CONFIG loaded from backend:', {
        standardSprayPricing: config.standardSprayPricing,
        tripCharges: config.tripCharges,
        frequencyMetadata: config.frequencyMetadata,
      });
    } catch (error) {
      console.error('❌ Failed to fetch ElectrostaticSpray config from backend:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("electrostaticSpray");
        if (fallbackConfig?.config) {
          console.log('✅ [ElectrostaticSpray] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendElectrostaticSprayConfig;
          setBackendConfig(config);
          updateFormWithConfig(config, setForm, initialData, forceRefresh);

          // ✅ FIXED: Only clear custom overrides on manual refresh
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

  // ✅ FIXED: Always fetch backend config on mount (but do not overwrite in edit mode)
  useEffect(() => {
    // Always fetch backend config to enable override detection in edit mode
    console.log('📋 [ELECTROSTATIC-SPRAY-PRICING] Fetching backend config (initial load, will not overwrite edit mode values)');
    fetchPricing(false); // false = don't force update in edit mode
    isInitialMount.current = false; // Mark that initial mount is complete
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ NEW: Detect overrides after backend config loads (for yellow highlighting in edit mode)
  useEffect(() => {
    if (!backendConfig) return;

    // ✅ STEP 1: Initialize baseline values ONCE (for logging)
    if (!baselineInitialized.current) {
      baselineInitialized.current = true;

      // Baseline = loaded/saved value (edit mode) OR backend default (new document)
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

      // ✅ STEP 2: Detect overrides for yellow highlighting (edit mode only) - ONLY ONCE!
      if (initialData) {
        console.log('🔍 [ELECTROSTATIC-SPRAY-PRICING] Detecting price overrides for yellow highlighting...');

        // Compare saved values against backend defaults
        const hasRatePerRoomOverride = initialData.ratePerRoom !== undefined &&
                                       initialData.ratePerRoom !== backendConfig.standardSprayPricing?.sprayRatePerRoom;
        const hasRatePerSqFtOverride = initialData.ratePerThousandSqFt !== undefined &&
                                        initialData.ratePerThousandSqFt !== backendConfig.standardSprayPricing?.sprayRatePerSqFtUnit;
        const hasTripChargeOverride = initialData.tripChargePerVisit !== undefined &&
                                       initialData.tripChargePerVisit !== backendConfig.tripCharges?.standard;

        if (hasRatePerRoomOverride || hasRatePerSqFtOverride || hasTripChargeOverride) {
          setForm(prev => ({
            ...prev,
            // Set custom override fields to enable yellow highlighting
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

  // Also fetch when services context becomes available (for fallback pricing)
  useEffect(() => {
    // Fetch from context if backend config not loaded yet (even in edit mode, for override detection)
    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

  // ✅ Add sync effect to adopt global months when service becomes active or when global months change
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

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
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

  // ✅ Add setContractMonths function
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
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[name as keyof ElectrostaticSprayFormState];

      const next: ElectrostaticSprayFormState = { ...prev };

      if (type === "checkbox") {
        next[name as keyof ElectrostaticSprayFormState] = target.checked;
      } else if (
        // Handle custom override fields - allow clearing by setting to undefined
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
            return prev; // Don't update if invalid
          }
        }
      } else if (type === "number") {
        const val = parseFloat(target.value);
        next[name as keyof ElectrostaticSprayFormState] = isNaN(val) ? 0 : val;
      } else {
        next[name as keyof ElectrostaticSprayFormState] = target.value;
      }

      // ✅ FIXED: Log ALL price changes for numeric pricing fields
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

        // ✅ NEW: Use baseline value instead of previous form value
        // Baseline = backend default (new documents) or loaded value (edit mode)
        let baselineValue = baselineValues.current[name];

        // For custom fields, get baseline from the corresponding base field
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

        // ✅ CRITICAL: Always compare newValue with BASELINE (not with previous value)
        // This ensures Map replaces previous entry with updated value still comparing to baseline
        // Example: First change 20→15 logs "20→15", second change 15→10 REPLACES with "20→10"
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

      // ✅ NEW: Log form field changes using universal logger
      const allFormFields = [
        // Quantity fields
        'rooms', 'squareFeet', 'contractMonths', 'frequency',
        // Selection fields
        'pricingMethod', 'rateTier',
        // Boolean fields
        'includesTripCharge'
      ];

      // Log non-pricing field changes
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

  // ✅ Create activeConfig as separate useMemo so it can be accessed in return statement
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
      // ✅ NEW: Transform backend frequencyMetadata
      billingConversions: transformBackendFrequencyMeta(backendConfig?.frequencyMetadata),
    };
  }, [backendConfig]);

  const calc: ElectrostaticSprayCalcResult = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    // Map backend config to expected format with proper fallbacks

    if (!backendConfig) {
      console.warn('⚠️ [ElectrostaticSpray] Using fallback config - backend not loaded yet');
    } else {
      console.log('✅ [ElectrostaticSpray] Using backend config:', {
        standardSprayPricing: activeConfig.standardSprayPricing,
        tripCharges: activeConfig.tripCharges,
      });
    }

    // Determine service charge based on pricing method
    let calculatedServiceCharge = 0;
    let effectiveRate = 0;
    let pricingMethodUsed = form.pricingMethod;

    // ✅ Use custom override rates if set, otherwise use base rates
    const effectiveRatePerRoom = form.customRatePerRoom ?? form.ratePerRoom;
    const effectiveRatePerThousandSqFt = form.customRatePerThousandSqFt ?? form.ratePerThousandSqFt;

    if (form.pricingMethod === "byRoom") {
      calculatedServiceCharge = form.roomCount * effectiveRatePerRoom;
      effectiveRate = effectiveRatePerRoom;
    } else {
      // By square feet
      let calculateForSqFt = form.squareFeet;

      if (!form.useExactCalculation) {
        // Use minimum square feet tier pricing
        // Find the minimum tier that covers the entered square feet
        const minTier = activeConfig.standardSprayPricing.sqFtUnit; // 1000 sq ft minimum
        if (calculateForSqFt <= minTier) {
          calculateForSqFt = minTier; // If 500 entered, use 1000
        } else {
          // Round up to next 1000 sq ft tier (1001 becomes 2000)
          calculateForSqFt = Math.ceil(calculateForSqFt / activeConfig.standardSprayPricing.sqFtUnit) * activeConfig.standardSprayPricing.sqFtUnit;
        }
      }

      const units = calculateForSqFt / activeConfig.standardSprayPricing.sqFtUnit; // Convert to 1000 sq ft units
      calculatedServiceCharge = units * effectiveRatePerThousandSqFt;
      effectiveRate = effectiveRatePerThousandSqFt;
    }

    // Apply minimum charge if needed - ONLY when there's actual service
    const hasService = (form.pricingMethod === "byRoom" && form.roomCount > 0) ||
                      (form.pricingMethod === "bySqFt" && form.squareFeet > 0);

    if (activeConfig.minimumChargePerVisit > 0 && hasService) {
      calculatedServiceCharge = Math.max(calculatedServiceCharge, activeConfig.minimumChargePerVisit);
    } else if (!hasService) {
      calculatedServiceCharge = 0;
    }

    // Use custom override if set
    const serviceCharge = form.customServiceCharge ?? calculatedServiceCharge;

    // Trip charge (0 if combined with Sani-Clean, otherwise use editable rate)
    // ✅ Use custom override trip charge if set
    const effectiveTripChargePerVisit = form.customTripChargePerVisit ?? form.tripChargePerVisit;
    const tripCharge = form.isCombinedWithSaniClean ? 0 : effectiveTripChargePerVisit;

    // Per visit total
    const perVisit = form.customPerVisitPrice ?? (serviceCharge + tripCharge);

    // Get frequency multiplier from backend or fallback
    const freqConfig = activeConfig.billingConversions[form.frequency];
    const monthlyMultiplier = freqConfig?.monthlyMultiplier ?? 0;
    const annualMultiplier = freqConfig?.annualMultiplier ?? 0;

    // Frequency-specific UI helpers
    const isVisitBasedFrequency = form.frequency === "oneTime" || form.frequency === "quarterly" ||
      form.frequency === "biannual" || form.frequency === "annual" || form.frequency === "bimonthly";
    const monthsPerVisit = form.frequency === "oneTime" ? 0 :
      form.frequency === "bimonthly" ? 2 :
      form.frequency === "quarterly" ? 3 :
      form.frequency === "biannual" ? 6 :
      form.frequency === "annual" ? 12 : 1;

    // Monthly recurring
    const monthlyRecurring = form.customMonthlyRecurring ?? (perVisit * monthlyMultiplier);

    // Contract total - handle visit-based frequencies differently
    let contractTotal: number;
    if (form.frequency === "oneTime") {
      // For oneTime: just the per visit price (no recurring billing)
      contractTotal = form.customContractTotal ?? perVisit;
    } else if (isVisitBasedFrequency) {
      // For quarterly, biannual, annual, bimonthly: use annual multipliers
      const visitsPerYear = annualMultiplier;
      const totalVisits = (form.contractMonths / 12) * visitsPerYear;
      contractTotal = form.customContractTotal ?? (totalVisits * perVisit);
    } else {
      // For weekly, biweekly, twicePerMonth, monthly: use monthly-based calculation
      contractTotal = form.customContractTotal ?? (monthlyRecurring * form.contractMonths);
    }

    // ✅ NEW: Add calc field totals AND dollar field totals directly to contract (no frequency dependency)
    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

    console.log(`📊 [ELECTROSTATIC-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotal.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });

    return {
      serviceCharge,
      tripCharge,
      perVisit,
      monthlyRecurring,
      contractTotal: contractTotalWithCustomFields,  // ✅ UPDATED: Return contract total with custom fields added
      effectiveRate,
      pricingMethodUsed,
      // Frequency-specific UI helpers
      isVisitBasedFrequency,
      monthsPerVisit,
      // Minimum charge for redline/greenline indicator
      minimumChargePerVisit: activeConfig.minimumChargePerVisit,
    };
  }, [
    activeConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form,
    // ✅ NEW: Re-calculate when custom fields change
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
    refreshConfig: () => fetchPricing(true), // ✅ FIXED: Force refresh when button clicked
    activeConfig, // ✅ EXPOSE: Active config for dynamic UI text
    setContractMonths,
  };
}

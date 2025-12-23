// src/features/services/stripWax/useStripWaxCalc.ts
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import { stripWaxPricingConfig as cfg } from "./stripWaxConfig";
import type {
  StripWaxFrequencyKey,
  StripWaxRateCategory,
  StripWaxServiceVariant,
  StripWaxFormState,
} from "./stripWaxTypes";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";

// ✅ Backend config interface matching the EXACT MongoDB JSON structure
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
      alternateRatePerSqFt: number;  // ✅ Note: Different field name in MongoDB!
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

/**
 * ✅ NEW: Build active config directly from backend structure
 * Maps the MongoDB JSON structure to calculation-friendly format
 */
function buildActiveConfig(backendConfig: BackendStripWaxConfig | null) {
  // Default values from static config
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

  console.log('📊 [Strip & Wax] Building active config from backend:', backendConfig);

  // ✅ Extract values directly from the MongoDB JSON structure
  const activeConfig = {
    // Contract limits from top-level config
    minContractMonths: backendConfig.minContractMonths ?? defaults.minContractMonths,
    maxContractMonths: backendConfig.maxContractMonths ?? defaults.maxContractMonths,
    defaultFrequency: backendConfig.defaultFrequency ?? defaults.defaultFrequency,
    defaultVariant: backendConfig.defaultVariant ?? defaults.defaultVariant,

    // ✅ Extract variant pricing - handle special case for noSealant
    variants: {
      standardFull: {
        label: backendConfig.variants?.standardFull?.label ?? defaults.variants.standardFull.label,
        ratePerSqFt: backendConfig.variants?.standardFull?.ratePerSqFt ?? defaults.variants.standardFull.ratePerSqFt,
        minCharge: backendConfig.variants?.standardFull?.minCharge ?? defaults.variants.standardFull.minCharge,
      },
      noSealant: {
        label: backendConfig.variants?.noSealant?.label ?? defaults.variants.noSealant.label,
        // ✅ SPECIAL HANDLING: noSealant uses alternateRatePerSqFt in MongoDB
        ratePerSqFt: backendConfig.variants?.noSealant?.alternateRatePerSqFt ?? defaults.variants.noSealant.ratePerSqFt,
        minCharge: backendConfig.variants?.noSealant?.minCharge ?? defaults.variants.noSealant.minCharge,
      },
      wellMaintained: {
        label: backendConfig.variants?.wellMaintained?.label ?? defaults.variants.wellMaintained.label,
        ratePerSqFt: backendConfig.variants?.wellMaintained?.ratePerSqFt ?? defaults.variants.wellMaintained.ratePerSqFt,
        minCharge: backendConfig.variants?.wellMaintained?.minCharge ?? defaults.variants.wellMaintained.minCharge,
      }
    },

    // Rate categories
    rateCategories: backendConfig.rateCategories ?? defaults.rateCategories,

    // Trip charges (not used in calculations but available)
    tripCharges: backendConfig.tripCharges ?? { standard: 0, beltway: 0 },

    // ✅ Build frequency multipliers from frequencyMetadata
    frequencyMultipliers: {
      oneTime: 0,
      weekly: backendConfig.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? 4.33,
      biweekly: backendConfig.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? 2.165,
      twicePerMonth: 2, // Not in backend, use static
      monthly: 1.0, // Monthly = 1 visit per month
      bimonthly: 0.5, // Every 2 months = 0.5 visits per month
      quarterly: 0, // Visit-based, no monthly calculation
      biannual: 0, // Visit-based, no monthly calculation
      annual: 0, // Visit-based, no monthly calculation
    },

    // ✅ Build annual frequencies from cycle months
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

    // Store the frequency metadata for reference
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

export interface StripWaxCalcResult {
  /** Per-visit revenue (service only). */
  perVisit: number;

  /** First month total (same as ongoing here). */
  monthly: number;

  /** Contract total for selected number of months. */
  annual: number;

  /** First visit revenue (same as perVisit for this service). */
  firstVisit: number;

  /** Ongoing monthly after first month. */
  ongoingMonthly: number;

  /** Contract total (same as annual). */
  contractTotal: number;

  /** Raw area × rate before applying min charge. */
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

  // ✅ NEW: Editable pricing rates from config (will be overridden by backend)
  weeksPerMonth: cfg.weeksPerMonth,
  standardFullRatePerSqFt: cfg.variants.standardFull.ratePerSqFt,
  standardFullMinCharge: cfg.variants.standardFull.minCharge,
  noSealantRatePerSqFt: cfg.variants.noSealant.ratePerSqFt,
  noSealantMinCharge: cfg.variants.noSealant.minCharge,
  wellMaintainedRatePerSqFt: cfg.variants.wellMaintained.ratePerSqFt,
  wellMaintainedMinCharge: cfg.variants.wellMaintained.minCharge,
  redRateMultiplier: cfg.rateCategories.redRate.multiplier,
  greenRateMultiplier: cfg.rateCategories.greenRate.multiplier,
};

export function useStripWaxCalc(initialData?: Partial<StripWaxFormState>, customFields?: any[]) {
  // ✅ Add refs for tracking override and active state
  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);

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

    console.log(`💰 [STRIP-WAX-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [STRIP-WAX-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [form, setForm] = useState<StripWaxFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM_STATE,
      ...initialData,
    };

    // ✅ Initialize with global months ONLY if service starts with inputs
    const isInitiallyActive = (initialData?.floorAreaSqFt || 0) > 0;
    const defaultContractMonths = initialData?.contractMonths
      ? initialData.contractMonths
      : (isInitiallyActive && servicesContext?.globalContractMonths)
        ? servicesContext.globalContractMonths
        : 12;

    return {
      ...baseForm,
      contractMonths: defaultContractMonths,
    };
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendStripWaxConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Helper function to update form with config data
  const updateFormWithConfig = (activeConfig: any) => {
    setForm((prev) => ({
      ...prev,
      // Update all rate fields from backend config
      weeksPerMonth: activeConfig.frequencyMultipliers?.weekly ?? prev.weeksPerMonth,
      standardFullRatePerSqFt: activeConfig.variants?.standardFull?.ratePerSqFt ?? prev.standardFullRatePerSqFt,
      standardFullMinCharge: activeConfig.variants?.standardFull?.minCharge ?? prev.standardFullMinCharge,
      noSealantRatePerSqFt: activeConfig.variants?.noSealant?.ratePerSqFt ?? prev.noSealantRatePerSqFt,
      noSealantMinCharge: activeConfig.variants?.noSealant?.minCharge ?? prev.noSealantMinCharge,
      wellMaintainedRatePerSqFt: activeConfig.variants?.wellMaintained?.ratePerSqFt ?? prev.wellMaintainedRatePerSqFt,
      wellMaintainedMinCharge: activeConfig.variants?.wellMaintained?.minCharge ?? prev.wellMaintainedMinCharge,
      redRateMultiplier: activeConfig.rateCategories?.redRate?.multiplier ?? prev.redRateMultiplier,
      greenRateMultiplier: activeConfig.rateCategories?.greenRate?.multiplier ?? prev.greenRateMultiplier,
    }));

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

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      // First try to get active service config
      const response = await serviceConfigApi.getActive("stripWax");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ Strip Wax config not found in active services, trying fallback pricing...');

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("stripWax");
          if (fallbackConfig?.config) {
            console.log('✅ [Strip Wax] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendStripWaxConfig;

            // ✅ Build active config from backend structure
            const activeConfig = buildActiveConfig(config);

            setBackendConfig(config);
            updateFormWithConfig(activeConfig);

            // ✅ CLEAR ALL CUSTOM OVERRIDES when refreshing config
            setForm(prev => ({
              ...prev,
              customPerVisit: undefined,
              customMonthly: undefined,
              customOngoingMonthly: undefined,
              customContractTotal: undefined,
            }));

            console.log('✅ Strip Wax FALLBACK CONFIG loaded from context');
            return;
          }
        }

        console.warn('⚠️ No backend pricing available, using static fallback values');
        return;
      }

      // ✅ Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ Strip Wax document has no config property');
        return;
      }

      const config = document.config as BackendStripWaxConfig;

      // ✅ Build active config from backend structure
      const activeConfig = buildActiveConfig(config);

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);
      updateFormWithConfig(activeConfig);

      // ✅ CLEAR ALL CUSTOM OVERRIDES when refreshing config
      setForm(prev => ({
        ...prev,
        customPerVisit: undefined,
        customMonthly: undefined,
        customOngoingMonthly: undefined,
        customContractTotal: undefined,
      }));

      console.log('✅ Strip Wax ACTIVE CONFIG loaded from backend successfully');
    } catch (error) {
      console.error('❌ Failed to fetch Strip Wax config from backend:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("stripWax");
        if (fallbackConfig?.config) {
          console.log('✅ [Strip Wax] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendStripWaxConfig;

          // ✅ Build active config from backend structure
          const activeConfig = buildActiveConfig(config);

          setBackendConfig(config);
          updateFormWithConfig(activeConfig);

          // ✅ CLEAR ALL CUSTOM OVERRIDES when refreshing config
          setForm(prev => ({
            ...prev,
            customPerVisit: undefined,
            customMonthly: undefined,
            customOngoingMonthly: undefined,
            customContractTotal: undefined,
          }));

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

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
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

  // ✅ Add setContractMonths function
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
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[name as keyof StripWaxFormState];

      const next: StripWaxFormState = { ...prev };

      // Special handling when service type changes: reset rate + minimum FROM FORM VALUES
      if (name === "serviceVariant") {
        const variantKey = t.value as StripWaxServiceVariant;
        next.serviceVariant = variantKey;

        // ✅ USE FORM VALUES (from backend) instead of cfg
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
        // Handle custom override fields - allow clearing by setting to undefined
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
        const num = raw === "" ? 0 : Number(raw);
        (next as any)[name] = Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        (next as any)[name] = t.value;
      }

      // ✅ Log price override for numeric pricing fields
      const pricingFields = [
        'floorAreaSqFt', 'ratePerSqFt', 'minCharge', 'weeksPerMonth',
        'standardFullRatePerSqFt', 'standardFullMinCharge', 'noSealantRatePerSqFt', 'noSealantMinCharge',
        'wellMaintainedRatePerSqFt', 'wellMaintainedMinCharge', 'redRateMultiplier', 'greenRateMultiplier',
        'customPerVisit', 'customMonthly', 'customOngoingMonthly', 'customContractTotal'
      ];

      if (pricingFields.includes(name)) {
        const newValue = (next as any)[name] as number | undefined;
        const oldValue = originalValue as number | undefined;

        // Handle undefined values (when cleared) - don't log clearing to undefined
        if (newValue !== undefined && oldValue !== undefined &&
            typeof newValue === 'number' && typeof oldValue === 'number' &&
            newValue !== oldValue && newValue > 0) {
          addServiceFieldChange(name, oldValue, newValue);
        }
      }

      return next;
    });
  };

  const calc: StripWaxCalcResult = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = buildActiveConfig(backendConfig);

    const areaSqFt = Math.max(0, Number(form.floorAreaSqFt) || 0);

    // If no footage entered, everything should be 0.
    if (areaSqFt === 0) {
      return {
        perVisit: 0,
        monthly: 0,
        annual: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
        rawPrice: 0,
      };
    }

    // ✅ USE FORM VALUES (from backend) for rate multipliers
    const rateCfg = {
      multiplier: form.rateCategory === "greenRate"
        ? form.greenRateMultiplier
        : form.redRateMultiplier,
    };

    const weeksPerMonth = activeConfig.frequencyMultipliers?.weekly ?? form.weeksPerMonth;  // ✅ USE ACTIVE CONFIG

    // ✅ Get billing conversion for current frequency - use backend frequency metadata if available
    let monthlyVisits: number;
    if (activeConfig.frequencyMultipliers && activeConfig.frequencyMultipliers[form.frequency] !== undefined) {
      monthlyVisits = activeConfig.frequencyMultipliers[form.frequency];
    } else {
      // Fallback to static config
      const conv = cfg.billingConversions[form.frequency];
      monthlyVisits = conv.monthlyMultiplier;
    }

    // ✅ Detect visit-based frequencies (quarterly, biannual, annual, bimonthly, oneTime)
    const isVisitBasedFrequency = form.frequency === "oneTime" ||
                                   form.frequency === "quarterly" ||
                                   form.frequency === "biannual" ||
                                   form.frequency === "annual" ||
                                   form.frequency === "bimonthly";

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

    // ✅ DIRECT CALCULATION: Always use simple area × rate per sq ft with minimum applied
    const rawPriceRed = areaSqFt * ratePerSqFt;
    const perVisitRed = Math.max(rawPriceRed, minCharge);

    const perVisit = perVisitRed * rateCfg.multiplier;

    const firstVisit = perVisit;

    // ✅ Calculate monthly price and contract total based on frequency type
    let monthlyPrice: number;
    let calculatedContractTotal: number;

    const minMonths = activeConfig.minContractMonths ?? 2;  // ✅ USE ACTIVE CONFIG (from backend)
    const maxMonths = activeConfig.maxContractMonths ?? 36;  // ✅ USE ACTIVE CONFIG (from backend)
    const rawMonths = Number(form.contractMonths) || minMonths;
    const contractMonths = Math.min(
      Math.max(rawMonths, minMonths),
      maxMonths
    );

    if (form.frequency === "oneTime") {
      // One-time service: just the per-visit price
      monthlyPrice = perVisit;
      calculatedContractTotal = perVisit;
    } else if (isVisitBasedFrequency) {
      // Visit-based frequencies: calculate based on visits per year using backend data
      let visitsPerYear: number;
      if (activeConfig.annualFrequencies && activeConfig.annualFrequencies[form.frequency] !== undefined) {
        visitsPerYear = activeConfig.annualFrequencies[form.frequency];
      } else {
        // Fallback to static config
        const conv = cfg.billingConversions[form.frequency];
        visitsPerYear = conv.annualMultiplier;
      }

      const totalVisits = (contractMonths / 12) * visitsPerYear;
      monthlyPrice = monthlyVisits * perVisit;
      calculatedContractTotal = totalVisits * perVisit;
    } else {
      // Month-based frequencies: use monthly multiplier
      monthlyPrice = monthlyVisits * perVisit;
      calculatedContractTotal = monthlyPrice * contractMonths;
    }

    // Apply custom overrides if set
    const finalPerVisit = form.customPerVisit ?? perVisit;
    const finalMonthly = form.customMonthly ?? monthlyPrice;
    const finalOngoingMonthly = form.customOngoingMonthly ?? monthlyPrice;
    const calculatedContractTotalBeforeCustomFields = form.customContractTotal ?? calculatedContractTotal;

    // ✅ NEW: Add calc field totals AND dollar field totals directly to contract (no frequency dependency)
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

    return {
      perVisit: finalPerVisit,
      monthly: finalMonthly,
      annual: finalContractTotal,
      firstVisit: finalPerVisit,
      ongoingMonthly: finalOngoingMonthly,
      contractTotal: finalContractTotal,
      rawPrice: rawPriceRed,
    };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
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
    // ✅ NEW: Re-calculate when custom fields change
    calcFieldsTotal,
    dollarFieldsTotal,
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

// src/features/services/stripWax/useStripWaxCalc.ts
import { useEffect, useMemo, useState, useCallback } from "react";
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

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendStripWaxConfig {
  // Flat structure (what we use internally)
  weeksPerMonth?: number;
  weeksPerYear?: number;
  minContractMonths?: number;
  maxContractMonths?: number;
  defaultFrequency?: string;
  defaultVariant?: string;
  variants?: {
    standardFull: {
      label: string;
      ratePerSqFt: number;
      minCharge: number;
    };
    noSealant: {
      label: string;
      ratePerSqFt: number;
      minCharge: number;
    };
    wellMaintained: {
      label: string;
      ratePerSqFt: number;
      minCharge: number;
    };
  };
  rateCategories?: {
    redRate: {
      multiplier: number;
      commissionRate: string;
    };
    greenRate: {
      multiplier: number;
      commissionRate: string;
    };
  };

  // Nested structure (what backend actually sends)
  tripCharges?: {
    standard: number;
    beltway: number;
  };
  frequencyMetadata?: {
    [key: string]: {
      monthlyRecurringMultiplier?: number;
      firstMonthExtraMultiplier?: number;
      cycleMonths?: number;
    };
  };
}

/**
 * Normalize backend config to extract values from nested structure
 */
function normalizeBackendConfig(config: BackendStripWaxConfig): BackendStripWaxConfig {
  // Build normalized config with all required fields
  return {
    weeksPerMonth: config.weeksPerMonth ?? cfg.weeksPerMonth,
    weeksPerYear: config.weeksPerYear ?? cfg.weeksPerYear,
    minContractMonths: config.minContractMonths ?? cfg.minContractMonths,
    maxContractMonths: config.maxContractMonths ?? cfg.maxContractMonths,
    defaultFrequency: config.defaultFrequency ?? cfg.defaultFrequency,
    defaultVariant: config.defaultVariant ?? cfg.defaultVariant,
    variants: config.variants ?? cfg.variants,
    rateCategories: config.rateCategories ?? cfg.rateCategories,
    tripCharges: config.tripCharges,
    frequencyMetadata: config.frequencyMetadata,
  };
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

export function useStripWaxCalc(initialData?: Partial<StripWaxFormState>) {
  const [form, setForm] = useState<StripWaxFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendStripWaxConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // Helper function to update form with config data
  const updateFormWithConfig = (config: BackendStripWaxConfig) => {
    setForm((prev) => ({
      ...prev,
      // Update all rate fields from backend if available
      weeksPerMonth: config.weeksPerMonth ?? prev.weeksPerMonth,
      standardFullRatePerSqFt: config.variants?.standardFull?.ratePerSqFt ?? prev.standardFullRatePerSqFt,
      standardFullMinCharge: config.variants?.standardFull?.minCharge ?? prev.standardFullMinCharge,
      noSealantRatePerSqFt: config.variants?.noSealant?.ratePerSqFt ?? prev.noSealantRatePerSqFt,
      noSealantMinCharge: config.variants?.noSealant?.minCharge ?? prev.noSealantMinCharge,
      wellMaintainedRatePerSqFt: config.variants?.wellMaintained?.ratePerSqFt ?? prev.wellMaintainedRatePerSqFt,
      wellMaintainedMinCharge: config.variants?.wellMaintained?.minCharge ?? prev.wellMaintainedMinCharge,
      redRateMultiplier: config.rateCategories?.redRate?.multiplier ?? prev.redRateMultiplier,
      greenRateMultiplier: config.rateCategories?.greenRate?.multiplier ?? prev.greenRateMultiplier,
    }));
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
            const config = normalizeBackendConfig(fallbackConfig.config as BackendStripWaxConfig);
            setBackendConfig(config);
            updateFormWithConfig(config);

            console.log('✅ Strip Wax FALLBACK CONFIG loaded from context:', {
              weeksPerMonth: config.weeksPerMonth,
              variants: config.variants,
              rateCategories: config.rateCategories,
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
        console.warn('⚠️ Strip Wax document has no config property');
        return;
      }

      const config = normalizeBackendConfig(document.config as BackendStripWaxConfig);

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);
      updateFormWithConfig(config);

      console.log('✅ Strip Wax ACTIVE CONFIG loaded from backend:', {
        weeksPerMonth: config.weeksPerMonth,
        variants: config.variants,
        rateCategories: config.rateCategories,
      });
    } catch (error) {
      console.error('❌ Failed to fetch Strip Wax config from backend:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("stripWax");
        if (fallbackConfig?.config) {
          console.log('✅ [Strip Wax] Using backend pricing data from context after error');
          const config = normalizeBackendConfig(fallbackConfig.config as BackendStripWaxConfig);
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
    const activeConfig = backendConfig || {
      weeksPerMonth: cfg.weeksPerMonth,
      minContractMonths: cfg.minContractMonths,
      maxContractMonths: cfg.maxContractMonths,
      defaultFrequency: cfg.defaultFrequency,
      defaultVariant: cfg.defaultVariant,
      variants: cfg.variants,
      rateCategories: cfg.rateCategories,
    };

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

    const weeksPerMonth = form.weeksPerMonth;  // ✅ USE FORM VALUE (from backend)

    // ✅ Get billing conversion for current frequency
    const conv = cfg.billingConversions[form.frequency];
    const monthlyVisits = conv.monthlyMultiplier;

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
      // Visit-based frequencies: calculate based on visits per year
      const visitsPerYear = conv.annualMultiplier;
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
    const finalContractTotal = form.customContractTotal ?? calculatedContractTotal;

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
  ]);

  return {
    form,
    setForm,
    onChange,
    calc,
    refreshConfig: fetchPricing,
    isLoadingConfig
  };
}

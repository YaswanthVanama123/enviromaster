// src/features/services/sanipod/useSanipodCalc.ts
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import { sanipodPricingConfig as cfg } from "./sanipodConfig";
import type {
  SanipodFrequencyKey,
  SanipodRateCategory,
  SanipodServiceRuleKey,
} from "./sanipodTypes";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";

// ✅ Backend config interface matching the EXACT MongoDB JSON structure
interface BackendSanipodConfig {
  corePricingIncludedWithSaniClean: {
    weeklyPricePerUnit: number;        // 3
    installPricePerUnit: number;       // 25
    includedWeeklyRefills: number;     // 1
  };
  extraBagPricing: {
    pricePerBag: number;               // 2
    refillPackQuantity: number | null; // null
  };
  standalonePricingWithoutSaniClean: {
    pricePerUnitPerWeek: number;           // 8
    alternatePricePerUnitPerWeek: number;  // 3
    weeklyMinimumPrice: number;            // 40
    useCheapestOption: boolean;            // true
  };
  tripChargesStandaloneOnly: {
    standard: number;  // 0
    beltway: number;   // 0
  };
  frequencyMetadata: {
    weekly: {
      monthlyRecurringMultiplier: number;    // 4.33
      firstMonthExtraMultiplier: number;     // 3.33
    };
    biweekly: {
      monthlyRecurringMultiplier: number;    // 2.165
      firstMonthExtraMultiplier: number;     // 1.165
    };
    monthly: { cycleMonths: number };        // 1
    bimonthly: { cycleMonths: number };      // 2
    quarterly: { cycleMonths: number };      // 3
    biannual: { cycleMonths: number };       // 6
    annual: { cycleMonths: number };         // 12
  };
  minContractMonths: number;         // 2
  maxContractMonths: number;         // 36
  rateCategories: {
    redRate: {
      multiplier: number;        // 1
      commissionRate: string;    // "20%"
    };
    greenRate: {
      multiplier: number;        // 1.3
      commissionRate: string;    // "25%"
    };
  };
}

/**
 * ✅ NEW: Build active config directly from backend structure
 * Maps the MongoDB JSON structure to calculation-friendly format
 */
function buildActiveConfig(backendConfig: BackendSanipodConfig | null) {
  // Default values from static config
  const defaults = {
    weeklyRatePerUnit: cfg.weeklyRatePerUnit || 3,
    altWeeklyRatePerUnit: cfg.altWeeklyRatePerUnit || 8,
    extraBagPrice: cfg.extraBagPrice || 2,
    installChargePerUnit: cfg.installChargePerUnit || 25,
    standaloneExtraWeeklyCharge: cfg.standaloneExtraWeeklyCharge || 40,
    tripChargePerVisit: cfg.tripChargePerVisit || 0,
    minContractMonths: cfg.minContractMonths || 2,
    maxContractMonths: cfg.maxContractMonths || 36,
    weeksPerMonth: cfg.weeksPerMonth || 4.33,
    weeksPerYear: cfg.weeksPerYear || 52,
    rateCategories: cfg.rateCategories || {
      redRate: { multiplier: 1, commissionRate: "20%" },
      greenRate: { multiplier: 1.3, commissionRate: "25%" }
    }
  };

  if (!backendConfig) {
    console.log('📊 [SaniPod] Using static config fallback values');
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

  console.log('📊 [SaniPod] Building active config from backend:', backendConfig);

  // ✅ Extract values directly from the MongoDB JSON structure
  const activeConfig = {
    // Core pricing - when used with SaniClean (included pricing)
    weeklyRatePerUnit: backendConfig.corePricingIncludedWithSaniClean?.weeklyPricePerUnit ?? defaults.weeklyRatePerUnit,
    installChargePerUnit: backendConfig.corePricingIncludedWithSaniClean?.installPricePerUnit ?? defaults.installChargePerUnit,

    // Standalone pricing - when used without SaniClean
    altWeeklyRatePerUnit: backendConfig.standalonePricingWithoutSaniClean?.pricePerUnitPerWeek ?? defaults.altWeeklyRatePerUnit,
    standaloneExtraWeeklyCharge: backendConfig.standalonePricingWithoutSaniClean?.weeklyMinimumPrice ?? defaults.standaloneExtraWeeklyCharge,
    useCheapestOption: backendConfig.standalonePricingWithoutSaniClean?.useCheapestOption ?? true,

    // Extra bags pricing
    extraBagPrice: backendConfig.extraBagPricing?.pricePerBag ?? defaults.extraBagPrice,

    // Trip charges (standalone only)
    tripChargePerVisit: backendConfig.tripChargesStandaloneOnly?.standard ?? defaults.tripChargePerVisit,
    tripChargeBeltway: backendConfig.tripChargesStandaloneOnly?.beltway ?? defaults.tripChargePerVisit,

    // Contract limits
    minContractMonths: backendConfig.minContractMonths ?? defaults.minContractMonths,
    maxContractMonths: backendConfig.maxContractMonths ?? defaults.maxContractMonths,

    // Rate categories
    rateCategories: backendConfig.rateCategories ?? defaults.rateCategories,

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

  console.log('✅ [SaniPod] Active config built:', {
    coreIncludedPricing: {
      weeklyRate: activeConfig.weeklyRatePerUnit,
      installRate: activeConfig.installChargePerUnit,
    },
    standalonePricing: {
      altWeeklyRate: activeConfig.altWeeklyRatePerUnit,
      extraWeeklyCharge: activeConfig.standaloneExtraWeeklyCharge,
      useCheapestOption: activeConfig.useCheapestOption,
    },
    extraBags: {
      pricePerBag: activeConfig.extraBagPrice,
    },
    tripCharges: {
      standard: activeConfig.tripChargePerVisit,
      beltway: activeConfig.tripChargeBeltway,
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

export interface SanipodFormState {
  podQuantity: number;
  extraBagsPerWeek: number;
  /** true = recurring each visit, false = one-time only on first visit */
  extraBagsRecurring: boolean;

  // Service frequency
  frequency: SanipodFrequencyKey;

  // Editable pricing rates (fetched from backend or config)
  weeklyRatePerUnit: number;        // 3$/week per pod (used in 3+40 rule)
  altWeeklyRatePerUnit: number;     // 8$/week per pod (flat per-pod option)
  extraBagPrice: number;            // 2$/bag
  standaloneExtraWeeklyCharge: number; // 40$/week account-level base

  includeTrip: boolean;
  tripChargePerVisit: number;

  isNewInstall: boolean;
  installQuantity: number;
  installRatePerPod: number;

  /** Custom installation override (user can manually set installation cost) */
  customInstallationFee?: number;

  /** Custom override for per visit price */
  customPerVisitPrice?: number;

  /** Custom override for first month total */
  customMonthlyPrice?: number;

  /** Custom override for contract total */
  customAnnualPrice?: number;

  /** Custom override for weekly pod service rate (for display in middle field) */
  customWeeklyPodRate?: number;

  /** Custom override for pod service total (after =) */
  customPodServiceTotal?: number;

  /** Custom override for extra bags total */
  customExtraBagsTotal?: number;

  rateCategory: SanipodRateCategory;

  /** Contract length in months (2–36). */
  contractMonths: number;

  /** Is this a standalone service (not part of package)? If false, always use $8/pod. */
  isStandalone: boolean;
  notes?: string;
}

export interface SanipodCalcResult {
  /** Per visit, service only (no install, no trip). */
  perVisit: number;

  /** First month total (first visit + other visits). */
  monthly: number;

  /** Contract total for the selected number of months. */
  annual: number;

  /** Install + any one-time extra bag cost. */
  installCost: number;

  /** Which service rule ("8" or "3+40") is cheaper. */
  chosenServiceRule: SanipodServiceRuleKey;

  /** Pod-only portion of the weekly service at red rate (without bags). */
  weeklyPodServiceRed: number;

  /** First visit charge = install-only (plus one-time bags). */
  firstVisit: number;

  /** Ongoing monthly (after first) with 4.33 weeks logic. */
  ongoingMonthly: number;

  /** Contract total explicitly, same as `annual`. */
  contractTotal: number;

  /** Adjusted per visit based on custom overrides */
  adjustedPerVisit: number;

  /** Adjusted monthly based on custom overrides */
  adjustedMonthly: number;

  /** Adjusted annual based on custom overrides */
  adjustedAnnual: number;

  /** Adjusted pod service total */
  adjustedPodServiceTotal: number;

  /** Adjusted bags total */
  adjustedBagsTotal: number;

  /** Effective rate per pod */
  effectiveRatePerPod: number;

  /** ✅ NEW: Minimum charge per visit (for standalone: $40, for package: no minimum) */
  minimumChargePerVisit: number;
}

const DEFAULT_FORM_STATE: SanipodFormState = {
  podQuantity: 0,
  extraBagsPerWeek: 0,
  extraBagsRecurring: true,

  // Editable pricing rates from config (will be overridden by backend)
  weeklyRatePerUnit: cfg.weeklyRatePerUnit,
  altWeeklyRatePerUnit: cfg.altWeeklyRatePerUnit,
  extraBagPrice: cfg.extraBagPrice,
  standaloneExtraWeeklyCharge: cfg.standaloneExtraWeeklyCharge,

  includeTrip: false,
  tripChargePerVisit: cfg.tripChargePerVisit, // 0 and ignored in calc

  isNewInstall: false,
  installQuantity: 0,
  installRatePerPod: cfg.installChargePerUnit,

  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",

  contractMonths: cfg.minContractMonths ?? 12,

  isStandalone: true, // Default to standalone
};

export function useSanipodCalc(initialData?: Partial<SanipodFormState>, customFields?: any[]) {
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

    console.log(`💰 [SANIPOD-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [SANIPOD-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const baselineRatesRef = useRef({
    weeklyRatePerUnit: DEFAULT_FORM_STATE.weeklyRatePerUnit,
    altWeeklyRatePerUnit: DEFAULT_FORM_STATE.altWeeklyRatePerUnit,
    extraBagPrice: DEFAULT_FORM_STATE.extraBagPrice,
    standaloneExtraWeeklyCharge: DEFAULT_FORM_STATE.standaloneExtraWeeklyCharge,
    tripChargePerVisit: DEFAULT_FORM_STATE.tripChargePerVisit,
    installRatePerPod: DEFAULT_FORM_STATE.installRatePerPod,
  });
  const deriveBaselineFromData = (data: Partial<SanipodFormState>) => ({
    weeklyRatePerUnit: data.weeklyRatePerUnit ?? DEFAULT_FORM_STATE.weeklyRatePerUnit,
    altWeeklyRatePerUnit: data.altWeeklyRatePerUnit ?? DEFAULT_FORM_STATE.altWeeklyRatePerUnit,
    extraBagPrice: data.extraBagPrice ?? DEFAULT_FORM_STATE.extraBagPrice,
    standaloneExtraWeeklyCharge:
      data.standaloneExtraWeeklyCharge ?? DEFAULT_FORM_STATE.standaloneExtraWeeklyCharge,
    tripChargePerVisit: data.tripChargePerVisit ?? DEFAULT_FORM_STATE.tripChargePerVisit,
    installRatePerPod: data.installRatePerPod ?? DEFAULT_FORM_STATE.installRatePerPod,
  });
  baselineRatesRef.current = deriveBaselineFromData(initialData || {});
  const calcRef = useRef<SanipodCalcResult | null>(null);

  const [form, setForm] = useState<SanipodFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM_STATE,
      ...initialData,
    };

    // ✅ Initialize with global months ONLY if service starts with inputs
    const isInitiallyActive = (initialData?.podQuantity || 0) > 0;
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
  const [backendConfig, setBackendConfig] = useState<BackendSanipodConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Helper function to update form with config data
  const updateFormWithConfig = (activeConfig: any) => {
    setForm((prev) => {
      const nextWeeklyRate = activeConfig.weeklyRatePerUnit ?? prev.weeklyRatePerUnit;
      const nextAltWeeklyRate = activeConfig.altWeeklyRatePerUnit ?? prev.altWeeklyRatePerUnit;
      const nextExtraBagPrice = activeConfig.extraBagPrice ?? prev.extraBagPrice;
      const nextStandaloneExtra = activeConfig.standaloneExtraWeeklyCharge ?? prev.standaloneExtraWeeklyCharge;
      const nextTripCharge = activeConfig.tripChargePerVisit ?? prev.tripChargePerVisit;
      const nextInstallRate = activeConfig.installChargePerUnit ?? prev.installRatePerPod;
      baselineRatesRef.current = {
        weeklyRatePerUnit: nextWeeklyRate,
        altWeeklyRatePerUnit: nextAltWeeklyRate,
        extraBagPrice: nextExtraBagPrice,
        standaloneExtraWeeklyCharge: nextStandaloneExtra,
        tripChargePerVisit: nextTripCharge,
        installRatePerPod: nextInstallRate,
      };

      return {
        ...prev,
        // Update all rate fields from backend config
        weeklyRatePerUnit: nextWeeklyRate,
        altWeeklyRatePerUnit: nextAltWeeklyRate,
        extraBagPrice: nextExtraBagPrice,
        standaloneExtraWeeklyCharge: nextStandaloneExtra,
        installRatePerPod: nextInstallRate,
        tripChargePerVisit: nextTripCharge,
        // Clear manual overrides when refreshing backend config so we show pure backend values
        customInstallationFee: undefined,
        customPerVisitPrice: undefined,
        customMonthlyPrice: undefined,
        customAnnualPrice: undefined,
        customWeeklyPodRate: undefined,
        customPodServiceTotal: undefined,
        customExtraBagsTotal: undefined,
      };
    });
  };

  // ⚡ OPTIMIZED: Fetch pricing config from context (NO API call)
  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {
      // ⚡ Use context's backend pricing data directly (already loaded by useAllServicePricing)
      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("sanipod");
        if (backendData?.config) {
          console.log('✅ [SaniPod] Using cached pricing data from context');
          const config = backendData.config as BackendSanipodConfig;

          // ✅ Build active config from backend structure
          const activeConfig = buildActiveConfig(config);

          setBackendConfig(config);
          updateFormWithConfig(activeConfig);

          // ✅ Only clear custom overrides on manual refresh
          if (forceRefresh) {
            console.log('🔄 [SANIPOD] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              customExtraBagPrice: undefined,
              customInstallRatePerPod: undefined,
              customPodWeeklyPrice: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthTotal: undefined,
              customContractTotal: undefined,
            }));
          }

          console.log('✅ SaniPod CONFIG loaded from context:', {
            podSizes: activeConfig.podSizes,
            extraBagPrice: activeConfig.extraBagPrice,
            installCharge: activeConfig.installChargePerUnit,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for SaniPod, using static fallback values');
    } catch (error: any) {
      console.error('❌ Failed to fetch SaniPod config from context:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("sanipod");
        if (fallbackConfig?.config) {
          console.log('✅ [SaniPod] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendSanipodConfig;

          // ✅ Build active config from backend structure
          const activeConfig = buildActiveConfig(config);

          setBackendConfig(config);
          updateFormWithConfig(activeConfig);

          // ✅ FIXED: Only clear custom overrides on manual refresh
          if (forceRefresh) {
            console.log('🔄 [SANIPOD] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              customExtraBagPrice: undefined,
              customInstallRatePerPod: undefined,
              customPodWeeklyPrice: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthTotal: undefined,
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

  // ✅ Fetch pricing configuration on mount ONLY if no initialData (new service)
  useEffect(() => {
    // Skip fetching if we have initialData (editing existing service with saved prices)
    if (initialData) {
      console.log('📋 [SANIPOD-PRICING] Skipping price fetch - using saved historical prices from initialData');
      return;
    }

    console.log('📋 [SANIPOD-PRICING] Fetching current prices - new service or no initial data');
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

  useEffect(() => {
    const backendConfigEntry = servicesContext?.getBackendPricingForService("sanipod");
    if (backendConfigEntry?.config) {
      const activeConfig = buildActiveConfig(
        backendConfigEntry.config as BackendSanipodConfig
      );
      baselineRatesRef.current = {
        extraBagPrice: activeConfig.extraBagPrice,
        installRatePerPod: activeConfig.installChargePerUnit,
      };
    }
  }, [servicesContext?.getBackendPricingForService, servicesContext?.backendPricingData]);

  // ✅ Add sync effect to adopt global months when service becomes active or when global months change
  useEffect(() => {
    const isServiceActive = (form.podQuantity || 0) > 0;
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
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.podQuantity, servicesContext]);

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number | undefined,
    newValue: number | undefined
  ) => {
    if (typeof newValue !== "number" || Number.isNaN(newValue) || newValue <= 0) {
      return;
    }

    const fallbackValues: Record<string, number | undefined> = {
      ...baselineRatesRef.current,
      customWeeklyPodRate: calcRef.current?.effectiveRatePerPod,
      customPodServiceTotal: calcRef.current?.adjustedPodServiceTotal,
      customExtraBagsTotal: calcRef.current?.adjustedBagsTotal,
      customInstallationFee: calcRef.current?.installCost,
      customPerVisitPrice: calcRef.current?.adjustedPerVisit,
      customMonthlyPrice: calcRef.current?.adjustedMonthly,
      customAnnualPrice: calcRef.current?.contractTotal,
    };

    const fallbackValue = fallbackValues[fieldName];
    let resolvedOriginal = originalValue;
    if ((resolvedOriginal === undefined || resolvedOriginal === null || resolvedOriginal === 0) &&
        fallbackValue !== undefined) {
      resolvedOriginal = fallbackValue;
    }
    if (resolvedOriginal === undefined || resolvedOriginal === newValue) {
      return;
    }

    addPriceChange({
      productKey: `sanipod_${fieldName}`,
      productName: `SaniPod - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue: resolvedOriginal,
      newValue,
      quantity: form.podQuantity || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [SANIPOD-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: resolvedOriginal,
      to: newValue,
      change: newValue - resolvedOriginal,
      changePercent: resolvedOriginal ? ((newValue - resolvedOriginal) / resolvedOriginal * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.podQuantity, form.frequency]);

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
      const originalValue = prev[name as keyof SanipodFormState];

      const next: SanipodFormState = { ...prev };

      if (type === "checkbox") {
        (next as any)[name] = t.checked;
      } else if (
        name === "customInstallationFee" ||
        name === "customPerVisitPrice" ||
        name === "customMonthlyPrice" ||
        name === "customAnnualPrice" ||
        name === "customWeeklyPodRate" ||
        name === "customPodServiceTotal" ||
        name === "customExtraBagsTotal"
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
        const num = raw === "" ? 0 : parseFloat(raw);
        (next as any)[name] =
          Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        (next as any)[name] = t.value;
      }

      // Special handling for frequency
      if (name === "frequency") {
        next.frequency = t.value as SanipodFrequencyKey;
      }

      // ✅ Log price override for numeric pricing fields
      const pricingFields = [
        'weeklyRatePerUnit', 'altWeeklyRatePerUnit', 'extraBagPrice',
        'standaloneExtraWeeklyCharge', 'tripChargePerVisit', 'installRatePerPod',
        'customInstallationFee', 'customPerVisitPrice', 'customMonthlyPrice',
        'customAnnualPrice', 'customWeeklyPodRate', 'customPodServiceTotal', 'customExtraBagsTotal'
      ];

      if (pricingFields.includes(name)) {
        const newValue = (next as any)[name] as number | undefined;
        addServiceFieldChange(name, originalValue as number | undefined, newValue);
      }

      // ✅ NEW: Log form field changes using universal logger
      return next;
    });
  };

  const calc: SanipodCalcResult = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = buildActiveConfig(backendConfig);

    const pods = Math.max(0, Number(form.podQuantity) || 0);
    const bags = Math.max(0, Number(form.extraBagsPerWeek) || 0);
    const installQtyRaw = Math.max(0, Number(form.installQuantity) || 0);

    const anyActivity =
      pods > 0 ||
      bags > 0 ||
      (form.isNewInstall && installQtyRaw > 0);

    if (!anyActivity) {
      return {
        perVisit: 0,
        monthly: 0,
        annual: 0,
        installCost: 0,
        chosenServiceRule: "perPod8",
        weeklyPodServiceRed: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
        adjustedPerVisit: 0,
        adjustedMonthly: 0,
        adjustedAnnual: 0,
        adjustedPodServiceTotal: 0,
        adjustedBagsTotal: 0,
        effectiveRatePerPod: 0,
      };
    }

    // ✅ RATE CATEGORIES FROM BACKEND (NOT HARDCODED!)
    const rateCfg = activeConfig.rateCategories[form.rateCategory] ?? activeConfig.rateCategories.redRate;

    // Trip charge concept removed from calculations.
    const tripPerVisit = 0;

    const installRate =
      form.installRatePerPod > 0
        ? form.installRatePerPod
        : activeConfig.installChargePerUnit;  // ✅ FROM BACKEND

    // ---------- EXTRA BAGS ----------
    // If recurring: weekly revenue; if one-time: first-visit only.
    const weeklyBagsRed = form.extraBagsRecurring
      ? bags * form.extraBagPrice
      : 0;

    const oneTimeBagsCost = form.extraBagsRecurring
      ? 0
      : bags * form.extraBagPrice;

    // ---------- WEEKLY SERVICE (RED RATE) ----------
    const weeklyRatePerUnit = Number(form.weeklyRatePerUnit) || 0;
    const standaloneCharge = Number(form.standaloneExtraWeeklyCharge) || 0;
    const customPodRate = form.customWeeklyPodRate !== undefined
      ? Number(form.customWeeklyPodRate)
      : undefined;
    const effectiveOptAPerPodRate = (customPodRate ?? Number(form.altWeeklyRatePerUnit)) || 0;
    const weeklyPodOptA_Red = form.customPodServiceTotal !== undefined
      ? form.customPodServiceTotal
      : pods * effectiveOptAPerPodRate;
    const weeklyPodOptB_Red =
      pods * weeklyRatePerUnit + standaloneCharge;

    const weeklyServiceOptA_Red = weeklyPodOptA_Red + weeklyBagsRed;
    const weeklyServiceOptB_Red = weeklyPodOptB_Red + weeklyBagsRed;

    console.log('[SANIPOD-VALUES]', {
      weeklyPodOptA_Red,
      weeklyPodOptB_Red,
      weeklyServiceOptA_Red,
      weeklyServiceOptB_Red,
      weeklyBagsRed,
      weeklyRatePerUnit: Number(form.weeklyRatePerUnit),
      standaloneExtraWeeklyCharge: Number(form.standaloneExtraWeeklyCharge),
      bags,
      pods
    });

    const serviceRuleSelection = form.serviceRule || "auto";
    const applyStandaloneMinimum = (value: number) => {
      if (form.isStandalone) {
        return Math.max(value, standaloneCharge);
      }
      return value;
    };

    const optionATotalBeforeMin = weeklyServiceOptA_Red * rateCfg.multiplier;
    const optionBTotalBeforeMin = weeklyServiceOptB_Red * rateCfg.multiplier;
    const optionATotalWithMin = applyStandaloneMinimum(optionATotalBeforeMin);
    const optionBTotalWithMin = applyStandaloneMinimum(optionBTotalBeforeMin);

    let usingOptA: boolean;
    if (serviceRuleSelection === "perPod8") {
      usingOptA = true;
    } else if (serviceRuleSelection === "perPod3Plus40") {
      usingOptA = false;
    } else {
      usingOptA = optionATotalWithMin <= optionBTotalWithMin;
    }

    const weeklyServiceRed = usingOptA
      ? weeklyServiceOptA_Red
      : weeklyServiceOptB_Red;

    const weeklyPodServiceRed = usingOptA
      ? weeklyPodOptA_Red
      : weeklyPodOptB_Red;

    const chosenServiceRule: SanipodServiceRuleKey = usingOptA
      ? "perPod8"
      : "perPod3Plus40";

    console.log(' [SANIPOD-RULE]',
      {usingOptA, chosenServiceRule, optionATotalBeforeMin, optionBTotalBeforeMin, optionATotalWithMin, optionBTotalWithMin}
    );

    const weeklyServiceBeforeMinimum = usingOptA
      ? optionATotalBeforeMin
      : optionBTotalBeforeMin;

    const weeklyService = usingOptA
      ? optionATotalWithMin
      : optionBTotalWithMin;

    console.log(`💰 [SANIPOD-MINIMUM] Applying minimum charge check:`, {
      isStandalone: form.isStandalone,
      beforeMinimum: weeklyServiceBeforeMinimum.toFixed(2),
      minimum: form.standaloneExtraWeeklyCharge,
      afterMinimum: weeklyService.toFixed(2),
      minimumApplied: form.isStandalone && weeklyServiceBeforeMinimum < form.standaloneExtraWeeklyCharge
    });

    // ---------- PER VISIT (SERVICE ONLY) ----------
    const perVisitService = weeklyService;
    const perVisit = perVisitService + tripPerVisit; // tripPerVisit = 0

    // ---------- INSTALL (ONE-TIME) + ONE-TIME BAGS ----------
    const installQty = form.isNewInstall ? installQtyRaw : 0;
    const calculatedInstallOnlyCost = installQty * installRate;

    // Use custom installation fee if user has manually set it, otherwise use calculated
    const installOnlyCost = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOnlyCost;

    // ✅ PARTIAL INSTALLATION LOGIC (like Foaming Drain):
    // If 11 pods total and 5 installed:
    // - servicePods = 6 (not getting installed on first visit)
    // - First visit = (5 × install) + service cost for 6 pods
    //
    // IMPORTANT: For Option B ($3/pod + $40), we can't use effective rate!
    // We must calculate: (servicePods × $3) + $40
    const servicePods = Math.max(0, pods - installQty);

    let firstVisitServiceCost = 0;
    if (servicePods > 0) {
      if (usingOptA) {
        // Option A: Simple per-pod rate for service pods only
        const perPodRate = form.altWeeklyRatePerUnit;
        firstVisitServiceCost = servicePods * perPodRate * rateCfg.multiplier;
      } else {
        // Option B: (servicePods × $3) + $40 base
        const optBServiceCost = (servicePods * form.weeklyRatePerUnit) + form.standaloneExtraWeeklyCharge;
        firstVisitServiceCost = optBServiceCost * rateCfg.multiplier;
      }
    }

    // ✅ FIXED BAG LOGIC FOR FIRST VISIT:
    // Both recurring and one-time bags should be included in first visit
    // The difference is only in subsequent visits
    const firstVisitBagsCost = bags > 0 ? (bags * form.extraBagPrice * rateCfg.multiplier) : 0;

    // First visit = Install + Service (non-installed pods only) + Bags (always included)
    const firstVisit = installOnlyCost + firstVisitServiceCost + firstVisitBagsCost;
    const installCost = installOnlyCost;

    // ---------- MONTHLY & CONTRACT ----------
    // ✅ FREQUENCY-SPECIFIC CALCULATION: Use the correct multiplier based on selected frequency
    const selectedFrequency = form.frequency || "weekly";
    const monthlyVisits = activeConfig.frequencyMultipliers[selectedFrequency];

    // ✅ DETERMINE IF FREQUENCY IS VISIT-BASED (not monthly billing)
    const isVisitBasedFrequency = selectedFrequency === "oneTime" || selectedFrequency === "quarterly" ||
      selectedFrequency === "biannual" || selectedFrequency === "annual" || selectedFrequency === "bimonthly";

    // ✅ PARTIAL INSTALLATION FIRST MONTH CALCULATION:
    let firstMonth;

    if (selectedFrequency === "oneTime") {
      // ✅ For oneTime: just the first visit (install + service for non-installed pods + bags)
      firstMonth = firstVisit;
    } else if (isVisitBasedFrequency) {
      // ✅ For quarterly, biannual, annual, bimonthly: just the first visit
      firstMonth = firstVisit;
    } else if (selectedFrequency === "monthly") {
      // ✅ For monthly: first visit (since only 1 visit per month)
      firstMonth = firstVisit;
    } else {
      // Weekly/biweekly/twicePerMonth: Use partial installation logic
      // First month = first visit (partial service + install) + remaining visits (full service)
      firstMonth = firstVisit + Math.max(monthlyVisits - 1, 0) * perVisit;
    }

    // Ongoing months (after first) – all visits are "normal".
    const ongoingMonthly = monthlyVisits * perVisit;

    // ✅ CONTRACT MONTHS FROM BACKEND (NOT HARDCODED!)
    const minMonths = activeConfig.minContractMonths;
    const maxMonths = activeConfig.maxContractMonths;
    const rawMonths = Number(form.contractMonths) || minMonths;
    const contractMonths = Math.min(
      Math.max(rawMonths, minMonths),
      maxMonths
    );

    // ✅ CONTRACT TOTAL CALCULATION - handle visit-based frequencies differently
    let contractTotal: number;
    if (selectedFrequency === "oneTime") {
      // For oneTime: just the first visit price
      contractTotal = firstVisit;
    } else if (isVisitBasedFrequency) {
      // For quarterly, biannual, annual, bimonthly: use annual multipliers
      const visitsPerYear = activeConfig.annualFrequencies[selectedFrequency];
      const totalVisits = (contractMonths / 12) * visitsPerYear;

      // All visits are normal service (after first visit which is install if applicable)
      if (form.isNewInstall && installQty > 0) {
        // First visit is install, remaining visits are service
        const serviceVisits = Math.max(totalVisits - 1, 0);
        contractTotal = firstVisit + (serviceVisits * perVisit);
      } else {
        // No install, all visits are service
        contractTotal = totalVisits * perVisit;
      }
    } else {
      // For weekly, biweekly, twicePerMonth, monthly: use monthly-based calculation
      if (contractMonths <= 0) {
        contractTotal = 0;
      } else {
        contractTotal = firstMonth + Math.max(contractMonths - 1, 0) * ongoingMonthly;
      }
    }

    // ========== ADJUSTED CALCULATIONS BASED ON CUSTOM OVERRIDES ==========
    // Note: pods and bags already declared above

    // Effective rate per pod
    const effectiveRatePerPod = pods > 0 ? weeklyPodServiceRed / pods : 0;

    // Bag line amount
    const bagLineAmount = bags * form.extraBagPrice;

    // Adjusted pod service total (uses custom rate if set)
    const adjustedPodServiceTotal = form.customPodServiceTotal !== undefined
      ? form.customPodServiceTotal
      : (pods > 0 ? (form.customWeeklyPodRate !== undefined ? form.customWeeklyPodRate : effectiveRatePerPod) * pods : 0);

    // Adjusted bags total
    const adjustedBagsTotal = form.customExtraBagsTotal !== undefined
      ? form.customExtraBagsTotal
      : bagLineAmount;

    // Adjusted per visit (uses adjusted totals and rate multiplier)
    const adjustedPerVisitBeforeMinimum = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : (adjustedPodServiceTotal + (form.extraBagsRecurring ? adjustedBagsTotal : 0)) * rateCfg.multiplier;

    // ✅ FIXED: Apply $40 minimum for standalone service (same logic as base perVisit)
    const adjustedPerVisit = form.isStandalone
      ? Math.max(adjustedPerVisitBeforeMinimum, form.standaloneExtraWeeklyCharge)
      : adjustedPerVisitBeforeMinimum;

    console.log(`💰 [SANIPOD-ADJUSTED-MINIMUM] Applying minimum to adjusted per visit:`, {
      isStandalone: form.isStandalone,
      beforeMinimum: adjustedPerVisitBeforeMinimum.toFixed(2),
      minimum: form.standaloneExtraWeeklyCharge,
      afterMinimum: adjustedPerVisit.toFixed(2),
      minimumApplied: form.isStandalone && adjustedPerVisitBeforeMinimum < form.standaloneExtraWeeklyCharge
    });

    // ========== ADJUSTED FIRST VISIT WITH PARTIAL INSTALLATION ==========
    // If installing some pods, first visit = install + service for NON-installed pods only
    // Note: servicePods already declared above (line ~324)

    // Service cost for non-installed pods on first visit (with custom overrides)
    let adjustedFirstVisitServiceCost = 0;
    if (servicePods > 0 && installQty > 0) {
      // Calculate service cost for ONLY the non-installed pods
      const effectiveRateForServicePods = form.customWeeklyPodRate !== undefined
        ? form.customWeeklyPodRate
        : effectiveRatePerPod;

      if (usingOptA) {
        // Option A: servicePods × rate per pod
        adjustedFirstVisitServiceCost = servicePods * effectiveRateForServicePods * rateCfg.multiplier;
      } else {
        // Option B: (servicePods × $3) + $40
        const optBServiceCost = (servicePods * form.weeklyRatePerUnit) + form.standaloneExtraWeeklyCharge;
        adjustedFirstVisitServiceCost = optBServiceCost * rateCfg.multiplier;
      }
    }

    // Adjusted monthly
    const weeksPerMonthCalc = monthlyVisits;  // ✅ Use frequency-specific multiplier
    const oneTimeBagsCostCalc = form.extraBagsRecurring ? 0 : adjustedBagsTotal;
    const installCostCalc = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : installOnlyCost;

    // Adjusted monthly - should use the same logic as base firstMonth calculation
    // For visit-based frequencies: first month = first visit (since only 1 visit per period)
    // For other frequencies: first month = first visit + remaining visits
    let adjustedFirstVisitTotal;
    if (installQty > 0) {
      // With installation: install + service for non-installed pods + bags
      const adjustedFirstVisitBags = bags > 0 ? adjustedBagsTotal * rateCfg.multiplier : 0;
      adjustedFirstVisitTotal = installCostCalc + adjustedFirstVisitServiceCost + adjustedFirstVisitBags;
    } else {
      // No installation: just normal per visit + one-time bags
      adjustedFirstVisitTotal = adjustedPerVisit + oneTimeBagsCostCalc;
    }

    const adjustedMonthly = form.customMonthlyPrice !== undefined
      ? form.customMonthlyPrice
      : selectedFrequency === "oneTime" || isVisitBasedFrequency || selectedFrequency === "monthly"
        ? adjustedFirstVisitTotal
        : adjustedFirstVisitTotal + Math.max(monthlyVisits - 1, 0) * adjustedPerVisit;

    // Adjusted annual/contract total
    const ongoingMonthlyCalc = weeksPerMonthCalc * adjustedPerVisit;

    let adjustedAnnualBeforeCustomFields: number;
    if (form.customAnnualPrice !== undefined) {
      adjustedAnnualBeforeCustomFields = form.customAnnualPrice;
    } else if (selectedFrequency === "oneTime") {
      // For oneTime: just the first visit
      adjustedAnnualBeforeCustomFields = adjustedFirstVisitTotal;
    } else if (isVisitBasedFrequency) {
      // For quarterly, biannual, annual, bimonthly: use annual multipliers
      const visitsPerYear = activeConfig.annualFrequencies[selectedFrequency];
      const totalVisits = (contractMonths / 12) * visitsPerYear;

      if (form.isNewInstall && installQty > 0) {
        // First visit is install, remaining visits are service
        const serviceVisits = Math.max(totalVisits - 1, 0);
        adjustedAnnualBeforeCustomFields = adjustedFirstVisitTotal + (serviceVisits * adjustedPerVisit);
      } else {
        // No install, all visits are service
        adjustedAnnualBeforeCustomFields = totalVisits * adjustedPerVisit;
      }
    } else {
      // For weekly, biweekly, twicePerMonth, monthly: use monthly-based calculation
      if (contractMonths <= 0) {
        adjustedAnnualBeforeCustomFields = 0;
      } else {
        adjustedAnnualBeforeCustomFields = adjustedMonthly + Math.max(contractMonths - 1, 0) * ongoingMonthlyCalc;
      }
    }

    // ✅ NEW: Add calc field totals AND dollar field totals directly to contract (no frequency dependency)
    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const adjustedAnnual = adjustedAnnualBeforeCustomFields + customFieldsTotal;
    const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

    console.log(`📊 [SANIPOD-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotal.toFixed(2),
      adjustedBeforeCustomFields: adjustedAnnualBeforeCustomFields.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalAdjustedAnnual: adjustedAnnual.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });

    return {
      perVisit,
      monthly: firstMonth,
      annual: contractTotalWithCustomFields, // ✅ UPDATED: Total contract value with custom fields
      installCost,
      chosenServiceRule,
      weeklyPodServiceRed,
      firstVisit,
      ongoingMonthly: ongoingMonthlyCalc, // ✅ FIXED: Use adjusted monthly (with custom overrides)
      contractTotal: contractTotalWithCustomFields, // ✅ UPDATED: Total contract value with custom fields
      adjustedPerVisit,
      adjustedMonthly,
      adjustedAnnual, // ✅ UPDATED: Includes custom fields
      adjustedPodServiceTotal,
      adjustedBagsTotal,
      effectiveRatePerPod,
      // ✅ NEW: Minimum charge per visit ($40 when standalone, $0 when part of package)
      minimumChargePerVisit: form.isStandalone ? form.standaloneExtraWeeklyCharge : 0,
    };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form.podQuantity,
    form.extraBagsPerWeek,
    form.extraBagsRecurring,
    form.weeklyRatePerUnit,
    form.altWeeklyRatePerUnit,
    form.extraBagPrice,
    form.standaloneExtraWeeklyCharge,
    form.includeTrip,
    form.tripChargePerVisit,
    form.isNewInstall,
    form.installQuantity,
    form.installRatePerPod,
    form.customInstallationFee,
    form.frequency,
    form.rateCategory,
    form.contractMonths,
    form.isStandalone,
    form.customWeeklyPodRate,
    form.customPodServiceTotal,
    form.customExtraBagsTotal,
    form.customPerVisitPrice,
    form.customMonthlyPrice,
    form.customAnnualPrice,
    // ✅ NEW: Re-calculate when custom fields change
    calcFieldsTotal,
    dollarFieldsTotal,
  ]);

  calcRef.current = calc;

  return {
    form,
    setForm,
    onChange,
    calc,
    refreshConfig: fetchPricing,
    isLoadingConfig,
    setContractMonths,
    baselineRates: baselineRatesRef.current,
  };
}

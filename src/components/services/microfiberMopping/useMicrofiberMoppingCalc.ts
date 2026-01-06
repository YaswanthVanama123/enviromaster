// src/features/services/microfiberMopping/useMicrofiberMoppingCalc.ts
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  MicrofiberMoppingFormState,
  MicrofiberFrequencyKey,
  MicrofiberMoppingCalcResult,
} from "./microfiberMoppingTypes";
import { microfiberMoppingPricingConfig as cfg } from "./microfiberMoppingConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";

// ✅ Backend config interface matching the ACTUAL MongoDB JSON structure from API
interface BackendMicrofiberConfig {
  // OLD format (for backward compatibility)
  includedBathroomRate?: number;
  hugeBathroomPricing?: {
    enabled: boolean;
    ratePerSqFt: number;
    sqFtUnit: number;
    description: string;
  };
  extraAreaPricing?: {
    singleLargeAreaRate: number;
    extraAreaSqFtUnit: number;
    extraAreaRatePerUnit: number;
    useHigherRate: boolean;
  };
  standalonePricing?: {
    standaloneSqFtUnit: number;
    standaloneRatePerUnit: number;
    standaloneMinimum: number;
    includeTripCharge: boolean;
  };
  chemicalProducts?: {
    dailyChemicalPerGallon: number;
    customerSelfMopping: boolean;
    waterOnlyBetweenServices: boolean;
  };
  // NEW format (from actual backend API)
  bathroomMoppingPricing?: {
    flatPricePerBathroom: number;
    hugeBathroomSqFtUnit: number;
    hugeBathroomRate: number;
  };
  nonBathroomAddonAreas?: {
    flatPriceSingleLargeArea: number;
    sqFtUnit: number;
    ratePerSqFtUnit: number;
    useHigherRate: boolean;
  };
  standaloneMoppingPricing?: {
    sqFtUnit: number;
    ratePerSqFtUnit: number;
    minimumPrice: number;
    includeTripCharge: boolean;
  };
  tripCharges?: {
    standard: number;
    beltway: number;
  };
  minimumChargePerVisit?: number;
  frequencyMetadata?: any; // Will be converted to billingConversions
  billingConversions?: {
    oneTime: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    weekly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    biweekly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    twicePerMonth: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    monthly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    bimonthly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    quarterly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    biannual: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    annual: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    actualWeeksPerYear: number;
    actualWeeksPerMonth: number;
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
  defaultFrequency?: string;
  allowedFrequencies?: string[];
}

type InputChangeEvent =
  | ChangeEvent<HTMLInputElement>
  | ChangeEvent<HTMLSelectElement>;

// ✅ Helper function to map frequency strings to valid MicrofiberFrequencyKey
function mapFrequency(v: string): MicrofiberFrequencyKey {
  if (v === "oneTime" || v === "weekly" || v === "biweekly" || v === "twicePerMonth" ||
      v === "monthly" || v === "bimonthly" || v === "quarterly" || v === "biannual" || v === "annual") {
    return v;
  }
  return "weekly";
}

// ✅ Helper function to convert frequencyMetadata to billingConversions format
function convertFrequencyMetadataToBillingConversions(config: any): BackendMicrofiberConfig {
  // If the config already has billingConversions, return as-is
  if (config.billingConversions) {
    return config as BackendMicrofiberConfig;
  }

  // If the config has frequencyMetadata, convert it to billingConversions format
  if (config.frequencyMetadata) {
    const freqMeta = config.frequencyMetadata;

    return {
      ...config,
      billingConversions: {
        oneTime: {
          annualMultiplier: 1,
          monthlyMultiplier: 0, // oneTime has no monthly billing
        },
        weekly: {
          annualMultiplier: 52,
          monthlyMultiplier: freqMeta.weekly?.monthlyRecurringMultiplier ?? 4.33,
        },
        biweekly: {
          annualMultiplier: 26,
          monthlyMultiplier: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 2.165,
        },
        twicePerMonth: {
          annualMultiplier: 24,
          monthlyMultiplier: 2, // 2 visits per month
        },
        monthly: {
          annualMultiplier: 12,
          monthlyMultiplier: 1, // monthly always 1 visit per month
        },
        bimonthly: {
          annualMultiplier: 6,
          monthlyMultiplier: 0.5, // every 2 months = 0.5 per month
        },
        quarterly: {
          annualMultiplier: 4,
          monthlyMultiplier: 0, // no monthly for quarterly
        },
        biannual: {
          annualMultiplier: 2,
          monthlyMultiplier: 0, // no monthly for biannual
        },
        annual: {
          annualMultiplier: 1,
          monthlyMultiplier: 0, // no monthly for annual
        },
        actualWeeksPerYear: 52,
        actualWeeksPerMonth: 4.33, // 52/12
      },
    } as BackendMicrofiberConfig;
  }

  // Fallback: return config as-is (will use static defaults)
  console.warn('⚠️ Microfiber Mopping config has neither billingConversions nor frequencyMetadata');
  return config as BackendMicrofiberConfig;
}

const DEFAULT_FORM: MicrofiberMoppingFormState = {
  // Base service meta
  serviceId: "microfiber_mopping",

  // Defaults
  frequency: cfg.defaultFrequency,
  contractTermMonths: 36,

  hasExistingSaniService: true,

  bathroomCount: 0,
  isHugeBathroom: false,
  hugeBathroomSqFt: 0,

  extraAreaSqFt: 0,
  useExactExtraAreaSqft: true, // Default to exact calculation
  standaloneSqFt: 0,
  useExactStandaloneSqft: true, // Default to exact calculation
  chemicalGallons: 0,

  isAllInclusive: false,

  location: "insideBeltway",
  needsParking: false,

  // Editable pricing rates from config (will be overridden by backend)
  includedBathroomRate: cfg.includedBathroomRate,
  hugeBathroomRatePerSqFt: cfg.hugeBathroomPricing.ratePerSqFt,
  extraAreaRatePerUnit: cfg.extraAreaPricing.extraAreaRatePerUnit,
  standaloneRatePerUnit: cfg.standalonePricing.standaloneRatePerUnit,
  dailyChemicalPerGallon: cfg.chemicalProducts.dailyChemicalPerGallon,
} as MicrofiberMoppingFormState;

// Helper function removed - will use backend config directly

export function useMicrofiberMoppingCalc(
  initialData?: unknown,
  customFields?: any[]
): {
  form: MicrofiberMoppingFormState;
  setForm: React.Dispatch<React.SetStateAction<MicrofiberMoppingFormState>>;
  onChange: (ev: InputChangeEvent) => void;
  quote: ServiceQuoteResult;
  calc: MicrofiberMoppingCalcResult;
} {
  // Get services context for fallback pricing data AND global contract months
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

    console.log(`💰 [MICROFIBER-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [MICROFIBER-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [form, setForm] = useState<MicrofiberMoppingFormState>(() => {
    const maybe = (initialData as any) || {};
    const initialForm =
      maybe && typeof maybe === "object" && "form" in maybe ? maybe.form : maybe;

    // ✅ Calculate if service is initially active (has inputs)
    const initialInputCount = (initialForm?.bathroomCount || 0) +
                               (initialForm?.hugeBathroomSqFt || 0) +
                               (initialForm?.extraAreaSqFt || 0) +
                               (initialForm?.standaloneSqFt || 0) +
                               (initialForm?.chemicalGallons || 0);
    const isInitiallyActive = initialInputCount > 0;

    // ✅ Only use global contract months if service starts active AND no initial value provided
    const defaultContractMonths = initialForm?.contractTermMonths
      ? initialForm.contractTermMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : DEFAULT_FORM.contractTermMonths;

    console.log(`📅 [MICROFIBER-INIT] Initializing contract months:`, {
      initialInputCount,
      isInitiallyActive,
      globalContractMonths: servicesContext?.globalContractMonths,
      defaultContractMonths,
      hasInitialValue: !!initialForm?.contractTermMonths
    });

    return {
      ...DEFAULT_FORM,
      ...(initialForm as Partial<MicrofiberMoppingFormState>),
      contractTermMonths: defaultContractMonths,
    };
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendMicrofiberConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // ✅ Add refs for tracking baseline values and edit mode
  const isEditMode = useRef(!!initialData);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);

  // Helper function to update form with config data
  const updateFormWithConfig = (config: BackendMicrofiberConfig, forceUpdate: boolean = false) => {
    // ✅ FIXED: In edit mode, NEVER overwrite user's loaded values (unless force refresh)
    // Only update on manual refresh (when user explicitly clicks refresh button)
    if (initialData && !forceUpdate) {
      console.log('📋 [MICROFIBER-MOPPING] Edit mode: Skipping form update to preserve loaded values');
      return; // Don't overwrite loaded values in edit mode
    }

    console.log('📋 [MICROFIBER-MOPPING] Updating state with backend config', forceUpdate ? '(FORCED by refresh button)' : '');
    setForm((prev) => ({
      ...prev,
      // ✅ Map backend API fields to form state (supports both old and new format)
      // Bathroom rate: NEW format bathroomMoppingPricing.flatPricePerBathroom OR OLD format includedBathroomRate
      includedBathroomRate: config.bathroomMoppingPricing?.flatPricePerBathroom ??
                            config.includedBathroomRate ??
                            prev.includedBathroomRate,

      // Huge bathroom rate: NEW format bathroomMoppingPricing.hugeBathroomRate OR OLD format hugeBathroomPricing.ratePerSqFt
      hugeBathroomRatePerSqFt: config.bathroomMoppingPricing?.hugeBathroomRate ??
                                config.hugeBathroomPricing?.ratePerSqFt ??
                                prev.hugeBathroomRatePerSqFt,

      // Extra area rate: NEW format nonBathroomAddonAreas.ratePerSqFtUnit OR OLD format extraAreaPricing.extraAreaRatePerUnit
      extraAreaRatePerUnit: config.nonBathroomAddonAreas?.ratePerSqFtUnit ??
                            config.extraAreaPricing?.extraAreaRatePerUnit ??
                            prev.extraAreaRatePerUnit,

      // Standalone rate: NEW format standaloneMoppingPricing.ratePerSqFtUnit OR OLD format standalonePricing.standaloneRatePerUnit
      standaloneRatePerUnit: config.standaloneMoppingPricing?.ratePerSqFtUnit ??
                             config.standalonePricing?.standaloneRatePerUnit ??
                             prev.standaloneRatePerUnit,

      // Chemical rate: OLD format only (not in new API response yet)
      dailyChemicalPerGallon: config.chemicalProducts?.dailyChemicalPerGallon ??
                               prev.dailyChemicalPerGallon,
    }));
  };

  // ⚡ OPTIMIZED: Fetch pricing config from context (NO API call)
  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {
      // ⚡ Use context's backend pricing data directly (already loaded by useAllServicePricing)
      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("microfiberMopping");
        if (backendData?.config) {
          console.log('✅ [Microfiber Mopping] Using cached pricing data from context');
          const config = convertFrequencyMetadataToBillingConversions(backendData.config);
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);

          // ✅ Only clear custom overrides on manual refresh
          if (forceRefresh) {
            console.log('🔄 [MICROFIBER-MOPPING] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              // Clear custom RATE overrides
              customIncludedBathroomRate: undefined,
              customHugeBathroomRatePerSqFt: undefined,
              customExtraAreaRatePerUnit: undefined,
              customStandaloneRatePerUnit: undefined,
              customDailyChemicalPerGallon: undefined,
              // Clear custom TOTAL overrides
              customStandardBathroomTotal: undefined,
              customHugeBathroomTotal: undefined,
              customExtraAreaTotal: undefined,
              customStandaloneTotal: undefined,
              customChemicalTotal: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthPrice: undefined,
              customContractTotal: undefined,
            }));
          }

          console.log('✅ Microfiber Mopping CONFIG loaded from context:', {
            pricing: {
              bathroomRate: config.includedBathroomRate,
              hugeBathroomRate: config.hugeBathroomPricing?.ratePerSqFt,
              extraAreaRate: config.extraAreaPricing?.extraAreaRatePerUnit,
              standaloneRate: config.standalonePricing?.standaloneRatePerUnit,
              chemicalRate: config.chemicalProducts?.dailyChemicalPerGallon,
            },
            hugeBathroomPricing: config.hugeBathroomPricing,
            extraAreaPricing: config.extraAreaPricing,
            standalonePricing: config.standalonePricing,
            rateCategories: config.rateCategories,
            billingConversions: config.billingConversions,
            allowedFrequencies: config.allowedFrequencies,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for Microfiber Mopping, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch Microfiber Mopping config from context:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("microfiberMopping");
        if (fallbackConfig?.config) {
          console.log('✅ [Microfiber Mopping] Using backend pricing data from context after error');
          const config = convertFrequencyMetadataToBillingConversions(fallbackConfig.config);
          setBackendConfig(config);
          updateFormWithConfig(config, forceRefresh);

          // ✅ FIXED: Only clear custom overrides on manual refresh
          if (forceRefresh) {
            console.log('🔄 [MICROFIBER-MOPPING] Manual refresh: Clearing all custom overrides');
            setForm(prev => ({
              ...prev,
              // Clear custom RATE overrides
              customIncludedBathroomRate: undefined,
              customHugeBathroomRatePerSqFt: undefined,
              customExtraAreaRatePerUnit: undefined,
              customStandaloneRatePerUnit: undefined,
              customDailyChemicalPerGallon: undefined,
              // Clear custom TOTAL overrides
              customStandardBathroomTotal: undefined,
              customHugeBathroomTotal: undefined,
              customExtraAreaTotal: undefined,
              customStandaloneTotal: undefined,
              customChemicalTotal: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthPrice: undefined,
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
    console.log('📋 [MICROFIBER-PRICING] Fetching backend config (initial load, will not overwrite edit mode values)');
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
        includedBathroomRate: (initialData as any)?.includedBathroomRate ?? backendConfig.bathroomMoppingPricing?.flatPricePerBathroom ?? backendConfig.includedBathroomRate ?? form.includedBathroomRate,
        hugeBathroomRatePerSqFt: (initialData as any)?.hugeBathroomRatePerSqFt ?? backendConfig.bathroomMoppingPricing?.hugeBathroomRate ?? backendConfig.hugeBathroomPricing?.ratePerSqFt ?? form.hugeBathroomRatePerSqFt,
        extraAreaRatePerUnit: (initialData as any)?.extraAreaRatePerUnit ?? backendConfig.nonBathroomAddonAreas?.ratePerSqFtUnit ?? backendConfig.extraAreaPricing?.extraAreaRatePerUnit ?? form.extraAreaRatePerUnit,
        standaloneRatePerUnit: (initialData as any)?.standaloneRatePerUnit ?? backendConfig.standaloneMoppingPricing?.ratePerSqFtUnit ?? backendConfig.standalonePricing?.standaloneRatePerUnit ?? form.standaloneRatePerUnit,
        dailyChemicalPerGallon: (initialData as any)?.dailyChemicalPerGallon ?? backendConfig.chemicalProducts?.dailyChemicalPerGallon ?? form.dailyChemicalPerGallon,
      };

      console.log('✅ [MICROFIBER-BASELINE] Initialized baseline values for logging (ALL fields):', {
        includedBathroomRate: baselineValues.current.includedBathroomRate,
        hugeBathroomRatePerSqFt: baselineValues.current.hugeBathroomRatePerSqFt,
        extraAreaRatePerUnit: baselineValues.current.extraAreaRatePerUnit,
        standaloneRatePerUnit: baselineValues.current.standaloneRatePerUnit,
        dailyChemicalPerGallon: baselineValues.current.dailyChemicalPerGallon,
        note: initialData ? 'Edit mode: using loaded/saved values' : 'New document: using backend defaults'
      });

      // ✅ STEP 2: Detect overrides for yellow highlighting (edit mode only) - ONLY ONCE!
      if (initialData) {
        console.log('🔍 [MICROFIBER-PRICING] Detecting price overrides for yellow highlighting...');

        const initialDataTyped = initialData as any;

        // ✅ FIXED: Compare ALL rate fields against backend defaults
        const overrides = {
          customIncludedBathroomRate: (initialDataTyped.includedBathroomRate !== undefined &&
                                       initialDataTyped.includedBathroomRate !== (backendConfig.bathroomMoppingPricing?.flatPricePerBathroom ?? backendConfig.includedBathroomRate))
                                       ? initialDataTyped.includedBathroomRate : undefined,

          customHugeBathroomRatePerSqFt: (initialDataTyped.hugeBathroomRatePerSqFt !== undefined &&
                                          initialDataTyped.hugeBathroomRatePerSqFt !== (backendConfig.bathroomMoppingPricing?.hugeBathroomRate ?? backendConfig.hugeBathroomPricing?.ratePerSqFt))
                                          ? initialDataTyped.hugeBathroomRatePerSqFt : undefined,

          customExtraAreaRatePerUnit: (initialDataTyped.extraAreaRatePerUnit !== undefined &&
                                       initialDataTyped.extraAreaRatePerUnit !== (backendConfig.nonBathroomAddonAreas?.ratePerSqFtUnit ?? backendConfig.extraAreaPricing?.extraAreaRatePerUnit))
                                       ? initialDataTyped.extraAreaRatePerUnit : undefined,

          customStandaloneRatePerUnit: (initialDataTyped.standaloneRatePerUnit !== undefined &&
                                        initialDataTyped.standaloneRatePerUnit !== (backendConfig.standaloneMoppingPricing?.ratePerSqFtUnit ?? backendConfig.standalonePricing?.standaloneRatePerUnit))
                                        ? initialDataTyped.standaloneRatePerUnit : undefined,

          customDailyChemicalPerGallon: (initialDataTyped.dailyChemicalPerGallon !== undefined &&
                                         initialDataTyped.dailyChemicalPerGallon !== backendConfig.chemicalProducts?.dailyChemicalPerGallon)
                                         ? initialDataTyped.dailyChemicalPerGallon : undefined,
        };

        // Only set overrides that are actually different
        const hasAnyOverrides = Object.values(overrides).some(v => v !== undefined);

        if (hasAnyOverrides) {
          setForm(prev => ({
            ...prev,
            ...overrides, // Spread all override fields
          }));

          console.log('✅ [MICROFIBER-PRICING] Set custom override fields for yellow highlighting:',
            Object.fromEntries(
              Object.entries(overrides).filter(([_, value]) => value !== undefined)
            )
          );
        } else {
          console.log('ℹ️ [MICROFIBER-PRICING] No price overrides detected - using backend defaults');
        }
      }
    }
  }, [backendConfig, initialData]);

  // Also fetch when services context becomes available (but NOT in edit mode)
  useEffect(() => {
    // Skip if we have initialData (editing existing service)
    if (initialData) return;

    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

  // ✅ Sync global contract months to service (unless service has explicitly overridden it)
  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef(() => {
    const inputCount = form.bathroomCount + form.hugeBathroomSqFt +
                       form.extraAreaSqFt + form.standaloneSqFt + form.chemicalGallons;
    return inputCount > 0;
  });

  useEffect(() => {
    const inputCount = form.bathroomCount + form.hugeBathroomSqFt +
                       form.extraAreaSqFt + form.standaloneSqFt + form.chemicalGallons;
    const isServiceActive = inputCount > 0;
    const wasActive = wasActiveRef.current();
    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {
      // Service just became active - adopt global contract months
      console.log(`📅 [MICROFIBER-CONTRACT] Service just became active, adopting global contract months`);
      if (servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
        const globalMonths = servicesContext.globalContractMonths;
        console.log(`📅 [MICROFIBER-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({ ...prev, contractTermMonths: globalMonths }));
      }
    } else if (isServiceActive && servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
      // Service is already active - sync with global if it changes
      const globalMonths = servicesContext.globalContractMonths;
      if (form.contractTermMonths !== globalMonths) {
        console.log(`📅 [MICROFIBER-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({ ...prev, contractTermMonths: globalMonths }));
      }
    }

    // Update the ref for next render
    wasActiveRef.current = () => isServiceActive;
  }, [servicesContext?.globalContractMonths, form.contractTermMonths,
      form.bathroomCount, form.hugeBathroomSqFt, form.extraAreaSqFt,
      form.standaloneSqFt, form.chemicalGallons, servicesContext]);

  // ✅ Track when user manually changes contract months (this sets the override flag)
  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({ ...prev, contractTermMonths: months }));
    console.log(`📅 [MICROFIBER-CONTRACT] User override: ${months} months`);
  }, []);

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `microfiberMopping_${fieldName}`,
      productName: `Microfiber Mopping - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: (form.bathroomCount + form.hugeBathroomSqFt + form.extraAreaSqFt + form.standaloneSqFt) || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [MICROFIBER-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.frequency, form.bathroomCount, form.hugeBathroomSqFt, form.extraAreaSqFt, form.standaloneSqFt]);

  const onChange = (ev: InputChangeEvent) => {
    const target = ev.target as HTMLInputElement;
    const { name, type, value, checked } = target;

    setForm((prev) => {
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[name as keyof MicrofiberMoppingFormState];

      let nextValue: unknown = value;

      if (type === "checkbox") {
        nextValue = checked;
      } else if (
        // Handle custom override fields - allow clearing by setting to undefined
        name === "customIncludedBathroomRate" ||
        name === "customHugeBathroomRatePerSqFt" ||
        name === "customExtraAreaRatePerUnit" ||
        name === "customStandaloneRatePerUnit" ||
        name === "customDailyChemicalPerGallon" ||
        name === "customStandardBathroomTotal" ||
        name === "customHugeBathroomTotal" ||
        name === "customExtraAreaTotal" ||
        name === "customStandaloneTotal" ||
        name === "customChemicalTotal" ||
        name === "customPerVisitPrice" ||
        name === "customMonthlyRecurring" ||
        name === "customFirstMonthPrice" ||
        name === "customContractTotal"
      ) {
        if (value === '') {
          nextValue = undefined;
        } else {
          const numVal = parseFloat(value);
          if (!isNaN(numVal)) {
            nextValue = numVal;
          } else {
            return prev; // Don't update if invalid
          }
        }
      } else if (type === "number") {
        const raw = value.trim();
        if (raw === "") {
          nextValue = 0;
        } else {
          const num = Number(raw);
          nextValue = Number.isFinite(num) && num >= 0 ? num : 0;
        }
      }

      const next: MicrofiberMoppingFormState = {
        ...prev,
        [name]: nextValue as any,
      };

      // UX rule: huge bathroom path clears standard bathroom count
      if (name === "hugeBathroomSqFt") {
        const sq = Number(nextValue) || 0;
        if (sq > 0) {
          next.bathroomCount = 0;
          next.isHugeBathroom = true;
        } else if (sq === 0) {
          next.isHugeBathroom = false;
        }
      }

      if (name === "isHugeBathroom" && nextValue === true) {
        next.bathroomCount = 0;
      }

      // ✅ FIXED: Log ALL price changes for numeric pricing fields
      // Log changes to BASE editable fields (these are what the user actually types)
      const baseEditableFields = [
        'includedBathroomRate', 'hugeBathroomRatePerSqFt', 'extraAreaRatePerUnit',
        'standaloneRatePerUnit', 'dailyChemicalPerGallon'
      ];

      // ✅ CRITICAL: Log changes to CUSTOM RATE OVERRIDE fields (set by user editing in UI)
      const customRateOverrideFields = [
        'customIncludedBathroomRate', 'customHugeBathroomRatePerSqFt',
        'customExtraAreaRatePerUnit', 'customStandaloneRatePerUnit', 'customDailyChemicalPerGallon'
      ];

      // Log changes to CUSTOM TOTAL override fields (set programmatically)
      const customTotalOverrideFields = [
        'customStandardBathroomTotal', 'customHugeBathroomTotal', 'customExtraAreaTotal',
        'customStandaloneTotal', 'customChemicalTotal', 'customPerVisitPrice',
        'customMonthlyRecurring', 'customFirstMonthPrice', 'customContractTotal'
      ];

      const allPricingFields = [...baseEditableFields, ...customRateOverrideFields, ...customTotalOverrideFields];

      // ✅ EXPLICIT: Map custom field names to base field names for baseline lookup
      const customToBaseFieldMap: Record<string, string> = {
        'customIncludedBathroomRate': 'includedBathroomRate',
        'customHugeBathroomRatePerSqFt': 'hugeBathroomRatePerSqFt',
        'customExtraAreaRatePerUnit': 'extraAreaRatePerUnit',
        'customStandaloneRatePerUnit': 'standaloneRatePerUnit',
        'customDailyChemicalPerGallon': 'dailyChemicalPerGallon',
        'customStandardBathroomTotal': 'includedBathroomRate',
        'customHugeBathroomTotal': 'hugeBathroomRatePerSqFt',
        'customExtraAreaTotal': 'extraAreaRatePerUnit',
        'customStandaloneTotal': 'standaloneRatePerUnit',
        'customChemicalTotal': 'dailyChemicalPerGallon',
        'customPerVisitPrice': 'includedBathroomRate',
        'customMonthlyRecurring': 'includedBathroomRate',
        'customFirstMonthPrice': 'includedBathroomRate',
        'customContractTotal': 'includedBathroomRate',
      };

      if (allPricingFields.includes(name)) {
        const newValue = nextValue as number | undefined;
        const keyStr = name;

        // ✅ FIXED: Always use base field name for baseline lookup
        const baseFieldForLookup = customToBaseFieldMap[keyStr] || keyStr;
        const baselineValue = baselineValues.current[baseFieldForLookup];

        console.log(`🔍 [MICROFIBER-LOGGING] Field: ${keyStr}`, {
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
          console.log(`📝 [MICROFIBER-BASELINE-LOG] Logging change for ${keyStr}:`, {
            baseline: baselineValue,
            newValue,
            change: newValue - baselineValue,
            changePercent: ((newValue - baselineValue) / baselineValue * 100).toFixed(1) + '%'
          });
          addServiceFieldChange(keyStr, baselineValue, newValue);
        } else {
          console.log(`⚠️ [MICROFIBER-LOGGING] NOT logging for ${keyStr}:`, {
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
        'bathrooms', 'hugeSqFtPerBathroom', 'contractMonths',
        // Selection fields
        'frequency', 'rateTier'
      ];

      // Log non-pricing field changes
      if (allFormFields.includes(name)) {
        logServiceFieldChanges(
          'microfiberMopping',
          'Microfiber Mopping',
          { [name]: next[name as keyof MicrofiberMoppingFormState] },
          { [name]: originalValue },
          [name],
          next.bathrooms || 1,
          next.frequency || 'weekly'
        );
      }

      return next;
    });
  };

  const { calc, quote } = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    // Map NEW backend format to OLD format structure that calculations expect
    const activeConfig = {
      // Included bathroom rate: NEW bathroomMoppingPricing.flatPricePerBathroom OR OLD includedBathroomRate
      includedBathroomRate: backendConfig?.bathroomMoppingPricing?.flatPricePerBathroom ??
                            backendConfig?.includedBathroomRate ??
                            cfg.includedBathroomRate,

      // Huge bathroom pricing: NEW bathroomMoppingPricing OR OLD hugeBathroomPricing
      hugeBathroomPricing: {
        enabled: true, // Always enabled if backend config exists
        ratePerSqFt: backendConfig?.bathroomMoppingPricing?.hugeBathroomRate ??
                     backendConfig?.hugeBathroomPricing?.ratePerSqFt ??
                     cfg.hugeBathroomPricing.ratePerSqFt,
        sqFtUnit: backendConfig?.bathroomMoppingPricing?.hugeBathroomSqFtUnit ??
                  backendConfig?.hugeBathroomPricing?.sqFtUnit ??
                  cfg.hugeBathroomPricing.sqFtUnit,
        description: backendConfig?.hugeBathroomPricing?.description ?? cfg.hugeBathroomPricing.description,
      },

      // Extra area pricing: NEW nonBathroomAddonAreas OR OLD extraAreaPricing
      extraAreaPricing: {
        singleLargeAreaRate: backendConfig?.nonBathroomAddonAreas?.flatPriceSingleLargeArea ??
                             backendConfig?.extraAreaPricing?.singleLargeAreaRate ??
                             cfg.extraAreaPricing.singleLargeAreaRate,
        extraAreaSqFtUnit: backendConfig?.nonBathroomAddonAreas?.sqFtUnit ??
                           backendConfig?.extraAreaPricing?.extraAreaSqFtUnit ??
                           cfg.extraAreaPricing.extraAreaSqFtUnit,
        extraAreaRatePerUnit: backendConfig?.nonBathroomAddonAreas?.ratePerSqFtUnit ??
                              backendConfig?.extraAreaPricing?.extraAreaRatePerUnit ??
                              cfg.extraAreaPricing.extraAreaRatePerUnit,
        useHigherRate: backendConfig?.nonBathroomAddonAreas?.useHigherRate ??
                       backendConfig?.extraAreaPricing?.useHigherRate ??
                       cfg.extraAreaPricing.useHigherRate,
      },

      // Standalone pricing: NEW standaloneMoppingPricing OR OLD standalonePricing
      standalonePricing: {
        standaloneSqFtUnit: backendConfig?.standaloneMoppingPricing?.sqFtUnit ??
                            backendConfig?.standalonePricing?.standaloneSqFtUnit ??
                            cfg.standalonePricing.standaloneSqFtUnit,
        standaloneRatePerUnit: backendConfig?.standaloneMoppingPricing?.ratePerSqFtUnit ??
                               backendConfig?.standalonePricing?.standaloneRatePerUnit ??
                               cfg.standalonePricing.standaloneRatePerUnit,
        standaloneMinimum: backendConfig?.standaloneMoppingPricing?.minimumPrice ??
                           backendConfig?.minimumChargePerVisit ??
                           backendConfig?.standalonePricing?.standaloneMinimum ??
                           cfg.standalonePricing.standaloneMinimum,
        includeTripCharge: backendConfig?.standaloneMoppingPricing?.includeTripCharge ??
                           backendConfig?.standalonePricing?.includeTripCharge ??
                           cfg.standalonePricing.includeTripCharge,
      },

      // Chemical products: OLD format only
      chemicalProducts: backendConfig?.chemicalProducts ?? cfg.chemicalProducts,

      // Billing conversions: use existing billingConversions (already converted from frequencyMetadata)
      billingConversions: backendConfig?.billingConversions ?? cfg.billingConversions,

      // Rate categories
      rateCategories: backendConfig?.rateCategories ?? cfg.rateCategories,

      // Frequency settings
      defaultFrequency: backendConfig?.defaultFrequency ?? cfg.defaultFrequency,
      allowedFrequencies: backendConfig?.allowedFrequencies ?? cfg.allowedFrequencies,

      // Minimum charge per visit (for redline/greenline pricing)
      minimumChargePerVisit: backendConfig?.minimumChargePerVisit ?? cfg.minimumChargePerVisit,
    };

    const freq: MicrofiberFrequencyKey = mapFrequency(form.frequency ?? activeConfig.defaultFrequency);

    // ✅ BILLING CONVERSION FROM BACKEND (NOT HARDCODED!)
    const conv = activeConfig.billingConversions[freq] || activeConfig.billingConversions.weekly;

    // ========== EFFECTIVE VALUES (use custom overrides if set, otherwise base values) ==========
    const effectiveIncludedBathroomRate = form.customIncludedBathroomRate ?? form.includedBathroomRate;
    const effectiveHugeBathroomRatePerSqFt = form.customHugeBathroomRatePerSqFt ?? form.hugeBathroomRatePerSqFt;
    const effectiveExtraAreaRatePerUnit = form.customExtraAreaRatePerUnit ?? form.extraAreaRatePerUnit;
    const effectiveStandaloneRatePerUnit = form.customStandaloneRatePerUnit ?? form.standaloneRatePerUnit;
    const effectiveDailyChemicalPerGallon = form.customDailyChemicalPerGallon ?? form.dailyChemicalPerGallon;

    console.log('🔧 [MICROFIBER-CALC] Using effective values:', {
      effectiveIncludedBathroomRate,
      effectiveHugeBathroomRatePerSqFt,
      effectiveExtraAreaRatePerUnit,
      effectiveStandaloneRatePerUnit,
      effectiveDailyChemicalPerGallon,
    });

    const { actualWeeksPerYear, actualWeeksPerMonth } = activeConfig.billingConversions;
    const isAllInclusive = !!form.isAllInclusive;

    // ✅ EARLY RETURN: If service is inactive (no inputs), return $0 for everything
    const bathroomCount = Number(form.bathroomCount) || 0;
    const hugeBathroomSqFt = Number(form.hugeBathroomSqFt) || 0;
    const extraAreaSqFt = Number(form.extraAreaSqFt) || 0;
    const standaloneSqFt = Number(form.standaloneSqFt) || 0;
    const chemicalGallons = Number(form.chemicalGallons) || 0;

    const isServiceInactive = bathroomCount === 0 && hugeBathroomSqFt === 0 &&
                              extraAreaSqFt === 0 && standaloneSqFt === 0 &&
                              chemicalGallons === 0;

    if (isServiceInactive) {
      console.log('📊 [Microfiber Mopping] Service is inactive (no inputs), returning $0 totals');
      return {
        calc: {
          bathroomPrice: 0,
          extraAreaPrice: 0,
          standaloneTotal: 0,
          chemicalSupplyMonthly: 0,
          perVisitPrice: 0,
          monthlyRecurring: 0,
          firstMonthPrice: 0,
          contractTotal: 0,
          minimumChargePerVisit: 0,
          isVisitBasedFrequency: false,
          monthsPerVisit: 1,
        },
        quote: {
          serviceId: "microfiberMopping",
          displayName: "Microfiber Mopping",
          perVisit: 0,
          monthly: 0,
          annual: 0,
        },
      };
    }

    // ----------------------------
    // 1) Bathrooms (included with Sani) - BASE CALCULATIONS
    // ----------------------------
    let calculatedStandardBathroomPrice = 0;
    let calculatedHugeBathroomPrice = 0;

    if (!isAllInclusive && form.hasExistingSaniService) {
      const standardBathCount = Math.max(0, Number(form.bathroomCount) || 0);

      // Standard bathrooms: use effective rate (custom override if set)
      if (standardBathCount > 0) {
        calculatedStandardBathroomPrice =
          standardBathCount * effectiveIncludedBathroomRate;  // ✅ USE EFFECTIVE VALUE
      }

      // Huge bathroom: use editable rate per sq ft
      const hugeSqFt = Math.max(0, Number(form.hugeBathroomSqFt) || 0);
      if (
        form.isHugeBathroom &&
        activeConfig.hugeBathroomPricing.enabled &&  // ✅ FROM BACKEND
        hugeSqFt > 0
      ) {
        const units = Math.ceil(
          hugeSqFt / activeConfig.hugeBathroomPricing.sqFtUnit  // ✅ FROM BACKEND
        );
        calculatedHugeBathroomPrice =
          units * effectiveHugeBathroomRatePerSqFt;  // ✅ USE EFFECTIVE VALUE
      }
    }

    // Use custom overrides if set, otherwise use calculated
    const standardBathroomPrice = form.customStandardBathroomTotal !== undefined
      ? form.customStandardBathroomTotal
      : calculatedStandardBathroomPrice;

    const hugeBathroomPrice = form.customHugeBathroomTotal !== undefined
      ? form.customHugeBathroomTotal
      : calculatedHugeBathroomPrice;

    const bathroomPrice = standardBathroomPrice + hugeBathroomPrice;

    // ----------------------------
    // 2) Extra non-bath area - BASE CALCULATIONS with exact vs direct pricing (like SaniScrub)
    // NEW: Support exact calculation vs direct calculation like SaniScrub
    // ----------------------------
    let calculatedExtraAreaPrice = 0;

    if (!isAllInclusive && form.extraAreaSqFt > 0) {
      const unitSqFt = activeConfig.extraAreaPricing.extraAreaSqFtUnit; // ✅ FROM BACKEND (400)
      const firstUnitRate = activeConfig.extraAreaPricing.singleLargeAreaRate; // ✅ FROM BACKEND ($100)
      const additionalUnitRate = effectiveExtraAreaRatePerUnit;  // ✅ USE EFFECTIVE VALUE ($10 per 400 sq ft)

      if (form.useExactExtraAreaSqft) {
        // ✅ EXACT CALCULATION with step-down pricing model using backend values
        // Step-down model: minimum up to threshold, then recalculate using per-unit pricing

        // Calculate threshold: how many sq ft does the minimum cover?
        const unitsInMinimum = Math.floor(firstUnitRate / additionalUnitRate); // e.g., $100 ÷ $10 = 10 units
        const minimumCoverageSqFt = unitsInMinimum * unitSqFt; // e.g., 10 × 400 = 4000 sqft

        if (form.extraAreaSqFt <= minimumCoverageSqFt) {
          // ≤ minimum coverage: Use minimum rate
          calculatedExtraAreaPrice = firstUnitRate;
        } else {
          // > minimum coverage: Use per-unit pricing for ALL units (step-down model)
          // Instead of minimum + extra, calculate total units × rate
          const totalUnits = Math.ceil(form.extraAreaSqFt / unitSqFt);
          calculatedExtraAreaPrice = totalUnits * additionalUnitRate;
        }
      } else {
        // ✅ DIRECT CALCULATION: Calculate minimum coverage first, then exact additional sqft
        const minimumUnits = Math.floor(firstUnitRate / additionalUnitRate); // $100 ÷ $10 = 10 units
        const minimumCoverageSqFt = minimumUnits * unitSqFt; // 10 × 400 = 4000 sqft

        if (form.extraAreaSqFt <= minimumCoverageSqFt) {
          // ≤ 4000 sq ft: Always $100 minimum
          calculatedExtraAreaPrice = firstUnitRate;
        } else {
          // > 4000 sq ft: $100 minimum + exact additional sq ft × rate
          const extraSqFt = form.extraAreaSqFt - minimumCoverageSqFt; // sq ft over 4000
          const ratePerSqFt = additionalUnitRate / unitSqFt; // $10/400 = $0.025
          calculatedExtraAreaPrice = firstUnitRate + (extraSqFt * ratePerSqFt);
        }
      }

      // Apply useHigherRate rule if configured (but usually not needed with this logic)
      if (activeConfig.extraAreaPricing.useHigherRate) {
        calculatedExtraAreaPrice = Math.max(calculatedExtraAreaPrice, firstUnitRate);
      }
    }

    // Use custom override if set
    const extraAreaPrice = form.customExtraAreaTotal !== undefined
      ? form.customExtraAreaTotal
      : calculatedExtraAreaPrice;

    // ----------------------------
    // 3) Stand-alone microfiber mopping - BASE CALCULATIONS with exact vs direct pricing (like SaniScrub)
    // NEW: Support exact calculation vs direct calculation like SaniScrub
    // ----------------------------
    let calculatedStandaloneServicePrice = 0;
    let standaloneTripCharge = 0;
    let calculatedStandaloneTotal = 0;

    if (!isAllInclusive && form.standaloneSqFt > 0) {
      const unitSqFt = activeConfig.standalonePricing.standaloneSqFtUnit; // ✅ FROM BACKEND (200)
      const minimumRate = activeConfig.standalonePricing.standaloneMinimum; // ✅ FROM BACKEND ($40)
      const additionalUnitRate = effectiveStandaloneRatePerUnit;  // ✅ USE EFFECTIVE VALUE ($10 per 200 sq ft)

      if (form.useExactStandaloneSqft) {
        // ✅ EXACT CALCULATION with step-down pricing model using backend values
        // Step-down model: minimum up to threshold, then recalculate using per-unit pricing

        // Calculate threshold: how many sq ft does the minimum cover?
        // Based on the pattern: minimum covers X units worth of area, then switch to per-unit pricing
        const unitsInMinimum = Math.floor(minimumRate / additionalUnitRate); // e.g., $40 ÷ $10 = 4 units
        const minimumCoverageSqFt = unitsInMinimum * unitSqFt; // e.g., 4 × 200 = 800 sqft

        if (form.standaloneSqFt <= minimumCoverageSqFt) {
          // ≤ minimum coverage: Use minimum rate
          calculatedStandaloneServicePrice = minimumRate;
        } else {
          // > minimum coverage: Use per-unit pricing for ALL units (step-down model)
          // Instead of minimum + extra, calculate total units × rate
          const totalUnits = Math.ceil(form.standaloneSqFt / unitSqFt);
          calculatedStandaloneServicePrice = totalUnits * additionalUnitRate;
        }
      } else {
        // ✅ DIRECT CALCULATION: Calculate minimum coverage first, then exact additional sqft
        const minimumUnits = Math.floor(minimumRate / additionalUnitRate); // e.g., $40 ÷ $10 = 4 units
        const minimumCoverageSqFt = minimumUnits * unitSqFt; // e.g., 4 × 200 = 800 sqft

        if (form.standaloneSqFt <= minimumCoverageSqFt) {
          // ≤ 800 sq ft: Always $40 minimum
          calculatedStandaloneServicePrice = minimumRate;
        } else {
          // > 800 sq ft: $40 minimum + exact additional sq ft × rate
          const extraSqFt = form.standaloneSqFt - minimumCoverageSqFt; // sq ft over 800
          const ratePerSqFt = additionalUnitRate / unitSqFt; // $10/200 = $0.05
          calculatedStandaloneServicePrice = minimumRate + (extraSqFt * ratePerSqFt);
        }
      }

      // Trip charge concept removed → always 0 in calculations
      standaloneTripCharge = 0;
      calculatedStandaloneTotal = calculatedStandaloneServicePrice;
    }

    // Use custom override if set
    const standaloneServicePrice = form.customStandaloneTotal !== undefined
      ? form.customStandaloneTotal
      : calculatedStandaloneServicePrice;

    const standaloneTotal = standaloneServicePrice;

    // ----------------------------
    // 4) Chemical supply (customer self-mopping) - BASE CALCULATIONS
    // Rule: use effective rate per gallon (custom override if set) – per month.
    // ----------------------------
    const calculatedChemicalSupplyMonthly =
      form.chemicalGallons > 0
        ? form.chemicalGallons * effectiveDailyChemicalPerGallon  // ✅ USE EFFECTIVE VALUE
        : 0;

    // Use custom override if set
    const chemicalSupplyMonthly = form.customChemicalTotal !== undefined
      ? form.customChemicalTotal
      : calculatedChemicalSupplyMonthly;

    // ----------------------------
    // 5) Per-visit total - BASE CALCULATIONS
    // ----------------------------
    const calculatedPerVisitServiceTotal =
      bathroomPrice + extraAreaPrice + standaloneTotal;

    // ✅ Apply minimum charge per visit from activeConfig (backend or fallback)
    const minimumChargePerVisit = activeConfig.minimumChargePerVisit;
    const calculatedPerVisitWithMinimum = Math.max(calculatedPerVisitServiceTotal, minimumChargePerVisit);

    // Use custom override if set
    const perVisitPrice = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : calculatedPerVisitWithMinimum;

    // ----------------------------
    // 6) Monthly (4.33 weeks logic) and contract - BASE CALCULATIONS
    // ✅ Support all 9 frequencies with visit-based logic
    // ----------------------------
    // Determine if frequency is visit-based (not monthly billing)
    const isVisitBasedFrequency = freq === "oneTime" || freq === "quarterly" ||
      freq === "biannual" || freq === "annual" || freq === "bimonthly";

    const monthlyVisits = conv.monthlyMultiplier; // e.g., 4.33 for weekly, 0 for quarterly
    const calculatedMonthlyService = perVisitPrice * monthlyVisits;
    const calculatedMonthlyRecurring = calculatedMonthlyService + chemicalSupplyMonthly;

    // Use custom override if set
    const monthlyRecurring = form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : calculatedMonthlyRecurring;

    // First visit / first month rules
    // For Microfiber we don't have a separate installation fee,
    // so installFee is treated as 0 here.
    const installFee = 0;
    const firstVisitPrice = installFee; // install-only, but 0 in this service

    // First month calculation varies by frequency type
    let calculatedFirstMonthPrice = 0;
    if (isVisitBasedFrequency) {
      // For oneTime, quarterly, biannual, annual, bimonthly: just the first visit (service only, no install)
      calculatedFirstMonthPrice = perVisitPrice;
    } else {
      // For weekly, biweekly, twicePerMonth, monthly: (monthlyVisits) × normal service price + chemical
      const calculatedFirstMonthService = Math.max(monthlyVisits, 0) * perVisitPrice;
      calculatedFirstMonthPrice = firstVisitPrice + calculatedFirstMonthService + chemicalSupplyMonthly;
    }

    // Use custom override if set
    const firstMonthPrice = form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthPrice;

    // Contract term (2–36 months)
    let contractMonths = Number(form.contractTermMonths) || 0;
    if (contractMonths < 2) contractMonths = 2;
    if (contractMonths > 36) contractMonths = 36;

    // Contract total calculation
    let calculatedContractTotal = 0;
    if (freq === "oneTime") {
      // ✅ For oneTime: just the first visit (no recurring billing)
      calculatedContractTotal = firstMonthPrice;
    } else if (isVisitBasedFrequency) {
      // ✅ For quarterly, biannual, annual, bimonthly: use annual multipliers
      const visitsPerYear = conv.annualMultiplier ?? 1;
      const totalVisits = (contractMonths / 12) * visitsPerYear;

      // All visits are service visits (no install in microfiber)
      calculatedContractTotal = totalVisits * perVisitPrice + (contractMonths * (chemicalSupplyMonthly / monthlyVisits || 0));
    } else {
      // For weekly, biweekly, twicePerMonth, monthly: use monthly-based calculation
      const remainingMonths = Math.max(contractMonths - 1, 0);
      calculatedContractTotal = firstMonthPrice + remainingMonths * monthlyRecurring;
    }

    // Use custom override if set
    const contractTotal = form.customContractTotal !== undefined
      ? form.customContractTotal
      : calculatedContractTotal;

    // ✅ NEW: Add calc field totals AND dollar field totals directly to contract (no frequency dependency)
    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

    console.log(`📊 [MICROFIBER-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotal.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });

    // ----------------------------
    // 7) Annual + weekly approximations (not main focus now)
    // ----------------------------
    const annualPrice = monthlyRecurring * 12;

    const weeklyServiceTotal =
      calculatedMonthlyService / (actualWeeksPerMonth || 4.33);
    const weeklyTotalWithChemicals =
      annualPrice / actualWeeksPerYear;

    const calc: MicrofiberMoppingCalcResult = {
      standardBathroomPrice,
      hugeBathroomPrice,
      bathroomPrice,
      extraAreaPrice,
      standaloneServicePrice,
      standaloneTripCharge,
      standaloneTotal,
      chemicalSupplyMonthly,
      weeklyServiceTotal,
      weeklyTotalWithChemicals,
      perVisitPrice,
      annualPrice,
      monthlyRecurring,
      firstVisitPrice,
      firstMonthPrice,
      contractMonths,
      contractTotal: contractTotalWithCustomFields,  // ✅ UPDATED: Use contract total with custom fields
      minimumChargePerVisit,
    };

    const quote: ServiceQuoteResult = {
      ...(calc as any),
      serviceId: (form as any).serviceId ?? cfg.serviceType,
      serviceKey: "microfiberMopping",
      serviceLabel: "Microfiber Mopping",
      frequency: freq,
      perVisit: perVisitPrice,
      monthly: monthlyRecurring,
    } as unknown as ServiceQuoteResult;

    return { calc, quote };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form,
    // ✅ NEW: Re-calculate when custom fields change
    calcFieldsTotal,
    dollarFieldsTotal,
    // ✅ CRITICAL: Custom RATE override fields (must be in dependencies for calculations to update!)
    form.customIncludedBathroomRate,
    form.customHugeBathroomRatePerSqFt,
    form.customExtraAreaRatePerUnit,
    form.customStandaloneRatePerUnit,
    form.customDailyChemicalPerGallon,
  ]);

  return {
    form,
    setForm,
    onChange,
    quote,
    calc,
    refreshConfig: () => fetchPricing(true), // ✅ FIXED: Force refresh when button clicked
    isLoadingConfig,
    // ✅ EXPOSE: Backend config for dynamic pricing text
    activeConfig: {
      extraAreaPricing: {
        singleLargeAreaRate: backendConfig?.nonBathroomAddonAreas?.flatPriceSingleLargeArea ??
                             backendConfig?.extraAreaPricing?.singleLargeAreaRate ??
                             cfg.extraAreaPricing.singleLargeAreaRate,
        extraAreaSqFtUnit: backendConfig?.nonBathroomAddonAreas?.sqFtUnit ??
                           backendConfig?.extraAreaPricing?.extraAreaSqFtUnit ??
                           cfg.extraAreaPricing.extraAreaSqFtUnit,
      },
      standalonePricing: {
        standaloneSqFtUnit: backendConfig?.standaloneMoppingPricing?.sqFtUnit ??
                            backendConfig?.standalonePricing?.standaloneSqFtUnit ??
                            cfg.standalonePricing.standaloneSqFtUnit,
        standaloneMinimum: backendConfig?.standaloneMoppingPricing?.minimumPrice ??
                           backendConfig?.minimumChargePerVisit ??
                           backendConfig?.standalonePricing?.standaloneMinimum ??
                           cfg.standalonePricing.standaloneMinimum,
      },
    },
    setContractMonths, // ✅ NEW: Contract months with override support
  };
}

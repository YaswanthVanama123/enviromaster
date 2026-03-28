import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type { SaniscrubFormState, SaniscrubFrequency } from "./saniscrubTypes";
import {
  saniscrubPricingConfig as cfg,
  saniscrubFrequencyList,
} from "./saniscrubConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";

// ✅ Backend config interface matching the ACTUAL MongoDB JSON structure
interface BackendSaniscrubConfig {
  tripCharges: {
    standard: number;
    beltway: number;
  };
  parkingFeeAddOn: number;
  monthlyPricing: {
    pricePerFixture: number;
    minimumPrice: number;
  };
  bimonthlyPricing: {
    pricePerFixture: number;
    minimumPrice: number;
  };
  quarterlyPricing: {
    pricePerFixture: number;
    minimumPrice: number;
  };
  twicePerMonthPricing: {
    discountFromMonthlyRate: number;
  };
  nonBathroomSqFtPricingRule: {
    sqFtBlockUnit: number;
    priceFirstBlock: number;
    priceAdditionalBlock: number;
  };
  installationPricing: {
    installMultiplierDirtyOrFirstTime: number;
    allowInstallFeeWaiver: boolean;
  };
  frequencyMetadata: {
    weekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    biweekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    monthly?: { cycleMonths: number };
    bimonthly?: { cycleMonths: number };
    quarterly?: { cycleMonths: number };
    biannual?: { cycleMonths: number };
    annual?: { cycleMonths: number };
  };
}

const DEFAULT_FORM: SaniscrubFormState = {
  serviceId: "saniscrub",
  fixtureCount: 0,
  nonBathroomSqFt: 0,
  useExactNonBathroomSqft: true, // ✅ Default to exact calculation
  frequency: "monthly",
  hasSaniClean: true,
  location: "insideBeltway",
  needsParking: false,
  tripChargeIncluded: true, // still in BaseServiceFormState, but ignored now
  includeInstall: false,
  isDirtyInstall: false,
  notes: "",
  contractMonths: 12, // default contract term

  // ✅ NEW: Editable pricing rates from config (will be overridden by backend)
  fixtureRateMonthly: cfg.fixtureRates.monthly,
  fixtureRateBimonthly: cfg.fixtureRates.bimonthly,
  fixtureRateQuarterly: cfg.fixtureRates.quarterly,
  minimumMonthly: cfg.minimums.monthly,
  minimumBimonthly: cfg.minimums.bimonthly,
  nonBathroomFirstUnitRate: cfg.nonBathroomFirstUnitRate,
  nonBathroomAdditionalUnitRate: cfg.nonBathroomAdditionalUnitRate,
  installMultiplierDirty: cfg.installMultipliers.dirty,
  installMultiplierClean: cfg.installMultipliers.clean,
  twoTimesPerMonthDiscount: cfg.twoTimesPerMonthDiscountFlat,
  applyMinimum: true,
};

function clampFrequency(f: string): SaniscrubFrequency {
  return saniscrubFrequencyList.includes(f as SaniscrubFrequency)
    ? (f as SaniscrubFrequency)
    : "monthly";
}

function clampContractMonths(value: unknown): number {
  const num = parseInt(String(value), 10);
  if (!Number.isFinite(num)) return 12;
  if (num < 2) return 2;
  if (num > 36) return 36;
  return num;
}

/**
 * ✅ NEW: Build active config directly from backend structure
 * Maps the MongoDB JSON structure to calculation-friendly format
 */
function buildActiveConfig(backendConfig: BackendSaniscrubConfig | null) {
  // Default values from static config
  const defaults = {
    fixtureRates: cfg.fixtureRates || {
      monthly: 25,
      bimonthly: 35,
      quarterly: 40
    },
    minimums: cfg.minimums || {
      monthly: 125,
      bimonthly: 175,
      quarterly: 200
    },
    nonBathroomFirstUnitRate: cfg.nonBathroomFirstUnitRate || 250,
    nonBathroomAdditionalUnitRate: cfg.nonBathroomAdditionalUnitRate || 125,
    nonBathroomUnitSqFt: cfg.nonBathroomUnitSqFt || 500,
    installMultipliers: cfg.installMultipliers || {
      dirty: 3,
      clean: 1
    },
    twoTimesPerMonthDiscountFlat: cfg.twoTimesPerMonthDiscountFlat || 50,
    tripCharges: cfg.tripCharges || { standard: 0, beltway: 0 },
    parkingFee: cfg.parkingFee || 5
  };

  if (!backendConfig) {
    console.log('📊 [SaniScrub] Using static config fallback values');
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

  console.log('📊 [SaniScrub] Building active config from backend:', backendConfig);

  // ✅ Extract values directly from the MongoDB JSON structure
  const activeConfig = {
    // Fixture pricing from nested structure
    fixtureRates: {
      monthly: backendConfig.monthlyPricing?.pricePerFixture ?? defaults.fixtureRates.monthly,
      bimonthly: backendConfig.bimonthlyPricing?.pricePerFixture ?? defaults.fixtureRates.bimonthly,
      quarterly: backendConfig.quarterlyPricing?.pricePerFixture ?? defaults.fixtureRates.quarterly,
    },

    // Minimum charges from nested structure
    minimums: {
      monthly: backendConfig.monthlyPricing?.minimumPrice ?? defaults.minimums.monthly,
      bimonthly: backendConfig.bimonthlyPricing?.minimumPrice ?? defaults.minimums.bimonthly,
      quarterly: backendConfig.quarterlyPricing?.minimumPrice ?? defaults.minimums.quarterly,
    },

    // Non-bathroom area pricing from nested structure
    nonBathroomFirstUnitRate: backendConfig.nonBathroomSqFtPricingRule?.priceFirstBlock ?? defaults.nonBathroomFirstUnitRate,
    nonBathroomAdditionalUnitRate: backendConfig.nonBathroomSqFtPricingRule?.priceAdditionalBlock ?? defaults.nonBathroomAdditionalUnitRate,
    nonBathroomUnitSqFt: backendConfig.nonBathroomSqFtPricingRule?.sqFtBlockUnit ?? defaults.nonBathroomUnitSqFt,

    // Installation pricing from nested structure
    installMultipliers: {
      dirty: backendConfig.installationPricing?.installMultiplierDirtyOrFirstTime ?? defaults.installMultipliers.dirty,
      clean: 1, // Clean install is always 1x (not in backend, hardcoded)
    },

    // Twice per month discount from nested structure
    twoTimesPerMonthDiscountFlat: backendConfig.twicePerMonthPricing?.discountFromMonthlyRate ?? defaults.twoTimesPerMonthDiscountFlat,

    // Trip charges and parking from top-level config
    tripCharges: backendConfig.tripCharges ?? defaults.tripCharges,
    parkingFee: backendConfig.parkingFeeAddOn ?? defaults.parkingFee,

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

  console.log('✅ [SaniScrub] Active config built:', {
    fixtureRates: activeConfig.fixtureRates,
    minimums: activeConfig.minimums,
    nonBathroomPricing: {
      firstBlock: activeConfig.nonBathroomFirstUnitRate,
      additionalBlock: activeConfig.nonBathroomAdditionalUnitRate,
      blockSize: activeConfig.nonBathroomUnitSqFt,
    },
    installMultipliers: activeConfig.installMultipliers,
    twoTimesPerMonthDiscount: activeConfig.twoTimesPerMonthDiscountFlat,
    frequencyMultipliers: activeConfig.frequencyMultipliers,
    annualFrequencies: activeConfig.annualFrequencies,
  });

  return activeConfig;
}

export function useSaniscrubCalc(initial?: Partial<SaniscrubFormState>, customFields?: any[]) {
  // Get services context for fallback pricing data AND global contract months
  const servicesContext = useServicesContextOptional();
  const isEditMode = useRef(!!initial);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);

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

    console.log(`💰 [SANISCRUB-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [SANISCRUB-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [form, setForm] = useState<SaniscrubFormState>(() => {
    // ✅ Calculate if service is initially active (has fixtures)
    const initialFixtureCount = initial?.fixtureCount || 0;
    const isInitiallyActive = initialFixtureCount > 0;

    // ✅ Only use global contract months if service starts active AND no initial value provided
    const defaultContractMonths = initial?.contractMonths
      ? initial.contractMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : DEFAULT_FORM.contractMonths;

    console.log(`📅 [SANISCRUB-INIT] Initializing contract months:`, {
      initialFixtureCount,
      isInitiallyActive,
      globalContractMonths: servicesContext?.globalContractMonths,
      defaultContractMonths,
      hasInitialValue: !!initial?.contractMonths
    });

    return {
      ...DEFAULT_FORM,
      ...initial,
      contractMonths: defaultContractMonths,
    };
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendSaniscrubConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const backendActiveConfig = useMemo(() => buildActiveConfig(backendConfig), [backendConfig]);

  // Helper function to update form with config data from the actual backend structure
  const updateFormWithConfig = (activeConfig: any, forceUpdate: boolean = false) => {
    if (isEditMode.current && !forceUpdate) {
      console.log('ÐY"< [SANISCRUB] Edit mode: skipping auto-overwrite from backend');
      return;
    }

    setForm((prev) => ({
      ...prev,
      // ✅ Extract from active config (built from MongoDB structure)
      fixtureRateMonthly: activeConfig.fixtureRates?.monthly ?? prev.fixtureRateMonthly,
      fixtureRateBimonthly: activeConfig.fixtureRates?.bimonthly ?? prev.fixtureRateBimonthly,
      fixtureRateQuarterly: activeConfig.fixtureRates?.quarterly ?? prev.fixtureRateQuarterly,
      minimumMonthly: activeConfig.minimums?.monthly ?? prev.minimumMonthly,
      minimumBimonthly: activeConfig.minimums?.bimonthly ?? prev.minimumBimonthly,
      nonBathroomFirstUnitRate: activeConfig.nonBathroomFirstUnitRate ?? prev.nonBathroomFirstUnitRate,
      nonBathroomAdditionalUnitRate: activeConfig.nonBathroomAdditionalUnitRate ?? prev.nonBathroomAdditionalUnitRate,
      installMultiplierDirty: activeConfig.installMultipliers?.dirty ?? prev.installMultiplierDirty,
      installMultiplierClean: activeConfig.installMultipliers?.clean ?? prev.installMultiplierClean,
      twoTimesPerMonthDiscount: activeConfig.twoTimesPerMonthDiscountFlat ?? prev.twoTimesPerMonthDiscount,
      ...(forceUpdate ? {
        customInstallationFee: undefined,
        customPerVisitPrice: undefined,
        customMonthlyRecurring: undefined,
        customFirstMonthPrice: undefined,
        customContractTotal: undefined,
      } : {}),
    }));

    console.log('✅ [SaniScrub] Form updated with backend config values:', {
      monthlyRate: activeConfig.fixtureRates?.monthly,
      bimonthlyRate: activeConfig.fixtureRates?.bimonthly,
      quarterlyRate: activeConfig.fixtureRates?.quarterly,
      monthlyMinimum: activeConfig.minimums?.monthly,
      bimonthlyMinimum: activeConfig.minimums?.bimonthly,
      nonBathroomFirstBlock: activeConfig.nonBathroomFirstUnitRate,
      nonBathroomAdditionalBlock: activeConfig.nonBathroomAdditionalUnitRate,
      installMultiplierDirty: activeConfig.installMultipliers?.dirty,
      twicePerMonthDiscount: activeConfig.twoTimesPerMonthDiscountFlat,
    });
  };

  // ⚡ OPTIMIZED: Fetch pricing config from context (NO API call)
  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {
      // ⚡ Use context's backend pricing data directly (already loaded by useAllServicePricing)
      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("saniscrub");
        if (backendData?.config) {
          console.log('✅ [SaniScrub] Using cached pricing data from context');
          const config = backendData.config as BackendSaniscrubConfig;

          // ✅ Build active config from backend structure
          const activeConfig = buildActiveConfig(config);

          setBackendConfig(config);
          updateFormWithConfig(activeConfig, forceRefresh);

          console.log('✅ SaniScrub CONFIG loaded from context:', {
            monthlyPricing: config.monthlyPricing,
            bimonthlyPricing: config.bimonthlyPricing,
            quarterlyPricing: config.quarterlyPricing,
            nonBathroomSqFtPricingRule: config.nonBathroomSqFtPricingRule,
            installationPricing: config.installationPricing,
            tripCharges: config.tripCharges,
            frequencyMetadata: config.frequencyMetadata,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for SaniScrub, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch SaniScrub config from context:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("saniscrub");
        if (fallbackConfig?.config) {
          console.log('✅ [SaniScrub] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendSaniscrubConfig;

          // ✅ Build active config from backend structure
          const activeConfig = buildActiveConfig(config);

          setBackendConfig(config);
          updateFormWithConfig(activeConfig, forceRefresh);

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // �o. Fetch pricing configuration on mount (used for baseline/override detection)
  useEffect(() => {
    console.log('�Y"< [SANISCRUB-PRICING] Fetching backend prices for baseline/override detection');
    fetchPricing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also fetch when services context becomes available (for fallback pricing)
  useEffect(() => {
    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing(false);
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

  useEffect(() => {
    if (baselineInitialized.current) return;
    if (!backendConfig) return;

    baselineInitialized.current = true;
    baselineValues.current = {
      fixtureRateMonthly: initial?.fixtureRateMonthly ?? backendActiveConfig.fixtureRates?.monthly,
      fixtureRateBimonthly: initial?.fixtureRateBimonthly ?? backendActiveConfig.fixtureRates?.bimonthly,
      fixtureRateQuarterly: initial?.fixtureRateQuarterly ?? backendActiveConfig.fixtureRates?.quarterly,
      minimumMonthly: initial?.minimumMonthly ?? backendActiveConfig.minimums?.monthly,
      minimumBimonthly: initial?.minimumBimonthly ?? backendActiveConfig.minimums?.bimonthly,
      nonBathroomFirstUnitRate: initial?.nonBathroomFirstUnitRate ?? backendActiveConfig.nonBathroomFirstUnitRate,
      nonBathroomAdditionalUnitRate: initial?.nonBathroomAdditionalUnitRate ?? backendActiveConfig.nonBathroomAdditionalUnitRate,
      installMultiplierDirty: initial?.installMultiplierDirty ?? backendActiveConfig.installMultipliers?.dirty,
      installMultiplierClean: initial?.installMultiplierClean ?? backendActiveConfig.installMultipliers?.clean,
      twoTimesPerMonthDiscount: initial?.twoTimesPerMonthDiscount ?? backendActiveConfig.twoTimesPerMonthDiscountFlat,
    };

    console.log('�o. [SANISCRUB-BASELINE] Initialized baseline values for logging/highlighting:', baselineValues.current);
  }, [backendActiveConfig, initial]);

  const pricingOverrides = useMemo(() => {
    const cfg = backendActiveConfig;
    if (!cfg) return {};

    const isOverride = (current: number | undefined, baseline: number | undefined) =>
      Number(current ?? 0) !== Number(baseline ?? 0);

    return {
      fixtureRateMonthly: isOverride(form.fixtureRateMonthly, cfg.fixtureRates?.monthly),
      fixtureRateBimonthly: isOverride(form.fixtureRateBimonthly, cfg.fixtureRates?.bimonthly),
      fixtureRateQuarterly: isOverride(form.fixtureRateQuarterly, cfg.fixtureRates?.quarterly),
      minimumMonthly: isOverride(form.minimumMonthly, cfg.minimums?.monthly),
      minimumBimonthly: isOverride(form.minimumBimonthly, cfg.minimums?.bimonthly),
      nonBathroomFirstUnitRate: isOverride(form.nonBathroomFirstUnitRate, cfg.nonBathroomFirstUnitRate),
      nonBathroomAdditionalUnitRate: isOverride(form.nonBathroomAdditionalUnitRate, cfg.nonBathroomAdditionalUnitRate),
      installMultiplierDirty: isOverride(form.installMultiplierDirty, cfg.installMultipliers?.dirty),
      installMultiplierClean: isOverride(form.installMultiplierClean, cfg.installMultipliers?.clean),
      twoTimesPerMonthDiscount: isOverride(form.twoTimesPerMonthDiscount, cfg.twoTimesPerMonthDiscountFlat),
    };
  }, [
    backendActiveConfig,
    form.fixtureRateMonthly,
    form.fixtureRateBimonthly,
    form.fixtureRateQuarterly,
    form.minimumMonthly,
    form.minimumBimonthly,
    form.nonBathroomFirstUnitRate,
    form.nonBathroomAdditionalUnitRate,
    form.installMultiplierDirty,
    form.installMultiplierClean,
    form.twoTimesPerMonthDiscount,
  ]);

  // ✅ Sync global contract months to service (unless service has explicitly overridden it)
  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef(form.fixtureCount > 0);

  useEffect(() => {
    const isServiceActive = form.fixtureCount > 0;
    const wasActive = wasActiveRef.current;
    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {
      // Service just became active - adopt global contract months
      console.log(`📅 [SANISCRUB-CONTRACT] Service just became active, adopting global contract months`);
      if (servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
        const globalMonths = servicesContext.globalContractMonths;
        console.log(`📅 [SANISCRUB-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({ ...prev, contractMonths: globalMonths }));
      }
    } else if (isServiceActive && servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
      // Service is already active - sync with global if it changes
      const globalMonths = servicesContext.globalContractMonths;
      if (form.contractMonths !== globalMonths) {
        console.log(`📅 [SANISCRUB-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({ ...prev, contractMonths: globalMonths }));
      }
    }

    // Update the ref for next render
    wasActiveRef.current = isServiceActive;
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.fixtureCount, servicesContext]);

  // ✅ Track when user manually changes contract months (this sets the override flag)
  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({ ...prev, contractMonths: months }));
    console.log(`📅 [SANISCRUB-CONTRACT] User override: ${months} months`);
  }, []);

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `saniscrub_${fieldName}`,
      productName: `SaniScrub - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.fixtureCount || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [SANISCRUB-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.fixtureCount, form.frequency]);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[name as keyof SaniscrubFormState];

      let newFormState = prev;

      switch (name as keyof SaniscrubFormState) {
        case "fixtureCount":
        case "nonBathroomSqFt": {
          const num = parseFloat(String(value));
          newFormState = {
            ...prev,
            [name]: Number.isFinite(num) && num > 0 ? num : 0,
          };
          break;
        }

        // ✅ NEW: Handle editable rate fields
        case "fixtureRateMonthly":
        case "fixtureRateBimonthly":
        case "fixtureRateQuarterly":
        case "minimumMonthly":
        case "minimumBimonthly":
        case "nonBathroomFirstUnitRate":
        case "nonBathroomAdditionalUnitRate":
        case "installMultiplierDirty":
        case "installMultiplierClean":
        case "twoTimesPerMonthDiscount": {
          const num = parseFloat(String(value));
          newFormState = {
            ...prev,
            [name]: Number.isFinite(num) && num >= 0 ? num : 0,
          };
          break;
        }

        // ✅ NEW: Handle custom installation fee
        case "customInstallationFee": {
          const numVal = value === '' ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            newFormState = { ...prev, customInstallationFee: numVal };
          } else {
            newFormState = prev;
          }
          break;
        }

        // ✅ NEW: Handle custom override fields for totals
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customFirstMonthPrice":
        case "customContractTotal": {
          const numVal = value === '' ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            newFormState = { ...prev, [name]: numVal };
          } else {
            newFormState = prev;
          }
          break;
        }

        case "frequency":
          newFormState = {
            ...prev,
            frequency: clampFrequency(String(value)),
          };
          break;

        case "contractMonths":
          newFormState = {
            ...prev,
            contractMonths: clampContractMonths(value),
          };
          break;

        case "hasSaniClean":
        case "needsParking":
        case "tripChargeIncluded":
        case "includeInstall":
        case "isDirtyInstall":
        case "useExactNonBathroomSqft":
        case "applyMinimum":
          newFormState = {
            ...prev,
            [name]: type === "checkbox" ? !!checked : Boolean(value),
          };
          break;

        case "location":
          newFormState = {
            ...prev,
            location:
              value === "outsideBeltway" ? "outsideBeltway" : "insideBeltway",
          };
          break;

        case "notes":
          newFormState = {
            ...prev,
            notes: String(value ?? ""),
          };
          break;

        default:
          newFormState = prev;
          break;
      }

      // ✅ AUTO-CLEAR CUSTOM OVERRIDES when base inputs change
      // If user changes a base input (like fixture count, frequency), clear related custom totals
      if (
        name === 'fixtureCount' ||
        name === 'nonBathroomSqFt' ||
        name === 'frequency' ||
        name === 'hasSaniClean' ||
        name === 'includeInstall' ||
        name === 'isDirtyInstall' ||
        name === 'contractMonths' ||
        name === 'useExactNonBathroomSqft'
      ) {
        // Clear all custom overrides when base inputs change
        newFormState.customInstallationFee = undefined;
        newFormState.customPerVisitPrice = undefined;
        newFormState.customMonthlyRecurring = undefined;
        newFormState.customFirstMonthPrice = undefined;
        newFormState.customContractTotal = undefined;
      }

      // Also clear custom overrides when pricing rates change
      if (
        name === 'fixtureRateMonthly' ||
        name === 'fixtureRateBimonthly' ||
        name === 'fixtureRateQuarterly' ||
        name === 'minimumMonthly' ||
        name === 'minimumBimonthly' ||
        name === 'nonBathroomFirstUnitRate' ||
        name === 'nonBathroomAdditionalUnitRate' ||
        name === 'installMultiplierDirty' ||
        name === 'installMultiplierClean' ||
        name === 'twoTimesPerMonthDiscount'
      ) {
        // Clear custom overrides when rates change
        newFormState.customInstallationFee = undefined;
        newFormState.customPerVisitPrice = undefined;
        newFormState.customMonthlyRecurring = undefined;
        newFormState.customFirstMonthPrice = undefined;
        newFormState.customContractTotal = undefined;
      }

      // ?. Log price override for numeric pricing fields using baseline comparison
      const baseEditableFields = [
        'fixtureRateMonthly', 'fixtureRateBimonthly', 'fixtureRateQuarterly',
        'minimumMonthly', 'minimumBimonthly', 'nonBathroomFirstUnitRate',
        'nonBathroomAdditionalUnitRate', 'installMultiplierDirty', 'installMultiplierClean',
        'twoTimesPerMonthDiscount'
      ];

      const customOverrideFields = [
        'customInstallationFee', 'customPerVisitPrice', 'customMonthlyRecurring',
        'customFirstMonthPrice', 'customContractTotal'
      ];

      const allPricingFields = [...baseEditableFields, ...customOverrideFields];

      if (allPricingFields.includes(name)) {
        const newValue = newFormState[name as keyof SaniscrubFormState] as number | undefined;

        let baselineValue = baselineValues.current[name];
        if (baselineValue === undefined && name.startsWith('custom')) {
          const baseFieldMap: Record<string, string> = {
            customInstallationFee: 'installMultiplierDirty',
            customPerVisitPrice: 'minimumMonthly',
            customMonthlyRecurring: 'minimumMonthly',
            customFirstMonthPrice: 'minimumMonthly',
            customContractTotal: 'minimumMonthly',
          };

          const mappedBase = baseFieldMap[name];
          if (mappedBase) {
            baselineValue = baselineValues.current[mappedBase];
          }
        }

        if (newValue !== undefined && baselineValue !== undefined &&
            typeof newValue === 'number' && typeof baselineValue === 'number' &&
            newValue !== baselineValue) {
          console.log("�Y\"? [SANISCRUB-BASELINE-LOG] Logging change for " + name + ":", {
            baseline: baselineValue,
            newValue,
            change: newValue - baselineValue,
          });
          addServiceFieldChange(name, baselineValue, newValue);
        }
      }

      return newFormState;
    });
  };

  const {
    fixtureMonthly,
    fixtureBaseAmount, // ✅ ADD: Destructure the new fixtureBaseAmount
    fixturePerVisit,
    nonBathroomPerVisit,
    nonBathroomMonthly,
    monthlyBase,
    perVisitTrip,
    monthlyTrip,
    monthlyTotal,
    annualTotal,
    visitsPerYear,
    visitsPerMonth,
    perVisitEffective,
    installOneTime,
    firstMonthTotal,
    contractTotal,
    originalContractTotal,
    // ✅ NEW: Frequency-specific UI helpers
    frequency,
    isVisitBasedFrequency,
    monthsPerVisit,
    totalVisitsForContract,
    // ✅ NEW: Backend config values for UI
    nonBathroomUnitSqFt,
  } = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    // Map backend config to expected format with proper fallbacks
    const activeConfig = backendActiveConfig;

    if (!backendConfig) {
      console.warn('⚠️ [SaniScrub] Using fallback config - backend not loaded yet');
    } else {
      console.log('✅ [SaniScrub] Using backend config:', {
        fixtureRates: activeConfig.fixtureRates,
        minimums: activeConfig.minimums,
        nonBathroomPricing: {
          firstBlock: activeConfig.nonBathroomFirstUnitRate,
          additionalBlock: activeConfig.nonBathroomAdditionalUnitRate,
          blockSize: activeConfig.nonBathroomUnitSqFt,
        },
      });
    }

    const freq = clampFrequency(form.frequency);

    // ✅ Get billing conversion for current frequency from backend or fallback
    const getFrequencyMultiplier = (frequency: string) => {
      if (activeConfig.frequencyMetadata && activeConfig.frequencyMetadata[frequency]) {
        const metadata = activeConfig.frequencyMetadata[frequency];
        // Use monthlyRecurringMultiplier if available
        if (typeof metadata.monthlyRecurringMultiplier === 'number') {
          return metadata.monthlyRecurringMultiplier;
        }
        // Calculate from cycleMonths if available
        if (typeof metadata.cycleMonths === 'number') {
          return 1 / metadata.cycleMonths;
        }
      }
      // Fallback to active config built from backend or static
      return activeConfig.frequencyMultipliers[frequency] ?? 1;
    };

    const monthlyVisits = getFrequencyMultiplier(freq);
    const visitsPerYear = monthlyVisits * 12;
    const visitsPerMonth = visitsPerYear / 12;

    // ✅ Detect visit-based frequencies (oneTime, quarterly, biannual, annual, bimonthly)
    const isVisitBasedFrequency = freq === "oneTime" ||
                                   freq === "quarterly" ||
                                   freq === "biannual" ||
                                   freq === "annual" ||
                                   freq === "bimonthly";

    const fixtureCount = form.fixtureCount ?? 0;
    const nonBathSqFt = form.nonBathroomSqFt ?? 0;

    // ========== ✅ REWRITTEN: CORRECT SANISCRUB PRICING RULES ==========

    // ---------------- 1) RESTROOM FIXTURES ----------------
    let fixtureMonthly = 0;
    let fixturePerVisit = 0;
    let fixtureBaseAmount = 0; // ✅ Initialize at the beginning

    if (fixtureCount > 0) {
      // ✅ FIXED: Use backend config rates instead of hardcoded values
      let baseRate = 0;
      let minimumAmount = 0;

      // ✅ UPDATED: Rate selection based on frequency
      // - One-time, Weekly, Bi-weekly, 2×/month, Monthly → Monthly rate
      // - Bi-monthly → Bi-monthly rate
      // - Quarterly → Quarterly rate
      // - Bi-annual, Annual → Quarterly rate
      if (freq === "oneTime" || freq === "weekly" || freq === "biweekly" ||
          freq === "twicePerMonth" || freq === "monthly") {
        // One-time, weekly, bi-weekly, 2×/month, monthly: use monthly rate
        baseRate = form.fixtureRateMonthly; // ✅ USE FORM VALUE (can be edited by user)
        minimumAmount = form.minimumMonthly; // ✅ USE FORM VALUE (can be edited by user)
      } else if (freq === "bimonthly") {
        // Bi-monthly: use its own rate
        baseRate = form.fixtureRateBimonthly; // ✅ USE FORM VALUE
        minimumAmount = form.minimumBimonthly; // ✅ USE FORM VALUE
      } else if (freq === "quarterly") {
        // Quarterly: use its own rate
        baseRate = form.fixtureRateQuarterly; // ✅ USE FORM VALUE
        minimumAmount = activeConfig.minimums.quarterly;
      } else {
        // Bi-annual, Annual: use quarterly rate
        baseRate = form.fixtureRateQuarterly; // ✅ USE FORM VALUE
        minimumAmount = activeConfig.minimums.quarterly;
      }

      const rawAmount = fixtureCount * baseRate;

      // Base amount with minimum applied (this is what shows in the "= $___" box)
      // ✅ ONLY apply minimum when there are actual fixtures
      fixtureBaseAmount = fixtureCount > 0 ? (form.applyMinimum !== false ? Math.max(rawAmount, minimumAmount) : rawAmount) : 0;

      // ✅ FIXED: Calculate fixtureMonthly and fixturePerVisit based on frequency
      if (freq === "oneTime") {
        // One-time: Just the base amount
        fixtureMonthly = 0; // No monthly recurring for one-time
        fixturePerVisit = fixtureBaseAmount;
      } else if (freq === "weekly" || freq === "biweekly") {
        // Weekly/Biweekly: Base amount is per-visit, monthly is base × visits per month
        fixturePerVisit = fixtureBaseAmount;
        fixtureMonthly = fixtureBaseAmount * monthlyVisits; // ✅ MULTIPLY by frequency
      } else if (freq === "monthly") {
        // Monthly: Base amount is the monthly amount
        fixtureMonthly = fixtureBaseAmount;
        fixturePerVisit = fixtureBaseAmount;
      } else if (freq === "twicePerMonth") {
        // 2x/month: Base amount, then apply 2x multiplier and discount in final totals
        fixtureMonthly = fixtureBaseAmount; // Show base amount in display
        fixturePerVisit = fixtureBaseAmount / 2; // Each visit is half the monthly
      } else if (freq === "bimonthly") {
        // Bimonthly: Base amount represents per-visit cost
        fixturePerVisit = fixtureBaseAmount;
        fixtureMonthly = fixtureBaseAmount * monthlyVisits; // ✅ base × 0.5
      } else if (freq === "quarterly") {
        // Quarterly: Base amount represents per-visit cost
        fixturePerVisit = fixtureBaseAmount;
        fixtureMonthly = fixtureBaseAmount * monthlyVisits; // ✅ base × 0.333
      } else {
        // For biannual, annual: base amount as per-visit cost
        fixturePerVisit = fixtureBaseAmount;
        fixtureMonthly = fixtureBaseAmount * monthlyVisits; // ✅ MULTIPLY by frequency
      }
    }

    // ---------------- 2) NON-BATHROOM AREA ----------------
    let nonBathroomPerVisit = 0;
    let nonBathroomMonthly = 0;

    if (nonBathSqFt > 0) {
      // Rule: $250 for up to 500 sq ft, then +$125 for each additional 500 sq ft block
      // Example: 3000 sq ft = 6 units = $250 + 5×$125 = $875
      // ✅ FIXED: Use FORM values (editable by user) instead of backend config

      if (nonBathSqFt <= activeConfig.nonBathroomUnitSqFt) {
        // Up to 500 sq ft: use form value (editable by user)
        nonBathroomPerVisit = form.nonBathroomFirstUnitRate;
      } else {
        // Over 500 sq ft: choose calculation method
        const extraSqFt = nonBathSqFt - activeConfig.nonBathroomUnitSqFt;

        if (form.useExactNonBathroomSqft) {
          // EXACT SQFT: extra sq ft × rate per sq ft
          const ratePerSqFt = form.nonBathroomAdditionalUnitRate / activeConfig.nonBathroomUnitSqFt;
          nonBathroomPerVisit = form.nonBathroomFirstUnitRate + (extraSqFt * ratePerSqFt);
        } else {
          // BLOCK PRICING: number of additional 500 sq ft blocks × rate
          const additionalBlocks = Math.ceil(extraSqFt / activeConfig.nonBathroomUnitSqFt);
          nonBathroomPerVisit = form.nonBathroomFirstUnitRate + (additionalBlocks * form.nonBathroomAdditionalUnitRate);
        }
      }

      nonBathroomMonthly = (nonBathroomPerVisit * visitsPerYear) / 12;
    }

    // ---------------- 3) TRIP CHARGE ----------------
    // ✅ CORRECTED: NO trip charges for SaniScrub (per updated business rules)
    const baseTrip = 0; // No trip charge for SaniScrub
    const parkingCharge = 0; // No parking charge for SaniScrub
    const perVisitTrip = baseTrip + parkingCharge;
    const monthlyTrip = perVisitTrip * visitsPerMonth;

    // ---------------- 4) TOTALS WITH FREQUENCY ADJUSTMENTS ----------------
    let adjustedFixtureMonthly = fixtureMonthly;

    // ✅ Apply frequency adjustments to final totals only
    if (freq === "twicePerMonth") {
      // 2x/month: Double the monthly base, then subtract discount if combined with SaniClean
      adjustedFixtureMonthly = fixtureMonthly * 2;
      if (form.hasSaniClean) {
        adjustedFixtureMonthly = Math.max(0, adjustedFixtureMonthly - form.twoTimesPerMonthDiscount); // ✅ USE FORM VALUE (editable by user)
      }
    }
    // Note: bimonthly and quarterly rates already use their correct base rates (35/40)

    const monthlyBase = adjustedFixtureMonthly + nonBathroomMonthly;
    const perVisitWithoutTrip = fixturePerVisit + nonBathroomPerVisit;
    const perVisitWithTrip = perVisitWithoutTrip + perVisitTrip;

    const serviceActive = fixtureCount > 0 || nonBathSqFt > 0;

    // Monthly recurring (service + trip)
    const monthlyRecurring = monthlyBase + monthlyTrip;

    // ✅ MOVED: Calculate base per-visit cost early (needed for first month calculation)
    const basePerVisitCost = (fixtureCount > 0 ? fixtureBaseAmount : 0) +
                            (nonBathSqFt > 0 ? nonBathroomPerVisit : 0);

    // ---------------- 5) INSTALLATION ----------------
    // ✅ FIXED: Installation = 3× (dirty) or 1× (clean) of FULL service price
    // For installation, always use the base amounts, not per-visit amounts
    const installationFixtureBase = fixtureCount > 0 ? fixtureBaseAmount : 0;
    const installationNonBathroomBase = nonBathSqFt > 0 ? nonBathroomPerVisit : 0;
    const installationBasePrice = installationFixtureBase + installationNonBathroomBase;

    const installMultiplier = form.isDirtyInstall
      ? form.installMultiplierDirty  // ✅ Use form value (editable by user)
      : form.installMultiplierClean; // ✅ Use form value (editable by user)

    const calculatedInstallOneTime = serviceActive && form.includeInstall
      ? installationBasePrice * installMultiplier
      : 0;

    // Use custom installation fee if set, otherwise use calculated
    const installOneTime = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOneTime;

    // ----------------6) FIRST MONTH - NEW INSTALLATION-BASED RULES ----------------
    let calculatedFirstMonthTotal = 0;

    if (serviceActive) {
      if (freq === "oneTime") {
        // ✅ FIXED: One-Time = Installation ONLY if included, otherwise Service Cost
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only (no service cost)
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip; // Service cost only
        }
      } else if (freq === "weekly") {
        // Weekly: First month = Installation + (monthlyVisits - 1) × Service Cost
        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; // e.g., 4.33 - 1 = 3.33 remaining visits
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {
          calculatedFirstMonthTotal = monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "biweekly") {
        // Bi-Weekly: First month = Installation + (monthlyVisits - 1) × Service Cost
        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; // e.g., 2.165 - 1 = 1.165 remaining visits
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {
          calculatedFirstMonthTotal = monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "monthly") {
        // Monthly: First month = Installation only (no service)
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip; // Service cost
        }
      } else if (freq === "bimonthly") {
        // Bi-Monthly: First visit = Installation only (every 2 months = 1 visit per 2-month period)
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only for first visit
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "quarterly") {
        // Quarterly: First visit = Installation only (4 visits per year)
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only for first visit
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "biannual") {
        // Bi-Annual: First service = Installation only
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "annual") {
        // Annual: Installation only if included, otherwise service cost
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "twicePerMonth") {
        // 2×/month: Similar to biweekly but with discount logic
        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; // e.g., 2 - 1 = 1 remaining visit
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));

          // Apply SaniClean discount
          if (form.hasSaniClean) {
            calculatedFirstMonthTotal = Math.max(0, calculatedFirstMonthTotal - form.twoTimesPerMonthDiscount); // ✅ USE FORM VALUE
          }
        } else {
          calculatedFirstMonthTotal = monthlyVisits * (basePerVisitCost + perVisitTrip);
          if (form.hasSaniClean) {
            calculatedFirstMonthTotal = Math.max(0, calculatedFirstMonthTotal - form.twoTimesPerMonthDiscount); // ✅ USE FORM VALUE
          }
        }
      }
    }

    // ✅ NEW: Apply custom override if set
    const firstMonthTotal = form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthTotal;

    // ---------------- 7) CONTRACT TOTAL - NEW INSTALLATION-BASED RULES ----------------
    const contractMonths = clampContractMonths(form.contractMonths);
    let calculatedContractTotal = 0;
    let monthsPerVisit = 1;
    let totalVisitsForContract = 0;

    if (serviceActive && contractMonths > 0) {
      if (freq === "oneTime") {
        // One-time service: just the first visit total
        calculatedContractTotal = firstMonthTotal;
        totalVisitsForContract = 1;
      } else if (freq === "weekly") {
        // Weekly: Use backend monthlyVisits multiplier
        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {
          // First month: installation + remaining visits × service
          // Remaining months: monthlyVisits × service each
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyVisits * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all months monthlyVisits × service
          calculatedContractTotal = contractMonths * monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "biweekly") {
        // Bi-Weekly: Use backend monthlyVisits multiplier
        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {
          // First month: installation + remaining visits × service
          // Remaining months: monthlyVisits × service each
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyVisits * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all months monthlyVisits × service
          calculatedContractTotal = contractMonths * monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "monthly") {
        // Monthly: 1 visit per month
        totalVisitsForContract = contractMonths;

        if (form.includeInstall && installOneTime > 0) {
          // First month: installation only
          // From second month onward: 1 × service each month
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all months 1 × service
          calculatedContractTotal = contractMonths * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "bimonthly") {
        // Bi-Monthly: 6 visits in 12 months (1 visit every 2 months)
        const totalVisits = Math.round(contractMonths / 2);
        totalVisitsForContract = totalVisits;

        if (form.includeInstall && installOneTime > 0) {
          // First visit: installation only, remaining visits: service cost
          const remainingVisits = Math.max(totalVisits - 1, 0); // 5 remaining visits for 12-month contract
          calculatedContractTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all visits are service cost
          calculatedContractTotal = totalVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "quarterly") {
        // Quarterly: 4 visits in 12 months (1 visit every 3 months)
        const totalVisits = Math.round(contractMonths / 3);
        totalVisitsForContract = totalVisits;

        if (form.includeInstall && installOneTime > 0) {
          // First visit: installation only, remaining visits: service cost
          const remainingVisits = Math.max(totalVisits - 1, 0); // 3 remaining visits for 12-month contract
          calculatedContractTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all visits are service cost
          calculatedContractTotal = totalVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "biannual") {
        // Bi-Annual: 2 services per year
        const totalServices = Math.round((contractMonths / 12) * 2);
        totalVisitsForContract = totalServices;

        if (form.includeInstall && installOneTime > 0) {
          // First service: installation, second service: normal service
          const remainingServices = Math.max(totalServices - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingServices * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all services normal
          calculatedContractTotal = totalServices * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "annual") {
        // Annual: 1 service per year
        const totalServices = Math.round(contractMonths / 12);
        totalVisitsForContract = totalServices;

        if (form.includeInstall && installOneTime > 0) {
          // ✅ FIXED: First service = installation, remaining services = normal service
          const remainingServices = Math.max(totalServices - 1, 0);
          calculatedContractTotal = installOneTime + (remainingServices * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: service cost
          calculatedContractTotal = totalServices * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "twicePerMonth") {
        // 2×/month: Use backend monthlyVisits multiplier
        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {
          // First month: installation + remaining visits × service (with discount)
          // Remaining months: monthlyVisits × service each (with discount)
          const remainingMonths = Math.max(contractMonths - 1, 0);
          let monthlyRecurringWithDiscount = monthlyVisits * (basePerVisitCost + perVisitTrip);
          if (form.hasSaniClean) {
            monthlyRecurringWithDiscount = Math.max(0, monthlyRecurringWithDiscount - form.twoTimesPerMonthDiscount); // ✅ USE FORM VALUE
          }
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyRecurringWithDiscount);
        } else {
          // No installation: all months monthlyVisits × service with discount
          let monthlyRecurringWithDiscount = monthlyVisits * (basePerVisitCost + perVisitTrip);
          if (form.hasSaniClean) {
            monthlyRecurringWithDiscount = Math.max(0, monthlyRecurringWithDiscount - form.twoTimesPerMonthDiscount); // ✅ USE FORM VALUE
          }
          calculatedContractTotal = contractMonths * monthlyRecurringWithDiscount;
        }
      }
    }

    // ✅ NEW: Apply custom override if set
    const contractTotalBeforeCustomFields = form.customContractTotal !== undefined
      ? form.customContractTotal
      : calculatedContractTotal;

    // ✅ NEW: Add calc field totals AND dollar field totals directly to contract (no frequency dependency)
    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotal = contractTotalBeforeCustomFields + customFieldsTotal;

    console.log(`📊 [SANISCRUB-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotalBeforeCustomFields.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotal.toFixed(2)
    });

    // UI Values
    const monthlyTotal = form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : monthlyRecurring;

    const annualTotal = contractTotal;

    // ✅ FIXED: Per-visit shows BASE cost (without frequency adjustments or discounts)
    const perVisitEffective = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : (basePerVisitCost + perVisitTrip); // Base cost + trip charges

    // Frequency helpers
    const frequency = freq;
    monthsPerVisit = freq === "bimonthly" ? 2 : freq === "quarterly" ? 3 : freq === "biannual" ? 6 : freq === "annual" ? 12 : 1;
    totalVisitsForContract = isVisitBasedFrequency && contractMonths > 0
      ? Math.round((contractMonths / 12) * visitsPerYear)
      : Math.round(contractMonths * monthlyVisits);

    return {
      fixtureMonthly, // Base amount for display (before frequency adjustments)
      fixtureBaseAmount, // ✅ NEW: Explicit base amount with minimum applied
      fixturePerVisit,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      monthlyBase, // Now includes frequency adjustments
      perVisitTrip,
      monthlyTrip,
      monthlyTotal,
      annualTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitEffective,
      installOneTime,
      firstMonthTotal,
      contractTotal,
      originalContractTotal: (() => {
        // ✅ ORIGINAL CONTRACT TOTAL: baseline (pricing table) rates × fixtureCount × visits × contractMonths
        if (!serviceActive) return 0;
        const baselineFixtureRate = freq === "monthly" || freq === "weekly" || freq === "biweekly" || freq === "twicePerMonth"
          ? activeConfig.fixtureRates.monthly
          : freq === "bimonthly"
          ? activeConfig.fixtureRates.bimonthly
          : activeConfig.fixtureRates.quarterly; // quarterly, biannual, annual
        const baselineMinimum = freq === "monthly" || freq === "weekly" || freq === "biweekly" || freq === "twicePerMonth"
          ? activeConfig.minimums.monthly
          : freq === "bimonthly"
          ? activeConfig.minimums.bimonthly
          : activeConfig.minimums.quarterly;
        const baselineRawAmount = fixtureCount > 0 ? fixtureCount * baselineFixtureRate : 0;
        const baselineBaseAmount = fixtureCount > 0 ? (form.applyMinimum !== false ? Math.max(baselineRawAmount, baselineMinimum) : baselineRawAmount) : 0;
        const baselinePerVisit = baselineBaseAmount;
        const baselineMonthlyTwice = baselineBaseAmount * 2;
        let baselineContractTotal = 0;
        if (freq === "oneTime") {
          baselineContractTotal = baselinePerVisit;
        } else if (freq === "weekly" || freq === "biweekly") {
          baselineContractTotal = contractMonths * monthlyVisits * baselinePerVisit;
        } else if (freq === "monthly") {
          baselineContractTotal = contractMonths * baselinePerVisit;
        } else if (freq === "twicePerMonth") {
          baselineContractTotal = contractMonths * baselineMonthlyTwice;
        } else {
          // bimonthly, quarterly, biannual, annual: visits-based
          baselineContractTotal = totalVisitsForContract * baselinePerVisit;
        }
        return baselineContractTotal;
      })(),
      frequency,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
      nonBathroomUnitSqFt: activeConfig.nonBathroomUnitSqFt,
    };
  }, [
    backendActiveConfig,  // ?. CRITICAL: Re-calculate when backend config loads!
    form.fixtureCount,
    form.nonBathroomSqFt,
    form.useExactNonBathroomSqft,  // ✅ Re-calculate when calculation method changes
    form.frequency,
    form.hasSaniClean,
    form.needsParking,
    form.includeInstall,
    form.isDirtyInstall,
    form.contractMonths,
    form.customInstallationFee,
    // ✅ NEW: Watch ALL form pricing rates (editable from UI)
    form.fixtureRateMonthly,      // ✅ CRITICAL: Re-calculate when fixture rates change
    form.fixtureRateBimonthly,    // ✅ CRITICAL: Re-calculate when fixture rates change
    form.fixtureRateQuarterly,    // ✅ CRITICAL: Re-calculate when fixture rates change
    form.minimumMonthly,          // ✅ CRITICAL: Re-calculate when minimums change
    form.minimumBimonthly,        // ✅ CRITICAL: Re-calculate when minimums change
    form.nonBathroomFirstUnitRate,
    form.nonBathroomAdditionalUnitRate,
    form.installMultiplierDirty,  // ✅ Added: Watch multiplier changes
    form.installMultiplierClean,  // ✅ Added: Watch multiplier changes
    form.twoTimesPerMonthDiscount, // ✅ CRITICAL: Re-calculate when discount changes
    // ✅ NEW: Watch custom override fields
    form.customPerVisitPrice,
    form.customMonthlyRecurring,
    form.customFirstMonthPrice,
    form.customContractTotal,
    // ✅ NEW: Re-calculate when custom fields change
    calcFieldsTotal,
    dollarFieldsTotal,
    form.applyMinimum,
  ]);

  const quote: ServiceQuoteResult = useMemo(
    () => ({
      serviceId: form.serviceId,
      perVisit: perVisitEffective,
      monthly: monthlyTotal, // normal recurring month
      annual: annualTotal, // here: TOTAL CONTRACT PRICE
    }),
    [form.serviceId, perVisitEffective, monthlyTotal, annualTotal]
  );

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: {
      fixtureMonthly,
      fixtureBaseAmount, // ✅ NEW: Base amount with minimum applied
      fixturePerVisit,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      monthlyBase,
      perVisitTrip,
      monthlyTrip,
      monthlyTotal,
      annualTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitEffective,
      installOneTime,
      firstMonthTotal,
      contractTotal,
      originalContractTotal,
      // ✅ NEW: Frequency-specific UI helpers
      frequency,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
      // ✅ NEW: Backend config values for UI
      nonBathroomUnitSqFt,
    },
    pricingOverrides,
    refreshConfig: () => fetchPricing(true),
    isLoadingConfig,
    setContractMonths, // ✅ NEW: Contract months with override support
  };
}

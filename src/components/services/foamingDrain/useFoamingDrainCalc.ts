// src/features/services/foamingDrain/useFoamingDrainCalc.ts
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { FOAMING_DRAIN_CONFIG as cfg } from "./foamingDrainConfig";
import type {
  FoamingDrainFormState,
  FoamingDrainQuoteResult,
  FoamingDrainFrequency,
  FoamingDrainLocation,
  FoamingDrainCondition,
  FoamingDrainBreakdown,
} from "./foamingDrainTypes";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";

// ✅ Helper function to transform backend frequencyMetadata to frontend format
function transformBackendFrequencyMeta(backendMeta: BackendFoamingDrainConfig['frequencyMetadata'] | undefined) {
  if (!backendMeta) {
    console.warn('⚠️ No backend frequencyMetadata available, using static fallback values');
    return cfg.billingConversions;
  }

  console.log('🔧 [Foaming Drain] Transforming backend frequencyMetadata:', backendMeta);

  // Transform backend structure to frontend billingConversions format
  const transformedBilling: any = {};

  // Handle weekly and biweekly with their special multipliers
  if (backendMeta.weekly) {
    transformedBilling.weekly = {
      monthlyMultiplier: backendMeta.weekly.monthlyRecurringMultiplier,
      firstMonthExtraMultiplier: backendMeta.weekly.firstMonthExtraMultiplier,
    };
  }

  if (backendMeta.biweekly) {
    transformedBilling.biweekly = {
      monthlyMultiplier: backendMeta.biweekly.monthlyRecurringMultiplier,
      firstMonthExtraMultiplier: backendMeta.biweekly.firstMonthExtraMultiplier,
    };
  }

  // Handle cycle-based frequencies (monthly, bimonthly, quarterly, biannual, annual)
  const cycleBased = ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'] as const;

  for (const freq of cycleBased) {
    const backendFreqData = backendMeta[freq];
    if (backendFreqData?.cycleMonths) {
      const cycleMonths = backendFreqData.cycleMonths;
      const monthlyMultiplier = 1 / cycleMonths; // e.g., bimonthly: 1/2=0.5, quarterly: 1/3=0.333

      transformedBilling[freq] = {
        cycleMonths,
        monthlyMultiplier,
      };
    }
  }

  // Merge with fallback config
  const finalBilling = {
    ...cfg.billingConversions, // Start with fallback values
    ...transformedBilling,     // Override with backend values
  };

  console.log('✅ [Foaming Drain] Transformed frequencyMetadata to billingConversions:', finalBilling);
  return finalBilling;
}

// ✅ Backend config interface matching the ACTUAL MongoDB JSON structure
interface BackendFoamingDrainConfig {
  standardPricing: {
    standardDrainRate: number;
    alternateBaseCharge: number;
    alternateExtraPerDrain: number;
  };
  volumePricing: {
    minimumDrains: number;
    weeklyRatePerDrain: number;
    bimonthlyRatePerDrain: number;
  };
  addOns: {
    plumbingWeeklyAddonPerDrain: number;
  };
  minimumChargePerVisit: number;
  installationMultipliers: {
    filthyMultiplier: number;
  };
  greenDrainPricing: {
    installPerDrain: number;
    weeklyRatePerDrain: number;
  };
  greaseTrapPricing: {
    weeklyRatePerTrap: number;
    installPerTrap: number;
  };
  tripCharges: {
    standard: number;
    beltway: number;
  };
  contract: {
    minMonths: number;
    maxMonths: number;
    defaultMonths: number;
  };
  defaultFrequency: string;
  allowedFrequencies: string[];
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

const DEFAULT_FREQUENCY: FoamingDrainFrequency = cfg.defaultFrequency;

const DEFAULT_FOAMING_DRAIN_FORM_STATE: FoamingDrainFormState = {
  serviceId: "foamingDrain",

  standardDrainCount: 0,
  installDrainCount: 0,
  filthyDrainCount: 0,
  greaseTrapCount: 0,
  greenDrainCount: 0,
  plumbingDrainCount: 0,

  needsPlumbing: false,

  frequency: DEFAULT_FREQUENCY,
  // ✅ NEW: Default install frequency to weekly
  installFrequency: "weekly" as const,
  facilityCondition: "normal",
  location: "standard",

  useSmallAltPricingWeekly: false,
  useBigAccountTenWeekly: false,
  isAllInclusive: false,

  chargeGreaseTrapInstall: true,
  tripChargeOverride: undefined,

  contractMonths: cfg.contract.defaultMonths,
  notes: "",

  // Editable pricing rates from config (will be overridden by backend)
  standardDrainRate: cfg.standardDrainRate,
  altBaseCharge: cfg.altBaseCharge,
  altExtraPerDrain: cfg.altExtraPerDrain,
  volumeWeeklyRate: cfg.volumePricing.weekly.ratePerDrain,
  volumeBimonthlyRate: cfg.volumePricing.bimonthly.ratePerDrain,
  greaseWeeklyRate: cfg.grease.weeklyRatePerTrap,
  greaseInstallRate: cfg.grease.installPerTrap,
  greenWeeklyRate: cfg.green.weeklyRatePerDrain,
  greenInstallRate: cfg.green.installPerDrain,
  plumbingAddonRate: cfg.plumbing.weeklyAddonPerDrain,
  filthyMultiplier: cfg.installationRules.filthyMultiplier,
};

function clamp(num: number, min: number, max: number): number {
  if (Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function useFoamingDrainCalc(initialData?: Partial<FoamingDrainFormState>, customFields?: any[]) {
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

    console.log(`💰 [FOAMING-DRAIN-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [FOAMING-DRAIN-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [state, setState] = useState<FoamingDrainFormState>(() => {
    // ✅ Calculate if service is initially active (has drains)
    const initialDrainCount = (initialData?.standardDrainCount || 0) +
                               (initialData?.installDrainCount || 0) +
                               (initialData?.filthyDrainCount || 0) +
                               (initialData?.greaseTrapCount || 0) +
                               (initialData?.greenDrainCount || 0) +
                               (initialData?.plumbingDrainCount || 0);
    const isInitiallyActive = initialDrainCount > 0;

    // ✅ Only use global contract months if service starts active AND no initial value provided
    const defaultContractMonths = initialData?.contractMonths
      ? initialData.contractMonths
      : (isInitiallyActive && servicesContext?.globalContractMonths)
        ? servicesContext.globalContractMonths
        : DEFAULT_FOAMING_DRAIN_FORM_STATE.contractMonths;

    console.log(`📅 [FOAMING-DRAIN-INIT] Initializing contract months:`, {
      initialDrainCount,
      isInitiallyActive,
      globalContractMonths: servicesContext?.globalContractMonths,
      defaultContractMonths,
      hasInitialValue: !!initialData?.contractMonths
    });

    return {
      ...DEFAULT_FOAMING_DRAIN_FORM_STATE,
      ...initialData,
      serviceId: "foamingDrain",
      contractMonths: defaultContractMonths,
    };
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendFoamingDrainConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // ✅ Add refs for tracking baseline values and edit mode
  const isEditMode = useRef(!!initialData);
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);

  // Helper function to update state with config data from the actual backend structure
  const updateStateWithConfig = (config: BackendFoamingDrainConfig, forceUpdate: boolean = false) => {
    // ✅ FIXED: In edit mode, NEVER overwrite user's loaded values (unless force refresh)
    // Only update on manual refresh (when user explicitly clicks refresh button)
    if (initialData && !forceUpdate) {
      console.log('📋 [FOAMING-DRAIN] Edit mode: Skipping form update to preserve loaded values');
      return; // Don't overwrite loaded values in edit mode
    }

    console.log('📋 [FOAMING-DRAIN] Updating state with backend config', forceUpdate ? '(FORCED by refresh button)' : '');
    setState((prev) => ({
      ...prev,
      // ✅ Extract from nested backend structure
      standardDrainRate: config.standardPricing?.standardDrainRate ?? prev.standardDrainRate,
      altBaseCharge: config.standardPricing?.alternateBaseCharge ?? prev.altBaseCharge,
      altExtraPerDrain: config.standardPricing?.alternateExtraPerDrain ?? prev.altExtraPerDrain,
      volumeWeeklyRate: config.volumePricing?.weeklyRatePerDrain ?? prev.volumeWeeklyRate,
      volumeBimonthlyRate: config.volumePricing?.bimonthlyRatePerDrain ?? prev.volumeBimonthlyRate,
      greaseWeeklyRate: config.greaseTrapPricing?.weeklyRatePerTrap ?? prev.greaseWeeklyRate,
      greaseInstallRate: config.greaseTrapPricing?.installPerTrap ?? prev.greaseInstallRate,
      greenWeeklyRate: config.greenDrainPricing?.weeklyRatePerDrain ?? prev.greenWeeklyRate,
      greenInstallRate: config.greenDrainPricing?.installPerDrain ?? prev.greenInstallRate,
      plumbingAddonRate: config.addOns?.plumbingWeeklyAddonPerDrain ?? prev.plumbingAddonRate,
      filthyMultiplier: config.installationMultipliers?.filthyMultiplier ?? prev.filthyMultiplier,
    }));
  };

  // ⚡ OPTIMIZED: Fetch pricing config from context (NO API call)
  const fetchPricing = async (forceRefresh: boolean = false) => {
    setIsLoadingConfig(true);
    try {
      // ⚡ Use context's backend pricing data directly (already loaded by useAllServicePricing)
      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("foamingDrain");
        if (backendData?.config) {
          console.log('✅ [Foaming Drain] Using cached pricing data from context');
          const config = backendData.config as BackendFoamingDrainConfig;
          setBackendConfig(config);
          updateStateWithConfig(config, forceRefresh);

          // ✅ Only clear custom overrides on manual refresh
          if (forceRefresh) {
            console.log('🔄 [FOAMING-DRAIN] Manual refresh: Clearing all custom overrides');
            setState(prev => ({
              ...prev,
              // Clear custom RATE overrides
              customRatePerDrain: undefined,
              customAltBaseCharge: undefined,
              customAltExtraPerDrain: undefined,
              customVolumeWeeklyRate: undefined,
              customVolumeBimonthlyRate: undefined,
              customGreaseWeeklyRate: undefined,
              customGreaseInstallRate: undefined,
              customGreenWeeklyRate: undefined,
              customGreenInstallRate: undefined,
              customPlumbingAddonRate: undefined,
              customFilthyMultiplier: undefined,
              // Clear custom TOTAL overrides
              customWeeklyService: undefined,
              customInstallationTotal: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthPrice: undefined,
              customContractTotal: undefined,
            }));
          }

          console.log('✅ Foaming Drain CONFIG loaded from context:', {
            standardPricing: config.standardPricing,
            volumePricing: config.volumePricing,
            addOns: config.addOns,
            minimumChargePerVisit: config.minimumChargePerVisit,
            installationMultipliers: config.installationMultipliers,
            greenDrainPricing: config.greenDrainPricing,
            greaseTrapPricing: config.greaseTrapPricing,
            tripCharges: config.tripCharges,
            frequencyMetadata: config.frequencyMetadata,
            contract: config.contract,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for Foaming Drain, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch Foaming Drain config from context:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("foamingDrain");
        if (fallbackConfig?.config) {
          console.log('✅ [Foaming Drain] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendFoamingDrainConfig;
          setBackendConfig(config);
          updateStateWithConfig(config, forceRefresh);

          // ✅ FIXED: Only clear custom overrides on manual refresh
          if (forceRefresh) {
            console.log('🔄 [FOAMING-DRAIN] Manual refresh: Clearing all custom overrides');
            setState(prev => ({
              ...prev,
              // Clear custom RATE overrides
              customRatePerDrain: undefined,
              customAltBaseCharge: undefined,
              customAltExtraPerDrain: undefined,
              customVolumeWeeklyRate: undefined,
              customVolumeBimonthlyRate: undefined,
              customGreaseWeeklyRate: undefined,
              customGreaseInstallRate: undefined,
              customGreenWeeklyRate: undefined,
              customGreenInstallRate: undefined,
              customPlumbingAddonRate: undefined,
              customFilthyMultiplier: undefined,
              // Clear custom TOTAL overrides
              customWeeklyService: undefined,
              customInstallationTotal: undefined,
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
    console.log('📋 [FOAMING-DRAIN-PRICING] Fetching backend config (initial load, will not overwrite edit mode values)');
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
        standardDrainRate: initialData?.standardDrainRate ?? backendConfig.standardPricing?.standardDrainRate ?? state.standardDrainRate,
        altBaseCharge: initialData?.altBaseCharge ?? backendConfig.standardPricing?.alternateBaseCharge ?? state.altBaseCharge,
        altExtraPerDrain: initialData?.altExtraPerDrain ?? backendConfig.standardPricing?.alternateExtraPerDrain ?? state.altExtraPerDrain,
        volumeWeeklyRate: initialData?.volumeWeeklyRate ?? backendConfig.volumePricing?.weeklyRatePerDrain ?? state.volumeWeeklyRate,
        volumeBimonthlyRate: initialData?.volumeBimonthlyRate ?? backendConfig.volumePricing?.bimonthlyRatePerDrain ?? state.volumeBimonthlyRate,
        greaseWeeklyRate: initialData?.greaseWeeklyRate ?? backendConfig.greaseTrapPricing?.weeklyRatePerTrap ?? state.greaseWeeklyRate,
        greaseInstallRate: initialData?.greaseInstallRate ?? backendConfig.greaseTrapPricing?.installPerTrap ?? state.greaseInstallRate,
        greenWeeklyRate: initialData?.greenWeeklyRate ?? backendConfig.greenDrainPricing?.weeklyRatePerDrain ?? state.greenWeeklyRate,
        greenInstallRate: initialData?.greenInstallRate ?? backendConfig.greenDrainPricing?.installPerDrain ?? state.greenInstallRate,
        plumbingAddonRate: initialData?.plumbingAddonRate ?? backendConfig.addOns?.plumbingWeeklyAddonPerDrain ?? state.plumbingAddonRate,
        filthyMultiplier: initialData?.filthyMultiplier ?? backendConfig.installationMultipliers?.filthyMultiplier ?? state.filthyMultiplier,
      };

      console.log('✅ [FOAMING-DRAIN-BASELINE] Initialized baseline values for logging (ALL fields):', {
        standardDrainRate: baselineValues.current.standardDrainRate,
        altBaseCharge: baselineValues.current.altBaseCharge,
        altExtraPerDrain: baselineValues.current.altExtraPerDrain,
        volumeWeeklyRate: baselineValues.current.volumeWeeklyRate,
        volumeBimonthlyRate: baselineValues.current.volumeBimonthlyRate,
        greaseWeeklyRate: baselineValues.current.greaseWeeklyRate,
        greaseInstallRate: baselineValues.current.greaseInstallRate,
        greenWeeklyRate: baselineValues.current.greenWeeklyRate,
        greenInstallRate: baselineValues.current.greenInstallRate,
        plumbingAddonRate: baselineValues.current.plumbingAddonRate,
        filthyMultiplier: baselineValues.current.filthyMultiplier,
        note: initialData ? 'Edit mode: using loaded/saved values' : 'New document: using backend defaults'
      });

      // ✅ STEP 2: Detect overrides for yellow highlighting (edit mode only) - ONLY ONCE!
      if (initialData) {
        console.log('🔍 [FOAMING-DRAIN-PRICING] Detecting price overrides for yellow highlighting...');

        // ✅ FIXED: Compare ALL rate fields against backend defaults (not just 3)
        const overrides = {
          customRatePerDrain: (initialData.standardDrainRate !== undefined &&
                               initialData.standardDrainRate !== backendConfig.standardPricing?.standardDrainRate)
                               ? initialData.standardDrainRate : undefined,

          customAltBaseCharge: (initialData.altBaseCharge !== undefined &&
                                initialData.altBaseCharge !== backendConfig.standardPricing?.alternateBaseCharge)
                                ? initialData.altBaseCharge : undefined,

          customAltExtraPerDrain: (initialData.altExtraPerDrain !== undefined &&
                                   initialData.altExtraPerDrain !== backendConfig.standardPricing?.alternateExtraPerDrain)
                                   ? initialData.altExtraPerDrain : undefined,

          customVolumeWeeklyRate: (initialData.volumeWeeklyRate !== undefined &&
                                   initialData.volumeWeeklyRate !== backendConfig.volumePricing?.weeklyRatePerDrain)
                                   ? initialData.volumeWeeklyRate : undefined,

          customVolumeBimonthlyRate: (initialData.volumeBimonthlyRate !== undefined &&
                                      initialData.volumeBimonthlyRate !== backendConfig.volumePricing?.bimonthlyRatePerDrain)
                                      ? initialData.volumeBimonthlyRate : undefined,

          customGreaseWeeklyRate: (initialData.greaseWeeklyRate !== undefined &&
                                   initialData.greaseWeeklyRate !== backendConfig.greaseTrapPricing?.weeklyRatePerTrap)
                                   ? initialData.greaseWeeklyRate : undefined,

          customGreaseInstallRate: (initialData.greaseInstallRate !== undefined &&
                                    initialData.greaseInstallRate !== backendConfig.greaseTrapPricing?.installPerTrap)
                                    ? initialData.greaseInstallRate : undefined,

          customGreenWeeklyRate: (initialData.greenWeeklyRate !== undefined &&
                                  initialData.greenWeeklyRate !== backendConfig.greenDrainPricing?.weeklyRatePerDrain)
                                  ? initialData.greenWeeklyRate : undefined,

          customGreenInstallRate: (initialData.greenInstallRate !== undefined &&
                                   initialData.greenInstallRate !== backendConfig.greenDrainPricing?.installPerDrain)
                                   ? initialData.greenInstallRate : undefined,

          customPlumbingAddonRate: (initialData.plumbingAddonRate !== undefined &&
                                    initialData.plumbingAddonRate !== backendConfig.addOns?.plumbingWeeklyAddonPerDrain)
                                    ? initialData.plumbingAddonRate : undefined,

          customFilthyMultiplier: (initialData.filthyMultiplier !== undefined &&
                                   initialData.filthyMultiplier !== backendConfig.installationMultipliers?.filthyMultiplier)
                                   ? initialData.filthyMultiplier : undefined,
        };

        // Only set overrides that are actually different
        const hasAnyOverrides = Object.values(overrides).some(v => v !== undefined);

        if (hasAnyOverrides) {
          setState(prev => ({
            ...prev,
            ...overrides, // Spread all override fields
          }));

          console.log('✅ [FOAMING-DRAIN-PRICING] Set custom override fields for yellow highlighting:',
            Object.fromEntries(
              Object.entries(overrides).filter(([_, value]) => value !== undefined)
            )
          );
        } else {
          console.log('ℹ️ [FOAMING-DRAIN-PRICING] No price overrides detected - using backend defaults');
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

  // ✅ Sync global contract months to service (unless service has explicitly overridden it)
  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef(() => {
    const drainCount = state.standardDrainCount + state.installDrainCount +
                       state.filthyDrainCount + state.greaseTrapCount +
                       state.greenDrainCount + state.plumbingDrainCount;
    return drainCount > 0;
  });

  useEffect(() => {
    const drainCount = state.standardDrainCount + state.installDrainCount +
                       state.filthyDrainCount + state.greaseTrapCount +
                       state.greenDrainCount + state.plumbingDrainCount;
    const isServiceActive = drainCount > 0;
    const wasActive = wasActiveRef.current();
    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {
      // Service just became active - adopt global contract months
      console.log(`📅 [FOAMING-DRAIN-CONTRACT] Service just became active, adopting global contract months`);
      if (servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
        const globalMonths = servicesContext.globalContractMonths;
        console.log(`📅 [FOAMING-DRAIN-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setState(prev => ({ ...prev, contractMonths: globalMonths }));
      }
    } else if (isServiceActive && servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
      // Service is already active - sync with global if it changes
      const globalMonths = servicesContext.globalContractMonths;
      if (state.contractMonths !== globalMonths) {
        console.log(`📅 [FOAMING-DRAIN-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setState(prev => ({ ...prev, contractMonths: globalMonths }));
      }
    }

    // Update the ref for next render
    wasActiveRef.current = () => isServiceActive;
  }, [servicesContext?.globalContractMonths, state.contractMonths,
      state.standardDrainCount, state.installDrainCount, state.filthyDrainCount,
      state.greaseTrapCount, state.greenDrainCount, state.plumbingDrainCount, servicesContext]);

  // ✅ Track when user manually changes contract months (this sets the override flag)
  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setState(prev => ({ ...prev, contractMonths: months }));
    console.log(`📅 [FOAMING-DRAIN-CONTRACT] User override: ${months} months`);
  }, []);

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `foamingDrain_${fieldName}`,
      productName: `Foaming Drain - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: state.standardDrainCount || 1,
      frequency: state.frequency || ''
    });

    console.log(`📝 [FOAMING-DRAIN-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [state.standardDrainCount, state.frequency]);

  const quote = useMemo<FoamingDrainQuoteResult>(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    // Map backend config to expected format with proper fallbacks
    const activeConfig = {
      standardDrainRate: backendConfig?.standardPricing?.standardDrainRate ?? cfg.standardDrainRate,
      altBaseCharge: backendConfig?.standardPricing?.alternateBaseCharge ?? cfg.altBaseCharge,
      altExtraPerDrain: backendConfig?.standardPricing?.alternateExtraPerDrain ?? cfg.altExtraPerDrain,
      volumePricing: {
        minimumDrains: backendConfig?.volumePricing?.minimumDrains ?? cfg.volumePricing.minimumDrains,
        weeklyRatePerDrain: backendConfig?.volumePricing?.weeklyRatePerDrain ?? cfg.volumePricing.weekly.ratePerDrain,
        bimonthlyRatePerDrain: backendConfig?.volumePricing?.bimonthlyRatePerDrain ?? cfg.volumePricing.bimonthly.ratePerDrain,
      },
      grease: {
        weeklyRatePerTrap: backendConfig?.greaseTrapPricing?.weeklyRatePerTrap ?? cfg.grease.weeklyRatePerTrap,
        installPerTrap: backendConfig?.greaseTrapPricing?.installPerTrap ?? cfg.grease.installPerTrap,
      },
      green: {
        weeklyRatePerDrain: backendConfig?.greenDrainPricing?.weeklyRatePerDrain ?? cfg.green.weeklyRatePerDrain,
        installPerDrain: backendConfig?.greenDrainPricing?.installPerDrain ?? cfg.green.installPerDrain,
      },
      plumbing: {
        weeklyAddonPerDrain: backendConfig?.addOns?.plumbingWeeklyAddonPerDrain ?? cfg.plumbing.weeklyAddonPerDrain,
      },
      installationRules: {
        filthyMultiplier: backendConfig?.installationMultipliers?.filthyMultiplier ?? cfg.installationRules.filthyMultiplier,
      },
      tripCharges: backendConfig?.tripCharges ?? cfg.tripCharges,
      contract: backendConfig?.contract ?? cfg.contract,
      defaultFrequency: backendConfig?.defaultFrequency ?? cfg.defaultFrequency,
      allowedFrequencies: backendConfig?.allowedFrequencies ?? cfg.allowedFrequencies,
      // ✅ NEW: Transform backend frequencyMetadata
      billingConversions: transformBackendFrequencyMeta(backendConfig?.frequencyMetadata),
    };

    if (!backendConfig) {
      console.warn('⚠️ [Foaming Drain] Using fallback config - backend not loaded yet');
    } else {
      console.log('✅ [Foaming Drain] Using backend config with transformed frequency metadata:', {
        standardPricing: activeConfig.standardDrainRate,
        volumePricing: activeConfig.volumePricing,
        billingConversions: activeConfig.billingConversions,
      });
    }

    // ---------- 1) Normalize inputs ----------
    const standardDrains = Math.max(0, Number(state.standardDrainCount) || 0);
    const installRequested = Math.max(
      0,
      Number(state.installDrainCount) || 0
    );
    const filthyRequested = Math.max(
      0,
      Number(state.filthyDrainCount) || 0
    );
    const greaseTraps = Math.max(0, Number(state.greaseTrapCount) || 0);
    const greenDrains = Math.max(0, Number(state.greenDrainCount) || 0);
    const plumbingDrains = Math.max(
      0,
      Number(state.plumbingDrainCount) || 0
    );

    const frequency: FoamingDrainFrequency =
      state.frequency || DEFAULT_FREQUENCY;
    const location: FoamingDrainLocation = state.location || "standard";
    const condition: FoamingDrainCondition =
      state.facilityCondition || "normal";

    const isWeekly = frequency === "weekly";
    const isVolume = standardDrains >= activeConfig.volumePricing.minimumDrains;  // ✅ FROM BACKEND
    const canUseInstallProgram =
      isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive;

    // Install-level drains: only when volume program is valid
    const installDrains = canUseInstallProgram
      ? Math.min(installRequested, standardDrains)
      : 0;

    const normalStandardDrains = Math.max(standardDrains - installDrains, 0);

    // When all-inclusive, standard drains are included for free
    const standardDrainsActive = state.isAllInclusive ? 0 : normalStandardDrains;

    // Filthy drain count is subset of standard drains
    let filthyDrains = 0;
    if (condition === "filthy" && standardDrainsActive > 0) {
      if (filthyRequested > 0) {
        filthyDrains = Math.min(filthyRequested, standardDrainsActive);
      } else {
        // 0 means "all" in this UI when filthy mode is on
        filthyDrains = standardDrainsActive;
      }
    }

    // ========== EFFECTIVE VALUES (use custom overrides if set, otherwise base values) ==========
    const effectiveStandardDrainRate = state.customRatePerDrain ?? state.standardDrainRate;
    const effectiveAltBaseCharge = state.customAltBaseCharge ?? state.altBaseCharge;
    const effectiveAltExtraPerDrain = state.customAltExtraPerDrain ?? state.altExtraPerDrain;
    const effectiveVolumeWeeklyRate = state.customVolumeWeeklyRate ?? state.volumeWeeklyRate;
    const effectiveVolumeBimonthlyRate = state.customVolumeBimonthlyRate ?? state.volumeBimonthlyRate;
    const effectiveGreaseWeeklyRate = state.customGreaseWeeklyRate ?? state.greaseWeeklyRate;
    const effectiveGreaseInstallRate = state.customGreaseInstallRate ?? state.greaseInstallRate;
    const effectiveGreenWeeklyRate = state.customGreenWeeklyRate ?? state.greenWeeklyRate;
    const effectiveGreenInstallRate = state.customGreenInstallRate ?? state.greenInstallRate;
    const effectivePlumbingAddonRate = state.customPlumbingAddonRate ?? state.plumbingAddonRate;
    const effectiveFilthyMultiplier = state.customFilthyMultiplier ?? state.filthyMultiplier;

    console.log('🔧 [FOAMING-DRAIN-CALC] Using effective values:', {
      effectiveStandardDrainRate,
      effectiveAltBaseCharge,
      effectiveAltExtraPerDrain,
      effectiveVolumeWeeklyRate,
      effectiveVolumeBimonthlyRate,
      effectiveGreaseWeeklyRate,
      effectiveGreaseInstallRate,
      effectiveGreenWeeklyRate,
      effectiveGreenInstallRate,
      effectivePlumbingAddonRate,
      effectiveFilthyMultiplier,
    });

    // ---------- 2) Standard drain pricing ----------
    const tenTotal = standardDrainsActive * effectiveStandardDrainRate;  // ✅ USE EFFECTIVE VALUE
    const altTotal =
      standardDrainsActive > 0
        ? effectiveAltBaseCharge + effectiveAltExtraPerDrain * standardDrainsActive  // ✅ USE EFFECTIVE VALUES
        : 0;

    let usedSmallAlt = false;
    let usedBigAccountAlt = false;
    let useAltPricing = false;

    if (standardDrainsActive > 0 && !state.isAllInclusive) {
      if (state.useSmallAltPricingWeekly) {
        // Force 20 + 4$/drain
        useAltPricing = true;
        usedSmallAlt = true;
      } else if (state.useBigAccountTenWeekly) {
        // Force $10/drain
        useAltPricing = false;
        usedBigAccountAlt = true;
      } else {
        // Auto choose cheaper between 10$/drain vs 20+4$/drain
        if (altTotal > 0 && altTotal < tenTotal) {
          useAltPricing = true;
          usedSmallAlt = true;
        } else {
          useAltPricing = false;
        }
      }
    }

    const weeklyStandardDrains = state.isAllInclusive
      ? 0
      : useAltPricing
      ? altTotal
      : tenTotal;

    // ---------- 3) Install-level drains (10+ program) ----------
    // IMPORTANT: drains are always serviced at their install frequency.
    // The Install Frequency selector is used to decide the install-program rate:
    //   Weekly  → $20 / install drain
    //   Monthly → $10 / install drain (treated as bimonthly rate for compatibility)
    let weeklyInstallDrains = 0;
    let volumePricingApplied = false;

    if (installDrains > 0 && canUseInstallProgram) {
      volumePricingApplied = true;

      // ✅ UPDATED: Use correct backend pricing structure for install frequencies
      const perDrainRate =
        state.installFrequency === "bimonthly"
          ? effectiveVolumeBimonthlyRate  // ✅ USE EFFECTIVE VALUE (custom override if set)
          : effectiveVolumeWeeklyRate;    // ✅ USE EFFECTIVE VALUE (custom override if set)

      weeklyInstallDrains = perDrainRate * installDrains;
    }

    // ---------- 4) Plumbing add-on ----------
    const weeklyPlumbing =
      state.needsPlumbing && plumbingDrains > 0
        ? plumbingDrains * effectivePlumbingAddonRate  // ✅ USE EFFECTIVE VALUE
        : 0;

    // ---------- 5) Grease & green weekly service ----------
    const weeklyGreaseTraps =
      greaseTraps > 0 ? greaseTraps * effectiveGreaseWeeklyRate : 0;  // ✅ USE EFFECTIVE VALUE
    const weeklyGreenDrains =
      greenDrains > 0 ? greenDrains * effectiveGreenWeeklyRate : 0;  // ✅ USE EFFECTIVE VALUE

    // ---------- 6) Total weekly service (no trip) ----------
    const weeklyServiceRaw =
      weeklyStandardDrains +
      weeklyInstallDrains +
      weeklyPlumbing +
      weeklyGreaseTraps +
      weeklyGreenDrains;

    // ✅ NEW: Apply minimum charge per visit from backend ONLY when there's actual service
    const minimumChargePerVisit = backendConfig?.minimumChargePerVisit ?? 50; // Default $50
    const weeklyServiceBeforeMin = round2(weeklyServiceRaw);
    const weeklyService = weeklyServiceRaw > 0 ? Math.max(weeklyServiceBeforeMin, minimumChargePerVisit) : 0;
    const tripCharge = 0; // Trip charge removed from math
    const weeklyTotal = weeklyService; // (service only)

    // ---------- 7) One-time installation ----------

    // 7a) Filthy standard drains installation
    //     FilthyInstall = (weekly cost for filthy drains) × filthyMultiplier (usually 3)
    //     ✅ WAIVED when "$10/drain for all standard drains" checkbox is enabled
    let filthyInstallOneTime = 0;

    if (condition === "filthy" && standardDrainsActive > 0 && !state.useBigAccountTenWeekly) {
      // How many drains are filthy?
      const filthyDrainCount =
        filthyDrains > 0 && filthyDrains <= standardDrainsActive
          ? filthyDrains
          : standardDrainsActive;

      let weeklyFilthyCost = 0;

      if (useAltPricing) {
        // Alt weekly for those filthy drains: $20 + $4/drain
        weeklyFilthyCost =
          effectiveAltBaseCharge + effectiveAltExtraPerDrain * filthyDrainCount;  // ✅ USE EFFECTIVE VALUES
      } else {
        // Standard pricing: standardDrainRate × filthyDrains
        weeklyFilthyCost = effectiveStandardDrainRate * filthyDrainCount;  // ✅ USE EFFECTIVE VALUE
      }

      filthyInstallOneTime =
        weeklyFilthyCost * effectiveFilthyMultiplier; // ✅ USE EFFECTIVE VALUE (custom override if set, usually ×3)
    }

    // 7b) Grease traps install – $300 × #traps (one-time)
    const greaseInstallOneTime =
      state.chargeGreaseTrapInstall && greaseTraps > 0
        ? effectiveGreaseInstallRate * greaseTraps  // ✅ USE EFFECTIVE VALUE
        : 0;

    // 7c) Green drains install – $100 × #drains (one-time)
    const greenInstallOneTime =
      greenDrains > 0 ? effectiveGreenInstallRate * greenDrains : 0;  // ✅ USE EFFECTIVE VALUE

    const installationRaw =
      filthyInstallOneTime + greaseInstallOneTime + greenInstallOneTime;
    const installation = round2(installationRaw);

    // ✅ Apply custom installation override early for dependent calculations
    const effectiveInstallation = state.customInstallationTotal ?? installation;

    // ---------- 7d) FIRST VISIT LOGIC ----------
    // ✅ FIXED: First visit = Installation + Services that don't have installation fees
    // Services WITH installation fees (being installed on first visit):
    //   - Filthy standard drains (if filthy condition)
    //   - Grease traps (if grease install is enabled)
    //   - Green drains (always have install fee)
    // Services WITHOUT installation fees (serviced on first visit):
    //   - Install drains (recurring cost, no install fee)
    //   - Plumbing (add-on service)
    //   - Standard drains (if normal condition - no filthy install)
    //   - Grease traps (if grease install is NOT enabled)

    let firstVisitServiceRaw = weeklyInstallDrains + weeklyPlumbing;

    // Add standard drains if normal condition (no filthy install)
    if (condition === "normal") {
      firstVisitServiceRaw += weeklyStandardDrains;
    }

    // Add grease traps if grease install is NOT enabled
    if (!state.chargeGreaseTrapInstall) {
      firstVisitServiceRaw += weeklyGreaseTraps;
    }

    // Green drains ALWAYS have installation fee, so never add to first visit service

    const firstVisitService = round2(firstVisitServiceRaw);
    let firstVisitPrice = effectiveInstallation + firstVisitService;
    firstVisitPrice = round2(firstVisitPrice);

    // ---------- 8) Monthly & contract logic ----------
    const contractMonths = clamp(
      Number(state.contractMonths) || activeConfig.contract.defaultMonths,  // ✅ USE BACKEND
      activeConfig.contract.minMonths,  // ✅ USE BACKEND
      activeConfig.contract.maxMonths   // ✅ USE BACKEND
    );

    // ✅ Get frequency multiplier from backend-transformed billing conversions
    const getFrequencyMultiplier = (freq: string) => {
      const normalized = freq.toLowerCase().replace(/\s+/g, '');

      switch (normalized) {
        case 'onetime':
          return activeConfig.billingConversions.oneTime?.monthlyMultiplier ?? 0;
        case 'weekly':
          return activeConfig.billingConversions.weekly?.monthlyMultiplier ?? 4.33;
        case 'biweekly':
          return activeConfig.billingConversions.biweekly?.monthlyMultiplier ?? 2.165;
        case 'twicepermonth':
          return activeConfig.billingConversions.twicePerMonth?.monthlyMultiplier ?? 2.0;
        case 'monthly':
          return activeConfig.billingConversions.monthly?.monthlyMultiplier ?? 1.0;
        case 'bimonthly':
          return activeConfig.billingConversions.bimonthly?.monthlyMultiplier ?? 0.5;
        case 'quarterly':
          return activeConfig.billingConversions.quarterly?.monthlyMultiplier ?? 0.333;
        case 'biannual':
          return activeConfig.billingConversions.biannual?.monthlyMultiplier ?? 0.167;
        case 'annual':
          return activeConfig.billingConversions.annual?.monthlyMultiplier ?? 0.083;
        default:
          return 1.0;
      }
    };

    const frequencyMultiplier = getFrequencyMultiplier(frequency);

    // ✅ Apply custom override to per-visit price FIRST, before calculating monthly/contract
    // ⚠️ CRITICAL: Always enforce minimum charge when there's actual service, even on custom overrides
    const customOrCalculated = state.customWeeklyService ?? weeklyService;
    const effectiveWeeklyService = weeklyServiceRaw > 0
      ? Math.max(customOrCalculated, minimumChargePerVisit)
      : customOrCalculated; // If no service, don't enforce minimum (should be 0)

    let normalMonth = effectiveWeeklyService * frequencyMultiplier;
    let firstMonthPrice = 0;

    // First month includes installation if present (check effective installation for custom overrides)
    if (effectiveInstallation > 0) {
      firstMonthPrice = firstVisitPrice + effectiveWeeklyService * Math.max(0, frequencyMultiplier - 1);
    } else {
      firstMonthPrice = normalMonth;
    }

    normalMonth = round2(normalMonth);
    firstMonthPrice = round2(firstMonthPrice);

    // ✅ FIXED: Contract total calculation with proper bimonthly logic
    let contractTotalRaw = 0;
    const freqLower = frequency.toLowerCase();

    if (freqLower === "bimonthly") {
      // ✅ CORRECTED: Bimonthly = every 2 months = 6 visits in 12 months
      // When installation is present: Installation + 5 regular visits (not 6)
      const totalVisitsIn12Months = 6; // 12 months / 2 months per visit = 6 visits
      const contractVisitsForTerm = Math.round((contractMonths / 12) * totalVisitsIn12Months);

      if (effectiveInstallation > 0) {
        // First visit includes installation, remaining visits are regular service
        const remainingVisits = Math.max(contractVisitsForTerm - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
        console.log(`🔧 [Foaming Drain Bimonthly Contract] Fixed calculation: first visit=$${firstVisitPrice.toFixed(2)}, remaining ${remainingVisits} visits × $${effectiveWeeklyService.toFixed(2)} = $${contractTotalRaw.toFixed(2)}`);
      } else {
        // No installation: all visits are regular service
        contractTotalRaw = effectiveWeeklyService * contractVisitsForTerm;
        console.log(`🔧 [Foaming Drain Bimonthly Contract] No installation: ${contractVisitsForTerm} visits × $${effectiveWeeklyService.toFixed(2)} = $${contractTotalRaw.toFixed(2)}`);
      }
    } else if (freqLower === "quarterly") {
      // Quarterly: visits = months / 3
      const quarterlyVisits = contractMonths / 3;
      const totalVisits = Math.round(quarterlyVisits);

      if (effectiveInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
      } else {
        contractTotalRaw = effectiveWeeklyService * totalVisits;
      }
    } else if (freqLower === "biannual") {
      // Bi-annual: visits = months / 6
      const biannualVisits = contractMonths / 6;
      const totalVisits = Math.round(biannualVisits);

      if (effectiveInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
      } else {
        contractTotalRaw = effectiveWeeklyService * totalVisits;
      }
    } else if (freqLower === "annual") {
      // Annual: visits = months / 12
      const annualVisits = contractMonths / 12;
      const totalVisits = Math.round(annualVisits);

      if (effectiveInstallation > 0) {
        const remainingVisits = Math.max(totalVisits - 1, 0);
        contractTotalRaw = firstVisitPrice + (effectiveWeeklyService * remainingVisits);
      } else {
        contractTotalRaw = effectiveWeeklyService * totalVisits;
      }
    } else {
      // All other frequencies: FirstMonth + (Months − 1) × NormalMonth
      contractTotalRaw = firstMonthPrice + (contractMonths - 1) * normalMonth;
    }

    const contractTotal = round2(contractTotalRaw);

    // ✅ NEW: Add calc field totals AND dollar field totals directly to contract (no frequency dependency)
    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

    console.log(`📊 [FOAMING-DRAIN-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotal.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });

    // For compatibility with ServiceQuoteResult:
    // - monthlyRecurring  → Normal recurring month (NormalMonth)
    // - annualRecurring   → TOTAL CONTRACT for contractMonths
    const calculatedMonthlyRecurring = normalMonth;
    const calculatedContractTotal = contractTotalWithCustomFields;  // ✅ UPDATED: Use contract total with custom fields

    // ---------- 9) Breakdown ----------
    const breakdown: FoamingDrainBreakdown = {
      usedSmallAlt,
      usedBigAccountAlt,
      volumePricingApplied,

      weeklyStandardDrains: round2(weeklyStandardDrains),
      weeklyInstallDrains: round2(weeklyInstallDrains),
      weeklyGreaseTraps: round2(weeklyGreaseTraps),
      weeklyGreenDrains: round2(weeklyGreenDrains),
      weeklyPlumbing: round2(weeklyPlumbing),

      filthyInstallOneTime: round2(filthyInstallOneTime),
      greaseInstallOneTime: round2(greaseInstallOneTime),
      greenInstallOneTime: round2(greenInstallOneTime),

      tripCharge, // always 0 in new rules
    };

    // ---------- 10) Build quote ----------
    const quote: FoamingDrainQuoteResult = {
      serviceId: "foamingDrain",

      frequency,
      location,
      facilityCondition: condition,

      useSmallAltPricingWeekly: state.useSmallAltPricingWeekly,
      useBigAccountTenWeekly: state.useBigAccountTenWeekly,
      isAllInclusive: state.isAllInclusive,
      chargeGreaseTrapInstall: state.chargeGreaseTrapInstall,

      // ✅ Apply custom overrides in cascade:
      // 1. Per-visit can be customized
      // 2. Monthly/Contract are calculated from custom per-visit (if set), but can be further overridden
      weeklyService: effectiveWeeklyService,
      weeklyTotal: effectiveWeeklyService,
      monthlyRecurring: state.customMonthlyRecurring ?? calculatedMonthlyRecurring,
      annualRecurring: state.customContractTotal ?? calculatedContractTotal,
      installation: state.customInstallationTotal ?? installation,
      tripCharge,

      firstVisitPrice,
      firstMonthPrice: state.customFirstMonthPrice ?? firstMonthPrice,
      contractMonths,

      notes: state.notes || "",

      breakdown,

      // ✅ NEW: Export minimum charge for redline/greenline indicator
      minimumChargePerVisit,
    };

    return quote;
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    state.standardDrainCount,
    state.installDrainCount,
    state.filthyDrainCount,
    state.greaseTrapCount,
    state.greenDrainCount,
    state.plumbingDrainCount,
    state.needsPlumbing,
    state.frequency,
    state.installFrequency, // ✅ MISSING: Re-calculate when install frequency changes!
    state.facilityCondition,
    state.location,
    state.useSmallAltPricingWeekly,
    state.useBigAccountTenWeekly,
    state.isAllInclusive,
    state.chargeGreaseTrapInstall,
    state.tripChargeOverride,
    state.contractMonths,
    state.notes,
    // ✅ NEW: Editable rate fields (from backend)
    state.standardDrainRate,
    state.altBaseCharge,
    state.altExtraPerDrain,
    state.volumeWeeklyRate,
    state.volumeBimonthlyRate,
    state.greaseWeeklyRate,
    state.greaseInstallRate,
    state.greenWeeklyRate,
    state.greenInstallRate,
    state.plumbingAddonRate,
    state.filthyMultiplier,
    // ✅ CRITICAL: Custom RATE override fields (must be in dependencies for calculations to update!)
    state.customRatePerDrain,
    state.customAltBaseCharge,
    state.customAltExtraPerDrain,
    state.customVolumeWeeklyRate,
    state.customVolumeBimonthlyRate,
    state.customGreaseWeeklyRate,
    state.customGreaseInstallRate,
    state.customGreenWeeklyRate,
    state.customGreenInstallRate,
    state.customPlumbingAddonRate,
    state.customFilthyMultiplier,
    // ✅ Custom TOTAL override fields
    state.customWeeklyService,
    state.customInstallationTotal,
    state.customMonthlyRecurring,
    state.customFirstMonthPrice,
    state.customContractTotal,
    // ✅ NEW: Re-calculate when custom fields change
    calcFieldsTotal,
    dollarFieldsTotal,
  ]);

  const updateField = <K extends keyof FoamingDrainFormState>(
    key: K,
    value: FoamingDrainFormState[K]
  ) => {
    setState((prev) => {
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[key];

      const next = {
        ...prev,
        [key]: value,
      };

      // ✅ AUTO-CLEAR CUSTOM OVERRIDES when base inputs change
      // If user changes a base input (like drain counts), clear related custom totals
      if (
        key === 'standardDrainCount' ||
        key === 'installDrainCount' ||
        key === 'filthyDrainCount' ||
        key === 'greaseTrapCount' ||
        key === 'greenDrainCount' ||
        key === 'plumbingDrainCount' ||
        key === 'frequency' ||
        key === 'facilityCondition' ||
        key === 'useSmallAltPricingWeekly' ||
        key === 'useBigAccountTenWeekly' ||
        key === 'isAllInclusive' ||
        key === 'chargeGreaseTrapInstall' ||
        key === 'needsPlumbing' ||
        key === 'contractMonths'
      ) {
        // Clear all custom overrides when base inputs change
        next.customStandardDrainTotal = undefined;
        next.customGreaseTrapTotal = undefined;
        next.customGreenDrainTotal = undefined;
        next.customPlumbingTotal = undefined;
        next.customFilthyInstall = undefined;
        next.customGreaseInstall = undefined;
        next.customGreenInstall = undefined;
        next.customWeeklyService = undefined;
        next.customInstallationTotal = undefined;
        next.customMonthlyRecurring = undefined;
        next.customFirstMonthPrice = undefined;
        next.customContractTotal = undefined;
      }

      // Also clear custom overrides when pricing rates change
      if (
        key === 'standardDrainRate' ||
        key === 'altBaseCharge' ||
        key === 'altExtraPerDrain' ||
        key === 'volumeWeeklyRate' ||
        key === 'volumeBimonthlyRate' ||
        key === 'greaseWeeklyRate' ||
        key === 'greaseInstallRate' ||
        key === 'greenWeeklyRate' ||
        key === 'greenInstallRate' ||
        key === 'plumbingAddonRate' ||
        key === 'filthyMultiplier'
      ) {
        // Clear custom overrides when rates change
        next.customStandardDrainTotal = undefined;
        next.customGreaseTrapTotal = undefined;
        next.customGreenDrainTotal = undefined;
        next.customPlumbingTotal = undefined;
        next.customFilthyInstall = undefined;
        next.customGreaseInstall = undefined;
        next.customGreenInstall = undefined;
        next.customWeeklyService = undefined;
        next.customInstallationTotal = undefined;
        next.customMonthlyRecurring = undefined;
        next.customFirstMonthPrice = undefined;
        next.customContractTotal = undefined;
      }

      // ✅ FIXED: Log ALL price changes for numeric pricing fields
      // Log changes to BASE editable fields (these are what the user actually types)
      const baseEditableFields = [
        'standardDrainRate', 'altBaseCharge', 'altExtraPerDrain',
        'volumeWeeklyRate', 'volumeBimonthlyRate', 'greaseWeeklyRate', 'greaseInstallRate',
        'greenWeeklyRate', 'greenInstallRate', 'plumbingAddonRate', 'filthyMultiplier'
      ];

      // ✅ CRITICAL: Log changes to CUSTOM RATE OVERRIDE fields (set by user editing in UI)
      const customRateOverrideFields = [
        'customRatePerDrain', 'customAltBaseCharge', 'customAltExtraPerDrain',
        'customVolumeWeeklyRate', 'customVolumeBimonthlyRate',
        'customGreaseWeeklyRate', 'customGreaseInstallRate',
        'customGreenWeeklyRate', 'customGreenInstallRate',
        'customPlumbingAddonRate', 'customFilthyMultiplier'
      ];

      // Log changes to CUSTOM TOTAL override fields (set programmatically)
      const customTotalOverrideFields = [
        'customWeeklyService', 'customInstallationTotal', 'customMonthlyRecurring',
        'customFirstMonthPrice', 'customContractTotal'
      ];

      const allPricingFields = [...baseEditableFields, ...customRateOverrideFields, ...customTotalOverrideFields];

      // ✅ EXPLICIT: Map custom field names to base field names for baseline lookup
      const customToBaseFieldMap: Record<string, string> = {
        'customRatePerDrain': 'standardDrainRate',
        'customAltBaseCharge': 'altBaseCharge',
        'customAltExtraPerDrain': 'altExtraPerDrain',
        'customVolumeWeeklyRate': 'volumeWeeklyRate',
        'customVolumeBimonthlyRate': 'volumeBimonthlyRate',
        'customGreaseWeeklyRate': 'greaseWeeklyRate',
        'customGreaseInstallRate': 'greaseInstallRate',
        'customGreenWeeklyRate': 'greenWeeklyRate',
        'customGreenInstallRate': 'greenInstallRate',
        'customPlumbingAddonRate': 'plumbingAddonRate',
        'customFilthyMultiplier': 'filthyMultiplier',
        'customWeeklyService': 'standardDrainRate',
        'customInstallationTotal': 'filthyMultiplier',
        'customFirstMonthPrice': 'standardDrainRate',
        'customMonthlyRecurring': 'standardDrainRate',
        'customContractTotal': 'standardDrainRate',
      };

      if (allPricingFields.includes(key as string)) {
        const newValue = value as number | undefined;
        const keyStr = key as string;

        // ✅ FIXED: Always use base field name for baseline lookup
        const baseFieldForLookup = customToBaseFieldMap[keyStr] || keyStr;
        const baselineValue = baselineValues.current[baseFieldForLookup];

        console.log(`🔍 [FOAMING-DRAIN-LOGGING] Field: ${keyStr}`, {
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
          console.log(`📝 [FOAMING-DRAIN-BASELINE-LOG] Logging change for ${keyStr}:`, {
            baseline: baselineValue,
            newValue,
            change: newValue - baselineValue,
            changePercent: ((newValue - baselineValue) / baselineValue * 100).toFixed(1) + '%'
          });
          addServiceFieldChange(keyStr, baselineValue, newValue);
        } else {
          console.log(`⚠️ [FOAMING-DRAIN-LOGGING] NOT logging for ${keyStr}:`, {
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
        'drainsPerWeek', 'contractMonths',
        // Selection fields
        'frequency', 'location', 'condition', 'rateTier'
      ];

      // Log non-pricing field changes
      if (allFormFields.includes(key as string)) {
        logServiceFieldChanges(
          'foamingDrain',
          'Foaming Drain',
          { [key]: value },
          { [key]: originalValue },
          [key as string],
          next.drainsPerWeek || 1,
          next.frequency || 'weekly'
        );
      }

      return next;
    });
  };

  const reset = () => {
    setState({
      ...DEFAULT_FOAMING_DRAIN_FORM_STATE,
      serviceId: "foamingDrain",
    });
  };

  return {
    state,
    quote,
    updateField,
    reset,
    refreshConfig: () => fetchPricing(true), // ✅ FIXED: Force refresh when button clicked
    isLoadingConfig,
    backendConfig, // ✅ EXPOSE: Backend config for dynamic thresholds
    setContractMonths, // ✅ NEW: Contract months with override support
  };
}

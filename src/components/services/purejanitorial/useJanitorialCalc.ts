// src/features/services/janitorial/useJanitorialCalc.ts
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type {
  JanitorialRateCategory,
  SchedulingMode,
  ServiceType,
  JanitorialFormState,
} from "./janitorialTypes";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";

// ✅ Backend tiered pricing structure
interface TieredPricingTier {
  upToMinutes?: number;
  upToHours?: number;
  price?: number;
  ratePerHour?: number;
  description: string;
  addonOnly?: boolean;
  standalonePrice?: number;
}

// ✅ Backend config interface matching the EXACT MongoDB JSON structure provided
interface BackendJanitorialConfig {
  standardHourlyPricing: {
    standardHourlyRate: number; // 30
    minimumHoursPerTrip: number; // 4
  };
  shortJobHourlyPricing: {
    shortJobHourlyRate: number; // 50
  };
  vacuuming: {
    estimatedTimeHoursPerJob: number; // 1
    largeJobMinimumTimeHours: number; // 1
  };
  dusting: {
    itemsPerHour: number; // 30
    pricePerItem: number; // 1
    dirtyFirstTimeMultiplier: number; // 3
    infrequentServiceMultiplier4PerYear: number; // 3
  };
  smoothBreakdownPricingTable: TieredPricingTier[];
  minimumChargePerVisit: number; // 50
  tripCharges: {
    standard: number; // 0
    beltway: number; // 0
  };
  contract: {
    minMonths: number; // 2
    maxMonths: number; // 36
  };
  frequencyMetadata: {
    weekly: {
      monthlyRecurringMultiplier: number; // 4.33
      firstMonthExtraMultiplier: number; // 3.33
    };
    biweekly: {
      monthlyRecurringMultiplier: number; // 2.165
      firstMonthExtraMultiplier: number; // 1.165
    };
    bimonthly: { cycleMonths: number }; // 2
    quarterly: { cycleMonths: number }; // 3
    biannual: { cycleMonths: number }; // 6
    annual: { cycleMonths: number }; // 12
    monthly: { cycleMonths: number }; // 0 - special case
  };
}

export interface JanitorialCalcResult {
  totalHours: number;
  perVisit: number;
  weekly: number; // ✅ Added for weekly total display
  monthly: number;
  firstMonth: number; // ✅ Added for first month display
  recurringMonthly: number; // ✅ Added for ongoing monthly display
  annual: number;
  firstVisit: number;
  ongoingMonthly: number;
  contractTotal: number;
  minimumChargePerVisit: number; // ✅ NEW: Minimum charge for red/green line indicator
  breakdown: {
    manualHours: number;
    vacuumingHours: number;
    dustingHours: number;
    pricingMode: string;
    basePrice: number;
    appliedMultiplier: number;
    installationFee?: number;
    monthlyVisits?: number;
  };
}

const DEFAULT_FORM_STATE: JanitorialFormState = {
  manualHours: 0,
  schedulingMode: "normalRoute",
  serviceType: "recurring", // Default to recurring service
  vacuumingHours: 0,
  // ✅ NEW: Changed dusting from dustingPlaces to places + calculated hours
  dustingTotalPlaces: 0,        // Total places needed (user input)
  dustingCalculatedHours: 0,    // Calculated automatically (totalPlaces ÷ placesPerHour)
  dirtyInitial: false,
  frequency: cfg.defaultFrequency,
  visitsPerWeek: 1, // Default to once per week
  rateCategory: "redRate",
  contractMonths: cfg.minContractMonths ?? 12,
  addonTimeMinutes: 0, // Add-on time for one-time service
  installation: false, // Installation checkbox for recurring service

  // ✅ NEW: Editable pricing rates from config (will be overridden by backend)
  baseHourlyRate: cfg.baseHourlyRate,
  shortJobHourlyRate: cfg.shortJobHourlyRate,
  minHoursPerVisit: cfg.minHoursPerVisit,
  weeksPerMonth: cfg.weeksPerMonth,
  dirtyInitialMultiplier: cfg.dirtyInitialMultiplier,
  infrequentMultiplier: cfg.infrequentMultiplier,
  dustingPlacesPerHour: cfg.dustingPlacesPerHour,
  dustingPricePerPlace: cfg.dustingPricePerPlace, // DEPRECATED: kept for compatibility
  vacuumingDefaultHours: cfg.vacuumingDefaultHours,
  redRateMultiplier: cfg.rateCategories.redRate.multiplier,
  greenRateMultiplier: cfg.rateCategories.greenRate.multiplier,

  // ✅ NEW: Custom pricing overrides (for yellow highlighting)
  customBaseHourlyRate: undefined,
  customShortJobHourlyRate: undefined,
  customMinHoursPerVisit: undefined,
  customDustingPlacesPerHour: undefined,
};

/**
 * Calculate add-on time price based on BACKEND tiered pricing table
 *
 * ✅ 100% DYNAMIC - Uses backend tieredPricing array
 * No hardcoded values!
 */
function calculateAddonTimePrice(
  minutes: number,
  tieredPricing: TieredPricingTier[],
  isAddon: boolean = true
): number {
  console.log(`🔧 calculateAddonTimePrice called:`, {
    minutes,
    tieredPricingLength: tieredPricing?.length || 0,
    isAddon,
    firstTier: tieredPricing?.[0]
  });

  if (minutes <= 0 || !tieredPricing || tieredPricing.length === 0) {
    console.log(`⚠️ Early return: minutes=${minutes}, tieredPricing=${!!tieredPricing}, length=${tieredPricing?.length}`);
    return 0;
  }

  const hours = minutes / 60;

  // Find the matching tier from backend config
  for (const tier of tieredPricing) {
    console.log(`🔍 Checking tier:`, tier);

    // Check minute-based tiers (0-15 min, 15-30 min)
    if (tier.upToMinutes !== undefined && minutes <= tier.upToMinutes) {
      console.log(`✅ Matched minute tier: ${tier.upToMinutes} mins, price: ${tier.price}`);
      // Handle addon vs standalone pricing
      if (!isAddon && tier.standalonePrice !== undefined) {
        console.log(`✅ Using standalone price: ${tier.standalonePrice}`);
        return tier.standalonePrice;
      }
      console.log(`✅ Using regular price: ${tier.price}`);
      return tier.price || 0;
    }

    // Check hour-based tiers (1hr, 2hr, 3hr, 4hr, etc.)
    if (tier.upToHours !== undefined && hours <= tier.upToHours) {
      console.log(`✅ Matched hour tier: ${tier.upToHours} hrs`);
      // If tier has ratePerHour (for 4+ hours), calculate dynamically
      if (tier.ratePerHour !== undefined) {
        const calculated = hours * tier.ratePerHour;
        console.log(`✅ Using hourly rate: ${tier.ratePerHour}/hr * ${hours} = ${calculated}`);
        return calculated;
      }
      // Otherwise use fixed price
      console.log(`✅ Using fixed hour price: ${tier.price}`);
      return tier.price || 0;
    }
  }

  // Fallback: if no tier matches, return 0
  console.log(`❌ No tier matched for ${minutes} minutes`);
  return 0;
}

/**
 * ✅ NEW: Default tiered pricing structure matching frontend expectations
 */
function getDefaultTieredPricing(): TieredPricingTier[] {
  return [
    { upToMinutes: 15, price: 10, description: "0-15 minutes", addonOnly: true },
    { upToMinutes: 30, price: 20, description: "15-30 minutes", addonOnly: true, standalonePrice: 35 },
    { upToHours: 1, price: 50, description: "30 min - 1 hour" },
    { upToHours: 2, price: 80, description: "1-2 hours" },
    { upToHours: 3, price: 100, description: "2-3 hours" },
    { upToHours: 4, price: 120, description: "3-4 hours" },
    { upToHours: 999, ratePerHour: 30, description: "4+ hours" },
  ];
}

/**
 * ✅ NEW: Transform backend tiered pricing to frontend expected structure
 * Handles the actual backend JSON structure with smoothBreakdownPricingTable
 */
function transformTieredPricing(backendTiers: any[] | undefined): TieredPricingTier[] | null {
  if (!Array.isArray(backendTiers) || backendTiers.length === 0) {
    console.warn('⚠️ Backend smoothBreakdownPricingTable is not an array or is empty, using default structure');
    return null;
  }

  console.log('🔧 Transforming backend smoothBreakdownPricingTable:', backendTiers);

  const transformedTiers: TieredPricingTier[] = [];

  for (const tier of backendTiers) {
    if (!tier || typeof tier !== 'object') continue;

    // Handle the backend structure directly (already in correct format)
    if (tier.upToMinutes !== undefined) {
      transformedTiers.push({
        upToMinutes: tier.upToMinutes,
        price: tier.price,
        description: tier.description || `0-${tier.upToMinutes} minutes`,
        addonOnly: tier.addonOnly,
        standalonePrice: tier.standalonePrice,
      });
    } else if (tier.upToHours !== undefined) {
      transformedTiers.push({
        upToHours: tier.upToHours,
        price: tier.price,
        ratePerHour: tier.ratePerHour,
        description: tier.description || `Up to ${tier.upToHours} hour${tier.upToHours !== 1 ? 's' : ''}`,
        addonOnly: tier.addonOnly,
        standalonePrice: tier.standalonePrice,
      });
    } else {
      console.warn('⚠️ Unrecognized tier format:', tier);
    }
  }

  console.log('✅ Transformed smoothBreakdownPricingTable:', transformedTiers);
  return transformedTiers.length > 0 ? transformedTiers : null;
}

export function useJanitorialCalc(initialData?: Partial<JanitorialFormState>, customFields?: any[]) {
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

    console.log(`💰 [JANITORIAL-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [JANITORIAL-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  const [form, setForm] = useState<JanitorialFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM_STATE,
      ...initialData,
    };

    // ✅ FIXED: Always use global contract months if available (not just when initially active)
    const defaultContractMonths = initialData?.contractMonths
      ? initialData.contractMonths
      : servicesContext?.globalContractMonths
        ? servicesContext.globalContractMonths
        : cfg.minContractMonths ?? 12;

    return {
      ...baseForm,
      contractMonths: defaultContractMonths,
    };
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendJanitorialConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const isEditMode = Boolean(initialData && Object.keys(initialData).length > 0);
  const forceOverrideConfigRef = useRef(false);

  const pricingBaselines = useMemo(() => ({
    baseHourlyRate: backendConfig?.standardHourlyPricing?.standardHourlyRate ?? cfg.baseHourlyRate,
    shortJobHourlyRate: backendConfig?.shortJobHourlyPricing?.shortJobHourlyRate ?? cfg.shortJobHourlyRate,
    minHoursPerVisit: backendConfig?.standardHourlyPricing?.minimumHoursPerTrip ?? cfg.minHoursPerVisit,
    dustingPlacesPerHour: backendConfig?.dusting?.itemsPerHour ?? cfg.dustingPlacesPerHour,
  }), [backendConfig]);

  // Helper function to update form with config data from new backend structure
  const updateFormWithConfig = (
    config: BackendJanitorialConfig,
    options?: { forceOverride?: boolean }
  ) => {
    setForm((prev) => {
      const shouldOverrideConfigValues =
        (options?.forceOverride ?? false) || !isEditMode;

      const applyConfigValue = (prevValue: number, configValue?: number) =>
        shouldOverrideConfigValues ? (configValue ?? prevValue) : prevValue;

      return {
        ...prev,
        // Extract from nested backend structure
        baseHourlyRate: applyConfigValue(
          prev.baseHourlyRate,
          config.standardHourlyPricing?.standardHourlyRate
        ),
        shortJobHourlyRate: applyConfigValue(
          prev.shortJobHourlyRate,
          config.shortJobHourlyPricing?.shortJobHourlyRate
        ),
        minHoursPerVisit: applyConfigValue(
          prev.minHoursPerVisit,
          config.standardHourlyPricing?.minimumHoursPerTrip
        ),
        weeksPerMonth: applyConfigValue(
          prev.weeksPerMonth,
          config.frequencyMetadata?.weekly?.monthlyRecurringMultiplier
        ),
        dustingPlacesPerHour: applyConfigValue(
          prev.dustingPlacesPerHour,
          config.dusting?.itemsPerHour
        ),
        dustingPricePerPlace: applyConfigValue(
          prev.dustingPricePerPlace,
          config.dusting?.pricePerItem
        ),
        vacuumingDefaultHours: applyConfigValue(
          prev.vacuumingDefaultHours,
          config.vacuuming?.estimatedTimeHoursPerJob
        ),
        // Add new fields from backend
        dirtyInitialMultiplier: applyConfigValue(
          prev.dirtyInitialMultiplier,
          config.dusting?.dirtyFirstTimeMultiplier
        ),
        infrequentMultiplier: applyConfigValue(
          prev.infrequentMultiplier,
          config.dusting?.infrequentServiceMultiplier4PerYear
        ),
      };
    });
  };

  useEffect(() => {
    setForm(prev => {
      const customBase = prev.baseHourlyRate !== pricingBaselines.baseHourlyRate
        ? prev.baseHourlyRate
        : undefined;
      const customShort = prev.shortJobHourlyRate !== pricingBaselines.shortJobHourlyRate
        ? prev.shortJobHourlyRate
        : undefined;
      const customMin = prev.minHoursPerVisit !== pricingBaselines.minHoursPerVisit
        ? prev.minHoursPerVisit
      : undefined;
      const customDusting = prev.dustingPlacesPerHour !== pricingBaselines.dustingPlacesPerHour
        ? prev.dustingPlacesPerHour
        : undefined;

      if (
        prev.customBaseHourlyRate === customBase &&
        prev.customShortJobHourlyRate === customShort &&
        prev.customMinHoursPerVisit === customMin
      ) {
        return prev;
      }

      return {
        ...prev,
        customBaseHourlyRate: customBase,
        customShortJobHourlyRate: customShort,
        customMinHoursPerVisit: customMin,
        customDustingPlacesPerHour: customDusting,
      };
    });
  }, [pricingBaselines]);

  // ⚡ OPTIMIZED: Fetch pricing config from context (NO API call)
  const fetchPricing = async (forceRefresh: boolean = false) => {
    const shouldForceOverrideConfig = forceOverrideConfigRef.current || forceRefresh;
    forceOverrideConfigRef.current = false;
    setIsLoadingConfig(true);
    try {
      // ⚡ Use context's backend pricing data directly (already loaded by useAllServicePricing)
      if (servicesContext?.getBackendPricingForService) {
        const backendData = servicesContext.getBackendPricingForService("pureJanitorial");
        if (backendData?.config) {
          console.log('✅ [PureJanitorial] Using cached pricing data from context');
          const rawConfig = backendData.config;

          // ✅ NEW: Transform backend data structure and extract smoothBreakdownPricingTable
          const config: BackendJanitorialConfig = {
            ...rawConfig,
            smoothBreakdownPricingTable: transformTieredPricing(rawConfig.smoothBreakdownPricingTable) || getDefaultTieredPricing()
          } as BackendJanitorialConfig;

          setBackendConfig(config);
          updateFormWithConfig(config, { forceOverride: shouldForceOverrideConfig });

          console.log('✅ PureJanitorial CONFIG loaded from context:', {
            baseHourlyRate: config.standardHourlyPricing?.standardHourlyRate,
            shortJobHourlyRate: config.shortJobHourlyPricing?.shortJobHourlyRate,
            minHoursPerVisit: config.standardHourlyPricing?.minimumHoursPerTrip,
            weeksPerMonth: config.frequencyMetadata?.weekly?.monthlyRecurringMultiplier,
            dustingPlacesPerHour: config.dusting?.itemsPerHour,
            dustingPricePerPlace: config.dusting?.pricePerItem,
            vacuumingDefaultHours: config.vacuuming?.estimatedTimeHoursPerJob,
            tieredPricing: config.smoothBreakdownPricingTable,
          });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available for PureJanitorial, using static fallback values');
    } catch (error) {
      console.error('❌ Failed to fetch PureJanitorial config from context:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("pureJanitorial");
        if (fallbackConfig?.config) {
          console.log('✅ [PureJanitorial] Using backend pricing data from context after error');
          const rawConfig = fallbackConfig.config;

          // ✅ NEW: Transform backend data structure and extract smoothBreakdownPricingTable
          const config: BackendJanitorialConfig = {
            ...rawConfig,
            smoothBreakdownPricingTable: transformTieredPricing(rawConfig.smoothBreakdownPricingTable) || getDefaultTieredPricing()
          } as BackendJanitorialConfig;

          setBackendConfig(config);
          updateFormWithConfig(config, { forceOverride: shouldForceOverrideConfig });
          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const refreshConfig = () => {
    fetchPricing(true); // Pass forceRefresh=true
  };

  // ✅ Fetch pricing configuration on mount ONLY if no initialData (new service)
  useEffect(() => {
    // Skip fetching if we have initialData (editing existing service with saved prices)
    if (initialData) {
      console.log('📋 [PURE-JANITORIAL-PRICING] Skipping price fetch - using saved historical prices from initialData');
      return;
    }

    console.log('📋 [PURE-JANITORIAL-PRICING] Fetching current prices - new service or no initial data');
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

  // ✅ NEW: Sync global contract months to service (unless service has explicitly overridden it)
  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef(false); // Track if service was previously active

  useEffect(() => {
    // Determine if service is active (has hours entered)
    const isServiceActive = (form.manualHours > 0) || (form.vacuumingHours > 0) || (form.dustingCalculatedHours > 0);
    const wasActive = wasActiveRef.current;

    // ✅ FIX: Detect transition from inactive to active
    const justBecameActive = isServiceActive && !wasActive;

    if (justBecameActive) {
      // Service just became active - adopt global contract months
      console.log(`📅 [PURE-JANITORIAL-CONTRACT] Service just became active, adopting global contract months`);
      if (servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
        const globalMonths = servicesContext.globalContractMonths;
        console.log(`📅 [PURE-JANITORIAL-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({
          ...prev,
          contractMonths: globalMonths,
        }));
      }
    } else if (isServiceActive && servicesContext?.globalContractMonths && !hasContractMonthsOverride.current) {
      // Service is already active - sync with global if it changes
      const globalMonths = servicesContext.globalContractMonths;
      if (form.contractMonths !== globalMonths) {
        console.log(`📅 [PURE-JANITORIAL-CONTRACT] Syncing global contract months: ${globalMonths}`);
        setForm(prev => ({
          ...prev,
          contractMonths: globalMonths,
        }));
      }
    }
    // ✅ IMPORTANT: If service is inactive, do NOT sync global months

    // Update the ref for next render
    wasActiveRef.current = isServiceActive;
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.manualHours, form.vacuumingHours, form.dustingCalculatedHours, servicesContext]);

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `pureJanitorial_${fieldName}`,
      productName: `Pure Janitorial - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.manualHours || form.vacuumingHours || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [PURE-JANITORIAL-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.manualHours, form.vacuumingHours, form.frequency]);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type } = e.target;
    const t: any = e.target;

    setForm((prev) => {
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[name as keyof JanitorialFormState];

      const next: JanitorialFormState = { ...prev };

      // ✅ NEW: Handle custom override fields for totals
      if (
        name === "customPerVisit" ||
        name === "customFirstVisit" ||
        name === "customMonthly" ||
        name === "customOngoingMonthly" ||
        name === "customContractTotal"
      ) {
        const numVal = t.value === '' ? undefined : parseFloat(t.value);
        if (numVal === undefined || !isNaN(numVal)) {
          (next as any)[name] = numVal;
        }
      } else if (type === "checkbox") {
        (next as any)[name] = t.checked;
      } else if (type === "number") {
        const raw = t.value;
        const num = raw === "" ? 0 : Number(raw);
        (next as any)[name] = Number.isFinite(num) && num >= 0 ? num : 0;

        // ✅ NEW: Track when user manually changes contract months
        if (name === "contractMonths") {
          hasContractMonthsOverride.current = true;
          console.log(`📅 [PURE-JANITORIAL-CONTRACT] User override: ${num} months`);
        }
      } else {
        (next as any)[name] = t.value;
      }

      // ✅ NEW: Auto-calculate dusting hours when total places or places per hour change
      if (name === 'dustingTotalPlaces' || name === 'dustingPlacesPerHour') {
        const totalPlaces = name === 'dustingTotalPlaces' ? (next.dustingTotalPlaces || 0) : prev.dustingTotalPlaces;
        const placesPerHour = name === 'dustingPlacesPerHour' ? (next.dustingPlacesPerHour || 0) : prev.dustingPlacesPerHour;

        next.dustingCalculatedHours = totalPlaces > 0 && placesPerHour > 0
          ? totalPlaces / placesPerHour
          : 0;

        console.log(`🔧 [Pure Janitorial] Auto-calculated dusting hours: ${totalPlaces} places ÷ ${placesPerHour} places/hr = ${next.dustingCalculatedHours.toFixed(2)} hours`);
      }

      // ✅ Log price override for numeric pricing fields
      const pricingFields = [
        'baseHourlyRate', 'shortJobHourlyRate', 'minHoursPerVisit', 'weeksPerMonth',
        'dirtyInitialMultiplier', 'infrequentMultiplier', 'dustingPlacesPerHour',
        'dustingPricePerPlace', 'vacuumingDefaultHours', 'redRateMultiplier', 'greenRateMultiplier',
        'customPerVisit', 'customFirstVisit', 'customMonthly', 'customOngoingMonthly', 'customContractTotal'
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

  const overrideMapping: Record<string, keyof JanitorialFormState> = {
    baseHourlyRate: 'customBaseHourlyRate',
    shortJobHourlyRate: 'customShortJobHourlyRate',
    minHoursPerVisit: 'customMinHoursPerVisit',
    dustingPlacesPerHour: 'customDustingPlacesPerHour',
  };

      if (overrideMapping[name]) {
        const overrideKey = overrideMapping[name];
        const baselineValue = (pricingBaselines as any)[name] ?? 0;
        const overriddenValue = (next as any)[name];
        (next as any)[overrideKey] =
          typeof overriddenValue === 'number' && overriddenValue !== baselineValue
            ? overriddenValue
            : undefined;
      }

      console.log(`📝 Form updated: ${name} =`, (next as any)[name]);
      return next;
    });
  };

  const calc: JanitorialCalcResult = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG OR FALLBACK ==========
    const activeConfig = backendConfig ? {
      // Extract values from nested backend structure
      baseHourlyRate: backendConfig.standardHourlyPricing?.standardHourlyRate ?? cfg.baseHourlyRate,
      shortJobHourlyRate: backendConfig.shortJobHourlyPricing?.shortJobHourlyRate ?? cfg.shortJobHourlyRate,
      minHoursPerVisit: backendConfig.standardHourlyPricing?.minimumHoursPerTrip ?? cfg.minHoursPerVisit,
      weeksPerMonth: backendConfig.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? cfg.weeksPerMonth,
      minContractMonths: backendConfig.contract?.minMonths ?? cfg.minContractMonths,
      maxContractMonths: backendConfig.contract?.maxMonths ?? cfg.maxContractMonths,
      dustingPlacesPerHour: backendConfig.dusting?.itemsPerHour ?? cfg.dustingPlacesPerHour,
      dustingPricePerPlace: backendConfig.dusting?.pricePerItem ?? cfg.dustingPricePerPlace,
      vacuumingDefaultHours: backendConfig.vacuuming?.estimatedTimeHoursPerJob ?? cfg.vacuumingDefaultHours,
      smoothBreakdownPricingTable: backendConfig.smoothBreakdownPricingTable ?? getDefaultTieredPricing(),
    } : {
      // Fallback to static config if no backend config
      baseHourlyRate: cfg.baseHourlyRate,
      shortJobHourlyRate: cfg.shortJobHourlyRate,
      minHoursPerVisit: cfg.minHoursPerVisit,
      weeksPerMonth: cfg.weeksPerMonth,
      minContractMonths: cfg.minContractMonths,
      maxContractMonths: cfg.maxContractMonths,
      dustingPlacesPerHour: cfg.dustingPlacesPerHour,
      dustingPricePerPlace: cfg.dustingPricePerPlace,
      vacuumingDefaultHours: cfg.vacuumingDefaultHours,
      smoothBreakdownPricingTable: getDefaultTieredPricing(),
    };

    if (!backendConfig) {
      console.warn('⚠️ Using fallback config - backend not loaded yet');
    } else {
      console.log('✅ Using backend smoothBreakdownPricingTable:', activeConfig.smoothBreakdownPricingTable);
    }

    // ---- base hours with dust at 1× time ----
    const manualHours = Math.max(0, Number(form.manualHours) || 0);
    const vacuumingHours = Math.max(0, Number(form.vacuumingHours) || 0);

    // ✅ NEW: Calculate dusting hours from total places ÷ places per hour
    const dustingTotalPlaces = Math.max(0, Number(form.dustingTotalPlaces) || 0);
    const dustingPlacesPerHour = form.dustingPlacesPerHour || activeConfig.dustingPlacesPerHour;

    // Calculate dusting hours: total places ÷ places per hour
    const dustingCalculatedHours = dustingTotalPlaces > 0
      ? dustingTotalPlaces / dustingPlacesPerHour
      : 0;
    const dustingHoursBase = dustingCalculatedHours;

    const totalHoursBase =
      manualHours + vacuumingHours + dustingCalculatedHours;

    console.log(`💰 Calculating - Hours: ${totalHoursBase.toFixed(2)}, Manual: ${manualHours}, Vacuuming: ${vacuumingHours}, Dusting: ${dustingTotalPlaces} places = ${dustingCalculatedHours.toFixed(2)} hrs (${dustingPlacesPerHour} places/hr)`);

    const pricingMode = form.serviceType === "oneTime"
      ? `One-Time Service ($${form.shortJobHourlyRate}/hr, min ${form.minHoursPerVisit} hrs)`
      : `Recurring Service ($${form.baseHourlyRate}/hr, min ${form.minHoursPerVisit} hrs)`;

    if (totalHoursBase === 0) {
      return {
        totalHours: 0,
        perVisit: 0,
        monthly: 0,
        annual: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
        breakdown: {
          manualHours: 0,
          vacuumingHours: 0,
          dustingHours: 0,
          pricingMode,
          basePrice: 0,
          appliedMultiplier: 1,
        },
      };
    }

    // ========== FOR ONE-TIME SERVICES: 4-hour minimum + add-on time ==========
    if (form.serviceType === "oneTime") {
      // Apply 4-hour minimum
      const billableHours = Math.max(totalHoursBase, form.minHoursPerVisit);
      const baseServicePrice = billableHours * form.shortJobHourlyRate;

      // Add-on time (table pricing) - ✅ USE BACKEND smoothBreakdownPricingTable
      const addonTimePrice = calculateAddonTimePrice(
        form.addonTimeMinutes,
        activeConfig.smoothBreakdownPricingTable,
        true
      );
      const totalPrice = baseServicePrice + addonTimePrice;

      console.log(`✅ One-Time Calculation - Base: $${baseServicePrice.toFixed(2)}, Add-on: $${addonTimePrice.toFixed(2)}, Total: $${totalPrice.toFixed(2)}`);

      return {
        totalHours: totalHoursBase,
        perVisit: totalPrice, // Total includes add-on time
        monthly: totalPrice, // Same as per visit for one-time
        annual: totalPrice,
        firstVisit: totalPrice,
        ongoingMonthly: totalPrice,
        contractTotal: totalPrice,
        breakdown: {
          manualHours,
          vacuumingHours,
          dustingHours: dustingHoursBase,
          pricingMode: `One-Time Service ($${form.shortJobHourlyRate}/hr, min ${form.minHoursPerVisit} hrs)`,
          basePrice: baseServicePrice,
          appliedMultiplier: 1,
        },
      };
    }

    // ========== FOR RECURRING SERVICES: 4-hour minimum + add-on time ==========
    const weeksPerMonth = form.weeksPerMonth;  // ✅ USE FORM VALUE (from backend)
    const monthlyVisits = weeksPerMonth * form.visitsPerWeek; // visits per month = weeks per month * visits per week

    // Apply 4-hour minimum for recurring
    const billableHours = Math.max(totalHoursBase, form.minHoursPerVisit);
    const recurringBasePrice = billableHours * form.baseHourlyRate;

    // Add-on time (table pricing) - ✅ USE BACKEND smoothBreakdownPricingTable
    const addonTimePrice = calculateAddonTimePrice(
      form.addonTimeMinutes,
      activeConfig.smoothBreakdownPricingTable,
      true
    );
    const recurringPerVisit = recurringBasePrice + addonTimePrice;

    console.log(`✅ Recurring Calculation Debug:`, {
      addonTimeMinutes: form.addonTimeMinutes,
      smoothBreakdownPricingTiers: activeConfig.smoothBreakdownPricingTable?.length || 0,
      recurringBasePrice,
      addonTimePrice,
      recurringPerVisit,
      totalHoursBase,
      billableHours
    });

    // ✅ Apply custom per-visit override EARLY so it cascades to monthly/contract
    const effectivePerVisit = form.customPerVisit ?? recurringPerVisit;

    // Monthly: per visit * monthly visits (use effective per-visit)
    const recurringMonthly = effectivePerVisit * monthlyVisits;

    // Weekly: per visit * visits per week (use effective per-visit)
    const recurringWeekly = effectivePerVisit * form.visitsPerWeek;

    // ✅ FIXED INSTALLATION LOGIC: Now based on dusting hours × hourly rate instead of per-place pricing
    // Calculate dusting cost per visit using hourly rate
    const hourlyRate = form.serviceType === "oneTime" ? form.shortJobHourlyRate : form.baseHourlyRate;
    const dustingCostPerVisit = dustingCalculatedHours * hourlyRate;

    // Installation adds 2x extra dusting cost (making total 3x for first visit only)
    const installationFee = form.installation && dustingTotalPlaces > 0
      ? dustingCostPerVisit * 2  // 2x extra (normal 1x + 2x extra = 3x total)
      : 0;

    // First month: monthly + installation fee (if applicable)
    const firstMonth = recurringMonthly + installationFee;

    // Contract total: monthly * contract months
    const minMonths = activeConfig.minContractMonths ?? 2;
    const maxMonths = activeConfig.maxContractMonths ?? 36;
    const rawMonths = Number(form.contractMonths) || minMonths;
    const contractMonths = Math.min(
      Math.max(rawMonths, minMonths),
      maxMonths
    );

    // ✅ CORRECTED: Contract total = first month + (regular monthly × remaining months)
    const recurringContractTotal = contractMonths <= 0
      ? 0
      : firstMonth + Math.max(contractMonths - 1, 0) * recurringMonthly;

    console.log(`✅ Contract Calculation Details:`);
    console.log(`   - Regular Monthly: $${recurringMonthly.toFixed(2)}`);
    console.log(`   - Installation Fee: $${installationFee.toFixed(2)}`);
    console.log(`   - First Month: $${firstMonth.toFixed(2)} (regular + installation)`);
    console.log(`   - Contract Months: ${contractMonths}`);
    console.log(`   - Remaining Months: ${Math.max(contractMonths - 1, 0)}`);
    console.log(`   - Contract Total: $${recurringContractTotal.toFixed(2)}`);

    console.log(`✅ Final Calculation - Per Visit: $${effectivePerVisit.toFixed(2)}, Contract Total: $${recurringContractTotal.toFixed(2)}`);

    // ✅ Apply remaining custom overrides (per-visit already applied early)
    const finalPerVisit = effectivePerVisit; // Already includes custom override
    const finalWeekly = recurringWeekly; // Uses effective per-visit
    const finalFirstMonth = form.customMonthly ?? firstMonth;
    const finalRecurringMonthly = form.customOngoingMonthly ?? recurringMonthly; // Already uses effective per-visit
    const finalContractTotal = form.customContractTotal ?? recurringContractTotal; // Already uses effective per-visit

    // ✅ NEW: Add calc field totals AND dollar field totals directly to contract (no frequency dependency)
    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = finalContractTotal + customFieldsTotal;

    console.log(`📊 [JANITORIAL-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: finalContractTotal.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });

    const minimumChargePerVisit = form.serviceType === "oneTime"
      ? form.minHoursPerVisit * form.shortJobHourlyRate
      : form.minHoursPerVisit * form.baseHourlyRate;

    return {
      totalHours: totalHoursBase,
      perVisit: finalPerVisit,
      weekly: finalWeekly,
      monthly: finalFirstMonth, // ✅ FIRST month (includes installation if applicable)
      firstMonth: finalFirstMonth, // ✅ First month total (regular + installation)
      recurringMonthly: finalRecurringMonthly, // ✅ Ongoing monthly (just regular, no installation)
      annual: contractTotalWithCustomFields, // ✅ UPDATED: Uses contract total with custom fields
      firstVisit: finalPerVisit,
      ongoingMonthly: finalRecurringMonthly, // ✅ Regular monthly recurring (no installation)
      contractTotal: contractTotalWithCustomFields, // ✅ UPDATED: Total contract value with custom fields
      minimumChargePerVisit, // ✅ NEW: Export minimum charge for redline/greenline indicator
      breakdown: {
        manualHours,
        vacuumingHours,
        dustingHours: dustingCalculatedHours,  // ✅ NEW: Use calculated hours instead of places-based calculation
        dustingTotalPlaces,                    // ✅ NEW: Include total places in breakdown
        dustingPlacesPerHour,                  // ✅ NEW: Include places per hour rate in breakdown
        pricingMode: `Recurring Service ($${form.baseHourlyRate}/hr, min ${form.minHoursPerVisit} hrs)`,
        basePrice: recurringBasePrice,
        appliedMultiplier: 1,
        installationFee,
        monthlyVisits,
      },
    };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
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
    refreshConfig,
    isLoadingConfig,
  };
}

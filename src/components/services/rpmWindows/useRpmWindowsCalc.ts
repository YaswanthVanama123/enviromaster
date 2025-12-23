// src/features/services/rpmWindows/useRpmWindowsCalc.ts
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  RpmWindowsFormState,
  RpmFrequencyKey,
  RpmRateCategory,
} from "./rpmWindowsTypes";
import { rpmWindowPricingConfig as cfg } from "./rpmWindowsConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import { logServiceFieldChanges } from "../../../utils/serviceLogger";

// ✅ Backend config interface matching the EXACT MongoDB JSON structure provided
interface BackendRpmConfig {
  windowPricingBothSidesIncluded: {
    smallWindowPrice: number;      // 5
    mediumWindowPrice: number;     // 10
    largeWindowPrice: number;      // 15
  };
  installPricing: {
    installationMultiplier: number; // 3
    cleanInstallationMultiplier: number; // 1
  };
  minimumChargePerVisit: number;   // 50
  tripCharges: {
    standard: number;              // 25
    beltway: number;               // 40
  };
  frequencyPriceMultipliers: {
    biweeklyPriceMultiplier: number;              // 1.15
    monthlyPriceMultiplier: number;               // 1.5
    quarterlyPriceMultiplierAfterFirstTime: number; // 2.5
    quarterlyFirstTimeMultiplier: number;         // 3
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
}

const DEFAULT_FORM: RpmWindowsFormState = {
  smallQty: 0,
  mediumQty: 0,
  largeQty: 0,
  smallWindowRate: cfg.smallWindowRate,
  mediumWindowRate: cfg.mediumWindowRate,
  largeWindowRate: cfg.largeWindowRate,
  tripCharge: cfg.tripCharge,
  isFirstTimeInstall: false,
  selectedRateCategory: "redRate",
  includeMirrors: false,
  extraCharges: [],
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
  contractMonths: 12,

  // ✅ NEW: Editable installation multipliers from config (will be overridden by backend)
  installMultiplierFirstTime: cfg.installMultiplierFirstTime,
  installMultiplierClean: cfg.installMultiplierClean,
};

function mapFrequency(v: string): RpmFrequencyKey {
  if (v === "oneTime" || v === "weekly" || v === "biweekly" || v === "twicePerMonth" ||
      v === "monthly" || v === "bimonthly" || v === "quarterly" || v === "biannual" || v === "annual") {
    return v;
  }
  return "weekly";
}

export function useRpmWindowsCalc(initial?: Partial<RpmWindowsFormState>, customFields?: any[]) {
  // ✅ Add refs for tracking override and active state
  const hasContractMonthsOverride = useRef(false);
  const wasActiveRef = useRef<boolean>(false);

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendRpmConfig | null>(null);

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

    console.log(`💰 [RPM-WINDOWS-CALC-FIELDS] Custom calc fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "calc").length} calc fields)`);
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

    console.log(`💰 [RPM-WINDOWS-DOLLAR-FIELDS] Custom dollar fields total: $${total.toFixed(2)} (${customFields.filter(f => f.type === "dollar").length} dollar fields)`);
    return total;
  }, [customFields]);

  // ✅ Store base weekly rates (initialize with config, will be updated by backend)
  const [baseWeeklyRates, setBaseWeeklyRates] = useState({
    small: cfg.smallWindowRate,
    medium: cfg.mediumWindowRate,
    large: cfg.largeWindowRate,
    trip: cfg.tripCharge,
  });

  // ✅ Initialize form state (will be updated when backend config loads)
  const [form, setForm] = useState<RpmWindowsFormState>(() => {
    const baseForm = {
      ...DEFAULT_FORM,
      ...initial,
    };

    // ✅ Initialize with global months ONLY if service starts with inputs
    const isInitiallyActive = (initial?.smallQty || 0) + (initial?.mediumQty || 0) + (initial?.largeQty || 0) > 0;
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

  // ✅ Loading state for refresh button
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    console.log('🔄 [RPM Windows] Fetching fresh configuration from backend...');

    try {
      const response = await serviceConfigApi.getActive("rpmWindows");

      console.log('📥 [RPM Windows] Backend response:', response);

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ RPM Windows config not found in active services, trying fallback pricing...');
        console.warn('⚠️ [RPM Windows] Error:', response?.error);

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("rpmWindows");
          if (fallbackConfig?.config) {
            console.log('✅ [RPM Windows] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendRpmConfig;
            setBackendConfig(config);

            const newBaseRates = {
              small: config.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
              medium: config.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
              large: config.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
              trip: config.tripCharges?.standard ?? cfg.tripCharge,
            };

            console.log('📊 [RPM Windows] Updating base rates from fallback config:', newBaseRates);
            setBaseWeeklyRates(newBaseRates);

            // ✅ FORCE UPDATE FORM with backend values immediately
            setForm(prev => ({
              ...prev,
              smallWindowRate: newBaseRates.small,
              mediumWindowRate: newBaseRates.medium,
              largeWindowRate: newBaseRates.large,
              tripCharge: newBaseRates.trip,
              // ✅ NEW: Update installation multipliers from backend
              installMultiplierFirstTime: config.installPricing?.installationMultiplier ?? prev.installMultiplierFirstTime,
              installMultiplierClean: config.installPricing?.cleanInstallationMultiplier ?? prev.installMultiplierClean,
              // ✅ CLEAR ALL CUSTOM OVERRIDES when refreshing config
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customContractTotal: undefined,
              customInstallationFee: undefined,
            }));

            console.log('✅ RPM Windows FALLBACK CONFIG loaded from context:', config);
            return;
          }
        }

        console.warn('⚠️ No backend pricing available, using static fallback values');
        return;
      }

      // ✅ Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ RPM Windows document has no config property');
        return;
      }

      const config = document.config as BackendRpmConfig;

      console.log('✅ [RPM Windows] Config found! Details:', {
        serviceId: document.serviceId,
        version: document.version,
        isActive: document.isActive,
        configKeys: Object.keys(config),
      });

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);

      // ✅ Store base weekly rates for frequency adjustment
      const newBaseRates = {
        small: config.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
        medium: config.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
        large: config.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
        trip: config.tripCharges?.standard ?? cfg.tripCharge,
      };

      console.log('📊 [RPM Windows] Setting new base rates from backend:', newBaseRates);
      console.log('📊 [RPM Windows] Previous rates were:', baseWeeklyRates);

      setBaseWeeklyRates(newBaseRates);

      // ✅ FORCE UPDATE FORM with backend values immediately (without frequency multiplier initially)
      setForm(prev => ({
        ...prev,
        smallWindowRate: newBaseRates.small,
        mediumWindowRate: newBaseRates.medium,
        largeWindowRate: newBaseRates.large,
        tripCharge: newBaseRates.trip,
        // ✅ NEW: Update installation multipliers from backend
        installMultiplierFirstTime: config.installPricing?.installationMultiplier ?? prev.installMultiplierFirstTime,
        installMultiplierClean: config.installPricing?.cleanInstallationMultiplier ?? prev.installMultiplierClean,
        // ✅ CLEAR ALL CUSTOM OVERRIDES when refreshing config
        customPerVisitPrice: undefined,
        customMonthlyRecurring: undefined,
        customContractTotal: undefined,
        customInstallationFee: undefined,
      }));

      console.log('✅ RPM Windows config loaded from backend and form updated:', {
        windowRates: {
          small: config.windowPricingBothSidesIncluded?.smallWindowPrice,
          medium: config.windowPricingBothSidesIncluded?.mediumWindowPrice,
          large: config.windowPricingBothSidesIncluded?.largeWindowPrice,
        },
        installMultiplier: config.installPricing?.installationMultiplier,
        minimumCharge: config.minimumChargePerVisit,
        tripCharges: config.tripCharges,
        frequencyMetadata: config.frequencyMetadata,
      });
    } catch (error) {
      console.error('❌ Failed to fetch RPM Windows config from backend:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("rpmWindows");
        if (fallbackConfig?.config) {
          console.log('✅ [RPM Windows] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendRpmConfig;
          setBackendConfig(config);

          const newBaseRates = {
            small: config.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
            medium: config.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
            large: config.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
            trip: config.tripCharges?.standard ?? cfg.tripCharge,
          };

          setBaseWeeklyRates(newBaseRates);

          // ✅ FORCE UPDATE FORM with backend values immediately
          setForm(prev => ({
            ...prev,
            smallWindowRate: newBaseRates.small,
            mediumWindowRate: newBaseRates.medium,
            largeWindowRate: newBaseRates.large,
            tripCharge: newBaseRates.trip,
            // ✅ NEW: Update installation multipliers from backend
            installMultiplierFirstTime: config.installPricing?.installationMultiplier ?? prev.installMultiplierFirstTime,
            installMultiplierClean: config.installPricing?.cleanInstallationMultiplier ?? prev.installMultiplierClean,
            // ✅ CLEAR ALL CUSTOM OVERRIDES when refreshing config
            customPerVisitPrice: undefined,
            customMonthlyRecurring: undefined,
            customContractTotal: undefined,
            customInstallationFee: undefined,
          }));

          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch on mount ONLY if no initial data (new service)
  useEffect(() => {
    // Skip fetching if we have initial data (editing existing service with saved prices)
    if (initial) {
      console.log('📋 [RPM-WINDOWS-PRICING] Skipping price fetch - using saved historical prices from initial data');
      return;
    }

    console.log('📋 [RPM-WINDOWS-PRICING] Fetching current prices - new service or no initial data');
    fetchPricing();
  }, []); // Run once on mount

  // Also fetch when services context becomes available (but NOT in edit mode)
  useEffect(() => {
    // Skip if we have initial data (editing existing service)
    if (initial) return;

    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

  // ✅ Add sync effect to adopt global months when service becomes active or when global months change
  useEffect(() => {
    const isServiceActive = (form.smallQty || 0) + (form.mediumQty || 0) + (form.largeQty || 0) > 0;
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
  }, [servicesContext?.globalContractMonths, form.contractMonths, form.smallQty, form.mediumQty, form.largeQty, servicesContext]);

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `rpmWindows_${fieldName}`,
      productName: `RPM Windows - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: (form.smallQty || 0) + (form.mediumQty || 0) + (form.largeQty || 0) || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [RPM-WINDOWS-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.smallQty, form.mediumQty, form.largeQty, form.frequency]);

  // ✅ Update rate fields when frequency changes (apply frequency multiplier)
  useEffect(() => {
    const freqKey = mapFrequency(form.frequency);

    // ✅ Apply special pricing rules for certain frequencies
    let effectiveFreqKey = freqKey;

    // 2×/Month and Bi-Monthly use Monthly pricing
    if (freqKey === "twicePerMonth" || freqKey === "bimonthly") {
      effectiveFreqKey = "monthly";
    }
    // Bi-Annual and Annual use Quarterly pricing
    else if (freqKey === "biannual" || freqKey === "annual") {
      effectiveFreqKey = "quarterly";
    }

    // ✅ Use backend config frequency data if available, otherwise use fallback
    let freqMult = 1;

    if (backendConfig?.frequencyPriceMultipliers) {
      // Use backend frequency multipliers for the effective frequency
      if (effectiveFreqKey === "weekly") {
        freqMult = 1; // Weekly is base rate
      } else if (effectiveFreqKey === "biweekly" && backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier) {
        freqMult = backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
      } else if (effectiveFreqKey === "monthly" && backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier) {
        freqMult = backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
      } else if (effectiveFreqKey === "quarterly" && backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime) {
        freqMult = backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
      } else {
        // Use fallback config multipliers
        const activeFreqMult = cfg.frequencyMultipliers;
        freqMult = activeFreqMult[effectiveFreqKey] || 1;
      }
    } else {
      // Use fallback config multipliers
      const activeFreqMult = cfg.frequencyMultipliers;
      freqMult = activeFreqMult[effectiveFreqKey] || 1;
    }

    console.log('📊 [RPM Windows] Applying frequency multiplier:', {
      originalFrequency: freqKey,
      effectiveFrequency: effectiveFreqKey,
      multiplier: freqMult,
      baseRates: baseWeeklyRates,
    });

    // Apply frequency multiplier to base weekly rates
    setForm((prev) => ({
      ...prev,
      smallWindowRate: baseWeeklyRates.small * freqMult,
      mediumWindowRate: baseWeeklyRates.medium * freqMult,
      largeWindowRate: baseWeeklyRates.large * freqMult,
      tripCharge: baseWeeklyRates.trip * freqMult,
    }));
  }, [form.frequency, backendConfig, baseWeeklyRates]); // Run when frequency, backend config, or base rates change

  // ✅ Add setContractMonths function
  const setContractMonths = useCallback((months: number) => {
    hasContractMonthsOverride.current = true;
    setForm(prev => ({
      ...prev,
      contractMonths: months,
    }));
  }, []);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, checked } = e.target as any;

    setForm((prev) => {
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[name as keyof RpmWindowsFormState];

      let newFormState = prev;

      switch (name) {
        case "frequency":
          newFormState = { ...prev, frequency: mapFrequency(value) };
          break;

        case "selectedRateCategory":
          newFormState = { ...prev, selectedRateCategory: value as RpmRateCategory };
          break;

        case "includeMirrors":
          newFormState = { ...prev, includeMirrors: !!checked };
          break;

        case "smallQty":
        case "mediumQty":
        case "largeQty":
          newFormState = { ...prev, [name]: Number(value) || 0 };
          break;

        case "contractMonths":
          newFormState = { ...prev, contractMonths: Number(value) || 0 };
          break;

        // Custom total overrides
        case "customSmallTotal":
        case "customMediumTotal":
        case "customLargeTotal":
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customAnnualPrice":
        case "customContractTotal": {
          // Allow empty string to clear the field (set to undefined)
          if (value === '') {
            newFormState = { ...prev, [name]: undefined };
          } else {
            const numVal = parseFloat(value);
            if (!isNaN(numVal)) {
              newFormState = { ...prev, [name]: numVal };
            } else {
              newFormState = prev;
            }
          }
          break;
        }

        case "customInstallationFee": {
          if (value === '') {
            newFormState = { ...prev, customInstallationFee: undefined };
          } else {
            const numVal = parseFloat(value);
            if (!isNaN(numVal)) {
              newFormState = { ...prev, customInstallationFee: numVal };
            } else {
              newFormState = prev;
            }
          }
          break;
        }

        // Rate fields - when manually edited, update base weekly rate
        case "smallWindowRate":
        case "mediumWindowRate":
        case "largeWindowRate":
        case "tripCharge": {
          const displayVal = Number(value) || 0;

          // Calculate base weekly rate from current frequency-adjusted value
          const freqKey = mapFrequency(prev.frequency);

          // ✅ Apply same special pricing rules as useEffect
          let effectiveFreqKey = freqKey;
          if (freqKey === "twicePerMonth" || freqKey === "bimonthly") {
            effectiveFreqKey = "monthly";
          } else if (freqKey === "biannual" || freqKey === "annual") {
            effectiveFreqKey = "quarterly";
          }

          // ✅ Apply same frequency multiplier logic as useEffect
          let freqMult = 1;
          if (backendConfig?.frequencyPriceMultipliers) {
            // Use backend frequency multipliers for the effective frequency
            if (effectiveFreqKey === "weekly") {
              freqMult = 1; // Weekly is base rate
            } else if (effectiveFreqKey === "biweekly" && backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier) {
              freqMult = backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
            } else if (effectiveFreqKey === "monthly" && backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier) {
              freqMult = backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
            } else if (effectiveFreqKey === "quarterly" && backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime) {
              freqMult = backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
            } else {
              // Use fallback config multipliers
              const activeFreqMult = cfg.frequencyMultipliers;
              freqMult = activeFreqMult[effectiveFreqKey] || 1;
            }
          } else {
            // Use fallback config multipliers
            const activeFreqMult = cfg.frequencyMultipliers;
            freqMult = activeFreqMult[effectiveFreqKey] || 1;
          }

          const weeklyBase = displayVal / freqMult;

          // Update base weekly rates
          if (name === "smallWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, small: weeklyBase }));
          } else if (name === "mediumWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, medium: weeklyBase }));
          } else if (name === "largeWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, large: weeklyBase }));
          } else if (name === "tripCharge") {
            setBaseWeeklyRates(b => ({ ...b, trip: weeklyBase }));
          }

          newFormState = { ...prev, [name]: displayVal };
          break;
        }

        // ✅ NEW: Handle editable installation multipliers
        case "installMultiplierFirstTime":
        case "installMultiplierClean": {
          const displayVal = Number(value) || 0;
          newFormState = { ...prev, [name]: displayVal };
          break;
        }

        default:
          newFormState = prev;
          break;
      }

      // ✅ Log price override for numeric pricing fields
      const pricingFields = [
        'smallWindowRate', 'mediumWindowRate', 'largeWindowRate', 'tripCharge',
        'customSmallTotal', 'customMediumTotal', 'customLargeTotal',
        'customPerVisitPrice', 'customMonthlyRecurring', 'customInstallationFee',
        'customContractTotal',
        // ✅ NEW: Installation multiplier fields
        'installMultiplierFirstTime', 'installMultiplierClean'
      ];

      if (pricingFields.includes(name)) {
        const newValue = newFormState[name as keyof RpmWindowsFormState] as number | undefined;
        const oldValue = originalValue as number | undefined;

        // Handle undefined values (when cleared) - don't log clearing to undefined
        if (newValue !== undefined && oldValue !== undefined &&
            typeof newValue === 'number' && typeof oldValue === 'number' &&
            newValue !== oldValue && newValue > 0) {
          addServiceFieldChange(name, oldValue, newValue);
        }
      }

      return newFormState;
    });
  };

  // + Button handlers
  const addExtraCharge = () => {
    setForm((prev) => ({
      ...prev,
      extraCharges: [
        ...prev.extraCharges,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          calcText: "",
          description: "",
          amount: 0,
        },
      ],
    }));
  };

  const updateExtraCharge = (
    id: string,
    field: "calcText" | "description" | "amount",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.map((line) =>
        line.id === id
          ? { ...line, [field]: field === "amount" ? Number(value) || 0 : value }
          : line
      ),
    }));
  };

  const removeExtraCharge = (id: string) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.filter((line) => line.id !== id),
    }));
  };

  // ✅ Helper function to get cycle months from backend configuration
  const getCycleMonths = (frequency: string, backendConfig: any): number => {
    const cycleMonths = backendConfig?.frequencyMetadata?.[frequency]?.cycleMonths;

    // Handle special case: monthly has cycleMonths: 0, which means 1 month cycle
    if (frequency === "monthly") {
      return cycleMonths === 0 ? 1 : (cycleMonths ?? 1);
    }

    // For other frequencies, use cycleMonths or fallback to hardcoded values
    if (typeof cycleMonths === 'number' && cycleMonths > 0) {
      return cycleMonths;
    }

    // Fallback to hardcoded values if backend config is unavailable
    const fallbackCycles: Record<string, number> = {
      bimonthly: 2,
      quarterly: 3,
      biannual: 6,
      annual: 12,
    };

    return fallbackCycles[frequency] ?? 1;
  };

  const calc = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = {
      smallWindowRate: backendConfig?.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
      mediumWindowRate: backendConfig?.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
      largeWindowRate: backendConfig?.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
      tripCharge: backendConfig?.tripCharges?.standard ?? cfg.tripCharge,
      installMultiplierFirstTime: backendConfig?.installPricing?.installationMultiplier ?? cfg.installMultiplierFirstTime,
      installMultiplierClean: backendConfig?.installPricing?.cleanInstallationMultiplier ?? cfg.installMultiplierClean,
      minimumChargePerVisit: backendConfig?.minimumChargePerVisit ?? 0,
      // Map backend frequency structure to expected format
      frequencyMultipliers: {
        weekly: 1,
        biweekly: backendConfig?.frequencyPriceMultipliers?.biweeklyPriceMultiplier ?? cfg.frequencyMultipliers.biweekly,
        monthly: backendConfig?.frequencyPriceMultipliers?.monthlyPriceMultiplier ?? cfg.frequencyMultipliers.monthly,
        quarterly: backendConfig?.frequencyPriceMultipliers?.quarterlyPriceMultiplierAfterFirstTime ?? cfg.frequencyMultipliers.quarterly,
        bimonthly: cfg.frequencyMultipliers.bimonthly, // Use fallback for missing frequencies
        annual: cfg.frequencyMultipliers.annual,
        biannual: cfg.frequencyMultipliers.biannual,
        twicePerMonth: cfg.frequencyMultipliers.twicePerMonth,
        oneTime: cfg.frequencyMultipliers.oneTime,
        quarterlyFirstTime: backendConfig?.frequencyPriceMultipliers?.quarterlyFirstTimeMultiplier ?? cfg.frequencyMultipliers.quarterlyFirstTime,
      },
      // Map backend frequency metadata to monthly conversions
      monthlyConversions: {
        weekly: backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? cfg.monthlyConversions.weekly,
        biweekly: backendConfig?.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? (cfg.monthlyConversions.weekly / 2),
        actualWeeksPerMonth: backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? cfg.monthlyConversions.actualWeeksPerMonth,
        actualWeeksPerYear: 52,
      },
      // Use fallback for annual frequencies (not in backend structure)
      annualFrequencies: cfg.annualFrequencies,
      // Use fallback rate categories (not in current backend structure)
      rateCategories: cfg.rateCategories,
    };

    const freqKey = mapFrequency(form.frequency);

    // ✅ NEW: Apply special pricing rules for certain frequencies (same as useEffect)
    let effectiveFreqKey = freqKey;

    // 2×/Month and Bi-Monthly use Monthly pricing
    if (freqKey === "twicePerMonth" || freqKey === "bimonthly") {
      effectiveFreqKey = "monthly";
    }
    // Bi-Annual and Annual use Quarterly pricing
    else if (freqKey === "biannual" || freqKey === "annual") {
      effectiveFreqKey = "quarterly";
    }

    // ✅ FREQUENCY MULTIPLIER FROM BACKEND (using effective frequency for pricing)
    // Use backend frequency multipliers with the same logic as useEffect
    let freqMult = 1;

    if (backendConfig?.frequencyPriceMultipliers) {
      // Use backend frequency multipliers for the effective frequency
      if (effectiveFreqKey === "weekly") {
        freqMult = 1; // Weekly is base rate
      } else if (effectiveFreqKey === "biweekly" && backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier) {
        freqMult = backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
      } else if (effectiveFreqKey === "monthly" && backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier) {
        freqMult = backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
      } else if (effectiveFreqKey === "quarterly" && backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime) {
        freqMult = backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
      } else {
        // Use fallback config multipliers
        const activeFreqMult = cfg.frequencyMultipliers;
        freqMult = activeFreqMult[effectiveFreqKey] || 1;
      }
    } else {
      // Use fallback config multipliers
      const activeFreqMult = cfg.frequencyMultipliers;
      freqMult = activeFreqMult[effectiveFreqKey] || 1;
    }

    // ✅ USE FREQUENCY-ADJUSTED RATES FROM FORM (already multiplied by useEffect)
    const weeklySmall = baseWeeklyRates.small;
    const weeklyMedium = baseWeeklyRates.medium;
    const weeklyLarge = baseWeeklyRates.large;
    const weeklyTrip = baseWeeklyRates.trip; // will be 0, used only for display

    // Weekly base window cost
    const weeklyWindows =
      form.smallQty * weeklySmall +
      form.mediumQty * weeklyMedium +
      form.largeQty * weeklyLarge;

    const hasWindows = weeklyWindows > 0;

    // Use form rates directly (already frequency-adjusted by useEffect)
    const effSmall = form.smallWindowRate;
    const effMedium = form.mediumWindowRate;
    const effLarge = form.largeWindowRate;
    const effTrip = form.tripCharge; // display only

    // Per-visit, at chosen frequency (NO TRIP CHARGE ANYMORE)
    const perVisitWindows =
      form.smallQty * effSmall +
      form.mediumQty * effMedium +
      form.largeQty * effLarge;

    const perVisitService = hasWindows ? perVisitWindows : 0;

    const extrasTotal = form.extraCharges.reduce(
      (s, l) => s + (l.amount || 0),
      0
    );

    const recurringPerVisitBase = perVisitService + extrasTotal;

    // ✅ RATE CATEGORY FROM BACKEND (red/green multipliers)
    const rateCfg =
      activeConfig.rateCategories[form.selectedRateCategory] ??
      activeConfig.rateCategories.redRate;

    const recurringPerVisitRated = recurringPerVisitBase * (rateCfg?.multiplier ?? 1);

    // ✅ INSTALLATION MULTIPLIER FROM FORM (editable by user)
    // First time install = 3x (editable), Clean = 1x (editable)
    const installMultiplier = form.isFirstTimeInstall
      ? (form.installMultiplierFirstTime ?? activeConfig.installMultiplierFirstTime ?? cfg.installMultiplierFirstTime)
      : (form.installMultiplierClean ?? activeConfig.installMultiplierClean ?? cfg.installMultiplierClean);

    // ✅ FIXED: Apply minimum BEFORE installation calculation
    // - When service < minimum: installation = minimum × multiplier
    // - When service ≥ minimum: installation = service × multiplier
    const minimumChargePerVisit = backendConfig?.minimumChargePerVisit ?? activeConfig.minimumChargePerVisit ?? cfg.minimumChargePerVisit ?? 50;
    const weeklyWindowsWithMinimum = hasWindows ? Math.max(weeklyWindows, minimumChargePerVisit) : 0;

    const installOneTimeBase =
      form.isFirstTimeInstall && hasWindows
        ? weeklyWindowsWithMinimum * installMultiplier  // ✅ Use minimum-applied amount
        : 0;

    const installOneTime = installOneTimeBase * (rateCfg?.multiplier ?? 1);

    // ✅ APPLY CUSTOM OVERRIDES EARLY so they cascade to all dependent calculations
    const effectiveInstallation = form.customInstallationFee ?? installOneTime;
    const effectivePerVisit = form.customPerVisitPrice ?? recurringPerVisitRated;

    // FIRST VISIT PRICE = INSTALLATION ONLY (now uses effective installation)
    const firstVisitTotalRated = effectiveInstallation;

    // ✅ MONTHLY VISITS FROM BACKEND CONFIG (using original frequency for visit counts)
    // Uses your monthlyConversions.weekly: 4.33 from MongoDB
    // ✅ FIXED: Use backend frequencyMetadata for monthly visit calculations
    let monthlyVisits = 0;
    const weeksPerMonth = activeConfig.monthlyConversions.actualWeeksPerMonth ?? 4.33;

    // Use ORIGINAL frequency key for visit counts (use backend metadata when available)
    if (freqKey === "oneTime") {
      monthlyVisits = 0; // oneTime has no monthly billing
    } else if (freqKey === "weekly") {
      // Use backend weekly monthlyRecurringMultiplier if available
      monthlyVisits = backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? weeksPerMonth;
    } else if (freqKey === "biweekly") {
      // ✅ FIXED: Use backend biweekly monthlyRecurringMultiplier instead of weekly/2
      monthlyVisits = backendConfig?.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? (weeksPerMonth / 2);
      console.log(`🔧 [RPM Windows] Using biweekly monthly multiplier: ${monthlyVisits} (backend: ${backendConfig?.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier}, fallback: ${weeksPerMonth / 2})`);
    } else if (freqKey === "twicePerMonth") {
      monthlyVisits = 2; // 2×/month = 2 visits per month
    } else if (freqKey === "monthly") {
      monthlyVisits = 1; // monthly = 1 visit per month
    } else if (freqKey === "bimonthly") {
      monthlyVisits = 0.5; // every 2 months = 0.5 per month
    } else if (freqKey === "quarterly") {
      monthlyVisits = 0; // no monthly for quarterly
    } else if (freqKey === "biannual") {
      monthlyVisits = 0; // no monthly for biannual
    } else if (freqKey === "annual") {
      monthlyVisits = 0; // no monthly for annual
    }

    // Standard ongoing monthly bill (after the first month) - use effective per visit
    let standardMonthlyBillRated = effectivePerVisit * monthlyVisits;

    console.log(`🔧 [RPM Windows] Frequency calculation summary:`, {
      freqKey,
      monthlyVisits,
      standardMonthlyBillRated,
      backendWeeklyMultiplier: backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier,
      backendBiweeklyMultiplier: backendConfig?.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier,
      fallbackWeeksPerMonth: weeksPerMonth,
    });

    // ✅ SPECIAL FIX: Make 2×/month monthly total equal to monthly frequency total
    // User wants 2×/month to have same monthly recurring as monthly
    if (freqKey === "twicePerMonth") {
      // For 2×/month, show same monthly total as monthly (1 visit worth instead of 2)
      standardMonthlyBillRated = effectivePerVisit * 1;
    }

    // ✅ FIXED: Monthly recurring for display (show prorated amount for visit-based frequencies)
    // For quarterly/biannual/annual, show the per-visit cost divided by months between visits
    let displayMonthlyBillRated = standardMonthlyBillRated;
    if (standardMonthlyBillRated === 0 && effectivePerVisit > 0) {
      // Visit-based frequencies: prorate the per-visit cost over the visit interval
      if (freqKey === "quarterly") {
        const cycleMonths = getCycleMonths("quarterly", backendConfig); // ✅ FROM BACKEND (3)
        displayMonthlyBillRated = effectivePerVisit / cycleMonths;
      } else if (freqKey === "biannual") {
        const cycleMonths = getCycleMonths("biannual", backendConfig); // ✅ FROM BACKEND (6)
        displayMonthlyBillRated = effectivePerVisit / cycleMonths;
      } else if (freqKey === "annual") {
        const cycleMonths = getCycleMonths("annual", backendConfig); // ✅ FROM BACKEND (12)
        displayMonthlyBillRated = effectivePerVisit / cycleMonths;
      } else if (freqKey === "bimonthly") {
        const cycleMonths = getCycleMonths("bimonthly", backendConfig); // ✅ FROM BACKEND (2)
        displayMonthlyBillRated = effectivePerVisit / cycleMonths;
      }
    }

    // First month bill:
    //  - for oneTime: just the first visit (installation or service)
    //  - for quarterly/biannual/annual: first visit only (installation or service)
    //  - for other frequencies: first visit + remaining visits in the month
    const isVisitBasedFrequency = freqKey === "oneTime" || freqKey === "quarterly" || freqKey === "biannual" || freqKey === "annual" || freqKey === "bimonthly";
    const effectiveServiceVisitsFirstMonth =
      isVisitBasedFrequency ? 0 : (monthlyVisits > 1 ? monthlyVisits - 1 : 0);

    let firstMonthBillRated = 0;
    if (form.isFirstTimeInstall) {
      if (isVisitBasedFrequency) {
        // For visit-based frequencies install: just the installation cost (use effective)
        firstMonthBillRated = effectiveInstallation;
      } else {
        // For other frequencies: installation + remaining service visits in first month (use effective)
        firstMonthBillRated = effectiveInstallation +
          effectivePerVisit * effectiveServiceVisitsFirstMonth;
      }
    } else {
      // No installation, use effective per-visit for monthly calculation
      firstMonthBillRated = effectivePerVisit * monthlyVisits;
    }

    // Displayed "Monthly Recurring" value (includes prorated amounts for visit-based frequencies)
    const monthlyBillRated = displayMonthlyBillRated;

    // CONTRACT TOTAL for N months (2–36)
    const contractMonths = Math.max(form.contractMonths ?? 0, 0);

    let contractTotalRated = 0;
    if (contractMonths > 0) {
      if (freqKey === "oneTime") {
        // ✅ For oneTime: just the first visit (installation or service)
        contractTotalRated = firstMonthBillRated;
      } else if (freqKey === "quarterly" || freqKey === "biannual" || freqKey === "annual" || freqKey === "bimonthly") {
        // ✅ For visit-based frequencies: use backend cycleMonths consistently
        const cycleMonths = getCycleMonths(freqKey, backendConfig);
        const totalVisits = Math.max(Math.floor(contractMonths / cycleMonths), 1);

        if (form.isFirstTimeInstall) {
          // First visit is install only, remaining visits are service (use effective values)
          const serviceVisits = Math.max(totalVisits - 1, 0);
          contractTotalRated = effectiveInstallation + (serviceVisits * effectivePerVisit);
        } else {
          // No install, all visits are service (use effective per visit)
          contractTotalRated = totalVisits * effectivePerVisit;
        }
      } else {
        // For weekly, biweekly, twicePerMonth, monthly: use monthly-based calculation
        if (form.isFirstTimeInstall) {
          const remainingMonths = Math.max(contractMonths - 1, 0);
          contractTotalRated =
            firstMonthBillRated + standardMonthlyBillRated * remainingMonths;
        } else {
          contractTotalRated = standardMonthlyBillRated * contractMonths;
        }
      }
    }

    // ✅ NEW: Apply minimum charge per visit from backend ONLY when there are windows
    // CRITICAL: Apply minimum to EFFECTIVE per-visit (which includes custom override)
    // Note: minimumChargePerVisit is already defined earlier for installation calculation
    const recurringPerVisitWithMinimum = hasWindows ? Math.max(effectivePerVisit, minimumChargePerVisit) : 0;

    // ✅ RECALCULATE MONTHLY VALUES with minimum charge applied
    const standardMonthlyBillWithMinimum = recurringPerVisitWithMinimum * monthlyVisits;
    let displayMonthlyBillWithMinimum = standardMonthlyBillWithMinimum;

    // For visit-based frequencies, use prorated amounts
    if (isVisitBasedFrequency) {
      if (freqKey === "quarterly") {
        const cycleMonths = getCycleMonths("quarterly", backendConfig); // ✅ FROM BACKEND (3)
        displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
      } else if (freqKey === "biannual") {
        const cycleMonths = getCycleMonths("biannual", backendConfig); // ✅ FROM BACKEND (6)
        displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
      } else if (freqKey === "annual") {
        const cycleMonths = getCycleMonths("annual", backendConfig); // ✅ FROM BACKEND (12)
        displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
      } else if (freqKey === "bimonthly") {
        const cycleMonths = getCycleMonths("bimonthly", backendConfig); // ✅ FROM BACKEND (2)
        displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
      }
    }

    // First month bill recalculation
    let firstMonthBillWithMinimum = 0;
    if (form.isFirstTimeInstall) {
      if (isVisitBasedFrequency) {
        // For visit-based frequencies install: just the installation cost (use effective)
        firstMonthBillWithMinimum = effectiveInstallation;
      } else {
        // For other frequencies: installation + remaining service visits in first month (use effective)
        firstMonthBillWithMinimum = effectiveInstallation +
          recurringPerVisitWithMinimum * effectiveServiceVisitsFirstMonth;
      }
    } else {
      // No installation, use recurringPerVisitWithMinimum for monthly calculation
      firstMonthBillWithMinimum = recurringPerVisitWithMinimum * monthlyVisits;
    }

    // Contract total recalculation
    let contractTotalWithMinimum = 0;
    if (contractMonths > 0) {
      if (isVisitBasedFrequency) {
        // For visit-based: total number of visits × per-visit price
        // ✅ Use backend cycleMonths instead of hardcoded divisors
        const cycleMonths = getCycleMonths(freqKey, backendConfig);
        const totalVisits = Math.max(Math.floor(contractMonths / cycleMonths), 1);
        contractTotalWithMinimum = (form.isFirstTimeInstall ? effectiveInstallation : 0) +
          recurringPerVisitWithMinimum * (totalVisits - (form.isFirstTimeInstall ? 1 : 0));
      } else {
        // For monthly/weekly/biweekly: standard monthly calculation
        if (form.isFirstTimeInstall && firstMonthBillWithMinimum !== standardMonthlyBillWithMinimum) {
          const remainingMonths = Math.max(contractMonths - 1, 0);
          contractTotalWithMinimum = firstMonthBillWithMinimum + standardMonthlyBillWithMinimum * remainingMonths;
        } else {
          contractTotalWithMinimum = standardMonthlyBillWithMinimum * contractMonths;
        }
      }
    }

    // ✅ Apply custom overrides for monthly recurring (first month is calculated, not editable)
    const finalFirstMonth = firstMonthBillWithMinimum;
    const finalMonthlyRecurring = form.customMonthlyRecurring ?? standardMonthlyBillWithMinimum;

    // ✅ Recalculate contract total using custom first month and monthly recurring if set
    let finalContractTotal = contractTotalWithMinimum;
    if (contractMonths > 0 && !isVisitBasedFrequency) {
      // For non-visit-based frequencies: use custom first month and monthly recurring
      if (form.isFirstTimeInstall && finalFirstMonth !== finalMonthlyRecurring) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        finalContractTotal = finalFirstMonth + finalMonthlyRecurring * remainingMonths;
      } else {
        finalContractTotal = finalMonthlyRecurring * contractMonths;
      }
    }

    // ✅ Apply custom override for contract total
    const contractTotalBeforeCustomFields = form.customContractTotal ?? finalContractTotal;

    // ✅ NEW: Add calc field totals AND dollar field totals directly to contract (no frequency dependency)
    const customFieldsTotal = calcFieldsTotal + dollarFieldsTotal;
    const contractTotalWithCustomFields = contractTotalBeforeCustomFields + customFieldsTotal;

    console.log(`📊 [RPM-WINDOWS-CONTRACT] Contract calculation breakdown:`, {
      baseContractTotal: contractTotalBeforeCustomFields.toFixed(2),
      calcFieldsTotal: calcFieldsTotal.toFixed(2),
      dollarFieldsTotal: dollarFieldsTotal.toFixed(2),
      totalCustomFields: customFieldsTotal.toFixed(2),
      finalContractTotal: contractTotalWithCustomFields.toFixed(2)
    });

    return {
      effSmall,
      effMedium,
      effLarge,
      effTrip,
      // ✅ Apply custom overrides with hierarchy and minimum charge
      recurringPerVisitRated: form.customPerVisitPrice ?? recurringPerVisitWithMinimum,
      installOneTime: effectiveInstallation, // Already includes custom override
      firstVisitTotalRated: firstVisitTotalRated, // Already includes custom override
      standardMonthlyBillRated: finalMonthlyRecurring,
      firstMonthBillRated: finalFirstMonth,
      monthlyBillRated: form.customMonthlyRecurring ?? displayMonthlyBillWithMinimum,
      contractTotalRated: contractTotalWithCustomFields, // ✅ UPDATED: Total contract value with custom fields
      minimumChargePerVisit, // ✅ NEW: Export minimum charge for redline/greenline indicator
    };
  }, [
    backendConfig, // ✅ CRITICAL: Re-calculate when backend config loads!
    baseWeeklyRates, // ✅ CRITICAL: Re-calculate when base rates change!
    form.smallQty,
    form.mediumQty,
    form.largeQty,
    form.smallWindowRate,
    form.mediumWindowRate,
    form.largeWindowRate,
    form.tripCharge,
    form.frequency,
    form.selectedRateCategory,
    form.isFirstTimeInstall,
    form.extraCharges,
    form.contractMonths,
    // ✅ NEW: Installation multiplier fields
    form.installMultiplierFirstTime,
    form.installMultiplierClean,
    // ✅ NEW: Custom override fields
    form.customPerVisitPrice,
    form.customMonthlyRecurring,
    form.customContractTotal,
    form.customInstallationFee,
    // ✅ NEW: Re-calculate when custom fields change
    calcFieldsTotal,
    dollarFieldsTotal,
  ]);

  const quote: ServiceQuoteResult = {
    serviceId: "rpmWindows",
    displayName: "RPM Window",
    perVisitPrice: calc.recurringPerVisitRated,
    // now represents TOTAL for selected contract months (not "per year")
    annualPrice: calc.contractTotalRated,
    detailsBreakdown: [],
  };

  return {
    form,
    setForm,
    onChange,
    addExtraCharge,
    updateExtraCharge,
    removeExtraCharge,
    calc,
    quote,
    refreshConfig: fetchPricing,
    isLoadingConfig,
    setContractMonths,
  };
}
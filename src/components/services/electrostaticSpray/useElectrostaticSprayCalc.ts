// src/components/services/electrostaticSpray/useElectrostaticSprayCalc.ts

import { useState, useMemo, useEffect } from "react";
import type { ChangeEvent } from "react";
import type {
  ElectrostaticSprayFormState,
  ElectrostaticSprayCalcResult,
} from "./electrostaticSprayTypes";
import { electrostaticSprayPricingConfig as cfg } from "./electrostaticSprayConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";

// Backend config interface matching MongoDB JSON structure
interface BackendElectrostaticSprayConfig {
  // Flat structure (what we use internally)
  pricingMethodOptions?: string[];
  frequencyOptions?: string[];
  locationOptions?: string[];
  combinedServiceOptions?: string[];
  defaultRatePerRoom?: number;
  defaultRatePerSqFt?: number;
  defaultTripCharge?: number;
  minContractMonths?: number;
  maxContractMonths?: number;

  // Nested structure (what backend actually sends)
  standardSprayPricing?: {
    sprayRatePerRoom: number;
    sqFtUnit: number;
    sprayRatePerSqFtUnit: number;
    minimumPriceOptional: number;
  };
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
function normalizeBackendConfig(config: BackendElectrostaticSprayConfig): BackendElectrostaticSprayConfig {
  // Extract pricing values from nested structure if they exist
  const defaultRatePerRoom =
    config.defaultRatePerRoom ??
    config.standardSprayPricing?.sprayRatePerRoom ??
    cfg.ratePerRoom;

  const defaultRatePerSqFt =
    config.defaultRatePerSqFt ??
    config.standardSprayPricing?.sprayRatePerSqFtUnit ??
    cfg.ratePerThousandSqFt;

  const defaultTripCharge =
    config.defaultTripCharge ??
    config.tripCharges?.standard ??
    cfg.tripCharges.standard;

  const minContractMonths =
    config.minContractMonths ?? cfg.minContractMonths;

  const maxContractMonths =
    config.maxContractMonths ?? cfg.maxContractMonths;

  // Build normalized config
  return {
    ...config,
    defaultRatePerRoom,
    defaultRatePerSqFt,
    defaultTripCharge,
    minContractMonths,
    maxContractMonths,
  };
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

export function useElectrostaticSprayCalc(initialData?: Partial<ElectrostaticSprayFormState>) {
  const [form, setForm] = useState<ElectrostaticSprayFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });

  const [backendConfig, setBackendConfig] = useState<BackendElectrostaticSprayConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // Helper function to update form with config data
  const updateFormWithConfig = (config: BackendElectrostaticSprayConfig) => {
    setForm((prev) => {
      // Only update if not already set by initialData
      const updates: Partial<ElectrostaticSprayFormState> = {};

      if (config.defaultRatePerRoom != null && !initialData?.ratePerRoom) {
        updates.ratePerRoom = config.defaultRatePerRoom;
      }

      if (config.defaultRatePerSqFt != null && !initialData?.ratePerThousandSqFt) {
        // defaultRatePerSqFt is already per 1000 sq ft from normalization
        updates.ratePerThousandSqFt = config.defaultRatePerSqFt;
      }

      if (config.defaultTripCharge != null && !initialData?.tripChargePerVisit) {
        updates.tripChargePerVisit = config.defaultTripCharge;
      }

      console.log('📊 [ElectrostaticSpray] Updating Form State:', updates);

      return {
        ...prev,
        ...updates,
      };
    });
  };

  // Fetch pricing config from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("electrostaticSpray");

      // Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ ElectrostaticSpray config not found in active services, trying fallback pricing...');
        console.warn('⚠️ [ElectrostaticSpray] Error:', response?.error);

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("electrostaticSpray");
          if (fallbackConfig?.config) {
            console.log('✅ [ElectrostaticSpray] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendElectrostaticSprayConfig;

            // Normalize fallback config
            const normalizedConfig = normalizeBackendConfig(config);

            setBackendConfig(normalizedConfig);
            updateFormWithConfig(normalizedConfig);

            console.log('✅ ElectrostaticSpray FALLBACK CONFIG loaded from context:', {
              ratePerRoom: normalizedConfig.defaultRatePerRoom,
              ratePerSqFt: normalizedConfig.defaultRatePerSqFt,
              tripCharge: normalizedConfig.defaultTripCharge,
            });
            return;
          }
        }

        console.warn('⚠️ No backend pricing available, using static fallback values');
        return;
      }

      // Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ ElectrostaticSpray document has no config property');
        return;
      }

      const config = document.config as BackendElectrostaticSprayConfig;

      // Normalize config to extract values from nested structure
      const normalizedConfig = normalizeBackendConfig(config);

      // Store the backend config
      setBackendConfig(normalizedConfig);
      updateFormWithConfig(normalizedConfig);

      console.log('✅ ElectrostaticSpray CONFIG loaded from backend:', {
        ratePerRoom: normalizedConfig.defaultRatePerRoom,
        ratePerSqFt: normalizedConfig.defaultRatePerSqFt,
        tripCharge: normalizedConfig.defaultTripCharge,
      });
    } catch (error) {
      console.error('❌ Failed to fetch ElectrostaticSpray config from backend:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("electrostaticSpray");
        if (fallbackConfig?.config) {
          console.log('✅ [ElectrostaticSpray] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendElectrostaticSprayConfig;

          // Normalize fallback config
          const normalizedConfig = normalizeBackendConfig(config);

          setBackendConfig(normalizedConfig);
          updateFormWithConfig(normalizedConfig);
          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch config on mount
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

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const target: any = e.target;

    setForm((prev) => {
      const next: ElectrostaticSprayFormState = { ...prev };

      if (type === "checkbox") {
        next[name as keyof ElectrostaticSprayFormState] = target.checked;
      } else if (
        // Handle custom override fields - allow clearing by setting to undefined
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

      return next;
    });
  };

  const calc: ElectrostaticSprayCalcResult = useMemo(() => {
    // Determine service charge based on pricing method
    let calculatedServiceCharge = 0;
    let effectiveRate = 0;
    let pricingMethodUsed = form.pricingMethod;

    if (form.pricingMethod === "byRoom") {
      calculatedServiceCharge = form.roomCount * form.ratePerRoom;
      effectiveRate = form.ratePerRoom;
    } else {
      // By square feet
      let calculateForSqFt = form.squareFeet;

      if (!form.useExactCalculation) {
        // Use minimum square feet tier pricing
        // Find the minimum tier that covers the entered square feet
        const minTier = cfg.sqFtUnit; // 1000 sq ft minimum
        if (calculateForSqFt <= minTier) {
          calculateForSqFt = minTier; // If 500 entered, use 1000
        } else {
          // Round up to next 1000 sq ft tier (1001 becomes 2000)
          calculateForSqFt = Math.ceil(calculateForSqFt / cfg.sqFtUnit) * cfg.sqFtUnit;
        }
      }

      const units = calculateForSqFt / cfg.sqFtUnit; // Convert to 1000 sq ft units
      calculatedServiceCharge = units * form.ratePerThousandSqFt;
      effectiveRate = form.ratePerThousandSqFt;
    }

    // Use custom override if set
    const serviceCharge = form.customServiceCharge ?? calculatedServiceCharge;

    // Trip charge (0 if combined with Sani-Clean, otherwise use editable rate)
    const tripCharge = form.isCombinedWithSaniClean ? 0 : form.tripChargePerVisit;

    // Per visit total
    const perVisit = form.customPerVisitPrice ?? (serviceCharge + tripCharge);

    // Get frequency multiplier
    const freqConfig = cfg.billingConversions[form.frequency];
    const monthlyMultiplier = freqConfig.monthlyMultiplier;

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
      const visitsPerYear = freqConfig.annualMultiplier;
      const totalVisits = (form.contractMonths / 12) * visitsPerYear;
      contractTotal = form.customContractTotal ?? (totalVisits * perVisit);
    } else {
      // For weekly, biweekly, twicePerMonth, monthly: use monthly-based calculation
      contractTotal = form.customContractTotal ?? (monthlyRecurring * form.contractMonths);
    }

    return {
      serviceCharge,
      tripCharge,
      perVisit,
      monthlyRecurring,
      contractTotal,
      effectiveRate,
      pricingMethodUsed,
      // Frequency-specific UI helpers
      isVisitBasedFrequency,
      monthsPerVisit,
    };
  }, [form]);

  return {
    form,
    setForm,
    onChange,
    calc,
    backendConfig,
    isLoadingConfig,
    refreshConfig: fetchPricing
  };
}

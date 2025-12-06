// src/components/services/electrostaticSpray/useElectrostaticSprayCalc.ts

import { useState, useMemo, ChangeEvent, useEffect } from "react";
import type {
  ElectrostaticSprayFormState,
  ElectrostaticSprayCalcResult,
} from "./electrostaticSprayTypes";
import { electrostaticSprayPricingConfig as cfg } from "./electrostaticSprayConfig";
import { serviceConfigApi } from "../../../backendservice/api";

// Backend config interface matching MongoDB JSON structure
interface BackendElectrostaticSprayConfig {
  pricingMethodOptions?: string[];
  frequencyOptions?: string[];
  locationOptions?: string[];
  combinedServiceOptions?: string[];
  defaultRatePerRoom?: number;
  defaultRatePerSqFt?: number;
  defaultTripCharge?: number;
}

const DEFAULT_FORM_STATE: ElectrostaticSprayFormState = {
  serviceId: "electrostaticSpray",
  pricingMethod: "byRoom",
  roomCount: 0,
  squareFeet: 0,
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

  // Fetch pricing config from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("electrostaticSpray");

      // Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ ElectrostaticSpray config not found in backend, using default fallback values');
        return;
      }

      // Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ ElectrostaticSpray document has no config property');
        return;
      }

      const config = document.config as BackendElectrostaticSprayConfig;

      // Store the backend config
      setBackendConfig(config);

      console.log('📊 [ElectrostaticSpray] Backend Config Received:', {
        ratePerRoom: config.defaultRatePerRoom,
        ratePerSqFt: config.defaultRatePerSqFt,
        tripCharge: config.defaultTripCharge,
      });

      setForm((prev) => {
        // Only update if not already set by initialData
        const updates: Partial<ElectrostaticSprayFormState> = {};

        if (config.defaultRatePerRoom != null && !initialData?.ratePerRoom) {
          updates.ratePerRoom = config.defaultRatePerRoom;
        }

        if (config.defaultRatePerSqFt != null && !initialData?.ratePerThousandSqFt) {
          // Convert per sq ft to per 1000 sq ft
          updates.ratePerThousandSqFt = config.defaultRatePerSqFt * 1000;
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
    } catch (error) {
      console.error('❌ Failed to fetch ElectrostaticSpray config from backend:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch config on mount
  useEffect(() => {
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const target: any = e.target;

    setForm((prev) => {
      const next: ElectrostaticSprayFormState = { ...prev };

      if (type === "checkbox") {
        next[name as keyof ElectrostaticSprayFormState] = target.checked;
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
    let serviceCharge = 0;
    let effectiveRate = 0;
    let pricingMethodUsed = form.pricingMethod;

    if (form.pricingMethod === "byRoom") {
      serviceCharge = form.roomCount * form.ratePerRoom;
      effectiveRate = form.ratePerRoom;
    } else {
      // By square feet
      const units = form.squareFeet / cfg.sqFtUnit; // Convert to 1000 sq ft units
      serviceCharge = units * form.ratePerThousandSqFt;
      effectiveRate = form.ratePerThousandSqFt;
    }

    // Trip charge (0 if combined with Sani-Clean, otherwise use editable rate)
    const tripCharge = form.isCombinedWithSaniClean ? 0 : form.tripChargePerVisit;

    // Per visit total
    const perVisit = form.customPerVisitPrice ?? (serviceCharge + tripCharge);

    // Get frequency multiplier
    const freqConfig = cfg.billingConversions[form.frequency];
    const monthlyMultiplier = freqConfig.monthlyMultiplier;

    // Monthly recurring
    const monthlyRecurring = form.customMonthlyRecurring ?? (perVisit * monthlyMultiplier);

    // Contract total
    const contractTotal = form.customContractTotal ?? (monthlyRecurring * form.contractMonths);

    return {
      serviceCharge,
      tripCharge,
      perVisit,
      monthlyRecurring,
      contractTotal,
      effectiveRate,
      pricingMethodUsed,
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

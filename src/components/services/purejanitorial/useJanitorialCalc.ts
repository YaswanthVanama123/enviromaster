// src/features/services/janitorial/useJanitorialCalc.ts
import { useEffect, useMemo, useState, useCallback } from "react";
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
import { useVersionChangeCollection } from "../../../hooks/useVersionChangeCollection";

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

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendJanitorialConfig {
  baseHourlyRate: number;
  shortJobHourlyRate: number;
  minHoursPerVisit: number;
  tieredPricing: TieredPricingTier[];
  weeksPerMonth: number;
  minContractMonths: number;
  maxContractMonths: number;
  dustingPlacesPerHour: number;
  dustingPricePerPlace: number;
  vacuumingDefaultHours: number;
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
  dustingPlaces: 0,
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
  dustingPricePerPlace: cfg.dustingPricePerPlace,
  vacuumingDefaultHours: cfg.vacuumingDefaultHours,
  redRateMultiplier: cfg.rateCategories.redRate.multiplier,
  greenRateMultiplier: cfg.rateCategories.greenRate.multiplier,
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
  if (minutes <= 0 || !tieredPricing || tieredPricing.length === 0) return 0;

  const hours = minutes / 60;

  // Find the matching tier from backend config
  for (const tier of tieredPricing) {
    // Check minute-based tiers (0-15 min, 15-30 min)
    if (tier.upToMinutes !== undefined && minutes <= tier.upToMinutes) {
      // Handle addon vs standalone pricing
      if (!isAddon && tier.standalonePrice !== undefined) {
        return tier.standalonePrice;
      }
      return tier.price || 0;
    }

    // Check hour-based tiers (1hr, 2hr, 3hr, 4hr, etc.)
    if (tier.upToHours !== undefined && hours <= tier.upToHours) {
      // If tier has ratePerHour (for 4+ hours), calculate dynamically
      if (tier.ratePerHour !== undefined) {
        return hours * tier.ratePerHour;
      }
      // Otherwise use fixed price
      return tier.price || 0;
    }
  }

  // Fallback: if no tier matches, return 0
  return 0;
}

export function useJanitorialCalc(initialData?: Partial<JanitorialFormState>) {
  const [form, setForm] = useState<JanitorialFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendJanitorialConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // Helper function to update form with config data
  const updateFormWithConfig = (config: BackendJanitorialConfig) => {
    setForm((prev) => ({
      ...prev,
      // Update all rate fields from backend if available
      baseHourlyRate: config.baseHourlyRate ?? prev.baseHourlyRate,
      shortJobHourlyRate: config.shortJobHourlyRate ?? prev.shortJobHourlyRate,
      minHoursPerVisit: config.minHoursPerVisit ?? prev.minHoursPerVisit,
      weeksPerMonth: config.weeksPerMonth ?? prev.weeksPerMonth,
      dustingPlacesPerHour: config.dustingPlacesPerHour ?? prev.dustingPlacesPerHour,
      dustingPricePerPlace: config.dustingPricePerPlace ?? prev.dustingPricePerPlace,
      vacuumingDefaultHours: config.vacuumingDefaultHours ?? prev.vacuumingDefaultHours,
    }));
  };

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      // First try to get active service config
      const response = await serviceConfigApi.getActive("pureJanitorial");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ Pure Janitorial config not found in active services, trying fallback pricing...');

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("pureJanitorial");
          if (fallbackConfig?.config) {
            console.log('✅ [Pure Janitorial] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendJanitorialConfig;
            setBackendConfig(config);
            updateFormWithConfig(config);

            console.log('✅ Pure Janitorial FALLBACK CONFIG loaded from context:', {
              baseHourlyRate: config.baseHourlyRate,
              shortJobHourlyRate: config.shortJobHourlyRate,
              minHoursPerVisit: config.minHoursPerVisit,
              weeksPerMonth: config.weeksPerMonth,
              dustingPlacesPerHour: config.dustingPlacesPerHour,
              dustingPricePerPlace: config.dustingPricePerPlace,
              vacuumingDefaultHours: config.vacuumingDefaultHours,
              tieredPricing: config.tieredPricing,
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
        console.warn('⚠️ Pure Janitorial document has no config property');
        return;
      }

      const config = document.config as BackendJanitorialConfig;

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);
      updateFormWithConfig(config);

      console.log('✅ Pure Janitorial ACTIVE CONFIG loaded from backend:', {
        baseHourlyRate: config.baseHourlyRate,
        shortJobHourlyRate: config.shortJobHourlyRate,
        minHoursPerVisit: config.minHoursPerVisit,
        weeksPerMonth: config.weeksPerMonth,
        dustingPlacesPerHour: config.dustingPlacesPerHour,
        dustingPricePerPlace: config.dustingPricePerPlace,
        vacuumingDefaultHours: config.vacuumingDefaultHours,
        tieredPricing: config.tieredPricing,
      });
    } catch (error) {
      console.error('❌ Failed to fetch Pure Janitorial config from backend:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("pureJanitorial");
        if (fallbackConfig?.config) {
          console.log('✅ [Pure Janitorial] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendJanitorialConfig;
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

  // Version change collection
  const { addChange } = useVersionChangeCollection();

  // Helper function to add service field changes
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addChange({
      fieldName: fieldName,
      fieldDisplayName: `Pure Janitorial - ${fieldName}`,
      originalValue,
      newValue,
      serviceId: 'purejanitorial',
    });
  }, [addChange]);

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
      } else {
        (next as any)[name] = t.value;
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

      console.log(`📝 Form updated: ${name} =`, (next as any)[name]);
      return next;
    });
  };

  const calc: JanitorialCalcResult = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG OR FALLBACK ==========
    const activeConfig = backendConfig || {
      baseHourlyRate: cfg.baseHourlyRate,
      shortJobHourlyRate: cfg.shortJobHourlyRate,
      minHoursPerVisit: cfg.minHoursPerVisit,
      weeksPerMonth: cfg.weeksPerMonth,
      minContractMonths: cfg.minContractMonths,
      maxContractMonths: cfg.maxContractMonths,
      dustingPlacesPerHour: cfg.dustingPlacesPerHour,
      dustingPricePerPlace: cfg.dustingPricePerPlace,
      vacuumingDefaultHours: cfg.vacuumingDefaultHours,
      tieredPricing: [
        // Fallback tieredPricing if backend doesn't provide it
        { upToMinutes: 15, price: 10, description: "0-15 minutes", addonOnly: true },
        { upToMinutes: 30, price: 20, description: "15-30 minutes", addonOnly: true, standalonePrice: 35 },
        { upToHours: 1, price: 50, description: "30 min - 1 hour" },
        { upToHours: 2, price: 80, description: "1-2 hours" },
        { upToHours: 3, price: 100, description: "2-3 hours" },
        { upToHours: 4, price: 120, description: "3-4 hours" },
        { upToHours: 999, ratePerHour: 30, description: "4+ hours" },
      ],
    };

    if (!backendConfig) {
      console.warn('⚠️ Using fallback config - backend not loaded yet');
    } else {
      console.log('✅ Using backend tieredPricing:', activeConfig.tieredPricing);
    }

    // ---- base hours with dust at 1× time ----
    const manualHours = Math.max(0, Number(form.manualHours) || 0);
    const vacuumingHours = Math.max(0, Number(form.vacuumingHours) || 0);
    const dustingPlaces = Math.max(0, Number(form.dustingPlaces) || 0);

    const dustingHoursBase =
      dustingPlaces / form.dustingPlacesPerHour;  // ✅ USE FORM VALUE (from backend)

    const totalHoursBase =
      manualHours + vacuumingHours + dustingHoursBase;

    console.log(`💰 Calculating - Hours: ${totalHoursBase.toFixed(2)}, Manual: ${manualHours}, Vacuuming: ${vacuumingHours}, Dusting: ${dustingPlaces} places`);

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

      // Add-on time (table pricing) - ✅ USE BACKEND TIERED PRICING
      const addonTimePrice = calculateAddonTimePrice(
        form.addonTimeMinutes,
        activeConfig.tieredPricing,
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

    // Add-on time (table pricing) - ✅ USE BACKEND TIERED PRICING
    const addonTimePrice = calculateAddonTimePrice(
      form.addonTimeMinutes,
      activeConfig.tieredPricing,
      true
    );
    const recurringPerVisit = recurringBasePrice + addonTimePrice;

    // Monthly: per visit * monthly visits
    const recurringMonthly = recurringPerVisit * monthlyVisits;

    // Weekly: per visit * visits per week
    const recurringWeekly = recurringPerVisit * form.visitsPerWeek;

    // ✅ FIXED INSTALLATION LOGIC: Only applies to dusting with 3x multiplier
    // Calculate dusting cost per visit
    const dustingCostPerVisit = dustingPlaces * form.dustingPricePerPlace;

    // Installation adds 2x extra dusting cost (making total 3x for first visit only)
    const installationFee = form.installation && dustingPlaces > 0
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

    console.log(`✅ Final Calculation - Per Visit: $${recurringPerVisit.toFixed(2)}, Contract Total: $${recurringContractTotal.toFixed(2)}`);

    // ✅ NEW: Apply custom overrides if set
    const finalPerVisit = form.customPerVisit ?? recurringPerVisit;
    const finalWeekly = recurringWeekly; // No custom override for weekly yet
    const finalFirstMonth = form.customMonthly ?? firstMonth;
    const finalRecurringMonthly = form.customOngoingMonthly ?? recurringMonthly;
    const finalContractTotal = form.customContractTotal ?? recurringContractTotal;

    return {
      totalHours: totalHoursBase,
      perVisit: finalPerVisit,
      weekly: finalWeekly,
      monthly: finalFirstMonth, // ✅ FIRST month (includes installation if applicable)
      firstMonth: finalFirstMonth, // ✅ First month total (regular + installation)
      recurringMonthly: finalRecurringMonthly, // ✅ Ongoing monthly (just regular, no installation)
      annual: finalContractTotal, // ✅ CORRECTED: Uses proper first month + remaining months calculation
      firstVisit: finalPerVisit,
      ongoingMonthly: finalRecurringMonthly, // ✅ Regular monthly recurring (no installation)
      contractTotal: finalContractTotal, // ✅ CORRECTED: Total contract value
      breakdown: {
        manualHours,
        vacuumingHours,
        dustingHours: dustingHoursBase,
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
  ]);

  return {
    form,
    setForm,
    onChange,
    calc,
    refreshConfig: fetchPricing,
    isLoadingConfig,
  };
}

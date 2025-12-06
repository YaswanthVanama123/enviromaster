// src/features/services/janitorial/useJanitorialCalc.ts
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type {
  JanitorialRateCategory,
  SchedulingMode,
  ServiceType,
  JanitorialFormState,
} from "./janitorialTypes";
import { serviceConfigApi } from "../../../backendservice/api";

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
  monthly: number;
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

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("pureJanitorial");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ Pure Janitorial config not found in backend, using default fallback values');
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

      console.log('✅ Pure Janitorial FULL CONFIG loaded from backend:', {
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
      console.log('⚠️ Using default hardcoded values as fallback');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // ✅ Fetch pricing configuration on mount
  useEffect(() => {
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type } = e.target;
    const t: any = e.target;

    setForm((prev) => {
      const next: JanitorialFormState = { ...prev };

      if (type === "checkbox") {
        next[name as keyof JanitorialFormState] = t.checked;
      } else if (type === "number") {
        const raw = t.value;
        const num = raw === "" ? 0 : Number(raw);
        next[name as keyof JanitorialFormState] =
          Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        next[name as keyof JanitorialFormState] = t.value;
      }

      console.log(`📝 Form updated: ${name} =`, next[name as keyof JanitorialFormState]);
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

    // First month: monthly + installation fee (if applicable)
    const installationFee = form.installation ? (recurringPerVisit * 0.5) : 0; // 50% of visit cost as installation
    const firstMonth = recurringMonthly + installationFee;

    // Contract total: monthly * contract months
    const minMonths = activeConfig.minContractMonths ?? 2;
    const maxMonths = activeConfig.maxContractMonths ?? 36;
    const rawMonths = Number(form.contractMonths) || minMonths;
    const contractMonths = Math.min(
      Math.max(rawMonths, minMonths),
      maxMonths
    );

    const recurringContractTotal = recurringMonthly * contractMonths;

    console.log(`✅ Final Calculation - Per Visit: $${recurringPerVisit.toFixed(2)}, Contract Total: $${recurringContractTotal.toFixed(2)}`);

    return {
      totalHours: totalHoursBase,
      perVisit: recurringPerVisit,
      weekly: recurringWeekly,
      monthly: recurringMonthly,
      firstMonth: firstMonth,
      recurringMonthly: recurringMonthly, // Same as monthly for clarity
      annual: recurringContractTotal,
      firstVisit: recurringPerVisit,
      ongoingMonthly: recurringMonthly,
      contractTotal: recurringContractTotal,
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
    onChange,
    calc,
    refreshConfig: fetchPricing,
    isLoadingConfig,
  };
}

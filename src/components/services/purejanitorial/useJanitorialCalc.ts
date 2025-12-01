// src/features/services/janitorial/useJanitorialCalc.ts
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type {
  JanitorialFrequencyKey,
  JanitorialRateCategory,
  SchedulingMode,
  JanitorialFormState,
} from "./janitorialTypes";

// API base URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendJanitorialConfig {
  baseHourlyRate: number;
  shortJobHourlyRate: number;
  minHoursPerVisit: number;
  weeksPerMonth: number;
  minContractMonths: number;
  maxContractMonths: number;
  dirtyInitialMultiplier: number;
  infrequentMultiplier: number;
  defaultFrequency: string;
  dustingPlacesPerHour: number;
  dustingPricePerPlace: number;
  vacuumingDefaultHours: number;
  rateCategories: {
    redRate: {
      multiplier: number;
      commissionRate: string;
    };
    greenRate: {
      multiplier: number;
      commissionRate: string;
    };
  };
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
  isAddonToLargerService: false,
  vacuumingHours: 0,
  dustingPlaces: 0,
  dirtyInitial: false,
  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",
  contractMonths: cfg.minContractMonths ?? 12,

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

function calcBaseHourlyRate(mode: SchedulingMode, form: JanitorialFormState): number {
  return mode === "standalone"
    ? form.shortJobHourlyRate  // ✅ USE FORM VALUE (from backend)
    : form.baseHourlyRate;  // ✅ USE FORM VALUE (from backend)
}

/**
 * Base per-visit **with dust at 1× time**:
 *  - normalRoute:  max(hours, 4) × $30  (4 hr minimum = $120)
 *  - standalone :  hours × $50
 */
function calculateBasePerVisitPrice(
  hours: number,
  schedulingMode: SchedulingMode,
  form: JanitorialFormState
): number {
  if (hours <= 0) return 0;

  if (schedulingMode === "standalone") {
    return hours * form.shortJobHourlyRate;  // ✅ USE FORM VALUE (from backend)
  }

  const billableHours = Math.max(hours, form.minHoursPerVisit);  // ✅ USE FORM VALUE (from backend)
  return billableHours * form.baseHourlyRate;  // ✅ USE FORM VALUE (from backend)
}

export function useJanitorialCalc(initialData?: Partial<JanitorialFormState>) {
  const [form, setForm] = useState<JanitorialFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendJanitorialConfig | null>(null);

  // ✅ Fetch COMPLETE pricing configuration from backend on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/service-configs/active?serviceId=pureJanitorial`);

        if (!response.ok) {
          console.warn('⚠️ Pure Janitorial config not found in backend, using default fallback values');
          return;
        }

        const data = await response.json();

        if (data && data.config) {
          const config = data.config as BackendJanitorialConfig;

          // ✅ Store the ENTIRE backend config for use in calculations
          setBackendConfig(config);

          setForm((prev) => ({
            ...prev,
            // Update all rate fields from backend if available
            baseHourlyRate: config.baseHourlyRate ?? prev.baseHourlyRate,
            shortJobHourlyRate: config.shortJobHourlyRate ?? prev.shortJobHourlyRate,
            minHoursPerVisit: config.minHoursPerVisit ?? prev.minHoursPerVisit,
            weeksPerMonth: config.weeksPerMonth ?? prev.weeksPerMonth,
            dirtyInitialMultiplier: config.dirtyInitialMultiplier ?? prev.dirtyInitialMultiplier,
            infrequentMultiplier: config.infrequentMultiplier ?? prev.infrequentMultiplier,
            dustingPlacesPerHour: config.dustingPlacesPerHour ?? prev.dustingPlacesPerHour,
            dustingPricePerPlace: config.dustingPricePerPlace ?? prev.dustingPricePerPlace,
            vacuumingDefaultHours: config.vacuumingDefaultHours ?? prev.vacuumingDefaultHours,
            redRateMultiplier: config.rateCategories?.redRate?.multiplier ?? prev.redRateMultiplier,
            greenRateMultiplier: config.rateCategories?.greenRate?.multiplier ?? prev.greenRateMultiplier,
          }));

          console.log('✅ Pure Janitorial FULL CONFIG loaded from backend:', {
            baseHourlyRate: config.baseHourlyRate,
            shortJobHourlyRate: config.shortJobHourlyRate,
            minHoursPerVisit: config.minHoursPerVisit,
            weeksPerMonth: config.weeksPerMonth,
            dirtyInitialMultiplier: config.dirtyInitialMultiplier,
            infrequentMultiplier: config.infrequentMultiplier,
            dustingPlacesPerHour: config.dustingPlacesPerHour,
            dustingPricePerPlace: config.dustingPricePerPlace,
            vacuumingDefaultHours: config.vacuumingDefaultHours,
            rateCategories: config.rateCategories,
          });
        }
      } catch (error) {
        console.error('❌ Failed to fetch Pure Janitorial config from backend:', error);
        console.log('⚠️ Using default hardcoded values as fallback');
      }
    };

    fetchPricing();
  }, []); // Run once on mount

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

      return next;
    });
  };

  const calc: JanitorialCalcResult = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = backendConfig || {
      baseHourlyRate: cfg.baseHourlyRate,
      shortJobHourlyRate: cfg.shortJobHourlyRate,
      minHoursPerVisit: cfg.minHoursPerVisit,
      weeksPerMonth: cfg.weeksPerMonth,
      minContractMonths: cfg.minContractMonths,
      maxContractMonths: cfg.maxContractMonths,
      dirtyInitialMultiplier: cfg.dirtyInitialMultiplier,
      infrequentMultiplier: cfg.infrequentMultiplier,
      defaultFrequency: cfg.defaultFrequency,
      dustingPlacesPerHour: cfg.dustingPlacesPerHour,
      dustingPricePerPlace: cfg.dustingPricePerPlace,
      vacuumingDefaultHours: cfg.vacuumingDefaultHours,
      rateCategories: cfg.rateCategories,
    };

    // ---- base hours with dust at 1× time ----
    const manualHours = Math.max(0, Number(form.manualHours) || 0);
    const vacuumingHours = Math.max(0, Number(form.vacuumingHours) || 0);
    const dustingPlaces = Math.max(0, Number(form.dustingPlaces) || 0);

    const dustingHoursBase =
      dustingPlaces / form.dustingPlacesPerHour;  // ✅ USE FORM VALUE (from backend)

    const totalHoursBase =
      manualHours + vacuumingHours + dustingHoursBase;

    const hourlyRate = calcBaseHourlyRate(form.schedulingMode, form);  // ✅ PASS FORM

    const pricingMode =
      form.schedulingMode === "standalone"
        ? `Standalone ($${hourlyRate}/hr)`
        : `Normal Route (min ${form.minHoursPerVisit} hrs @ $${hourlyRate}/hr → $${form.minHoursPerVisit * hourlyRate} min/visit)`;  // ✅ USE FORM VALUE

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

    // base with dust at 1× (subject to 4hr min on route)
    const basePerVisit = calculateBasePerVisitPrice(
      totalHoursBase,
      form.schedulingMode,
      form  // ✅ PASS FORM
    );

    // pure 1× dust dollars (no minimum)
    const normalDustPrice = dustingHoursBase * hourlyRate;
    const isQuarterly = form.frequency === "quarterly";

    // ---------- ongoing per-visit ----------
    let perVisitService = basePerVisit;

    if (isQuarterly && dustingHoursBase > 0) {
      // Quarterly: ALL visits use 3× dusting time
      // base (1× dust) + extra 2× dust
      perVisitService =
        basePerVisit + normalDustPrice * (form.infrequentMultiplier - 1);  // ✅ USE FORM VALUE (from backend)
    }

    // ---------- first visit ----------
    let firstVisitService = perVisitService;

    if (isQuarterly && dustingHoursBase > 0) {
      // Quarterly: installation is recurring => first visit SAME as ongoing
      firstVisitService = perVisitService;
    } else if (!isQuarterly && dustingHoursBase > 0) {
      // Non-quarterly: first visit dusting at 3× time
      // base has 1× dust, so add extra 2× dust
      firstVisitService =
        basePerVisit + normalDustPrice * (form.dirtyInitialMultiplier - 1);  // ✅ USE FORM VALUE (from backend)
    } else {
      // no dust: first visit = normal base
      firstVisitService = basePerVisit;
    }

    // apply rate category multiplier
    const rateCfg = (backendConfig?.rateCategories ?? cfg.rateCategories)[form.rateCategory];  // ✅ USE BACKEND OR FALLBACK
    const perVisit = perVisitService * rateCfg.multiplier;
    const firstVisit = firstVisitService * rateCfg.multiplier;

    // monthly / contract
    const weeksPerMonth = form.weeksPerMonth;  // ✅ USE FORM VALUE (from backend)
    const monthlyVisits = weeksPerMonth;

    const firstMonth =
      firstVisit > perVisit
        ? firstVisit + Math.max(monthlyVisits - 1, 0) * perVisit
        : monthlyVisits * perVisit;

    const ongoingMonthly = monthlyVisits * perVisit;

    const minMonths = activeConfig.minContractMonths ?? 2;  // ✅ USE ACTIVE CONFIG (from backend)
    const maxMonths = activeConfig.maxContractMonths ?? 36;  // ✅ USE ACTIVE CONFIG (from backend)
    const rawMonths = Number(form.contractMonths) || minMonths;
    const contractMonths = Math.min(
      Math.max(rawMonths, minMonths),
      maxMonths
    );

    const contractTotal =
      contractMonths <= 0
        ? 0
        : firstMonth + Math.max(contractMonths - 1, 0) * ongoingMonthly;

    return {
      totalHours: totalHoursBase,
      perVisit,
      monthly: firstMonth,
      annual: contractTotal,
      firstVisit,
      ongoingMonthly,
      contractTotal,
      breakdown: {
        manualHours,
        vacuumingHours,
        dustingHours: dustingHoursBase,
        pricingMode,
        basePrice: perVisitService,
        appliedMultiplier: rateCfg.multiplier,
      },
    };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form,
  ]);

  return { form, onChange, calc };
}

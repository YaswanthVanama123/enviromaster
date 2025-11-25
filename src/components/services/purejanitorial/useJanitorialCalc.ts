// src/features/services/janitorial/useJanitorialCalc.ts
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type {
  JanitorialFrequencyKey,
  JanitorialRateCategory,
  SchedulingMode,
} from "./janitorialTypes";

export interface JanitorialFormState {
  manualHours: number;
  schedulingMode: SchedulingMode;
  isAddonToLargerService: boolean;
  vacuumingHours: number;
  dustingPlaces: number;
  dirtyInitial: boolean; // kept for UI text only now
  frequency: JanitorialFrequencyKey;
  rateCategory: JanitorialRateCategory;
  contractMonths: number;
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
};

function calcBaseHourlyRate(mode: SchedulingMode): number {
  return mode === "standalone"
    ? cfg.shortJobHourlyRate
    : cfg.baseHourlyRate;
}

/**
 * Base per-visit **with dust at 1× time**:
 *  - normalRoute:  max(hours, 4) × $30  (4 hr minimum = $120)
 *  - standalone :  hours × $50
 */
function calculateBasePerVisitPrice(
  hours: number,
  schedulingMode: SchedulingMode
): number {
  if (hours <= 0) return 0;

  if (schedulingMode === "standalone") {
    return hours * cfg.shortJobHourlyRate;
  }

  const billableHours = Math.max(hours, cfg.minHoursPerVisit);
  return billableHours * cfg.baseHourlyRate;
}

export function useJanitorialCalc(initialData?: Partial<JanitorialFormState>) {
  const [form, setForm] = useState<JanitorialFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });

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
    // ---- base hours with dust at 1× time ----
    const manualHours = Math.max(0, Number(form.manualHours) || 0);
    const vacuumingHours = Math.max(0, Number(form.vacuumingHours) || 0);
    const dustingPlaces = Math.max(0, Number(form.dustingPlaces) || 0);

    const dustingHoursBase =
      dustingPlaces / cfg.dustingPlacesPerHour; // 1× dust

    const totalHoursBase =
      manualHours + vacuumingHours + dustingHoursBase;

    const hourlyRate = calcBaseHourlyRate(form.schedulingMode);

    const pricingMode =
      form.schedulingMode === "standalone"
        ? `Standalone ($${hourlyRate}/hr)`
        : `Normal Route (min ${cfg.minHoursPerVisit} hrs @ $${hourlyRate}/hr → $${cfg.minHoursPerVisit * hourlyRate} min/visit)`;

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
      form.schedulingMode
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
        basePerVisit + normalDustPrice * (cfg.infrequentMultiplier - 1);
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
        basePerVisit + normalDustPrice * (cfg.dirtyInitialMultiplier - 1);
    } else {
      // no dust: first visit = normal base
      firstVisitService = basePerVisit;
    }

    // apply rate category multiplier
    const rateCfg = cfg.rateCategories[form.rateCategory];
    const perVisit = perVisitService * rateCfg.multiplier;
    const firstVisit = firstVisitService * rateCfg.multiplier;

    // monthly / contract
    const weeksPerMonth = cfg.weeksPerMonth ?? 4.33;
    const monthlyVisits = weeksPerMonth;

    const firstMonth =
      firstVisit > perVisit
        ? firstVisit + Math.max(monthlyVisits - 1, 0) * perVisit
        : monthlyVisits * perVisit;

    const ongoingMonthly = monthlyVisits * perVisit;

    const minMonths = cfg.minContractMonths ?? 2;
    const maxMonths = cfg.maxContractMonths ?? 36;
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
  }, [form]);

  return { form, onChange, calc };
}

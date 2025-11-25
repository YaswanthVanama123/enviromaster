// src/features/services/janitorial/useJanitorialCalc.ts
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type {
  JanitorialFrequencyKey,
  JanitorialRateCategory,
} from "./janitorialTypes";

export interface JanitorialFormState {
  hoursPerVisit: number;
  hourlyRate: number;
  /** If true, enforce the minimum billable hours (4 hr). */
  enforceMinHours: boolean;

  /** If true, first visit is treated as a dirty initial clean (3x). */
  dirtyInitial: boolean;

  frequency: JanitorialFrequencyKey;
  rateCategory: JanitorialRateCategory;

  /** Contract length in months (2–36). */
  contractMonths: number;
}

export interface JanitorialCalcResult {
  /** Per-visit revenue (service only). */
  perVisit: number;

  /** First month total. */
  monthly: number;

  /** Contract total for the selected number of months. */
  annual: number;

  /** First-visit revenue (may be 3x when dirtyInitial=true). */
  firstVisit: number;

  /** Ongoing monthly after the first month. */
  ongoingMonthly: number;

  /** Contract total (same as annual). */
  contractTotal: number;

  /** Hours actually billed (after applying minimum hours rule). */
  billableHours: number;
}

const DEFAULT_FORM_STATE: JanitorialFormState = {
  hoursPerVisit: 0,
  hourlyRate: cfg.baseHourlyRate,
  enforceMinHours: true,
  dirtyInitial: false,
  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",
  contractMonths: cfg.minContractMonths ?? 12,
};

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
    const hoursRaw = Math.max(0, Number(form.hoursPerVisit) || 0);

    // 🔧 FIX: if user hasn't entered any hours, everything should be 0
    if (hoursRaw === 0) {
      return {
        perVisit: 0,
        monthly: 0,
        annual: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
        billableHours: 0,
      };
    }

    // Now apply the 4-hour minimum ONLY when hours > 0
    const billableHours = form.enforceMinHours
      ? Math.max(hoursRaw, cfg.minHoursPerVisit)
      : hoursRaw;

    const rateCfg = cfg.rateCategories[form.rateCategory];
    const weeksPerMonth = cfg.weeksPerMonth ?? 4.33;

    const hourlyRate =
      form.hourlyRate > 0 ? form.hourlyRate : cfg.baseHourlyRate;

    // per-visit (weekly) revenue at red rate, then apply rate category
    const weeklyServiceRed = billableHours * hourlyRate;
    const weeklyService = weeklyServiceRed * rateCfg.multiplier;

    const perVisit = weeklyService;

    const firstVisit = form.dirtyInitial
      ? weeklyService * cfg.dirtyInitialMultiplier
      : weeklyService;

    const monthlyVisits = weeksPerMonth;

    // If first visit is special (3x), use "firstVisit + (4.33 - 1) * perVisit".
    // Otherwise just 4.33 * perVisit.
    const firstMonth =
      firstVisit > perVisit
        ? firstVisit +
          Math.max(monthlyVisits - 1, 0) * perVisit
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
        : firstMonth +
          Math.max(contractMonths - 1, 0) * ongoingMonthly;

    return {
      perVisit,
      monthly: firstMonth,
      annual: contractTotal,
      firstVisit,
      ongoingMonthly,
      contractTotal,
      billableHours,
    };
  }, [form]);

  return { form, onChange, calc };
}

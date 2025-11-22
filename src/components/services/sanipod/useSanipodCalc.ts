// src/features/services/sanipod/useSanipodCalc.ts
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { sanipodPricingConfig as cfg } from "./sanipodConfig";
import type {
  SanipodFrequencyKey,
  SanipodRateCategory,
  SanipodServiceRuleKey,
} from "./sanipodTypes";

export interface SanipodFormState {
  podQuantity: number;
  extraBagsPerWeek: number;

  includeTrip: boolean;
  tripChargePerVisit: number;

  isNewInstall: boolean;
  installQuantity: number;
  installRatePerPod: number;

  frequency: SanipodFrequencyKey;
  rateCategory: SanipodRateCategory;
}

export interface SanipodCalcResult {
  perVisit: number;
  monthly: number;
  annual: number;
  installCost: number;
  chosenServiceRule: SanipodServiceRuleKey;
  weeklyPodServiceRed: number;
}

const DEFAULT_FORM_STATE: SanipodFormState = {
  podQuantity: 0,
  extraBagsPerWeek: 0,
  includeTrip: true,
  tripChargePerVisit: cfg.tripChargePerVisit,
  isNewInstall: false,
  installQuantity: 0,
  installRatePerPod: cfg.installChargePerUnit,
  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",
};

function annualVisits(freq: SanipodFrequencyKey): number {
  return cfg.annualFrequencies[freq] ?? cfg.annualFrequencies.weekly;
}

export function useSanipodCalc(initialData?: Partial<SanipodFormState>) {
  const [form, setForm] = useState<SanipodFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type } = e.target;
    const t: any = e.target;

    setForm((prev) => {
      const next: SanipodFormState = { ...prev };

      if (type === "checkbox") {
        next[name as keyof SanipodFormState] = t.checked;
      } else if (type === "number") {
        const raw = t.value;
        const num = raw === "" ? 0 : Number(raw);
        next[name as keyof SanipodFormState] =
          Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        next[name as keyof SanipodFormState] = t.value;
      }

      return next;
    });
  };

  const calc: SanipodCalcResult = useMemo(() => {
    const pods = Math.max(0, Number(form.podQuantity) || 0);
    const bags = Math.max(0, Number(form.extraBagsPerWeek) || 0);

    const anyActivity =
      pods > 0 || bags > 0 || (form.isNewInstall && form.installQuantity > 0);

    if (!anyActivity) {
      return {
        perVisit: 0,
        monthly: 0,
        annual: 0,
        installCost: 0,
        chosenServiceRule: "perPod8",
        weeklyPodServiceRed: 0,
      };
    }

    const rateCfg = cfg.rateCategories[form.rateCategory];
    const weeksPerMonth = cfg.weeksPerMonth ?? 4;
    const weeksPerYear =
      cfg.weeksPerYear ?? cfg.annualFrequencies.weekly;

    const tripPerVisit =
      form.tripChargePerVisit > 0
        ? form.tripChargePerVisit
        : cfg.tripChargePerVisit;

    const installRate =
      form.installRatePerPod > 0
        ? form.installRatePerPod
        : cfg.installChargePerUnit;

    // ---------- WEEKLY SERVICE (RED RATE) ----------
    const weeklyBagsRed = bags * cfg.extraBagPrice;

    const weeklyPodOptA_Red = pods * cfg.altWeeklyRatePerUnit; // 8$/wk * pods
    const weeklyPodOptB_Red =
      pods * cfg.weeklyRatePerUnit + cfg.standaloneExtraWeeklyCharge; // 3$/wk * pods + 40$/wk

    const weeklyServiceOptA_Red = weeklyPodOptA_Red + weeklyBagsRed;
    const weeklyServiceOptB_Red = weeklyPodOptB_Red + weeklyBagsRed;

    const usingOptA = weeklyServiceOptA_Red <= weeklyServiceOptB_Red;
    const weeklyServiceRed = usingOptA
      ? weeklyServiceOptA_Red
      : weeklyServiceOptB_Red;

    const weeklyPodServiceRed = usingOptA
      ? weeklyPodOptA_Red
      : weeklyPodOptB_Red;

    const chosenServiceRule: SanipodServiceRuleKey = usingOptA
      ? "perPod8"
      : "perPod3Plus40";

    // ---------- SERVICE + TRIP (NO INSTALL) ----------
    const annualServiceRed = weeklyServiceRed * weeksPerYear;
    const annualService = annualServiceRed * rateCfg.multiplier;

    const annualTrip = form.includeTrip
      ? tripPerVisit * weeksPerYear
      : 0;

    // ---------- INSTALL (ONE-TIME) ----------
    const installQty = form.isNewInstall
      ? Math.max(0, Number(form.installQuantity) || 0)
      : 0;

    const installCost = installQty * installRate;

    // ---------- TOTALS ----------
    const annualTotal = annualService + annualTrip + installCost;

    const monthlyService =
      weeklyServiceRed * weeksPerMonth * rateCfg.multiplier;
    const monthlyTrip = form.includeTrip
      ? tripPerVisit * weeksPerMonth
      : 0;

    // *** HERE IS THE FIX: use full installCost, not /12 ***
    const monthlyTotal =
      (Number.isFinite(monthlyService) ? monthlyService : 0) +
      (Number.isFinite(monthlyTrip) ? monthlyTrip : 0) +
      installCost;

    // Per Visit: service + trip only, no install
    const perVisit =
      weeksPerYear > 0
        ? (annualService + annualTrip) / weeksPerYear
        : 0;

    return {
      perVisit,
      monthly: monthlyTotal,
      annual: annualTotal,
      installCost,
      chosenServiceRule,
      weeklyPodServiceRed,
    };
  }, [form]);

  return { form, onChange, calc };
}

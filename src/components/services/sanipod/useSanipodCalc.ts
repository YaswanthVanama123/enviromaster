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
  /** true = recurring each visit, false = one-time only on first visit */
  extraBagsRecurring: boolean;

  includeTrip: boolean;
  tripChargePerVisit: number;

  isNewInstall: boolean;
  installQuantity: number;
  installRatePerPod: number;

  frequency: SanipodFrequencyKey;
  rateCategory: SanipodRateCategory;

  /** Contract length in months (2–36). */
  contractMonths: number;
}

export interface SanipodCalcResult {
  /** Per visit, service only (no install, no trip). */
  perVisit: number;

  /** First month total (first visit + other visits). */
  monthly: number;

  /** Contract total for the selected number of months. */
  annual: number;

  /** Install + any one-time extra bag cost. */
  installCost: number;

  /** Which service rule ("8" or "3+40") is cheaper. */
  chosenServiceRule: SanipodServiceRuleKey;

  /** Pod-only portion of the weekly service at red rate (without bags). */
  weeklyPodServiceRed: number;

  /** First visit charge = install-only (plus one-time bags). */
  firstVisit: number;

  /** Ongoing monthly (after first) with 4.33 weeks logic. */
  ongoingMonthly: number;

  /** Contract total explicitly, same as `annual`. */
  contractTotal: number;
}

const DEFAULT_FORM_STATE: SanipodFormState = {
  podQuantity: 0,
  extraBagsPerWeek: 0,
  extraBagsRecurring: true,

  includeTrip: false,
  tripChargePerVisit: cfg.tripChargePerVisit, // 0 and ignored in calc

  isNewInstall: false,
  installQuantity: 0,
  installRatePerPod: cfg.installChargePerUnit,

  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",

  contractMonths: cfg.minContractMonths ?? 12,
};

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
    const installQtyRaw = Math.max(0, Number(form.installQuantity) || 0);

    const anyActivity =
      pods > 0 ||
      bags > 0 ||
      (form.isNewInstall && installQtyRaw > 0);

    if (!anyActivity) {
      return {
        perVisit: 0,
        monthly: 0,
        annual: 0,
        installCost: 0,
        chosenServiceRule: "perPod8",
        weeklyPodServiceRed: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
      };
    }

    const rateCfg = cfg.rateCategories[form.rateCategory];
    const weeksPerMonth = cfg.weeksPerMonth ?? 4.33;

    // Trip charge concept removed from calculations.
    const tripPerVisit = 0;

    const installRate =
      form.installRatePerPod > 0
        ? form.installRatePerPod
        : cfg.installChargePerUnit;

    // ---------- EXTRA BAGS ----------
    // If recurring: weekly revenue; if one-time: first-visit only.
    const weeklyBagsRed = form.extraBagsRecurring
      ? bags * cfg.extraBagPrice
      : 0;

    const oneTimeBagsCost = form.extraBagsRecurring
      ? 0
      : bags * cfg.extraBagPrice;

    // ---------- WEEKLY SERVICE (RED RATE) ----------
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

    // Apply rate category to service portion only.
    const weeklyService = weeklyServiceRed * rateCfg.multiplier;

    // ---------- PER VISIT (SERVICE ONLY) ----------
    const perVisitService = weeklyService;
    const perVisit = perVisitService + tripPerVisit; // tripPerVisit = 0

    // ---------- INSTALL (ONE-TIME) + ONE-TIME BAGS ----------
    const installQty = form.isNewInstall ? installQtyRaw : 0;
    const installOnlyCost = installQty * installRate;

    // First visit = install-only + one-time bag cost (no normal service).
    const firstVisit = installOnlyCost + oneTimeBagsCost;
    const installCost = firstVisit;

    // ---------- MONTHLY & CONTRACT ----------
    const monthlyVisits = weeksPerMonth;

    // ✅ FIXED:
    // If there is NO special first-visit cost (no install + no one-time bags),
    // first month should just be 4.33 * perVisit.
    // Only when firstVisit > 0 do we do: firstVisit + (4.33 - 1) * perVisit.
    const firstMonth =
      firstVisit > 0
        ? firstVisit +
          Math.max(monthlyVisits - 1, 0) * perVisit
        : monthlyVisits * perVisit;

    // Ongoing months (after first) – all visits are "normal".
    const ongoingMonthly = monthlyVisits * perVisit;

    // Contract months, clamped 2–36.
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
      installCost,
      chosenServiceRule,
      weeklyPodServiceRed,
      firstVisit,
      ongoingMonthly,
      contractTotal,
    };
  }, [form]);

  return { form, onChange, calc };
}

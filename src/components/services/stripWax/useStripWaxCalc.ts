// src/features/services/stripWax/useStripWaxCalc.ts
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { stripWaxPricingConfig as cfg } from "./stripWaxConfig";
import type {
  StripWaxFrequencyKey,
  StripWaxRateCategory,
  StripWaxServiceVariant,
} from "./stripWaxTypes";

export interface StripWaxFormState {
  floorAreaSqFt: number;
  ratePerSqFt: number;
  minCharge: number;

  serviceVariant: StripWaxServiceVariant;

  frequency: StripWaxFrequencyKey;
  rateCategory: StripWaxRateCategory;

  /** Contract length in months (2–36). */
  contractMonths: number;
}

export interface StripWaxCalcResult {
  /** Per-visit revenue (service only). */
  perVisit: number;

  /** First month total (same as ongoing here). */
  monthly: number;

  /** Contract total for selected number of months. */
  annual: number;

  /** First visit revenue (same as perVisit for this service). */
  firstVisit: number;

  /** Ongoing monthly after first month. */
  ongoingMonthly: number;

  /** Contract total (same as annual). */
  contractTotal: number;

  /** Raw area × rate before applying min charge. */
  rawPrice: number;
}

const DEFAULT_FORM_STATE: StripWaxFormState = {
  floorAreaSqFt: 0,
  ratePerSqFt: cfg.variants[cfg.defaultVariant].ratePerSqFt,
  minCharge: cfg.variants[cfg.defaultVariant].minCharge,
  serviceVariant: cfg.defaultVariant,
  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",
  contractMonths: cfg.minContractMonths ?? 12,
};

export function useStripWaxCalc(initialData?: Partial<StripWaxFormState>) {
  const [form, setForm] = useState<StripWaxFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type } = e.target;
    const t: any = e.target;

    setForm((prev) => {
      const next: StripWaxFormState = { ...prev };

      // Special handling when service type changes: reset rate + minimum
      if (name === "serviceVariant") {
        const variantKey = t.value as StripWaxServiceVariant;
        const vCfg = cfg.variants[variantKey];
        next.serviceVariant = variantKey;
        next.ratePerSqFt = vCfg.ratePerSqFt;
        next.minCharge = vCfg.minCharge;
        return next;
      }

      if (type === "checkbox") {
        next[name as keyof StripWaxFormState] = t.checked;
      } else if (type === "number") {
        const raw = t.value;
        const num = raw === "" ? 0 : Number(raw);
        next[name as keyof StripWaxFormState] =
          Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        next[name as keyof StripWaxFormState] = t.value;
      }

      return next;
    });
  };

  const calc: StripWaxCalcResult = useMemo(() => {
    const areaSqFt = Math.max(0, Number(form.floorAreaSqFt) || 0);

    // If no footage entered, everything should be 0.
    if (areaSqFt === 0) {
      return {
        perVisit: 0,
        monthly: 0,
        annual: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
        rawPrice: 0,
      };
    }

    const rateCfg = cfg.rateCategories[form.rateCategory];
    const weeksPerMonth = cfg.weeksPerMonth ?? 4.33;

    const variantCfg = cfg.variants[form.serviceVariant];

    const ratePerSqFt =
      form.ratePerSqFt > 0
        ? form.ratePerSqFt
        : variantCfg.ratePerSqFt;

    const minCharge =
      form.minCharge > 0 ? form.minCharge : variantCfg.minCharge;

    const rawPriceRed = areaSqFt * ratePerSqFt;

    const perVisitRed = Math.max(rawPriceRed, minCharge);

    const perVisit = perVisitRed * rateCfg.multiplier;

    const firstVisit = perVisit;

    const monthlyVisits = weeksPerMonth;

    const firstMonth = monthlyVisits * perVisit;
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
      rawPrice: rawPriceRed,
    };
  }, [form]);

  return { form, onChange, calc };
}

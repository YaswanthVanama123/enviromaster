import { useMemo, useState } from "react";
import type {ChangeEvent} from 'react';
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  RpmWindowsFormState,
  RpmFrequencyKey,
  RpmRateCategory,
} from "./rpmWindowsTypes";
import { rpmWindowPricingConfig as cfg } from "./rpmWindowsConfig";

const DEFAULT_FORM: RpmWindowsFormState = {
  smallQty: 0,
  mediumQty: 0,
  largeQty: 0,

  smallWindowRate: cfg.smallWindowRate,
  mediumWindowRate: cfg.mediumWindowRate,
  largeWindowRate: cfg.largeWindowRate,

  tripCharge: cfg.tripCharge,

  isFirstTimeInstall: false,
  selectedRateCategory: "redRate",
  includeMirrors: false,

  frequency: "monthly",      // BaseServiceFormState
  tripChargeIncluded: true,  // always included (business rule)
  notes: "",
};

function mapFrequency(f: string): RpmFrequencyKey {
  if (f === "weekly" || f === "biweekly" || f === "monthly" || f === "quarterly") {
    return f;
  }
  return "monthly";
}

function getFrequencyMultiplier(f: RpmFrequencyKey): number {
  // use the regular multipliers here:
  //  weekly: 1.0, biweekly: 1.25, monthly: 1.25, quarterly: 2.0
  return cfg.frequencyMultipliers[f];
}

function getAnnualFrequency(f: RpmFrequencyKey): number {
  return cfg.annualFrequencies[f] ?? 0;
}

function getMonthlyConversion(f: RpmFrequencyKey): number {
  if (f === "weekly") return cfg.monthlyConversions.weekly;
  const annual = getAnnualFrequency(f);
  return annual ? annual / 12 : 0;
}

export function useRpmWindowsCalc(initial?: Partial<RpmWindowsFormState>) {
  const [form, setForm] = useState<RpmWindowsFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {
      switch (name) {
        case "frequency":
          return { ...prev, frequency: mapFrequency(value) };

        case "selectedRateCategory":
          return {
            ...prev,
            selectedRateCategory: value as RpmRateCategory,
          };

        case "includeMirrors":
          return { ...prev, includeMirrors: !!checked };

        case "smallQty":
        case "mediumQty":
        case "largeQty":
        case "smallWindowRate":
        case "mediumWindowRate":
        case "largeWindowRate":
        case "tripCharge":
          return { ...prev, [name]: Number(value) || 0 };

        default:
          return prev;
      }
    });
  };

  const {
    baseWindowCost,
    freqMult,
    recurringPerVisitBase,
    installOneTime,
    recurringPerVisitRated,
    firstVisitTotalRated,
    annualBillRated,
    monthlyBillRated,
  } = useMemo(() => {
    // Step 1: base window cost (both sides) from quantities & rates
    const baseWindowCost =
      form.smallQty * form.smallWindowRate +
      form.mediumQty * form.mediumWindowRate +
      form.largeQty * form.largeWindowRate;

    const freqKey = mapFrequency(form.frequency);

    // Step 2: apply frequency multiplier ONLY to base window cost
    const freqMult = getFrequencyMultiplier(freqKey);
    const baseWithFreq = baseWindowCost * freqMult;

    // Step 3: one-time install fee (ONLY ONCE, not for every visit)
    const installOneTime = form.isFirstTimeInstall
      ? baseWindowCost * cfg.installMultiplierFirstTime
      : 0;

    // Step 4: add trip charge to every visit (from form)
    const recurringPerVisitBase = baseWithFreq + form.tripCharge;

    // Step 5: rate category multiplier (applied to everything, including install)
    const rateCfg =
      cfg.rateCategories[form.selectedRateCategory] ??
      cfg.rateCategories.redRate;

    const recurringPerVisitRated = recurringPerVisitBase * rateCfg.multiplier;
    const firstVisitTotalRated =
      (recurringPerVisitBase + installOneTime) * rateCfg.multiplier;

    // Step 6: billing
    const annualFreq = getAnnualFrequency(freqKey);
    // Install happens once, so add it only once to annual:
    const annualBillRated =
      recurringPerVisitRated * annualFreq +
      installOneTime * rateCfg.multiplier;

    const monthlyConv = getMonthlyConversion(freqKey);
    const monthlyBillRated = recurringPerVisitRated * monthlyConv;

    return {
      baseWindowCost,
      freqMult,
      recurringPerVisitBase,
      installOneTime,
      recurringPerVisitRated,
      firstVisitTotalRated,
      annualBillRated,
      monthlyBillRated,
    };
  }, [form]);

  // For quote: show "Total Price" as the FIRST visit if install is selected,
  // otherwise the normal recurring per-visit price.
  const perVisitForQuote = form.isFirstTimeInstall
    ? firstVisitTotalRated
    : recurringPerVisitRated;

  const quote: ServiceQuoteResult = {
    serviceId: "rpmWindows",
    displayName: "RPM Window",
    perVisitPrice: perVisitForQuote,
    annualPrice: annualBillRated,
    detailsBreakdown: [
      `Base windows: $${baseWindowCost.toFixed(2)}`,
      `Frequency x${freqMult.toFixed(2)}`,
      `Trip: $${form.tripCharge.toFixed(2)} (always included)`,
      `Install one-time: $${installOneTime.toFixed(2)}`,
      `Rate: ${form.selectedRateCategory}`,
      `Monthly bill: $${monthlyBillRated.toFixed(2)}`,
    ],
  };

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: {
      baseWindowCost,
      freqMult,
      recurringPerVisitBase,
      installOneTime,
      recurringPerVisitRated,
      firstVisitTotalRated,
      annualBillRated,
      monthlyBillRated,
    },
  };
}

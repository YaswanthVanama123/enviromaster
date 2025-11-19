// src/features/services/rpmWindows/useRpmWindowsCalc.ts
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
  tripChargeIncluded: true,  // visually always checked
  notes: "",
};

function mapFrequency(f: string): RpmFrequencyKey {
  if (f === "weekly" || f === "biweekly" || f === "monthly" || f === "quarterly") {
    return f;
  }
  // fall back to monthly if anything weird sneaks in
  return "monthly";
}

function getFrequencyMultiplier(
  f: RpmFrequencyKey,
  isFirstTimeInstall: boolean
): number {
  if (f === "quarterly" && isFirstTimeInstall) {
    return cfg.frequencyMultipliers.quarterlyFirstTime;
  }
  return cfg.frequencyMultipliers[f];
}

function getAnnualFrequency(f: RpmFrequencyKey): number {
  return cfg.annualFrequencies[f] ?? 0;
}

function getMonthlyConversion(f: RpmFrequencyKey): number {
  // For weekly we use the provided 4.2; for others derive from annual
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
        case "tripChargeIncluded":
          return { ...prev, [name]: !!checked };

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
    frequencyAdjustedCost,
    installCost,
    preRateTotal,
    finalPerVisit,
    monthlyBill,
    annualBill,
  } = useMemo(() => {
    // Step 1: base window cost
    const baseWindowCost =
      form.smallQty * form.smallWindowRate +
      form.mediumQty * form.mediumWindowRate +
      form.largeQty * form.largeWindowRate;

    const freqKey = mapFrequency(form.frequency);
    // Step 2: frequency multiplier
    const freqMult = getFrequencyMultiplier(
      freqKey,
      form.isFirstTimeInstall
    );
    const frequencyAdjustedCost = baseWindowCost * freqMult;

    // Step 3: install cost (only if new install – matches your example)
    const installCost = form.isFirstTimeInstall
      ? baseWindowCost * cfg.installMultiplierFirstTime
      : 0;

    // Step 4: trip charge (always included)
    const tripCharge = cfg.tripCharge; // or form.tripCharge

    const preRateTotal = frequencyAdjustedCost + installCost + tripCharge;

    // Step 5: rate category (red / green)
    const rateConfig =
      cfg.rateCategories[form.selectedRateCategory] ??
      cfg.rateCategories.redRate;
    const finalPerVisit = preRateTotal * rateConfig.multiplier;

    // Step 6: billing
    const annualFreq = getAnnualFrequency(freqKey);
    const annualBill = finalPerVisit * annualFreq;
    const monthlyBill = finalPerVisit * getMonthlyConversion(freqKey);

    return {
      baseWindowCost,
      frequencyAdjustedCost,
      installCost,
      preRateTotal,
      finalPerVisit,
      monthlyBill,
      annualBill,
    };
  }, [form]);

  const quote: ServiceQuoteResult = {
    serviceId: "rpmWindows",
    displayName: "RPM Window",
    perVisitPrice: finalPerVisit,
    annualPrice: annualBill,
    detailsBreakdown: [
      `Base windows: $${baseWindowCost.toFixed(2)}`,
      `Freq adjusted: $${frequencyAdjustedCost.toFixed(2)}`,
      `Install: $${installCost.toFixed(2)}`,
      `Trip: $${cfg.tripCharge.toFixed(2)}`,
      `Rate: ${form.selectedRateCategory}`,
      `Monthly bill: $${monthlyBill.toFixed(2)}`,
    ],
  };

  return {
    form,
    setForm,
    onChange,
    quote,
    // expose some pieces if the UI wants them
    calc: {
      baseWindowCost,
      frequencyAdjustedCost,
      installCost,
      preRateTotal,
      finalPerVisit,
      monthlyBill,
      annualBill,
    },
  };
}

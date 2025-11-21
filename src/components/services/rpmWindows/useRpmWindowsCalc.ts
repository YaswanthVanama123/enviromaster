// src/features/services/rpmWindows/useRpmWindowsCalc.ts
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  RpmWindowsFormState,
  RpmFrequencyKey,
  RpmRateCategory,
} from "./rpmWindowsTypes";
import { rpmWindowPricingConfig as cfg } from "./rpmWindowsConfig";

const DEFAULT_FORM: RpmWindowsFormState = {
  // quantities
  smallQty: 0,
  mediumQty: 0,
  largeQty: 0,

  // WEEKLY base rates (both sides)
  smallWindowRate: cfg.smallWindowRate,
  mediumWindowRate: cfg.mediumWindowRate,
  largeWindowRate: cfg.largeWindowRate,

  // WEEKLY base trip charge
  tripCharge: cfg.tripCharge,

  // options
  isFirstTimeInstall: false,
  selectedRateCategory: "redRate",
  includeMirrors: false,

  // base service fields
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
};

function mapFrequency(v: string): RpmFrequencyKey {
  if (
    v === "weekly" ||
    v === "biweekly" ||
    v === "monthly" ||
    v === "quarterly"
  ) {
    return v;
  }
  return "monthly";
}

function getFrequencyMultiplier(freq: RpmFrequencyKey): number {
  return cfg.frequencyMultipliers[freq];
}

function getAnnualFrequency(freq: RpmFrequencyKey): number {
  return cfg.annualFrequencies[freq] ?? 0;
}

function getMonthlyConversion(freq: RpmFrequencyKey): number {
  if (freq === "weekly") return cfg.monthlyConversions.weekly;
  const annual = getAnnualFrequency(freq);
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
    const { name, value, checked } = e.target as any;

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

        // quantities
        case "smallQty":
        case "mediumQty":
        case "largeQty":
          return { ...prev, [name]: Number(value) || 0 };

        // rate + trip inputs show FREQUENCY-ADJUSTED values.
        // Convert back to WEEKLY base for storage.
        case "smallWindowRate":
        case "mediumWindowRate":
        case "largeWindowRate":
        case "tripCharge": {
          const freqKey = mapFrequency(prev.frequency);
          const freqMult = getFrequencyMultiplier(freqKey) || 1;
          const displayVal = Number(value) || 0;
          const weeklyBase = displayVal / freqMult;
          return { ...prev, [name]: weeklyBase };
        }

        default:
          return prev;
      }
    });
  };

  const calc = useMemo(() => {
    const freqKey = mapFrequency(form.frequency);
    const freqMult = getFrequencyMultiplier(freqKey) || 1;

    // 1) WEEKLY base (not frequency adjusted)
    const weeklySmallRate = form.smallWindowRate;
    const weeklyMediumRate = form.mediumWindowRate;
    const weeklyLargeRate = form.largeWindowRate;
    const weeklyTrip = form.tripCharge;

    const weeklyWindowsBase =
      form.smallQty * weeklySmallRate +
      form.mediumQty * weeklyMediumRate +
      form.largeQty * weeklyLargeRate;

    const hasWindows = weeklyWindowsBase > 0;

    // ✅ Only bill trip + service when there is at least one window
    const weeklyServiceBase = hasWindows
      ? weeklyWindowsBase + weeklyTrip
      : 0;

    // 2) Frequency-adjusted effective rates (for UI display & line totals)
    const effSmallRate = weeklySmallRate * freqMult;
    const effMediumRate = weeklyMediumRate * freqMult;
    const effLargeRate = weeklyLargeRate * freqMult;
    const effTrip = weeklyTrip * freqMult;

    const baseWindowCost =
      form.smallQty * effSmallRate +
      form.mediumQty * effMediumRate +
      form.largeQty * effLargeRate;

    // 3) NORMAL RECURRING PER-VISIT (for that frequency, BEFORE red/green)
    const recurringPerVisitBase = weeklyServiceBase * freqMult;

    // 4) FIRST-TIME INSTALL = 3× FOR THE FREQUENCY
    let firstVisitBase = recurringPerVisitBase;
    let installOneTimeBase = 0;

    if (form.isFirstTimeInstall && hasWindows) {
      const firstMult = cfg.installMultiplierFirstTime; // 3
      firstVisitBase = recurringPerVisitBase * firstMult; // 3 × frequency price
      installOneTimeBase = firstVisitBase - recurringPerVisitBase; // extra one-time
    }

    // 5) Apply Red / Green rate
    const rateCfg =
      cfg.rateCategories[form.selectedRateCategory] ??
      cfg.rateCategories.redRate;

    const recurringPerVisitRated = recurringPerVisitBase * rateCfg.multiplier;
    const firstVisitTotalRated = firstVisitBase * rateCfg.multiplier;
    const installOneTime = installOneTimeBase * rateCfg.multiplier;

    // 6) Annual + Monthly
    const annualFreq = getAnnualFrequency(freqKey);
    const annualBillRated =
      recurringPerVisitRated * annualFreq + installOneTime;

    const monthlyConv = getMonthlyConversion(freqKey);
    const monthlyBillRated = recurringPerVisitRated * monthlyConv;

    return {
      freqMult,
      weeklyServiceBase,
      baseWindowCost,
      effSmallRate,
      effMediumRate,
      effLargeRate,
      effTrip,
      recurringPerVisitBase,
      recurringPerVisitRated,   // recurring / from next time
      firstVisitTotalRated,     // first-time total = install + normal
      installOneTime,           // extra portion (for annual math)
      annualBillRated,
      monthlyBillRated,
    };
  }, [form]);

  // ⬇️ CHANGE HERE:
  // "Total Price (Per Visit)" should be NEXT TIME value (recurring),
  // not first-time.
  const perVisitForQuote = calc.recurringPerVisitRated;

  const quote: ServiceQuoteResult = {
    serviceId: "rpmWindows",
    displayName: "RPM Window",
    perVisitPrice: perVisitForQuote,
    annualPrice: calc.annualBillRated,
    detailsBreakdown: [
      `Weekly base (windows + trip): $${calc.weeklyServiceBase.toFixed(2)}`,
      `Frequency x${calc.freqMult.toFixed(2)}`,
      `Install one-time (extra): $${calc.installOneTime.toFixed(2)}`,
      `Rate tier: ${form.selectedRateCategory}`,
      `Monthly (approx): $${calc.monthlyBillRated.toFixed(2)}`,
    ],
  };

  return {
    form,
    setForm,
    onChange,
    quote,
    calc,
  };
}

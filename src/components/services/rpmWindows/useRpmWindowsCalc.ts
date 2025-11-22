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
  extraCharges: [],
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
};

function mapFrequency(v: string): RpmFrequencyKey {
  if (v === "weekly" || v === "biweekly" || v === "monthly" || v === "quarterly") return v;
  return "weekly";
}

function getFrequencyMultiplier(freq: RpmFrequencyKey): number {
  return cfg.frequencyMultipliers[freq];
}

function getAnnualFrequency(freq: RpmFrequencyKey): number {
  return cfg.annualFrequencies[freq] ?? 0;
}

export function useRpmWindowsCalc(initial?: Partial<RpmWindowsFormState>) {
  const [form, setForm] = useState<RpmWindowsFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, checked } = e.target as any;

    setForm((prev) => {
      switch (name) {
        case "frequency":
          return { ...prev, frequency: mapFrequency(value) };

        case "selectedRateCategory":
          return { ...prev, selectedRateCategory: value as RpmRateCategory };

        case "includeMirrors":
          return { ...prev, includeMirrors: !!checked };

        case "smallQty":
        case "mediumQty":
        case "largeQty":
          return { ...prev, [name]: Number(value) || 0 };

        // convert UI “this frequency” rates back to weekly base
        case "smallWindowRate":
        case "mediumWindowRate":
        case "largeWindowRate":
        case "tripCharge": {
          const freqMult = getFrequencyMultiplier(mapFrequency(prev.frequency)) || 1;
          const displayVal = Number(value) || 0;
          return { ...prev, [name]: displayVal / freqMult };
        }

        default:
          return prev;
      }
    });
  };

  // + Button handlers
  const addExtraCharge = () => {
    setForm((prev) => ({
      ...prev,
      extraCharges: [
        ...prev.extraCharges,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          calcText: "",
          description: "",
          amount: 0,
        },
      ],
    }));
  };

  const updateExtraCharge = (
    id: string,
    field: "calcText" | "description" | "amount",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.map((line) =>
        line.id === id
          ? { ...line, [field]: field === "amount" ? Number(value) || 0 : value }
          : line
      ),
    }));
  };

  const removeExtraCharge = (id: string) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.filter((line) => line.id !== id),
    }));
  };

  const calc = useMemo(() => {
    const freqKey = mapFrequency(form.frequency);
    const freqMult = getFrequencyMultiplier(freqKey) || 1;

    const weeklySmall = form.smallWindowRate;
    const weeklyMedium = form.mediumWindowRate;
    const weeklyLarge = form.largeWindowRate;
    const weeklyTrip = form.tripCharge;

    // Weekly base window cost
    const weeklyWindows =
      form.smallQty * weeklySmall +
      form.mediumQty * weeklyMedium +
      form.largeQty * weeklyLarge;

    const hasWindows = weeklyWindows > 0;

    // Frequency-adjusted (this is what we show in the UI)
    const effSmall = weeklySmall * freqMult;
    const effMedium = weeklyMedium * freqMult;
    const effLarge = weeklyLarge * freqMult;
    const effTrip = weeklyTrip * freqMult;

    // Per-visit, at chosen frequency
    const perVisitWindows =
      form.smallQty * effSmall +
      form.mediumQty * effMedium +
      form.largeQty * effLarge;

    const perVisitService = hasWindows ? perVisitWindows + effTrip : 0;

    const extrasTotal = form.extraCharges.reduce(
      (s, l) => s + (l.amount || 0),
      0
    );

    const recurringPerVisitBase = perVisitService + extrasTotal;

    const rateCfg =
      cfg.rateCategories[form.selectedRateCategory] ??
      cfg.rateCategories.redRate;

    const recurringPerVisitRated = recurringPerVisitBase * rateCfg.multiplier;

    // INSTALLATION FEE — ALWAYS WEEKLY WINDOW ×3 (NO FREQUENCY MULTIPLIER)
    const installOneTimeBase =
      form.isFirstTimeInstall && hasWindows
        ? weeklyWindows * cfg.installMultiplierFirstTime
        : 0;

    const installOneTime = installOneTimeBase * rateCfg.multiplier;

    // FIRST VISIT = INSTALL (weekly) + FIRST SERVICE (frequency adjusted), all rated
    const firstVisitTotalRated =
      (installOneTimeBase + perVisitService) * rateCfg.multiplier;

    // ANNUAL using config (weekly=52, biweekly=26, monthly=12, quarterly=4)
    const annualVisits = getAnnualFrequency(freqKey);
    const annualBillRated =
      recurringPerVisitRated * annualVisits + installOneTime;

    // MONTHLY VISITS (simple weeks model)
    // weekly    -> 4 visits / month  (4 weeks)
    // biweekly  -> 2 visits / month  (every 2 weeks)
    // monthly   -> 1 visit / month   (every 4 weeks)
    // quarterly -> we will NOT show monthly (0 here, UI hides row)
    let monthlyVisits = 0;
    if (freqKey === "weekly") monthlyVisits = 4;
    else if (freqKey === "biweekly") monthlyVisits = 2;
    else if (freqKey === "monthly") monthlyVisits = 1;
    else if (freqKey === "quarterly") monthlyVisits = 0; // no monthly form for quarterly

    const monthlyBase = recurringPerVisitRated * monthlyVisits;

    // Monthly = recurring + ONE-TIME install (only when first time)
    const monthlyBillRated = form.isFirstTimeInstall
      ? monthlyBase + installOneTime
      : monthlyBase;

    return {
      effSmall,
      effMedium,
      effLarge,
      effTrip,
      recurringPerVisitRated,
      installOneTime,
      firstVisitTotalRated,
      annualBillRated,
      monthlyBillRated,
    };
  }, [form]);

  const quote: ServiceQuoteResult = {
    serviceId: "rpmWindows",
    displayName: "RPM Window",
    perVisitPrice: calc.recurringPerVisitRated,
    annualPrice: calc.annualBillRated,
    detailsBreakdown: [],
  };

  return {
    form,
    setForm,
    onChange,
    addExtraCharge,
    updateExtraCharge,
    removeExtraCharge,
    calc,
    quote,
  };
}

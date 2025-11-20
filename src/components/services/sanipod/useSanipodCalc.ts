// src/features/services/sanipod/useSanipodCalc.ts
import { useMemo, useState } from "react";
import type {ChangeEvent} from 'react';
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  SanipodFormState,
  SanipodFrequencyKey,
  SanipodRateCategory,
  SanipodBundleType,
} from "./sanipodTypes";
import { sanipodPricingConfig as cfg } from "./sanipodConfig";

const DEFAULT_FORM: SanipodFormState = {
  podQuantity: 0,
  weeklyRatePerUnit: cfg.weeklyRatePerUnit,

  extraBagsPerWeek: 0,
  extraBagPrice: cfg.extraBagPrice,

  isNewInstall: false,
  location: "outsideBeltway",
  needsParking: false,

  selectedRateCategory: "redRate",
  bundleType: "none",

  toiletClipsQty: 0,
  seatCoverDispensersQty: 0,

  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
};

function mapFrequency(f: string): SanipodFrequencyKey {
  if (f === "weekly" || f === "biweekly" || f === "monthly") return f;
  return "weekly";
}

function getMonthlyMultiplier(freq: SanipodFrequencyKey): number {
  if (freq === "weekly") return cfg.monthlyConversions.weekly;
  if (freq === "biweekly") return cfg.annualFrequencies.biweekly / 12;
  return 1;
}

export function useSanipodCalc(initial?: Partial<SanipodFormState>) {
  const [form, setForm] = useState<SanipodFormState>({
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

        case "bundleType":
          return { ...prev, bundleType: value as SanipodBundleType };

        case "selectedRateCategory":
          return {
            ...prev,
            selectedRateCategory: value as SanipodRateCategory,
          };

        case "location":
          return {
            ...prev,
            location: value === "insideBeltway" ? "insideBeltway" : "outsideBeltway",
          };

        case "needsParking":
        case "isNewInstall":
          return { ...prev, [name]: !!checked };

        case "podQuantity":
        case "weeklyRatePerUnit":
        case "extraBagsPerWeek":
        case "extraBagPrice":
        case "toiletClipsQty":
        case "seatCoverDispensersQty":
          return { ...prev, [name]: Number(value) || 0 };

        default:
          return prev;
      }
    });
  };

  const {
    baseRate,
    baseServiceCost,
    adjustedServiceCost,
    frequencyMultiplier,
    frequencyAdjustedCost,
    installCost,
    tripCost,
    extraBagsCost,
    toiletClipsCost,
    seatCoverCost,
    addOnCost,
    totalPerVisitBase,
    finalPerVisit,
    monthlyBill,
    annualBill,
  } = useMemo(() => {
    // If all-inclusive bundle, SaniPod service itself is priced in the $20/fixture
    // bundle on the restroom card, so here we treat core as 0 and only keep add-ons.
    const freqKey = mapFrequency(form.frequency);

    // Base rate by geography
    const geo =
      form.location === "insideBeltway"
        ? cfg.geographicPricing.insideBeltway
        : cfg.geographicPricing.outsideBeltway;

    const baseRate = geo.baseRate || cfg.weeklyRatePerUnit;

    // Step 2: base service cost
    const baseServiceCost = form.podQuantity * baseRate;

    // Step 3: apply minimum
    const adjustedServiceCost = Math.max(
      baseServiceCost,
      cfg.standaloneMinimum
    );

    // Step 4: frequency multiplier
    const frequencyMultiplier = cfg.frequencyMultipliers[freqKey];
    const frequencyAdjustedCost = adjustedServiceCost * frequencyMultiplier;

    // Step 5: installation
    const installCost = form.isNewInstall
      ? adjustedServiceCost * cfg.installationOptions.newInstall.multiplier
      : 0;

    // Step 6: trip cost (unless bundle all-inclusive waives it)
    let tripCost = 0;
    if (
      cfg.businessRules.alwaysIncludeTripCharge &&
      form.bundleType !== "allInclusive"
    ) {
      const baseTrip =
        form.location === "insideBeltway"
          ? cfg.tripCharge.insideBeltway
          : cfg.tripCharge.outsideBeltway;

      tripCost =
        baseTrip +
        (form.location === "insideBeltway" && form.needsParking
          ? cfg.tripCharge.parking
          : 0);
    }

    // Step 7: add-on cost
    const extraBagsCost = form.extraBagsPerWeek * form.extraBagPrice;

    const toiletClipsCost =
      form.toiletClipsQty * cfg.relatedServices.toiletClips.pricePerMonth;

    const seatCoverCost =
      form.seatCoverDispensersQty *
      cfg.relatedServices.toiletSeatCoverDispensers.pricePerMonth;

    const addOnCost = extraBagsCost + toiletClipsCost + seatCoverCost;

    // Step 8: total per visit before rate category
    const totalPerVisitBase =
      frequencyAdjustedCost + installCost + tripCost + addOnCost;

    // Step 9: rate category
    const rateCfg =
      cfg.rateCategories[form.selectedRateCategory] ??
      cfg.rateCategories.redRate;

    const finalPerVisit = totalPerVisitBase * rateCfg.multiplier;

    // Step 10: monthly & annual billing
    const monthlyMultiplier = getMonthlyMultiplier(freqKey);
    const monthlyBill = finalPerVisit * monthlyMultiplier;
    const annualBill =
      finalPerVisit * cfg.annualFrequencies[freqKey];

    return {
      baseRate,
      baseServiceCost,
      adjustedServiceCost,
      frequencyMultiplier,
      frequencyAdjustedCost,
      installCost,
      tripCost,
      extraBagsCost,
      toiletClipsCost,
      seatCoverCost,
      addOnCost,
      totalPerVisitBase,
      finalPerVisit,
      monthlyBill,
      annualBill,
    };
  }, [form]);

  const quote: ServiceQuoteResult = {
    serviceId: "sanipod",
    displayName: "SaniPod",
    perVisitPrice: finalPerVisit,
    annualPrice: annualBill,
    detailsBreakdown: [
      `Base rate (${form.location}): $${baseRate.toFixed(2)} per pod`,
      `Base service cost: $${baseServiceCost.toFixed(2)}`,
      `Frequency x${frequencyMultiplier.toFixed(2)}`,
      `Install: $${installCost.toFixed(2)}`,
      `Trip: $${tripCost.toFixed(2)}`,
      `Add-ons (bags/clips/seat covers): $${addOnCost.toFixed(2)}`,
      `Monthly bill: $${monthlyBill.toFixed(2)}`,
    ],
  };

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: {
      baseRate,
      baseServiceCost,
      adjustedServiceCost,
      frequencyMultiplier,
      frequencyAdjustedCost,
      installCost,
      tripCost,
      extraBagsCost,
      toiletClipsCost,
      seatCoverCost,
      addOnCost,
      totalPerVisitBase,
      finalPerVisit,
      monthlyBill,
      annualBill,
    },
  };
}

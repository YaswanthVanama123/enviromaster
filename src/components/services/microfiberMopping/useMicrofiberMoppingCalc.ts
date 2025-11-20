// src/features/services/microfiberMopping/useMicrofiberMoppingCalc.ts
import { useMemo, useState } from "react";
import type {ChangeEvent} from 'react'
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  MicrofiberMoppingFormState,
  MicrofiberFrequencyKey,
} from "./microfiberMoppingTypes";
import { microfiberMoppingPricingConfig as cfg } from "./microfiberMoppingConfig";

const DEFAULT_FORM: MicrofiberMoppingFormState = {
  hasExistingSaniService: true,
  bathroomCount: 0,
  extraAreaSqFt: 0,
  standaloneSqFt: 0,
  chemicalGallons: 0,
  isAllInclusive: false,
  location: "outsideBeltway",
  needsParking: false,

  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
};

function mapFrequency(f: string): MicrofiberFrequencyKey {
  if (f === "weekly" || f === "biweekly" || f === "monthly") return f;
  return "weekly";
}

export function useMicrofiberMoppingCalc(
  initial?: Partial<MicrofiberMoppingFormState>
) {
  const [form, setForm] = useState<MicrofiberMoppingFormState>({
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

        case "hasExistingSaniService":
        case "isAllInclusive":
        case "needsParking":
          return { ...prev, [name]: !!checked };

        case "bathroomCount":
        case "extraAreaSqFt":
        case "standaloneSqFt":
        case "chemicalGallons":
          return { ...prev, [name]: Number(value) || 0 };

        case "location":
          return {
            ...prev,
            location: value === "insideBeltway" ? "insideBeltway" : "outsideBeltway",
          };

        default:
          return prev;
      }
    });
  };

  const {
    bathroomPrice,
    extraAreaPrice,
    standaloneServicePrice,
    standaloneTripCharge,
    standaloneTotal,
    chemicalSupplyCost,
    weeklyServiceTotal,
    weeklyTotalWithChemicals,
    perVisitPrice,
    annualPrice,
    monthlyRecurring,
  } = useMemo(() => {
    // Short-circuit all-inclusive: service cost is 0, only chemicals can be billed
    if (form.isAllInclusive && cfg.allInclusiveIntegration.includedInPackage) {
      const chemicalSupplyCost =
        form.chemicalGallons * cfg.chemicalProducts.dailyChemicalPerGallon;
      return {
        bathroomPrice: 0,
        extraAreaPrice: 0,
        standaloneServicePrice: 0,
        standaloneTripCharge: 0,
        standaloneTotal: 0,
        chemicalSupplyCost,
        weeklyServiceTotal: 0,
        weeklyTotalWithChemicals: chemicalSupplyCost,
        perVisitPrice: chemicalSupplyCost,
        annualPrice: chemicalSupplyCost * cfg.billingConversions.weekly.annualMultiplier,
        monthlyRecurring:
          chemicalSupplyCost * cfg.billingConversions.weekly.monthlyMultiplier,
      };
    }

    // 1) Bathroom pricing (only when bundled with Sani)
    const bathroomPrice =
      form.hasExistingSaniService && form.bathroomCount > 0
        ? form.bathroomCount * cfg.includedBathroomRate
        : 0;

    // 2) Extra area pricing (non-bathroom)
    let extraAreaPrice = 0;
    if (form.extraAreaSqFt > 0) {
      const units = Math.ceil(
        form.extraAreaSqFt / cfg.extraAreaPricing.extraAreaSqFtUnit
      );
      const unitBased = units * cfg.extraAreaPricing.extraAreaRatePerUnit;
      extraAreaPrice = cfg.extraAreaPricing.useHigherRate
        ? Math.max(unitBased, cfg.extraAreaPricing.singleLargeAreaRate)
        : unitBased;
    }

    // 3) Standalone pricing (only when NOT bundled with Sani)
    let standaloneServicePrice = 0;
    let standaloneTripCharge = 0;
    let standaloneTotal = 0;

    if (!form.hasExistingSaniService && form.standaloneSqFt > 0) {
      const units = Math.ceil(
        form.standaloneSqFt / cfg.standalonePricing.standaloneSqFtUnit
      );
      const servicePrice =
        units * cfg.standalonePricing.standaloneRatePerUnit;
      standaloneServicePrice = Math.max(
        servicePrice,
        cfg.standalonePricing.standaloneMinimum
      );

      // Trip charges for standalone
      if (
        cfg.pricingRules.alwaysIncludeTripChargeStandalone &&
        cfg.standalonePricing.includeTripCharge
      ) {
        let baseTrip =
          form.location === "insideBeltway"
            ? cfg.tripCharges.insideBeltway
            : cfg.tripCharges.outsideBeltway;

        if (form.needsParking && form.location === "insideBeltway") {
          baseTrip += cfg.tripCharges.parkingFee;
        }

        standaloneTripCharge = baseTrip;
      }

      standaloneTotal = standaloneServicePrice + standaloneTripCharge;
    }

    // 4) Chemical supply
    const chemicalSupplyCost =
      form.chemicalGallons > 0
        ? form.chemicalGallons * cfg.chemicalProducts.dailyChemicalPerGallon
        : 0;

    // 5) Combine
    const weeklyServiceTotal =
      bathroomPrice + extraAreaPrice + standaloneTotal;

    const weeklyTotalWithChemicals =
      weeklyServiceTotal + chemicalSupplyCost;

    // From docs: convert weekly price to monthly / annual using multipliers
    const freqKey = mapFrequency(form.frequency);
    const conv = cfg.billingConversions[freqKey];

    const perVisitPrice = weeklyTotalWithChemicals; // "weeklyTotal" in doc example
    const annualPrice =
      perVisitPrice * conv.annualMultiplier;
    const monthlyRecurring =
      perVisitPrice * conv.monthlyMultiplier;

    return {
      bathroomPrice,
      extraAreaPrice,
      standaloneServicePrice,
      standaloneTripCharge,
      standaloneTotal,
      chemicalSupplyCost,
      weeklyServiceTotal,
      weeklyTotalWithChemicals,
      perVisitPrice,
      annualPrice,
      monthlyRecurring,
    };
  }, [form]);

  const quote: ServiceQuoteResult = {
    serviceId: "microfiberMopping",
    displayName: "Microfiber Mopping",
    perVisitPrice,
    annualPrice,
    detailsBreakdown: [
      `Bathrooms (bundled): $${bathroomPrice.toFixed(2)}`,
      `Extra area: $${extraAreaPrice.toFixed(2)}`,
      `Standalone (incl. trip): $${standaloneTotal.toFixed(2)}`,
      `Chemicals: $${chemicalSupplyCost.toFixed(2)}`,
      `Weekly total: $${weeklyTotalWithChemicals.toFixed(2)}`,
      `Monthly recurring: $${monthlyRecurring.toFixed(2)}`,
    ],
  };

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: {
      bathroomPrice,
      extraAreaPrice,
      standaloneServicePrice,
      standaloneTripCharge,
      standaloneTotal,
      chemicalSupplyCost,
      weeklyServiceTotal,
      weeklyTotalWithChemicals,
      perVisitPrice,
      annualPrice,
      monthlyRecurring,
    },
  };
}

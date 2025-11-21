// src/features/services/microfiberMopping/useMicrofiberMoppingCalc.ts
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  MicrofiberMoppingFormState,
  MicrofiberFrequencyKey,
  MicrofiberMoppingCalcResult,
} from "./microfiberMoppingTypes";
import { microfiberMoppingPricingConfig as cfg } from "./microfiberMoppingConfig";

type InputChangeEvent =
  | ChangeEvent<HTMLInputElement>
  | ChangeEvent<HTMLSelectElement>;

const DEFAULT_FORM: MicrofiberMoppingFormState = {
  serviceId: "microfiber_mopping_service_001",

  frequency: "weekly",
  hasExistingSaniService: true,

  bathroomCount: 0,
  isHugeBathroom: false,
  hugeBathroomSqFt: 0,

  extraAreaSqFt: 0,
  standaloneSqFt: 0,
  chemicalGallons: 0,

  isAllInclusive: false,
  location: "insideBeltway",
  needsParking: false,
} as MicrofiberMoppingFormState;

function getBillingConversion(freq: MicrofiberFrequencyKey) {
  if (freq === "biweekly") return cfg.billingConversions.biweekly;
  if (freq === "monthly") return cfg.billingConversions.monthly;
  return cfg.billingConversions.weekly;
}

export function useMicrofiberMoppingCalc(
  initialData?: unknown
): {
  form: MicrofiberMoppingFormState;
  onChange: (ev: InputChangeEvent) => void;
  quote: ServiceQuoteResult;
  calc: MicrofiberMoppingCalcResult;
} {
  const [form, setForm] = useState<MicrofiberMoppingFormState>(() => {
    const maybe = (initialData as any) || {};
    const initialForm =
      maybe && typeof maybe === "object" && "form" in maybe ? maybe.form : maybe;

    return {
      ...DEFAULT_FORM,
      ...(initialForm as Partial<MicrofiberMoppingFormState>),
    };
  });

  const onChange = (ev: InputChangeEvent) => {
    const target = ev.target as HTMLInputElement;
    const { name, type, value, checked } = target;

    setForm((prev) => {
      let nextValue: unknown = value;

      if (type === "checkbox") {
        nextValue = checked;
      } else if (type === "number") {
        const raw = value.trim();
        if (raw === "") {
          nextValue = 0;
        } else {
          const num = Number(raw);
          nextValue = Number.isFinite(num) && num >= 0 ? num : 0;
        }
      }

      const next: MicrofiberMoppingFormState = {
        ...prev,
        [name]: nextValue as any,
      };

      // UX rule: if they start using the "huge bathroom" path,
      // clear the standard bathroom count so they don't double-count.
      if (name === "hugeBathroomSqFt") {
        const sq = Number(nextValue) || 0;
        if (sq > 0) {
          next.bathroomCount = 0;
          next.isHugeBathroom = true;
        }
      }

      if (name === "isHugeBathroom" && nextValue === true) {
        next.bathroomCount = 0;
      }

      return next;
    });
  };

  const { calc, quote } = useMemo(() => {
    const freq: MicrofiberFrequencyKey = form.frequency ?? "weekly";
    const conv = getBillingConversion(freq);
    const { actualWeeksPerYear } = cfg.billingConversions;
    const isAllInclusive = !!form.isAllInclusive;

    // ---------------------------------------------------------
    // 1) Bathrooms (standard + huge)  – INCLUDED with Sani
    // ---------------------------------------------------------
    let standardBathroomPrice = 0;
    let hugeBathroomPrice = 0;

    if (!isAllInclusive && form.hasExistingSaniService) {
      const standardBathCount = Math.max(0, Number(form.bathroomCount) || 0);

      // Standard bathrooms: $10 per bathroom per visit
      if (standardBathCount > 0) {
        standardBathroomPrice =
          standardBathCount * cfg.includedBathroomRate;
      }

      // Huge bathroom: $10 per 300 sq ft units
      const hugeSqFt = Math.max(0, Number(form.hugeBathroomSqFt) || 0);
      if (
        form.isHugeBathroom &&
        cfg.hugeBathroomPricing.enabled &&
        hugeSqFt > 0
      ) {
        const units = Math.ceil(
          hugeSqFt / cfg.hugeBathroomPricing.sqFtUnit
        );
        hugeBathroomPrice =
          units * cfg.hugeBathroomPricing.ratePerSqFt;
      }
    }

    const bathroomPrice = standardBathroomPrice + hugeBathroomPrice;

    // ---------------------------------------------------------
    // 2) Extra non-bath area
    // Rule: $100 OR $10 per 400 sq ft, whichever is more.
    // ---------------------------------------------------------
    let extraAreaPrice = 0;

    if (!isAllInclusive && form.extraAreaSqFt > 0) {
      const units = Math.ceil(
        form.extraAreaSqFt / cfg.extraAreaPricing.extraAreaSqFtUnit
      );
      const unitPrice =
        units * cfg.extraAreaPricing.extraAreaRatePerUnit;

      extraAreaPrice = cfg.extraAreaPricing.useHigherRate
        ? Math.max(unitPrice, cfg.extraAreaPricing.singleLargeAreaRate)
        : unitPrice;
    }

    // ---------------------------------------------------------
    // 3) Stand-alone microfiber mopping
    // Rule: $10 per 200 sq ft, $40 minimum, + trip charges.
    // ---------------------------------------------------------
    let standaloneServicePrice = 0;
    let standaloneTripCharge = 0;
    let standaloneTotal = 0;

    if (!isAllInclusive && form.standaloneSqFt > 0) {
      const units = Math.ceil(
        form.standaloneSqFt / cfg.standalonePricing.standaloneSqFtUnit
      );
      const servicePrice =
        units * cfg.standalonePricing.standaloneRatePerUnit;
      const basePrice = Math.max(
        servicePrice,
        cfg.standalonePricing.standaloneMinimum
      );

      standaloneServicePrice = basePrice;

      const includeStandaloneTrip =
        cfg.standalonePricing.includeTripCharge &&
        cfg.pricingRules.alwaysIncludeTripChargeStandalone;

      if (includeStandaloneTrip) {
        let trip =
          form.location === "insideBeltway"
            ? cfg.tripCharges.insideBeltway
            : cfg.tripCharges.outsideBeltway;

        if (form.needsParking && form.location === "insideBeltway") {
          trip += cfg.tripCharges.parkingFee;
        }

        // If ever used inside an all-inclusive variant,
        // this flag could waive trip, but with our current
        // guards this stays informational.
        if (isAllInclusive && cfg.tripCharges.waiveForAllInclusive) {
          trip = 0;
        }

        standaloneTripCharge = trip;
      }

      standaloneTotal = standaloneServicePrice + standaloneTripCharge;
    }

    // ---------------------------------------------------------
    // 4) Chemical supply (customer self-mopping)
    // Rule: $27.34 / gallon (diluted) – per month.
    // ---------------------------------------------------------
    const chemicalSupplyMonthly =
      form.chemicalGallons > 0
        ? form.chemicalGallons *
          cfg.chemicalProducts.dailyChemicalPerGallon
        : 0;

    const annualChemical = chemicalSupplyMonthly * 12;

    // ---------------------------------------------------------
    // 5) Totals
    // ---------------------------------------------------------
    const perVisitServiceTotal =
      bathroomPrice + extraAreaPrice + standaloneTotal;

    const perVisitPrice = perVisitServiceTotal;

    const annualService = perVisitPrice * conv.annualMultiplier;
    const annualPrice = annualService + annualChemical;

    const monthlyService = perVisitPrice * conv.monthlyMultiplier;
    const monthlyRecurring = monthlyService + chemicalSupplyMonthly;

    const weeklyServiceTotal = annualService / actualWeeksPerYear;
    const weeklyTotalWithChemicals = annualPrice / actualWeeksPerYear;

    const calc: MicrofiberMoppingCalcResult = {
      standardBathroomPrice,
      hugeBathroomPrice,
      bathroomPrice,
      extraAreaPrice,
      standaloneServicePrice,
      standaloneTripCharge,
      standaloneTotal,
      chemicalSupplyMonthly,
      weeklyServiceTotal,
      weeklyTotalWithChemicals,
      perVisitPrice,
      annualPrice,
      monthlyRecurring,
    };

    const quote: ServiceQuoteResult = {
      ...(calc as any),
      serviceId: (form as any).serviceId ?? cfg.serviceType,
      serviceKey: "microfiberMopping",
      serviceLabel: "Microfiber Mopping",
      frequency: freq,
      perVisit: perVisitPrice,
      monthly: monthlyRecurring,
    } as unknown as ServiceQuoteResult;

    return { calc, quote };
  }, [form]);

  return { form, onChange, quote, calc };
}

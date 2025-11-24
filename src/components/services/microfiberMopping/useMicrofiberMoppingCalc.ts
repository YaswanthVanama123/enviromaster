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
  // Base service meta
  serviceId: "microfiber_mopping",

  // Defaults
  frequency: cfg.defaultFrequency,
  contractTermMonths: 12,

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

      // UX rule: huge bathroom path clears standard bathroom count
      if (name === "hugeBathroomSqFt") {
        const sq = Number(nextValue) || 0;
        if (sq > 0) {
          next.bathroomCount = 0;
          next.isHugeBathroom = true;
        } else if (sq === 0) {
          next.isHugeBathroom = false;
        }
      }

      if (name === "isHugeBathroom" && nextValue === true) {
        next.bathroomCount = 0;
      }

      return next;
    });
  };

  const { calc, quote } = useMemo(() => {
    const freq: MicrofiberFrequencyKey = form.frequency ?? cfg.defaultFrequency;
    const conv = getBillingConversion(freq);
    const { actualWeeksPerYear, actualWeeksPerMonth } = cfg.billingConversions;
    const isAllInclusive = !!form.isAllInclusive;

    // ----------------------------
    // 1) Bathrooms (included with Sani)
    // ----------------------------
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

    // ----------------------------
    // 2) Extra non-bath area
    // Rule: $100 OR $10 per 400 sq ft, whichever is more.
    // ----------------------------
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

    // ----------------------------
    // 3) Stand-alone microfiber mopping
    // Rule (base): $10 per 200 sq ft, $40 minimum.
    // Trip charge is now removed from the math (always 0).
    // ----------------------------
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

      // NEW: trip charge concept removed → always 0 in calculations
      standaloneTripCharge = 0;
      standaloneTotal = standaloneServicePrice;
    }

    // ----------------------------
    // 4) Chemical supply (customer self-mopping)
    // Rule: $27.34 / gallon (diluted) – per month.
    // ----------------------------
    const chemicalSupplyMonthly =
      form.chemicalGallons > 0
        ? form.chemicalGallons *
          cfg.chemicalProducts.dailyChemicalPerGallon
        : 0;

    // ----------------------------
    // 5) Per-visit total
    // ----------------------------
    const perVisitServiceTotal =
      bathroomPrice + extraAreaPrice + standaloneTotal;

    const perVisitPrice = perVisitServiceTotal;

    // ----------------------------
    // 6) Monthly (4.33 weeks logic) and contract
    // ----------------------------
    const monthlyVisits = conv.monthlyMultiplier; // 4.33, ~2.17 or 1
    const monthlyService = perVisitPrice * monthlyVisits;
    const monthlyRecurring = monthlyService + chemicalSupplyMonthly;

    // First visit / first month rules
    // For Microfiber we don't have a separate installation fee,
    // so installFee is treated as 0 here.
    const installFee = 0;
    const firstVisitPrice = installFee; // install-only, but 0 in this service

    // First month = install-only first visit + (monthlyVisits − 1) × normal service price
    const firstMonthService =
      Math.max(monthlyVisits , 0) * perVisitPrice;
    const firstMonthPrice =
      firstVisitPrice + firstMonthService + chemicalSupplyMonthly;

    // Contract term (2–36 months)
    let contractMonths = Number(form.contractTermMonths) || 0;
    if (contractMonths < 2) contractMonths = 2;
    if (contractMonths > 36) contractMonths = 36;

    const remainingMonths = Math.max(contractMonths - 1, 0);
    const contractTotal =
      firstMonthPrice + remainingMonths * monthlyRecurring;

    // ----------------------------
    // 7) Annual + weekly approximations (not main focus now)
    // ----------------------------
    const annualPrice = monthlyRecurring * 12;

    const weeklyServiceTotal =
      monthlyService / (actualWeeksPerMonth || 4.33);
    const weeklyTotalWithChemicals =
      annualPrice / actualWeeksPerYear;

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
      firstVisitPrice,
      firstMonthPrice,
      contractMonths,
      contractTotal,
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

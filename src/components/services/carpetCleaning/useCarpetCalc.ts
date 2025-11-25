import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type { CarpetFormState, CarpetFrequency } from "./carpetTypes";
import {
  carpetPricingConfig as cfg,
  carpetFrequencyList,
} from "./carpetConfig";

const DEFAULT_FORM: CarpetFormState = {
  serviceId: "carpetCleaning",
  areaSqFt: 0,
  frequency: "monthly",
  location: "insideBeltway",
  needsParking: false,
  tripChargeIncluded: true, // from BaseServiceFormState, but ignored in calc
  notes: "",
  contractMonths: 12,
};

function clampFrequency(f: string): CarpetFrequency {
  return carpetFrequencyList.includes(f as CarpetFrequency)
    ? (f as CarpetFrequency)
    : "monthly";
}

function clampContractMonths(value: unknown): number {
  const num = parseInt(String(value), 10);
  if (!Number.isFinite(num)) return 12;
  if (num < 2) return 2;
  if (num > 36) return 36;
  return num;
}

export function useCarpetCalc(initial?: Partial<CarpetFormState>) {
  const [form, setForm] = useState<CarpetFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {
      switch (name as keyof CarpetFormState) {
        case "areaSqFt": {
          const num = parseFloat(String(value));
          return {
            ...prev,
            areaSqFt: Number.isFinite(num) && num > 0 ? num : 0,
          };
        }

        case "frequency":
          return {
            ...prev,
            frequency: clampFrequency(String(value)),
          };

        case "contractMonths":
          return {
            ...prev,
            contractMonths: clampContractMonths(value),
          };

        case "needsParking":
        case "tripChargeIncluded":
          return {
            ...prev,
            [name]: type === "checkbox" ? !!checked : Boolean(value),
          };

        case "location":
          return {
            ...prev,
            location:
              value === "outsideBeltway" ? "outsideBeltway" : "insideBeltway",
          };

        case "notes":
          return {
            ...prev,
            notes: String(value ?? ""),
          };

        default:
          return prev;
      }
    });
  };

  const {
    perVisitBase,
    perVisitCharge,
    monthlyTotal,
    contractTotal,
    visitsPerYear,
    visitsPerMonth,
    perVisitTrip,
    monthlyTrip,
  } = useMemo(() => {
    const freq = clampFrequency(form.frequency);
    const meta = cfg.frequencyMeta[freq];
    const visitsPerYear = meta?.visitsPerYear ?? 12;
    const visitsPerMonth = visitsPerYear / 12;

    const areaSqFt = form.areaSqFt ?? 0;

    let perVisitBase = 0;
    let perVisitCharge = 0;

    if (areaSqFt > 0) {
      const units = Math.ceil(areaSqFt / cfg.unitSqFt);
      if (units > 0) {
        const extraUnits = Math.max(units - 1, 0);
        perVisitBase =
          cfg.firstUnitRate + extraUnits * cfg.additionalUnitRate;
        perVisitCharge = Math.max(perVisitBase, cfg.perVisitMinimum);
      }
    }

    // Trip is disabled in math (still shown as 0.00 in UI)
    const perVisitTrip = 0;
    const monthlyTrip = 0;

    const monthlyTotal =
      visitsPerMonth > 0 ? perVisitCharge * visitsPerMonth : 0;

    const contractMonths = clampContractMonths(form.contractMonths);
    const contractTotal = monthlyTotal * contractMonths;

    return {
      perVisitBase,
      perVisitCharge,
      monthlyTotal,
      contractTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitTrip,
      monthlyTrip,
    };
  }, [form]);

  const quote: ServiceQuoteResult = useMemo(
    () => ({
      serviceId: form.serviceId,
      perVisit: perVisitCharge,
      monthly: monthlyTotal,
      // re-using `annual` as "contract total" like we did on SaniScrub
      annual: contractTotal,
    }),
    [form.serviceId, perVisitCharge, monthlyTotal, contractTotal]
  );

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: {
      perVisitBase,
      perVisitCharge,
      monthlyTotal,
      contractTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitTrip,
      monthlyTrip,
    },
  };
}

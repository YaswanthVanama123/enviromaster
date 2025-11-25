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
  includeInstall: false,
  isDirtyInstall: false,
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
        case "includeInstall":
        case "isDirtyInstall":
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
    installOneTime,
    firstMonthTotal,
    perVisitEffective,
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

    const serviceActive = areaSqFt > 0;

    // Calculate monthly base (for installation calculation)
    const monthlyBase = perVisitCharge * visitsPerMonth;

    // ---------------- INSTALLATION FEE (SAME AS SANISCRUB) ----------------
    // Install = 3× dirty / 1× clean of MONTHLY BASE (no trip)
    const installOneTime =
      serviceActive && form.includeInstall
        ? monthlyBase *
          (form.isDirtyInstall
            ? cfg.installMultipliers.dirty
            : cfg.installMultipliers.clean)
        : 0;

    // ---------------- FIRST VISIT & FIRST MONTH ----------------
    // First visit = installation only (no normal service)
    // First month = install-only first visit + (monthlyVisits − 1) × normal service price
    const monthlyVisits = visitsPerMonth;
    const firstMonthNormalVisits =
      monthlyVisits > 1 ? monthlyVisits - 1 : 0;

    const firstMonthTotal =
      serviceActive && (installOneTime > 0 || firstMonthNormalVisits > 0)
        ? installOneTime + firstMonthNormalVisits * perVisitCharge
        : 0;

    // ---------------- RECURRING MONTHLY (after first month) ----------------
    const monthlyRecurring =
      serviceActive && visitsPerMonth > 0
        ? perVisitCharge * visitsPerMonth
        : 0;

    // ---------------- CONTRACT TOTAL ----------------
    const contractMonths = clampContractMonths(form.contractMonths);
    const remainingMonths = contractMonths > 1 ? contractMonths - 1 : 0;
    const remainingMonthsTotal = remainingMonths * monthlyRecurring;
    const contractTotal = firstMonthTotal + remainingMonthsTotal;

    // Per-Visit Effective = normal per-visit service price (no install, no trip)
    const perVisitEffective = perVisitCharge;

    return {
      perVisitBase,
      perVisitCharge,
      monthlyTotal: monthlyRecurring,
      contractTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitTrip,
      monthlyTrip,
      installOneTime,
      firstMonthTotal,
      perVisitEffective,
    };
  }, [form]);

  const quote: ServiceQuoteResult = useMemo(
    () => ({
      serviceId: form.serviceId,
      perVisit: perVisitEffective,
      monthly: monthlyTotal,
      // re-using `annual` as "contract total" like we did on SaniScrub
      annual: contractTotal,
    }),
    [form.serviceId, perVisitEffective, monthlyTotal, contractTotal]
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
      installOneTime,
      firstMonthTotal,
      perVisitEffective,
    },
  };
}

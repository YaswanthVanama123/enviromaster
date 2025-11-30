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
      // ✅ CORRECTED PRICING: Per-square-foot after first 500
      // First 500 sq ft = $250
      // Each additional sq ft = $125/500 = $0.25/sq ft
      // Example: 700 sq ft = $250 + (200 × $0.25) = $300

      if (areaSqFt <= cfg.unitSqFt) {
        // 500 sq ft or less: flat rate
        perVisitBase = cfg.firstUnitRate;
      } else {
        // Over 500 sq ft: $250 + extra sq ft × $0.25/sq ft
        const extraSqFt = areaSqFt - cfg.unitSqFt;
        const ratePerSqFt = cfg.additionalUnitRate / cfg.unitSqFt; // $125/500 = $0.25
        perVisitBase = cfg.firstUnitRate + (extraSqFt * ratePerSqFt);
      }

      perVisitCharge = Math.max(perVisitBase, cfg.perVisitMinimum);
    }

    // Trip is disabled in math (still shown as 0.00 in UI)
    const perVisitTrip = 0;
    const monthlyTrip = 0;

    const serviceActive = areaSqFt > 0;

    // ---------------- INSTALLATION FEE ----------------
    // Install = 3× dirty / 1× clean of PER-VISIT charge (NOT monthly)
    // Installation is the same for any frequency type
    const installOneTime =
      serviceActive && form.includeInstall
        ? perVisitCharge *
          (form.isDirtyInstall
            ? cfg.installMultipliers.dirty
            : cfg.installMultipliers.clean)
        : 0;

    // ---------------- RECURRING MONTHLY (normal full month) ----------------
    const monthlyRecurring =
      serviceActive && visitsPerMonth > 0
        ? perVisitCharge * visitsPerMonth
        : 0;

    // ---------------- FIRST VISIT & FIRST MONTH ----------------
    // WITH INSTALLATION:
    //   - First visit = installation only (no normal service)
    //   - First month = install-only first visit + (monthlyVisits − 1) × normal service price
    // WITHOUT INSTALLATION:
    //   - First month = normal full month (same as monthlyRecurring)

    let firstMonthTotal = 0;

    if (serviceActive) {
      if (form.includeInstall && installOneTime > 0) {
        // With installation: install + (monthlyVisits - 1) service visits
        const monthlyVisits = visitsPerMonth;
        const firstMonthNormalVisits = monthlyVisits > 1 ? monthlyVisits - 1 : 0;
        firstMonthTotal = installOneTime + (firstMonthNormalVisits * perVisitCharge);
      } else {
        // No installation: just a normal full month
        firstMonthTotal = monthlyRecurring;
      }
    }

    // ---------------- CONTRACT TOTAL ----------------
    const contractMonths = clampContractMonths(form.contractMonths);

    let contractTotal = 0;
    if (contractMonths > 0) {
      if (form.includeInstall && installOneTime > 0) {
        // With installation: first month (special) + remaining 11 months normal
        const remainingMonths = Math.max(contractMonths - 1, 0);
        contractTotal = firstMonthTotal + (remainingMonths * monthlyRecurring);
      } else {
        // No installation: just contractMonths × normal monthly
        contractTotal = contractMonths * monthlyRecurring;
      }
    }

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
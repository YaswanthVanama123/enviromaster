import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type { CarpetFormState, CarpetFrequency } from "./carpetTypes";
import {
  carpetPricingConfig as cfg,
  carpetFrequencyList,
} from "./carpetConfig";
import { serviceConfigApi } from "../../../backendservice/api";

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendCarpetConfig {
  unitSqFt: number;
  firstUnitRate: number;
  additionalUnitRate: number;
  perVisitMinimum: number;
  installMultipliers: {
    dirty: number;
    clean: number;
  };
  frequencyMeta: {
    monthly: { visitsPerYear: number };
    twicePerMonth: { visitsPerYear: number };
    bimonthly: { visitsPerYear: number };
    quarterly: { visitsPerYear: number };
  };
}

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

  // ✅ NEW: Editable pricing rates from config (will be overridden by backend)
  unitSqFt: cfg.unitSqFt,
  firstUnitRate: cfg.firstUnitRate,
  additionalUnitRate: cfg.additionalUnitRate,
  perVisitMinimum: cfg.perVisitMinimum,
  installMultiplierDirty: cfg.installMultipliers.dirty,
  installMultiplierClean: cfg.installMultipliers.clean,
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

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendCarpetConfig | null>(null);

  // ✅ Fetch COMPLETE pricing configuration from backend on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const data = await serviceConfigApi.getActive("carpetCleaning");

        if (!data || typeof data !== "object" || !("config" in data)) {
          console.warn('⚠️ Carpet Cleaning config not found in backend, using default fallback values');
          return;
        }

        const config = data.config as BackendCarpetConfig;

        // ✅ Store the ENTIRE backend config for use in calculations
        setBackendConfig(config);

        setForm((prev) => ({
          ...prev,
          // Update all rate fields from backend if available
          unitSqFt: config.unitSqFt ?? prev.unitSqFt,
          firstUnitRate: config.firstUnitRate ?? prev.firstUnitRate,
          additionalUnitRate: config.additionalUnitRate ?? prev.additionalUnitRate,
          perVisitMinimum: config.perVisitMinimum ?? prev.perVisitMinimum,
          installMultiplierDirty: config.installMultipliers?.dirty ?? prev.installMultiplierDirty,
          installMultiplierClean: config.installMultipliers?.clean ?? prev.installMultiplierClean,
        }));

        console.log('✅ Carpet Cleaning FULL CONFIG loaded from backend:', {
          unitSqFt: config.unitSqFt,
          firstUnitRate: config.firstUnitRate,
          additionalUnitRate: config.additionalUnitRate,
          perVisitMinimum: config.perVisitMinimum,
          installMultipliers: config.installMultipliers,
          frequencyMeta: config.frequencyMeta,
        });
      } catch (error) {
        console.error('❌ Failed to fetch Carpet Cleaning config from backend:', error);
        console.log('⚠️ Using default hardcoded values as fallback');
      }
    };

    fetchPricing();
  }, []); // Run once on mount

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

        // ✅ NEW: Handle editable rate fields
        case "unitSqFt":
        case "firstUnitRate":
        case "additionalUnitRate":
        case "perVisitMinimum":
        case "installMultiplierDirty":
        case "installMultiplierClean": {
          const num = parseFloat(String(value));
          return {
            ...prev,
            [name]: Number.isFinite(num) && num >= 0 ? num : 0,
          };
        }

        // ✅ NEW: Handle custom override fields
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customFirstMonthPrice":
        case "customContractTotal":
        case "customInstallationFee": {
          const numVal = value === '' ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            return { ...prev, [name]: numVal };
          }
          return prev;
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
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = backendConfig || {
      unitSqFt: cfg.unitSqFt,
      firstUnitRate: cfg.firstUnitRate,
      additionalUnitRate: cfg.additionalUnitRate,
      perVisitMinimum: cfg.perVisitMinimum,
      installMultipliers: cfg.installMultipliers,
      frequencyMeta: cfg.frequencyMeta,
    };

    const freq = clampFrequency(form.frequency);
    const meta = activeConfig.frequencyMeta[freq];  // ✅ FROM BACKEND
    const visitsPerYear = meta?.visitsPerYear ?? 12;
    const visitsPerMonth = visitsPerYear / 12;

    const areaSqFt = form.areaSqFt ?? 0;

    let calculatedPerVisitBase = 0;
    let calculatedPerVisitCharge = 0;

    if (areaSqFt > 0) {
      // ✅ CORRECTED PRICING: Per-square-foot after first 500
      // First 500 sq ft = $250
      // Each additional sq ft = $125/500 = $0.25/sq ft
      // Example: 700 sq ft = $250 + (200 × $0.25) = $300

      if (areaSqFt <= form.unitSqFt) {  // ✅ USE FORM VALUE (from backend)
        // 500 sq ft or less: flat rate
        calculatedPerVisitBase = form.firstUnitRate;  // ✅ USE FORM VALUE
      } else {
        // Over 500 sq ft: $250 + extra sq ft × $0.25/sq ft
        const extraSqFt = areaSqFt - form.unitSqFt;  // ✅ USE FORM VALUE
        const ratePerSqFt = form.additionalUnitRate / form.unitSqFt; // ✅ USE FORM VALUES ($125/500 = $0.25)
        calculatedPerVisitBase = form.firstUnitRate + (extraSqFt * ratePerSqFt);  // ✅ USE FORM VALUE
      }

      calculatedPerVisitCharge = Math.max(calculatedPerVisitBase, form.perVisitMinimum);  // ✅ USE FORM VALUE
    }

    // Use custom override if set, otherwise use calculated
    const perVisitBase = calculatedPerVisitBase;
    const perVisitCharge = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : calculatedPerVisitCharge;

    // Trip is disabled in math (still shown as 0.00 in UI)
    const perVisitTrip = 0;
    const monthlyTrip = 0;

    const serviceActive = areaSqFt > 0;

    // ---------------- INSTALLATION FEE ----------------
    // Install = 3× dirty / 1× clean of PER-VISIT charge (NOT monthly)
    // Installation is the same for any frequency type
    const calculatedInstallOneTime =
      serviceActive && form.includeInstall
        ? calculatedPerVisitCharge *
          (form.isDirtyInstall
            ? form.installMultiplierDirty  // ✅ USE FORM VALUE (from backend)
            : form.installMultiplierClean)  // ✅ USE FORM VALUE (from backend)
        : 0;

    // Use custom override if set, otherwise use calculated
    const installOneTime = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOneTime;

    // ---------------- RECURRING MONTHLY (normal full month) ----------------
    const calculatedMonthlyRecurring =
      serviceActive && visitsPerMonth > 0
        ? perVisitCharge * visitsPerMonth
        : 0;

    // Use custom override if set
    const monthlyRecurring = form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : calculatedMonthlyRecurring;

    // ---------------- FIRST VISIT & FIRST MONTH ----------------
    // WITH INSTALLATION:
    //   - First visit = installation only (no normal service)
    //   - First month = install-only first visit + (monthlyVisits − 1) × normal service price
    // WITHOUT INSTALLATION:
    //   - First month = normal full month (same as monthlyRecurring)

    let calculatedFirstMonthTotal = 0;

    if (serviceActive) {
      if (form.includeInstall && installOneTime > 0) {
        // With installation: install + (monthlyVisits - 1) service visits
        const monthlyVisits = visitsPerMonth;
        const firstMonthNormalVisits = monthlyVisits > 1 ? monthlyVisits - 1 : 0;
        calculatedFirstMonthTotal = installOneTime + (firstMonthNormalVisits * perVisitCharge);
      } else {
        // No installation: just a normal full month
        calculatedFirstMonthTotal = monthlyRecurring;
      }
    }

    // Use custom override if set
    const firstMonthTotal = form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthTotal;

    // ---------------- CONTRACT TOTAL ----------------
    const contractMonths = clampContractMonths(form.contractMonths);

    let calculatedContractTotal = 0;
    if (contractMonths > 0) {
      if (form.includeInstall && installOneTime > 0) {
        // With installation: first month (special) + remaining 11 months normal
        const remainingMonths = Math.max(contractMonths - 1, 0);
        calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyRecurring);
      } else {
        // No installation: just contractMonths × normal monthly
        calculatedContractTotal = contractMonths * monthlyRecurring;
      }
    }

    // Use custom override if set
    const contractTotal = form.customContractTotal !== undefined
      ? form.customContractTotal
      : calculatedContractTotal;

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
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form.areaSqFt,
    form.frequency,
    form.contractMonths,
    form.includeInstall,
    form.isDirtyInstall,
    // ✅ NEW: Editable rate fields (from backend)
    form.unitSqFt,
    form.firstUnitRate,
    form.additionalUnitRate,
    form.perVisitMinimum,
    form.installMultiplierDirty,
    form.installMultiplierClean,
    // ✅ NEW: Custom override fields
    form.customPerVisitPrice,
    form.customMonthlyRecurring,
    form.customFirstMonthPrice,
    form.customContractTotal,
    form.customInstallationFee,
  ]);

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
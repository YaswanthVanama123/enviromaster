import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type { SaniscrubFormState, SaniscrubFrequency } from "./saniscrubTypes";
import {
  saniscrubPricingConfig as cfg,
  saniscrubFrequencyList,
} from "./saniscrubConfig";
import { serviceConfigApi } from "../../../backendservice/api";

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendSaniscrubConfig {
  fixtureRates: {
    monthly: number;
    twicePerMonth: number;
    bimonthly: number;
    quarterly: number;
  };
  minimums: {
    monthly: number;
    twicePerMonth: number;
    bimonthly: number;
    quarterly: number;
  };
  nonBathroomUnitSqFt: number;
  nonBathroomFirstUnitRate: number;
  nonBathroomAdditionalUnitRate: number;
  installMultipliers: {
    dirty: number;
    clean: number;
  };
  tripChargeBase: number;
  parkingFee: number;
  frequencyMeta: {
    monthly: { visitsPerYear: number };
    twicePerMonth: { visitsPerYear: number };
    bimonthly: { visitsPerYear: number };
    quarterly: { visitsPerYear: number };
  };
  twoTimesPerMonthDiscountFlat: number;
}

const DEFAULT_FORM: SaniscrubFormState = {
  serviceId: "saniscrub",
  fixtureCount: 0,
  nonBathroomSqFt: 0,
  useExactNonBathroomSqft: true, // ✅ Default to exact calculation
  frequency: "monthly",
  hasSaniClean: true,
  location: "insideBeltway",
  needsParking: false,
  tripChargeIncluded: true, // still in BaseServiceFormState, but ignored now
  includeInstall: false,
  isDirtyInstall: false,
  notes: "",
  contractMonths: 12, // default contract term

  // ✅ NEW: Editable pricing rates from config (will be overridden by backend)
  fixtureRateMonthly: cfg.fixtureRates.monthly,
  fixtureRateBimonthly: cfg.fixtureRates.bimonthly,
  fixtureRateQuarterly: cfg.fixtureRates.quarterly,
  minimumMonthly: cfg.minimums.monthly,
  minimumBimonthly: cfg.minimums.bimonthly,
  nonBathroomFirstUnitRate: cfg.nonBathroomFirstUnitRate,
  nonBathroomAdditionalUnitRate: cfg.nonBathroomAdditionalUnitRate,
  installMultiplierDirty: cfg.installMultipliers.dirty,
  installMultiplierClean: cfg.installMultipliers.clean,
  twoTimesPerMonthDiscount: cfg.twoTimesPerMonthDiscountFlat,
};

function clampFrequency(f: string): SaniscrubFrequency {
  return saniscrubFrequencyList.includes(f as SaniscrubFrequency)
    ? (f as SaniscrubFrequency)
    : "monthly";
}

function clampContractMonths(value: unknown): number {
  const num = parseInt(String(value), 10);
  if (!Number.isFinite(num)) return 12;
  if (num < 2) return 2;
  if (num > 36) return 36;
  return num;
}

export function useSaniscrubCalc(initial?: Partial<SaniscrubFormState>) {
  const [form, setForm] = useState<SaniscrubFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendSaniscrubConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("saniscrub");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ SaniScrub config not found in backend, using default fallback values');
        return;
      }

      // ✅ Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ SaniScrub document has no config property');
        return;
      }

      const config = document.config as BackendSaniscrubConfig;

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);

      setForm((prev) => ({
        ...prev,
        // Update all rate fields from backend if available
        fixtureRateMonthly: config.fixtureRates?.monthly ?? prev.fixtureRateMonthly,
        fixtureRateBimonthly: config.fixtureRates?.bimonthly ?? prev.fixtureRateBimonthly,
        fixtureRateQuarterly: config.fixtureRates?.quarterly ?? prev.fixtureRateQuarterly,
        minimumMonthly: config.minimums?.monthly ?? prev.minimumMonthly,
        minimumBimonthly: config.minimums?.bimonthly ?? prev.minimumBimonthly,
        nonBathroomFirstUnitRate: config.nonBathroomFirstUnitRate ?? prev.nonBathroomFirstUnitRate,
        nonBathroomAdditionalUnitRate: config.nonBathroomAdditionalUnitRate ?? prev.nonBathroomAdditionalUnitRate,
        installMultiplierDirty: config.installMultipliers?.dirty ?? prev.installMultiplierDirty,
        installMultiplierClean: config.installMultipliers?.clean ?? prev.installMultiplierClean,
        twoTimesPerMonthDiscount: config.twoTimesPerMonthDiscountFlat ?? prev.twoTimesPerMonthDiscount,
      }));

      console.log('✅ SaniScrub FULL CONFIG loaded from backend:', {
        fixtureRates: config.fixtureRates,
        minimums: config.minimums,
        nonBathroomPricing: {
          unitSqFt: config.nonBathroomUnitSqFt,
          firstUnitRate: config.nonBathroomFirstUnitRate,
          additionalUnitRate: config.nonBathroomAdditionalUnitRate,
        },
        installMultipliers: config.installMultipliers,
        frequencyMeta: config.frequencyMeta,
        twoTimesPerMonthDiscount: config.twoTimesPerMonthDiscountFlat,
      });
    } catch (error) {
      console.error('❌ Failed to fetch SaniScrub config from backend:', error);
      console.log('⚠️ Using default hardcoded values as fallback');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // ✅ Fetch pricing configuration on mount
  useEffect(() => {
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {
      switch (name as keyof SaniscrubFormState) {
        case "fixtureCount":
        case "nonBathroomSqFt": {
          const num = parseFloat(String(value));
          return {
            ...prev,
            [name]: Number.isFinite(num) && num > 0 ? num : 0,
          };
        }

        // ✅ NEW: Handle editable rate fields
        case "fixtureRateMonthly":
        case "fixtureRateBimonthly":
        case "fixtureRateQuarterly":
        case "minimumMonthly":
        case "minimumBimonthly":
        case "nonBathroomFirstUnitRate":
        case "nonBathroomAdditionalUnitRate":
        case "installMultiplierDirty":
        case "installMultiplierClean":
        case "twoTimesPerMonthDiscount": {
          const num = parseFloat(String(value));
          return {
            ...prev,
            [name]: Number.isFinite(num) && num >= 0 ? num : 0,
          };
        }

        // ✅ NEW: Handle custom installation fee
        case "customInstallationFee": {
          const numVal = value === '' ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            return { ...prev, customInstallationFee: numVal };
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

        case "hasSaniClean":
        case "needsParking":
        case "tripChargeIncluded":
        case "includeInstall":
        case "isDirtyInstall":
        case "useExactNonBathroomSqft":
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
    fixtureMonthly,
    fixturePerVisit,
    nonBathroomPerVisit,
    nonBathroomMonthly,
    monthlyBase,
    perVisitTrip,
    monthlyTrip,
    monthlyTotal,
    annualTotal,
    visitsPerYear,
    visitsPerMonth,
    perVisitEffective,
    installOneTime,
    firstMonthTotal,
    contractTotal,
    // ✅ NEW: Frequency-specific UI helpers
    frequency,
    isVisitBasedFrequency,
    monthsPerVisit,
    totalVisitsForContract,
    // ✅ NEW: Backend config values for UI
    nonBathroomUnitSqFt,
  } = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    // Merge backend config with local config, ensuring all frequencies are available
    const activeConfig = backendConfig ? {
      fixtureRates: backendConfig.fixtureRates ?? cfg.fixtureRates,
      minimums: backendConfig.minimums ?? cfg.minimums,
      nonBathroomUnitSqFt: backendConfig.nonBathroomUnitSqFt ?? cfg.nonBathroomUnitSqFt,
      nonBathroomFirstUnitRate: backendConfig.nonBathroomFirstUnitRate ?? cfg.nonBathroomFirstUnitRate,
      nonBathroomAdditionalUnitRate: backendConfig.nonBathroomAdditionalUnitRate ?? cfg.nonBathroomAdditionalUnitRate,
      installMultipliers: backendConfig.installMultipliers ?? cfg.installMultipliers,
      tripChargeBase: backendConfig.tripChargeBase ?? cfg.tripChargeBase,
      parkingFee: backendConfig.parkingFee ?? cfg.parkingFee,
      twoTimesPerMonthDiscountFlat: backendConfig.twoTimesPerMonthDiscountFlat ?? cfg.twoTimesPerMonthDiscountFlat,
      // ✅ CRITICAL: Merge frequencyMeta to ensure all frequencies are available
      frequencyMeta: {
        ...cfg.frequencyMeta, // Start with local config (has all frequencies)
        ...backendConfig.frequencyMeta, // Override with backend values if they exist
      },
    } : {
      fixtureRates: cfg.fixtureRates,
      minimums: cfg.minimums,
      nonBathroomUnitSqFt: cfg.nonBathroomUnitSqFt,
      nonBathroomFirstUnitRate: cfg.nonBathroomFirstUnitRate,
      nonBathroomAdditionalUnitRate: cfg.nonBathroomAdditionalUnitRate,
      installMultipliers: cfg.installMultipliers,
      tripChargeBase: cfg.tripChargeBase,
      parkingFee: cfg.parkingFee,
      frequencyMeta: cfg.frequencyMeta,
      twoTimesPerMonthDiscountFlat: cfg.twoTimesPerMonthDiscountFlat,
    };

    const freq = clampFrequency(form.frequency);
    const freqMeta = activeConfig.frequencyMeta[freq];  // ✅ NOW GUARANTEED to have all frequencies from local config
    const visitsPerYear = freqMeta?.visitsPerYear ?? 12;
    const visitsPerMonth = visitsPerYear / 12;

    const fixtureCount = form.fixtureCount ?? 0;
    const nonBathSqFt = form.nonBathroomSqFt ?? 0;

    // ========== ✅ REWRITTEN: CORRECT SANISCRUB PRICING RULES ==========

    // ---------------- 1) RESTROOM FIXTURES ----------------
    let fixtureMonthly = 0;
    let fixturePerVisit = 0;

    if (fixtureCount > 0) {
      if (freq === "monthly") {
        // Monthly: $25/fixture or $175 minimum
        const rawAmount = fixtureCount * 25;
        const withMinimum = Math.max(rawAmount, 175);
        fixtureMonthly = withMinimum;
        fixturePerVisit = withMinimum; // 1 visit per month
      } else if (freq === "twicePerMonth") {
        // 2x/month: Calculate monthly price, then subtract $15 if has SaniClean
        const monthlyPrice = Math.max(fixtureCount * 25, 175);
        let twiceMonthlyPrice = monthlyPrice * 2; // Base: 2x monthly

        if (form.hasSaniClean) {
          twiceMonthlyPrice = Math.max(0, twiceMonthlyPrice - 15); // -$15 discount
        }

        fixtureMonthly = twiceMonthlyPrice;
        fixturePerVisit = (twiceMonthlyPrice * 12) / visitsPerYear; // Convert to per-visit
      } else if (freq === "bimonthly") {
        // Bi-monthly: $35/fixture or $250 minimum PER VISIT
        const rawPerVisit = fixtureCount * 35;
        const perVisitWithMin = Math.max(rawPerVisit, 250);
        fixturePerVisit = perVisitWithMin;
        fixtureMonthly = (perVisitWithMin * visitsPerYear) / 12;
      } else if (freq === "quarterly") {
        // Quarterly: $40/fixture or $250 minimum PER VISIT
        const rawPerVisit = fixtureCount * 40;
        const perVisitWithMin = Math.max(rawPerVisit, 250);
        fixturePerVisit = perVisitWithMin;
        fixtureMonthly = (perVisitWithMin * visitsPerYear) / 12;
      }
    }

    // ---------------- 2) NON-BATHROOM AREA ----------------
    let nonBathroomPerVisit = 0;
    let nonBathroomMonthly = 0;

    if (nonBathSqFt > 0) {
      // Rule: $250 for up to 500 sq ft, then +$125 for each additional 500 sq ft block
      // Example: 3000 sq ft = 6 units = $250 + 5×$125 = $875

      if (nonBathSqFt <= 500) {
        // Up to 500 sq ft: flat $250
        nonBathroomPerVisit = 250;
      } else {
        // Over 500 sq ft: $250 + additional 500 sq ft blocks × $125
        const totalBlocks = Math.ceil(nonBathSqFt / 500);
        const additionalBlocks = totalBlocks - 1; // First block is included in $250
        nonBathroomPerVisit = 250 + (additionalBlocks * 125);
      }

      nonBathroomMonthly = (nonBathroomPerVisit * visitsPerYear) / 12;
    }

    // ---------------- 3) TRIP CHARGE ----------------
    // Trip charge: $8 + parking (like SaniClean)
    const baseTrip = 8; // $8 base trip charge
    const parkingCharge = form.needsParking ? activeConfig.parkingFee : 0;
    const perVisitTrip = baseTrip + parkingCharge;
    const monthlyTrip = perVisitTrip * visitsPerMonth;

    // ---------------- 4) TOTALS ----------------
    const monthlyBase = fixtureMonthly + nonBathroomMonthly;
    const perVisitWithoutTrip = fixturePerVisit + nonBathroomPerVisit;
    const perVisitWithTrip = perVisitWithoutTrip + perVisitTrip;

    const serviceActive = fixtureCount > 0 || nonBathSqFt > 0;

    // Monthly recurring (service + trip)
    const monthlyRecurring = monthlyBase + monthlyTrip;

    // ---------------- 5) INSTALLATION ----------------
    // Installation = 3× (dirty) or 1× (clean) of TOTAL service price (no trip charge in install base)
    const installationBasePrice = perVisitWithoutTrip; // Service only, no trip
    const installMultiplier = form.isDirtyInstall
      ? activeConfig.installMultipliers.dirty  // 3×
      : activeConfig.installMultipliers.clean; // 1×

    const calculatedInstallOneTime = serviceActive && form.includeInstall
      ? installationBasePrice * installMultiplier
      : 0;

    // Use custom installation fee if set, otherwise use calculated
    const installOneTime = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOneTime;

    // ---------------- 6) FIRST MONTH ----------------
    let firstMonthTotal = 0;

    if (serviceActive) {
      if (freq === "monthly") {
        // Monthly: install + 1 service visit (with trip)
        firstMonthTotal = installOneTime + perVisitWithTrip;
      } else if (freq === "twicePerMonth") {
        // 2x/month: install + full monthly recurring
        firstMonthTotal = installOneTime + monthlyRecurring;
      } else {
        // Bi-monthly/quarterly: install-only first visit + remaining visits
        const monthlyVisits = visitsPerMonth;
        const firstMonthNormalVisits = Math.max(monthlyVisits - 1, 0);
        firstMonthTotal = installOneTime + (firstMonthNormalVisits * perVisitWithTrip);
      }
    }

    // ---------------- 7) CONTRACT TOTAL ----------------
    const contractMonths = clampContractMonths(form.contractMonths);
    let contractTotal = 0;

    if (freq === "bimonthly" || freq === "quarterly") {
      // Visit-based calculation
      const monthsPerVisit = freq === "bimonthly" ? 2 : 3;
      const totalVisits = Math.floor(contractMonths / monthsPerVisit);

      if (totalVisits > 0) {
        if (form.includeInstall && installOneTime > 0) {
          // First visit = install + service + trip, remaining visits = service + trip
          const firstVisitTotal = installOneTime + perVisitWithTrip;
          const remainingVisits = Math.max(totalVisits - 1, 0);
          contractTotal = firstVisitTotal + (remainingVisits * perVisitWithTrip);
        } else {
          // No installation: all visits = service + trip
          contractTotal = totalVisits * perVisitWithTrip;
        }
      }
    } else {
      // Month-based calculation (monthly/2x month)
      if (form.includeInstall && installOneTime > 0) {
        // First month (special) + remaining months (normal)
        const remainingMonths = Math.max(contractMonths - 1, 0);
        contractTotal = firstMonthTotal + (remainingMonths * monthlyRecurring);
      } else {
        // No installation: all months the same
        contractTotal = contractMonths * monthlyRecurring;
      }
    }

    // UI Values
    const monthlyTotal = monthlyRecurring;
    const annualTotal = contractTotal;
    const perVisitEffective = perVisitWithTrip;

    // Frequency helpers
    const isVisitBasedFrequency = freq === "bimonthly" || freq === "quarterly";
    const monthsPerVisit = freq === "bimonthly" ? 2 : freq === "quarterly" ? 3 : 1;
    const totalVisitsForContract = isVisitBasedFrequency
      ? Math.floor(contractMonths / monthsPerVisit)
      : contractMonths;

    return {
      fixtureMonthly,
      fixturePerVisit,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      monthlyBase,
      perVisitTrip,
      monthlyTrip,
      monthlyTotal,
      annualTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitEffective,
      installOneTime,
      firstMonthTotal,
      contractTotal,
      frequency: freq,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
      nonBathroomUnitSqFt: activeConfig.nonBathroomUnitSqFt,
    };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form.fixtureCount,
    form.nonBathroomSqFt,
    form.frequency,
    form.hasSaniClean,
    form.needsParking,
    form.includeInstall,
    form.isDirtyInstall,
    form.contractMonths,
    form.customInstallationFee,
  ]);

  const quote: ServiceQuoteResult = useMemo(
    () => ({
      serviceId: form.serviceId,
      perVisit: perVisitEffective,
      monthly: monthlyTotal, // normal recurring month
      annual: annualTotal, // here: TOTAL CONTRACT PRICE
    }),
    [form.serviceId, perVisitEffective, monthlyTotal, annualTotal]
  );

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: {
      fixtureMonthly,
      fixturePerVisit,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      monthlyBase,
      perVisitTrip,
      monthlyTrip,
      monthlyTotal,
      annualTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitEffective,
      installOneTime,
      firstMonthTotal,
      contractTotal,
      // ✅ NEW: Frequency-specific UI helpers
      frequency,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
      // ✅ NEW: Backend config values for UI
      nonBathroomUnitSqFt,
    },
    refreshConfig: fetchPricing,
    isLoadingConfig,
  };
}

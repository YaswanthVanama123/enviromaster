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
    fixtureRawForMinimum,
    fixtureMinimumApplied,
    nonBathroomPerVisit,
    nonBathroomMonthly,
    // ✅ NEW: Non-bathroom minimum tracking
    nonBathroomRawForMinimum,
    nonBathroomMinimumApplied,
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
    const activeConfig = backendConfig || {
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
    const freqMeta = activeConfig.frequencyMeta[freq];  // ✅ FROM BACKEND
    const visitsPerYear = freqMeta?.visitsPerYear ?? 12;
    const visitsPerMonth = visitsPerYear / 12;

    const fixtureCount = form.fixtureCount ?? 0;
    const nonBathSqFt = form.nonBathroomSqFt ?? 0;

    // ---------------- 1) Bathroom fixtures ----------------
    let fixtureMonthly = 0;
    let fixturePerVisit = 0;
    let fixtureRawForMinimum = 0;
    let fixtureMinimumApplied = 0;

    if (fixtureCount > 0) {
      const baseMonthlyRate = form.fixtureRateMonthly; // ✅ Uses form value
      const baseMonthlyMin = form.minimumMonthly; // ✅ Uses form value
      const rawMonthlyAtBase = fixtureCount * baseMonthlyRate;
      const baseMonthlyWithMin = Math.max(rawMonthlyAtBase, baseMonthlyMin);

      if (freq === "monthly") {
        // Monthly: $25/fixture or $175 minimum (per MONTH)
        fixtureMonthly = baseMonthlyWithMin;
        fixturePerVisit = baseMonthlyWithMin; // 1 visit / month

        fixtureRawForMinimum = rawMonthlyAtBase;
        if (rawMonthlyAtBase > 0 && rawMonthlyAtBase <= baseMonthlyMin) {
          fixtureMinimumApplied = baseMonthlyMin;
        }
      } else if (freq === "twicePerMonth") {
        // ✅ FIXED: 2×/month: Show minimum in fixture field, apply discount to monthly total only
        // For fixture field display: show the base minimum (175$)
        fixtureMonthly = baseMonthlyWithMin; // Shows 175$ in fixture field, not 175*2-15

        // For monthly calculation: 2× the base minimum without discount applied yet
        // The discount will be applied later in the monthly total calculation
        // convert that to per-visit using 24 visits/year
        fixturePerVisit = (baseMonthlyWithMin * 12) / visitsPerYear;

        fixtureRawForMinimum = rawMonthlyAtBase;
        if (rawMonthlyAtBase > 0 && rawMonthlyAtBase <= baseMonthlyMin) {
          fixtureMinimumApplied = baseMonthlyMin;
        }
      } else if (freq === "bimonthly") {
        // Bi-Monthly: $35 / fixture, $250 minimum PER VISIT
        const perVisitRate = form.fixtureRateBimonthly; // ✅ Uses form value
        const perVisitMin = form.minimumBimonthly; // ✅ Uses form value

        const rawPerVisit = fixtureCount * perVisitRate;
        const perVisitCharge = Math.max(rawPerVisit, perVisitMin);

        fixturePerVisit = perVisitCharge;
        fixtureMonthly = (perVisitCharge * visitsPerYear) / 12;

        fixtureRawForMinimum = rawPerVisit;
        if (rawPerVisit > 0 && rawPerVisit <= perVisitMin) {
          fixtureMinimumApplied = perVisitMin;
        }
      } else {
        // Quarterly: $40 / fixture, $250 minimum PER VISIT
        const perVisitRate = form.fixtureRateQuarterly; // ✅ Uses form value
        const perVisitMin = form.minimumBimonthly; // ✅ Uses form value

        const rawPerVisit = fixtureCount * perVisitRate;
        const perVisitCharge = Math.max(rawPerVisit, perVisitMin);

        fixturePerVisit = perVisitCharge;
        fixtureMonthly = (perVisitCharge * visitsPerYear) / 12;

        fixtureRawForMinimum = rawPerVisit;
        if (rawPerVisit > 0 && rawPerVisit <= perVisitMin) {
          fixtureMinimumApplied = perVisitMin;
        }
      }
    }

    // ---------------- 2) Non-bathroom Sq Ft ----------------
    let nonBathroomPerVisit = 0;
    let nonBathroomMonthly = 0;
    let nonBathroomRawForMinimum = 0;
    let nonBathroomMinimumApplied = 0;

    if (nonBathSqFt > 0) {
      if (form.useExactNonBathroomSqft) {
        // ✅ EXACT SQFT: Use 500 sq ft units with proper minimum logic
        if (nonBathSqFt <= activeConfig.nonBathroomUnitSqFt) {
          // ≤ 500 sq ft: Always $250 flat rate (even for 400 sq ft)
          nonBathroomPerVisit = form.nonBathroomFirstUnitRate; // $250
          nonBathroomRawForMinimum = form.nonBathroomFirstUnitRate;
        } else {
          // > 500 sq ft: $250 + extra 500 sq ft blocks
          const units = Math.ceil(nonBathSqFt / activeConfig.nonBathroomUnitSqFt);
          const extraUnits = Math.max(units - 1, 0);
          const calculatedAmount = form.nonBathroomFirstUnitRate + (extraUnits * form.nonBathroomAdditionalUnitRate);

          nonBathroomPerVisit = calculatedAmount;
          nonBathroomRawForMinimum = calculatedAmount;
        }
      } else {
        // ✅ DIRECT ADD: Calculate first 500 sq ft + additional sq ft exactly
        if (nonBathSqFt <= activeConfig.nonBathroomUnitSqFt) {
          // ≤ 500 sq ft: Always $250 (first unit cost)
          nonBathroomPerVisit = form.nonBathroomFirstUnitRate; // $250
          nonBathroomRawForMinimum = form.nonBathroomFirstUnitRate;
        } else {
          // > 500 sq ft: $250 (first 500) + exact additional sq ft × rate
          const extraSqFt = nonBathSqFt - activeConfig.nonBathroomUnitSqFt; // sq ft over 500
          const ratePerSqFt = form.nonBathroomAdditionalUnitRate / activeConfig.nonBathroomUnitSqFt; // $125/500 = $0.25
          const calculatedAmount = form.nonBathroomFirstUnitRate + (extraSqFt * ratePerSqFt);

          nonBathroomPerVisit = calculatedAmount;
          nonBathroomRawForMinimum = calculatedAmount;
        }
      }

      nonBathroomMonthly = (nonBathroomPerVisit * visitsPerYear) / 12;
    }

    // ---------------- 3) Trip charge (DISABLED IN CALC) ----------------
    // We keep the UI field but lock the amounts to 0 and do NOT use in math.
    const perVisitTrip = 0;
    const monthlyTrip = 0;

    // ---------------- 4) Base recurring (no install, no trip) ----------------
    const monthlyBase = fixtureMonthly + nonBathroomMonthly;

    const serviceActive = fixtureCount > 0 || nonBathSqFt > 0;

    // ✅ FIXED: Install = 3× dirty / 1× clean of MINIMUM PRICE (not monthlyBase)
    // Use frequency-specific minimum as base for installation
    let installationBasePrice = 0;
    if (freq === "monthly" || freq === "twicePerMonth") {
      installationBasePrice = form.minimumMonthly; // 175$ for monthly
    } else {
      installationBasePrice = form.minimumBimonthly; // 250$ for bi-monthly/quarterly
    }

    const calculatedInstallOneTime =
      serviceActive && form.includeInstall
        ? installationBasePrice *
          (form.isDirtyInstall
            ? form.installMultiplierDirty // ✅ Uses form value
            : form.installMultiplierClean) // ✅ Uses form value
        : 0;

    // ✅ Use custom installation fee if set, otherwise use calculated
    const installOneTime = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOneTime;

    const perVisitWithoutTrip = fixturePerVisit + nonBathroomPerVisit;

    // Monthly recurring AFTER first month (normal service months)
    // ✅ FIXED: Apply 2X/monthly logic and discount at the monthly total level
    let monthlyRecurring = 0;
    if (serviceActive && visitsPerMonth > 0) {
      if (freq === "twicePerMonth") {
        // For 2X/monthly: Calculate as 2× the base monthly amount, then apply discount
        const baseMonthlyAmount = fixtureMonthly + nonBathroomMonthly;
        let twiceMonthlyTotal = baseMonthlyAmount * 2; // 175$ * 2 = 350$

        // Apply discount if has SaniClean
        if (form.hasSaniClean) {
          twiceMonthlyTotal = Math.max(0, twiceMonthlyTotal - form.twoTimesPerMonthDiscount);
        }

        monthlyRecurring = twiceMonthlyTotal;
      } else {
        // For all other frequencies: use per-visit calculation
        monthlyRecurring = perVisitWithoutTrip * visitsPerMonth;
      }
    }

    // ---------------- 5) First visit + first month ----------------
    // ✅ FIXED: Handle 2X/monthly specially for first month calculation
    let firstMonthTotal = 0;

    if (serviceActive) {
      if (freq === "twicePerMonth") {
        // For 2X/monthly: first month = install + full monthly amount (with discount)
        firstMonthTotal = installOneTime + monthlyRecurring;
      } else {
        // For other frequencies: install-only first visit + (monthlyVisits − 1) × normal service price
        const monthlyVisits = visitsPerMonth;
        const firstMonthNormalVisits = monthlyVisits > 1 ? monthlyVisits - 1 : 0;
        firstMonthTotal = installOneTime + (firstMonthNormalVisits * perVisitWithoutTrip);
      }
    }

    // ---------------- 6) Contract term (2–36 months) ----------------
    const contractMonths = clampContractMonths(form.contractMonths);

    let contractTotal = 0;

    // ✅ FIXED: Use frequency-specific calculation logic
    if (freq === "bimonthly" || freq === "quarterly") {
      // For bi-monthly and quarterly: calculate based on actual visits
      const monthsPerVisit = freq === "bimonthly" ? 2 : 3; // Every 2 months or every 3 months
      const totalVisits = Math.floor(contractMonths / monthsPerVisit);

      if (totalVisits > 0) {
        if (form.includeInstall && installOneTime > 0) {
          // With installation: first visit (install + service) + remaining visits (service only)
          const remainingVisits = Math.max(totalVisits - 1, 0);
          const firstVisitTotal = installOneTime + perVisitWithoutTrip;
          contractTotal = firstVisitTotal + (remainingVisits * perVisitWithoutTrip);
        } else {
          // No installation: just total visits × per-visit charge
          contractTotal = totalVisits * perVisitWithoutTrip;
        }
      }
    } else {
      // For monthly and 2X/monthly: use month-based calculation
      if (form.includeInstall && installOneTime > 0) {
        // With installation: first month includes install, remaining months are normal
        const remainingMonths = contractMonths > 1 ? contractMonths - 1 : 0;
        contractTotal = firstMonthTotal + (remainingMonths * monthlyRecurring);
      } else {
        // No installation: all months are the same
        contractTotal = contractMonths * monthlyRecurring;
      }
    }

    // What we expose on the UI:
    //  - Monthly SaniScrub   = normal recurring month (after first)
    //  - "Annual" SaniScrub  = repurposed as TOTAL CONTRACT PRICE
    //  - Per-Visit Effective = normal per-visit service price (no install, no trip)
    const monthlyTotal = monthlyRecurring;
    const annualTotal = contractTotal;
    const perVisitEffective = perVisitWithoutTrip;

    // ✅ NEW: Add frequency-specific helper values for UI
    const isVisitBasedFrequency = freq === "bimonthly" || freq === "quarterly";
    const monthsPerVisit = freq === "bimonthly" ? 2 : freq === "quarterly" ? 3 : 1;
    const totalVisitsForContract = isVisitBasedFrequency
      ? Math.floor(contractMonths / monthsPerVisit)
      : contractMonths; // For monthly/2X monthly, visits = months

    return {
      fixtureMonthly,
      fixturePerVisit,
      fixtureRawForMinimum,
      fixtureMinimumApplied,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      // ✅ NEW: Non-bathroom minimum tracking
      nonBathroomRawForMinimum,
      nonBathroomMinimumApplied,
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
      frequency: freq,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
      // ✅ NEW: Backend config values for UI
      nonBathroomUnitSqFt: activeConfig.nonBathroomUnitSqFt,
    };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form.fixtureCount,
    form.nonBathroomSqFt,
    form.useExactNonBathroomSqft, // ✅ NEW: Re-calculate when checkbox changes
    form.frequency,
    form.hasSaniClean,
    form.includeInstall,
    form.isDirtyInstall,
    form.contractMonths,
    // ✅ NEW: Editable rate fields
    form.fixtureRateMonthly,
    form.fixtureRateBimonthly,
    form.fixtureRateQuarterly,
    form.minimumMonthly,
    form.minimumBimonthly,
    form.nonBathroomFirstUnitRate,
    form.nonBathroomAdditionalUnitRate,
    form.installMultiplierDirty,
    form.installMultiplierClean,
    form.twoTimesPerMonthDiscount,
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
      fixtureRawForMinimum,
      fixtureMinimumApplied,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      // ✅ NEW: Non-bathroom minimum tracking
      nonBathroomRawForMinimum,
      nonBathroomMinimumApplied,
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

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

  // ✅ Fetch COMPLETE pricing configuration from backend on mount
  useEffect(() => {
    const fetchPricing = async () => {
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
      }
    };

    fetchPricing();
  }, []); // Run once on mount

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
        // 2×/month: normal monthly (with 175 minimum), then 2×, then -$15 if SaniClean.
        let twiceMonthly = baseMonthlyWithMin * 2;
        if (form.hasSaniClean) {
          twiceMonthly = Math.max(
            0,
            twiceMonthly - form.twoTimesPerMonthDiscount // ✅ Uses form value
          );
        }

        fixtureMonthly = twiceMonthly;
        // convert that monthly to per-visit using 24 visits/year
        fixturePerVisit = (fixtureMonthly * 12) / visitsPerYear;

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

    if (nonBathSqFt > 0) {
      const units = Math.ceil(nonBathSqFt / activeConfig.nonBathroomUnitSqFt);  // ✅ FROM BACKEND
      if (units > 0) {
        const extraUnits = Math.max(units - 1, 0);
        nonBathroomPerVisit =
          form.nonBathroomFirstUnitRate + // ✅ Uses form value (from backend)
          extraUnits * form.nonBathroomAdditionalUnitRate; // ✅ Uses form value (from backend)

        nonBathroomMonthly = (nonBathroomPerVisit * visitsPerYear) / 12;
      }
    }

    // ---------------- 3) Trip charge (DISABLED IN CALC) ----------------
    // We keep the UI field but lock the amounts to 0 and do NOT use in math.
    const perVisitTrip = 0;
    const monthlyTrip = 0;

    // ---------------- 4) Base recurring (no install, no trip) ----------------
    const monthlyBase = fixtureMonthly + nonBathroomMonthly;

    const serviceActive = fixtureCount > 0 || nonBathSqFt > 0;

    // Install = 3× dirty / 1× clean of MONTHLY BASE (no trip)
    const calculatedInstallOneTime =
      serviceActive && form.includeInstall
        ? monthlyBase *
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
    // Monthly = visitsPerMonth × normal per-visit service price
    const monthlyRecurring =
      serviceActive && visitsPerMonth > 0
        ? perVisitWithoutTrip * visitsPerMonth
        : 0;

    // ---------------- 5) First visit + first month ----------------
    // First visit = install only (no normal service).
    // First month = install-only first visit + (monthlyVisits − 1) × normal service price.
    const monthlyVisits = visitsPerMonth;
    const firstMonthNormalVisits =
      monthlyVisits > 1 ? monthlyVisits - 1 : 0;

    const firstMonthTotal =
      serviceActive && (installOneTime > 0 || firstMonthNormalVisits > 0)
        ? installOneTime + firstMonthNormalVisits * perVisitWithoutTrip
        : 0;

    // ---------------- 6) Contract term (2–36 months) ----------------
    const contractMonths = clampContractMonths(form.contractMonths);

    let contractTotal = 0;

    if (form.includeInstall && installOneTime > 0) {
      // With installation: first month includes install, remaining months are normal
      const remainingMonths = contractMonths > 1 ? contractMonths - 1 : 0;
      contractTotal = firstMonthTotal + (remainingMonths * monthlyRecurring);
    } else {
      // No installation: all months are the same
      contractTotal = contractMonths * monthlyRecurring;
    }

    // What we expose on the UI:
    //  - Monthly SaniScrub   = normal recurring month (after first)
    //  - "Annual" SaniScrub  = repurposed as TOTAL CONTRACT PRICE
    //  - Per-Visit Effective = normal per-visit service price (no install, no trip)
    const monthlyTotal = monthlyRecurring;
    const annualTotal = contractTotal;
    const perVisitEffective = perVisitWithoutTrip;

    return {
      fixtureMonthly,
      fixturePerVisit,
      fixtureRawForMinimum,
      fixtureMinimumApplied,
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
    };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form.fixtureCount,
    form.nonBathroomSqFt,
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
    },
  };
}

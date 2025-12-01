// src/features/services/rpmWindows/useRpmWindowsCalc.ts
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  RpmWindowsFormState,
  RpmFrequencyKey,
  RpmRateCategory,
} from "./rpmWindowsTypes";
import { rpmWindowPricingConfig as cfg } from "./rpmWindowsConfig";

// API base URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendRpmConfig {
  smallWindowRate: number;
  mediumWindowRate: number;
  largeWindowRate: number;
  tripCharge: number;
  installMultiplierFirstTime: number;
  installMultiplierClean: number;
  frequencyMultipliers: {
    weekly: number;
    biweekly: number;
    monthly: number;
    quarterly: number;
    quarterlyFirstTime: number;
  };
  annualFrequencies: {
    weekly: number;
    biweekly: number;
    monthly: number;
    quarterly: number;
  };
  monthlyConversions: {
    weekly: number;
    actualWeeksPerMonth: number;
    actualWeeksPerYear: number;
  };
  rateCategories: {
    redRate: {
      multiplier: number;
      commissionRate: string;
    };
    greenRate: {
      multiplier: number;
      commissionRate: string;
    };
  };
}

const DEFAULT_FORM: RpmWindowsFormState = {
  smallQty: 0,
  mediumQty: 0,
  largeQty: 0,
  smallWindowRate: cfg.smallWindowRate,
  mediumWindowRate: cfg.mediumWindowRate,
  largeWindowRate: cfg.largeWindowRate,
  tripCharge: cfg.tripCharge,
  isFirstTimeInstall: false,
  selectedRateCategory: "redRate",
  includeMirrors: false,
  extraCharges: [],
  frequency: "weekly",
  tripChargeIncluded: true,
  notes: "",
  contractMonths: 12,
};

function mapFrequency(v: string): RpmFrequencyKey {
  if (v === "weekly" || v === "biweekly" || v === "monthly" || v === "quarterly") return v;
  return "weekly";
}

export function useRpmWindowsCalc(initial?: Partial<RpmWindowsFormState>) {
  const [form, setForm] = useState<RpmWindowsFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendRpmConfig | null>(null);

  // ✅ Fetch COMPLETE pricing configuration from backend on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/service-configs/active?serviceId=rpmwindows`);

        if (!response.ok) {
          console.warn('⚠️ RPM Windows config not found in backend, using default fallback values');
          return;
        }

        const data = await response.json();

        if (data && data.config) {
          const config = data.config as BackendRpmConfig;

          // ✅ Store the ENTIRE backend config for use in calculations
          setBackendConfig(config);

          // ✅ Update form state with base window rates
          setForm((prev) => ({
            ...prev,
            smallWindowRate: config.smallWindowRate ?? prev.smallWindowRate,
            mediumWindowRate: config.mediumWindowRate ?? prev.mediumWindowRate,
            largeWindowRate: config.largeWindowRate ?? prev.largeWindowRate,
            tripCharge: config.tripCharge ?? prev.tripCharge,
          }));

          console.log('✅ RPM Windows FULL CONFIG loaded from backend:', {
            windowRates: {
              small: config.smallWindowRate,
              medium: config.mediumWindowRate,
              large: config.largeWindowRate,
            },
            frequencyMultipliers: config.frequencyMultipliers,
            installMultipliers: {
              firstTime: config.installMultiplierFirstTime,
              clean: config.installMultiplierClean,
            },
            rateCategories: config.rateCategories,
            monthlyConversions: config.monthlyConversions,
            annualFrequencies: config.annualFrequencies,
          });
        }
      } catch (error) {
        console.error('❌ Failed to fetch RPM Windows config from backend:', error);
        console.log('⚠️ Using default hardcoded values as fallback');
      }
    };

    fetchPricing();
  }, []); // Run once on mount

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, checked } = e.target as any;

    setForm((prev) => {
      switch (name) {
        case "frequency":
          return { ...prev, frequency: mapFrequency(value) };

        case "selectedRateCategory":
          return { ...prev, selectedRateCategory: value as RpmRateCategory };

        case "includeMirrors":
          return { ...prev, includeMirrors: !!checked };

        case "smallQty":
        case "mediumQty":
        case "largeQty":
          return { ...prev, [name]: Number(value) || 0 };

        case "contractMonths":
          return { ...prev, contractMonths: Number(value) || 0 };

        // Custom total overrides
        case "customSmallTotal":
        case "customMediumTotal":
        case "customLargeTotal":
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customAnnualPrice": {
          // Allow empty string to clear the field (set to undefined)
          if (value === '') {
            return { ...prev, [name]: undefined };
          }
          const numVal = parseFloat(value);
          if (!isNaN(numVal)) {
            return { ...prev, [name]: numVal };
          }
          return prev;
        }

        case "customInstallationFee": {
          if (value === '') {
            return { ...prev, customInstallationFee: undefined };
          }
          const numVal = parseFloat(value);
          if (!isNaN(numVal)) {
            return { ...prev, customInstallationFee: numVal };
          }
          return prev;
        }

        // convert UI "this frequency" rates back to weekly base
        case "smallWindowRate":
        case "mediumWindowRate":
        case "largeWindowRate":
        case "tripCharge": {
          const freqMult = getFrequencyMultiplier(mapFrequency(prev.frequency)) || 1;
          const displayVal = Number(value) || 0;
          return { ...prev, [name]: displayVal / freqMult };
        }

        default:
          return prev;
      }
    });
  };

  // + Button handlers
  const addExtraCharge = () => {
    setForm((prev) => ({
      ...prev,
      extraCharges: [
        ...prev.extraCharges,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          calcText: "",
          description: "",
          amount: 0,
        },
      ],
    }));
  };

  const updateExtraCharge = (
    id: string,
    field: "calcText" | "description" | "amount",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.map((line) =>
        line.id === id
          ? { ...line, [field]: field === "amount" ? Number(value) || 0 : value }
          : line
      ),
    }));
  };

  const removeExtraCharge = (id: string) => {
    setForm((prev) => ({
      ...prev,
      extraCharges: prev.extraCharges.filter((line) => line.id !== id),
    }));
  };

  const calc = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = backendConfig || {
      smallWindowRate: cfg.smallWindowRate,
      mediumWindowRate: cfg.mediumWindowRate,
      largeWindowRate: cfg.largeWindowRate,
      tripCharge: cfg.tripCharge,
      installMultiplierFirstTime: cfg.installMultiplierFirstTime,
      installMultiplierClean: cfg.installMultiplierClean,
      frequencyMultipliers: cfg.frequencyMultipliers,
      rateCategories: cfg.rateCategories,
      monthlyConversions: cfg.monthlyConversions,
      annualFrequencies: cfg.annualFrequencies,
    };

    const freqKey = mapFrequency(form.frequency);

    // ✅ FREQUENCY MULTIPLIER FROM BACKEND (NOT HARDCODED!)
    // When you select bi-weekly, this will be 1.25 FROM YOUR MONGODB CONFIG
    const freqMult = activeConfig.frequencyMultipliers[freqKey] || 1;

    const weeklySmall = form.smallWindowRate;
    const weeklyMedium = form.mediumWindowRate;
    const weeklyLarge = form.largeWindowRate;
    const weeklyTrip = form.tripCharge; // will be 0, used only for display

    // Weekly base window cost
    const weeklyWindows =
      form.smallQty * weeklySmall +
      form.mediumQty * weeklyMedium +
      form.largeQty * weeklyLarge;

    const hasWindows = weeklyWindows > 0;

    // Frequency-adjusted (this is what we show in the UI)
    const effSmall = weeklySmall * freqMult;
    const effMedium = weeklyMedium * freqMult;
    const effLarge = weeklyLarge * freqMult;
    const effTrip = weeklyTrip * freqMult; // display only

    // Per-visit, at chosen frequency (NO TRIP CHARGE ANYMORE)
    const perVisitWindows =
      form.smallQty * effSmall +
      form.mediumQty * effMedium +
      form.largeQty * effLarge;

    const perVisitService = hasWindows ? perVisitWindows : 0;

    const extrasTotal = form.extraCharges.reduce(
      (s, l) => s + (l.amount || 0),
      0
    );

    const recurringPerVisitBase = perVisitService + extrasTotal;

    // ✅ RATE CATEGORY FROM BACKEND (red/green multipliers)
    const rateCfg =
      activeConfig.rateCategories[form.selectedRateCategory] ??
      activeConfig.rateCategories.redRate;

    const recurringPerVisitRated = recurringPerVisitBase * rateCfg.multiplier;

    // ✅ INSTALLATION MULTIPLIER FROM BACKEND (NOT HARDCODED!)
    // First time install = 3x, Clean = 1x (from your MongoDB config)
    const installMultiplier = form.isFirstTimeInstall
      ? activeConfig.installMultiplierFirstTime
      : activeConfig.installMultiplierClean;

    const installOneTimeBase =
      form.isFirstTimeInstall && hasWindows
        ? weeklyWindows * installMultiplier
        : 0;

    const installOneTime = installOneTimeBase * rateCfg.multiplier;

    // FIRST VISIT PRICE = INSTALLATION ONLY (no normal service on that visit)
    const firstVisitTotalRated = installOneTime;

    // ✅ MONTHLY VISITS FROM BACKEND CONFIG (NOT HARDCODED!)
    // Uses your monthlyConversions.weekly: 4.33 from MongoDB
    let monthlyVisits = 0;
    const weeksPerMonth = activeConfig.monthlyConversions.actualWeeksPerMonth ?? 4.33;

    if (freqKey === "weekly") monthlyVisits = weeksPerMonth;
    else if (freqKey === "biweekly") monthlyVisits = weeksPerMonth / 2;
    else if (freqKey === "monthly") monthlyVisits = 1;
    else if (freqKey === "quarterly") monthlyVisits = 0; // no monthly for quarterly

    // Standard ongoing monthly bill (after the first month)
    const standardMonthlyBillRated = recurringPerVisitRated * monthlyVisits;

    // First month bill:
    //  - first visit is installation only
    //  - remaining visits in the month are normal service
    const effectiveServiceVisitsFirstMonth =
      monthlyVisits > 1 ? monthlyVisits - 1 : 0;

    const firstMonthBillRated = form.isFirstTimeInstall
      ? firstVisitTotalRated +
        recurringPerVisitRated * effectiveServiceVisitsFirstMonth
      : standardMonthlyBillRated;

    // Displayed "Monthly Recurring" value
    const monthlyBillRated = firstMonthBillRated;

    // CONTRACT TOTAL for N months (2–36)
    const contractMonths = Math.max(form.contractMonths ?? 0, 0);

    let contractTotalRated = 0;
    if (contractMonths > 0) {
      if (freqKey === "quarterly") {
        // ✅ For quarterly: use annual frequencies FROM BACKEND
        // Uses annualFrequencies.quarterly: 4 from your MongoDB config
        const visitsPerYear = activeConfig.annualFrequencies?.quarterly ?? 4;
        const totalQuarterlyVisits = (contractMonths / 12) * visitsPerYear;

        if (form.isFirstTimeInstall) {
          // First visit is install only, remaining visits are service
          const serviceVisits = Math.max(totalQuarterlyVisits - 1, 0);
          contractTotalRated = installOneTime + (serviceVisits * recurringPerVisitRated);
        } else {
          // No install, all visits are service
          contractTotalRated = totalQuarterlyVisits * recurringPerVisitRated;
        }
      } else {
        // For weekly, biweekly, monthly: use monthly-based calculation
        if (form.isFirstTimeInstall) {
          const remainingMonths = Math.max(contractMonths - 1, 0);
          contractTotalRated =
            firstMonthBillRated + standardMonthlyBillRated * remainingMonths;
        } else {
          contractTotalRated = standardMonthlyBillRated * contractMonths;
        }
      }
    }

    return {
      effSmall,
      effMedium,
      effLarge,
      effTrip,
      recurringPerVisitRated,
      installOneTime,
      firstVisitTotalRated,
      standardMonthlyBillRated,
      monthlyBillRated,
      contractTotalRated,
    };
  }, [
    backendConfig, // ✅ CRITICAL: Re-calculate when backend config loads!
    form.smallQty,
    form.mediumQty,
    form.largeQty,
    form.smallWindowRate,
    form.mediumWindowRate,
    form.largeWindowRate,
    form.tripCharge,
    form.frequency,
    form.selectedRateCategory,
    form.isFirstTimeInstall,
    form.extraCharges,
    form.contractMonths,
  ]);

  const quote: ServiceQuoteResult = {
    serviceId: "rpmWindows",
    displayName: "RPM Window",
    perVisitPrice: calc.recurringPerVisitRated,
    // now represents TOTAL for selected contract months (not "per year")
    annualPrice: calc.contractTotalRated,
    detailsBreakdown: [],
  };

  return {
    form,
    setForm,
    onChange,
    addExtraCharge,
    updateExtraCharge,
    removeExtraCharge,
    calc,
    quote,
  };
}
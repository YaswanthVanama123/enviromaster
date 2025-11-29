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

function getFrequencyMultiplier(freq: RpmFrequencyKey): number {
  return cfg.frequencyMultipliers[freq];
}

// kept but no longer used; safe to leave
function getAnnualFrequency(freq: RpmFrequencyKey): number {
  return cfg.annualFrequencies[freq] ?? 0;
}

export function useRpmWindowsCalc(initial?: Partial<RpmWindowsFormState>) {
  const [form, setForm] = useState<RpmWindowsFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  // Store the ORIGINAL backend/default rates separately for installation calculation
  const [defaultRates, setDefaultRates] = useState({
    smallWindowRate: cfg.smallWindowRate,
    mediumWindowRate: cfg.mediumWindowRate,
    largeWindowRate: cfg.largeWindowRate,
  });

  // Fetch pricing from backend on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/service-configs/active?serviceId=rpmWindows`);

        if (!response.ok) {
          console.warn('RPM Windows config not found in backend, using default values');
          return;
        }

        const data = await response.json();

        // If we have backend config, merge with form state
        if (data && data.config) {
          const backendConfig = data.config;

          // Store backend rates as default rates (for installation calculation)
          setDefaultRates({
            smallWindowRate: backendConfig.smallWindowRate ?? cfg.smallWindowRate,
            mediumWindowRate: backendConfig.mediumWindowRate ?? cfg.mediumWindowRate,
            largeWindowRate: backendConfig.largeWindowRate ?? cfg.largeWindowRate,
          });

          setForm((prev) => ({
            ...prev,
            // Basic rates - these are the main values fetched from backend
            smallWindowRate: backendConfig.smallWindowRate ?? prev.smallWindowRate,
            mediumWindowRate: backendConfig.mediumWindowRate ?? prev.mediumWindowRate,
            largeWindowRate: backendConfig.largeWindowRate ?? prev.largeWindowRate,
            tripCharge: backendConfig.tripCharge ?? prev.tripCharge,
            // Note: frequency multipliers and other complex config
            // are used from the imported cfg object, not from form state
          }));

          console.log('✅ RPM Windows pricing loaded from backend:', {
            small: backendConfig.smallWindowRate,
            medium: backendConfig.mediumWindowRate,
            large: backendConfig.largeWindowRate,
            tripCharge: backendConfig.tripCharge,
          });
        }
      } catch (error) {
        console.error('Failed to fetch RPM Windows pricing from backend:', error);
        console.log('Using default hardcoded values as fallback');
        // Continue with default values from config file
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

        // Window rates - user sees frequency-adjusted rate, but we store base rate
        case "smallWindowRate":
        case "mediumWindowRate":
        case "largeWindowRate":
        case "tripCharge": {
          // Parse the displayed effective rate
          const effectiveRate = value === '' ? 0 : parseFloat(value);

          if (!isNaN(effectiveRate)) {
            // Back-calculate to base rate by dividing by frequency multiplier
            const freqKey = mapFrequency(prev.frequency);
            const freqMult = getFrequencyMultiplier(freqKey) || 1;
            const baseRate = effectiveRate / freqMult;

            return { ...prev, [name]: baseRate };
          }
          return prev;
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
    const freqKey = mapFrequency(form.frequency);
    const freqMult = getFrequencyMultiplier(freqKey) || 1;

    // Get rates from form state (these can be manually changed by user)
    const weeklySmall = form.smallWindowRate;
    const weeklyMedium = form.mediumWindowRate;
    const weeklyLarge = form.largeWindowRate;
    const weeklyTrip = form.tripCharge; // will be 0, used only for display

    // Weekly base window cost using user's rates (base rates, not frequency-adjusted)
    const weeklyWindows =
      form.smallQty * weeklySmall +
      form.mediumQty * weeklyMedium +
      form.largeQty * weeklyLarge;

    const hasWindows = weeklyWindows > 0;

    // Frequency-adjusted rates (this is what we show in the UI calculations)
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

    const rateCfg =
      cfg.rateCategories[form.selectedRateCategory] ??
      cfg.rateCategories.redRate;

    const recurringPerVisitRated = recurringPerVisitBase * rateCfg.multiplier;

    // INSTALLATION FEE — Uses user's custom rates (base weekly rate, not frequency-adjusted)
    // ALWAYS WEEKLY rates ×3 (NO FREQUENCY MULTIPLIER)
    const installOneTimeBase =
      form.isFirstTimeInstall && hasWindows
        ? weeklyWindows * cfg.installMultiplierFirstTime
        : 0;

    const installOneTime = installOneTimeBase * rateCfg.multiplier;

    // FIRST VISIT PRICE = INSTALLATION ONLY (no normal service on that visit)
    const firstVisitTotalRated = installOneTime;

    // MONTHLY VISITS using 4.33 weeks/month
    // weekly    -> 4.33 visits / month
    // biweekly  -> 4.33 / 2 visits / month
    // monthly   -> 1 visit / month
    // quarterly -> we will NOT show monthly (0 here, UI hides row)
    let monthlyVisits = 0;
    if (freqKey === "weekly") monthlyVisits = 4.33;
    else if (freqKey === "biweekly") monthlyVisits = 4.33 / 2;
    else if (freqKey === "monthly") monthlyVisits = 1;
    else if (freqKey === "quarterly") monthlyVisits = 0; // no monthly form for quarterly

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
      if (form.isFirstTimeInstall) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        contractTotalRated =
          firstMonthBillRated + standardMonthlyBillRated * remainingMonths;
      } else {
        contractTotalRated = standardMonthlyBillRated * contractMonths;
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
    // Form fields that user can change
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

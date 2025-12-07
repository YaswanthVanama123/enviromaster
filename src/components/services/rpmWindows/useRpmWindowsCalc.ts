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
import { serviceConfigApi } from "../../../backendservice/api";

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

  // ✅ Store base weekly rates (from backend) separately
  const [baseWeeklyRates, setBaseWeeklyRates] = useState({
    small: cfg.smallWindowRate,
    medium: cfg.mediumWindowRate,
    large: cfg.largeWindowRate,
    trip: cfg.tripCharge,
  });

  // ✅ Loading state for refresh button
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    console.log('🔍 [RPM Windows] Fetching config from backend...');
    console.log('🔍 [RPM Windows] API call: serviceConfigApi.getActive("rpmWindows")');

    try {
      const response = await serviceConfigApi.getActive("rpmWindows");

      console.log('📥 [RPM Windows] Backend response:', response);
      console.log('📥 [RPM Windows] Response type:', typeof response);
      console.log('📥 [RPM Windows] Has "data" property?', response && 'data' in response);

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ RPM Windows config not found in backend, using default fallback values');
        console.warn('⚠️ [RPM Windows] Error:', response?.error);
        return;
      }

      // ✅ Extract the actual document from response.data
      const document = response.data;
      console.log('📥 [RPM Windows] Document from response.data:', document);
      console.log('📥 [RPM Windows] Has "config" in document?', 'config' in document);

      if (!document.config) {
        console.warn('⚠️ RPM Windows document has no config property');
        return;
      }

      const config = document.config as BackendRpmConfig;

      console.log('✅ [RPM Windows] Config found! Details:', {
        serviceId: document.serviceId,
        version: document.version,
        isActive: document.isActive,
        configKeys: Object.keys(config),
      });

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);

      // ✅ Store base weekly rates for frequency adjustment
      const newBaseRates = {
        small: config.smallWindowRate ?? cfg.smallWindowRate,
        medium: config.mediumWindowRate ?? cfg.mediumWindowRate,
        large: config.largeWindowRate ?? cfg.largeWindowRate,
        trip: config.tripCharge ?? cfg.tripCharge,
      };

      console.log('📊 [RPM Windows] Setting new base rates:', newBaseRates);
      console.log('📊 [RPM Windows] Old hardcoded defaults:', {
        small: cfg.smallWindowRate,
        medium: cfg.mediumWindowRate,
        large: cfg.largeWindowRate,
      });

      setBaseWeeklyRates(newBaseRates);

      // ✅ Note: We don't update form rates here - the useEffect at line 200-215
      // will automatically update form rates when baseWeeklyRates changes.
      // This prevents race conditions between multiple setForm() calls.
      console.log('📊 [RPM Windows] Base rates updated, useEffect will apply frequency multiplier');

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
    } catch (error) {
      console.error('❌ Failed to fetch RPM Windows config from backend:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      console.log('⚠️ Using default hardcoded values as fallback');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchPricing();
  }, []); // Run once on mount

  // ✅ Update rate fields when frequency changes (apply frequency multiplier)
  useEffect(() => {
    // Use backend config if available, otherwise use fallback
    const activeFreqMult = backendConfig?.frequencyMultipliers ?? cfg.frequencyMultipliers;

    const freqKey = mapFrequency(form.frequency);
    const freqMult = activeFreqMult[freqKey] || 1;

    // Apply frequency multiplier to base weekly rates
    setForm((prev) => ({
      ...prev,
      smallWindowRate: baseWeeklyRates.small * freqMult,
      mediumWindowRate: baseWeeklyRates.medium * freqMult,
      largeWindowRate: baseWeeklyRates.large * freqMult,
      tripCharge: baseWeeklyRates.trip * freqMult,
    }));
  }, [form.frequency, backendConfig, baseWeeklyRates]); // Run when frequency, backend config, or base rates change

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

        // Rate fields - when manually edited, update base weekly rate
        case "smallWindowRate":
        case "mediumWindowRate":
        case "largeWindowRate":
        case "tripCharge": {
          const displayVal = Number(value) || 0;

          // Calculate base weekly rate from current frequency-adjusted value
          const freqKey = mapFrequency(prev.frequency);
          const activeFreqMult = backendConfig?.frequencyMultipliers ?? cfg.frequencyMultipliers;
          const freqMult = activeFreqMult[freqKey] || 1;
          const weeklyBase = displayVal / freqMult;

          // Update base weekly rates
          if (name === "smallWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, small: weeklyBase }));
          } else if (name === "mediumWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, medium: weeklyBase }));
          } else if (name === "largeWindowRate") {
            setBaseWeeklyRates(b => ({ ...b, large: weeklyBase }));
          } else if (name === "tripCharge") {
            setBaseWeeklyRates(b => ({ ...b, trip: weeklyBase }));
          }

          return { ...prev, [name]: displayVal };
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
    const activeConfig = {
      smallWindowRate: backendConfig?.smallWindowRate ?? cfg.smallWindowRate,
      mediumWindowRate: backendConfig?.mediumWindowRate ?? cfg.mediumWindowRate,
      largeWindowRate: backendConfig?.largeWindowRate ?? cfg.largeWindowRate,
      tripCharge: backendConfig?.tripCharge ?? cfg.tripCharge,
      installMultiplierFirstTime: backendConfig?.installMultiplierFirstTime ?? cfg.installMultiplierFirstTime,
      installMultiplierClean: backendConfig?.installMultiplierClean ?? cfg.installMultiplierClean,
      frequencyMultipliers: backendConfig?.frequencyMultipliers ?? cfg.frequencyMultipliers,
      rateCategories: backendConfig?.rateCategories ?? cfg.rateCategories,
      monthlyConversions: backendConfig?.monthlyConversions ?? cfg.monthlyConversions,
      annualFrequencies: backendConfig?.annualFrequencies ?? cfg.annualFrequencies,
    };

    const freqKey = mapFrequency(form.frequency);

    // ✅ FREQUENCY MULTIPLIER FROM BACKEND (NOT HARDCODED!)
    // When you select bi-weekly, this will be 1.25 FROM YOUR MONGODB CONFIG
    const freqMult = activeConfig.frequencyMultipliers[freqKey] || 1;

    // ✅ USE FREQUENCY-ADJUSTED RATES FROM FORM (already multiplied by useEffect)
    const weeklySmall = baseWeeklyRates.small;
    const weeklyMedium = baseWeeklyRates.medium;
    const weeklyLarge = baseWeeklyRates.large;
    const weeklyTrip = baseWeeklyRates.trip; // will be 0, used only for display

    // Weekly base window cost
    const weeklyWindows =
      form.smallQty * weeklySmall +
      form.mediumQty * weeklyMedium +
      form.largeQty * weeklyLarge;

    const hasWindows = weeklyWindows > 0;

    // Use form rates directly (already frequency-adjusted by useEffect)
    const effSmall = form.smallWindowRate;
    const effMedium = form.mediumWindowRate;
    const effLarge = form.largeWindowRate;
    const effTrip = form.tripCharge; // display only

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

    const recurringPerVisitRated = recurringPerVisitBase * (rateCfg?.multiplier ?? 1);

    // ✅ INSTALLATION MULTIPLIER FROM BACKEND (NOT HARDCODED!)
    // First time install = 3x, Clean = 1x (from your MongoDB config)
    const installMultiplier = form.isFirstTimeInstall
      ? (activeConfig.installMultiplierFirstTime ?? cfg.installMultiplierFirstTime)
      : (activeConfig.installMultiplierClean ?? cfg.installMultiplierClean);

    const installOneTimeBase =
      form.isFirstTimeInstall && hasWindows
        ? weeklyWindows * installMultiplier
        : 0;

    const installOneTime = installOneTimeBase * (rateCfg?.multiplier ?? 1);

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
    //  - for quarterly: first visit only (installation or service)
    //  - for other frequencies: first visit + remaining visits in the month
    const effectiveServiceVisitsFirstMonth =
      freqKey === "quarterly" ? 0 : (monthlyVisits > 1 ? monthlyVisits - 1 : 0);

    let firstMonthBillRated = 0;
    if (form.isFirstTimeInstall) {
      if (freqKey === "quarterly") {
        // For quarterly install: just the installation cost
        firstMonthBillRated = firstVisitTotalRated;
      } else {
        // For other frequencies: installation + remaining service visits in first month
        firstMonthBillRated = firstVisitTotalRated +
          recurringPerVisitRated * effectiveServiceVisitsFirstMonth;
      }
    } else {
      // No installation, just standard monthly billing
      firstMonthBillRated = standardMonthlyBillRated;
    }

    // Displayed "Monthly Recurring" value
    const monthlyBillRated = standardMonthlyBillRated;

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
      firstMonthBillRated,
      monthlyBillRated,
      contractTotalRated,
    };
  }, [
    backendConfig, // ✅ CRITICAL: Re-calculate when backend config loads!
    baseWeeklyRates, // ✅ CRITICAL: Re-calculate when base rates change!
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
    refreshConfig: fetchPricing,
    isLoadingConfig,
  };
}
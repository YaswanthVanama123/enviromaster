// src/features/services/foamingDrain/useFoamingDrainCalc.ts
import { useEffect, useMemo, useState } from "react";
import { FOAMING_DRAIN_CONFIG as cfg } from "./foamingDrainConfig";
import type {
  FoamingDrainFormState,
  FoamingDrainQuoteResult,
  FoamingDrainFrequency,
  FoamingDrainLocation,
  FoamingDrainCondition,
  FoamingDrainBreakdown,
} from "./foamingDrainTypes";

// API base URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendFoamingDrainConfig {
  standardDrainRate: number;
  altBaseCharge: number;
  altExtraPerDrain: number;
  volumePricing: {
    minimumDrains: number;
    weekly: { ratePerDrain: number };
    bimonthly: { ratePerDrain: number };
  };
  grease: {
    weeklyRatePerTrap: number;
    installPerTrap: number;
  };
  green: {
    weeklyRatePerDrain: number;
    installPerDrain: number;
  };
  plumbing: {
    weeklyAddonPerDrain: number;
  };
  installationRules: {
    filthyMultiplier: number;
  };
  tripCharges: {
    standard: number;
    beltway: number;
  };
  billingConversions: {
    weekly: {
      monthlyVisits: number;
      firstMonthExtraMonths: number;
      normalMonthFactor: number;
    };
    bimonthly: {
      monthlyMultiplier: number;
    };
  };
  contract: {
    minMonths: number;
    maxMonths: number;
    defaultMonths: number;
  };
  defaultFrequency: string;
  allowedFrequencies: string[];
}

const DEFAULT_FREQUENCY: FoamingDrainFrequency = cfg.defaultFrequency;

const DEFAULT_FOAMING_DRAIN_FORM_STATE: FoamingDrainFormState = {
  serviceId: "foamingDrain",

  standardDrainCount: 0,
  installDrainCount: 0,
  filthyDrainCount: 0,
  greaseTrapCount: 0,
  greenDrainCount: 0,
  plumbingDrainCount: 0,

  needsPlumbing: false,

  frequency: DEFAULT_FREQUENCY,
  facilityCondition: "normal",
  location: "standard",

  useSmallAltPricingWeekly: false,
  useBigAccountTenWeekly: false,
  isAllInclusive: false,

  chargeGreaseTrapInstall: true,
  tripChargeOverride: undefined,

  contractMonths: cfg.contract.defaultMonths,
  notes: "",

  // Editable pricing rates from config (will be overridden by backend)
  standardDrainRate: cfg.standardDrainRate,
  altBaseCharge: cfg.altBaseCharge,
  altExtraPerDrain: cfg.altExtraPerDrain,
  volumeWeeklyRate: cfg.volumePricing.weekly.ratePerDrain,
  volumeBimonthlyRate: cfg.volumePricing.bimonthly.ratePerDrain,
  greaseWeeklyRate: cfg.grease.weeklyRatePerTrap,
  greaseInstallRate: cfg.grease.installPerTrap,
  greenWeeklyRate: cfg.green.weeklyRatePerDrain,
  greenInstallRate: cfg.green.installPerDrain,
  plumbingAddonRate: cfg.plumbing.weeklyAddonPerDrain,
  filthyMultiplier: cfg.installationRules.filthyMultiplier,
};

function clamp(num: number, min: number, max: number): number {
  if (Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function useFoamingDrainCalc(initialData?: Partial<FoamingDrainFormState>) {
  const [state, setState] = useState<FoamingDrainFormState>({
    ...DEFAULT_FOAMING_DRAIN_FORM_STATE,
    ...initialData,
    serviceId: "foamingDrain",
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendFoamingDrainConfig | null>(null);

  // ✅ Fetch COMPLETE pricing configuration from backend on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/service-configs/active?serviceId=foamingDrain`);

        if (!response.ok) {
          console.warn('⚠️ Foaming Drain config not found in backend, using default fallback values');
          return;
        }

        const data = await response.json();

        if (data && data.config) {
          const config = data.config as BackendFoamingDrainConfig;

          // ✅ Store the ENTIRE backend config for use in calculations
          setBackendConfig(config);

          setState((prev) => ({
            ...prev,
            // Update all rate fields from backend if available
            standardDrainRate: config.standardDrainRate ?? prev.standardDrainRate,
            altBaseCharge: config.altBaseCharge ?? prev.altBaseCharge,
            altExtraPerDrain: config.altExtraPerDrain ?? prev.altExtraPerDrain,
            volumeWeeklyRate: config.volumePricing?.weekly?.ratePerDrain ?? prev.volumeWeeklyRate,
            volumeBimonthlyRate: config.volumePricing?.bimonthly?.ratePerDrain ?? prev.volumeBimonthlyRate,
            greaseWeeklyRate: config.grease?.weeklyRatePerTrap ?? prev.greaseWeeklyRate,
            greaseInstallRate: config.grease?.installPerTrap ?? prev.greaseInstallRate,
            greenWeeklyRate: config.green?.weeklyRatePerDrain ?? prev.greenWeeklyRate,
            greenInstallRate: config.green?.installPerDrain ?? prev.greenInstallRate,
            plumbingAddonRate: config.plumbing?.weeklyAddonPerDrain ?? prev.plumbingAddonRate,
            filthyMultiplier: config.installationRules?.filthyMultiplier ?? prev.filthyMultiplier,
          }));

          console.log('✅ Foaming Drain FULL CONFIG loaded from backend:', {
            standardDrainRate: config.standardDrainRate,
            altPricing: {
              baseCharge: config.altBaseCharge,
              extraPerDrain: config.altExtraPerDrain,
            },
            volumePricing: config.volumePricing,
            grease: config.grease,
            green: config.green,
            plumbing: config.plumbing,
            installationRules: config.installationRules,
            billingConversions: config.billingConversions,
            contract: config.contract,
          });
        }
      } catch (error) {
        console.error('❌ Failed to fetch Foaming Drain config from backend:', error);
        console.log('⚠️ Using default hardcoded values as fallback');
      }
    };

    fetchPricing();
  }, []); // Run once on mount

  const quote = useMemo<FoamingDrainQuoteResult>(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = backendConfig || {
      standardDrainRate: cfg.standardDrainRate,
      altBaseCharge: cfg.altBaseCharge,
      altExtraPerDrain: cfg.altExtraPerDrain,
      volumePricing: cfg.volumePricing,
      grease: cfg.grease,
      green: cfg.green,
      plumbing: cfg.plumbing,
      installationRules: cfg.installationRules,
      tripCharges: cfg.tripCharges,
      billingConversions: cfg.billingConversions,
      contract: cfg.contract,
      defaultFrequency: cfg.defaultFrequency,
      allowedFrequencies: cfg.allowedFrequencies,
    };

    // ---------- 1) Normalize inputs ----------
    const standardDrains = Math.max(0, Number(state.standardDrainCount) || 0);
    const installRequested = Math.max(
      0,
      Number(state.installDrainCount) || 0
    );
    const filthyRequested = Math.max(
      0,
      Number(state.filthyDrainCount) || 0
    );
    const greaseTraps = Math.max(0, Number(state.greaseTrapCount) || 0);
    const greenDrains = Math.max(0, Number(state.greenDrainCount) || 0);
    const plumbingDrains = Math.max(
      0,
      Number(state.plumbingDrainCount) || 0
    );

    const frequency: FoamingDrainFrequency =
      state.frequency || DEFAULT_FREQUENCY;
    const location: FoamingDrainLocation = state.location || "standard";
    const condition: FoamingDrainCondition =
      state.facilityCondition || "normal";

    const isWeekly = frequency === "weekly";
    const isVolume = standardDrains >= activeConfig.volumePricing.minimumDrains;  // ✅ FROM BACKEND
    const canUseInstallProgram =
      isVolume && !state.useBigAccountTenWeekly && !state.isAllInclusive;

    // Install-level drains: only when volume program is valid
    const installDrains = canUseInstallProgram
      ? Math.min(installRequested, standardDrains)
      : 0;

    const normalStandardDrains = Math.max(standardDrains - installDrains, 0);

    // When all-inclusive, standard drains are included for free
    const standardDrainsActive = state.isAllInclusive ? 0 : normalStandardDrains;

    // Filthy drain count is subset of standard drains
    let filthyDrains = 0;
    if (condition === "filthy" && standardDrainsActive > 0) {
      if (filthyRequested > 0) {
        filthyDrains = Math.min(filthyRequested, standardDrainsActive);
      } else {
        // 0 means "all" in this UI when filthy mode is on
        filthyDrains = standardDrainsActive;
      }
    }

    // ---------- 2) Standard drain pricing ----------
    const tenTotal = standardDrainsActive * state.standardDrainRate;  // ✅ USE FORM VALUE (from backend)
    const altTotal =
      standardDrainsActive > 0
        ? state.altBaseCharge + state.altExtraPerDrain * standardDrainsActive  // ✅ USE FORM VALUES
        : 0;

    let usedSmallAlt = false;
    let usedBigAccountAlt = false;
    let useAltPricing = false;

    if (standardDrainsActive > 0 && !state.isAllInclusive) {
      if (state.useSmallAltPricingWeekly) {
        // Force 20 + 4$/drain
        useAltPricing = true;
        usedSmallAlt = true;
      } else if (state.useBigAccountTenWeekly) {
        // Force $10/drain
        useAltPricing = false;
        usedBigAccountAlt = true;
      } else {
        // Auto choose cheaper between 10$/drain vs 20+4$/drain
        if (altTotal > 0 && altTotal < tenTotal) {
          useAltPricing = true;
          usedSmallAlt = true;
        } else {
          useAltPricing = false;
        }
      }
    }

    const weeklyStandardDrains = state.isAllInclusive
      ? 0
      : useAltPricing
      ? altTotal
      : tenTotal;

    // ---------- 3) Install-level drains (10+ program) ----------
    // IMPORTANT: drains are always serviced weekly.
    // The Weekly / Bi-Monthly selector is ONLY used to decide
    // the install-program rate:
    //   Weekly     → $20 / install drain
    //   Bi-Monthly → $10 / install drain
    let weeklyInstallDrains = 0;
    let volumePricingApplied = false;

    if (installDrains > 0 && canUseInstallProgram) {
      volumePricingApplied = true;

      const perDrainRate =
        frequency === "bimonthly"
          ? state.volumeBimonthlyRate  // ✅ USE FORM VALUE (from backend, e.g. 10)
          : state.volumeWeeklyRate;    // ✅ USE FORM VALUE (from backend, e.g. 20)

      weeklyInstallDrains = perDrainRate * installDrains;
    }

    // ---------- 4) Plumbing add-on ----------
    const weeklyPlumbing =
      state.needsPlumbing && plumbingDrains > 0
        ? plumbingDrains * state.plumbingAddonRate  // ✅ USE FORM VALUE (from backend)
        : 0;

    // ---------- 5) Grease & green weekly service ----------
    const weeklyGreaseTraps =
      greaseTraps > 0 ? greaseTraps * state.greaseWeeklyRate : 0;  // ✅ USE FORM VALUE
    const weeklyGreenDrains =
      greenDrains > 0 ? greenDrains * state.greenWeeklyRate : 0;  // ✅ USE FORM VALUE

    // ---------- 6) Total weekly service (no trip) ----------
    const weeklyServiceRaw =
      weeklyStandardDrains +
      weeklyInstallDrains +
      weeklyPlumbing +
      weeklyGreaseTraps +
      weeklyGreenDrains;

    const weeklyService = round2(weeklyServiceRaw);
    const tripCharge = 0; // Trip charge removed from math
    const weeklyTotal = weeklyService; // (service only)

    // ---------- 7) One-time installation ----------

    // 7a) Filthy standard drains installation
    //     FilthyInstall = (weekly cost for filthy drains) × filthyMultiplier (usually 3)
    let filthyInstallOneTime = 0;

    if (condition === "filthy" && standardDrainsActive > 0) {
      // How many drains are filthy?
      const filthyDrainCount =
        filthyDrains > 0 && filthyDrains <= standardDrainsActive
          ? filthyDrains
          : standardDrainsActive;

      let weeklyFilthyCost = 0;

      if (useAltPricing) {
        // Alt weekly for those filthy drains: $20 + $4/drain
        weeklyFilthyCost =
          state.altBaseCharge + state.altExtraPerDrain * filthyDrainCount;  // ✅ USE FORM VALUES
      } else {
        // Standard pricing: standardDrainRate × filthyDrains
        weeklyFilthyCost = state.standardDrainRate * filthyDrainCount;  // ✅ USE FORM VALUE
      }

      filthyInstallOneTime =
        weeklyFilthyCost * state.filthyMultiplier; // ✅ USE FORM VALUE (from backend, ×3)
    }

    // 7b) Grease traps install – $300 × #traps (one-time)
    const greaseInstallOneTime =
      state.chargeGreaseTrapInstall && greaseTraps > 0
        ? state.greaseInstallRate * greaseTraps  // ✅ USE FORM VALUE (from backend)
        : 0;

    // 7c) Green drains install – $100 × #drains (one-time)
    const greenInstallOneTime =
      greenDrains > 0 ? state.greenInstallRate * greenDrains : 0;  // ✅ USE FORM VALUE

    const installationRaw =
      filthyInstallOneTime + greaseInstallOneTime + greenInstallOneTime;
    const installation = round2(installationRaw);

    // ---------- 7d) FIRST VISIT LOGIC ----------
    // Filthy facility:
    //   FirstVisit = filthyInstall + weeklyInstallDrains + greaseInstall + greenInstall
    //
    // Normal facility:
    //   FirstVisit = greaseInstall + greenInstall + weeklyStandardDrains + weeklyInstallDrains
    let firstVisitPrice: number;

    if (condition === "filthy" && filthyInstallOneTime > 0) {
      firstVisitPrice =
        filthyInstallOneTime +
        weeklyInstallDrains +
        greaseInstallOneTime +
        greenInstallOneTime;
    } else {
      firstVisitPrice =
        greaseInstallOneTime +
        greenInstallOneTime +
        weeklyStandardDrains +
        weeklyInstallDrains;
    }

    firstVisitPrice = round2(firstVisitPrice);

    // ---------- 8) Monthly & contract logic ----------
    const contractMonths = clamp(
      Number(state.contractMonths) || activeConfig.contract.defaultMonths,  // ✅ USE BACKEND
      activeConfig.contract.minMonths,  // ✅ USE BACKEND
      activeConfig.contract.maxMonths   // ✅ USE BACKEND
    );

    // Service is always weekly; Monthly logic ALWAYS uses the weekly rule:
    //   NormalMonth  = weeklyService × 4.33
    //   If installation > 0:
    //       FirstMonth = FirstVisit + weeklyService × 3.33
    //     else:
    //       FirstMonth = NormalMonth
    let normalMonth = 0;
    let firstMonthPrice = 0;

    const monthlyVisits = activeConfig.billingConversions.weekly.monthlyVisits; // ✅ FROM BACKEND (4.33)
    const extraVisitsFirstMonth = monthlyVisits - 1; // 3.33

    normalMonth = weeklyService * monthlyVisits;

    if (installation > 0) {
      firstMonthPrice =
        firstVisitPrice + weeklyService * extraVisitsFirstMonth;
    } else {
      firstMonthPrice = normalMonth;
    }

    normalMonth = round2(normalMonth);
    firstMonthPrice = round2(firstMonthPrice);

    // Contract total:
    //   TotalContract = FirstMonth + (Months − 1) × NormalMonth
    const contractTotalRaw =
      firstMonthPrice + (contractMonths - 1) * normalMonth;
    const contractTotal = round2(contractTotalRaw);

    // For compatibility with ServiceQuoteResult:
    // - monthlyRecurring  → Normal recurring month (NormalMonth)
    // - annualRecurring   → TOTAL CONTRACT for contractMonths
    const monthlyRecurring = normalMonth;
    const annualRecurring = contractTotal;

    // ---------- 9) Breakdown ----------
    const breakdown: FoamingDrainBreakdown = {
      usedSmallAlt,
      usedBigAccountAlt,
      volumePricingApplied,

      weeklyStandardDrains: round2(weeklyStandardDrains),
      weeklyInstallDrains: round2(weeklyInstallDrains),
      weeklyGreaseTraps: round2(weeklyGreaseTraps),
      weeklyGreenDrains: round2(weeklyGreenDrains),
      weeklyPlumbing: round2(weeklyPlumbing),

      filthyInstallOneTime: round2(filthyInstallOneTime),
      greaseInstallOneTime: round2(greaseInstallOneTime),
      greenInstallOneTime: round2(greenInstallOneTime),

      tripCharge, // always 0 in new rules
    };

    // ---------- 10) Build quote ----------
    const quote: FoamingDrainQuoteResult = {
      serviceId: "foamingDrain",

      frequency,
      location,
      facilityCondition: condition,

      useSmallAltPricingWeekly: state.useSmallAltPricingWeekly,
      useBigAccountTenWeekly: state.useBigAccountTenWeekly,
      isAllInclusive: state.isAllInclusive,
      chargeGreaseTrapInstall: state.chargeGreaseTrapInstall,

      weeklyService,
      weeklyTotal,
      monthlyRecurring,   // normal month
      annualRecurring,    // contract total
      installation,
      tripCharge,

      firstVisitPrice,
      firstMonthPrice,
      contractMonths,

      notes: state.notes || "",

      breakdown,
    };

    return quote;
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    state.standardDrainCount,
    state.installDrainCount,
    state.filthyDrainCount,
    state.greaseTrapCount,
    state.greenDrainCount,
    state.plumbingDrainCount,
    state.needsPlumbing,
    state.frequency,
    state.facilityCondition,
    state.location,
    state.useSmallAltPricingWeekly,
    state.useBigAccountTenWeekly,
    state.isAllInclusive,
    state.chargeGreaseTrapInstall,
    state.tripChargeOverride,
    state.contractMonths,
    state.notes,
    // ✅ NEW: Editable rate fields (from backend)
    state.standardDrainRate,
    state.altBaseCharge,
    state.altExtraPerDrain,
    state.volumeWeeklyRate,
    state.volumeBimonthlyRate,
    state.greaseWeeklyRate,
    state.greaseInstallRate,
    state.greenWeeklyRate,
    state.greenInstallRate,
    state.plumbingAddonRate,
    state.filthyMultiplier,
  ]);

  const updateField = <K extends keyof FoamingDrainFormState>(
    key: K,
    value: FoamingDrainFormState[K]
  ) => {
    setState((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };

      // ✅ AUTO-CLEAR CUSTOM OVERRIDES when base inputs change
      // If user changes a base input (like drain counts), clear related custom totals
      if (
        key === 'standardDrainCount' ||
        key === 'installDrainCount' ||
        key === 'filthyDrainCount' ||
        key === 'greaseTrapCount' ||
        key === 'greenDrainCount' ||
        key === 'plumbingDrainCount' ||
        key === 'frequency' ||
        key === 'facilityCondition' ||
        key === 'useSmallAltPricingWeekly' ||
        key === 'useBigAccountTenWeekly' ||
        key === 'isAllInclusive' ||
        key === 'chargeGreaseTrapInstall' ||
        key === 'needsPlumbing' ||
        key === 'contractMonths'
      ) {
        // Clear all custom overrides when base inputs change
        next.customStandardDrainTotal = undefined;
        next.customGreaseTrapTotal = undefined;
        next.customGreenDrainTotal = undefined;
        next.customPlumbingTotal = undefined;
        next.customFilthyInstall = undefined;
        next.customGreaseInstall = undefined;
        next.customGreenInstall = undefined;
        next.customWeeklyService = undefined;
        next.customMonthlyRecurring = undefined;
        next.customFirstMonthPrice = undefined;
        next.customContractTotal = undefined;
      }

      // Also clear custom overrides when pricing rates change
      if (
        key === 'standardDrainRate' ||
        key === 'altBaseCharge' ||
        key === 'altExtraPerDrain' ||
        key === 'volumeWeeklyRate' ||
        key === 'volumeBimonthlyRate' ||
        key === 'greaseWeeklyRate' ||
        key === 'greaseInstallRate' ||
        key === 'greenWeeklyRate' ||
        key === 'greenInstallRate' ||
        key === 'plumbingAddonRate' ||
        key === 'filthyMultiplier'
      ) {
        // Clear custom overrides when rates change
        next.customStandardDrainTotal = undefined;
        next.customGreaseTrapTotal = undefined;
        next.customGreenDrainTotal = undefined;
        next.customPlumbingTotal = undefined;
        next.customFilthyInstall = undefined;
        next.customGreaseInstall = undefined;
        next.customGreenInstall = undefined;
        next.customWeeklyService = undefined;
        next.customMonthlyRecurring = undefined;
        next.customFirstMonthPrice = undefined;
        next.customContractTotal = undefined;
      }

      return next;
    });
  };

  const reset = () => {
    setState({
      ...DEFAULT_FOAMING_DRAIN_FORM_STATE,
      serviceId: "foamingDrain",
    });
  };

  return { state, quote, updateField, reset };
}

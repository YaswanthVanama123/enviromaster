// src/features/services/foamingDrain/useFoamingDrainCalc.ts
import { useMemo, useState } from "react";
import { FOAMING_DRAIN_CONFIG as cfg } from "./foamingDrainConfig";
import type {
  FoamingDrainFormState,
  FoamingDrainQuoteResult,
  FoamingDrainFrequency,
  FoamingDrainLocation,
  FoamingDrainCondition,
  FoamingDrainBreakdown,
} from "./foamingDrainTypes";

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

  const quote = useMemo<FoamingDrainQuoteResult>(() => {
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
    const isVolume = standardDrains >= cfg.volumePricing.minimumDrains;
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
    const tenTotal = standardDrainsActive * cfg.standardDrainRate;
    const altTotal =
      standardDrainsActive > 0
        ? cfg.altBaseCharge + cfg.altExtraPerDrain * standardDrainsActive
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
    let weeklyInstallDrains = 0;
    let volumePricingApplied = false;

    if (installDrains > 0 && canUseInstallProgram) {
      volumePricingApplied = true;
      const perDrainRate =
        frequency === "weekly"
          ? cfg.volumePricing.weekly.ratePerDrain
          : cfg.volumePricing.bimonthly.ratePerDrain;
      weeklyInstallDrains = perDrainRate * installDrains;
    }

    // ---------- 4) Plumbing add-on ----------
    const weeklyPlumbing =
      state.needsPlumbing && plumbingDrains > 0
        ? plumbingDrains * cfg.plumbing.weeklyAddonPerDrain
        : 0;

    // ---------- 5) Grease & green weekly service ----------
    const weeklyGreaseTraps =
      greaseTraps > 0 ? greaseTraps * cfg.grease.weeklyRatePerTrap : 0;
    const weeklyGreenDrains =
      greenDrains > 0 ? greenDrains * cfg.green.weeklyRatePerDrain : 0;

    // ---------- 6) Total weekly service (no trip) ----------
    const weeklyServiceRaw =
      weeklyStandardDrains +
      weeklyInstallDrains +
      weeklyPlumbing +
      weeklyGreaseTraps +
      weeklyGreenDrains;

    const weeklyService = round2(weeklyServiceRaw);
    const tripCharge = 0; // NEW RULE: trip not used in math
    const weeklyTotal = weeklyService; // (service only)

    // ---------- 7) One-time installation ----------

    // 7a) Filthy standard drains – only when using 20 + 4$/drain
    let filthyInstallOneTime = 0;
    if (
      condition === "filthy" &&
      filthyDrains > 0 &&
      useAltPricing &&
      standardDrainsActive > 0
    ) {
      const perDrainAlt = altTotal / standardDrainsActive; // e.g. 60 / 10 = 6
      const filthyWeeklyPortion = perDrainAlt * filthyDrains; // weekly cost portion for filthy drains
      filthyInstallOneTime =
        filthyWeeklyPortion * cfg.installationRules.filthyMultiplier; // 3×
    }

    // IMPORTANT RULE:
    // If standard drains are effectively on $10/drain (useAltPricing = false),
    // filthy install is completely WAIVED.
    if (!useAltPricing) {
      filthyInstallOneTime = 0;
    }

    // 7b) Grease traps install – $300 × #traps (one-time)
    const greaseInstallOneTime =
      state.chargeGreaseTrapInstall && greaseTraps > 0
        ? cfg.grease.installPerTrap * greaseTraps
        : 0;

    // 7c) Green drains install – $100 × #drains (one-time)
    const greenInstallOneTime =
      greenDrains > 0 ? cfg.green.installPerDrain * greenDrains : 0;

    const installationRaw =
      filthyInstallOneTime + greaseInstallOneTime + greenInstallOneTime;
    const installation = round2(installationRaw);

    // First visit = installation only (standard drains never add install
    // except filthy 3× when using 20+4).
    const firstVisitPrice = installation;

    // ---------- 8) Monthly & contract logic ----------
    const contractMonths = clamp(
      Number(state.contractMonths) || cfg.contract.defaultMonths,
      cfg.contract.minMonths,
      cfg.contract.maxMonths
    );

    let normalMonth = 0;
    let firstMonthPrice = 0;

    if (frequency === "weekly") {
      const monthlyVisits = cfg.billingConversions.weekly.monthlyVisits; // 4.33
      normalMonth = weeklyService * monthlyVisits; // 4.33 × weekly

      if (installation > 0) {
        // First month: Install + (4.33 − 1) × weekly = Install + 3.33 × weekly
        firstMonthPrice = installation + weeklyService * (monthlyVisits - 1);
      } else {
        // No installation at all → first month same as normal month
        firstMonthPrice = normalMonth;
      }
    } else {
      // Bi-monthly: treat as ~0.5 visits per month
      const monthlyFactor = cfg.billingConversions.bimonthly.monthlyMultiplier; // 0.5
      normalMonth = weeklyService * monthlyFactor;

      if (installation > 0) {
        // Simpler rule: first month = install + normal month
        firstMonthPrice = installation + normalMonth;
      } else {
        firstMonthPrice = normalMonth;
      }
    }

    normalMonth = round2(normalMonth);
    firstMonthPrice = round2(firstMonthPrice);

    // Contract total:
    // If installation > 0:
    //   Total = FirstMonth + (Months − 1) × normalMonth
    // If installation == 0:
    //   Total = Months × normalMonth
    let contractTotalRaw: number;
    if (installation > 0) {
      contractTotalRaw = firstMonthPrice + (contractMonths - 1) * normalMonth;
    } else {
      contractTotalRaw = contractMonths * normalMonth;
    }
    const contractTotal = round2(contractTotalRaw);

    // For this UI:
    // - monthlyRecurring  → normal recurring month (4.33× or 0.5×)
    // - annualRecurring   → total contract for contractMonths
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
      monthlyRecurring,
      annualRecurring,
      installation,
      tripCharge,

      firstVisitPrice,
      firstMonthPrice,
      contractMonths,

      notes: state.notes || "",

      breakdown,
    };

    return quote;
  }, [state]);

  const updateField = <K extends keyof FoamingDrainFormState>(
    key: K,
    value: FoamingDrainFormState[K]
  ) => {
    setState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const reset = () => {
    setState({
      ...DEFAULT_FOAMING_DRAIN_FORM_STATE,
      serviceId: "foamingDrain",
    });
  };

  return { state, quote, updateField, reset };
}

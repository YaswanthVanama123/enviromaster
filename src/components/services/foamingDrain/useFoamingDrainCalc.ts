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

const DEFAULT_FREQUENCY: FoamingDrainFrequency = "weekly";

const DEFAULT_FOAMING_DRAIN_FORM_STATE: FoamingDrainFormState = {
  serviceId: "foamingDrain",
  standardDrainCount: 0,
  installDrainCount: 0,
  greaseTrapCount: 0,
  greenDrainCount: 0,
  filthyDrainCount: 0,
  frequency: DEFAULT_FREQUENCY,
  facilityCondition: "normal",
  location: "standard",
  tripChargeOverride: undefined,
  needsPlumbing: false,
  plumbingDrainCount: 0,
  useSmallAltPricingWeekly: false,
  useBigAccountTenWeekly: false,
  isAllInclusive: false,
  chargeGreaseTrapInstall: true, // "if possible" → default ON
  notes: "",
};

export interface UseFoamingDrainCalcResult {
  state: FoamingDrainFormState;
  updateField: <K extends keyof FoamingDrainFormState>(
    key: K,
    value: FoamingDrainFormState[K]
  ) => void;
  reset: () => void;
  quote: FoamingDrainQuoteResult;
}

export function useFoamingDrainCalc(
  initialData?: Partial<FoamingDrainFormState>
): UseFoamingDrainCalcResult {
  const [state, setState] = useState<FoamingDrainFormState>(() => ({
    ...DEFAULT_FOAMING_DRAIN_FORM_STATE,
    ...initialData,
    serviceId: "foamingDrain",
  }));

  const quote = useMemo<FoamingDrainQuoteResult>(() => {
    // ---------- 0) Normalized inputs ----------
    const standardDrains = Math.max(0, Number(state.standardDrainCount) || 0);
    const greaseTraps = Math.max(0, Number(state.greaseTrapCount) || 0);
    const greenDrains = Math.max(0, Number(state.greenDrainCount) || 0);
    const plumbingDrains = Math.max(
      0,
      Number(state.plumbingDrainCount) || 0
    );

    const frequency: FoamingDrainFrequency =
      state.frequency ?? cfg.defaultFrequency;
    const condition: FoamingDrainCondition =
      state.facilityCondition ?? "normal";
    const location: FoamingDrainLocation = state.location ?? "standard";
    const isAllInclusive = !!state.isAllInclusive;
    const isWeekly = frequency === "weekly";

    const isVolume =
      standardDrains >= cfg.volumePricing.minimumDrains; // 10+ drains
    const anyService =
      standardDrains > 0 || greaseTraps > 0 || greenDrains > 0;

    // Alt-mode availability
    const canUseSmallAlt = isWeekly && standardDrains > 0 && !isVolume;
    const canUseBigAlt = isWeekly && isVolume;

    const useSmallAlt =
      !!state.useSmallAltPricingWeekly && canUseSmallAlt;
    const useBigAlt = !!state.useBigAccountTenWeekly && canUseBigAlt;

    // Install-level program = 10+ drains AND not big-account alt
    const isInstallLevel = isVolume && !useBigAlt;

    // How many drains are actually being treated as "install" (10+ rule)?
    const requestedInstallDrains = Math.max(
      0,
      Number(state.installDrainCount) || 0
    );
    const installDrains = isInstallLevel
      ? Math.min(requestedInstallDrains, standardDrains)
      : 0;

    // How many of those install drains are filthy for 3× install?
    let filthyInstallDrains = 0;
    if (condition === "filthy" && installDrains > 0) {
      const requestedFilthy =
        Math.max(0, Number(state.filthyDrainCount) || 0) || 0;
      // If user typed >0, clamp to installDrains.
      // If they left 0, assume ALL install drains are filthy.
      filthyInstallDrains =
        requestedFilthy > 0
          ? Math.min(requestedFilthy, installDrains)
          : installDrains;
    }
    const cleanInstallDrains = installDrains - filthyInstallDrains;

    // Decide pricing model label for breakdown
    let pricingModel: FoamingDrainBreakdown["pricingModel"];
    if (isVolume) {
      pricingModel = "volume";
    } else if (useSmallAlt) {
      pricingModel = "alternative";
    } else {
      pricingModel = "standard";
    }

    // ---------- 1) Standard drain weekly / per-visit charge ----------
    let weeklyStandard = 0;

    if (isAllInclusive) {
      // Standard drains included in all-inclusive
      weeklyStandard = 0;
    } else if (useBigAlt) {
      // Big-account special: $10/week per drain, install waived
      weeklyStandard = standardDrains * cfg.standardDrainRate; // $10/drain
    } else if (isVolume) {
      // INSTALL-LEVEL pricing for 10+ drains:
      //   Weekly  → $20/drain
      //   2 mo    → $10/drain
      const volCfg =
        cfg.volumePricing[frequency] ?? { ratePerDrain: cfg.standardDrainRate };
      const ratePerDrain = volCfg.ratePerDrain ?? cfg.standardDrainRate;
      weeklyStandard = standardDrains * ratePerDrain;
    } else if (useSmallAlt) {
      // Alternative small-job weekly pricing: $20 + $4/drain
      weeklyStandard =
        cfg.largeDrainBaseCharge +
        standardDrains * cfg.largeDrainExtraPerDrain;
    } else {
      // Normal: $10/drain
      weeklyStandard = standardDrains * cfg.standardDrainRate;
    }

    // ---------- 2) Plumbing addon: $10 / drain ----------
    let plumbingAddon = 0;
    if (!isAllInclusive && state.needsPlumbing && standardDrains > 0) {
      // Clamp plumbing drains to # of standard drains
      const drainsWithPlumbing = Math.min(plumbingDrains, standardDrains);
      plumbingAddon =
        drainsWithPlumbing * cfg.pricingRules.plumbingWorkAddon;
    }

    // ---------- 3) Special drains weekly ----------
    // Grease traps: $125/wk, not standard drains
    const weeklyGrease =
      greaseTraps * cfg.specialDrains.greaseTrap.weeklyRate;

    // Green drains: $5/wk
    const weeklyGreen =
      greenDrains * cfg.specialDrains.greenDrain.weeklyRate;

    // ---------- 4) Weekly subtotal (service only, no trip) ----------
    const weeklySubtotal =
      weeklyStandard + plumbingAddon + weeklyGrease + weeklyGreen;

    // ---------- 5) Installation fees ----------
    let installBase = 0;
    let conditionMultiplier = 1;

    if (
      !isAllInclusive &&
      installDrains > 0 &&
      isInstallLevel
    ) {
      // Install fee per drain is $10 (for 10+ install level),
      // regardless of weekly vs every 2 months.
      const volCfg = cfg.volumePricing[frequency];
      const baseInstallRate =
        (volCfg && volCfg.installPerDrain) ?? 10;

      const filthyMult = cfg.installationRules.filthyMultiplier;

      const cleanInstall =
        cleanInstallDrains * baseInstallRate;
      const filthyInstall =
        filthyInstallDrains * baseInstallRate * filthyMult;

      installBase = cleanInstall + filthyInstall + plumbingAddon;

      // For breakdown only
      conditionMultiplier = filthyInstallDrains > 0 ? filthyMult : 1;
    }

    let installBeforeWaive = installBase;

    // Big-account: $10/wk/drain for large number of drains → definitely waive install
    if (useBigAlt && cfg.installationRules.waiveForLargeVolume) {
      installBeforeWaave = 0;
    }

    // Grease trap install: optional ("if possible")
    let greaseInstall = 0;
    if (greaseTraps > 0 && state.chargeGreaseTrapInstall) {
      greaseInstall = Math.max(
        cfg.specialDrains.greaseTrap.installMinimum,
        greaseTraps * cfg.specialDrains.greaseTrap.perTrapInstall
      );
    }

    // Green drain install: $100 per green drain
    const greenInstall =
      greenDrains * cfg.specialDrains.greenDrain.installCost;

    const installTotal =
      installBeforeWaive + greaseInstall + greenInstall;

    // ---------- 6) Trip charge (with optional override) ----------
    let tripCharge = 0;
    if (anyService) {
      if (isAllInclusive && cfg.tripCharges.includedInAllInclusive) {
        tripCharge = 0;
      } else {
        const defaultTrip =
          location === "beltway"
            ? cfg.tripCharges.beltway
            : cfg.tripCharges.standard;

        if (
          typeof state.tripChargeOverride === "number" &&
          state.tripChargeOverride >= 0
        ) {
          tripCharge = state.tripChargeOverride;
        } else {
          tripCharge = defaultTrip;
        }
      }
    }

    // ---------- 7) Weekly total (service + trip) ----------
    const weeklyTotal = anyService ? weeklySubtotal + tripCharge : 0;

    // ---------- 8) Monthly & annual (add FULL install) ----------
    const conv =
      cfg.billingConversions[frequency] ??
      cfg.billingConversions[DEFAULT_FREQUENCY];

    const recurringMonthly = weeklyTotal * conv.monthlyMultiplier;
    const recurringAnnual = weeklyTotal * conv.annualMultiplier;

    // Add full install to both
    const monthlyRecurring = recurringMonthly + installTotal;
    const annualRecurring = recurringAnnual + installTotal;

    // ---------- 9) Breakdown + final quote ----------
    const breakdown: FoamingDrainBreakdown = {
      pricingModel,
      weeklyStandardDrains: weeklyStandard,
      weeklyPlumbingAddon: plumbingAddon,
      weeklyGreaseTraps: weeklyGrease,
      weeklyGreenDrains: weeklyGreen,
      weeklyServiceSubtotal: weeklySubtotal,
      baseInstall: installBase,
      conditionMultiplier,
      installBeforeWaive,
      greaseTrapInstall: greaseInstall,
      greenDrainInstall: greenInstall,
      installationTotal: installTotal,
      volumePricingApplied: isVolume,
      usedSmallAlt: useSmallAlt,
      usedBigAccountAlt: useBigAlt,
      tripCharge,
      weeklyTotal,
      monthlyRecurring,
      annualRecurring,
    };

    const quote: FoamingDrainQuoteResult = {
      serviceId: "foamingDrain",
      label: "Foaming Drain Service",

      frequency,
      location,
      facilityCondition: condition,

      standardDrainCount: standardDrains,
      installDrainCount: installDrains,
      greaseTrapCount: greaseTraps,
      greenDrainCount: greenDrains,
      filthyDrainCount: filthyInstallDrains,

      isAllInclusive,
      needsPlumbing: state.needsPlumbing,
      plumbingDrainCount: plumbingDrains,

      useSmallAltPricingWeekly: !!state.useSmallAltPricingWeekly,
      useBigAccountTenWeekly: !!state.useBigAccountTenWeekly,
      chargeGreaseTrapInstall: !!state.chargeGreaseTrapInstall,

      weeklyService: weeklySubtotal,
      weeklyTotal,
      monthlyRecurring,
      annualRecurring,
      installation: installTotal,
      tripCharge,

      notes: state.notes ?? "",
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

  return { state, updateField, reset, quote };
}

// src/features/services/foamingDrain/useFoamingDrainCalc.ts
import { useMemo, useState } from "react";
import { FOAMING_DRAIN_CONFIG } from "./foamingDrainConfig";
import type {
  FoamingDrainFormState,
  FoamingDrainQuoteResult,
  FoamingDrainFrequency,
  FoamingDrainLocation,
  FoamingDrainCondition,
  FoamingDrainBreakdown,
} from "./foamingDrainTypes";

const BILLING_WEEKLY: FoamingDrainFrequency = "weekly";

const DEFAULT_FOAMING_DRAIN_FORM_STATE: FoamingDrainFormState = {
  serviceId: "foamingDrain",
  standardDrainCount: 0,
  greaseTrapCount: 0,
  greenDrainCount: 0,
  frequency: BILLING_WEEKLY,
  facilityCondition: "normal",
  location: "standard",
  needsPlumbing: false,
  useAlternativePricing: false,
  isAllInclusive: false,
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
    const cfg = FOAMING_DRAIN_CONFIG;

    // ---------- 0) Normalized inputs ----------
    const standardDrains = Math.max(0, Number(state.standardDrainCount) || 0);
    const greaseTraps = Math.max(0, Number(state.greaseTrapCount) || 0);
    const greenDrains = Math.max(0, Number(state.greenDrainCount) || 0);

    const frequency: FoamingDrainFrequency =
      state.frequency ?? cfg.defaultFrequency;
    const condition: FoamingDrainCondition =
      state.facilityCondition ?? "normal";
    const location: FoamingDrainLocation = state.location ?? "standard";
    const isAllInclusive = !!state.isAllInclusive;

    const isVolume = standardDrains >= cfg.volumePricing.minimumDrains;
    const isWeekly = frequency === "weekly";
    const anyService =
      standardDrains > 0 || greaseTraps > 0 || greenDrains > 0;

    // Alternative pricing toggle actually requested (and meaningful)
    const altRequested =
      !!state.useAlternativePricing &&
      cfg.pricingRules.canOfferAlternativePricing &&
      standardDrains > 0;

    // Two concrete alternative modes:
    // 1) Small jobs (<10 drains) → $20 + $4/drain
    const useAlt20Plus4 = !isVolume && altRequested;

    // 2) Big-account special (10+ drains, weekly) → $10/wk/drain + install waived
    const useBigAccountTenDollarRate = isVolume && isWeekly && altRequested;

    // Decide "pricing model" label for breakdown
    let pricingModel: FoamingDrainBreakdown["pricingModel"];
    if (isVolume) {
      pricingModel = "volume"; // big-account deal is still a volume account
    } else if (useAlt20Plus4) {
      pricingModel = "alternative";
    } else {
      pricingModel = "standard";
    }

    // ---------- 1) Weekly standard drains ----------
    let weeklyStandard = 0;

    if (isAllInclusive) {
      // Included with all-inclusive (standard drains only)
      weeklyStandard = 0;
    } else if (isVolume) {
      if (useBigAccountTenDollarRate) {
        // Big-account special: $10/wk/drain
        weeklyStandard = standardDrains * cfg.standardDrainRate;
      } else {
        // Normal volume install-level pricing: 10+ drains
        const volumeForFreq =
          cfg.volumePricing[frequency] ?? cfg.volumePricing.weekly;
        weeklyStandard = standardDrains * volumeForFreq.ratePerDrain;
      }
    } else if (useAlt20Plus4) {
      // Alternative for small jobs: $20 + $4/drain
      weeklyStandard =
        cfg.largeDrainBaseCharge +
        standardDrains * cfg.largeDrainExtraPerDrain;
    } else {
      // Normal: $10/drain
      weeklyStandard = standardDrains * cfg.standardDrainRate;
    }

    // ---------- 2) Plumbing add-on: $10/drain ----------
    let plumbingAddon = 0;
    if (!isAllInclusive && state.needsPlumbing && standardDrains > 0) {
      plumbingAddon = standardDrains * cfg.pricingRules.plumbingWorkAddon;
    }

    // ---------- 3) Special drains weekly ----------
    const weeklyGrease =
      greaseTraps * cfg.specialDrains.greaseTrap.weeklyRate;
    const weeklyGreen = greenDrains * cfg.specialDrains.greenDrain.weeklyRate;

    // ---------- 4) Weekly subtotal (service only, no trip) ----------
    const weeklySubtotal =
      weeklyStandard + plumbingAddon + weeklyGrease + weeklyGreen;

    // ---------- 5) Installation fees ----------
    let installBase = 0;

    // Base install is tied to the standard/plumbing portion only
    if (!isAllInclusive && !useBigAccountTenDollarRate) {
      installBase = weeklyStandard + plumbingAddon;
    }

    const conditionMultiplier =
      condition === "filthy"
        ? cfg.installationRules.filthyMultiplier
        : cfg.installationRules.standardMultiplier;

    let installBeforeWaive = installBase * conditionMultiplier;

    // Big-account special: definitely waive standard install
    if (
      useBigAccountTenDollarRate &&
      cfg.installationRules.waiveForLargeVolume
    ) {
      installBeforeWaive = 0;
    }

    // Grease trap install: max($300, traps * $150)
    const greaseInstall =
      greaseTraps > 0
        ? Math.max(
            cfg.specialDrains.greaseTrap.installMinimum,
            greaseTraps * cfg.specialDrains.greaseTrap.perTrapInstall
          )
        : 0;

    // Green drain install: $100 per green drain
    const greenInstall =
      greenDrains * cfg.specialDrains.greenDrain.installCost;

    const installTotal = installBeforeWaive + greaseInstall + greenInstall;

    // ---------- 6) Trip charge ----------
    let tripCharge = 0;
    if (anyService) {
      if (isAllInclusive && cfg.tripCharges.includedInAllInclusive) {
        tripCharge = 0;
      } else {
        tripCharge =
          location === "beltway"
            ? cfg.tripCharges.beltway
            : cfg.tripCharges.standard;
      }
    }

    // ---------- 7) Weekly total (service + trip) ----------
    const weeklyTotal = anyService ? weeklySubtotal + tripCharge : 0;

    // ---------- 8) Monthly & annual ----------
    const conv =
      cfg.billingConversions[frequency] ??
      cfg.billingConversions[BILLING_WEEKLY];

    const monthlyRecurring = weeklyTotal * conv.monthlyMultiplier;
    const annualRecurring = weeklyTotal * conv.annualMultiplier;

    // ---------- 9) Breakdown + final quote ----------
    const usedAlternativePricing = useAlt20Plus4 || useBigAccountTenDollarRate;

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
      usedAlternativePricing,
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
      greaseTrapCount: greaseTraps,
      greenDrainCount: greenDrains,

      isAllInclusive,
      needsPlumbing: state.needsPlumbing,
      useAlternativePricing: state.useAlternativePricing,

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

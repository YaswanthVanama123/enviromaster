// src/features/services/sanipod/useSanipodCalc.ts
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { sanipodPricingConfig as cfg } from "./sanipodConfig";
import type {
  SanipodFrequencyKey,
  SanipodLocationKey,
  SanipodRateCategory,
  SanipodServiceMode,
  SanipodInstallType,
} from "./sanipodTypes";

export interface SanipodFormState {
  podQuantity: number;
  extraBagsPerWeek: number;

  serviceMode: SanipodServiceMode;

  frequency: SanipodFrequencyKey;

  location: SanipodLocationKey;
  needsParking: boolean;

  isNewInstall: boolean;
  installType: SanipodInstallType;

  rateCategory: SanipodRateCategory;

  // For future add-ons (toilet clips / seat cover dispensers) – not
  // used in SaniPod math here, but kept in the form for consistency.
  toiletClipsQty: number;
  seatCoverDispensersQty: number;
}

export interface SanipodCalcResult {
  /** Total charge per visit at the selected frequency (includes service + trip, excludes install). */
  perVisit: number;
  /** Monthly recurring revenue (service + trip, excludes install). */
  monthly: number;
  /** Annual recurring revenue (service + trip, excludes install). */
  annual: number;
  /** One-time install cost (if isNewInstall). */
  installCost: number;
}

const DEFAULT_FORM_STATE: SanipodFormState = {
  podQuantity: 0,
  extraBagsPerWeek: 0,

  serviceMode: "standalone",
  frequency: cfg.defaultFrequency,

  location: "insideBeltway",
  needsParking: false,

  isNewInstall: false,
  installType: "clean",

  rateCategory: "redRate",

  toiletClipsQty: 0,
  seatCoverDispensersQty: 0,
};

function annualVisits(freq: SanipodFrequencyKey): number {
  return cfg.annualFrequencies[freq] ?? cfg.annualFrequencies.weekly;
}

export function useSanipodCalc(initialData?: Partial<SanipodFormState>) {
  const [form, setForm] = useState<SanipodFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const target: any = e.target;

    setForm((prev) => {
      const next: SanipodFormState = { ...prev };

      if (type === "checkbox") {
        next[name as keyof SanipodFormState] = target.checked;
      } else if (type === "number") {
        const raw = target.value;
        const num = raw === "" ? 0 : Number(raw);
        next[name as keyof SanipodFormState] =
          Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        next[name as keyof SanipodFormState] = target.value;
      }

      return next;
    });
  };

  const calc = useMemo<SanipodCalcResult>(() => {
    const pods = Math.max(0, Number(form.podQuantity) || 0);
    const bagsPerWeek = Math.max(0, Number(form.extraBagsPerWeek) || 0);

    const anyPodsOrBags = pods > 0 || bagsPerWeek > 0;

    // If truly no SaniPod activity and no new install, everything is 0.
    if (!anyPodsOrBags && !form.isNewInstall) {
      return {
        perVisit: 0,
        monthly: 0,
        annual: 0,
        installCost: 0,
      };
    }

    const freq: SanipodFrequencyKey = form.frequency ?? cfg.defaultFrequency;
    const visits = annualVisits(freq);
    const rateCfg = cfg.rateCategories[form.rateCategory];

    const weeklyExtraRed = bagsPerWeek * cfg.extraBagPrice;
    const weeklyToAnnual = cfg.annualFrequencies.weekly;

    // ---------- Install cost ----------
    let installCost = 0;
    if (form.isNewInstall && pods > 0) {
      const baseInstall = pods * cfg.installChargePerUnit;
      const mult =
        form.installType === "dirty"
          ? cfg.installationOptions.dirtyMultiplier
          : cfg.installationOptions.cleanMultiplier;
      installCost = baseInstall * mult;
    }

    let annual = 0;

    // ---------- Standalone mode ----------
    if (form.serviceMode === "standalone") {
      // $8/wk flat option
      const weeklyFlatRed =
        cfg.standaloneOptions.flatRate + weeklyExtraRed;

      // $3/wk/ea + bags
      const weeklyPerUnitRed =
        pods * cfg.standaloneOptions.perUnitRate + weeklyExtraRed;

      const annualFlatServiceRed = weeklyFlatRed * weeklyToAnnual;
      const annualPerUnitServiceRed = weeklyPerUnitRed * weeklyToAnnual;

      const annualFlatService =
        annualFlatServiceRed * rateCfg.multiplier;
      const annualPerUnitService =
        annualPerUnitServiceRed * rateCfg.multiplier;

      // Trip charge applies to BOTH options
      let tripPerVisit =
        form.location === "insideBeltway"
          ? cfg.tripCharge.insideBeltway
          : cfg.tripCharge.outsideBeltway;
      if (form.needsParking) {
        tripPerVisit += cfg.tripCharge.parkingSurcharge;
      }

      const visitsStandalone = cfg.annualFrequencies.weekly; // weekly service
      const annualTrip =
        cfg.businessRules.alwaysIncludeTripChargeStandalone
          ? tripPerVisit * visitsStandalone
          : 0;

      const annualTotalFlat = annualFlatService + annualTrip;

      // Per-unit option has $40/month MINIMUM (on total, service + trip)
      const annualPerUnitRaw = annualPerUnitService + annualTrip;
      const monthlyPerUnitRaw = annualPerUnitRaw / 12;
      const minimumMonthly = cfg.standaloneOptions.minimum;
      const monthlyPerUnit = Math.max(minimumMonthly, monthlyPerUnitRaw);
      const annualTotalPerUnit = monthlyPerUnit * 12;

      // Customer gets whichever overall total is cheaper
      if (annualTotalFlat <= annualTotalPerUnit) {
        annual = annualTotalFlat;
      } else {
        annual = annualTotalPerUnit;
      }
    }

    // ---------- Bundled with SaniClean ----------
    if (form.serviceMode === "withSaniClean") {
      const annualPodsRed =
        pods * cfg.bundleOptions.withSaniClean.monthlyRatePerPod * 12;
      const annualExtraBagsRed = weeklyExtraRed * weeklyToAnnual;

      const annualServiceRed = annualPodsRed + annualExtraBagsRed;
      const annualService = annualServiceRed * rateCfg.multiplier;

      // No separate trip charge – covered by SaniClean line
      annual = annualService;
    }

    // ---------- All-inclusive program ----------
    if (form.serviceMode === "allInclusive") {
      const annualPodsRed =
        pods *
        cfg.bundleOptions.allInclusive.monthlyRatePerFixture *
        12;
      const annualExtraBagsRed = weeklyExtraRed * weeklyToAnnual;

      const annualServiceRed = annualPodsRed + annualExtraBagsRed;
      const annualService = annualServiceRed * rateCfg.multiplier;

      // No separate trip charge – covered by all-inclusive structure
      annual = annualService;
    }

    // Safety guard
    if (!Number.isFinite(annual) || annual < 0) {
      annual = 0;
    }

    const monthly = annual / 12;
    const perVisit = visits > 0 ? annual / visits : 0;

    return {
      perVisit,
      monthly,
      annual,
      installCost,
    };
  }, [form]);

  return { form, onChange, calc };
}

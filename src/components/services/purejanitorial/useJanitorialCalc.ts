// src/features/services/janitorial/useJanitorialCalc.ts
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type {
  JanitorialFrequencyKey,
  JanitorialRateCategory,
  SchedulingMode,
} from "./janitorialTypes";

export interface JanitorialFormState {
  /** Manual hours entry */
  manualHours: number;

  /** Scheduling mode affects pricing */
  schedulingMode: SchedulingMode;

  /** Is this part of a larger service package? (affects addon-only pricing) */
  isAddonToLargerService: boolean;

  /** Task-specific inputs */
  vacuumingHours: number;
  dustingPlaces: number;

  /** If true, first visit is treated as a dirty initial clean (3x). */
  dirtyInitial: boolean;

  frequency: JanitorialFrequencyKey;
  rateCategory: JanitorialRateCategory;

  /** Contract length in months (2–36). */
  contractMonths: number;
}

export interface JanitorialCalcResult {
  /** Total hours calculated from all tasks */
  totalHours: number;

  /** Per-visit revenue (service only). */
  perVisit: number;

  /** First month total. */
  monthly: number;

  /** Contract total for the selected number of months. */
  annual: number;

  /** First-visit revenue (may be 3x when dirtyInitial=true or infrequent). */
  firstVisit: number;

  /** Ongoing monthly after the first month. */
  ongoingMonthly: number;

  /** Contract total (same as annual). */
  contractTotal: number;

  /** Breakdown details */
  breakdown: {
    manualHours: number;
    vacuumingHours: number;
    dustingHours: number;
    pricingMode: string;
    basePrice: number;
    appliedMultiplier: number;
  };
}

const DEFAULT_FORM_STATE: JanitorialFormState = {
  manualHours: 0,
  schedulingMode: "normalRoute",
  isAddonToLargerService: false,
  vacuumingHours: 0,
  dustingPlaces: 0,
  dirtyInitial: false,
  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",
  contractMonths: cfg.minContractMonths ?? 12,
};

/**
 * Calculate per-visit price based on hours and scheduling mode.
 */
function calculatePerVisitPrice(
  hours: number,
  schedulingMode: SchedulingMode,
  isAddon: boolean,
  frequency: JanitorialFrequencyKey
): number {
  if (hours <= 0) return 0;

  // Standalone jobs use $50/hr flat rate
  if (schedulingMode === "standalone") {
    return hours * cfg.shortJobHourlyRate;
  }

  // Normal route: use tiered pricing
  // Check if infrequent (quarterly = 4x/year)
  const isInfrequent = frequency === "quarterly";

  // For 4+ hours, use $30/hr
  if (hours >= 4) {
    return hours * cfg.baseHourlyRate;
  }

  // Find the appropriate tier
  for (const tier of cfg.tieredPricing) {
    if (hours <= tier.upToHours) {
      // Check if this is addon-only pricing
      if (tier.addonOnly && !isAddon) {
        // Use standalone price if available (for 15-30 min tier)
        return tier.standalonePrice ?? tier.price;
      }
      return tier.price;
    }
  }

  // Fallback (shouldn't reach here with proper tier config)
  return hours * cfg.baseHourlyRate;
}

export function useJanitorialCalc(initialData?: Partial<JanitorialFormState>) {
  const [form, setForm] = useState<JanitorialFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type } = e.target;
    const t: any = e.target;

    setForm((prev) => {
      const next: JanitorialFormState = { ...prev };

      if (type === "checkbox") {
        next[name as keyof JanitorialFormState] = t.checked;
      } else if (type === "number") {
        const raw = t.value;
        const num = raw === "" ? 0 : Number(raw);
        next[name as keyof JanitorialFormState] =
          Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        next[name as keyof JanitorialFormState] = t.value;
      }

      return next;
    });
  };

  const calc: JanitorialCalcResult = useMemo(() => {
    // Calculate total hours from all sources
    const manualHours = Math.max(0, Number(form.manualHours) || 0);
    const vacuumingHours = Math.max(0, Number(form.vacuumingHours) || 0);

    // Dusting calculation: places / 30 = hours
    const dustingPlaces = Math.max(0, Number(form.dustingPlaces) || 0);
    let dustingHours = dustingPlaces / cfg.dustingPlacesPerHour;

    // Apply 3× multiplier for dirty initial or infrequent service (dusting only)
    const isInfrequent = form.frequency === "quarterly";
    if (dustingPlaces > 0 && (form.dirtyInitial || isInfrequent)) {
      dustingHours *= cfg.infrequentMultiplier;
    }

    const totalHours = manualHours + vacuumingHours + dustingHours;

    // If no hours, return zeros
    if (totalHours === 0) {
      return {
        totalHours: 0,
        perVisit: 0,
        monthly: 0,
        annual: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
        breakdown: {
          manualHours: 0,
          vacuumingHours: 0,
          dustingHours: 0,
          pricingMode: "none",
          basePrice: 0,
          appliedMultiplier: 1,
        },
      };
    }

    // Calculate base per-visit price (red rate)
    const basePrice = calculatePerVisitPrice(
      totalHours,
      form.schedulingMode,
      form.isAddonToLargerService,
      form.frequency
    );

    // Apply rate category multiplier
    const rateCfg = cfg.rateCategories[form.rateCategory];
    const perVisit = basePrice * rateCfg.multiplier;

    // First visit pricing
    // Apply dirty initial multiplier to the entire first visit
    const firstVisit = form.dirtyInitial
      ? perVisit * cfg.dirtyInitialMultiplier
      : perVisit;

    // Monthly calculations
    const weeksPerMonth = cfg.weeksPerMonth ?? 4.33;
    const monthlyVisits = weeksPerMonth;

    // If first visit is special (3x), use "firstVisit + (4.33 - 1) * perVisit"
    // Otherwise just 4.33 * perVisit
    const firstMonth =
      firstVisit > perVisit
        ? firstVisit + Math.max(monthlyVisits - 1, 0) * perVisit
        : monthlyVisits * perVisit;

    const ongoingMonthly = monthlyVisits * perVisit;

    // Contract total
    const minMonths = cfg.minContractMonths ?? 2;
    const maxMonths = cfg.maxContractMonths ?? 36;
    const rawMonths = Number(form.contractMonths) || minMonths;
    const contractMonths = Math.min(
      Math.max(rawMonths, minMonths),
      maxMonths
    );

    const contractTotal =
      contractMonths <= 0
        ? 0
        : firstMonth + Math.max(contractMonths - 1, 0) * ongoingMonthly;

    return {
      totalHours,
      perVisit,
      monthly: firstMonth,
      annual: contractTotal,
      firstVisit,
      ongoingMonthly,
      contractTotal,
      breakdown: {
        manualHours,
        vacuumingHours,
        dustingHours,
        pricingMode:
          form.schedulingMode === "standalone"
            ? "Standalone ($50/hr)"
            : totalHours >= 4
            ? "Normal Route (4+ hrs, $30/hr)"
            : "Tiered Pricing",
        basePrice,
        appliedMultiplier: rateCfg.multiplier,
      },
    };
  }, [form]);

  return { form, onChange, calc };
}

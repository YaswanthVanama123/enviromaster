// src/features/services/sanipod/useSanipodCalc.ts
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { sanipodPricingConfig as cfg } from "./sanipodConfig";
import type {
  SanipodFrequencyKey,
  SanipodRateCategory,
  SanipodServiceRuleKey,
} from "./sanipodTypes";

// API base URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface SanipodFormState {
  podQuantity: number;
  extraBagsPerWeek: number;
  /** true = recurring each visit, false = one-time only on first visit */
  extraBagsRecurring: boolean;

  // Editable pricing rates (fetched from backend or config)
  weeklyRatePerUnit: number;        // 3$/week per pod (used in 3+40 rule)
  altWeeklyRatePerUnit: number;     // 8$/week per pod (flat per-pod option)
  extraBagPrice: number;            // 2$/bag
  standaloneExtraWeeklyCharge: number; // 40$/week account-level base

  includeTrip: boolean;
  tripChargePerVisit: number;

  isNewInstall: boolean;
  installQuantity: number;
  installRatePerPod: number;

  /** Custom installation override (user can manually set installation cost) */
  customInstallationFee?: number;

  /** Custom override for per visit price */
  customPerVisitPrice?: number;

  /** Custom override for first month total */
  customMonthlyPrice?: number;

  /** Custom override for contract total */
  customAnnualPrice?: number;

  frequency: SanipodFrequencyKey;
  rateCategory: SanipodRateCategory;

  /** Contract length in months (2–36). */
  contractMonths: number;

  /** Is this a standalone service (not part of package)? If false, always use $8/pod. */
  isStandalone: boolean;
}

export interface SanipodCalcResult {
  /** Per visit, service only (no install, no trip). */
  perVisit: number;

  /** First month total (first visit + other visits). */
  monthly: number;

  /** Contract total for the selected number of months. */
  annual: number;

  /** Install + any one-time extra bag cost. */
  installCost: number;

  /** Which service rule ("8" or "3+40") is cheaper. */
  chosenServiceRule: SanipodServiceRuleKey;

  /** Pod-only portion of the weekly service at red rate (without bags). */
  weeklyPodServiceRed: number;

  /** First visit charge = install-only (plus one-time bags). */
  firstVisit: number;

  /** Ongoing monthly (after first) with 4.33 weeks logic. */
  ongoingMonthly: number;

  /** Contract total explicitly, same as `annual`. */
  contractTotal: number;
}

const DEFAULT_FORM_STATE: SanipodFormState = {
  podQuantity: 0,
  extraBagsPerWeek: 0,
  extraBagsRecurring: true,

  // Editable pricing rates from config (will be overridden by backend)
  weeklyRatePerUnit: cfg.weeklyRatePerUnit,
  altWeeklyRatePerUnit: cfg.altWeeklyRatePerUnit,
  extraBagPrice: cfg.extraBagPrice,
  standaloneExtraWeeklyCharge: cfg.standaloneExtraWeeklyCharge,

  includeTrip: false,
  tripChargePerVisit: cfg.tripChargePerVisit, // 0 and ignored in calc

  isNewInstall: false,
  installQuantity: 0,
  installRatePerPod: cfg.installChargePerUnit,

  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",

  contractMonths: cfg.minContractMonths ?? 12,

  isStandalone: true, // Default to standalone
};

export function useSanipodCalc(initialData?: Partial<SanipodFormState>) {
  const [form, setForm] = useState<SanipodFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });

  // Fetch pricing from backend on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/service-configs/active?serviceId=sanipod`);

        if (!response.ok) {
          console.warn('SaniPod config not found in backend, using default values');
          return;
        }

        const data = await response.json();

        if (data && data.config) {
          const backendConfig = data.config;

          setForm((prev) => ({
            ...prev,
            // Update all rate fields from backend if available
            weeklyRatePerUnit: backendConfig.weeklyRatePerUnit ?? prev.weeklyRatePerUnit,
            altWeeklyRatePerUnit: backendConfig.altWeeklyRatePerUnit ?? prev.altWeeklyRatePerUnit,
            extraBagPrice: backendConfig.extraBagPrice ?? prev.extraBagPrice,
            standaloneExtraWeeklyCharge: backendConfig.standaloneExtraWeeklyCharge ?? prev.standaloneExtraWeeklyCharge,
            installRatePerPod: backendConfig.installChargePerUnit ?? prev.installRatePerPod,
            tripChargePerVisit: backendConfig.tripChargePerVisit ?? prev.tripChargePerVisit,
          }));

          console.log('✅ SaniPod pricing loaded from backend:', {
            weeklyRate: backendConfig.weeklyRatePerUnit,
            altRate: backendConfig.altWeeklyRatePerUnit,
            extraBag: backendConfig.extraBagPrice,
            standaloneExtra: backendConfig.standaloneExtraWeeklyCharge,
            installRate: backendConfig.installChargePerUnit,
          });
        }
      } catch (error) {
        console.error('Failed to fetch SaniPod pricing from backend:', error);
        console.log('Using default hardcoded values as fallback');
      }
    };

    fetchPricing();
  }, []); // Run once on mount

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type } = e.target;
    const t: any = e.target;

    setForm((prev) => {
      const next: SanipodFormState = { ...prev };

      if (type === "checkbox") {
        next[name as keyof SanipodFormState] = t.checked;
      } else if (
        name === "customInstallationFee" ||
        name === "customPerVisitPrice" ||
        name === "customMonthlyPrice" ||
        name === "customAnnualPrice"
      ) {
        // Handle custom override fields - allow clearing by setting to undefined
        if (t.value === '') {
          (next as any)[name] = undefined;
        } else {
          const numVal = parseFloat(t.value);
          if (!isNaN(numVal)) {
            (next as any)[name] = numVal;
          }
        }
      } else if (type === "number") {
        const raw = t.value;
        const num = raw === "" ? 0 : parseFloat(raw);
        next[name as keyof SanipodFormState] =
          Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        next[name as keyof SanipodFormState] = t.value;
      }

      return next;
    });
  };

  const calc: SanipodCalcResult = useMemo(() => {
    const pods = Math.max(0, Number(form.podQuantity) || 0);
    const bags = Math.max(0, Number(form.extraBagsPerWeek) || 0);
    const installQtyRaw = Math.max(0, Number(form.installQuantity) || 0);

    const anyActivity =
      pods > 0 ||
      bags > 0 ||
      (form.isNewInstall && installQtyRaw > 0);

    if (!anyActivity) {
      return {
        perVisit: 0,
        monthly: 0,
        annual: 0,
        installCost: 0,
        chosenServiceRule: "perPod8",
        weeklyPodServiceRed: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
      };
    }

    const rateCfg = cfg.rateCategories[form.rateCategory];
    const weeksPerMonth = cfg.weeksPerMonth ?? 4.33;

    // Trip charge concept removed from calculations.
    const tripPerVisit = 0;

    const installRate =
      form.installRatePerPod > 0
        ? form.installRatePerPod
        : cfg.installChargePerUnit;

    // ---------- EXTRA BAGS ----------
    // If recurring: weekly revenue; if one-time: first-visit only.
    const weeklyBagsRed = form.extraBagsRecurring
      ? bags * form.extraBagPrice
      : 0;

    const oneTimeBagsCost = form.extraBagsRecurring
      ? 0
      : bags * form.extraBagPrice;

    // ---------- WEEKLY SERVICE (RED RATE) ----------
    // Auto-switch between Option A and B ONLY when standalone
    // When NOT standalone (part of package), always use $8/pod (Option A)
    const weeklyPodOptA_Red = pods * form.altWeeklyRatePerUnit; // 8$/wk * pods
    const weeklyPodOptB_Red =
      pods * form.weeklyRatePerUnit + form.standaloneExtraWeeklyCharge; // 3$/wk * pods + 40$/wk

    const weeklyServiceOptA_Red = weeklyPodOptA_Red + weeklyBagsRed;
    const weeklyServiceOptB_Red = weeklyPodOptB_Red + weeklyBagsRed;

    // Only compare options when standalone; otherwise always use Option A
    const usingOptA = form.isStandalone
      ? weeklyServiceOptA_Red <= weeklyServiceOptB_Red  // Auto-switch to cheaper
      : true;  // Always use Option A when not standalone

    const weeklyServiceRed = usingOptA
      ? weeklyServiceOptA_Red
      : weeklyServiceOptB_Red;

    const weeklyPodServiceRed = usingOptA
      ? weeklyPodOptA_Red
      : weeklyPodOptB_Red;

    const chosenServiceRule: SanipodServiceRuleKey = usingOptA
      ? "perPod8"
      : "perPod3Plus40";

    // Apply rate category to service portion only.
    const weeklyService = weeklyServiceRed * rateCfg.multiplier;

    // ---------- PER VISIT (SERVICE ONLY) ----------
    const perVisitService = weeklyService;
    const perVisit = perVisitService + tripPerVisit; // tripPerVisit = 0

    // ---------- INSTALL (ONE-TIME) + ONE-TIME BAGS ----------
    const installQty = form.isNewInstall ? installQtyRaw : 0;
    const calculatedInstallOnlyCost = installQty * installRate;

    // Use custom installation fee if user has manually set it, otherwise use calculated
    const installOnlyCost = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOnlyCost;

    // ✅ PARTIAL INSTALLATION LOGIC (like Foaming Drain):
    // If 11 pods total and 5 installed:
    // - servicePods = 6 (not getting installed on first visit)
    // - First visit = (5 × install) + service cost for 6 pods
    //
    // IMPORTANT: For Option B ($3/pod + $40), we can't use effective rate!
    // We must calculate: (servicePods × $3) + $40
    const servicePods = Math.max(0, pods - installQty);

    let firstVisitServiceCost = 0;
    if (servicePods > 0) {
      if (usingOptA) {
        // Option A: Simple per-pod rate
        const perPodRate = form.altWeeklyRatePerUnit;
        firstVisitServiceCost = servicePods * perPodRate * rateCfg.multiplier;
      } else {
        // Option B: (servicePods × $3) + $40 base
        const optBServiceCost = (servicePods * form.weeklyRatePerUnit) + form.standaloneExtraWeeklyCharge;
        firstVisitServiceCost = optBServiceCost * rateCfg.multiplier;
      }
    }

    const firstVisit = installOnlyCost + firstVisitServiceCost + oneTimeBagsCost;
    const installCost = installOnlyCost;

    // ---------- MONTHLY & CONTRACT ----------
    const monthlyVisits = weeksPerMonth;

    // ✅ FIXED:
    // If there is NO special first-visit cost (no install + no one-time bags),
    // first month should just be 4.33 * perVisit.
    // Only when firstVisit > 0 do we do: firstVisit + (4.33 - 1) * perVisit.
    const firstMonth =
      firstVisit > 0
        ? firstVisit +
          Math.max(monthlyVisits - 1, 0) * perVisit
        : monthlyVisits * perVisit;

    // Ongoing months (after first) – all visits are "normal".
    const ongoingMonthly = monthlyVisits * perVisit;

    // Contract months, clamped 2–36.
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
        : firstMonth +
          Math.max(contractMonths - 1, 0) * ongoingMonthly;

    return {
      perVisit,
      monthly: firstMonth,
      annual: contractTotal,
      installCost,
      chosenServiceRule,
      weeklyPodServiceRed,
      firstVisit,
      ongoingMonthly,
      contractTotal,
    };
  }, [
    form.podQuantity,
    form.extraBagsPerWeek,
    form.extraBagsRecurring,
    form.weeklyRatePerUnit,
    form.altWeeklyRatePerUnit,
    form.extraBagPrice,
    form.standaloneExtraWeeklyCharge,
    form.includeTrip,
    form.tripChargePerVisit,
    form.isNewInstall,
    form.installQuantity,
    form.installRatePerPod,
    form.customInstallationFee,
    form.frequency,
    form.rateCategory,
    form.contractMonths,
    form.isStandalone,
  ]);

  return { form, onChange, calc };
}
// src/features/services/sanipod/useSanipodCalc.ts
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { sanipodPricingConfig as cfg } from "./sanipodConfig";
import type {
  SanipodFrequencyKey,
  SanipodRateCategory,
  SanipodServiceRuleKey,
} from "./sanipodTypes";
import { serviceConfigApi } from "../../../backendservice/api";

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendSanipodConfig {
  weeklyRatePerUnit: number;
  altWeeklyRatePerUnit: number;
  extraBagPrice: number;
  installChargePerUnit: number;
  standaloneExtraWeeklyCharge: number;
  tripChargePerVisit: number;
  defaultFrequency: string;
  allowedFrequencies: string[];
  annualFrequencies: {
    weekly: number;
    biweekly: number;
    monthly: number;
  };
  frequencyMultipliers: {
    weekly: number;
    biweekly: number;
    monthly: number;
  };
  weeksPerMonth: number;
  weeksPerYear: number;
  minContractMonths: number;
  maxContractMonths: number;
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

export interface SanipodFormState {
  podQuantity: number;
  extraBagsPerWeek: number;
  /** true = recurring each visit, false = one-time only on first visit */
  extraBagsRecurring: boolean;

  // Service frequency
  frequency: SanipodFrequencyKey;

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

  /** Custom override for weekly pod service rate (for display in middle field) */
  customWeeklyPodRate?: number;

  /** Custom override for pod service total (after =) */
  customPodServiceTotal?: number;

  /** Custom override for extra bags total */
  customExtraBagsTotal?: number;

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

  /** Adjusted per visit based on custom overrides */
  adjustedPerVisit: number;

  /** Adjusted monthly based on custom overrides */
  adjustedMonthly: number;

  /** Adjusted annual based on custom overrides */
  adjustedAnnual: number;

  /** Adjusted pod service total */
  adjustedPodServiceTotal: number;

  /** Adjusted bags total */
  adjustedBagsTotal: number;

  /** Effective rate per pod */
  effectiveRatePerPod: number;
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

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendSanipodConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("sanipod");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ SaniPod config not found in backend, using default fallback values');
        return;
      }

      // ✅ Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ SaniPod document has no config property');
        return;
      }

      const config = document.config as BackendSanipodConfig;

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);

      setForm((prev) => ({
        ...prev,
        // Update all rate fields from backend if available
        weeklyRatePerUnit: config.weeklyRatePerUnit ?? prev.weeklyRatePerUnit,
        altWeeklyRatePerUnit: config.altWeeklyRatePerUnit ?? prev.altWeeklyRatePerUnit,
        extraBagPrice: config.extraBagPrice ?? prev.extraBagPrice,
        standaloneExtraWeeklyCharge: config.standaloneExtraWeeklyCharge ?? prev.standaloneExtraWeeklyCharge,
        installRatePerPod: config.installChargePerUnit ?? prev.installRatePerPod,
        tripChargePerVisit: config.tripChargePerVisit ?? prev.tripChargePerVisit,
      }));

      console.log('✅ SaniPod FULL CONFIG loaded from backend:', {
        pricing: {
          weeklyRate: config.weeklyRatePerUnit,
          altRate: config.altWeeklyRatePerUnit,
          extraBag: config.extraBagPrice,
          standaloneExtra: config.standaloneExtraWeeklyCharge,
          installRate: config.installChargePerUnit,
        },
        rateCategories: config.rateCategories,
        billingConversions: {
          weeksPerMonth: config.weeksPerMonth,
          weeksPerYear: config.weeksPerYear,
        },
        annualFrequencies: config.annualFrequencies,
        contractLimits: {
          min: config.minContractMonths,
          max: config.maxContractMonths,
        },
      });
    } catch (error) {
      console.error('❌ Failed to fetch SaniPod config from backend:', error);
      console.log('⚠️ Using default hardcoded values as fallback');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // ✅ Fetch pricing configuration on mount
  useEffect(() => {
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        name === "customAnnualPrice" ||
        name === "customWeeklyPodRate" ||
        name === "customPodServiceTotal" ||
        name === "customExtraBagsTotal"
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

      // Special handling for frequency
      if (name === "frequency") {
        next.frequency = t.value as SanipodFrequencyKey;
      }

      return next;
    });
  };

  const calc: SanipodCalcResult = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const defaultFrequencyMultipliers = {
      weekly: 4.33,
      biweekly: 2.165,
      monthly: 1.0,
    };

    const activeConfig = backendConfig || {
      weeklyRatePerUnit: cfg.weeklyRatePerUnit,
      altWeeklyRatePerUnit: cfg.altWeeklyRatePerUnit,
      extraBagPrice: cfg.extraBagPrice,
      installChargePerUnit: cfg.installChargePerUnit,
      standaloneExtraWeeklyCharge: cfg.standaloneExtraWeeklyCharge,
      tripChargePerVisit: cfg.tripChargePerVisit,
      rateCategories: cfg.rateCategories,
      frequencyMultipliers: defaultFrequencyMultipliers,
      weeksPerMonth: cfg.weeksPerMonth ?? 4.33,
      weeksPerYear: cfg.weeksPerYear ?? 52,
      minContractMonths: cfg.minContractMonths ?? 2,
      maxContractMonths: cfg.maxContractMonths ?? 36,
      annualFrequencies: cfg.annualFrequencies ?? { weekly: 52, biweekly: 26, monthly: 12 },
    };

    // Ensure frequencyMultipliers always exists
    if (!activeConfig.frequencyMultipliers) {
      activeConfig.frequencyMultipliers = defaultFrequencyMultipliers;
    }

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
        adjustedPerVisit: 0,
        adjustedMonthly: 0,
        adjustedAnnual: 0,
        adjustedPodServiceTotal: 0,
        adjustedBagsTotal: 0,
        effectiveRatePerPod: 0,
      };
    }

    // ✅ RATE CATEGORIES FROM BACKEND (NOT HARDCODED!)
    const rateCfg = activeConfig.rateCategories[form.rateCategory] ?? activeConfig.rateCategories.redRate;

    // ✅ WEEKS PER MONTH FROM BACKEND (NOT HARDCODED!)
    const weeksPerMonth = activeConfig.weeksPerMonth;

    // Trip charge concept removed from calculations.
    const tripPerVisit = 0;

    const installRate =
      form.installRatePerPod > 0
        ? form.installRatePerPod
        : activeConfig.installChargePerUnit;  // ✅ FROM BACKEND

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
        // Option A: Simple per-pod rate for service pods only
        const perPodRate = form.altWeeklyRatePerUnit;
        firstVisitServiceCost = servicePods * perPodRate * rateCfg.multiplier;
      } else {
        // Option B: (servicePods × $3) + $40 base
        const optBServiceCost = (servicePods * form.weeklyRatePerUnit) + form.standaloneExtraWeeklyCharge;
        firstVisitServiceCost = optBServiceCost * rateCfg.multiplier;
      }
    }

    // ✅ FIXED BAG LOGIC FOR FIRST VISIT:
    // Both recurring and one-time bags should be included in first visit
    // The difference is only in subsequent visits
    const firstVisitBagsCost = bags > 0 ? (bags * form.extraBagPrice * rateCfg.multiplier) : 0;

    // First visit = Install + Service (non-installed pods only) + Bags (always included)
    const firstVisit = installOnlyCost + firstVisitServiceCost + firstVisitBagsCost;
    const installCost = installOnlyCost;

    // ---------- MONTHLY & CONTRACT ----------
    // ✅ FREQUENCY-SPECIFIC CALCULATION: Use the correct multiplier based on selected frequency
    const selectedFrequency = form.frequency || "weekly";
    const monthlyVisits = activeConfig.frequencyMultipliers[selectedFrequency] || activeConfig.frequencyMultipliers.weekly;

    // ✅ FIXED BIWEEKLY CALCULATION:
    // The user's example: biweekly should use 2.165 visits per month
    // First month = install + service for remaining pods
    // Recurring months = full service × frequency multiplier

    // ✅ PARTIAL INSTALLATION FIRST MONTH CALCULATION:
    // This properly handles the partial installation logic you described
    let firstMonth;

    if (selectedFrequency === "monthly") {
      // Monthly = 1 visit per month
      firstMonth = installOnlyCost + perVisit + oneTimeBagsCost;
    } else {
      // Weekly/biweekly: Use partial installation logic
      // First month = first visit (partial service + install) + remaining visits (full service)
      firstMonth = firstVisit + Math.max(monthlyVisits - 1, 0) * perVisit;
    }

    // Ongoing months (after first) – all visits are "normal".
    const ongoingMonthly = monthlyVisits * perVisit;

    // ✅ CONTRACT MONTHS FROM BACKEND (NOT HARDCODED!)
    const minMonths = activeConfig.minContractMonths;
    const maxMonths = activeConfig.maxContractMonths;
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

    // ========== ADJUSTED CALCULATIONS BASED ON CUSTOM OVERRIDES ==========
    // Note: pods and bags already declared above

    // Effective rate per pod
    const effectiveRatePerPod = pods > 0 ? weeklyPodServiceRed / pods : 0;

    // Bag line amount
    const bagLineAmount = bags * form.extraBagPrice;

    // Adjusted pod service total (uses custom rate if set)
    const adjustedPodServiceTotal = form.customPodServiceTotal !== undefined
      ? form.customPodServiceTotal
      : (pods > 0 ? (form.customWeeklyPodRate !== undefined ? form.customWeeklyPodRate : effectiveRatePerPod) * pods : 0);

    // Adjusted bags total
    const adjustedBagsTotal = form.customExtraBagsTotal !== undefined
      ? form.customExtraBagsTotal
      : bagLineAmount;

    // Adjusted per visit (uses adjusted totals and rate multiplier)
    const adjustedPerVisit = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : (adjustedPodServiceTotal + (form.extraBagsRecurring ? adjustedBagsTotal : 0)) * rateCfg.multiplier;

    // ========== ADJUSTED FIRST VISIT WITH PARTIAL INSTALLATION ==========
    // If installing some pods, first visit = install + service for NON-installed pods only
    // Note: servicePods already declared above (line ~324)

    // Service cost for non-installed pods on first visit (with custom overrides)
    let adjustedFirstVisitServiceCost = 0;
    if (servicePods > 0 && installQty > 0) {
      // Calculate service cost for ONLY the non-installed pods
      const effectiveRateForServicePods = form.customWeeklyPodRate !== undefined
        ? form.customWeeklyPodRate
        : effectiveRatePerPod;

      if (usingOptA) {
        // Option A: servicePods × rate per pod
        adjustedFirstVisitServiceCost = servicePods * effectiveRateForServicePods * rateCfg.multiplier;
      } else {
        // Option B: (servicePods × $3) + $40
        const optBServiceCost = (servicePods * form.weeklyRatePerUnit) + form.standaloneExtraWeeklyCharge;
        adjustedFirstVisitServiceCost = optBServiceCost * rateCfg.multiplier;
      }
    }

    // Adjusted monthly
    const weeksPerMonthCalc = monthlyVisits;  // ✅ Use frequency-specific multiplier
    const oneTimeBagsCostCalc = form.extraBagsRecurring ? 0 : adjustedBagsTotal;
    const installCostCalc = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : installOnlyCost;

    // Adjusted monthly - should use the same logic as base firstMonth calculation
    const adjustedMonthly = form.customMonthlyPrice !== undefined
      ? form.customMonthlyPrice
      : selectedFrequency === "monthly"
        ? installCostCalc + adjustedPerVisit + oneTimeBagsCostCalc
        : firstVisit + Math.max(monthlyVisits - 1, 0) * adjustedPerVisit;

    // Adjusted annual
    const ongoingMonthlyCalc = weeksPerMonthCalc * adjustedPerVisit;
    const adjustedAnnual = form.customAnnualPrice !== undefined
      ? form.customAnnualPrice
      : contractMonths <= 0
        ? 0
        : adjustedMonthly + Math.max(contractMonths - 1, 0) * ongoingMonthlyCalc;

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
      adjustedPerVisit,
      adjustedMonthly,
      adjustedAnnual,
      adjustedPodServiceTotal,
      adjustedBagsTotal,
      effectiveRatePerPod,
    };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
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
    form.customWeeklyPodRate,
    form.customPodServiceTotal,
    form.customExtraBagsTotal,
    form.customPerVisitPrice,
    form.customMonthlyPrice,
    form.customAnnualPrice,
  ]);

  return {
    form,
    setForm,
    onChange,
    calc,
    refreshConfig: fetchPricing,
    isLoadingConfig,
  };
}
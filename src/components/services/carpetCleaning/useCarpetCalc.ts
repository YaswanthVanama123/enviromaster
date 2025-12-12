import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type { CarpetFormState, CarpetFrequency } from "./carpetTypes";
import {
  carpetPricingConfig as cfg,
  carpetFrequencyList,
} from "./carpetConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendCarpetConfig {
  unitSqFt: number;
  firstUnitRate: number;
  additionalUnitRate: number;
  perVisitMinimum: number;
  installMultipliers: {
    dirty: number;
    clean: number;
  };
  frequencyMeta: {
    weekly: { visitsPerYear: number };
    monthly: { visitsPerYear: number };
    twicePerMonth: { visitsPerYear: number };
    bimonthly: { visitsPerYear: number };
    quarterly: { visitsPerYear: number };
  };
}

const DEFAULT_FORM: CarpetFormState = {
  serviceId: "carpetCleaning",
  areaSqFt: 0,
  useExactSqft: true,  // Default to exact calculation
  frequency: "monthly",
  location: "insideBeltway",
  needsParking: false,
  tripChargeIncluded: true, // from BaseServiceFormState, but ignored in calc
  notes: "",
  contractMonths: 12,
  includeInstall: false,
  isDirtyInstall: false,

  // ✅ NEW: Editable pricing rates from config (will be overridden by backend)
  unitSqFt: cfg.unitSqFt,
  firstUnitRate: cfg.firstUnitRate,
  additionalUnitRate: cfg.additionalUnitRate,
  perVisitMinimum: cfg.perVisitMinimum,
  installMultiplierDirty: cfg.installMultipliers.dirty,
  installMultiplierClean: cfg.installMultipliers.clean,
};

function clampFrequency(f: string): CarpetFrequency {
  return carpetFrequencyList.includes(f as CarpetFrequency)
    ? (f as CarpetFrequency)
    : "monthly";
}

function clampContractMonths(value: unknown): number {
  const num = parseInt(String(value), 10);
  if (!Number.isFinite(num)) return 12;
  if (num < 2) return 2;
  if (num > 36) return 36;
  return num;
}

export function useCarpetCalc(initial?: Partial<CarpetFormState>) {
  const [form, setForm] = useState<CarpetFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendCarpetConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // Helper function to update form with config data
  const updateFormWithConfig = (config: BackendCarpetConfig) => {
    setForm((prev) => ({
      ...prev,
      // Update all rate fields from backend if available
      unitSqFt: config.unitSqFt ?? prev.unitSqFt,
      firstUnitRate: config.firstUnitRate ?? prev.firstUnitRate,
      additionalUnitRate: config.additionalUnitRate ?? prev.additionalUnitRate,
      perVisitMinimum: config.perVisitMinimum ?? prev.perVisitMinimum,
      installMultiplierDirty: config.installMultipliers?.dirty ?? prev.installMultiplierDirty,
      installMultiplierClean: config.installMultipliers?.clean ?? prev.installMultiplierClean,
    }));
  };

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      // First try to get active service config
      const response = await serviceConfigApi.getActive("carpetCleaning");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ Carpet Cleaning config not found in active services, trying fallback pricing...');

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("carpetCleaning");
          if (fallbackConfig?.config) {
            console.log('✅ [Carpet Cleaning] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendCarpetConfig;
            setBackendConfig(config);
            updateFormWithConfig(config);

            console.log('✅ Carpet Cleaning FALLBACK CONFIG loaded from context:', {
              unitSqFt: config.unitSqFt,
              firstUnitRate: config.firstUnitRate,
              additionalUnitRate: config.additionalUnitRate,
              perVisitMinimum: config.perVisitMinimum,
              installMultipliers: config.installMultipliers,
              frequencyMeta: config.frequencyMeta,
            });
            return;
          }
        }

        console.warn('⚠️ No backend pricing available, using static fallback values');
        return;
      }

      // ✅ Extract the actual document from response.data
      const document = response.data;

      if (!document.config) {
        console.warn('⚠️ Carpet Cleaning document has no config property');
        return;
      }

      const config = document.config as BackendCarpetConfig;

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);
      updateFormWithConfig(config);

      console.log('✅ Carpet Cleaning ACTIVE CONFIG loaded from backend:', {
        unitSqFt: config.unitSqFt,
        firstUnitRate: config.firstUnitRate,
        additionalUnitRate: config.additionalUnitRate,
        perVisitMinimum: config.perVisitMinimum,
        installMultipliers: config.installMultipliers,
        frequencyMeta: config.frequencyMeta,
      });
    } catch (error) {
      console.error('❌ Failed to fetch Carpet Cleaning config from backend:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("carpetCleaning");
        if (fallbackConfig?.config) {
          console.log('✅ [Carpet Cleaning] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendCarpetConfig;
          setBackendConfig(config);
          updateFormWithConfig(config);
          return;
        }
      }

      console.warn('⚠️ No backend pricing available after error, using static fallback values');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // ✅ Fetch pricing configuration on mount
  useEffect(() => {
    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also fetch when services context becomes available
  useEffect(() => {
    if (servicesContext?.backendPricingData && !backendConfig) {
      fetchPricing();
    }
  }, [servicesContext?.backendPricingData, backendConfig]);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {
      switch (name as keyof CarpetFormState) {
        case "areaSqFt": {
          const num = parseFloat(String(value));
          return {
            ...prev,
            areaSqFt: Number.isFinite(num) && num > 0 ? num : 0,
          };
        }

        // ✅ NEW: Handle editable rate fields
        case "unitSqFt":
        case "firstUnitRate":
        case "additionalUnitRate":
        case "perVisitMinimum":
        case "installMultiplierDirty":
        case "installMultiplierClean": {
          const num = parseFloat(String(value));
          return {
            ...prev,
            [name]: Number.isFinite(num) && num >= 0 ? num : 0,
          };
        }

        // ✅ NEW: Handle custom override fields
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customFirstMonthPrice":
        case "customContractTotal":
        case "customInstallationFee": {
          const numVal = value === '' ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            return { ...prev, [name]: numVal };
          }
          return prev;
        }

        case "frequency":
          return {
            ...prev,
            frequency: clampFrequency(String(value)),
          };

        case "contractMonths":
          return {
            ...prev,
            contractMonths: clampContractMonths(value),
          };

        case "needsParking":
        case "tripChargeIncluded":
        case "includeInstall":
        case "isDirtyInstall":
        case "useExactSqft":
          return {
            ...prev,
            [name]: type === "checkbox" ? !!checked : Boolean(value),
          };

        case "location":
          return {
            ...prev,
            location:
              value === "outsideBeltway" ? "outsideBeltway" : "insideBeltway",
          };

        case "notes":
          return {
            ...prev,
            notes: String(value ?? ""),
          };

        default:
          return prev;
      }
    });
  };

  const {
    perVisitBase,
    perVisitCharge,
    monthlyTotal,
    contractTotal,
    visitsPerYear,
    visitsPerMonth,
    perVisitTrip,
    monthlyTrip,
    installOneTime,
    firstMonthTotal,
    perVisitEffective,
    frequency,
    isVisitBasedFrequency,
    monthsPerVisit,
    totalVisitsForContract,
  } = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    // Merge backend config with local config, ensuring all frequencies are available
    const activeConfig = backendConfig ? {
      unitSqFt: backendConfig.unitSqFt ?? cfg.unitSqFt,
      firstUnitRate: backendConfig.firstUnitRate ?? cfg.firstUnitRate,
      additionalUnitRate: backendConfig.additionalUnitRate ?? cfg.additionalUnitRate,
      perVisitMinimum: backendConfig.perVisitMinimum ?? cfg.perVisitMinimum,
      installMultipliers: backendConfig.installMultipliers ?? cfg.installMultipliers,
      // ✅ CRITICAL: Merge frequencyMeta to ensure all frequencies (including weekly) are available
      frequencyMeta: {
        ...cfg.frequencyMeta, // Start with local config (includes weekly)
        ...backendConfig.frequencyMeta, // Override with backend values if they exist
      },
    } : {
      unitSqFt: cfg.unitSqFt,
      firstUnitRate: cfg.firstUnitRate,
      additionalUnitRate: cfg.additionalUnitRate,
      perVisitMinimum: cfg.perVisitMinimum,
      installMultipliers: cfg.installMultipliers,
      frequencyMeta: cfg.frequencyMeta,
    };

    const freq = clampFrequency(form.frequency);
    const meta = activeConfig.frequencyMeta[freq];  // ✅ NOW GUARANTEED to have weekly from local config
    const visitsPerYear = meta?.visitsPerYear ?? 12;
    const visitsPerMonth = visitsPerYear / 12;

    const areaSqFt = form.areaSqFt ?? 0;

    let calculatedPerVisitBase = 0;
    let calculatedPerVisitCharge = 0;

    if (areaSqFt > 0) {
      // ✅ CARPET PRICING: Two calculation methods based on useExactSqft checkbox
      if (areaSqFt <= form.unitSqFt) {  // ✅ USE FORM VALUE (from backend)
        // 500 sq ft or less: flat rate
        calculatedPerVisitBase = form.firstUnitRate;  // ✅ USE FORM VALUE
      } else {
        // Over 500 sq ft: choose calculation method
        const extraSqFt = areaSqFt - form.unitSqFt;  // ✅ USE FORM VALUE

        if (form.useExactSqft) {
          // EXACT SQFT: $250 + extra sq ft × $0.25/sq ft
          const ratePerSqFt = form.additionalUnitRate / form.unitSqFt; // ✅ USE FORM VALUES ($125/500 = $0.25)
          calculatedPerVisitBase = form.firstUnitRate + (extraSqFt * ratePerSqFt);  // ✅ USE FORM VALUE
        } else {
          // BLOCK PRICING: $250 + number of 500 sq ft blocks × $125
          const additionalBlocks = Math.ceil(extraSqFt / form.unitSqFt);
          calculatedPerVisitBase = form.firstUnitRate + (additionalBlocks * form.additionalUnitRate);  // ✅ USE FORM VALUES
        }
      }

      calculatedPerVisitCharge = Math.max(calculatedPerVisitBase, form.perVisitMinimum);  // ✅ USE FORM VALUE
    }

    // Use custom override if set, otherwise use calculated
    const perVisitBase = calculatedPerVisitBase;
    const perVisitCharge = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : calculatedPerVisitCharge;

    // Trip is disabled in math (still shown as 0.00 in UI)
    const perVisitTrip = 0;
    const monthlyTrip = 0;

    const serviceActive = areaSqFt > 0;

    // ---------------- INSTALLATION FEE ----------------
    // ✅ FIXED: Install = 3× dirty / 1× clean of MINIMUM PRICE (NOT calculated price)
    // Installation is the same for any frequency type
    // Use minimum price as base for installation fee calculation
    const installationBasePrice = Math.max(calculatedPerVisitBase, form.perVisitMinimum);
    const calculatedInstallOneTime =
      serviceActive && form.includeInstall
        ? installationBasePrice *
          (form.isDirtyInstall
            ? form.installMultiplierDirty  // ✅ USE FORM VALUE (from backend)
            : form.installMultiplierClean)  // ✅ USE FORM VALUE (from backend)
        : 0;

    // Use custom override if set, otherwise use calculated
    const installOneTime = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOneTime;

    // ---------------- RECURRING MONTHLY (normal full month) ----------------
    let calculatedMonthlyRecurring = 0;

    if (serviceActive && visitsPerMonth > 0) {
      calculatedMonthlyRecurring = perVisitCharge * visitsPerMonth;

      // ✅ FIXED: Add frequency-specific discount logic
      if (freq === "twicePerMonth") {
        // 2X/Monthly: Apply -$15 discount after calculation (like SaniScrub)
        calculatedMonthlyRecurring = Math.max(calculatedMonthlyRecurring - 15, 0);
      }
    }

    // Use custom override if set
    const monthlyRecurring = form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : calculatedMonthlyRecurring;

    // ---------------- FIRST VISIT & FIRST MONTH ----------------
    // WITH INSTALLATION:
    //   - First visit = installation only (no normal service)
    //   - First month = install-only first visit + (monthlyVisits − 1) × normal service price
    // WITHOUT INSTALLATION:
    //   - First month = normal full month (same as monthlyRecurring)

    let calculatedFirstMonthTotal = 0;

    if (serviceActive) {
      if (form.includeInstall && installOneTime > 0) {
        // With installation: install + (monthlyVisits - 1) service visits
        const monthlyVisits = visitsPerMonth;
        const firstMonthNormalVisits = monthlyVisits > 1 ? monthlyVisits - 1 : 0;
        let firstMonthServiceCharge = firstMonthNormalVisits * perVisitCharge;

        // ✅ FIXED: Apply frequency-specific discount to first month service charge (same as recurring months)
        if (freq === "twicePerMonth" && firstMonthServiceCharge > 0) {
          // Apply -$15 discount to the service portion (not the installation)
          firstMonthServiceCharge = Math.max(firstMonthServiceCharge - 15, 0);
        }

        calculatedFirstMonthTotal = installOneTime + firstMonthServiceCharge;
      } else {
        // No installation: just a normal full month
        calculatedFirstMonthTotal = monthlyRecurring;
      }
    }

    // Use custom override if set
    const firstMonthTotal = form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthTotal;

    // ---------------- CONTRACT TOTAL ----------------
    const contractMonths = clampContractMonths(form.contractMonths);

    let calculatedContractTotal = 0;
    if (contractMonths > 0) {
      // ✅ FIXED: Use frequency-specific calculation logic
      if (freq === "bimonthly" || freq === "quarterly") {
        // For bi-monthly and quarterly: calculate based on actual visits
        const monthsPerVisit = freq === "bimonthly" ? 2 : 3; // Every 2 months or every 3 months
        const totalVisits = Math.floor(contractMonths / monthsPerVisit);

        if (totalVisits > 0) {
          if (form.includeInstall && installOneTime > 0) {
            // With installation: first visit (install + service) + remaining visits (service only)
            const remainingVisits = Math.max(totalVisits - 1, 0);
            calculatedContractTotal = firstMonthTotal + (remainingVisits * perVisitCharge);
          } else {
            // No installation: just total visits × per-visit charge
            calculatedContractTotal = totalVisits * perVisitCharge;
          }
        }
      } else {
        // For monthly and 2X/monthly: use month-based calculation
        if (form.includeInstall && installOneTime > 0) {
          // With installation: first month (special) + remaining months normal
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyRecurring);
        } else {
          // No installation: just contractMonths × normal monthly
          calculatedContractTotal = contractMonths * monthlyRecurring;
        }
      }
    }

    // Use custom override if set
    const contractTotal = form.customContractTotal !== undefined
      ? form.customContractTotal
      : calculatedContractTotal;

    // Per-Visit Effective = normal per-visit service price (no install, no trip)
    const perVisitEffective = perVisitCharge;

    // ✅ NEW: Add frequency-specific helper values for UI
    const isVisitBasedFrequency = freq === "bimonthly" || freq === "quarterly";
    const monthsPerVisit = freq === "bimonthly" ? 2 : freq === "quarterly" ? 3 : 1;
    const totalVisitsForContract = isVisitBasedFrequency
      ? Math.floor(contractMonths / monthsPerVisit)
      : contractMonths; // For monthly/2X monthly, visits = months

    return {
      perVisitBase,
      perVisitCharge,
      monthlyTotal: monthlyRecurring,
      contractTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitTrip,
      monthlyTrip,
      installOneTime,
      firstMonthTotal,
      perVisitEffective,
      // ✅ NEW: Frequency-specific UI helpers
      frequency: freq,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
    };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form.areaSqFt,
    form.useExactSqft,  // ✅ NEW: Re-calculate when pricing method changes
    form.frequency,
    form.contractMonths,
    form.includeInstall,
    form.isDirtyInstall,
    // ✅ NEW: Editable rate fields (from backend)
    form.unitSqFt,
    form.firstUnitRate,
    form.additionalUnitRate,
    form.perVisitMinimum,
    form.installMultiplierDirty,
    form.installMultiplierClean,
    // ✅ NEW: Custom override fields
    form.customPerVisitPrice,
    form.customMonthlyRecurring,
    form.customFirstMonthPrice,
    form.customContractTotal,
    form.customInstallationFee,
  ]);

  const quote: ServiceQuoteResult = useMemo(
    () => ({
      serviceId: form.serviceId,
      perVisit: perVisitEffective,
      monthly: monthlyTotal,
      // re-using `annual` as "contract total" like we did on SaniScrub
      annual: contractTotal,
    }),
    [form.serviceId, perVisitEffective, monthlyTotal, contractTotal]
  );

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: {
      perVisitBase,
      perVisitCharge,
      monthlyTotal,
      contractTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitTrip,
      monthlyTrip,
      installOneTime,
      firstMonthTotal,
      perVisitEffective,
      // ✅ NEW: Frequency-specific UI helpers
      frequency,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
    },
    refreshConfig: fetchPricing,
    isLoadingConfig,
  };
}
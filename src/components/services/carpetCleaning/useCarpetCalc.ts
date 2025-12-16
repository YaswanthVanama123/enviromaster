import { useEffect, useMemo, useState, useCallback } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type { CarpetFormState, CarpetFrequency } from "./carpetTypes";
import {
  carpetPricingConfig as cfg,
  carpetFrequencyList,
} from "./carpetConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";

// ✅ Backend config interface matching the ACTUAL MongoDB JSON structure
interface BackendCarpetConfig {
  baseSqFtUnit: number;
  basePrice: number;
  additionalSqFtUnit: number;
  additionalUnitPrice: number;
  minimumChargePerVisit: number;
  installationMultipliers: {
    dirtyInstallMultiplier: number;
    cleanInstallMultiplier: number;
  };
  frequencyMetadata: {
    weekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    biweekly?: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    monthly?: { cycleMonths: number };
    bimonthly?: { cycleMonths: number };
    quarterly?: { cycleMonths: number };
    biannual?: { cycleMonths: number };
    annual?: { cycleMonths: number };
  };
  minContractMonths: number;
  maxContractMonths: number;
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
      // ✅ Map backend config properties to form properties
      unitSqFt: config.baseSqFtUnit ?? prev.unitSqFt,
      firstUnitRate: config.basePrice ?? prev.firstUnitRate,
      additionalUnitRate: config.additionalUnitPrice ?? prev.additionalUnitRate,
      perVisitMinimum: config.minimumChargePerVisit ?? prev.perVisitMinimum,
      installMultiplierDirty: config.installationMultipliers?.dirtyInstallMultiplier ?? prev.installMultiplierDirty,
      installMultiplierClean: config.installationMultipliers?.cleanInstallMultiplier ?? prev.installMultiplierClean,
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

            // ✅ FIXED: Clear all custom overrides when refresh button clicked
            setForm(prev => ({
              ...prev,
              customFirstUnitRate: undefined,
              customAdditionalUnitRate: undefined,
              customPerVisitMinimum: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthPrice: undefined,
              customContractTotal: undefined,
              customInstallationFee: undefined,
            }));

            console.log('✅ Carpet Cleaning FALLBACK CONFIG loaded from context:', {
              baseSqFtUnit: config.baseSqFtUnit,
              basePrice: config.basePrice,
              additionalUnitPrice: config.additionalUnitPrice,
              minimumChargePerVisit: config.minimumChargePerVisit,
              installationMultipliers: config.installationMultipliers,
              frequencyMetadata: config.frequencyMetadata,
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

      // ✅ FIXED: Clear all custom overrides when refresh button clicked
      setForm(prev => ({
        ...prev,
        customFirstUnitRate: undefined,
        customAdditionalUnitRate: undefined,
        customPerVisitMinimum: undefined,
        customPerVisitPrice: undefined,
        customMonthlyRecurring: undefined,
        customFirstMonthPrice: undefined,
        customContractTotal: undefined,
        customInstallationFee: undefined,
      }));

      console.log('✅ Carpet Cleaning ACTIVE CONFIG loaded from backend:', {
        baseSqFtUnit: config.baseSqFtUnit,
        basePrice: config.basePrice,
        additionalUnitPrice: config.additionalUnitPrice,
        minimumChargePerVisit: config.minimumChargePerVisit,
        installationMultipliers: config.installationMultipliers,
        frequencyMetadata: config.frequencyMetadata,
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

          // ✅ FIXED: Clear all custom overrides when refresh button clicked
          setForm(prev => ({
            ...prev,
            customFirstUnitRate: undefined,
            customAdditionalUnitRate: undefined,
            customPerVisitMinimum: undefined,
            customPerVisitPrice: undefined,
            customMonthlyRecurring: undefined,
            customFirstMonthPrice: undefined,
            customContractTotal: undefined,
            customInstallationFee: undefined,
          }));

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

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
  const addServiceFieldChange = useCallback((
    fieldName: string,
    originalValue: number,
    newValue: number
  ) => {
    addPriceChange({
      productKey: `carpetCleaning_${fieldName}`,
      productName: `Carpet Cleaning - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.sqFt || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [CARPET-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.sqFt, form.frequency]);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[name as keyof CarpetFormState];

      let newFormState = prev;

      switch (name as keyof CarpetFormState) {
        case "areaSqFt": {
          const num = parseFloat(String(value));
          const newValue = Number.isFinite(num) && num > 0 ? num : 0;
          newFormState = {
            ...prev,
            areaSqFt: newValue,
          };
          break;
        }

        // ✅ NEW: Handle editable rate fields
        case "unitSqFt":
        case "firstUnitRate":
        case "additionalUnitRate":
        case "perVisitMinimum":
        case "installMultiplierDirty":
        case "installMultiplierClean": {
          const num = parseFloat(String(value));
          newFormState = {
            ...prev,
            [name]: Number.isFinite(num) && num >= 0 ? num : 0,
          };
          break;
        }

        // ✅ NEW: Handle custom override fields for rates
        case "customFirstUnitRate":
        case "customAdditionalUnitRate":
        case "customPerVisitMinimum":
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customFirstMonthPrice":
        case "customContractTotal":
        case "customInstallationFee": {
          const numVal = value === '' ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            newFormState = { ...prev, [name]: numVal };
          } else {
            newFormState = prev;
          }
          break;
        }

        case "frequency":
          newFormState = {
            ...prev,
            frequency: clampFrequency(String(value)),
          };
          break;

        case "contractMonths":
          newFormState = {
            ...prev,
            contractMonths: clampContractMonths(value),
          };
          break;

        case "needsParking":
        case "tripChargeIncluded":
        case "includeInstall":
        case "isDirtyInstall":
        case "useExactSqft":
          newFormState = {
            ...prev,
            [name]: type === "checkbox" ? !!checked : Boolean(value),
          };
          break;

        case "location":
          newFormState = {
            ...prev,
            location:
              value === "outsideBeltway" ? "outsideBeltway" : "insideBeltway",
          };
          break;

        case "notes":
          newFormState = {
            ...prev,
            notes: String(value ?? ""),
          };
          break;

        default:
          newFormState = prev;
          break;
      }

      // ✅ Log price override for numeric pricing fields
      const pricingFields = [
        'unitSqFt', 'firstUnitRate', 'additionalUnitRate', 'perVisitMinimum',
        'installMultiplierDirty', 'installMultiplierClean',
        'customFirstUnitRate', 'customAdditionalUnitRate', 'customPerVisitMinimum',
        'customPerVisitPrice', 'customMonthlyRecurring', 'customFirstMonthPrice',
        'customContractTotal', 'customInstallationFee'
      ];

      if (pricingFields.includes(name)) {
        const newValue = newFormState[name as keyof CarpetFormState] as number | undefined;
        const oldValue = originalValue as number | undefined;

        // Handle undefined values (when cleared) - don't log clearing to undefined
        if (newValue !== undefined && oldValue !== undefined &&
            typeof newValue === 'number' && typeof oldValue === 'number' &&
            newValue !== oldValue && newValue > 0) {
          addServiceFieldChange(name, oldValue, newValue);
        }
      }

      return newFormState;
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
    // Map backend config to our expected format, ensuring all frequencies are available
    const baseConfig = backendConfig ? {
      unitSqFt: backendConfig.baseSqFtUnit ?? cfg.unitSqFt,
      firstUnitRate: backendConfig.basePrice ?? cfg.firstUnitRate,
      additionalUnitRate: backendConfig.additionalUnitPrice ?? cfg.additionalUnitRate,
      perVisitMinimum: backendConfig.minimumChargePerVisit ?? cfg.perVisitMinimum,
      installMultipliers: {
        dirty: backendConfig.installationMultipliers?.dirtyInstallMultiplier ?? cfg.installMultipliers.dirty,
        clean: backendConfig.installationMultipliers?.cleanInstallMultiplier ?? cfg.installMultipliers.clean,
      },
      // ✅ CRITICAL: Use local config for frequencyMeta since backend has different structure
      frequencyMeta: cfg.frequencyMeta,
    } : {
      unitSqFt: cfg.unitSqFt,
      firstUnitRate: cfg.firstUnitRate,
      additionalUnitRate: cfg.additionalUnitRate,
      perVisitMinimum: cfg.perVisitMinimum,
      installMultipliers: cfg.installMultipliers,
      frequencyMeta: cfg.frequencyMeta,
    };

    // ✅ Apply user overrides to base config (including installation multipliers)
    const activeConfig = {
      unitSqFt: baseConfig.unitSqFt,
      firstUnitRate: form.customFirstUnitRate ?? form.firstUnitRate ?? baseConfig.firstUnitRate,
      additionalUnitRate: form.customAdditionalUnitRate ?? form.additionalUnitRate ?? baseConfig.additionalUnitRate,
      perVisitMinimum: form.customPerVisitMinimum ?? form.perVisitMinimum ?? baseConfig.perVisitMinimum,
      installMultipliers: {
        // ✅ FIXED: Use editable multipliers from form (from backend)
        dirty: form.installMultiplierDirty ?? baseConfig.installMultipliers.dirty,
        clean: form.installMultiplierClean ?? baseConfig.installMultipliers.clean,
      },
      frequencyMeta: baseConfig.frequencyMeta,
    };

    const freq = clampFrequency(form.frequency);

    // ✅ Get billing conversion for current frequency from active config (backend if available)
    const conv = activeConfig.frequencyMeta[freq] || cfg.billingConversions[freq];
    const monthlyVisits = conv?.monthlyMultiplier || cfg.billingConversions[freq]?.monthlyMultiplier || 1;
    const visitsPerYear = conv?.visitsPerYear || cfg.billingConversions[freq]?.annualMultiplier || 1;
    const visitsPerMonth = visitsPerYear / 12;

    // ✅ Detect visit-based frequencies (oneTime, quarterly, biannual, annual, bimonthly)
    const isVisitBasedFrequency = freq === "oneTime" ||
                                   freq === "quarterly" ||
                                   freq === "biannual" ||
                                   freq === "annual" ||
                                   freq === "bimonthly";

    const areaSqFt = form.areaSqFt ?? 0;

    let calculatedPerVisitBase = 0;
    let calculatedPerVisitCharge = 0;

    if (areaSqFt > 0) {
      // ✅ CARPET PRICING: Two calculation methods based on useExactSqft checkbox
      if (areaSqFt <= activeConfig.unitSqFt) {
        // 500 sq ft or less: flat rate
        calculatedPerVisitBase = activeConfig.firstUnitRate;
      } else {
        // Over 500 sq ft: choose calculation method
        const extraSqFt = areaSqFt - activeConfig.unitSqFt;

        if (form.useExactSqft) {
          // EXACT SQFT: extra sq ft × rate per sq ft
          const ratePerSqFt = activeConfig.additionalUnitRate / activeConfig.unitSqFt;
          calculatedPerVisitBase = activeConfig.firstUnitRate + (extraSqFt * ratePerSqFt);
        } else {
          // BLOCK PRICING: number of additional 500 sq ft blocks × rate
          const additionalBlocks = Math.ceil(extraSqFt / activeConfig.unitSqFt);
          calculatedPerVisitBase = activeConfig.firstUnitRate + (additionalBlocks * activeConfig.additionalUnitRate);
        }
      }

      calculatedPerVisitCharge = Math.max(calculatedPerVisitBase, activeConfig.perVisitMinimum);
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
    const installationBasePrice = Math.max(calculatedPerVisitBase, activeConfig.perVisitMinimum);
    const calculatedInstallOneTime =
      serviceActive && form.includeInstall
        ? installationBasePrice *
          (form.isDirtyInstall
            ? activeConfig.installMultipliers.dirty
            : activeConfig.installMultipliers.clean)
        : 0;

    // Use custom override if set, otherwise use calculated
    const installOneTime = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOneTime;

    // ---------------- RECURRING MONTHLY (normal full month) ----------------
    let calculatedMonthlyRecurring = 0;

    if (serviceActive) {
      if (freq === "oneTime") {
        // One-time service: just the per-visit price
        calculatedMonthlyRecurring = perVisitCharge;
      } else if (isVisitBasedFrequency) {
        // Visit-based frequencies: monthly price = per-visit × monthly multiplier
        calculatedMonthlyRecurring = monthlyVisits * perVisitCharge;
      } else if (monthlyVisits > 0) {
        // Month-based frequencies: monthly price = per-visit × monthly multiplier
        calculatedMonthlyRecurring = perVisitCharge * monthlyVisits;
      }
    }

    // Use custom override if set
    const monthlyRecurring = form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : calculatedMonthlyRecurring;

    // ---------------- FIRST VISIT & FIRST MONTH - NEW INSTALLATION-BASED RULES ----------------
    let calculatedFirstMonthTotal = 0;

    if (serviceActive) {
      if (freq === "oneTime") {
        // One-Time: Installation Cost only if included, otherwise Service Cost × 1
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only
        } else {
          calculatedFirstMonthTotal = perVisitCharge; // Service cost × 1
        }
      } else if (freq === "weekly") {
        // Weekly: First month = Installation + (monthlyVisits - 1) × Service Cost
        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; // e.g., 4.33 - 1 = 3.33 remaining visits
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * perVisitCharge);
        } else {
          calculatedFirstMonthTotal = monthlyVisits * perVisitCharge;
        }
      } else if (freq === "biweekly") {
        // Bi-Weekly: First month = Installation + (monthlyVisits - 1) × Service Cost
        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; // e.g., 2.165 - 1 = 1.165 remaining visits
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * perVisitCharge);
        } else {
          calculatedFirstMonthTotal = monthlyVisits * perVisitCharge;
        }
      } else if (freq === "monthly") {
        // Monthly: First month = Installation only (no service)
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only
        } else {
          calculatedFirstMonthTotal = perVisitCharge; // Service cost
        }
      } else if (freq === "bimonthly") {
        // Bi-Monthly: First visit = Installation only (every 2 months = 1 visit per 2-month period)
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only for first visit
        } else {
          calculatedFirstMonthTotal = perVisitCharge;
        }
      } else if (freq === "quarterly") {
        // Quarterly: First visit = Installation only (4 visits per year)
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only for first visit
        } else {
          calculatedFirstMonthTotal = perVisitCharge;
        }
      } else if (freq === "biannual") {
        // Bi-Annual: First service = Installation only
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only
        } else {
          calculatedFirstMonthTotal = perVisitCharge;
        }
      } else if (freq === "annual") {
        // Annual: Installation only if included, otherwise service cost
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only
        } else {
          calculatedFirstMonthTotal = perVisitCharge;
        }
      } else if (freq === "twicePerMonth") {
        // 2×/month: Use backend monthlyVisits multiplier
        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; // e.g., 2 - 1 = 1 remaining visit
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * perVisitCharge);
        } else {
          calculatedFirstMonthTotal = monthlyVisits * perVisitCharge;
        }
      }
    }

    // Use custom override if set
    const firstMonthTotal = form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthTotal;

    // ---------------- CONTRACT TOTAL - NEW INSTALLATION-BASED RULES ----------------
    const contractMonths = clampContractMonths(form.contractMonths);

    let calculatedContractTotal = 0;
    let monthsPerVisit = 1;
    let totalVisitsForContract = 0;

    if (contractMonths > 0 && serviceActive) {
      if (freq === "oneTime") {
        // One-time service: just the first visit total
        calculatedContractTotal = firstMonthTotal;
        totalVisitsForContract = 1;
      } else if (freq === "weekly") {
        // Weekly: Use backend monthlyVisits multiplier
        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {
          // First month: installation + remaining visits × service
          // Remaining months: monthlyVisits × service each
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyVisits * perVisitCharge);
        } else {
          // No installation: all months monthlyVisits × service
          calculatedContractTotal = contractMonths * monthlyVisits * perVisitCharge;
        }
      } else if (freq === "biweekly") {
        // Bi-Weekly: Use backend monthlyVisits multiplier
        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {
          // First month: installation + remaining visits × service
          // Remaining months: monthlyVisits × service each
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyVisits * perVisitCharge);
        } else {
          // No installation: all months monthlyVisits × service
          calculatedContractTotal = contractMonths * monthlyVisits * perVisitCharge;
        }
      } else if (freq === "monthly") {
        // Monthly: 1 visit per month
        totalVisitsForContract = contractMonths;

        if (form.includeInstall && installOneTime > 0) {
          // First month: installation only
          // From second month onward: 1 × service each month
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * perVisitCharge);
        } else {
          // No installation: all months 1 × service
          calculatedContractTotal = contractMonths * perVisitCharge;
        }
      } else if (freq === "bimonthly") {
        // Bi-Monthly: 6 visits in 12 months (1 visit every 2 months)
        const totalVisits = Math.round(contractMonths / 2);
        totalVisitsForContract = totalVisits;

        if (form.includeInstall && installOneTime > 0) {
          // First visit: installation only, remaining visits: service cost
          const remainingVisits = Math.max(totalVisits - 1, 0); // 5 remaining visits for 12-month contract
          calculatedContractTotal = installOneTime + (remainingVisits * perVisitCharge);
        } else {
          // No installation: all visits are service cost
          calculatedContractTotal = totalVisits * perVisitCharge;
        }
      } else if (freq === "quarterly") {
        // Quarterly: 4 visits in 12 months (1 visit every 3 months)
        const totalVisits = Math.round(contractMonths / 3);
        totalVisitsForContract = totalVisits;

        if (form.includeInstall && installOneTime > 0) {
          // First visit: installation only, remaining visits: service cost
          const remainingVisits = Math.max(totalVisits - 1, 0); // 3 remaining visits for 12-month contract
          calculatedContractTotal = installOneTime + (remainingVisits * perVisitCharge);
        } else {
          // No installation: all visits are service cost
          calculatedContractTotal = totalVisits * perVisitCharge;
        }
      } else if (freq === "biannual") {
        // Bi-Annual: 2 services per year
        const totalServices = Math.round((contractMonths / 12) * 2);
        totalVisitsForContract = totalServices;

        if (form.includeInstall && installOneTime > 0) {
          // First service: installation, second service: normal service
          const remainingServices = Math.max(totalServices - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingServices * perVisitCharge);
        } else {
          // No installation: all services normal
          calculatedContractTotal = totalServices * perVisitCharge;
        }
      } else if (freq === "annual") {
        // Annual: 1 service per year
        const totalServices = Math.round(contractMonths / 12);
        totalVisitsForContract = totalServices;

        if (form.includeInstall && installOneTime > 0) {
          // If installation included, total = installation only (per rule)
          calculatedContractTotal = installOneTime;
        } else {
          // No installation: service cost
          calculatedContractTotal = totalServices * perVisitCharge;
        }
      } else if (freq === "twicePerMonth") {
        // 2×/month: Use backend monthlyVisits multiplier
        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {
          // First month: installation + remaining visits × service
          // Remaining months: monthlyVisits × service each
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyVisits * perVisitCharge);
        } else {
          // No installation: all months monthlyVisits × service
          calculatedContractTotal = contractMonths * monthlyVisits * perVisitCharge;
        }
      }
    }

    // Use custom override if set
    const contractTotal = form.customContractTotal !== undefined
      ? form.customContractTotal
      : calculatedContractTotal;

    // Per-Visit Effective = normal per-visit service price (no install, no trip)
    const perVisitEffective = perVisitCharge;

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
    form.useExactSqft,  // ✅ Re-calculate when pricing method changes
    form.frequency,
    form.contractMonths,
    form.includeInstall,
    form.isDirtyInstall,
    // ✅ FIXED: Watch editable rate fields from backend
    form.firstUnitRate,
    form.additionalUnitRate,
    form.perVisitMinimum,
    form.installMultiplierDirty,
    form.installMultiplierClean,
    // ✅ FIXED: Watch custom override fields for rates
    form.customFirstUnitRate,
    form.customAdditionalUnitRate,
    form.customPerVisitMinimum,
    // ✅ FIXED: Watch custom override fields for totals
    form.customPerVisitPrice,
    form.customMonthlyRecurring,
    form.customFirstMonthPrice,
    form.customContractTotal,
    form.customInstallationFee,
  ]);

  const quote: ServiceQuoteResult = useMemo(
    () => {
      const result = {
        serviceId: form.serviceId,
        perVisit: perVisitEffective,
        monthly: monthlyTotal,
        annual: contractTotal,
      };
      return result;
    },
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
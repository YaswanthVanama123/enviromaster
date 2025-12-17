import { useEffect, useMemo, useState, useCallback } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type { SaniscrubFormState, SaniscrubFrequency } from "./saniscrubTypes";
import {
  saniscrubPricingConfig as cfg,
  saniscrubFrequencyList,
} from "./saniscrubConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";

// ✅ Backend config interface matching the ACTUAL MongoDB JSON structure
interface BackendSaniscrubConfig {
  tripCharges: {
    standard: number;
    beltway: number;
  };
  parkingFeeAddOn: number;
  monthlyPricing: {
    pricePerFixture: number;
    minimumPrice: number;
  };
  bimonthlyPricing: {
    pricePerFixture: number;
    minimumPrice: number;
  };
  quarterlyPricing: {
    pricePerFixture: number;
    minimumPrice: number;
  };
  twicePerMonthPricing: {
    discountFromMonthlyRate: number;
  };
  nonBathroomSqFtPricingRule: {
    sqFtBlockUnit: number;
    priceFirstBlock: number;
    priceAdditionalBlock: number;
  };
  installationPricing: {
    installMultiplierDirtyOrFirstTime: number;
    allowInstallFeeWaiver: boolean;
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
}

const DEFAULT_FORM: SaniscrubFormState = {
  serviceId: "saniscrub",
  fixtureCount: 0,
  nonBathroomSqFt: 0,
  useExactNonBathroomSqft: true, // ✅ Default to exact calculation
  frequency: "monthly",
  hasSaniClean: true,
  location: "insideBeltway",
  needsParking: false,
  tripChargeIncluded: true, // still in BaseServiceFormState, but ignored now
  includeInstall: false,
  isDirtyInstall: false,
  notes: "",
  contractMonths: 12, // default contract term

  // ✅ NEW: Editable pricing rates from config (will be overridden by backend)
  fixtureRateMonthly: cfg.fixtureRates.monthly,
  fixtureRateBimonthly: cfg.fixtureRates.bimonthly,
  fixtureRateQuarterly: cfg.fixtureRates.quarterly,
  minimumMonthly: cfg.minimums.monthly,
  minimumBimonthly: cfg.minimums.bimonthly,
  nonBathroomFirstUnitRate: cfg.nonBathroomFirstUnitRate,
  nonBathroomAdditionalUnitRate: cfg.nonBathroomAdditionalUnitRate,
  installMultiplierDirty: cfg.installMultipliers.dirty,
  installMultiplierClean: cfg.installMultipliers.clean,
  twoTimesPerMonthDiscount: cfg.twoTimesPerMonthDiscountFlat,
};

function clampFrequency(f: string): SaniscrubFrequency {
  return saniscrubFrequencyList.includes(f as SaniscrubFrequency)
    ? (f as SaniscrubFrequency)
    : "monthly";
}

function clampContractMonths(value: unknown): number {
  const num = parseInt(String(value), 10);
  if (!Number.isFinite(num)) return 12;
  if (num < 2) return 2;
  if (num > 36) return 36;
  return num;
}

export function useSaniscrubCalc(initial?: Partial<SaniscrubFormState>) {
  const [form, setForm] = useState<SaniscrubFormState>({
    ...DEFAULT_FORM,
    ...initial,
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendSaniscrubConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // Helper function to update form with config data from the actual backend structure
  const updateFormWithConfig = (config: BackendSaniscrubConfig) => {
    setForm((prev) => ({
      ...prev,
      // ✅ Extract from nested backend structure
      fixtureRateMonthly: config.monthlyPricing?.pricePerFixture ?? prev.fixtureRateMonthly,
      fixtureRateBimonthly: config.bimonthlyPricing?.pricePerFixture ?? prev.fixtureRateBimonthly,
      fixtureRateQuarterly: config.quarterlyPricing?.pricePerFixture ?? prev.fixtureRateQuarterly,
      minimumMonthly: config.monthlyPricing?.minimumPrice ?? prev.minimumMonthly,
      minimumBimonthly: config.bimonthlyPricing?.minimumPrice ?? prev.minimumBimonthly,
      nonBathroomFirstUnitRate: config.nonBathroomSqFtPricingRule?.priceFirstBlock ?? prev.nonBathroomFirstUnitRate,
      nonBathroomAdditionalUnitRate: config.nonBathroomSqFtPricingRule?.priceAdditionalBlock ?? prev.nonBathroomAdditionalUnitRate,
      installMultiplierDirty: config.installationPricing?.installMultiplierDirtyOrFirstTime ?? prev.installMultiplierDirty,
      installMultiplierClean: 1, // Clean install is always 1x (not in backend, hardcoded)
      twoTimesPerMonthDiscount: config.twicePerMonthPricing?.discountFromMonthlyRate ?? prev.twoTimesPerMonthDiscount,
    }));
  };

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      // First try to get active service config
      const response = await serviceConfigApi.getActive("saniscrub");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ SaniScrub config not found in active services, trying fallback pricing...');

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("saniscrub");
          if (fallbackConfig?.config) {
            console.log('✅ [SaniScrub] Using backend pricing data from context for inactive service');
            const config = fallbackConfig.config as BackendSaniscrubConfig;
            setBackendConfig(config);
            updateFormWithConfig(config);

            // ✅ Clear all custom overrides when refreshing config
            setForm(prev => ({
              ...prev,
              customInstallationFee: undefined,
              customPerVisitPrice: undefined,
              customMonthlyRecurring: undefined,
              customFirstMonthPrice: undefined,
              customContractTotal: undefined,
            }));

            console.log('✅ SaniScrub FALLBACK CONFIG loaded from context:', {
              monthlyPricing: config.monthlyPricing,
              bimonthlyPricing: config.bimonthlyPricing,
              quarterlyPricing: config.quarterlyPricing,
              twicePerMonthPricing: config.twicePerMonthPricing,
              nonBathroomSqFtPricingRule: config.nonBathroomSqFtPricingRule,
              installationPricing: config.installationPricing,
              tripCharges: config.tripCharges,
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
        console.warn('⚠️ SaniScrub document has no config property');
        return;
      }

      const config = document.config as BackendSaniscrubConfig;

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);
      updateFormWithConfig(config);

      // ✅ Clear all custom overrides when refreshing config
      setForm(prev => ({
        ...prev,
        customInstallationFee: undefined,
        customPerVisitPrice: undefined,
        customMonthlyRecurring: undefined,
        customFirstMonthPrice: undefined,
        customContractTotal: undefined,
      }));

      console.log('✅ SaniScrub ACTIVE CONFIG loaded from backend:', {
        monthlyPricing: config.monthlyPricing,
        bimonthlyPricing: config.bimonthlyPricing,
        quarterlyPricing: config.quarterlyPricing,
        twicePerMonthPricing: config.twicePerMonthPricing,
        nonBathroomSqFtPricingRule: config.nonBathroomSqFtPricingRule,
        installationPricing: config.installationPricing,
        tripCharges: config.tripCharges,
        frequencyMetadata: config.frequencyMetadata,
      });
    } catch (error) {
      console.error('❌ Failed to fetch SaniScrub config from backend:', error);

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("saniscrub");
        if (fallbackConfig?.config) {
          console.log('✅ [SaniScrub] Using backend pricing data from context after error');
          const config = fallbackConfig.config as BackendSaniscrubConfig;
          setBackendConfig(config);
          updateFormWithConfig(config);

          // ✅ Clear all custom overrides when refreshing config
          setForm(prev => ({
            ...prev,
            customInstallationFee: undefined,
            customPerVisitPrice: undefined,
            customMonthlyRecurring: undefined,
            customFirstMonthPrice: undefined,
            customContractTotal: undefined,
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
      productKey: `saniscrub_${fieldName}`,
      productName: `SaniScrub - ${getFieldDisplayName(fieldName)}`,
      productType: 'service',
      fieldType: fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      originalValue,
      newValue,
      quantity: form.bathroomCount || 1,
      frequency: form.frequency || ''
    });

    console.log(`📝 [SANISCRUB-FILE-LOGGER] Added change for ${fieldName}:`, {
      from: originalValue,
      to: newValue,
      change: newValue - originalValue,
      changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
    });
  }, [form.bathroomCount, form.frequency]);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    setForm((prev) => {
      // ✅ Capture original value before update for price override logging
      const originalValue = prev[name as keyof SaniscrubFormState];

      let newFormState = prev;

      switch (name as keyof SaniscrubFormState) {
        case "fixtureCount":
        case "nonBathroomSqFt": {
          const num = parseFloat(String(value));
          newFormState = {
            ...prev,
            [name]: Number.isFinite(num) && num > 0 ? num : 0,
          };
          break;
        }

        // ✅ NEW: Handle editable rate fields
        case "fixtureRateMonthly":
        case "fixtureRateBimonthly":
        case "fixtureRateQuarterly":
        case "minimumMonthly":
        case "minimumBimonthly":
        case "nonBathroomFirstUnitRate":
        case "nonBathroomAdditionalUnitRate":
        case "installMultiplierDirty":
        case "installMultiplierClean":
        case "twoTimesPerMonthDiscount": {
          const num = parseFloat(String(value));
          newFormState = {
            ...prev,
            [name]: Number.isFinite(num) && num >= 0 ? num : 0,
          };
          break;
        }

        // ✅ NEW: Handle custom installation fee
        case "customInstallationFee": {
          const numVal = value === '' ? undefined : parseFloat(value);
          if (numVal === undefined || !isNaN(numVal)) {
            newFormState = { ...prev, customInstallationFee: numVal };
          } else {
            newFormState = prev;
          }
          break;
        }

        // ✅ NEW: Handle custom override fields for totals
        case "customPerVisitPrice":
        case "customMonthlyRecurring":
        case "customFirstMonthPrice":
        case "customContractTotal": {
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

        case "hasSaniClean":
        case "needsParking":
        case "tripChargeIncluded":
        case "includeInstall":
        case "isDirtyInstall":
        case "useExactNonBathroomSqft":
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

      // ✅ AUTO-CLEAR CUSTOM OVERRIDES when base inputs change
      // If user changes a base input (like fixture count, frequency), clear related custom totals
      if (
        name === 'fixtureCount' ||
        name === 'nonBathroomSqFt' ||
        name === 'frequency' ||
        name === 'hasSaniClean' ||
        name === 'includeInstall' ||
        name === 'isDirtyInstall' ||
        name === 'contractMonths' ||
        name === 'useExactNonBathroomSqft'
      ) {
        // Clear all custom overrides when base inputs change
        newFormState.customInstallationFee = undefined;
        newFormState.customPerVisitPrice = undefined;
        newFormState.customMonthlyRecurring = undefined;
        newFormState.customFirstMonthPrice = undefined;
        newFormState.customContractTotal = undefined;
      }

      // Also clear custom overrides when pricing rates change
      if (
        name === 'fixtureRateMonthly' ||
        name === 'fixtureRateBimonthly' ||
        name === 'fixtureRateQuarterly' ||
        name === 'minimumMonthly' ||
        name === 'minimumBimonthly' ||
        name === 'nonBathroomFirstUnitRate' ||
        name === 'nonBathroomAdditionalUnitRate' ||
        name === 'installMultiplierDirty' ||
        name === 'installMultiplierClean' ||
        name === 'twoTimesPerMonthDiscount'
      ) {
        // Clear custom overrides when rates change
        newFormState.customInstallationFee = undefined;
        newFormState.customPerVisitPrice = undefined;
        newFormState.customMonthlyRecurring = undefined;
        newFormState.customFirstMonthPrice = undefined;
        newFormState.customContractTotal = undefined;
      }

      // ✅ Log price override for numeric pricing fields
      const pricingFields = [
        'fixtureRateMonthly', 'fixtureRateBimonthly', 'fixtureRateQuarterly',
        'minimumMonthly', 'minimumBimonthly', 'nonBathroomFirstUnitRate',
        'nonBathroomAdditionalUnitRate', 'installMultiplierDirty', 'installMultiplierClean',
        'twoTimesPerMonthDiscount', 'customInstallationFee', 'customPerVisitPrice',
        'customMonthlyRecurring', 'customFirstMonthPrice', 'customContractTotal'
      ];

      if (pricingFields.includes(name)) {
        const newValue = newFormState[name as keyof SaniscrubFormState] as number | undefined;
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
    fixtureMonthly,
    fixtureBaseAmount, // ✅ ADD: Destructure the new fixtureBaseAmount
    fixturePerVisit,
    nonBathroomPerVisit,
    nonBathroomMonthly,
    monthlyBase,
    perVisitTrip,
    monthlyTrip,
    monthlyTotal,
    annualTotal,
    visitsPerYear,
    visitsPerMonth,
    perVisitEffective,
    installOneTime,
    firstMonthTotal,
    contractTotal,
    // ✅ NEW: Frequency-specific UI helpers
    frequency,
    isVisitBasedFrequency,
    monthsPerVisit,
    totalVisitsForContract,
    // ✅ NEW: Backend config values for UI
    nonBathroomUnitSqFt,
  } = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    // Map backend config to expected format with proper fallbacks
    const activeConfig = {
      monthlyPricing: backendConfig?.monthlyPricing ?? { pricePerFixture: cfg.fixtureRates.monthly, minimumPrice: cfg.minimums.monthly },
      bimonthlyPricing: backendConfig?.bimonthlyPricing ?? { pricePerFixture: cfg.fixtureRates.bimonthly, minimumPrice: cfg.minimums.bimonthly },
      quarterlyPricing: backendConfig?.quarterlyPricing ?? { pricePerFixture: cfg.fixtureRates.quarterly, minimumPrice: cfg.minimums.quarterly },
      twicePerMonthPricing: backendConfig?.twicePerMonthPricing ?? { discountFromMonthlyRate: cfg.twoTimesPerMonthDiscountFlat },
      nonBathroomSqFtPricingRule: backendConfig?.nonBathroomSqFtPricingRule ?? {
        sqFtBlockUnit: cfg.nonBathroomUnitSqFt,
        priceFirstBlock: cfg.nonBathroomFirstUnitRate,
        priceAdditionalBlock: cfg.nonBathroomAdditionalUnitRate
      },
      installationPricing: backendConfig?.installationPricing ?? { installMultiplierDirtyOrFirstTime: cfg.installMultipliers.dirty },
      tripCharges: backendConfig?.tripCharges ?? { standard: 0, beltway: 0 },
      // ✅ Transform backend frequencyMetadata
      frequencyMetadata: backendConfig?.frequencyMetadata ?? {},
    };

    if (!backendConfig) {
      console.warn('⚠️ [SaniScrub] Using fallback config - backend not loaded yet');
    } else {
      console.log('✅ [SaniScrub] Using backend config:', {
        monthlyPricing: activeConfig.monthlyPricing,
        bimonthlyPricing: activeConfig.bimonthlyPricing,
        quarterlyPricing: activeConfig.quarterlyPricing,
        nonBathroomSqFtPricingRule: activeConfig.nonBathroomSqFtPricingRule,
      });
    }

    const freq = clampFrequency(form.frequency);

    // ✅ Get billing conversion for current frequency from backend or fallback
    const getFrequencyMultiplier = (frequency: string) => {
      if (activeConfig.frequencyMetadata[frequency]) {
        const metadata = activeConfig.frequencyMetadata[frequency];
        // Use monthlyRecurringMultiplier if available
        if (typeof metadata.monthlyRecurringMultiplier === 'number') {
          return metadata.monthlyRecurringMultiplier;
        }
        // Calculate from cycleMonths if available
        if (typeof metadata.cycleMonths === 'number') {
          return 1 / metadata.cycleMonths;
        }
      }
      // Fallback to local config
      const conv = cfg.frequencyMeta[frequency] || cfg.billingConversions[frequency];
      return conv?.monthlyMultiplier || 1;
    };

    const monthlyVisits = getFrequencyMultiplier(freq);
    const visitsPerYear = monthlyVisits * 12;
    const visitsPerMonth = visitsPerYear / 12;

    // ✅ Detect visit-based frequencies (oneTime, quarterly, biannual, annual, bimonthly)
    const isVisitBasedFrequency = freq === "oneTime" ||
                                   freq === "quarterly" ||
                                   freq === "biannual" ||
                                   freq === "annual" ||
                                   freq === "bimonthly";

    const fixtureCount = form.fixtureCount ?? 0;
    const nonBathSqFt = form.nonBathroomSqFt ?? 0;

    // ========== ✅ REWRITTEN: CORRECT SANISCRUB PRICING RULES ==========

    // ---------------- 1) RESTROOM FIXTURES ----------------
    let fixtureMonthly = 0;
    let fixturePerVisit = 0;
    let fixtureBaseAmount = 0; // ✅ Initialize at the beginning

    if (fixtureCount > 0) {
      // ✅ FIXED: Use backend config rates instead of hardcoded values
      let baseRate = 0;
      let minimumAmount = 0;

      if (freq === "monthly") {
        baseRate = activeConfig.monthlyPricing.pricePerFixture;
        minimumAmount = activeConfig.monthlyPricing.minimumPrice;
      } else if (freq === "bimonthly") {
        baseRate = activeConfig.bimonthlyPricing.pricePerFixture;
        minimumAmount = activeConfig.bimonthlyPricing.minimumPrice;
      } else if (freq === "quarterly") {
        baseRate = activeConfig.quarterlyPricing.pricePerFixture;
        minimumAmount = activeConfig.quarterlyPricing.minimumPrice;
      } else if (freq === "twicePerMonth") {
        // 2x/month uses monthly rate as base
        baseRate = activeConfig.monthlyPricing.pricePerFixture;
        minimumAmount = activeConfig.monthlyPricing.minimumPrice;
      } else {
        // For other frequencies (biannual, annual), use quarterly rate as fallback
        baseRate = activeConfig.quarterlyPricing.pricePerFixture;
        minimumAmount = activeConfig.quarterlyPricing.minimumPrice;
      }

      const rawAmount = fixtureCount * baseRate;

      // Base amount with minimum applied (this is what shows in the "= $___" box)
      fixtureBaseAmount = Math.max(rawAmount, minimumAmount);

      if (freq === "monthly") {
        // Monthly: Base amount is the monthly amount
        fixtureMonthly = fixtureBaseAmount;
        fixturePerVisit = fixtureBaseAmount;
      } else if (freq === "twicePerMonth") {
        // 2x/month: Base amount, then apply 2x multiplier and discount in final totals
        fixtureMonthly = fixtureBaseAmount; // Show base amount in display
        fixturePerVisit = fixtureBaseAmount / 2; // Each visit is half the monthly
      } else if (freq === "bimonthly") {
        // Bimonthly: Base amount represents monthly value
        fixtureMonthly = fixtureBaseAmount;
        fixturePerVisit = fixtureBaseAmount; // Each visit (every 2 months) costs the base amount
      } else if (freq === "quarterly") {
        // Quarterly: Base amount represents monthly value
        fixtureMonthly = fixtureBaseAmount;
        fixturePerVisit = fixtureBaseAmount; // Each visit (quarterly) costs the base amount
      } else {
        // For biannual, annual: use base amount as per-visit cost
        fixtureMonthly = fixtureBaseAmount;
        fixturePerVisit = fixtureBaseAmount;
      }
    }

    // ---------------- 2) NON-BATHROOM AREA ----------------
    let nonBathroomPerVisit = 0;
    let nonBathroomMonthly = 0;

    if (nonBathSqFt > 0) {
      // Rule: $250 for up to 500 sq ft, then +$125 for each additional 500 sq ft block
      // Example: 3000 sq ft = 6 units = $250 + 5×$125 = $875
      // ✅ FIXED: Use backend config values instead of hardcoded values

      if (nonBathSqFt <= activeConfig.nonBathroomSqFtPricingRule.sqFtBlockUnit) {
        // Up to 500 sq ft: use backend first unit rate
        nonBathroomPerVisit = activeConfig.nonBathroomSqFtPricingRule.priceFirstBlock;
      } else {
        // Over 500 sq ft: choose calculation method
        const extraSqFt = nonBathSqFt - activeConfig.nonBathroomSqFtPricingRule.sqFtBlockUnit;

        if (form.useExactNonBathroomSqft) {
          // EXACT SQFT: extra sq ft × rate per sq ft
          const ratePerSqFt = activeConfig.nonBathroomSqFtPricingRule.priceAdditionalBlock / activeConfig.nonBathroomSqFtPricingRule.sqFtBlockUnit;
          nonBathroomPerVisit = activeConfig.nonBathroomSqFtPricingRule.priceFirstBlock + (extraSqFt * ratePerSqFt);
        } else {
          // BLOCK PRICING: number of additional 500 sq ft blocks × rate
          const additionalBlocks = Math.ceil(extraSqFt / activeConfig.nonBathroomSqFtPricingRule.sqFtBlockUnit);
          nonBathroomPerVisit = activeConfig.nonBathroomSqFtPricingRule.priceFirstBlock + (additionalBlocks * activeConfig.nonBathroomSqFtPricingRule.priceAdditionalBlock);
        }
      }

      nonBathroomMonthly = (nonBathroomPerVisit * visitsPerYear) / 12;
    }

    // ---------------- 3) TRIP CHARGE ----------------
    // ✅ CORRECTED: NO trip charges for SaniScrub (per updated business rules)
    const baseTrip = 0; // No trip charge for SaniScrub
    const parkingCharge = 0; // No parking charge for SaniScrub
    const perVisitTrip = baseTrip + parkingCharge;
    const monthlyTrip = perVisitTrip * visitsPerMonth;

    // ---------------- 4) TOTALS WITH FREQUENCY ADJUSTMENTS ----------------
    let adjustedFixtureMonthly = fixtureMonthly;

    // ✅ Apply frequency adjustments to final totals only
    if (freq === "twicePerMonth") {
      // 2x/month: Double the monthly base, then subtract discount if combined with SaniClean
      adjustedFixtureMonthly = fixtureMonthly * 2;
      if (form.hasSaniClean) {
        adjustedFixtureMonthly = Math.max(0, adjustedFixtureMonthly - activeConfig.twicePerMonthPricing.discountFromMonthlyRate); // Backend discount amount
      }
    }
    // Note: bimonthly and quarterly rates already use their correct base rates (35/40)

    const monthlyBase = adjustedFixtureMonthly + nonBathroomMonthly;
    const perVisitWithoutTrip = fixturePerVisit + nonBathroomPerVisit;
    const perVisitWithTrip = perVisitWithoutTrip + perVisitTrip;

    const serviceActive = fixtureCount > 0 || nonBathSqFt > 0;

    // Monthly recurring (service + trip)
    const monthlyRecurring = monthlyBase + monthlyTrip;

    // ✅ MOVED: Calculate base per-visit cost early (needed for first month calculation)
    const basePerVisitCost = (fixtureCount > 0 ? fixtureBaseAmount : 0) +
                            (nonBathSqFt > 0 ? nonBathroomPerVisit : 0);

    // ---------------- 5) INSTALLATION ----------------
    // ✅ FIXED: Installation = 3× (dirty) or 1× (clean) of FULL service price
    // For installation, always use the base amounts, not per-visit amounts
    const installationFixtureBase = fixtureCount > 0 ? fixtureBaseAmount : 0;
    const installationNonBathroomBase = nonBathSqFt > 0 ? nonBathroomPerVisit : 0;
    const installationBasePrice = installationFixtureBase + installationNonBathroomBase;

    const installMultiplier = form.isDirtyInstall
      ? form.installMultiplierDirty  // ✅ Use form value (editable by user)
      : form.installMultiplierClean; // ✅ Use form value (editable by user)

    const calculatedInstallOneTime = serviceActive && form.includeInstall
      ? installationBasePrice * installMultiplier
      : 0;

    // Use custom installation fee if set, otherwise use calculated
    const installOneTime = form.customInstallationFee !== undefined
      ? form.customInstallationFee
      : calculatedInstallOneTime;

    // ----------------6) FIRST MONTH - NEW INSTALLATION-BASED RULES ----------------
    let calculatedFirstMonthTotal = 0;

    if (serviceActive) {
      if (freq === "oneTime") {
        // One-Time: Installation Cost only if included, otherwise Service Cost × 1
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip; // Service cost × 1
        }
      } else if (freq === "weekly") {
        // Weekly: First month = Installation + (monthlyVisits - 1) × Service Cost
        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; // e.g., 4.33 - 1 = 3.33 remaining visits
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {
          calculatedFirstMonthTotal = monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "biweekly") {
        // Bi-Weekly: First month = Installation + (monthlyVisits - 1) × Service Cost
        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; // e.g., 2.165 - 1 = 1.165 remaining visits
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {
          calculatedFirstMonthTotal = monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "monthly") {
        // Monthly: First month = Installation only (no service)
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip; // Service cost
        }
      } else if (freq === "bimonthly") {
        // Bi-Monthly: First visit = Installation only (every 2 months = 1 visit per 2-month period)
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only for first visit
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "quarterly") {
        // Quarterly: First visit = Installation only (4 visits per year)
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only for first visit
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "biannual") {
        // Bi-Annual: First service = Installation only
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "annual") {
        // Annual: Installation only if included, otherwise service cost
        if (form.includeInstall && installOneTime > 0) {
          calculatedFirstMonthTotal = installOneTime; // Installation only
        } else {
          calculatedFirstMonthTotal = basePerVisitCost + perVisitTrip;
        }
      } else if (freq === "twicePerMonth") {
        // 2×/month: Similar to biweekly but with discount logic
        if (form.includeInstall && installOneTime > 0) {
          const remainingVisits = monthlyVisits - 1; // e.g., 2 - 1 = 1 remaining visit
          calculatedFirstMonthTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));

          // Apply SaniClean discount
          if (form.hasSaniClean) {
            calculatedFirstMonthTotal = Math.max(0, calculatedFirstMonthTotal - activeConfig.twicePerMonthPricing.discountFromMonthlyRate);
          }
        } else {
          calculatedFirstMonthTotal = monthlyVisits * (basePerVisitCost + perVisitTrip);
          if (form.hasSaniClean) {
            calculatedFirstMonthTotal = Math.max(0, calculatedFirstMonthTotal - activeConfig.twicePerMonthPricing.discountFromMonthlyRate);
          }
        }
      }
    }

    // ✅ NEW: Apply custom override if set
    const firstMonthTotal = form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthTotal;

    // ---------------- 7) CONTRACT TOTAL - NEW INSTALLATION-BASED RULES ----------------
    const contractMonths = clampContractMonths(form.contractMonths);
    let calculatedContractTotal = 0;
    let monthsPerVisit = 1;
    let totalVisitsForContract = 0;

    if (serviceActive && contractMonths > 0) {
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
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyVisits * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all months monthlyVisits × service
          calculatedContractTotal = contractMonths * monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "biweekly") {
        // Bi-Weekly: Use backend monthlyVisits multiplier
        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {
          // First month: installation + remaining visits × service
          // Remaining months: monthlyVisits × service each
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyVisits * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all months monthlyVisits × service
          calculatedContractTotal = contractMonths * monthlyVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "monthly") {
        // Monthly: 1 visit per month
        totalVisitsForContract = contractMonths;

        if (form.includeInstall && installOneTime > 0) {
          // First month: installation only
          // From second month onward: 1 × service each month
          const remainingMonths = Math.max(contractMonths - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingMonths * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all months 1 × service
          calculatedContractTotal = contractMonths * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "bimonthly") {
        // Bi-Monthly: 6 visits in 12 months (1 visit every 2 months)
        const totalVisits = Math.round(contractMonths / 2);
        totalVisitsForContract = totalVisits;

        if (form.includeInstall && installOneTime > 0) {
          // First visit: installation only, remaining visits: service cost
          const remainingVisits = Math.max(totalVisits - 1, 0); // 5 remaining visits for 12-month contract
          calculatedContractTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all visits are service cost
          calculatedContractTotal = totalVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "quarterly") {
        // Quarterly: 4 visits in 12 months (1 visit every 3 months)
        const totalVisits = Math.round(contractMonths / 3);
        totalVisitsForContract = totalVisits;

        if (form.includeInstall && installOneTime > 0) {
          // First visit: installation only, remaining visits: service cost
          const remainingVisits = Math.max(totalVisits - 1, 0); // 3 remaining visits for 12-month contract
          calculatedContractTotal = installOneTime + (remainingVisits * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all visits are service cost
          calculatedContractTotal = totalVisits * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "biannual") {
        // Bi-Annual: 2 services per year
        const totalServices = Math.round((contractMonths / 12) * 2);
        totalVisitsForContract = totalServices;

        if (form.includeInstall && installOneTime > 0) {
          // First service: installation, second service: normal service
          const remainingServices = Math.max(totalServices - 1, 0);
          calculatedContractTotal = firstMonthTotal + (remainingServices * (basePerVisitCost + perVisitTrip));
        } else {
          // No installation: all services normal
          calculatedContractTotal = totalServices * (basePerVisitCost + perVisitTrip);
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
          calculatedContractTotal = totalServices * (basePerVisitCost + perVisitTrip);
        }
      } else if (freq === "twicePerMonth") {
        // 2×/month: Use backend monthlyVisits multiplier
        totalVisitsForContract = Math.round(contractMonths * monthlyVisits);

        if (form.includeInstall && installOneTime > 0) {
          // First month: installation + remaining visits × service (with discount)
          // Remaining months: monthlyVisits × service each (with discount)
          const remainingMonths = Math.max(contractMonths - 1, 0);
          let monthlyRecurringWithDiscount = monthlyVisits * (basePerVisitCost + perVisitTrip);
          if (form.hasSaniClean) {
            monthlyRecurringWithDiscount = Math.max(0, monthlyRecurringWithDiscount - activeConfig.twicePerMonthPricing.discountFromMonthlyRate);
          }
          calculatedContractTotal = firstMonthTotal + (remainingMonths * monthlyRecurringWithDiscount);
        } else {
          // No installation: all months monthlyVisits × service with discount
          let monthlyRecurringWithDiscount = monthlyVisits * (basePerVisitCost + perVisitTrip);
          if (form.hasSaniClean) {
            monthlyRecurringWithDiscount = Math.max(0, monthlyRecurringWithDiscount - activeConfig.twicePerMonthPricing.discountFromMonthlyRate);
          }
          calculatedContractTotal = contractMonths * monthlyRecurringWithDiscount;
        }
      }
    }

    // ✅ NEW: Apply custom override if set
    const contractTotal = form.customContractTotal !== undefined
      ? form.customContractTotal
      : calculatedContractTotal;

    // UI Values
    const monthlyTotal = form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : monthlyRecurring;

    const annualTotal = contractTotal;

    // ✅ FIXED: Per-visit shows BASE cost (without frequency adjustments or discounts)
    const perVisitEffective = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : (basePerVisitCost + perVisitTrip); // Base cost + trip charges

    // Frequency helpers
    const frequency = freq;
    monthsPerVisit = freq === "bimonthly" ? 2 : freq === "quarterly" ? 3 : freq === "biannual" ? 6 : freq === "annual" ? 12 : 1;
    totalVisitsForContract = isVisitBasedFrequency && contractMonths > 0
      ? Math.round((contractMonths / 12) * visitsPerYear)
      : Math.round(contractMonths * monthlyVisits);

    return {
      fixtureMonthly, // Base amount for display (before frequency adjustments)
      fixtureBaseAmount, // ✅ NEW: Explicit base amount with minimum applied
      fixturePerVisit,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      monthlyBase, // Now includes frequency adjustments
      perVisitTrip,
      monthlyTrip,
      monthlyTotal,
      annualTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitEffective,
      installOneTime,
      firstMonthTotal,
      contractTotal,
      frequency,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
      nonBathroomUnitSqFt: activeConfig.nonBathroomSqFtPricingRule.sqFtBlockUnit,
    };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form.fixtureCount,
    form.nonBathroomSqFt,
    form.useExactNonBathroomSqft,  // ✅ Re-calculate when calculation method changes
    form.frequency,
    form.hasSaniClean,
    form.needsParking,
    form.includeInstall,
    form.isDirtyInstall,
    form.contractMonths,
    form.customInstallationFee,
    // ✅ NEW: Watch form pricing rates (editable from UI)
    form.nonBathroomFirstUnitRate,
    form.nonBathroomAdditionalUnitRate,
    form.installMultiplierDirty,  // ✅ Added: Watch multiplier changes
    form.installMultiplierClean,  // ✅ Added: Watch multiplier changes
    // ✅ NEW: Watch custom override fields
    form.customPerVisitPrice,
    form.customMonthlyRecurring,
    form.customFirstMonthPrice,
    form.customContractTotal,
  ]);

  const quote: ServiceQuoteResult = useMemo(
    () => ({
      serviceId: form.serviceId,
      perVisit: perVisitEffective,
      monthly: monthlyTotal, // normal recurring month
      annual: annualTotal, // here: TOTAL CONTRACT PRICE
    }),
    [form.serviceId, perVisitEffective, monthlyTotal, annualTotal]
  );

  return {
    form,
    setForm,
    onChange,
    quote,
    calc: {
      fixtureMonthly,
      fixtureBaseAmount, // ✅ NEW: Base amount with minimum applied
      fixturePerVisit,
      nonBathroomPerVisit,
      nonBathroomMonthly,
      monthlyBase,
      perVisitTrip,
      monthlyTrip,
      monthlyTotal,
      annualTotal,
      visitsPerYear,
      visitsPerMonth,
      perVisitEffective,
      installOneTime,
      firstMonthTotal,
      contractTotal,
      // ✅ NEW: Frequency-specific UI helpers
      frequency,
      isVisitBasedFrequency,
      monthsPerVisit,
      totalVisitsForContract,
      // ✅ NEW: Backend config values for UI
      nonBathroomUnitSqFt,
    },
    refreshConfig: fetchPricing,
    isLoadingConfig,
  };
}
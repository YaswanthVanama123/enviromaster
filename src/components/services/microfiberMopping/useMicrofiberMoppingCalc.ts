// src/features/services/microfiberMopping/useMicrofiberMoppingCalc.ts
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { ServiceQuoteResult } from "../common/serviceTypes";
import type {
  MicrofiberMoppingFormState,
  MicrofiberFrequencyKey,
  MicrofiberMoppingCalcResult,
} from "./microfiberMoppingTypes";
import { microfiberMoppingPricingConfig as cfg } from "./microfiberMoppingConfig";
import { serviceConfigApi } from "../../../backendservice/api";
import { useServicesContextOptional } from "../ServicesContext";

// ✅ Backend config interface matching the ACTUAL MongoDB JSON structure from API
interface BackendMicrofiberConfig {
  // OLD format (for backward compatibility)
  includedBathroomRate?: number;
  hugeBathroomPricing?: {
    enabled: boolean;
    ratePerSqFt: number;
    sqFtUnit: number;
    description: string;
  };
  extraAreaPricing?: {
    singleLargeAreaRate: number;
    extraAreaSqFtUnit: number;
    extraAreaRatePerUnit: number;
    useHigherRate: boolean;
  };
  standalonePricing?: {
    standaloneSqFtUnit: number;
    standaloneRatePerUnit: number;
    standaloneMinimum: number;
    includeTripCharge: boolean;
  };
  chemicalProducts?: {
    dailyChemicalPerGallon: number;
    customerSelfMopping: boolean;
    waterOnlyBetweenServices: boolean;
  };
  // NEW format (from actual backend API)
  bathroomMoppingPricing?: {
    flatPricePerBathroom: number;
    hugeBathroomSqFtUnit: number;
    hugeBathroomRate: number;
  };
  nonBathroomAddonAreas?: {
    flatPriceSingleLargeArea: number;
    sqFtUnit: number;
    ratePerSqFtUnit: number;
    useHigherRate: boolean;
  };
  standaloneMoppingPricing?: {
    sqFtUnit: number;
    ratePerSqFtUnit: number;
    minimumPrice: number;
    includeTripCharge: boolean;
  };
  tripCharges?: {
    standard: number;
    beltway: number;
  };
  minimumChargePerVisit?: number;
  frequencyMetadata?: any; // Will be converted to billingConversions
  billingConversions?: {
    oneTime: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    weekly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    biweekly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    twicePerMonth: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    monthly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    bimonthly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    quarterly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    biannual: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    annual: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    actualWeeksPerYear: number;
    actualWeeksPerMonth: number;
  };
  rateCategories?: {
    redRate: {
      multiplier: number;
      commissionRate: string;
    };
    greenRate: {
      multiplier: number;
      commissionRate: string;
    };
  };
  defaultFrequency?: string;
  allowedFrequencies?: string[];
}

type InputChangeEvent =
  | ChangeEvent<HTMLInputElement>
  | ChangeEvent<HTMLSelectElement>;

// ✅ Helper function to map frequency strings to valid MicrofiberFrequencyKey
function mapFrequency(v: string): MicrofiberFrequencyKey {
  if (v === "oneTime" || v === "weekly" || v === "biweekly" || v === "twicePerMonth" ||
      v === "monthly" || v === "bimonthly" || v === "quarterly" || v === "biannual" || v === "annual") {
    return v;
  }
  return "weekly";
}

// ✅ Helper function to convert frequencyMetadata to billingConversions format
function convertFrequencyMetadataToBillingConversions(config: any): BackendMicrofiberConfig {
  // If the config already has billingConversions, return as-is
  if (config.billingConversions) {
    return config as BackendMicrofiberConfig;
  }

  // If the config has frequencyMetadata, convert it to billingConversions format
  if (config.frequencyMetadata) {
    const freqMeta = config.frequencyMetadata;

    return {
      ...config,
      billingConversions: {
        oneTime: {
          annualMultiplier: 1,
          monthlyMultiplier: 0, // oneTime has no monthly billing
        },
        weekly: {
          annualMultiplier: 52,
          monthlyMultiplier: freqMeta.weekly?.monthlyRecurringMultiplier ?? 4.33,
        },
        biweekly: {
          annualMultiplier: 26,
          monthlyMultiplier: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 2.165,
        },
        twicePerMonth: {
          annualMultiplier: 24,
          monthlyMultiplier: 2, // 2 visits per month
        },
        monthly: {
          annualMultiplier: 12,
          monthlyMultiplier: 1, // monthly always 1 visit per month
        },
        bimonthly: {
          annualMultiplier: 6,
          monthlyMultiplier: 0.5, // every 2 months = 0.5 per month
        },
        quarterly: {
          annualMultiplier: 4,
          monthlyMultiplier: 0, // no monthly for quarterly
        },
        biannual: {
          annualMultiplier: 2,
          monthlyMultiplier: 0, // no monthly for biannual
        },
        annual: {
          annualMultiplier: 1,
          monthlyMultiplier: 0, // no monthly for annual
        },
        actualWeeksPerYear: 52,
        actualWeeksPerMonth: 4.33, // 52/12
      },
    } as BackendMicrofiberConfig;
  }

  // Fallback: return config as-is (will use static defaults)
  console.warn('⚠️ Microfiber Mopping config has neither billingConversions nor frequencyMetadata');
  return config as BackendMicrofiberConfig;
}

const DEFAULT_FORM: MicrofiberMoppingFormState = {
  // Base service meta
  serviceId: "microfiber_mopping",

  // Defaults
  frequency: cfg.defaultFrequency,
  contractTermMonths: 12,

  hasExistingSaniService: true,

  bathroomCount: 0,
  isHugeBathroom: false,
  hugeBathroomSqFt: 0,

  extraAreaSqFt: 0,
  useExactExtraAreaSqft: true, // Default to exact calculation
  standaloneSqFt: 0,
  useExactStandaloneSqft: true, // Default to exact calculation
  chemicalGallons: 0,

  isAllInclusive: false,

  location: "insideBeltway",
  needsParking: false,

  // Editable pricing rates from config (will be overridden by backend)
  includedBathroomRate: cfg.includedBathroomRate,
  hugeBathroomRatePerSqFt: cfg.hugeBathroomPricing.ratePerSqFt,
  extraAreaRatePerUnit: cfg.extraAreaPricing.extraAreaRatePerUnit,
  standaloneRatePerUnit: cfg.standalonePricing.standaloneRatePerUnit,
  dailyChemicalPerGallon: cfg.chemicalProducts.dailyChemicalPerGallon,
} as MicrofiberMoppingFormState;

// Helper function removed - will use backend config directly

export function useMicrofiberMoppingCalc(
  initialData?: unknown
): {
  form: MicrofiberMoppingFormState;
  setForm: React.Dispatch<React.SetStateAction<MicrofiberMoppingFormState>>;
  onChange: (ev: InputChangeEvent) => void;
  quote: ServiceQuoteResult;
  calc: MicrofiberMoppingCalcResult;
} {
  const [form, setForm] = useState<MicrofiberMoppingFormState>(() => {
    const maybe = (initialData as any) || {};
    const initialForm =
      maybe && typeof maybe === "object" && "form" in maybe ? maybe.form : maybe;

    return {
      ...DEFAULT_FORM,
      ...(initialForm as Partial<MicrofiberMoppingFormState>),
    };
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendMicrofiberConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Get services context for fallback pricing data
  const servicesContext = useServicesContextOptional();

  // Helper function to update form with config data
  const updateFormWithConfig = (config: BackendMicrofiberConfig) => {
    setForm((prev) => ({
      ...prev,
      // ✅ Map backend API fields to form state (supports both old and new format)
      // Bathroom rate: NEW format bathroomMoppingPricing.flatPricePerBathroom OR OLD format includedBathroomRate
      includedBathroomRate: config.bathroomMoppingPricing?.flatPricePerBathroom ??
                            config.includedBathroomRate ??
                            prev.includedBathroomRate,

      // Huge bathroom rate: NEW format bathroomMoppingPricing.hugeBathroomRate OR OLD format hugeBathroomPricing.ratePerSqFt
      hugeBathroomRatePerSqFt: config.bathroomMoppingPricing?.hugeBathroomRate ??
                                config.hugeBathroomPricing?.ratePerSqFt ??
                                prev.hugeBathroomRatePerSqFt,

      // Extra area rate: NEW format nonBathroomAddonAreas.ratePerSqFtUnit OR OLD format extraAreaPricing.extraAreaRatePerUnit
      extraAreaRatePerUnit: config.nonBathroomAddonAreas?.ratePerSqFtUnit ??
                            config.extraAreaPricing?.extraAreaRatePerUnit ??
                            prev.extraAreaRatePerUnit,

      // Standalone rate: NEW format standaloneMoppingPricing.ratePerSqFtUnit OR OLD format standalonePricing.standaloneRatePerUnit
      standaloneRatePerUnit: config.standaloneMoppingPricing?.ratePerSqFtUnit ??
                             config.standalonePricing?.standaloneRatePerUnit ??
                             prev.standaloneRatePerUnit,

      // Chemical rate: OLD format only (not in new API response yet)
      dailyChemicalPerGallon: config.chemicalProducts?.dailyChemicalPerGallon ??
                               prev.dailyChemicalPerGallon,
    }));
  };

  // ✅ Fetch COMPLETE pricing configuration from backend
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("microfiberMopping");

      // ✅ Check if response has error or no data
      if (!response || response.error || !response.data) {
        console.warn('⚠️ Microfiber Mopping config not found in active services, trying fallback pricing...');
        console.warn('⚠️ [Microfiber Mopping] Error:', response?.error);

        // FALLBACK: Use context's backend pricing data for inactive services
        if (servicesContext?.getBackendPricingForService) {
          const fallbackConfig = servicesContext.getBackendPricingForService("microfiberMopping");
          if (fallbackConfig?.config) {
            console.log('✅ [Microfiber Mopping] Using backend pricing data from context for inactive service');
            const config = convertFrequencyMetadataToBillingConversions(fallbackConfig.config);
            setBackendConfig(config);
            updateFormWithConfig(config);

            console.log('✅ Microfiber Mopping FALLBACK CONFIG loaded from context:', {
              pricing: {
                bathroomRate: config.includedBathroomRate,
                hugeBathroomRate: config.hugeBathroomPricing?.ratePerSqFt,
                extraAreaRate: config.extraAreaPricing?.extraAreaRatePerUnit,
                standaloneRate: config.standalonePricing?.standaloneRatePerUnit,
                chemicalRate: config.chemicalProducts?.dailyChemicalPerGallon,
              },
              hugeBathroomPricing: config.hugeBathroomPricing,
              extraAreaPricing: config.extraAreaPricing,
              standalonePricing: config.standalonePricing,
              rateCategories: config.rateCategories,
              billingConversions: config.billingConversions,
              allowedFrequencies: config.allowedFrequencies,
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
        console.warn('⚠️ Microfiber Mopping document has no config property');
        return;
      }

      const config = convertFrequencyMetadataToBillingConversions(document.config);

      // ✅ Store the ENTIRE backend config for use in calculations
      setBackendConfig(config);
      updateFormWithConfig(config);

      console.log('✅ Microfiber Mopping FULL CONFIG loaded from backend:', {
        pricing: {
          bathroomRate: config.includedBathroomRate,
          hugeBathroomRate: config.hugeBathroomPricing?.ratePerSqFt,
          extraAreaRate: config.extraAreaPricing?.extraAreaRatePerUnit,
          standaloneRate: config.standalonePricing?.standaloneRatePerUnit,
          chemicalRate: config.chemicalProducts?.dailyChemicalPerGallon,
        },
        hugeBathroomPricing: config.hugeBathroomPricing,
        extraAreaPricing: config.extraAreaPricing,
        standalonePricing: config.standalonePricing,
        rateCategories: config.rateCategories,
        billingConversions: config.billingConversions,
        allowedFrequencies: config.allowedFrequencies,
      });
    } catch (error) {
      console.error('❌ Failed to fetch Microfiber Mopping config from backend:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      // FALLBACK: Use context's backend pricing data
      if (servicesContext?.getBackendPricingForService) {
        const fallbackConfig = servicesContext.getBackendPricingForService("microfiberMopping");
        if (fallbackConfig?.config) {
          console.log('✅ [Microfiber Mopping] Using backend pricing data from context after error');
          const config = convertFrequencyMetadataToBillingConversions(fallbackConfig.config);
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

  const onChange = (ev: InputChangeEvent) => {
    const target = ev.target as HTMLInputElement;
    const { name, type, value, checked } = target;

    setForm((prev) => {
      let nextValue: unknown = value;

      if (type === "checkbox") {
        nextValue = checked;
      } else if (
        // Handle custom override fields - allow clearing by setting to undefined
        name === "customStandardBathroomTotal" ||
        name === "customHugeBathroomTotal" ||
        name === "customExtraAreaTotal" ||
        name === "customStandaloneTotal" ||
        name === "customChemicalTotal" ||
        name === "customPerVisitPrice" ||
        name === "customMonthlyRecurring" ||
        name === "customFirstMonthPrice" ||
        name === "customContractTotal"
      ) {
        if (value === '') {
          nextValue = undefined;
        } else {
          const numVal = parseFloat(value);
          if (!isNaN(numVal)) {
            nextValue = numVal;
          } else {
            return prev; // Don't update if invalid
          }
        }
      } else if (type === "number") {
        const raw = value.trim();
        if (raw === "") {
          nextValue = 0;
        } else {
          const num = Number(raw);
          nextValue = Number.isFinite(num) && num >= 0 ? num : 0;
        }
      }

      const next: MicrofiberMoppingFormState = {
        ...prev,
        [name]: nextValue as any,
      };

      // UX rule: huge bathroom path clears standard bathroom count
      if (name === "hugeBathroomSqFt") {
        const sq = Number(nextValue) || 0;
        if (sq > 0) {
          next.bathroomCount = 0;
          next.isHugeBathroom = true;
        } else if (sq === 0) {
          next.isHugeBathroom = false;
        }
      }

      if (name === "isHugeBathroom" && nextValue === true) {
        next.bathroomCount = 0;
      }

      return next;
    });
  };

  const { calc, quote } = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    // Map NEW backend format to OLD format structure that calculations expect
    const activeConfig = {
      // Included bathroom rate: NEW bathroomMoppingPricing.flatPricePerBathroom OR OLD includedBathroomRate
      includedBathroomRate: backendConfig?.bathroomMoppingPricing?.flatPricePerBathroom ??
                            backendConfig?.includedBathroomRate ??
                            cfg.includedBathroomRate,

      // Huge bathroom pricing: NEW bathroomMoppingPricing OR OLD hugeBathroomPricing
      hugeBathroomPricing: {
        enabled: true, // Always enabled if backend config exists
        ratePerSqFt: backendConfig?.bathroomMoppingPricing?.hugeBathroomRate ??
                     backendConfig?.hugeBathroomPricing?.ratePerSqFt ??
                     cfg.hugeBathroomPricing.ratePerSqFt,
        sqFtUnit: backendConfig?.bathroomMoppingPricing?.hugeBathroomSqFtUnit ??
                  backendConfig?.hugeBathroomPricing?.sqFtUnit ??
                  cfg.hugeBathroomPricing.sqFtUnit,
        description: backendConfig?.hugeBathroomPricing?.description ?? cfg.hugeBathroomPricing.description,
      },

      // Extra area pricing: NEW nonBathroomAddonAreas OR OLD extraAreaPricing
      extraAreaPricing: {
        singleLargeAreaRate: backendConfig?.nonBathroomAddonAreas?.flatPriceSingleLargeArea ??
                             backendConfig?.extraAreaPricing?.singleLargeAreaRate ??
                             cfg.extraAreaPricing.singleLargeAreaRate,
        extraAreaSqFtUnit: backendConfig?.nonBathroomAddonAreas?.sqFtUnit ??
                           backendConfig?.extraAreaPricing?.extraAreaSqFtUnit ??
                           cfg.extraAreaPricing.extraAreaSqFtUnit,
        extraAreaRatePerUnit: backendConfig?.nonBathroomAddonAreas?.ratePerSqFtUnit ??
                              backendConfig?.extraAreaPricing?.extraAreaRatePerUnit ??
                              cfg.extraAreaPricing.extraAreaRatePerUnit,
        useHigherRate: backendConfig?.nonBathroomAddonAreas?.useHigherRate ??
                       backendConfig?.extraAreaPricing?.useHigherRate ??
                       cfg.extraAreaPricing.useHigherRate,
      },

      // Standalone pricing: NEW standaloneMoppingPricing OR OLD standalonePricing
      standalonePricing: {
        standaloneSqFtUnit: backendConfig?.standaloneMoppingPricing?.sqFtUnit ??
                            backendConfig?.standalonePricing?.standaloneSqFtUnit ??
                            cfg.standalonePricing.standaloneSqFtUnit,
        standaloneRatePerUnit: backendConfig?.standaloneMoppingPricing?.ratePerSqFtUnit ??
                               backendConfig?.standalonePricing?.standaloneRatePerUnit ??
                               cfg.standalonePricing.standaloneRatePerUnit,
        standaloneMinimum: backendConfig?.standaloneMoppingPricing?.minimumPrice ??
                           backendConfig?.minimumChargePerVisit ??
                           backendConfig?.standalonePricing?.standaloneMinimum ??
                           cfg.standalonePricing.standaloneMinimum,
        includeTripCharge: backendConfig?.standaloneMoppingPricing?.includeTripCharge ??
                           backendConfig?.standalonePricing?.includeTripCharge ??
                           cfg.standalonePricing.includeTripCharge,
      },

      // Chemical products: OLD format only
      chemicalProducts: backendConfig?.chemicalProducts ?? cfg.chemicalProducts,

      // Billing conversions: use existing billingConversions (already converted from frequencyMetadata)
      billingConversions: backendConfig?.billingConversions ?? cfg.billingConversions,

      // Rate categories
      rateCategories: backendConfig?.rateCategories ?? cfg.rateCategories,

      // Frequency settings
      defaultFrequency: backendConfig?.defaultFrequency ?? cfg.defaultFrequency,
      allowedFrequencies: backendConfig?.allowedFrequencies ?? cfg.allowedFrequencies,
    };

    const freq: MicrofiberFrequencyKey = mapFrequency(form.frequency ?? activeConfig.defaultFrequency);

    // ✅ BILLING CONVERSION FROM BACKEND (NOT HARDCODED!)
    const conv = activeConfig.billingConversions[freq] || activeConfig.billingConversions.weekly;

    const { actualWeeksPerYear, actualWeeksPerMonth } = activeConfig.billingConversions;
    const isAllInclusive = !!form.isAllInclusive;

    // ----------------------------
    // 1) Bathrooms (included with Sani) - BASE CALCULATIONS
    // ----------------------------
    let calculatedStandardBathroomPrice = 0;
    let calculatedHugeBathroomPrice = 0;

    if (!isAllInclusive && form.hasExistingSaniService) {
      const standardBathCount = Math.max(0, Number(form.bathroomCount) || 0);

      // Standard bathrooms: use editable rate
      if (standardBathCount > 0) {
        calculatedStandardBathroomPrice =
          standardBathCount * form.includedBathroomRate;
      }

      // Huge bathroom: use editable rate per sq ft
      const hugeSqFt = Math.max(0, Number(form.hugeBathroomSqFt) || 0);
      if (
        form.isHugeBathroom &&
        activeConfig.hugeBathroomPricing.enabled &&  // ✅ FROM BACKEND
        hugeSqFt > 0
      ) {
        const units = Math.ceil(
          hugeSqFt / activeConfig.hugeBathroomPricing.sqFtUnit  // ✅ FROM BACKEND
        );
        calculatedHugeBathroomPrice =
          units * form.hugeBathroomRatePerSqFt;
      }
    }

    // Use custom overrides if set, otherwise use calculated
    const standardBathroomPrice = form.customStandardBathroomTotal !== undefined
      ? form.customStandardBathroomTotal
      : calculatedStandardBathroomPrice;

    const hugeBathroomPrice = form.customHugeBathroomTotal !== undefined
      ? form.customHugeBathroomTotal
      : calculatedHugeBathroomPrice;

    const bathroomPrice = standardBathroomPrice + hugeBathroomPrice;

    // ----------------------------
    // 2) Extra non-bath area - BASE CALCULATIONS with exact vs direct pricing (like SaniScrub)
    // NEW: Support exact calculation vs direct calculation like SaniScrub
    // ----------------------------
    let calculatedExtraAreaPrice = 0;

    if (!isAllInclusive && form.extraAreaSqFt > 0) {
      const unitSqFt = activeConfig.extraAreaPricing.extraAreaSqFtUnit; // ✅ FROM BACKEND (400)
      const firstUnitRate = activeConfig.extraAreaPricing.singleLargeAreaRate; // ✅ FROM BACKEND ($100)
      const additionalUnitRate = form.extraAreaRatePerUnit; // $10 per 400 sq ft

      if (form.useExactExtraAreaSqft) {
        // ✅ EXACT CALCULATION: Calculate minimum coverage first, then additional units
        // Minimum $100 covers how many units? $100 ÷ $10 = 10 units
        // 10 units × 400 sqft = 4000 sqft covered by minimum
        const minimumUnits = Math.floor(firstUnitRate / additionalUnitRate); // $100 ÷ $10 = 10 units
        const minimumCoverageSqFt = minimumUnits * unitSqFt; // 10 × 400 = 4000 sqft

        if (form.extraAreaSqFt <= minimumCoverageSqFt) {
          // ≤ 4000 sq ft: Always $100 minimum (covers up to 4000 sqft)
          calculatedExtraAreaPrice = firstUnitRate;
        } else {
          // > 4000 sq ft: $100 minimum + additional units beyond coverage
          const extraSqFt = form.extraAreaSqFt - minimumCoverageSqFt; // sqft over 4000
          const additionalUnits = Math.ceil(extraSqFt / unitSqFt); // additional 400sqft units needed
          calculatedExtraAreaPrice = firstUnitRate + (additionalUnits * additionalUnitRate);
        }
      } else {
        // ✅ DIRECT CALCULATION: Calculate minimum coverage first, then exact additional sqft
        const minimumUnits = Math.floor(firstUnitRate / additionalUnitRate); // $100 ÷ $10 = 10 units
        const minimumCoverageSqFt = minimumUnits * unitSqFt; // 10 × 400 = 4000 sqft

        if (form.extraAreaSqFt <= minimumCoverageSqFt) {
          // ≤ 4000 sq ft: Always $100 minimum
          calculatedExtraAreaPrice = firstUnitRate;
        } else {
          // > 4000 sq ft: $100 minimum + exact additional sq ft × rate
          const extraSqFt = form.extraAreaSqFt - minimumCoverageSqFt; // sq ft over 4000
          const ratePerSqFt = additionalUnitRate / unitSqFt; // $10/400 = $0.025
          calculatedExtraAreaPrice = firstUnitRate + (extraSqFt * ratePerSqFt);
        }
      }

      // Apply useHigherRate rule if configured (but usually not needed with this logic)
      if (activeConfig.extraAreaPricing.useHigherRate) {
        calculatedExtraAreaPrice = Math.max(calculatedExtraAreaPrice, firstUnitRate);
      }
    }

    // Use custom override if set
    const extraAreaPrice = form.customExtraAreaTotal !== undefined
      ? form.customExtraAreaTotal
      : calculatedExtraAreaPrice;

    // ----------------------------
    // 3) Stand-alone microfiber mopping - BASE CALCULATIONS with exact vs direct pricing (like SaniScrub)
    // NEW: Support exact calculation vs direct calculation like SaniScrub
    // ----------------------------
    let calculatedStandaloneServicePrice = 0;
    let standaloneTripCharge = 0;
    let calculatedStandaloneTotal = 0;

    if (!isAllInclusive && form.standaloneSqFt > 0) {
      const unitSqFt = activeConfig.standalonePricing.standaloneSqFtUnit; // ✅ FROM BACKEND (200)
      const minimumRate = activeConfig.standalonePricing.standaloneMinimum; // ✅ FROM BACKEND ($40)
      const additionalUnitRate = form.standaloneRatePerUnit; // $10 per 200 sq ft

      if (form.useExactStandaloneSqft) {
        // ✅ EXACT CALCULATION: Calculate minimum coverage first, then additional units
        // Minimum $40 covers how many units? Need to calculate based on per-unit rate
        // If rate is $10/200sqft and minimum is $40, then $40 ÷ $10 = 4 units
        // 4 units × 200 sqft = 800 sqft covered by minimum
        const minimumUnits = Math.floor(minimumRate / additionalUnitRate); // e.g., $40 ÷ $10 = 4 units
        const minimumCoverageSqFt = minimumUnits * unitSqFt; // e.g., 4 × 200 = 800 sqft

        if (form.standaloneSqFt <= minimumCoverageSqFt) {
          // ≤ 800 sq ft: Always $40 minimum (covers up to 800 sqft)
          calculatedStandaloneServicePrice = minimumRate;
        } else {
          // > 800 sq ft: $40 minimum + additional units beyond coverage
          const extraSqFt = form.standaloneSqFt - minimumCoverageSqFt; // sqft over 800
          const additionalUnits = Math.ceil(extraSqFt / unitSqFt); // additional 200sqft units needed
          calculatedStandaloneServicePrice = minimumRate + (additionalUnits * additionalUnitRate);
        }
      } else {
        // ✅ DIRECT CALCULATION: Calculate minimum coverage first, then exact additional sqft
        const minimumUnits = Math.floor(minimumRate / additionalUnitRate); // e.g., $40 ÷ $10 = 4 units
        const minimumCoverageSqFt = minimumUnits * unitSqFt; // e.g., 4 × 200 = 800 sqft

        if (form.standaloneSqFt <= minimumCoverageSqFt) {
          // ≤ 800 sq ft: Always $40 minimum
          calculatedStandaloneServicePrice = minimumRate;
        } else {
          // > 800 sq ft: $40 minimum + exact additional sq ft × rate
          const extraSqFt = form.standaloneSqFt - minimumCoverageSqFt; // sq ft over 800
          const ratePerSqFt = additionalUnitRate / unitSqFt; // $10/200 = $0.05
          calculatedStandaloneServicePrice = minimumRate + (extraSqFt * ratePerSqFt);
        }
      }

      // Trip charge concept removed → always 0 in calculations
      standaloneTripCharge = 0;
      calculatedStandaloneTotal = calculatedStandaloneServicePrice;
    }

    // Use custom override if set
    const standaloneServicePrice = form.customStandaloneTotal !== undefined
      ? form.customStandaloneTotal
      : calculatedStandaloneServicePrice;

    const standaloneTotal = standaloneServicePrice;

    // ----------------------------
    // 4) Chemical supply (customer self-mopping) - BASE CALCULATIONS
    // Rule: use editable rate per gallon – per month.
    // ----------------------------
    const calculatedChemicalSupplyMonthly =
      form.chemicalGallons > 0
        ? form.chemicalGallons * form.dailyChemicalPerGallon
        : 0;

    // Use custom override if set
    const chemicalSupplyMonthly = form.customChemicalTotal !== undefined
      ? form.customChemicalTotal
      : calculatedChemicalSupplyMonthly;

    // ----------------------------
    // 5) Per-visit total - BASE CALCULATIONS
    // ----------------------------
    const calculatedPerVisitServiceTotal =
      bathroomPrice + extraAreaPrice + standaloneTotal;

    // Use custom override if set
    const perVisitPrice = form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : calculatedPerVisitServiceTotal;

    // ----------------------------
    // 6) Monthly (4.33 weeks logic) and contract - BASE CALCULATIONS
    // ✅ Support all 9 frequencies with visit-based logic
    // ----------------------------
    // Determine if frequency is visit-based (not monthly billing)
    const isVisitBasedFrequency = freq === "oneTime" || freq === "quarterly" ||
      freq === "biannual" || freq === "annual" || freq === "bimonthly";

    const monthlyVisits = conv.monthlyMultiplier; // e.g., 4.33 for weekly, 0 for quarterly
    const calculatedMonthlyService = perVisitPrice * monthlyVisits;
    const calculatedMonthlyRecurring = calculatedMonthlyService + chemicalSupplyMonthly;

    // Use custom override if set
    const monthlyRecurring = form.customMonthlyRecurring !== undefined
      ? form.customMonthlyRecurring
      : calculatedMonthlyRecurring;

    // First visit / first month rules
    // For Microfiber we don't have a separate installation fee,
    // so installFee is treated as 0 here.
    const installFee = 0;
    const firstVisitPrice = installFee; // install-only, but 0 in this service

    // First month calculation varies by frequency type
    let calculatedFirstMonthPrice = 0;
    if (isVisitBasedFrequency) {
      // For oneTime, quarterly, biannual, annual, bimonthly: just the first visit (service only, no install)
      calculatedFirstMonthPrice = perVisitPrice;
    } else {
      // For weekly, biweekly, twicePerMonth, monthly: (monthlyVisits) × normal service price + chemical
      const calculatedFirstMonthService = Math.max(monthlyVisits, 0) * perVisitPrice;
      calculatedFirstMonthPrice = firstVisitPrice + calculatedFirstMonthService + chemicalSupplyMonthly;
    }

    // Use custom override if set
    const firstMonthPrice = form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthPrice;

    // Contract term (2–36 months)
    let contractMonths = Number(form.contractTermMonths) || 0;
    if (contractMonths < 2) contractMonths = 2;
    if (contractMonths > 36) contractMonths = 36;

    // Contract total calculation
    let calculatedContractTotal = 0;
    if (freq === "oneTime") {
      // ✅ For oneTime: just the first visit (no recurring billing)
      calculatedContractTotal = firstMonthPrice;
    } else if (isVisitBasedFrequency) {
      // ✅ For quarterly, biannual, annual, bimonthly: use annual multipliers
      const visitsPerYear = conv.annualMultiplier ?? 1;
      const totalVisits = (contractMonths / 12) * visitsPerYear;

      // All visits are service visits (no install in microfiber)
      calculatedContractTotal = totalVisits * perVisitPrice + (contractMonths * (chemicalSupplyMonthly / monthlyVisits || 0));
    } else {
      // For weekly, biweekly, twicePerMonth, monthly: use monthly-based calculation
      const remainingMonths = Math.max(contractMonths - 1, 0);
      calculatedContractTotal = firstMonthPrice + remainingMonths * monthlyRecurring;
    }

    // Use custom override if set
    const contractTotal = form.customContractTotal !== undefined
      ? form.customContractTotal
      : calculatedContractTotal;

    // ----------------------------
    // 7) Annual + weekly approximations (not main focus now)
    // ----------------------------
    const annualPrice = monthlyRecurring * 12;

    const weeklyServiceTotal =
      calculatedMonthlyService / (actualWeeksPerMonth || 4.33);
    const weeklyTotalWithChemicals =
      annualPrice / actualWeeksPerYear;

    const calc: MicrofiberMoppingCalcResult = {
      standardBathroomPrice,
      hugeBathroomPrice,
      bathroomPrice,
      extraAreaPrice,
      standaloneServicePrice,
      standaloneTripCharge,
      standaloneTotal,
      chemicalSupplyMonthly,
      weeklyServiceTotal,
      weeklyTotalWithChemicals,
      perVisitPrice,
      annualPrice,
      monthlyRecurring,
      firstVisitPrice,
      firstMonthPrice,
      contractMonths,
      contractTotal,
    };

    const quote: ServiceQuoteResult = {
      ...(calc as any),
      serviceId: (form as any).serviceId ?? cfg.serviceType,
      serviceKey: "microfiberMopping",
      serviceLabel: "Microfiber Mopping",
      frequency: freq,
      perVisit: perVisitPrice,
      monthly: monthlyRecurring,
    } as unknown as ServiceQuoteResult;

    return { calc, quote };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form,
  ]);

  return {
    form,
    setForm,
    onChange,
    quote,
    calc,
    refreshConfig: fetchPricing,
    isLoadingConfig,
  };
}

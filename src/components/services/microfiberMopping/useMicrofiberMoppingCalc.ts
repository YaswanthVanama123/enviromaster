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

// API base URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendMicrofiberConfig {
  includedBathroomRate: number;
  hugeBathroomPricing: {
    enabled: boolean;
    ratePerSqFt: number;
    sqFtUnit: number;
    description: string;
  };
  extraAreaPricing: {
    singleLargeAreaRate: number;
    extraAreaSqFtUnit: number;
    extraAreaRatePerUnit: number;
    useHigherRate: boolean;
  };
  standalonePricing: {
    standaloneSqFtUnit: number;
    standaloneRatePerUnit: number;
    standaloneMinimum: number;
    includeTripCharge: boolean;
  };
  chemicalProducts: {
    dailyChemicalPerGallon: number;
    customerSelfMopping: boolean;
    waterOnlyBetweenServices: boolean;
  };
  billingConversions: {
    weekly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    biweekly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    monthly: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
    actualWeeksPerYear: number;
    actualWeeksPerMonth: number;
  };
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
  defaultFrequency: string;
  allowedFrequencies: string[];
}

type InputChangeEvent =
  | ChangeEvent<HTMLInputElement>
  | ChangeEvent<HTMLSelectElement>;

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
  standaloneSqFt: 0,
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

  // ✅ Fetch COMPLETE pricing configuration from backend on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/service-configs/active?serviceId=microfiberMopping`);

        if (!response.ok) {
          console.warn('⚠️ Microfiber Mopping config not found in backend, using default fallback values');
          return;
        }

        const data = await response.json();

        if (data && data.config) {
          const config = data.config as BackendMicrofiberConfig;

          // ✅ Store the ENTIRE backend config for use in calculations
          setBackendConfig(config);

          setForm((prev) => ({
            ...prev,
            // Update all rate fields from backend if available
            includedBathroomRate: config.includedBathroomRate ?? prev.includedBathroomRate,
            hugeBathroomRatePerSqFt: config.hugeBathroomPricing?.ratePerSqFt ?? prev.hugeBathroomRatePerSqFt,
            extraAreaRatePerUnit: config.extraAreaPricing?.extraAreaRatePerUnit ?? prev.extraAreaRatePerUnit,
            standaloneRatePerUnit: config.standalonePricing?.standaloneRatePerUnit ?? prev.standaloneRatePerUnit,
            dailyChemicalPerGallon: config.chemicalProducts?.dailyChemicalPerGallon ?? prev.dailyChemicalPerGallon,
          }));

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
        }
      } catch (error) {
        console.error('❌ Failed to fetch Microfiber Mopping config from backend:', error);
        console.log('⚠️ Using default hardcoded values as fallback');
      }
    };

    fetchPricing();
  }, []); // Run once on mount

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
    const activeConfig = backendConfig || {
      includedBathroomRate: cfg.includedBathroomRate,
      hugeBathroomPricing: cfg.hugeBathroomPricing,
      extraAreaPricing: cfg.extraAreaPricing,
      standalonePricing: cfg.standalonePricing,
      chemicalProducts: cfg.chemicalProducts,
      billingConversions: cfg.billingConversions,
      rateCategories: cfg.rateCategories,
      defaultFrequency: cfg.defaultFrequency,
      allowedFrequencies: cfg.allowedFrequencies,
    };

    const freq: MicrofiberFrequencyKey = form.frequency ?? activeConfig.defaultFrequency;

    // ✅ BILLING CONVERSION FROM BACKEND (NOT HARDCODED!)
    let conv = activeConfig.billingConversions.weekly;
    if (freq === "biweekly") conv = activeConfig.billingConversions.biweekly;
    else if (freq === "monthly") conv = activeConfig.billingConversions.monthly;

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
    // 2) Extra non-bath area - BASE CALCULATIONS
    // Rule: $100 OR $10 per 400 sq ft, whichever is more.
    // ----------------------------
    let calculatedExtraAreaPrice = 0;

    if (!isAllInclusive && form.extraAreaSqFt > 0) {
      const units = Math.ceil(
        form.extraAreaSqFt / activeConfig.extraAreaPricing.extraAreaSqFtUnit  // ✅ FROM BACKEND
      );
      const unitPrice = units * form.extraAreaRatePerUnit;

      calculatedExtraAreaPrice = activeConfig.extraAreaPricing.useHigherRate  // ✅ FROM BACKEND
        ? Math.max(unitPrice, activeConfig.extraAreaPricing.singleLargeAreaRate)  // ✅ FROM BACKEND
        : unitPrice;
    }

    // Use custom override if set
    const extraAreaPrice = form.customExtraAreaTotal !== undefined
      ? form.customExtraAreaTotal
      : calculatedExtraAreaPrice;

    // ----------------------------
    // 3) Stand-alone microfiber mopping - BASE CALCULATIONS
    // Rule (base): $10 per 200 sq ft, $40 minimum.
    // Trip charge is now removed from the math (always 0).
    // ----------------------------
    let calculatedStandaloneServicePrice = 0;
    let standaloneTripCharge = 0;
    let calculatedStandaloneTotal = 0;

    if (!isAllInclusive && form.standaloneSqFt > 0) {
      const units = Math.ceil(
        form.standaloneSqFt / activeConfig.standalonePricing.standaloneSqFtUnit  // ✅ FROM BACKEND
      );
      const servicePrice = units * form.standaloneRatePerUnit;
      const basePrice = Math.max(
        servicePrice,
        activeConfig.standalonePricing.standaloneMinimum  // ✅ FROM BACKEND
      );

      calculatedStandaloneServicePrice = basePrice;

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
    // ----------------------------
    const monthlyVisits = conv.monthlyMultiplier; // 4.33, ~2.17 or 1
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

    // First month = (monthlyVisits) × normal service price + chemical
    const calculatedFirstMonthService = Math.max(monthlyVisits, 0) * perVisitPrice;
    const calculatedFirstMonthPrice =
      firstVisitPrice + calculatedFirstMonthService + chemicalSupplyMonthly;

    // Use custom override if set
    const firstMonthPrice = form.customFirstMonthPrice !== undefined
      ? form.customFirstMonthPrice
      : calculatedFirstMonthPrice;

    // Contract term (2–36 months)
    let contractMonths = Number(form.contractTermMonths) || 0;
    if (contractMonths < 2) contractMonths = 2;
    if (contractMonths > 36) contractMonths = 36;

    const remainingMonths = Math.max(contractMonths - 1, 0);
    const calculatedContractTotal =
      firstMonthPrice + remainingMonths * monthlyRecurring;

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

  return { form, setForm, onChange, quote, calc };
}

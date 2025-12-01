// src/features/services/stripWax/useStripWaxCalc.ts
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { stripWaxPricingConfig as cfg } from "./stripWaxConfig";
import type {
  StripWaxFrequencyKey,
  StripWaxRateCategory,
  StripWaxServiceVariant,
  StripWaxFormState,
} from "./stripWaxTypes";
import { serviceConfigApi } from "../../../backendservice/api";

// ✅ Backend config interface matching your MongoDB JSON structure
interface BackendStripWaxConfig {
  weeksPerMonth: number;
  minContractMonths: number;
  maxContractMonths: number;
  defaultFrequency: string;
  defaultVariant: string;
  variants: {
    standardFull: {
      label: string;
      ratePerSqFt: number;
      minCharge: number;
    };
    noSealant: {
      label: string;
      ratePerSqFt: number;
      minCharge: number;
    };
    wellMaintained: {
      label: string;
      ratePerSqFt: number;
      minCharge: number;
    };
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
}

export interface StripWaxCalcResult {
  /** Per-visit revenue (service only). */
  perVisit: number;

  /** First month total (same as ongoing here). */
  monthly: number;

  /** Contract total for selected number of months. */
  annual: number;

  /** First visit revenue (same as perVisit for this service). */
  firstVisit: number;

  /** Ongoing monthly after first month. */
  ongoingMonthly: number;

  /** Contract total (same as annual). */
  contractTotal: number;

  /** Raw area × rate before applying min charge. */
  rawPrice: number;
}

const DEFAULT_FORM_STATE: StripWaxFormState = {
  floorAreaSqFt: 0,
  ratePerSqFt: cfg.variants[cfg.defaultVariant].ratePerSqFt,
  minCharge: cfg.variants[cfg.defaultVariant].minCharge,
  serviceVariant: cfg.defaultVariant,
  frequency: cfg.defaultFrequency,
  rateCategory: "redRate",
  contractMonths: cfg.minContractMonths ?? 12,

  // ✅ NEW: Editable pricing rates from config (will be overridden by backend)
  weeksPerMonth: cfg.weeksPerMonth,
  standardFullRatePerSqFt: cfg.variants.standardFull.ratePerSqFt,
  standardFullMinCharge: cfg.variants.standardFull.minCharge,
  noSealantRatePerSqFt: cfg.variants.noSealant.ratePerSqFt,
  noSealantMinCharge: cfg.variants.noSealant.minCharge,
  wellMaintainedRatePerSqFt: cfg.variants.wellMaintained.ratePerSqFt,
  wellMaintainedMinCharge: cfg.variants.wellMaintained.minCharge,
  redRateMultiplier: cfg.rateCategories.redRate.multiplier,
  greenRateMultiplier: cfg.rateCategories.greenRate.multiplier,
};

export function useStripWaxCalc(initialData?: Partial<StripWaxFormState>) {
  const [form, setForm] = useState<StripWaxFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });

  // ✅ State to store ALL backend config (NO hardcoded values in calculations)
  const [backendConfig, setBackendConfig] = useState<BackendStripWaxConfig | null>(null);

  // ✅ Fetch COMPLETE pricing configuration from backend on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const data = await serviceConfigApi.getActive("stripWax");

        if (!data || typeof data !== "object" || !("config" in data)) {
          console.warn('⚠️ Strip Wax config not found in backend, using default fallback values');
          return;
        }

        const config = data.config as BackendStripWaxConfig;

        // ✅ Store the ENTIRE backend config for use in calculations
        setBackendConfig(config);

        setForm((prev) => ({
          ...prev,
          // Update all rate fields from backend if available
          weeksPerMonth: config.weeksPerMonth ?? prev.weeksPerMonth,
          standardFullRatePerSqFt: config.variants?.standardFull?.ratePerSqFt ?? prev.standardFullRatePerSqFt,
          standardFullMinCharge: config.variants?.standardFull?.minCharge ?? prev.standardFullMinCharge,
          noSealantRatePerSqFt: config.variants?.noSealant?.ratePerSqFt ?? prev.noSealantRatePerSqFt,
          noSealantMinCharge: config.variants?.noSealant?.minCharge ?? prev.noSealantMinCharge,
          wellMaintainedRatePerSqFt: config.variants?.wellMaintained?.ratePerSqFt ?? prev.wellMaintainedRatePerSqFt,
          wellMaintainedMinCharge: config.variants?.wellMaintained?.minCharge ?? prev.wellMaintainedMinCharge,
          redRateMultiplier: config.rateCategories?.redRate?.multiplier ?? prev.redRateMultiplier,
          greenRateMultiplier: config.rateCategories?.greenRate?.multiplier ?? prev.greenRateMultiplier,
        }));

        console.log('✅ Strip Wax FULL CONFIG loaded from backend:', {
          weeksPerMonth: config.weeksPerMonth,
          variants: config.variants,
          rateCategories: config.rateCategories,
        });
      } catch (error) {
        console.error('❌ Failed to fetch Strip Wax config from backend:', error);
        console.log('⚠️ Using default hardcoded values as fallback');
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
      const next: StripWaxFormState = { ...prev };

      // Special handling when service type changes: reset rate + minimum FROM FORM VALUES
      if (name === "serviceVariant") {
        const variantKey = t.value as StripWaxServiceVariant;
        next.serviceVariant = variantKey;

        // ✅ USE FORM VALUES (from backend) instead of cfg
        if (variantKey === "standardFull") {
          next.ratePerSqFt = prev.standardFullRatePerSqFt;
          next.minCharge = prev.standardFullMinCharge;
        } else if (variantKey === "noSealant") {
          next.ratePerSqFt = prev.noSealantRatePerSqFt;
          next.minCharge = prev.noSealantMinCharge;
        } else if (variantKey === "wellMaintained") {
          next.ratePerSqFt = prev.wellMaintainedRatePerSqFt;
          next.minCharge = prev.wellMaintainedMinCharge;
        }
        return next;
      }

      if (type === "checkbox") {
        (next as any)[name] = t.checked;
      } else if (type === "number") {
        const raw = t.value;
        const num = raw === "" ? 0 : Number(raw);
        (next as any)[name] = Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        (next as any)[name] = t.value;
      }

      return next;
    });
  };

  const calc: StripWaxCalcResult = useMemo(() => {
    // ========== ✅ USE BACKEND CONFIG (if loaded), otherwise fallback to hardcoded ==========
    const activeConfig = backendConfig || {
      weeksPerMonth: cfg.weeksPerMonth,
      minContractMonths: cfg.minContractMonths,
      maxContractMonths: cfg.maxContractMonths,
      defaultFrequency: cfg.defaultFrequency,
      defaultVariant: cfg.defaultVariant,
      variants: cfg.variants,
      rateCategories: cfg.rateCategories,
    };

    const areaSqFt = Math.max(0, Number(form.floorAreaSqFt) || 0);

    // If no footage entered, everything should be 0.
    if (areaSqFt === 0) {
      return {
        perVisit: 0,
        monthly: 0,
        annual: 0,
        firstVisit: 0,
        ongoingMonthly: 0,
        contractTotal: 0,
        rawPrice: 0,
      };
    }

    // ✅ USE FORM VALUES (from backend) for rate multipliers
    const rateCfg = {
      multiplier: form.rateCategory === "greenRate"
        ? form.greenRateMultiplier
        : form.redRateMultiplier,
    };

    const weeksPerMonth = form.weeksPerMonth;  // ✅ USE FORM VALUE (from backend)

    // ✅ Calculate visits per month based on frequency
    let monthlyVisits = 0;
    if (form.frequency === "weekly") {
      monthlyVisits = weeksPerMonth;  // 4.33 visits/month
    } else if (form.frequency === "biweekly") {
      monthlyVisits = weeksPerMonth / 2;  // ~2.165 visits/month
    } else if (form.frequency === "monthly") {
      monthlyVisits = 1;  // 1 visit/month
    } else {
      monthlyVisits = weeksPerMonth;  // default to weekly
    }
    const getVariantConfig = (variant: StripWaxServiceVariant) => {
      if (variant === "standardFull") {
        return {
          ratePerSqFt: form.standardFullRatePerSqFt,
          minCharge: form.standardFullMinCharge,
        };
      } else if (variant === "noSealant") {
        return {
          ratePerSqFt: form.noSealantRatePerSqFt,
          minCharge: form.noSealantMinCharge,
        };
      } else {
        return {
          ratePerSqFt: form.wellMaintainedRatePerSqFt,
          minCharge: form.wellMaintainedMinCharge,
        };
      }
    };

    const variantCfg = getVariantConfig(form.serviceVariant);

    const ratePerSqFt =
      form.ratePerSqFt > 0
        ? form.ratePerSqFt
        : variantCfg.ratePerSqFt;

    const minCharge =
      form.minCharge > 0 ? form.minCharge : variantCfg.minCharge;

    const rawPriceRed = areaSqFt * ratePerSqFt;

    const perVisitRed = Math.max(rawPriceRed, minCharge);

    const perVisit = perVisitRed * rateCfg.multiplier;

    const firstVisit = perVisit;

    // monthlyVisits already calculated above based on frequency

    const firstMonth = monthlyVisits * perVisit;
    const ongoingMonthly = monthlyVisits * perVisit;

    const minMonths = activeConfig.minContractMonths ?? 2;  // ✅ USE ACTIVE CONFIG (from backend)
    const maxMonths = activeConfig.maxContractMonths ?? 36;  // ✅ USE ACTIVE CONFIG (from backend)
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
      firstVisit,
      ongoingMonthly,
      contractTotal,
      rawPrice: rawPriceRed,
    };
  }, [
    backendConfig,  // ✅ CRITICAL: Re-calculate when backend config loads!
    form.floorAreaSqFt,
    form.ratePerSqFt,
    form.minCharge,
    form.serviceVariant,
    form.frequency,
    form.rateCategory,
    form.contractMonths,
    // ✅ NEW: Editable rate fields (from backend)
    form.weeksPerMonth,
    form.standardFullRatePerSqFt,
    form.standardFullMinCharge,
    form.noSealantRatePerSqFt,
    form.noSealantMinCharge,
    form.wellMaintainedRatePerSqFt,
    form.wellMaintainedMinCharge,
    form.redRateMultiplier,
    form.greenRateMultiplier,
  ]);

  return { form, onChange, calc };
}

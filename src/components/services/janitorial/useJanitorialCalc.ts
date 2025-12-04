// src/components/services/janitorial/useJanitorialCalc.ts
import { useState, useEffect, useMemo, ChangeEvent } from "react";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type {
  JanitorialFormState,
  JanitorialQuoteResult,
  JanitorialCalcDetails,
  JanitorialPricingConfig
} from "./janitorialTypes";

// Backend interface (matches MongoDB structure)
interface BackendJanitorialConfig {
  baseRates: {
    recurringService: number;
    oneTimeService: number;
  };
  additionalServices: {
    vacuuming: {
      baseHours: number;
      ratePerHour: number;
    };
    dusting: {
      baseHours: number;
      ratePerHour: number;
    };
  };
  frequencyMultipliers: Record<string, number>;
  billingConversions: Record<string, number>;
  minimums: {
    perVisit: number;
    recurringContract: number;
  };
  tripCharges: {
    standard: number;
    insideBeltway: number;
    paidParking: number;
  };
}

// Default form state (from config)
const DEFAULT_FORM: JanitorialFormState = {
  serviceId: "janitorial",

  // Business logic fields
  serviceType: "recurringService",
  frequency: "weekly",
  location: "insideBeltway",
  contractMonths: 12,
  baseHours: 5.07,
  vacuumingHours: 4,
  dustingHours: 2,
  needsParking: false,
  parkingCost: 0,

  // Editable pricing rates (initialized from config)
  recurringServiceRate: cfg.baseRates.recurringService,
  oneTimeServiceRate: cfg.baseRates.oneTimeService,
  vacuumingRatePerHour: cfg.additionalServices.vacuuming.ratePerHour,
  dustingRatePerHour: cfg.additionalServices.dusting.ratePerHour,

  // Frequency multipliers
  dailyMultiplier: cfg.frequencyMultipliers.daily,
  weeklyMultiplier: cfg.frequencyMultipliers.weekly,
  biweeklyMultiplier: cfg.frequencyMultipliers.biweekly,
  monthlyMultiplier: cfg.frequencyMultipliers.monthly,
  oneTimeMultiplier: cfg.frequencyMultipliers.oneTime,

  // Minimums
  perVisitMinimum: cfg.minimums.perVisit,
  recurringContractMinimum: cfg.minimums.recurringContract,

  // Trip charges
  standardTripCharge: cfg.tripCharges.standard,
  beltwayTripCharge: cfg.tripCharges.insideBeltway,
  paidParkingTripCharge: cfg.tripCharges.paidParking,
};

// Simulated service config API call (replace with actual API)
const serviceConfigApi = {
  async getActive(serviceId: string): Promise<{ error: null, data: { config: BackendJanitorialConfig } } | { error: string }> {
    try {
      // Replace with actual API call
      const response = await fetch(`/api/service-config/active/${serviceId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return { error: null, data };
    } catch (error) {
      console.warn('Using default config fallback:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};

// Main hook
export function useJanitorialCalc(initial?: Partial<JanitorialFormState>) {
  // State
  const [form, setForm] = useState<JanitorialFormState>(() => ({
    ...DEFAULT_FORM,
    ...initial
  }));

  const [backendConfig, setBackendConfig] = useState<BackendJanitorialConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Fetch pricing from backend on mount
  const fetchPricing = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await serviceConfigApi.getActive("janitorial");
      if ('error' in response || !response.data) {
        console.warn('Using default fallback values');
        return;
      }

      const config = response.data.config as BackendJanitorialConfig;
      setBackendConfig(config);

      // Update form with backend values
      setForm((prev) => ({
        ...prev,
        recurringServiceRate: config.baseRates?.recurringService ?? prev.recurringServiceRate,
        oneTimeServiceRate: config.baseRates?.oneTimeService ?? prev.oneTimeServiceRate,
        vacuumingRatePerHour: config.additionalServices?.vacuuming?.ratePerHour ?? prev.vacuumingRatePerHour,
        dustingRatePerHour: config.additionalServices?.dusting?.ratePerHour ?? prev.dustingRatePerHour,

        dailyMultiplier: config.frequencyMultipliers?.daily ?? prev.dailyMultiplier,
        weeklyMultiplier: config.frequencyMultipliers?.weekly ?? prev.weeklyMultiplier,
        biweeklyMultiplier: config.frequencyMultipliers?.biweekly ?? prev.biweeklyMultiplier,
        monthlyMultiplier: config.frequencyMultipliers?.monthly ?? prev.monthlyMultiplier,
        oneTimeMultiplier: config.frequencyMultipliers?.oneTime ?? prev.oneTimeMultiplier,

        perVisitMinimum: config.minimums?.perVisit ?? prev.perVisitMinimum,
        recurringContractMinimum: config.minimums?.recurringContract ?? prev.recurringContractMinimum,

        standardTripCharge: config.tripCharges?.standard ?? prev.standardTripCharge,
        beltwayTripCharge: config.tripCharges?.insideBeltway ?? prev.beltwayTripCharge,
        paidParkingTripCharge: config.tripCharges?.paidParking ?? prev.paidParkingTripCharge,
      }));
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchPricing();
  }, []);

  // onChange handler for form inputs
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = 'checked' in e.target ? e.target.checked : false;

    setForm((prev) => {
      let next: JanitorialFormState = { ...prev };

      switch (name) {
        case "needsParking":
          next = { ...next, [name]: type === "checkbox" ? checked : !!value };
          break;

        case "baseHours":
        case "vacuumingHours":
        case "dustingHours":
        case "contractMonths":
        case "parkingCost":
        case "recurringServiceRate":
        case "oneTimeServiceRate":
        case "vacuumingRatePerHour":
        case "dustingRatePerHour":
        case "perVisitMinimum":
        case "recurringContractMinimum":
        case "standardTripCharge":
        case "beltwayTripCharge":
        case "paidParkingTripCharge":
        case "dailyMultiplier":
        case "weeklyMultiplier":
        case "biweeklyMultiplier":
        case "monthlyMultiplier":
        case "oneTimeMultiplier": {
          const num = value === "" ? 0 : Number(value);
          next = { ...next, [name]: Number.isFinite(num) ? num : 0 };
          break;
        }

        case "serviceType":
        case "frequency":
        case "location":
          next = { ...next, [name]: value as any };
          break;

        default:
          next = { ...next, [name]: value };
          break;
      }

      return next;
    });
  };

  // Calculate pricing (memoized for performance)
  const { quote, calc } = useMemo(() => {
    const appliedRules: string[] = [];

    // Use backend config if loaded, otherwise use form values (which came from config)

    // 1. Base service cost
    const baseRate = form.serviceType === "recurringService"
      ? form.recurringServiceRate
      : form.oneTimeServiceRate;
    const baseServiceCost = form.baseHours * baseRate;
    appliedRules.push(`Base: ${form.baseHours} hrs @ $${baseRate}/hr = $${baseServiceCost.toFixed(2)}`);

    // 2. Additional services
    const vacuumingCost = form.vacuumingHours * form.vacuumingRatePerHour;
    const dustingCost = form.dustingHours * form.dustingRatePerHour;

    if (vacuumingCost > 0) {
      appliedRules.push(`Vacuuming: ${form.vacuumingHours} hrs @ $${form.vacuumingRatePerHour}/hr = $${vacuumingCost.toFixed(2)}`);
    }
    if (dustingCost > 0) {
      appliedRules.push(`Dusting: ${form.dustingHours} hrs @ $${form.dustingRatePerHour}/hr = $${dustingCost.toFixed(2)}`);
    }

    // 3. Subtotal
    const subtotal = baseServiceCost + vacuumingCost + dustingCost;

    // 4. Apply frequency multiplier
    const frequencyMultiplier = (() => {
      switch (form.frequency) {
        case "daily": return form.dailyMultiplier;
        case "weekly": return form.weeklyMultiplier;
        case "biweekly": return form.biweeklyMultiplier;
        case "monthly": return form.monthlyMultiplier;
        case "oneTime": return form.oneTimeMultiplier;
        default: return 1.0;
      }
    })();

    const adjustedSubtotal = subtotal * frequencyMultiplier;
    if (frequencyMultiplier !== 1.0) {
      appliedRules.push(`${form.frequency} multiplier: ×${frequencyMultiplier} = $${adjustedSubtotal.toFixed(2)}`);
    }

    // 5. Trip charge
    const tripCharge = (() => {
      if (form.location === "paidParking") {
        const total = form.paidParkingTripCharge + form.parkingCost;
        if (form.parkingCost > 0) {
          appliedRules.push(`Trip: $${form.paidParkingTripCharge} + $${form.parkingCost} parking = $${total.toFixed(2)}`);
        }
        return total;
      }
      if (form.location === "insideBeltway") {
        appliedRules.push(`Trip: Inside Beltway = $${form.beltwayTripCharge}`);
        return form.beltwayTripCharge;
      }
      appliedRules.push(`Trip: Standard = $${form.standardTripCharge}`);
      return form.standardTripCharge;
    })();

    // 6. Per visit total
    let perVisitTotal = adjustedSubtotal + tripCharge;

    // 7. Apply minimums
    if (perVisitTotal < form.perVisitMinimum) {
      appliedRules.push(`Minimum per visit: $${form.perVisitMinimum}`);
      perVisitTotal = form.perVisitMinimum;
    }

    // 8. Calculate periodic totals
    const visitsPerYear = (() => {
      switch (form.frequency) {
        case "daily": return 250; // business days
        case "weekly": return 50;
        case "biweekly": return 25;
        case "monthly": return 12;
        case "oneTime": return 1;
        default: return 50;
      }
    })();

    const monthlyTotal = (perVisitTotal * visitsPerYear) / 12;
    const annualTotal = perVisitTotal * visitsPerYear;
    const contractTotal = monthlyTotal * form.contractMonths;

    // 9. Apply contract minimum
    if (form.serviceType === "recurringService" && contractTotal < form.recurringContractMinimum) {
      appliedRules.push(`Contract minimum: $${form.recurringContractMinimum} (${form.contractMonths} months)`);
    }

    const calc: JanitorialCalcDetails = {
      baseServiceCost,
      vacuumingCost,
      dustingCost,
      subtotal,
      frequencyMultiplier,
      adjustedSubtotal,
      tripCharge,
      perVisitTotal,
      monthlyTotal,
      annualTotal,
      contractTotal: Math.max(contractTotal, form.recurringContractMinimum),
      appliedRules,
    };

    const quote: JanitorialQuoteResult = {
      perVisitPrice: perVisitTotal,
      monthlyPrice: monthlyTotal,
      annualPrice: annualTotal,
      contractTotal: calc.contractTotal,
      detailsBreakdown: appliedRules,
    };

    return { quote, calc };
  }, [
    // ALL form fields that affect calculation
    form.serviceType,
    form.frequency,
    form.location,
    form.contractMonths,
    form.baseHours,
    form.vacuumingHours,
    form.dustingHours,
    form.needsParking,
    form.parkingCost,
    form.recurringServiceRate,
    form.oneTimeServiceRate,
    form.vacuumingRatePerHour,
    form.dustingRatePerHour,
    form.dailyMultiplier,
    form.weeklyMultiplier,
    form.biweeklyMultiplier,
    form.monthlyMultiplier,
    form.oneTimeMultiplier,
    form.perVisitMinimum,
    form.recurringContractMinimum,
    form.standardTripCharge,
    form.beltwayTripCharge,
    form.paidParkingTripCharge,
  ]);

  // Return everything
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

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { janitorialPricingConfig as cfg } from "./janitorialConfig";
import type {
  JanitorialFormState,
  JanitorialAdminRates,
  JanitorialCalcResult,
  JanitorialSupplyItem,
} from "./janitorialTypes";
import { useServicesContextOptional } from "../ServicesContext";

export type { JanitorialFormState };

const DEFAULT_SUPPLIES: JanitorialSupplyItem[] = [
  { name: "Vacuums",           amount: 100 },
  { name: "Mops",              amount: 500 },
  { name: "Mop Buckets",       amount: 200 },
  { name: "Dust Mops",         amount: 300 },
  { name: "Microfiber",        amount: 0 },
  { name: "Cleaning Products", amount: 0 },
  { name: "Consumables",       amount: 0 },
  { name: "Miscellaneous",     amount: 0 },
];

export { DEFAULT_SUPPLIES };

const DEFAULT_ADMIN_RATES: JanitorialAdminRates = {
  productionRates: {},
  costPerHour:     20,
  laborTaxPct:     15,
  grossProfitPct:  33,
  defaultSupplies: DEFAULT_SUPPLIES,
};

function buildAdminRates(config: any): JanitorialAdminRates {
  
  const adminOverrides = config?.defaultSupplies ?? {};
  const defaultSupplies: JanitorialSupplyItem[] = DEFAULT_SUPPLIES.map(item => {
    
    const key = item.name.replace(/\s+/g, "").charAt(0).toLowerCase() +
                item.name.replace(/\s+/g, "").slice(1);
    
    const variants = [
      key,
      item.name.toLowerCase().replace(/\s+/g, ""),
      item.name.toLowerCase().replace(/\s+/g, "_"),
    ];
    for (const v of variants) {
      if (adminOverrides[v] !== undefined) {
        return { ...item, amount: Number(adminOverrides[v]) };
      }
    }
    return item;
  });

  return {
    productionRates: config?.productionRates ?? {},
    costPerHour:    config?.costPerHour    ?? 20,
    laborTaxPct:    config?.laborTaxPct    ?? 15,
    grossProfitPct: config?.grossProfitPct ?? 33,
    defaultSupplies,
  };
}

export function computeJanitorialCalc(
  form: JanitorialFormState,
  adminRates: JanitorialAdminRates,
): JanitorialCalcResult {
  const productionRate = adminRates.productionRates[form.placeType] ?? 0;
  console.log("[JAN DEBUG] placeType:", form.placeType, "| productionRates:", JSON.stringify(adminRates.productionRates), "| rate:", productionRate, "| sqFt:", form.sqFt);
  const hoursPerVisit = productionRate > 0 ? form.sqFt / productionRate : 0;

  const perOccurrenceLabor = hoursPerVisit * form.costPerHour * form.visitsPerWeek;

  const freqConversion = cfg.billingConversions[form.frequency] ?? cfg.billingConversions.weekly;
  const annualMultiplier = freqConversion.annualMultiplier;

  const weeklyLabor = perOccurrenceLabor; 
  const annualBaseLabor = perOccurrenceLabor * annualMultiplier;
  const annualLaborTax = annualBaseLabor * (form.laborTaxPct / 100);
  const totalAnnualSupplies = form.supplies.reduce((s, x) => s + x.amount, 0);
  const totalAnnualCost = annualBaseLabor + annualLaborTax + totalAnnualSupplies;
  const gp = Math.min(Math.max(form.grossProfitPct / 100, 0), 0.999);
  const annualContractValue = gp < 1 ? totalAnnualCost / (1 - gp) : 0;

  let contractTotal: number;
  if (form.frequency === "oneTime") {
    contractTotal = annualContractValue; 
  } else {
    contractTotal = annualContractValue * form.contractMonths / 12;
  }

  const grossProfit = annualContractValue - totalAnnualCost;
  const monthlyRecurring = (form.frequency !== "oneTime" && form.contractMonths > 0)
    ? contractTotal / form.contractMonths
    : 0;

  const perVisit = annualMultiplier > 0 ? annualContractValue / annualMultiplier : 0;

  const origPerOccurrenceLabor = hoursPerVisit * adminRates.costPerHour * form.visitsPerWeek;
  const origAnnualBaseLabor = origPerOccurrenceLabor * annualMultiplier;
  const origAnnualLaborTax = origAnnualBaseLabor * (adminRates.laborTaxPct / 100);
  const origTotalAnnualSupplies = adminRates.defaultSupplies.reduce((s, x) => s + x.amount, 0);
  const origTotalAnnualCost = origAnnualBaseLabor + origAnnualLaborTax + origTotalAnnualSupplies;
  const origGp = Math.min(Math.max(adminRates.grossProfitPct / 100, 0), 0.999);
  const origAnnualContractValue = origGp < 1 ? origTotalAnnualCost / (1 - origGp) : 0;
  let originalContractTotal: number;
  if (form.frequency === "oneTime") {
    originalContractTotal = origAnnualContractValue;
  } else {
    originalContractTotal = origAnnualContractValue * form.contractMonths / 12;
  }

  return {
    hoursPerVisit,
    weeklyLabor,
    annualBaseLabor,
    annualLaborTax,
    totalAnnualSupplies,
    totalAnnualCost,
    annualContractValue,
    contractTotal: form.customContractTotal ?? contractTotal,
    originalContractTotal,
    grossProfit,
    monthlyRecurring,
    perVisit,
  };
}

export function useJanitorialCalc(initialData?: Partial<JanitorialFormState>) {
  const servicesContext = useServicesContextOptional();

  const [adminRates, setAdminRates] = useState<JanitorialAdminRates>(DEFAULT_ADMIN_RATES);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const [form, setForm] = useState<JanitorialFormState>(() => ({
    frequency:      "weekly",
    visitsPerWeek:  1,
    placeType:      "office",
    sqFt:           0,
    costPerHour:    DEFAULT_ADMIN_RATES.costPerHour,
    laborTaxPct:    DEFAULT_ADMIN_RATES.laborTaxPct,
    grossProfitPct: DEFAULT_ADMIN_RATES.grossProfitPct,
    supplies:       DEFAULT_SUPPLIES,
    contractMonths: servicesContext?.globalContractMonths ?? cfg.minContractMonths ?? 12,
    ...initialData,
  }));

  useEffect(() => {
    console.log("[JAN DEBUG] useEffect fired | hasCtx:", !!servicesContext, "| hasFn:", !!servicesContext?.getBackendPricingForService, "| backendPricingData length:", servicesContext?.backendPricingData?.length);
    if (!servicesContext?.getBackendPricingForService) return;
    const data = servicesContext.getBackendPricingForService("pureJanitorial");
    console.log("[JAN DEBUG] getBackendPricingForService('pureJanitorial') =>", data ? JSON.stringify({ serviceId: data.serviceId, configKeys: Object.keys(data.config ?? {}) }) : null);
    if (data?.config) {
      const rates = buildAdminRates(data.config);
      console.log("[JAN DEBUG] buildAdminRates => productionRates:", JSON.stringify(rates.productionRates));
      setAdminRates(rates);
      const availableTypes = Object.keys(rates.productionRates);
      setForm(prev => ({
        ...prev,
        
        ...(availableTypes.length > 0 && !availableTypes.includes(prev.placeType)
          ? { placeType: availableTypes[0] }
          : {}),

        
        ...(!initialData ? {
          costPerHour:    rates.costPerHour,
          laborTaxPct:    rates.laborTaxPct,
          grossProfitPct: rates.grossProfitPct,
          supplies:       rates.defaultSupplies,
        } : {}),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesContext?.backendPricingData]);

  useEffect(() => {
    if (
      servicesContext?.globalContractMonths &&
      servicesContext.globalContractMonths !== form.contractMonths
    ) {
      setForm(prev => ({ ...prev, contractMonths: servicesContext.globalContractMonths }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesContext?.globalContractMonths]);

  const refreshConfig = () => {
    setIsLoadingConfig(true);
    try {
      if (servicesContext?.getBackendPricingForService) {
        const data = servicesContext.getBackendPricingForService("pureJanitorial");
        if (data?.config) {
          const rates = buildAdminRates(data.config);
          setAdminRates(rates);
        }
      }
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const t: any = e.target;
    setForm(prev => {
      const next = { ...prev } as any;
      if (type === "number") {
        const raw = t.value;
        const num = raw === "" ? 0 : Number(raw);
        next[name] = Number.isFinite(num) && num >= 0 ? num : 0;
      } else {
        next[name] = t.value;
      }
      return next;
    });
  };

  const calc: JanitorialCalcResult = useMemo(
    () => computeJanitorialCalc(form, adminRates),
    [form, adminRates],
  );

  return { form, setForm, onChange, calc, adminRates, refreshConfig, isLoadingConfig };
}


export type JanitorialFrequencyKey =
  | "oneTime"
  | "weekly"
  | "biweekly"
  | "twicePerMonth"
  | "monthly"
  | "everyFourWeeks"
  | "bimonthly"
  | "quarterly"
  | "biannual"
  | "annual";

export type JanitorialRateCategory = "redRate" | "greenRate";
export type SchedulingMode = "normalRoute" | "standalone";
export type ServiceType = "recurring" | "oneTime";

export interface JanitorialSupplyItem {
  name: string;
  amount: number;
}

export type JanitorialPlaceType = string;

export interface JanitorialFormState {
  frequency: JanitorialFrequencyKey;
  visitsPerWeek: number;
  placeType: string;
  sqFt: number;
  costPerHour: number;
  laborTaxPct: number;
  grossProfitPct: number;
  supplies: JanitorialSupplyItem[];
  contractMonths: number;
  notes?: string;
  customContractTotal?: number;
}

export interface JanitorialAdminRates {
  productionRates: Record<string, number>;
  costPerHour: number;
  laborTaxPct: number;
  grossProfitPct: number;
  defaultSupplies: JanitorialSupplyItem[];
}

export interface JanitorialCalcResult {
  hoursPerVisit: number;
  weeklyLabor: number;
  annualBaseLabor: number;
  annualLaborTax: number;
  totalAnnualSupplies: number;
  totalAnnualCost: number;
  annualContractValue: number;
  contractTotal: number;
  originalContractTotal: number;
  grossProfit: number;
  monthlyRecurring: number;
  perVisit: number;
}

export interface JanitorialRateCategoryConfig {
  multiplier: number;
  commissionRate: string;
}

export interface JanitorialPricingConfig {
  baseHourlyRate: number;
  shortJobHourlyRate: number;
  minHoursPerVisit: number;
  weeksPerMonth: number;
  minContractMonths: number;
  maxContractMonths: number;
  dirtyInitialMultiplier: number;
  infrequentMultiplier: number;
  defaultFrequency: JanitorialFrequencyKey;
  dustingPlacesPerHour: number;
  dustingPricePerPlace: number;
  vacuumingDefaultHours: number;
  billingConversions: {
    [key in JanitorialFrequencyKey]: {
      annualMultiplier: number;
      monthlyMultiplier: number;
    };
  };
  rateCategories: {
    redRate: JanitorialRateCategoryConfig;
    greenRate: JanitorialRateCategoryConfig;
  };
}

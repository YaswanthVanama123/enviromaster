
import type { BaseServiceFormState } from "../common/serviceTypes";

export type RefreshKitchenSize = "smallMedium" | "large";
export type RefreshPatioMode = "standalone" | "upsell";
export type RefreshPricingType = "preset" | "perWorker" | "perHour" | "squareFeet" | "custom";
export type RefreshFrequency =
  | "oneTime"
  | "weekly"
  | "biweekly"
  | "twicePerMonth"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "biannual"
  | "annual";

export type RefreshAreaKey =
  | "dumpster"
  | "patio"
  | "walkway"
  | "foh"
  | "boh"
  | "other";


export interface RefreshAreaCalcState {

  enabled: boolean;


  pricingType: RefreshPricingType;


  workers: number;
  hours: number;
  hourlyRate: number; 
  workerRate: number; 


  insideSqFt: number;
  outsideSqFt: number;
  insideRate: number; 
  outsideRate: number; 
  sqFtFixedFee: number; 


  customAmount: number;
  workerRateIsCustom?: boolean;
  hourlyRateIsCustom?: boolean;
  insideRateIsCustom?: boolean;
  outsideRateIsCustom?: boolean;
  sqFtFixedFeeIsCustom?: boolean;
  presetRateIsCustom?: boolean;
  smallMediumRateIsCustom?: boolean;
  largeRateIsCustom?: boolean;


  presetQuantity: number; 
  presetRate: number | undefined | null; 


  kitchenSize: RefreshKitchenSize; 
  smallMediumQuantity: number; 
  smallMediumRate: number | undefined | null; 
  smallMediumCustomAmount: number; 
  largeQuantity: number; 
  largeRate: number | undefined | null; 
  largeCustomAmount: number; 


  patioMode: RefreshPatioMode;

  includePatioAddon: boolean;

  patioAddonRate: number | undefined | null;


  frequencyLabel: string;


  contractMonths: number;
}


export interface RefreshPowerScrubFormState extends BaseServiceFormState {


  tripCharge: number;
  hourlyRate: number;
  minimumVisit: number;
  hourlyRateIsCustom?: boolean;
  minimumVisitIsCustom?: boolean;

  applyMinimum?: boolean;


  frequency: RefreshFrequency;
  contractMonths: number;


  dumpster: RefreshAreaCalcState;
  patio: RefreshAreaCalcState;
  walkway: RefreshAreaCalcState;
  foh: RefreshAreaCalcState;
  boh: RefreshAreaCalcState;
  other: RefreshAreaCalcState;
}


export interface RefreshAreaTotals {
  dumpster: number;
  patio: number;
  walkway: number;
  foh: number;
  boh: number;
  other: number;
}

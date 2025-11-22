// src/features/services/refreshPowerScrub/refreshPowerScrubTypes.ts
import type { BaseServiceFormState } from "../common/serviceTypes";

export type RefreshPricingMethod = "area_specific" | "hourly" | "square_footage";
export type RefreshRateType = "red_rate" | "green_rate";
export type RefreshKitchenSize = "smallMedium" | "large";
export type RefreshPatioMode = "standalone" | "upsell";

export type RefreshAreaKey =
  | "dumpster"
  | "patio"
  | "walkway"
  | "foh"
  | "boh"
  | "other";

// Each column (Dumpster, Patio, Walkway, FOH, BOH, Other) has its own calc config
export interface RefreshAreaCalcState {
  pricingMethod: RefreshPricingMethod;
  workers: number;
  hours: number;
  insideSqFt: number;
  outsideSqFt: number;
  kitchenSize: RefreshKitchenSize;
  patioMode: RefreshPatioMode;
  // purely for header table – free-text such as "Monthly", "Quarterly", etc.
  freqText: string;
}

// Full Refresh Power Scrub form state
export interface RefreshPowerScrubFormState extends BaseServiceFormState {
  rateType: RefreshRateType;
  tripCharge: number;
  minimumVisit: number;

  dumpster: RefreshAreaCalcState;
  patio: RefreshAreaCalcState;
  walkway: RefreshAreaCalcState;
  foh: RefreshAreaCalcState;
  boh: RefreshAreaCalcState;
  other: RefreshAreaCalcState;
}

// Per-column per-visit totals used by the header table
export interface RefreshAreaTotals {
  dumpster: number;
  patio: number;
  walkway: number;
  foh: number;
  boh: number;
  other: number;
}

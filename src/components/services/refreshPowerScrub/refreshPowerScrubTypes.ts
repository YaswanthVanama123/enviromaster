// src/features/services/refreshPowerScrub/refreshPowerScrubTypes.ts
import type { BaseServiceFormState } from "../common/serviceTypes";

export type RefreshKitchenSize = "smallMedium" | "large";
export type RefreshPatioMode = "standalone" | "upsell";

export type RefreshAreaKey =
  | "dumpster"
  | "patio"
  | "walkway"
  | "foh"
  | "boh"
  | "other";

// Per-column state used by the calculator / form
export interface RefreshAreaCalcState {
  /** Whether this column is included in the quote */
  enabled: boolean;

  /** Workers × hours, used when you want to price that column hourly */
  workers: number;
  hours: number;

  /** Square-footage, used when you want to price by sq-ft */
  insideSqFt: number;
  outsideSqFt: number;

  /** BOH specific */
  kitchenSize: RefreshKitchenSize;

  /** Patio specific */
  patioMode: RefreshPatioMode;

  /** Free-text label that shows up under the column (e.g. "Weekly", "Monthly") */
  frequencyLabel: string;
}

// Full Refresh Power Scrub form state
export interface RefreshPowerScrubFormState extends BaseServiceFormState {
  // Global config that implements the core rule:
  // $75 trip charge, $200/hr/worker, $475 minimum
  tripCharge: number;
  hourlyRate: number;
  minimumVisit: number;

  // Column-specific settings
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

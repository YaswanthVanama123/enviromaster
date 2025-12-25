// src/features/services/refreshPowerScrub/refreshPowerScrubTypes.ts
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

// Per-column state used by the calculator / form
export interface RefreshAreaCalcState {
  /** Whether this column is included in the quote */
  enabled: boolean;

  /** Pricing method for this column */
  pricingType: RefreshPricingType;

  /** Workers × hours, used when you want to price that column hourly */
  workers: number;
  hours: number;
  hourlyRate: number; // Custom hourly rate per service
  workerRate: number; // Custom rate per worker

  /** Square-footage, used when you want to price by sq-ft */
  insideSqFt: number;
  outsideSqFt: number;
  insideRate: number; // Custom rate per inside sq ft
  outsideRate: number; // Custom rate per outside sq ft
  sqFtFixedFee: number; // Custom fixed fee for sq ft pricing

  /** Custom manual amount */
  customAmount: number;
  workerRateIsCustom?: boolean;
  hourlyRateIsCustom?: boolean;
  insideRateIsCustom?: boolean;
  outsideRateIsCustom?: boolean;
  sqFtFixedFeeIsCustom?: boolean;
  presetRateIsCustom?: boolean;
  smallMediumRateIsCustom?: boolean;
  largeRateIsCustom?: boolean;

  /** Preset package calculation fields */
  presetQuantity: number; // Quantity for preset calculations
  presetRate: number | undefined | null; // Rate per unit (undefined = use backend default, null = user cleared it)

  /** BOH specific - allows BOTH small/medium AND large simultaneously */
  kitchenSize: RefreshKitchenSize; // For backward compatibility, tracks which was last edited
  smallMediumQuantity: number; // Quantity of small/medium kitchens
  smallMediumRate: number | undefined | null; // Rate for small/medium (undefined = backend default, null = cleared)
  smallMediumCustomAmount: number; // Custom override for small/medium total
  largeQuantity: number; // Quantity of large kitchens
  largeRate: number | undefined | null; // Rate for large (undefined = backend default, null = cleared)
  largeCustomAmount: number; // Custom override for large total

  /** Patio specific */
  patioMode: RefreshPatioMode;
  /** NEW: Whether to include the $500 patio add-on */
  includePatioAddon: boolean;
  /** NEW: Editable patio addon rate (undefined = use backend default, null = cleared) */
  patioAddonRate: number | undefined | null;

  /** Free-text label that shows up under the column (e.g. "Weekly", "Monthly") */
  frequencyLabel: string;

  /** Individual area contract settings */
  contractMonths: number;
}

// Full Refresh Power Scrub form state
export interface RefreshPowerScrubFormState extends BaseServiceFormState {
  // Global config that implements the core rule:
  // $75 trip charge, $200/hr/worker, $475 minimum
  tripCharge: number;
  hourlyRate: number;
  minimumVisit: number;
  hourlyRateIsCustom?: boolean;
  minimumVisitIsCustom?: boolean;

  // Global frequency and contract settings
  frequency: RefreshFrequency;
  contractMonths: number;

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

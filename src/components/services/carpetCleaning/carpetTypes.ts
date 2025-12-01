import type { BaseServiceFormState } from "../common/serviceTypes";

export type CarpetFrequency =
  | "monthly"
  | "twicePerMonth"
  | "bimonthly"
  | "quarterly";

export interface CarpetFrequencyMeta {
  // visits per YEAR (e.g., 12 for monthly, 24 for 2×/month, etc.)
  visitsPerYear: number;
}

/**
 * Static pricing config for Carpet Cleaning.
 * Core idea:
 *  - $250 for first 500 sq ft
 *  - $125 for each additional 500 sq ft
 *  - per-visit minimum $250
 */
export interface CarpetPricingConfig {
  unitSqFt: number; // 500 sq ft block
  firstUnitRate: number; // $250
  additionalUnitRate: number; // $125 for each extra 500 sq ft
  perVisitMinimum: number; // $250 min per visit

  // Installation multipliers (same as SaniScrub)
  installMultipliers: {
    dirty: number;  // 3× multiplier for dirty install
    clean: number;  // 1× multiplier for clean install
  };

  frequencyMeta: Record<CarpetFrequency, CarpetFrequencyMeta>;
}

/**
 * Live form state for one Carpet Cleaning card.
 */
export interface CarpetFormState extends BaseServiceFormState {
  serviceId: "carpetCleaning";

  // Total carpet area
  areaSqFt: number;

  // Selected service frequency
  frequency: CarpetFrequency;

  // Geography / trip logic (UI only – NOT used in math)
  location: "insideBeltway" | "outsideBeltway";
  needsParking: boolean;

  // Contract length in months (2–36)
  contractMonths: number;

  // Installation fee options (same as SaniScrub)
  includeInstall: boolean;
  isDirtyInstall: boolean;  // 3× multiplier vs 1× clean

  // ========== EDITABLE PRICING RATES (fetched from backend or config) ==========
  unitSqFt: number;                // 500 sq ft block
  firstUnitRate: number;           // $250 for first 500 sq ft
  additionalUnitRate: number;      // $125 for each additional 500 sq ft
  perVisitMinimum: number;         // $250 minimum per visit
  installMultiplierDirty: number;  // 3× for dirty install
  installMultiplierClean: number;  // 1× for clean install

  // ========== CUSTOM OVERRIDES (user can manually set totals) ==========
  customPerVisitPrice?: number;
  customMonthlyRecurring?: number;
  customFirstMonthPrice?: number;
  customContractTotal?: number;
  customInstallationFee?: number;
}

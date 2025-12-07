// src/features/services/stripWax/stripWaxTypes.ts

export type StripWaxFrequencyKey = "weekly" | "biweekly" | "monthly";
export type StripWaxRateCategory = "redRate" | "greenRate";

export type StripWaxServiceVariant =
  | "standardFull"
  | "noSealant"
  | "wellMaintained";

export interface StripWaxRateCategoryConfig {
  multiplier: number;
  commissionRate: string;
}

export interface StripWaxVariantConfig {
  label: string;
  ratePerSqFt: number;
  minCharge: number;
}

/**
 * Pricing config for Strip & Wax floor.
 *
 * - Standard full strip + sealant: 0.75/sq ft, min 550.
 * - No sealant (4th coat free / discount): 0.70/sq ft, min 550.
 * - Well-maintained partial strip: 0.40/sq ft, min 400.
 */
export interface StripWaxPricingConfig {
  weeksPerMonth: number;
  minContractMonths: number;
  maxContractMonths: number;

  // Floor area calculation unit (for exact vs direct calculation)
  floorAreaUnit: number; // 1000 sq ft blocks for exact calculation

  defaultFrequency: StripWaxFrequencyKey;
  defaultVariant: StripWaxServiceVariant;

  variants: {
    standardFull: StripWaxVariantConfig;
    noSealant: StripWaxVariantConfig;
    wellMaintained: StripWaxVariantConfig;
  };

  rateCategories: {
    redRate: StripWaxRateCategoryConfig;
    greenRate: StripWaxRateCategoryConfig;
  };
}

export interface StripWaxFormState {
  floorAreaSqFt: number;
  useExactFloorAreaSqft: boolean;  // true = exact calculation, false = direct pricing
  ratePerSqFt: number;
  minCharge: number;

  serviceVariant: StripWaxServiceVariant;

  frequency: StripWaxFrequencyKey;
  rateCategory: StripWaxRateCategory;

  /** Contract length in months (2–36). */
  contractMonths: number;

  // ========== EDITABLE PRICING RATES (fetched from backend or config) ==========
  weeksPerMonth: number;                           // 4.33 weeks per month
  standardFullRatePerSqFt: number;                 // $0.75 per sq ft
  standardFullMinCharge: number;                   // $550 minimum
  noSealantRatePerSqFt: number;                    // $0.70 per sq ft
  noSealantMinCharge: number;                      // $550 minimum
  wellMaintainedRatePerSqFt: number;               // $0.40 per sq ft
  wellMaintainedMinCharge: number;                 // $400 minimum
  redRateMultiplier: number;                       // red rate multiplier (1.0)
  greenRateMultiplier: number;                     // green rate multiplier (1.3)

  // ========== CUSTOM OVERRIDES (user can manually set totals) ==========
  customPerVisit?: number;
  customMonthly?: number;
  customOngoingMonthly?: number;
  customContractTotal?: number;
}

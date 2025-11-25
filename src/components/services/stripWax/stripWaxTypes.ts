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

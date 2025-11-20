// src/features/services/sanipod/sanipodTypes.ts
import type { BaseServiceFormState } from "../common/serviceTypes";

export type SanipodFrequencyKey = "weekly" | "biweekly" | "monthly";
export type SanipodRateCategory = "redRate" | "greenRate";
export type SanipodBundleType = "none" | "withSaniClean" | "allInclusive";

export interface SanipodPricingConfig {
  weeklyRatePerUnit: number;
  installChargePerUnit: number;
  extraBagPrice: number;
  standaloneMinimum: number;

  defaultFrequency: string;
  allowedFrequencies: string[];

  frequencyMultipliers: {
    weekly: number;
    biweekly: number;
    monthly: number;
  };

  annualFrequencies: {
    weekly: number;
    biweekly: number;
    monthly: number;
  };

  monthlyConversions: {
    weekly: number;
    actualWeeksPerMonth: number;
    actualWeeksPerYear: number;
  };

  tripCharge: {
    insideBeltway: number;
    outsideBeltway: number;
    parking: number;
  };

  rateCategories: {
    redRate: {
      multiplier: number;
      commissionRate: string;
    };
    greenRate: {
      multiplier: number;
      commissionRate: string;
    };
  };

  bundleOptions: {
    withSaniClean: {
      available: boolean;
      discountApplied: boolean;
      description: string;
    };
    allInclusive: {
      available: boolean;
      pricePerFixture: number;
      includes: string[];
      tripChargeWaived: boolean;
    };
  };

  installationOptions: {
    newInstall: {
      multiplier: number;
      cleanInstall: number;
    };
    canBeWaivedAsConcession: boolean;
  };

  businessRules: {
    alwaysIncludeTripCharge: boolean;
    authorizationRequiredBelowRed: boolean;
    authorizers: string[];
    minimumQuantityForDiscount: number;
  };

  contractOptions: {
    canIncludeInContract: boolean;
    compensateWithOtherServices: boolean;
  };

  relatedServices: {
    toiletClips: {
      pricePerMonth: number;
      description: string;
    };
    toiletSeatCoverDispensers: {
      pricePerMonth: number;
      description: string;
    };
  };

  geographicPricing: {
    insideBeltway: {
      baseRate: number;
      minimum: number;
      tripCharge: number;
    };
    outsideBeltway: {
      baseRate: number;
      tripCharge: number;
    };
  };
}

// What the SaniPod card edits
export interface SanipodFormState extends BaseServiceFormState {
  podQuantity: number;               // number of pods
  weeklyRatePerUnit: number;         // per-pod weekly rate (location-based)

  extraBagsPerWeek: number;          // extra bags each week
  extraBagPrice: number;             // price per extra bag

  isNewInstall: boolean;             // new install vs existing
  location: "insideBeltway" | "outsideBeltway";
  needsParking: boolean;

  selectedRateCategory: SanipodRateCategory;
  bundleType: SanipodBundleType;     // "none" | "withSaniClean" | "allInclusive"

  toiletClipsQty: number;            // monthly add-on
  seatCoverDispensersQty: number;    // monthly add-on
}

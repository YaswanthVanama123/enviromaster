// src/features/services/rpmWindows/rpmWindowsTypes.ts
import type { BaseServiceFormState } from "../common/serviceTypes";

export type RpmFrequencyKey = "weekly" | "biweekly" | "monthly" | "quarterly";
export type RpmRateCategory = "redRate" | "greenRate";

export interface RpmWindowPricingConfig {
  smallWindowRate: number;
  mediumWindowRate: number;
  largeWindowRate: number;

  tripCharge: number;

  installMultiplierFirstTime: number;
  installMultiplierClean: number;

  frequencyMultipliers: {
    weekly: number;
    biweekly: number;
    monthly: number;
    quarterly: number;
    quarterlyFirstTime: number;
  };

  annualFrequencies: {
    weekly: number;
    biweekly: number;
    monthly: number;
    quarterly: number;
  };

  monthlyConversions: {
    weekly: number;
    actualWeeksPerMonth: number;
    actualWeeksPerYear: number;
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

  allowedFrequencies: string[];

  additionalServices: {
    mirrorCleaning: boolean;
    mirrorCleaningRate: string;
  };

  businessRules: {
    quarterlyHandledByInstallers: boolean;
    installCanBeWaivedAsConcession: boolean;
    alwaysIncludeTripCharge: boolean;
    authorizationRequiredBelowRed: boolean;
    authorizers: string[];
  };

  contractOptions: {
    canIncludeInContract: boolean;
    compensateWithOtherServices: boolean;
  };
}

// Extra custom lines added with the + button
export interface RpmExtraChargeLine {
  id: string;
  calcText: string;
  description: string;
  amount: number; // per-visit extra charge (already in “this frequency” units)
}

// Form state used by the frontend
export interface RpmWindowsFormState extends BaseServiceFormState {
  // quantities
  smallQty: number;
  mediumQty: number;
  largeQty: number;

  // per-window rates (editable but default from config)
  smallWindowRate: number;
  mediumWindowRate: number;
  largeWindowRate: number;

  // trip charge (always included – checkbox is just visual)
  tripCharge: number;

  // pricing choices
  isFirstTimeInstall: boolean;           // new install?
  selectedRateCategory: RpmRateCategory; // "redRate" / "greenRate"
  includeMirrors: boolean;               // flag only; price not yet changed

  // extra custom per-visit charges (added via + button)
  extraCharges: RpmExtraChargeLine[];
}

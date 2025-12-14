// src/features/services/rpmWindows/rpmWindowsTypes.ts
import type { BaseServiceFormState } from "../common/serviceTypes";

export type RpmFrequencyKey = "oneTime" | "weekly" | "biweekly" | "twicePerMonth" | "monthly" | "bimonthly" | "quarterly" | "biannual" | "annual";
export type RpmRateCategory = "redRate" | "greenRate";

export interface RpmWindowPricingConfig {
  smallWindowRate: number;
  mediumWindowRate: number;
  largeWindowRate: number;

  tripCharge: number;

  installMultiplierFirstTime: number;
  installMultiplierClean: number;

  frequencyMultipliers: {
    oneTime: number;
    weekly: number;
    biweekly: number;
    twicePerMonth: number;
    monthly: number;
    bimonthly: number;
    quarterly: number;
    biannual: number;
    annual: number;
    quarterlyFirstTime: number;
  };

  annualFrequencies: {
    oneTime: number;
    weekly: number;
    biweekly: number;
    twicePerMonth: number;
    monthly: number;
    bimonthly: number;
    quarterly: number;
    biannual: number;
    annual: number;
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

  // Custom overrides for line totals (if user wants to manually set total)
  customSmallTotal?: number;
  customMediumTotal?: number;
  customLargeTotal?: number;

  // trip charge (always included – checkbox is just visual)
  tripCharge: number;

  // pricing choices
  isFirstTimeInstall: boolean;           // new install?
  selectedRateCategory: RpmRateCategory; // "redRate" / "greenRate"
  includeMirrors: boolean;               // flag only; price not yet changed

  // custom installation override (user can manually set installation cost)
  customInstallationFee?: number;        // if set, overrides calculated installation

  // extra custom per-visit charges (added via + button)
  extraCharges: RpmExtraChargeLine[];

  // contract length in months for total pricing (2–36)
  contractMonths: number;

  // Custom overrides for final totals
  customPerVisitPrice?: number;         // override for Total Price (Per Visit)
  customFirstMonthTotal?: number;       // override for First Month Total
  customMonthlyRecurring?: number;      // override for Monthly Recurring
  customAnnualPrice?: number;           // override for Annual Price
}

// src/features/services/saniclean/sanicleanTypes.ts
import type { ServiceQuoteResult } from "../common/serviceTypes";

export type SanicleanLocation = "insideBeltway" | "outsideBeltway";
export type SanicleanRateTier = "redRate" | "greenRate";
export type SanicleanSoapUpgradeType = "none" | "luxury";

export type SanicleanPricingMethod =
  | "all_inclusive"
  | "small_facility_minimum"
  | "geographic_standard";

export interface SanicleanFormState {
  serviceId: "saniclean";

  // Core inputs
  fixtureCount: number;
  location: SanicleanLocation;
  needsParking: boolean;
  isAllInclusive: boolean;

  // Breakdown of fixtures for component pricing
  sinks: number;
  urinals: number;
  maleToilets: number;
  femaleToilets: number;

  // Soap upgrade
  soapUpgradeType: SanicleanSoapUpgradeType;
  soapDispensers: number;

  // Microfiber mopping add-on
  bathroomsForMopping: number;

  // Drain service add-on
  includeDrainService: boolean;
  drains: number;

  // Rate tier (red/green)
  rateTier: SanicleanRateTier;

  // Freeform notes
  notes: string;
}

export interface SanicleanQuoteResult extends ServiceQuoteResult {
  pricingMethod: SanicleanPricingMethod;
  breakdown: {
    weeklyBase: number;
    weeklyFacilityComponents: number;
    weeklySoapUpgrade: number;
    weeklyMicrofiber: number;
    weeklyDrain: number;
    tierMultiplier: number;
  };
}

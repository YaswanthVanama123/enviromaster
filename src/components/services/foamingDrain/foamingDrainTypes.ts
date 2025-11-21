// src/features/services/foamingDrain/foamingDrainTypes.ts
import type { ServiceQuoteResult } from "../common/serviceTypes";

export type FoamingDrainFrequency = "weekly" | "bimonthly";
export type FoamingDrainLocation = "beltway" | "standard";
export type FoamingDrainCondition = "normal" | "filthy";

export interface FoamingDrainFormState {
  serviceId: "foamingDrain";

  // Core counts (from customerInput)
  standardDrainCount: number; // normal floor drains
  greaseTrapCount: number;    // grease traps
  greenDrainCount: number;    // green drains

  // Frequency and site info
  frequency: FoamingDrainFrequency;         // weekly / bimonthly
  facilityCondition: FoamingDrainCondition; // normal / filthy
  location: FoamingDrainLocation;           // beltway / standard

  // Boolean toggles from rules
  needsPlumbing: boolean;         // plumbingWorkAddon ($10 / drain)
  /**
   * Alternative pricing toggle:
   * - < 10 drains  → $20 + $4/drain weekly equivalent
   * - 10+ drains + weekly → $10/week per drain + standard install waived
   */
  useAlternativePricing: boolean;
  /**
   * All-inclusive: standard drains included (no extra charge),
   * trip waived; special drains (green / grease traps) still billed.
   */
  isAllInclusive: boolean;

  // Free text notes
  notes: string;
}

export interface FoamingDrainBreakdown {
  pricingModel: "standard" | "alternative" | "volume";

  // Weekly (or per-service) pieces
  weeklyStandardDrains: number;
  weeklyPlumbingAddon: number;
  weeklyGreaseTraps: number;
  weeklyGreenDrains: number;
  weeklyServiceSubtotal: number;

  // Installation detail
  baseInstall: number;
  conditionMultiplier: number;
  installBeforeWaive: number;
  greaseTrapInstall: number;
  greenDrainInstall: number;
  installationTotal: number;
  volumePricingApplied: boolean;
  usedAlternativePricing: boolean;

  // Trip & billing
  tripCharge: number;
  weeklyTotal: number;
  monthlyRecurring: number;
  annualRecurring: number;
}

export interface FoamingDrainQuoteResult extends ServiceQuoteResult {
  serviceId: "foamingDrain";
  frequency: FoamingDrainFrequency;
  location: FoamingDrainLocation;
  facilityCondition: FoamingDrainCondition;

  standardDrainCount: number;
  greaseTrapCount: number;
  greenDrainCount: number;

  isAllInclusive: boolean;
  needsPlumbing: boolean;
  useAlternativePricing: boolean;

  weeklyService: number;
  weeklyTotal: number;
  monthlyRecurring: number;
  annualRecurring: number;
  installation: number;
  tripCharge: number;
  notes: string;

  breakdown: FoamingDrainBreakdown;
}

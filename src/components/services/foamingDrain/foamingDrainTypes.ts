// src/features/services/foamingDrain/foamingDrainTypes.ts
import type { ServiceQuoteResult } from "../common/serviceTypes";

export type FoamingDrainFrequency = "weekly" | "bimonthly";
export type FoamingDrainLocation = "beltway" | "standard";
export type FoamingDrainCondition = "normal" | "filthy";

export interface FoamingDrainFormState {
  serviceId: "foamingDrain";

  // Core counts
  standardDrainCount: number; // normal floor drains
  greaseTrapCount: number;    // grease traps
  greenDrainCount: number;    // green drains

  // Of the standard drains, how many are filthy (3× install)?
  // If facilityCondition = "filthy" and this is 0, we treat ALL standard drains as filthy.
  filthyDrainCount: number;

  // Frequency and site info
  frequency: FoamingDrainFrequency;
  facilityCondition: FoamingDrainCondition;
  location: FoamingDrainLocation;

  // Trip charge: optional override (if undefined we use config / location)
  tripChargeOverride?: number;

  // Plumbing
  needsPlumbing: boolean;
  plumbingDrainCount: number; // how many drains need plumbing (+$10/drain)

  /**
   * Alternative small-job weekly pricing:
   *   - Weekly
   *   - <10 drains
   *   => $20 + $4/drain
   */
  useSmallAltPricingWeekly: boolean;

  /**
   * Big-account alternative:
   *   - Weekly
   *   - 10+ drains
   *   => $10/week per drain, install waived
   */
  useBigAccountTenWeekly: boolean;

  /**
   * All-inclusive: standard drains included (no charge), trip waived.
   * Grease traps & green drains still billed separately.
   */
  isAllInclusive: boolean;

  /**
   * Grease trap install is "if possible" per rules, so we make it optional.
   * When true: apply min $300 / $150 per trap rule.
   * When false: no grease trap install is charged.
   */
  chargeGreaseTrapInstall: boolean;

  // Notes
  notes: string;
}

export interface FoamingDrainBreakdown {
  pricingModel: "standard" | "alternative" | "volume";

  // Weekly (per-visit) pieces
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

  // Flags
  volumePricingApplied: boolean;
  usedSmallAlt: boolean;
  usedBigAccountAlt: boolean;

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
  filthyDrainCount: number;

  isAllInclusive: boolean;
  needsPlumbing: boolean;
  plumbingDrainCount: number;

  useSmallAltPricingWeekly: boolean;
  useBigAccountTenWeekly: boolean;
  chargeGreaseTrapInstall: boolean;

  weeklyService: number;
  weeklyTotal: number;
  monthlyRecurring: number;
  annualRecurring: number;
  installation: number;
  tripCharge: number;
  notes: string;

  breakdown: FoamingDrainBreakdown;
}

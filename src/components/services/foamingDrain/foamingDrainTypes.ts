// src/features/services/foamingDrain/foamingDrainTypes.ts
import type { ServiceQuoteResult } from "../common/serviceTypes";

export type FoamingDrainFrequency = "weekly" | "bimonthly";
export type FoamingDrainLocation = "beltway" | "standard";
export type FoamingDrainCondition = "normal" | "filthy";

export interface FoamingDrainFormState {
  serviceId: "foamingDrain";

  // Core counts
  standardDrainCount: number;   // total standard drains
  installDrainCount: number;    // # of drains treated as install-level (10+)
  filthyDrainCount: number;     // filthy drains for 3× install (subset)
  greaseTrapCount: number;      // grease traps
  greenDrainCount: number;      // green drains
  plumbingDrainCount: number;   // drains with plumbing work

  // Flags
  needsPlumbing: boolean;

  // Site / frequency
  frequency: FoamingDrainFrequency;
  facilityCondition: FoamingDrainCondition;
  location: FoamingDrainLocation;

  // Pricing toggles for standard drains
  useSmallAltPricingWeekly: boolean; // force 20 + 4$/drain when true
  useBigAccountTenWeekly: boolean;   // force 10$/drain with explicit big-account flag
  isAllInclusive: boolean;           // when true, standard drains are included (0$)

  // Grease install toggle
  chargeGreaseTrapInstall: boolean;

  // Trip override – UI only, ignored in math
  tripChargeOverride?: number;

  // Internal contract length (months) – used to compute "Annual" (contract total)
  contractMonths: number;

  notes: string;
}

export interface FoamingDrainBreakdown {
  // Which pricing model applied to standard drains
  usedSmallAlt: boolean;      // using 20 + 4$/drain
  usedBigAccountAlt: boolean; // using 10$/drain via big-account flag
  volumePricingApplied: boolean; // install-level 10+ program in use

  // Per-visit pieces
  weeklyStandardDrains: number;
  weeklyInstallDrains: number;
  weeklyGreaseTraps: number;
  weeklyGreenDrains: number;
  weeklyPlumbing: number;

  // One-time installs
  filthyInstallOneTime: number;
  greaseInstallOneTime: number;
  greenInstallOneTime: number;

  // Effective trip charge (kept for UI only, always 0 in new rules)
  tripCharge: number;
}

export interface FoamingDrainQuoteResult extends ServiceQuoteResult {
  serviceId: "foamingDrain";

  frequency: FoamingDrainFrequency;
  location: FoamingDrainLocation;
  facilityCondition: FoamingDrainCondition;

  // Echo toggles
  useSmallAltPricingWeekly: boolean;
  useBigAccountTenWeekly: boolean;
  isAllInclusive: boolean;
  chargeGreaseTrapInstall: boolean;

  // Money fields
  weeklyService: number;      // service only (no trip)
  weeklyTotal: number;        // = weeklyService (trip removed)
  monthlyRecurring: number;   // normal recurring month (4.33× or 0.5×)
  annualRecurring: number;    // TOTAL CONTRACT for contractMonths
  installation: number;       // one-time install total (filthy + grease + green)
  tripCharge: number;         // kept for compatibility, always 0

  // Extra internal values (not displayed in current UI)
  firstVisitPrice: number;    // = installation only
  firstMonthPrice: number;    // first month price (install + 3.33× when weekly)
  contractMonths: number;

  notes: string;

  breakdown: FoamingDrainBreakdown;
}

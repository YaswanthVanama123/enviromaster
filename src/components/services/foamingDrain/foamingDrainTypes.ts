// src/features/services/foamingDrain/foamingDrainTypes.ts
import type { ServiceQuoteResult } from "../common/serviceTypes";

export type FoamingDrainFrequency =
  | "oneTime"
  | "weekly"
  | "biweekly"
  | "twicePerMonth"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "biannual"
  | "annual";
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
  // ✅ UPDATED: Separate frequency for install mode (weekly or bimonthly per backend config)
  installFrequency: "weekly" | "bimonthly";
  facilityCondition: FoamingDrainCondition;
  location: FoamingDrainLocation;

  // Standard drain pricing toggles
  useSmallAltPricingWeekly: boolean; // force 20+4
  useBigAccountTenWeekly: boolean;   // force 10$/drain
  isAllInclusive: boolean;           // standard drains included elsewhere (0$ here)

  // Install-level mode for 10+ program
  installServiceMode: "none" | "weekly" | "bimonth";

  // Grease install toggle
  chargeGreaseTrapInstall: boolean;

  // Trip override – UI only, ignored in price math (always 0 in quote)
  tripChargeOverride?: number;

  // Contract length in months (2–36)
  contractMonths: number;

  notes: string;

  // ========== EDITABLE PRICING RATES (fetched from backend or config) ==========
  standardDrainRate: number;           // $10/drain
  altBaseCharge: number;               // $20 base
  altExtraPerDrain: number;            // $4/drain
  volumeWeeklyRate: number;            // $20/drain for 10+ weekly
  volumeBimonthlyRate: number;         // $10/drain for 10+ bimonthly
  greaseWeeklyRate: number;            // $125/trap weekly
  greaseInstallRate: number;           // $300/trap install
  greenWeeklyRate: number;             // $5/drain weekly
  greenInstallRate: number;            // $100/drain install
  plumbingAddonRate: number;           // $10/drain weekly
  filthyMultiplier: number;            // 3x for filthy install

  // ========== CUSTOM OVERRIDES (user can manually set totals) ==========
  customStandardDrainTotal?: number;
  customGreaseTrapTotal?: number;
  customGreenDrainTotal?: number;
  customPlumbingTotal?: number;
  customFilthyInstall?: number;
  customGreaseInstall?: number;
  customGreenInstall?: number;
  customWeeklyService?: number;
  customInstallationTotal?: number;
  customMonthlyRecurring?: number;
  customFirstMonthPrice?: number;
  customContractTotal?: number;

  // ✅ NEW: Custom override fields for rate highlighting
  customRatePerDrain?: number;
  customAltBaseCharge?: number;
  customAltExtraPerDrain?: number;
  customVolumeWeeklyRate?: number;
  customVolumeBimonthlyRate?: number;
  customGreaseWeeklyRate?: number;
  customGreaseInstallRate?: number;
  customGreenWeeklyRate?: number;
  customGreenInstallRate?: number;
  customPlumbingAddonRate?: number;
  customFilthyMultiplier?: number;

  // ✅ NEW: Custom fields from CustomFieldManager
  customFields?: any[];
}

export interface FoamingDrainBreakdown {
  // Which pricing model applied to standard drains
  usedSmallAlt: boolean;      // using 20 + 4$/drain
  usedBigAccountAlt: boolean; // using explicit 10$/drain
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
  monthlyRecurring: number;   // normal month after 1st = 4.3 × weeklyService (weekly case)
  annualRecurring: number;    // TOTAL CONTRACT for contractMonths (2–36), not calendar year
  installation: number;       // one-time install (filthy + grease + green)
  tripCharge: number;         // kept for compatibility, always 0

  // Extra internal values
  firstVisitPrice: number;    // First visit (Scenario A/B)
  firstMonthPrice: number;    // First month cost = FirstVisit + 3.3 × serviceBase
  contractMonths: number;

  notes: string;

  breakdown: FoamingDrainBreakdown;

  // Minimum charge for redline/greenline indicator
  minimumChargePerVisit: number;
}

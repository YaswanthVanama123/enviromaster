// src/features/services/refreshPowerScrub/refreshPowerScrubConfig.ts
import type { RefreshFrequency } from "./refreshPowerScrubTypes";

// Core hourly / trip / minimum from the rules
export const REFRESH_DEFAULT_HOURLY = 200; // $200 / hr / worker
export const REFRESH_DEFAULT_TRIP = 75;    // $75 trip
export const REFRESH_DEFAULT_MIN = 400;    // $475 minimum visit

// Area-specific "area pricing" from rules
export const REFRESH_KITCHEN_SMALL_MED = 1500;  // BOH small / medium kitchen
export const REFRESH_KITCHEN_LARGE = 2500;      // BOH large kitchen

export const REFRESH_FOH_RATE = 2500;           // Front of House

export const REFRESH_PATIO_STANDALONE = 800;    // Patio by itself (2×2 hrs + trip)
export const REFRESH_PATIO_UPSELL = 500;        // Patio as an upsell with FOH

// Square-footage pricing parameters
// $200 fixed fee + $.60 per sq ft inside + $.40 per sq ft outside
// with the $475 minimum still applying.
export const REFRESH_SQFT_FIXED_FEE = 200;
export const REFRESH_SQFT_INSIDE_RATE = 0.6;    // $0.60 / sq ft (inside)
export const REFRESH_SQFT_OUTSIDE_RATE = 0.4;   // $0.40 / sq ft (outside)

// ✅ Frequency labels for all 9 frequencies
export const refreshFrequencyLabels: Record<RefreshFrequency, string> = {
  oneTime: "One Time",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  twicePerMonth: "2× / Month",
  monthly: "Monthly",
  bimonthly: "Every 2 Months",
  quarterly: "Quarterly",
  biannual: "Bi-Annual",
  annual: "Annual",
};

// ✅ Frequency list for dropdown
export const refreshFrequencyList: RefreshFrequency[] = [
  "oneTime",
  "weekly",
  "biweekly",
  "twicePerMonth",
  "monthly",
  "bimonthly",
  "quarterly",
  "biannual",
  "annual",
];

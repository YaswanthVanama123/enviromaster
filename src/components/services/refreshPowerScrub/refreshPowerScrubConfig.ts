// src/features/services/refreshPowerScrub/refreshPowerScrubConfig.ts

// Core hourly / trip / minimum
export const REFRESH_DEFAULT_HOURLY = 200;
export const REFRESH_DEFAULT_TRIP = 75;
export const REFRESH_DEFAULT_MIN = 475;

// Area-specific "area pricing" from rules
export const REFRESH_KITCHEN_SMALL_MED = 1500;  // BOH small / medium
export const REFRESH_KITCHEN_LARGE = 2500;      // BOH large

export const REFRESH_FOH_RATE = 2500;           // Front of House standard rate

export const REFRESH_PATIO_STANDALONE = 875;    // 2 workers × 2h + trip
export const REFRESH_PATIO_UPSELL = 500;        // Add-on when attached to other svc

// Square-footage pricing parameters
export const REFRESH_SQFT_FIXED_FEE = 200;
export const REFRESH_SQFT_INSIDE_RATE = 0.6;    // $0.60 / sq ft (inside)
export const REFRESH_SQFT_OUTSIDE_RATE = 0.4;   // $0.40 / sq ft (outside)

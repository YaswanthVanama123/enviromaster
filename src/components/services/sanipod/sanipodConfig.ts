// src/features/services/sanipod/sanipodConfig.ts
import type { SanipodPricingConfig } from "./sanipodTypes";

/**
 * SaniPod standalone pricing configuration.
 *
 * NOTE: These are DEFAULT/FALLBACK values.
 * The application will attempt to fetch pricing from the backend API first.
 * If the backend is unavailable or returns an error, these values will be used.
 *
 * To update production pricing:
 * 1. Update the backend ServiceConfig in MongoDB
 * 2. OR run: node scripts/seedSanipodPricing.js (when created)
 * 3. OR use the admin panel (when implemented)
 *
 * FINAL RULES (updated):
 *   - Weekly service is EITHER:
 *       8 $/week * pods
 *       OR (3 $/week * pods + 40 $/week)
 *     whichever is cheaper.
 *   - Extra bags: 2 $/bag.
 *       · If marked as "recurring", this is per bag per week.
 *       · If NOT recurring, it is a one-time charge applied on the first visit.
 *   - Trip charge:
 *       · Field is still visible for UI, but locked to 0 and NOT used in any calculations.
 *   - Install: 25 $/pod one-time.
 *
 * Rollups:
 *   - Monthly uses 4.33 weeks (≈ 52 / 12).
 *   - No "annual" price. Instead:
 *       · A contract length dropdown (2–36 months) is used.
 *       · Contract total = first month + (contractMonths − 1) * ongoing monthly.
 *
 * First-visit / first-month logic:
 *   - First visit price = installation only (plus any one-time extra bag charge).
 *   - First month = firstVisit + (4.33 − 1) * normal service price.
 */
export const sanipodPricingConfig: SanipodPricingConfig = {
  weeklyRatePerUnit: 3.0,             // 3$/week per pod (used in 3+40 rule)
  altWeeklyRatePerUnit: 8.0,          // 8$/week per pod (flat per-pod option)
  extraBagPrice: 2.0,                 // 2$/bag
  installChargePerUnit: 25.0,         // 25$/pod install
  standaloneExtraWeeklyCharge: 40.0,  // +40$/week account-level base

  // Trip charge concept removed from pricing (kept only for UI, locked at 0)
  tripChargePerVisit: 0.0,

  defaultFrequency: "weekly",
  allowedFrequencies: ["oneTime", "weekly", "biweekly", "twicePerMonth", "monthly", "bimonthly", "quarterly", "biannual", "annual"],

  // Kept for compatibility, but we now care mainly about 4.33 weeks/month
  annualFrequencies: {
    oneTime: 1,
    weekly: 52,
    biweekly: 26,
    twicePerMonth: 24,
    monthly: 12,
    bimonthly: 6,
    quarterly: 4,
    biannual: 2,
    annual: 1,
  },

  // Frequency-specific visits per month multipliers
  frequencyMultipliers: {
    oneTime: 0,      // No monthly billing for oneTime
    weekly: 4.33,    // 4.33 visits per month
    biweekly: 2.165, // 2.165 visits per month (half of weekly)
    twicePerMonth: 2, // 2 visits per month
    monthly: 1.0,    // 1 visit per month
    bimonthly: 0.5,  // 0.5 visits per month (every 2 months)
    quarterly: 0,    // No monthly for quarterly
    biannual: 0,     // No monthly for biannual
    annual: 0,       // No monthly for annual
  },

  // How many weeks we treat as a month / year for pricing rollups (default fallback)
  weeksPerMonth: 4.33,
  weeksPerYear: 52,

  // Contract length limits (used by dropdown 2–36 months)
  minContractMonths: 2,
  maxContractMonths: 36,

  rateCategories: {
    redRate: {
      multiplier: 1.0,
      commissionRate: "20%",
    },
    greenRate: {
      multiplier: 1.3,
      commissionRate: "25%",
    },
  },
};

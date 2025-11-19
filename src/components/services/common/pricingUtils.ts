// src/features/services/common/pricingUtils.ts
import type { BillingFrequency } from "./serviceTypes";

export function frequencyToAnnualMultiplier(f: BillingFrequency): number {
  switch (f) {
    case "weekly":
      return 50; // “~50 visits/year”
    case "biweekly":
      return 25;
    case "monthly":
      return 12;
    case "bimonthly":
      return 6;
    case "quarterly":
      return 4;
    default:
      return 0;
  }
}

export function annualFromPerVisit(perVisit: number, f: BillingFrequency) {
  return perVisit * frequencyToAnnualMultiplier(f);
}

export function n(v: unknown, fallback = 0): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
}

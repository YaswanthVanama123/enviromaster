// src/features/services/common/pricingUtils.ts

import type { BillingFrequency } from "./serviceTypes";

export function frequencyToAnnualMultiplier(
  frequency: BillingFrequency
): number {
  switch (frequency) {
    case "weekly":
      return 50; // “about 50x per year” style assumption
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

export function calcAnnualFromPerVisit(
  perVisitPrice: number,
  frequency: BillingFrequency
): number {
  const mult = frequencyToAnnualMultiplier(frequency);
  return perVisitPrice * mult;
}

export function parseNumber(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

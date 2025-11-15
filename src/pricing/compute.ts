// src/pricing/compute.ts
import { GREEN_RATE_FACTOR } from "./pricingRules";
import type { ComputedPrice, PriceFormulaInput, PriceRow } from "./pricingTypes"; // 👈 type-only


export function computePrice(
  row: PriceRow,
  input: PriceFormulaInput
): ComputedPrice {
  const applied: string[] = [];
  const rateColor = input.rateColor ?? "red";

  // 1) base lookup by frequency
  const baseRed = row.base[input.frequency];
  if (baseRed == null) {
    return {
      subtotal: 0,
      trip: 0,
      total: 0,
      applied: ["No base for selected frequency"],
    };
  }

  let unitPrice = baseRed;
  if (rateColor === "green") {
    unitPrice = +(unitPrice * GREEN_RATE_FACTOR).toFixed(2);
    applied.push("Green rate +30% applied");
  }

  // 2) quantity / area
  let qty = 1;
  if (row.unitType === "per_sqft") qty = input.sqft ?? 0;
  else if (row.unitType === "per_room") qty = input.rooms ?? 1;
  else if (row.unitType === "per_hour") qty = input.quantity ?? 1; // hours
  else qty = input.quantity ?? 1;

  let subtotal = +(unitPrice * qty).toFixed(2);

  // 3) install multiplier
  if (input.firstTimeInstall && row.installMultiplier && row.installMultiplier > 1) {
    subtotal = +(subtotal * row.installMultiplier).toFixed(2);
    applied.push(`Install multiplier ${row.installMultiplier}x`);
  }

  // 4) minimums
  if (row.minimum && subtotal < row.minimum) {
    applied.push(`Minimum ${row.minimum} enforced`);
    subtotal = row.minimum;
  }

  // 5) trip charge
  const trip = computeTrip(input);
  const total = +(subtotal + trip).toFixed(2);

  return { subtotal, trip, total, applied };
}

function computeTrip(input: PriceFormulaInput): number {
  // simple trip policy — can be extended per-row later if needed
  const inside = input.isInsideBeltway;
  const paidParking = input.paidParking;

  if (paidParking) return 7; // + parking handled outside billing
  if (inside) return 8;
  return 6;
}

import type { BillingMultipliers, TripPolicy } from "./pricingTypes";


export const BILLING: BillingMultipliers = {
  Weekly: 50,
  Biweekly: 25,
  Monthly: 12,
  Bimonthly: 6,
  Quarterly: 4,
};

export const TRIP: TripPolicy = {
  standard: 6,
  insideBeltway: 8,
  paidParking: { base: 7, addParking: true },
  twoPersonMonthlyRoute: 10,
};

export const GREEN_RATE_FACTOR = 1.3;

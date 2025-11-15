// src/pricing/pricingTypes.ts

// High-level grouping used in Admin table and filtering
export type Category = "Small Product" | "Dispenser" | "Big Product" | "Service";

// Supported billing frequencies
export type Frequency =
  | "Weekly"
  | "Biweekly"
  | "Monthly"
  | "Bimonthly"
  | "Quarterly"
  | "One-Time"
  | "Hourly";

// How a service is measured
export type UnitType =
  | "per_fixture"
  | "per_drain"
  | "per_window_small"
  | "per_window_medium"
  | "per_window_large"
  | "per_sqft"
  | "per_room"
  | "per_1000_sqft"
  | "per_bathroom"
  | "per_case"
  | "per_gallon"
  | "per_item"
  | "per_hour";

// Frequency → annualized or relative multipliers (info/reference)
// e.g., Weekly = 50×/yr (~4.1667×/mo), Biweekly = 25×/yr, etc.
export interface BillingMultipliers {
  Weekly: number;      // 50 per year (~4.1667 per month)
  Biweekly: number;    // 25 per year
  Monthly: number;     // 12 per year
  Bimonthly: number;   // 6 per year
  Quarterly: number;   // 4 per year
}

// Trip charge policy for routes
export interface TripPolicy {
  standard: number;                        // e.g., 6
  insideBeltway: number;                   // e.g., 8
  paidParking: { base: number; addParking: boolean }; // e.g., 7 (+ parking separately)
  twoPersonMonthlyRoute?: number;          // e.g., 10
}

// Red vs Green rate
export type RateColor = "red" | "green"; // green = red * 1.3

// Input to the price engine
export interface PriceFormulaInput {
  serviceKey: string;
  frequency: Frequency;
  unitType: UnitType;
  quantity?: number;          // fixtures, drains, windows, hours, etc.
  sqft?: number;              // for per_sqft rules
  rooms?: number;             // for per_room rules
  isInsideBeltway?: boolean;  // affects trip
  paidParking?: boolean;
  rateColor?: RateColor;      // green upsell
  firstTimeInstall?: boolean; // applies install multiplier (e.g., 3x)
}

// Output from the price engine
export interface ComputedPrice {
  subtotal: number;  // before trip charges
  trip: number;      // computed trip charge
  total: number;     // subtotal + trip, after minimums
  applied: string[]; // notes of rules applied
}

// Admin-editable pricing row
export interface PriceRow {
  id: string;
  serviceKey: string;       // machine key used across app
  displayName: string;      // what admin edits / UI shows
  category: Category;

  // Base RED prices by frequency; GREEN derived via factor
  base: Partial<Record<Frequency, number>>; // e.g., { Weekly: 7, Monthly: 25 }

  unitType: UnitType;       // e.g., per_fixture, per_sqft, etc.

  minimum?: number;         // e.g., SaniScrub min $175, floors min $550
  installMultiplier?: number; // e.g., 3x for first-time/dirty

  // Optional extra fields for special logic
  notes?: string;
}

// Global pricing state (context)
export interface PricingState {
  rows: PriceRow[];
  tripPolicy: TripPolicy;
  billing: BillingMultipliers;
}

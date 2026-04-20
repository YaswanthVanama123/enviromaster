export type Category = "Small Product" | "Dispenser" | "Big Product" | "Service";

export type Frequency =
  | "Weekly"
  | "Biweekly"
  | "Monthly"
  | "Bimonthly"
  | "Quarterly"
  | "One-Time"
  | "Hourly";

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

export interface BillingMultipliers {
  Weekly: number;
  Biweekly: number;
  Monthly: number;
  Bimonthly: number;
  Quarterly: number;
}

export interface TripPolicy {
  standard: number;
  insideBeltway: number;
  paidParking: { base: number; addParking: boolean };
  twoPersonMonthlyRoute?: number;
}

export type RateColor = "red" | "green";

export interface PriceFormulaInput {
  serviceKey: string;
  frequency: Frequency;
  unitType: UnitType;
  quantity?: number;
  sqft?: number;
  rooms?: number;
  isInsideBeltway?: boolean;
  paidParking?: boolean;
  rateColor?: RateColor;
  firstTimeInstall?: boolean;
}

export interface ComputedPrice {
  subtotal: number;
  trip: number;
  total: number;
  applied: string[];
}

export interface PriceRow {
  id: string;
  serviceKey: string;
  displayName: string;
  category: Category;
  base: Partial<Record<Frequency, number>>;
  unitType: UnitType;
  minimum?: number;
  installMultiplier?: number;
  notes?: string;
}

export interface PricingState {
  rows: PriceRow[];
  tripPolicy: TripPolicy;
  billing: BillingMultipliers;
}

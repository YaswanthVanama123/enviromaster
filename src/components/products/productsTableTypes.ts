// src/features/products/productsTypes.ts

export type BillingPeriod = "week" | "month" | "year" | "one-time";

export type EnvProductFamilyKey =
  | "floorProducts"
  | "saniProducts"
  | "threeSink"
  | "otherChemicals"
  | "soap"
  | "paper"
  | "dispensers"
  | "extras";

export type ProductKind =
  | "floorCleaner"
  | "degreaser"
  | "disinfectant"
  | "bowlCleaner"
  | "drainProduct"
  | "handSoap"
  | "dishSoap"
  | "sanitizer"
  | "paper"
  | "dispenser"
  | "fragrance"
  | "tool"
  | "system"
  | "other";

export interface PriceSpec {
  amount: number;
  currency: "USD";
  /** e.g. "gallon", "case", "each", "dispenser" */
  uom: string;
  /** e.g. "Case/6/250", "12 x 32oz", etc. */
  unitSizeLabel?: string;
  /** If this is a recurring charge (e.g. $1 / wk warranty) */
  billingPeriod?: BillingPeriod;
}

export interface EnvProduct {
  /** Unique stable key used everywhere (backend + frontend) */
  key: string;
  /** Customer-facing name, shown in the Products table */
  name: string;
  /** Logical family (paper, dispensers, chemicals, etc.) */
  familyKey: EnvProductFamilyKey;
  kind: ProductKind;

  /** Main price for the product (per case, per gallon, per each, etc.) */
  basePrice?: PriceSpec;

  /**
   * Weekly / monthly warranty price per physical unit (dispenser, each, etc.)
   * Example: $1/wk per dispenser.
   */
  warrantyPricePerUnit?: PriceSpec;

  /**
   * For paper SKUs we sometimes care about “effective per roll” math.
   * Used only for internal calculations – not displayed directly.
   */
  effectivePerRollPriceInternal?: number;
  suggestedCustomerRollPrice?: number;

  /** For case quantities like "Case/6" */
  quantityPerCase?: number;
  quantityPerCaseLabel?: string;

  /**
   * If true, this product is shown on the grid by default
   * (the “pre-loaded” lines you’ve been seeing).
   */
  displayByAdmin?: boolean;
}

export interface EnvProductFamily {
  key: EnvProductFamilyKey;
  label: string;
  sortOrder: number;
  products: EnvProduct[];
}

export interface EnvProductCatalog {
  version: string;
  lastUpdated: string;
  currency: "USD";
  families: EnvProductFamily[];
}

/** Buckets map directly to the 3 “bands” of the grid */
export type ProductBucket = "paper" | "dispensers" | "extras";

/** One physical row in the PRODUCTS grid */
export interface ProductRow {
  id: string;

  // Left side (paper)
  leftProductKey?: string;
  leftAmountPerUnit?: number;

  // Middle (dispensers + warranty)
  dispenserKey?: string;
  dispenserQty?: number;
  dispenserWarrantyRate?: number;
  dispenserReplacementRate?: number;

  // Right side (extras / accessories / chemicals etc.)
  rightProductKey?: string;
  rightQty?: number;
  rightAmount?: number;
  rightFrequency?: string;
}

/** Extra custom column (after the main 10 columns) */
export interface ExtraColumn {
  id: string;
  label: string;
}

// src/features/products/productsTypes.ts

export type CurrencyCode = "USD";

export type UnitOfMeasure =
  | "gallon"
  | "case"
  | "each"
  | "dispenser"
  | "system"
  | "roll";

export type WarrantyBillingPeriod = "week" | "month" | "year";

export type ProductKind =
  | "chemical"
  | "soap"
  | "paper"
  | "dispenser"
  | "accessory"
  | "system";

export type EnvProductFamilyKey =
  | "floorProducts"
  | "saniProducts"
  | "threeSink"
  | "otherChemicals"
  | "soap"
  | "paper"
  | "dispensers"
  | "extras";

export interface BasePrice {
  amount: number;
  currency: CurrencyCode;
  uom: UnitOfMeasure;
  unitSizeLabel?: string;
  billingPeriod?: WarrantyBillingPeriod;
}

export interface WarrantyPricePerUnit {
  amount: number;
  currency: CurrencyCode;
  billingPeriod: WarrantyBillingPeriod;
}

export interface ProductDefinition {
  /** Unique key for this SKU inside the catalog */
  key: string;
  /** Human name, e.g. “Enviro-Master JRT” */
  name: string;
  kind: ProductKind;
  familyKey: EnvProductFamilyKey;
  description?: string;

  /** Main “red-rate” price */
  basePrice?: BasePrice;

  /** If true, price is “ask Alex/Jeff” style and not hard-coded */
  priceOnRequest?: boolean;

  /** Weekly/monthly warranty charge per unit when it exists */
  warrantyPricePerUnit?: WarrantyPricePerUnit;

  /** Internal helper numbers from the paper table */
  effectivePerRollPriceInternal?: number;
  suggestedCustomerRollPrice?: number;

  /** Case size or similar for inventory */
  quantityPerCase?: number;
  quantityPerCaseLabel?: string;

  tags?: string[];
  notes?: string;

  /**
   * Optional flag to suggest it should be pre-shown by admin in UI.
   * (Row-level control is still in productsTableLayout.)
   */
  displayByAdmin?: boolean;
}

export interface ProductFamily {
  key: EnvProductFamilyKey;
  label: string;
  sortOrder: number;
  description?: string;
  products: ProductDefinition[];
}

export interface EnvProductCatalog {
  version: string;
  lastUpdated: string; // ISO date
  currency: CurrencyCode;
  families: ProductFamily[];
}

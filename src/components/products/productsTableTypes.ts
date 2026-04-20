

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

  uom: string;

  unitSizeLabel?: string;

  billingPeriod?: BillingPeriod;
}

export interface EnvProduct {

  key: string;

  name: string;

  familyKey: EnvProductFamilyKey;
  kind: ProductKind;


  basePrice?: PriceSpec;


  warrantyPricePerUnit?: PriceSpec;


  effectivePerRollPriceInternal?: number;
  suggestedCustomerRollPrice?: number;


  quantityPerCase?: number;
  quantityPerCaseLabel?: string;


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


export type ProductBucket = "paper" | "dispensers" | "extras";


export interface ProductRow {
  id: string;


  leftProductKey?: string;
  leftAmountPerUnit?: number;


  dispenserKey?: string;
  dispenserQty?: number;
  dispenserWarrantyRate?: number;
  dispenserReplacementRate?: number;


  rightProductKey?: string;
  rightQty?: number;
  rightAmount?: number;
  rightFrequency?: string;
}


export interface ExtraColumn {
  id: string;
  label: string;
}

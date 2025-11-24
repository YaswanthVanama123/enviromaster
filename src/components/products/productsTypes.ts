// src/features/products/productsTypes.ts

export type BillingPeriod = "week" | "month" | "year";

export type MoneyAmount = {
  amount: number;
  currency: "USD";
  uom?: string;            // gallon, case, each, etc.
  unitSizeLabel?: string;  // "Case/16/250" etc.
  billingPeriod?: BillingPeriod;
};

export type EnvProduct = {
  key: string;
  name: string;
  familyKey: string;          // "paper" | "dispensers" | "floorProducts" | ...
  kind?: string;              // floorCleaner, paper, dispenser, etc.
  basePrice?: MoneyAmount;    // main price (per gallon, case, each, etc.)
  effectivePerRollPriceInternal?: number;
  suggestedCustomerRollPrice?: number;
  quantityPerCase?: number;
  quantityPerCaseLabel?: string;
  warrantyPricePerUnit?: MoneyAmount; // weekly warranty rates for dispensers, etc.
  displayByAdmin?: boolean;   // if true => show by default in the table
};

export type EnvProductFamily = {
  key: string;
  label: string;
  sortOrder: number;
  products: EnvProduct[];
};

export type EnvProductCatalog = {
  version: string;
  lastUpdated?: string;
  currency: "USD";
  families: EnvProductFamily[];
};

// Columns / buckets in the UI
export type ColumnKey = "smallProducts" | "dispensers" | "bigProducts";

// Row in the UI table
// src/components/products/productsTypes.ts  (example)
export type ProductRow = {
  id: string;
  productKey: string | null;
  isDefault?: boolean;
  qty?: number;
  unitPriceOverride?: number;
  warrantyPriceOverride?: number;
  replacementPriceOverride?: number;
  amountOverride?: number;

  // custom rows
  isCustom?: boolean;
  customName?: string;

  // NEW – editable Total column
  totalOverride?: number;
};


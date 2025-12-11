// src/backendservice/types/productCatalog.types.ts

export interface ProductPrice {
  amount?: number;
  currency?: string;
  uom?: string;
  unitSizeLabel?: string;
}

export interface WarrantyPrice {
  amount?: number;
  currency?: string;
  uom?: string;
  billingPeriod?: string;
}

export interface Product {
  key: string;
  name: string;
  familyKey: string;
  kind?: string;
  basePrice?: ProductPrice;
  warrantyPricePerUnit?: WarrantyPrice;
  effectivePerRollPriceInternal?: number;
  suggestedCustomerRollPrice?: number;
  quantityPerCase?: number;
  quantityPerCaseLabel?: string;
  frequency?: string;
  description?: string;
  displayByAdmin?: boolean;
}

export interface ProductFamily {
  key: string;
  label: string;
  sortOrder: number;
  products: Product[];
}

export interface ProductCatalog {
  _id?: string;
  version: string;
  lastUpdated?: string;
  currency: string;
  families: ProductFamily[];
  isActive?: boolean;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductCatalogPayload {
  version: string;
  lastUpdated?: string;
  currency?: string;
  families: ProductFamily[];
  isActive?: boolean;
  note?: string;
}

export interface UpdateProductCatalogPayload {
  version?: string;
  lastUpdated?: string;
  currency?: string;
  families?: ProductFamily[];
  isActive?: boolean;
  note?: string;
}

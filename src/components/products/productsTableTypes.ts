// src/features/products/productsTableTypes.ts

import type { ProductDefinition } from "./productsTypes";

export type ProductTableSectionKey =
  | "smallProducts"
  | "dispensers"
  | "bigProducts";

export interface ProductRowItem {
  /** Stable id for React key */
  id: string;

  /** What is shown in the cell */
  name: string;

  /** True for rows that are not tied to a catalog product */
  isCustom: boolean;

  /** Optional key into envProductCatalog */
  productKey?: string;

  /** Resolved product info for automatic pricing */
  product?: ProductDefinition;

  /** Should this row be shown initially for admin? */
  displayByAdmin?: boolean;

  /** When true, show searchable select instead of static label */
  isSelectMode?: boolean;
}

export interface ProductColumnItem {
  id: string;
  label: string;
  isCustom: boolean;
}

export interface ProductTableState {
  smallProducts: ProductRowItem[];
  dispensers: ProductRowItem[];
  bigProducts: ProductRowItem[];
}

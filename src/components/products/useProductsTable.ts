// src/features/products/useProductsTable.ts

import { useMemo } from "react";
import type { ProductTableState, ProductTableSectionKey } from "./productsTableTypes";
import { envProductCatalog } from "./productsConfig";
import {
  productsTableLayout,
  type ProductRowConfig,
} from "./productsTableConfig";

function findProduct(productKey?: string) {
  if (!productKey) return undefined;
  for (const family of envProductCatalog.families) {
    const found = family.products.find((p) => p.key === productKey);
    if (found) return found;
  }
  return undefined;
}

function resolveLabel(cfg: ProductRowConfig): string {
  if (cfg.overrideLabel) return cfg.overrideLabel;
  if (cfg.productKey) {
    const p = findProduct(cfg.productKey);
    if (p) return p.name;
  }
  return "Custom";
}

function buildRow(
  section: ProductTableSectionKey,
  cfg: ProductRowConfig,
  index: number
) {
  const product = findProduct(cfg.productKey);
  const name = resolveLabel(cfg);

  return {
    id: `${section}_${cfg.productKey ?? "custom"}_${index}`,
    name,
    isCustom: !cfg.productKey,
    productKey: cfg.productKey,
    product,
    displayByAdmin: cfg.displayByAdmin ?? true,
    isSelectMode: false,
  };
}

export function useProductsTable(): ProductTableState {
  return useMemo(
    () => ({
      smallProducts: productsTableLayout.smallProducts
        .filter((cfg) => cfg.displayByAdmin !== false)
        .map((cfg, idx) => buildRow("smallProducts", cfg, idx)),
      dispensers: productsTableLayout.dispensers
        .filter((cfg) => cfg.displayByAdmin !== false)
        .map((cfg, idx) => buildRow("dispensers", cfg, idx)),
      bigProducts: productsTableLayout.bigProducts
        .filter((cfg) => cfg.displayByAdmin !== false)
        .map((cfg, idx) => buildRow("bigProducts", cfg, idx)),
    }),
    []
  );
}

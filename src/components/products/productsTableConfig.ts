// src/features/products/productsTableConfig.ts

import type { ProductTableSectionKey } from "./productsTableTypes";

export interface ProductRowConfig {
  /** Product key inside envProductCatalog, if any */
  productKey?: string;

  /** Override label to show in the grid */
  overrideLabel?: string;

  /**
   * If false, this row will NOT show by default.
   * It will still appear as an option in the "+Row" select.
   */
  displayByAdmin?: boolean;
}

export type ProductTableLayout = Record<
  ProductTableSectionKey,
  ProductRowConfig[]
>;

/**
 * Layout for the PRODUCTS grid:
 * - smallProducts (left)   = paper + small items
 * - dispensers  (middle)   = all dispensers
 * - bigProducts (right)    = mats, screens, key chemicals
 */
export const productsTableLayout: ProductTableLayout = {
  // LEFT – paper + sleeves
  smallProducts: [
    {
      productKey: "paper-em-jrt",
      overrideLabel: "Enviro-Master JRT",
    },
    {
      productKey: "paper-em-hardwound-kraft",
      overrideLabel: "Enviro-Master Hard-wound Kraft",
    },
    {
      productKey: "paper-em-hardwound-white",
      overrideLabel: "Enviro-Master Hard-wound White",
    },
    {
      productKey: "paper-em-center-pull",
      overrideLabel: "Enviro-Master Center Pull",
    },
    {
      productKey: "paper-multifold-towel",
      overrideLabel: "Multifold Towel",
    },
    {
      productKey: "paper-multifold-towel",
      overrideLabel: "Multifold Towel",
    },
    {
      // now mapped to a priced product
      productKey: "extra-seat-cover",
      overrideLabel: "Seat Cover Sleeve",
    },
    {
      // Grit Soap doesn’t have a clean red-rate in the sheet, so
      // we hide it by default to avoid blank pricing.
      overrideLabel: "Grit Soap",
      displayByAdmin: false,
    },
  ],

  // MIDDLE – dispensers
  dispensers: [
    {
      productKey: "disp-jrt",
      overrideLabel: "Enviro-Master JRT Dispenser",
    },
    {
      productKey: "disp-mechanical-towel",
      overrideLabel: "Enviro-Master Mechanical Towel Dispenser",
    },
    {
      productKey: "disp-hybrid-towel",
      overrideLabel: "Enviro-Master Hybrid Towel Dispenser",
    },
    {
      productKey: "disp-paper-towel",
      overrideLabel: "Center Pull Towel Dispenser",
    },
    {
      productKey: "disp-paper-towel",
      overrideLabel: "Multi-Fold Dispenser",
    },
    {
      productKey: "disp-air-freshener",
      overrideLabel: "Enviro-Master Air Freshener (Battery)",
    },
    {
      productKey: "disp-manual-soap",
      overrideLabel: "Enviro-Master Manual Soap Dispenser",
    },
    {
      productKey: "disp-seat-cover",
      overrideLabel: "Seat Cover Dispenser",
    },
    {
      productKey: "disp-hand-sanitizer",
      overrideLabel: "Hand Sanitizer Dispenser",
    },
    {
      // no explicit red rate for Grit Soap dispenser – hide by default
      overrideLabel: "Grit Soap Dispenser",
      displayByAdmin: false,
    },
    {
      productKey: "disp-sanipod-receptacle",
      overrideLabel: "SaniPod Receptacle",
    },
  ],

  // RIGHT – extras + chemicals
  bigProducts: [
    {
      productKey: "extra-urinal-mat",
      overrideLabel: "Urinal Mats",
    },
    {
      // reuse Urinal Mat price for Commode Mat
      productKey: "extra-urinal-mat",
      overrideLabel: "EM Commode Mat",
    },
    {
      productKey: "extra-bowl-clip",
      overrideLabel: "Bowl Clip",
    },
    {
      productKey: "extra-urinal-screen",
      overrideLabel: "Urinal Screen",
    },
    {
      productKey: "extra-urinal-screen",
      overrideLabel: "Urinal Screen",
    },
    {
      productKey: "surefoot-ez",
      overrideLabel: "Surefoot EZ",
    },
    {
      productKey: "daily-floor-cleaner",
      overrideLabel: "Daily",
    },
    {
      productKey: "dish-detergent-pink",
      overrideLabel: "Dish Detergent (Pink)",
    },
  ],
};

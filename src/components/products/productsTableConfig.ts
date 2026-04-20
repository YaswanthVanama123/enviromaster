

import type { ProductTableSectionKey } from "./productsTableTypes";

export interface ProductRowConfig {

  productKey?: string;


  overrideLabel?: string;


  displayByAdmin?: boolean;
}

export type ProductTableLayout = Record<
  ProductTableSectionKey,
  ProductRowConfig[]
>;


export const productsTableLayout: ProductTableLayout = {

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

      productKey: "extra-seat-cover",
      overrideLabel: "Seat Cover Sleeve",
    },
    {


      overrideLabel: "Grit Soap",
      displayByAdmin: false,
    },
  ],


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
      productKey: "disp-seat-cover",
      overrideLabel: "Seat Cover Dispenser",
    },
    {
      productKey: "disp-hand-sanitizer",
      overrideLabel: "Hand Sanitizer Dispenser",
    },
    {

      overrideLabel: "Grit Soap Dispenser",
      displayByAdmin: false,
    },
    {
      productKey: "disp-sanipod-receptacle",
      overrideLabel: "SaniPod Receptacle",
    },
  ],


  bigProducts: [
    {
      productKey: "extra-urinal-mat",
      overrideLabel: "Urinal Mats",
    },
    {

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

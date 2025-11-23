// src/features/products/productsConfig.ts

import type { EnvProductCatalog } from "./productsTypes";

export const envProductCatalog: EnvProductCatalog = {
  version: "2020-11-05-red",
  lastUpdated: "2020-11-05",
  currency: "USD",
  families: [
    // -----------------------------------------------------------------------
    // PAPER – prices per case, effective per roll shown for info only
    // -----------------------------------------------------------------------
    {
      key: "paper",
      label: "Paper",
      sortOrder: 10,
      description: "Paper products (per case pricing, red rates).",
      products: [
        {
          key: "paper-multifold-towel",
          name: "Multifold Towel",
          kind: "paper",
          familyKey: "paper",
          basePrice: {
            amount: 50, // Multifold Tower Case/16/250 $50
            currency: "USD",
            uom: "case",
            unitSizeLabel: "Case/16/250",
          },
          effectivePerRollPriceInternal: 3.125,
          suggestedCustomerRollPrice: 4.7,
          quantityPerCase: 16 * 250,
          quantityPerCaseLabel: "16 packs × 250",
          displayByAdmin: true,
        },
        {
          key: "paper-em-jrt",
          name: "Enviro-Master JRT",
          kind: "paper",
          familyKey: "paper",
          basePrice: {
            amount: 56, // Enviro-Master JRT Case/12 $56
            currency: "USD",
            uom: "case",
            unitSizeLabel: "Case/12",
          },
          effectivePerRollPriceInternal: 4.67,
          suggestedCustomerRollPrice: 7.0,
          quantityPerCase: 12,
          displayByAdmin: true,
        },
        {
          key: "paper-em-hardwound-kraft",
          name: "Enviro-Master Hard-wound Kraft",
          kind: "paper",
          familyKey: "paper",
          basePrice: {
            amount: 43, // Enviro-Master Hard-wound kraft Case/6 $43
            currency: "USD",
            uom: "case",
            unitSizeLabel: "Case/6",
          },
          effectivePerRollPriceInternal: 7.17,
          suggestedCustomerRollPrice: 10.75,
          quantityPerCase: 6,
          displayByAdmin: true,
        },
        {
          key: "paper-em-hardwound-white",
          name: "Enviro-Master Hard-wound White",
          kind: "paper",
          familyKey: "paper",
          basePrice: {
            amount: 54, // Enviro-Master Hard-wound white Case/6 $54
            currency: "USD",
            uom: "case",
            unitSizeLabel: "Case/6",
          },
          effectivePerRollPriceInternal: 9,
          suggestedCustomerRollPrice: 13.5,
          quantityPerCase: 6,
          displayByAdmin: true,
        },
        {
          key: "paper-em-center-pull",
          name: "Enviro-Master Center Pull",
          kind: "paper",
          familyKey: "paper",
          basePrice: {
            amount: 57, // Enviro-Master Center Pull Case/6 $57
            currency: "USD",
            uom: "case",
            unitSizeLabel: "Case/6",
          },
          effectivePerRollPriceInternal: 9.5,
          suggestedCustomerRollPrice: 14.25,
          quantityPerCase: 6,
          displayByAdmin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // DISPENSERS – prices per dispenser + weekly warranty rate
    // -----------------------------------------------------------------------
    {
      key: "dispensers",
      label: "Dispensers",
      sortOrder: 20,
      description: "Dispensers with hardware and weekly warranty charges.",
      products: [
        {
          key: "disp-manual-soap",
          name: "Enviro-Master Manual Soap Dispenser",
          kind: "dispenser",
          familyKey: "dispensers",
          basePrice: {
            amount: 53,
            currency: "USD",
            uom: "dispenser",
          },
          warrantyPricePerUnit: {
            amount: 1,
            currency: "USD",
            billingPeriod: "week",
          },
          displayByAdmin: true,
        },
        {
          key: "disp-hybrid",
          name: "Enviro-Master Hybrid Soap Dispenser",
          kind: "dispenser",
          familyKey: "dispensers",
          basePrice: {
            amount: 100,
            currency: "USD",
            uom: "dispenser",
          },
          warrantyPricePerUnit: {
            amount: 2,
            currency: "USD",
            billingPeriod: "week",
          },
        },
        {
          key: "disp-mechanical-towel",
          name: "Enviro-Master Mechanical Towel Dispenser",
          kind: "dispenser",
          familyKey: "dispensers",
          basePrice: {
            amount: 100,
            currency: "USD",
            uom: "dispenser",
          },
          warrantyPricePerUnit: {
            amount: 2,
            currency: "USD",
            billingPeriod: "week",
          },
          displayByAdmin: true,
        },
        {
          key: "disp-hybrid-towel",
          name: "Enviro-Master Hybrid Towel Dispenser",
          kind: "dispenser",
          familyKey: "dispensers",
          basePrice: {
            amount: 160,
            currency: "USD",
            uom: "dispenser",
          },
          warrantyPricePerUnit: {
            amount: 3,
            currency: "USD",
            billingPeriod: "week",
          },
          displayByAdmin: true,
        },
        {
          key: "disp-air-freshener",
          name: "Enviro-Master Air Freshener (Battery)",
          kind: "dispenser",
          familyKey: "dispensers",
          basePrice: {
            amount: 53,
            currency: "USD",
            uom: "dispenser",
          },
          warrantyPricePerUnit: {
            amount: 1,
            currency: "USD",
            billingPeriod: "week",
          },
          displayByAdmin: true,
        },
        {
          key: "disp-jrt",
          name: "Enviro-Master JRT Dispenser",
          kind: "dispenser",
          familyKey: "dispensers",
          basePrice: {
            amount: 60,
            currency: "USD",
            uom: "dispenser",
          },
          warrantyPricePerUnit: {
            amount: 1,
            currency: "USD",
            billingPeriod: "week",
          },
          displayByAdmin: true,
        },
        {
          key: "disp-seat-cover",
          name: "Seat Cover Dispenser",
          kind: "dispenser",
          familyKey: "dispensers",
          basePrice: {
            amount: 25, // Toilet seat dispensers — $25, warranty free
            currency: "USD",
            uom: "dispenser",
          },
        },
        {
          key: "disp-paper-towel",
          name: "Paper Towel Dispenser",
          kind: "dispenser",
          familyKey: "dispensers",
          basePrice: {
            amount: 25,
            currency: "USD",
            uom: "dispenser",
          },
          warrantyPricePerUnit: {
            amount: 1,
            currency: "USD",
            billingPeriod: "week",
          },
        },
        {
          key: "disp-toilet-paper",
          name: "Toilet Paper Dispenser",
          kind: "dispenser",
          familyKey: "dispensers",
          basePrice: {
            amount: 25,
            currency: "USD",
            uom: "dispenser",
          },
          warrantyPricePerUnit: {
            amount: 1,
            currency: "USD",
            billingPeriod: "week",
          },
        },
        {
          key: "disp-hand-sanitizer",
          name: "Hand Sanitizer Dispenser",
          kind: "dispenser",
          familyKey: "dispensers",
          basePrice: {
            amount: 20, // $20/dispenser install
            currency: "USD",
            uom: "dispenser",
          },
          warrantyPricePerUnit: {
            amount: 1,
            currency: "USD",
            billingPeriod: "week",
          },
        },
        {
          key: "disp-sanipod-receptacle",
          name: "SaniPod Receptacle",
          kind: "dispenser",
          familyKey: "dispensers",
          basePrice: {
            amount: 25, // SaniPod install $25
            currency: "USD",
            uom: "dispenser",
          },
        },
      ],
    },

    // -----------------------------------------------------------------------
    // FLOOR PRODUCTS (chemicals per gallon)
    // -----------------------------------------------------------------------
    {
      key: "floorProducts",
      label: "Floor Products",
      sortOrder: 30,
      products: [
        {
          key: "daily-floor-cleaner",
          name: "Daily",
          kind: "chemical",
          familyKey: "floorProducts",
          basePrice: {
            amount: 28,
            currency: "USD",
            uom: "gallon",
          },
          displayByAdmin: true,
        },
        {
          key: "surefoot-ez",
          name: "Surefoot EZ",
          kind: "chemical",
          familyKey: "floorProducts",
          basePrice: {
            amount: 32,
            currency: "USD",
            uom: "gallon",
          },
          displayByAdmin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // SOAP / OTHER CHEMICALS
    // -----------------------------------------------------------------------
    {
      key: "soap",
      label: "Dish / Soap",
      sortOrder: 40,
      products: [
        {
          key: "dish-detergent-pink",
          name: "Dish Detergent (Pink)",
          kind: "soap",
          familyKey: "soap",
          basePrice: {
            amount: 11,
            currency: "USD",
            uom: "gallon",
          },
          displayByAdmin: true,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // EXTRAS (mats, screens, seat covers, etc.)
    // -----------------------------------------------------------------------
    {
      key: "extras",
      label: "Extras",
      sortOrder: 50,
      products: [
        {
          key: "extra-urinal-mat",
          name: "Urinal Mat",
          kind: "accessory",
          familyKey: "extras",
          basePrice: {
            amount: 10,
            currency: "USD",
            uom: "each",
          },
          quantityPerCase: 80,
          quantityPerCaseLabel: "Case/80",
          displayByAdmin: true,
        },
        {
          key: "extra-bowl-clip",
          name: "Bowl Clip",
          kind: "accessory",
          familyKey: "extras",
          basePrice: {
            amount: 4,
            currency: "USD",
            uom: "each",
          },
          quantityPerCase: 72,
          quantityPerCaseLabel: "Case/72",
          displayByAdmin: true,
        },
        {
          key: "extra-urinal-screen",
          name: "Urinal Screen",
          kind: "accessory",
          familyKey: "extras",
          basePrice: {
            amount: 4,
            currency: "USD",
            uom: "each",
          },
          quantityPerCase: 60,
          quantityPerCaseLabel: "Case/60",
          displayByAdmin: true,
        },
        {
          key: "extra-seat-cover",
          name: "Toilet Seat Cover",
          kind: "accessory",
          familyKey: "extras",
          basePrice: {
            amount: 4, // Toilet Seat Cover Case/40 $4 → $0.10 each
            currency: "USD",
            uom: "each",
          },
          quantityPerCase: 40,
          quantityPerCaseLabel: "Case/40",
          displayByAdmin: true,
        },
        {
          key: "extra-berry-good",
          name: "Berry Good",
          kind: "chemical",
          familyKey: "extras",
          basePrice: {
            amount: 11,
            currency: "USD",
            uom: "gallon",
            unitSizeLabel: "32oz (Case/12)",
          },
        },
        {
          key: "extra-green-drain",
          name: "Green Drain",
          kind: "accessory",
          familyKey: "extras",
          basePrice: {
            amount: 59,
            currency: "USD",
            uom: "each",
          },
          quantityPerCase: 6,
          quantityPerCaseLabel: "Case/6",
        },
      ],
    },
  ],
};

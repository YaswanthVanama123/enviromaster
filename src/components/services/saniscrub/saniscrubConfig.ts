// src/features/services/saniscrub/saniscrubConfig.ts
import type {
    SaniscrubPricingConfig,
    SaniscrubFrequency,
  } from "./saniscrubTypes";
  
  export const saniscrubFrequencyList: SaniscrubFrequency[] = [
    "monthly",
    "twicePerMonth",
    "bimonthly",
    "quarterly",
  ];
  
  export const saniscrubPricingConfig: SaniscrubPricingConfig = {
    fixtureRates: {
      monthly: 25,
      twicePerMonth: 25, // baseline used before discount
      bimonthly: 35,
      quarterly: 40,
    },
  
    minimums: {
      monthly: 175,
      twicePerMonth: 175,
      bimonthly: 250,
      quarterly: 250,
    },
  
    twicePerMonthDiscountPerFixture: 15, // -$15 per fixture from monthly charge
  
    nonBathroom: {
      unitSqFt: 500,
      firstUnitPrice: 250,
      additionalUnitPrice: 125,
    },
  
    installMultipliers: {
      dirty: 3,
      clean: 1,
    },
  
    tripChargeBase: 8,
    parkingFee: 7,
  
    frequencyMeta: {
      monthly: { visitsPerYear: 12 },
      twicePerMonth: { visitsPerYear: 24 },
      bimonthly: { visitsPerYear: 6 },
      quarterly: { visitsPerYear: 4 },
    },
  };
  
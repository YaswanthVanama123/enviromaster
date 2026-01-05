// src/components/admin/PricingTablesView.tsx

import React, { useState, useEffect } from "react";
import { useServiceConfigs, useActiveProductCatalog } from "../../backendservice/hooks";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import type { Product } from "../../backendservice/types/productCatalog.types";
import { Toast } from "./Toast";
import { ServicePricingDetailedView } from "./ServicePricingDetailedView";
import "./PricingTablesView.css";

// Utility function to truncate text
const truncateText = (text: string | undefined, maxLength: number): string => {
  if (!text) return "—";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export const PricingTablesView: React.FC = () => {
  const { configs, loading: servicesLoading, error: servicesError, updateConfig } = useServiceConfigs();
  const { catalog, loading: catalogLoading, error: catalogError, updateCatalog } = useActiveProductCatalog();

  // Product state
  const [selectedProductFamily, setSelectedProductFamily] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<{ familyKey: string; productKey: string; field: "basePrice" | "warrantyPrice"; value: string } | null>(null);

  // Service state
  const [selectedService, setSelectedService] = useState<string>("");
  const [editingServiceField, setEditingServiceField] = useState<{ serviceId: string; path: string[]; value: string } | null>(null);
  const [detailedViewService, setDetailedViewService] = useState<ServiceConfig | null>(null);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set initial selections
  useEffect(() => {
    if (catalog && catalog.families.length > 0 && !selectedProductFamily) {
      setSelectedProductFamily(catalog.families[0].key);
    }
  }, [catalog, selectedProductFamily]);

  useEffect(() => {
    if (configs.length > 0 && !selectedService) {
      setSelectedService(configs[0].serviceId);
    }
  }, [configs, selectedService]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Helper function to intelligently format field values based on label or unit
  const formatFieldValue = (field: { label: string; value: number; unit?: string }): string => {
    // If unit is provided, use it
    if (field.unit) {
      // For dollar units, format with $
      if (field.unit === "$" || field.unit.startsWith("$")) {
        return `$${field.value.toFixed(2)}`;
      }
      // For other units, show value with unit
      return `${field.value.toFixed(2)} ${field.unit}`;
    }

    // Fallback: intelligent formatting based on label patterns
    const label = field.label.toLowerCase();

    // Multipliers (shown as is with × symbol)
    if (label.includes("multiplier") || label.includes("factor")) {
      return `${field.value.toFixed(2)}×`;
    }

    // Square feet
    if (label.includes("sq ft") || label.includes("square f")) {
      return `${field.value.toFixed(0)} sq ft`;
    }

    // Fixtures
    if (label.includes("fixture") && !label.includes("rate") && !label.includes("per")) {
      return `${field.value.toFixed(0)} fixtures`;
    }

    // Visits per year
    if (label.includes("visits") && label.includes("year")) {
      return `${field.value.toFixed(0)} visits/year`;
    }

    // Weeks/Months
    if (label.includes("weeks per") || label.includes("weeks/")) {
      return `${field.value.toFixed(2)} weeks`;
    }
    if (label.includes("months")) {
      return `${field.value.toFixed(0)} months`;
    }

    // Hours
    if (label.includes("hours") && !label.includes("rate")) {
      return `${field.value.toFixed(1)} hours`;
    }

    // Drains
    if (label.includes("drains") && !label.includes("rate") && !label.includes("per")) {
      return `${field.value.toFixed(0)} drains`;
    }

    // Places (dusting)
    if (label.includes("places")) {
      return `${field.value.toFixed(0)} places`;
    }

    // Default to dollar amount for rates, charges, prices, fees, minimums
    if (label.includes("rate") || label.includes("charge") || label.includes("price") ||
        label.includes("fee") || label.includes("minimum") || label.includes("credit") ||
        label.includes("addon") || label.includes("base") || label.includes("upgrade")) {
      return `$${field.value.toFixed(2)}`;
    }

    // Final fallback
    return `${field.value.toFixed(2)}`;
  };

  // Extract pricing fields from service config
  const extractServicePricing = (config: any, serviceId: string) => {
    const fields: Array<{ label: string; value: number; path: string[]; unit?: string }> = [];

    // ✅ ENHANCED: Initialize common nested objects with defaults if they don't exist
    // This ensures that frequency metadata fields show up even if the objects are undefined
    const ensureNestedDefaults = (config: any) => {
      if (!config.frequencyMetadata) {
        config.frequencyMetadata = {};
      }
      if (!config.frequencyMetadata.weekly) {
        config.frequencyMetadata.weekly = { monthlyRecurringMultiplier: 0, firstMonthExtraMultiplier: 0 };
      }
      if (!config.frequencyMetadata.biweekly) {
        config.frequencyMetadata.biweekly = { monthlyRecurringMultiplier: 0, firstMonthExtraMultiplier: 0 };
      }
      if (!config.frequencyMetadata.monthly) {
        config.frequencyMetadata.monthly = { cycleMonths: 0 };
      }
      if (!config.frequencyMetadata.bimonthly) {
        config.frequencyMetadata.bimonthly = { cycleMonths: 0 };
      }
      if (!config.frequencyMetadata.quarterly) {
        config.frequencyMetadata.quarterly = { cycleMonths: 0 };
      }
      if (!config.frequencyMetadata.biannual) {
        config.frequencyMetadata.biannual = { cycleMonths: 0 };
      }
      if (!config.frequencyMetadata.annual) {
        config.frequencyMetadata.annual = { cycleMonths: 0 };
      }
      return config;
    };

    // Apply defaults to config
    config = ensureNestedDefaults(config);

    // SANICLEAN - ACTUAL DATABASE STRUCTURE
    if (serviceId === "saniclean") {
    // Standard A La Carte Pricing - Inside Beltway
    if (config.standardALaCartePricing?.insideBeltway) {
      const ib = config.standardALaCartePricing.insideBeltway;
      if (ib.pricePerFixture !== undefined) fields.push({ label: "Inside Beltway - Price Per Fixture", value: ib.pricePerFixture, path: ["standardALaCartePricing", "insideBeltway", "pricePerFixture"], unit: "$ per fixture" });
      if (ib.minimumPrice !== undefined) fields.push({ label: "Inside Beltway - Minimum Price", value: ib.minimumPrice, path: ["standardALaCartePricing", "insideBeltway", "minimumPrice"], unit: "$" });
      if (ib.tripCharge !== undefined) fields.push({ label: "Inside Beltway - Trip Charge", value: ib.tripCharge, path: ["standardALaCartePricing", "insideBeltway", "tripCharge"], unit: "$" });
      if (ib.parkingFeeAddOn !== undefined) fields.push({ label: "Inside Beltway - Parking Fee Add-On", value: ib.parkingFeeAddOn, path: ["standardALaCartePricing", "insideBeltway", "parkingFeeAddOn"], unit: "$" });
    }

    // Standard A La Carte Pricing - Outside Beltway
    if (config.standardALaCartePricing?.outsideBeltway) {
      const ob = config.standardALaCartePricing.outsideBeltway;
      if (ob.pricePerFixture !== undefined) fields.push({ label: "Outside Beltway - Price Per Fixture", value: ob.pricePerFixture, path: ["standardALaCartePricing", "outsideBeltway", "pricePerFixture"], unit: "$ per fixture" });
      if (ob.tripCharge !== undefined) fields.push({ label: "Outside Beltway - Trip Charge", value: ob.tripCharge, path: ["standardALaCartePricing", "outsideBeltway", "tripCharge"], unit: "$" });
    }

    // All-Inclusive Pricing
    if (config.allInclusivePricing) {
      if (config.allInclusivePricing.pricePerFixture !== undefined) fields.push({ label: "All-Inclusive - Price Per Fixture", value: config.allInclusivePricing.pricePerFixture, path: ["allInclusivePricing", "pricePerFixture"], unit: "$ per fixture" });
      if (config.allInclusivePricing.autoAllInclusiveMinFixtures !== undefined) fields.push({ label: "All-Inclusive - Auto Min Fixtures", value: config.allInclusivePricing.autoAllInclusiveMinFixtures, path: ["allInclusivePricing", "autoAllInclusiveMinFixtures"], unit: "fixtures" });
    }

    // Small Bathroom Minimums
    if (config.smallBathroomMinimums) {
      if (config.smallBathroomMinimums.minimumFixturesThreshold !== undefined) fields.push({ label: "Small Bathroom - Fixtures Threshold", value: config.smallBathroomMinimums.minimumFixturesThreshold, path: ["smallBathroomMinimums", "minimumFixturesThreshold"], unit: "fixtures" });
      if (config.smallBathroomMinimums.minimumPriceUnderThreshold !== undefined) fields.push({ label: "Small Bathroom - Minimum Price", value: config.smallBathroomMinimums.minimumPriceUnderThreshold, path: ["smallBathroomMinimums", "minimumPriceUnderThreshold"], unit: "$" });
    }

    // Warranty Fees
    if (config.warrantyFees) {
      if (config.warrantyFees.airFreshenerDispenserWarrantyFeePerWeek !== undefined) fields.push({ label: "Air Freshener Dispenser - Warranty Fee Per Week", value: config.warrantyFees.airFreshenerDispenserWarrantyFeePerWeek, path: ["warrantyFees", "airFreshenerDispenserWarrantyFeePerWeek"], unit: "$ per week" });
      if (config.warrantyFees.soapDispenserWarrantyFeePerWeek !== undefined) fields.push({ label: "Soap Dispenser - Warranty Fee Per Week", value: config.warrantyFees.soapDispenserWarrantyFeePerWeek, path: ["warrantyFees", "soapDispenserWarrantyFeePerWeek"], unit: "$ per week" });
    }

    // Soap Upgrades
    if (config.soapUpgrades) {
      if (config.soapUpgrades.standardToLuxuryPerDispenserPerWeek !== undefined) fields.push({ label: "Soap Upgrade - Standard to Luxury Per Week", value: config.soapUpgrades.standardToLuxuryPerDispenserPerWeek, path: ["soapUpgrades", "standardToLuxuryPerDispenserPerWeek"], unit: "$ per dispenser per week" });
      if (config.soapUpgrades.excessUsageCharges) {
        if (config.soapUpgrades.excessUsageCharges.standardSoapPerGallon !== undefined) fields.push({ label: "Excess Standard Soap - Per Gallon", value: config.soapUpgrades.excessUsageCharges.standardSoapPerGallon, path: ["soapUpgrades", "excessUsageCharges", "standardSoapPerGallon"], unit: "$ per gallon" });
        if (config.soapUpgrades.excessUsageCharges.luxurySoapPerGallon !== undefined) fields.push({ label: "Excess Luxury Soap - Per Gallon", value: config.soapUpgrades.excessUsageCharges.luxurySoapPerGallon, path: ["soapUpgrades", "excessUsageCharges", "luxurySoapPerGallon"], unit: "$ per gallon" });
      }
    }

    // Paper Credit
    if (config.paperCredit?.creditPerFixturePerWeek !== undefined) {
      fields.push({ label: "Paper Credit - Per Fixture Per Week", value: config.paperCredit.creditPerFixturePerWeek, path: ["paperCredit", "creditPerFixturePerWeek"], unit: "$" });
    }

    // Included Items
    if (config.includedItems) {
      if (config.includedItems.electrostaticSprayIncluded !== undefined) fields.push({ label: "Electrostatic Spray Included", value: config.includedItems.electrostaticSprayIncluded ? 1 : 0, path: ["includedItems", "electrostaticSprayIncluded"], unit: "boolean" });
      if (config.includedItems.includedWeeklyRefillsDefault !== undefined) fields.push({ label: "Included Weekly Refills Default", value: config.includedItems.includedWeeklyRefillsDefault, path: ["includedItems", "includedWeeklyRefillsDefault"], unit: "refills" });
    }

    // Monthly Add-On Supply Pricing
    if (config.monthlyAddOnSupplyPricing) {
      if (config.monthlyAddOnSupplyPricing.urinalMatMonthlyPrice !== undefined) fields.push({ label: "Urinal Mat - Monthly Price", value: config.monthlyAddOnSupplyPricing.urinalMatMonthlyPrice, path: ["monthlyAddOnSupplyPricing", "urinalMatMonthlyPrice"], unit: "$ per month" });
      const urinalScreenPrice = config.monthlyAddOnSupplyPricing.urinalScreenMonthlyPrice;
      if (urinalScreenPrice !== undefined) {
        const val = urinalScreenPrice === "included" ? 0 : urinalScreenPrice;
        fields.push({ label: "Urinal Screen - Monthly Price", value: val, path: ["monthlyAddOnSupplyPricing", "urinalScreenMonthlyPrice"], unit: urinalScreenPrice === "included" ? "included" : "$ per month" });
      }
      if (config.monthlyAddOnSupplyPricing.toiletClipMonthlyPrice !== undefined) fields.push({ label: "Toilet Clip - Monthly Price", value: config.monthlyAddOnSupplyPricing.toiletClipMonthlyPrice, path: ["monthlyAddOnSupplyPricing", "toiletClipMonthlyPrice"], unit: "$ per month" });
      const seatCoverPrice = config.monthlyAddOnSupplyPricing.toiletSeatCoverDispenserMonthlyPrice;
      if (seatCoverPrice !== undefined) {
        const val = seatCoverPrice === "included" ? 0 : seatCoverPrice;
        fields.push({ label: "Toilet Seat Cover Dispenser - Monthly Price", value: val, path: ["monthlyAddOnSupplyPricing", "toiletSeatCoverDispenserMonthlyPrice"], unit: seatCoverPrice === "included" ? "included" : "$ per month" });
      }
      if (config.monthlyAddOnSupplyPricing.sanipodMonthlyPricePerPod !== undefined) fields.push({ label: "SaniPod - Monthly Price Per Pod", value: config.monthlyAddOnSupplyPricing.sanipodMonthlyPricePerPod, path: ["monthlyAddOnSupplyPricing", "sanipodMonthlyPricePerPod"], unit: "$ per month" });
    }

    // Microfiber Mopping Included with SaniClean
    if (config.microfiberMoppingIncludedWithSaniClean) {
      if (config.microfiberMoppingIncludedWithSaniClean.pricePerBathroom !== undefined) fields.push({ label: "Microfiber Mopping - Price Per Bathroom", value: config.microfiberMoppingIncludedWithSaniClean.pricePerBathroom, path: ["microfiberMoppingIncludedWithSaniClean", "pricePerBathroom"], unit: "$ per bathroom" });
      if (config.microfiberMoppingIncludedWithSaniClean.hugeBathroomSqFtUnit !== undefined) fields.push({ label: "Microfiber Mopping - Huge Bathroom Sq-ft Unit", value: config.microfiberMoppingIncludedWithSaniClean.hugeBathroomSqFtUnit, path: ["microfiberMoppingIncludedWithSaniClean", "hugeBathroomSqFtUnit"], unit: "sq ft" });
      if (config.microfiberMoppingIncludedWithSaniClean.hugeBathroomRate !== undefined) fields.push({ label: "Microfiber Mopping - Huge Bathroom Rate", value: config.microfiberMoppingIncludedWithSaniClean.hugeBathroomRate, path: ["microfiberMoppingIncludedWithSaniClean", "hugeBathroomRate"], unit: "$ per unit" });
    }

    // Trip Charges (Non All-Inclusive Only)
    // if (config.tripChargesNonAllInclusiveOnly) {
    //   if (config.tripChargesNonAllInclusiveOnly.standard !== undefined) fields.push({ label: "Trip Charge - Standard (Non All-Inclusive)", value: config.tripChargesNonAllInclusiveOnly.standard, path: ["tripChargesNonAllInclusiveOnly", "standard"], unit: "$" });
    //   if (config.tripChargesNonAllInclusiveOnly.beltway !== undefined) fields.push({ label: "Trip Charge - Beltway (Non All-Inclusive)", value: config.tripChargesNonAllInclusiveOnly.beltway, path: ["tripChargesNonAllInclusiveOnly", "beltway"], unit: "$" });
    // }

    // Frequency Metadata
    if (config.frequencyMetadata) {
      if (config.frequencyMetadata.weekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Weekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.weekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.weekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Weekly - First Month Extra Multiplier", value: config.frequencyMetadata.weekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Biweekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.biweekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Biweekly - First Month Extra Multiplier", value: config.frequencyMetadata.biweekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"], unit: "×" });
      // if (config.frequencyMetadata.bimonthly?.cycleMonths !== undefined) fields.push({ label: "Bimonthly - Cycle Months", value: config.frequencyMetadata.bimonthly.cycleMonths, path: ["frequencyMetadata", "bimonthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.quarterly?.cycleMonths !== undefined) fields.push({ label: "Quarterly - Cycle Months", value: config.frequencyMetadata.quarterly.cycleMonths, path: ["frequencyMetadata", "quarterly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.biannual?.cycleMonths !== undefined) fields.push({ label: "Biannual - Cycle Months", value: config.frequencyMetadata.biannual.cycleMonths, path: ["frequencyMetadata", "biannual", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.annual?.cycleMonths !== undefined) fields.push({ label: "Annual - Cycle Months", value: config.frequencyMetadata.annual.cycleMonths, path: ["frequencyMetadata", "annual", "cycleMonths"], unit: "months" });
    }
    } // End SaniClean

    // SANIPOD - ACTUAL DATABASE STRUCTURE
    if (serviceId === "sanipod") {
    // Core Pricing (Included with SaniClean)
    if (config.corePricingIncludedWithSaniClean) {
      const core = config.corePricingIncludedWithSaniClean;
      if (core.weeklyPricePerUnit !== undefined) fields.push({ label: "Core Pricing - Weekly Price Per Unit", value: core.weeklyPricePerUnit, path: ["corePricingIncludedWithSaniClean", "weeklyPricePerUnit"], unit: "$ per pod" });
      if (core.installPricePerUnit !== undefined) fields.push({ label: "Core Pricing - Install Price Per Unit", value: core.installPricePerUnit, path: ["corePricingIncludedWithSaniClean", "installPricePerUnit"], unit: "$ per pod" });
      if (core.includedWeeklyRefills !== undefined) fields.push({ label: "Core Pricing - Included Weekly Refills", value: core.includedWeeklyRefills, path: ["corePricingIncludedWithSaniClean", "includedWeeklyRefills"], unit: "refills" });
    }

    // Extra Bag Pricing
    if (config.extraBagPricing?.pricePerBag !== undefined) fields.push({ label: "Extra Bag - Price Per Bag", value: config.extraBagPricing.pricePerBag, path: ["extraBagPricing", "pricePerBag"], unit: "$ per bag" });

    // Standalone Pricing (Without SaniClean)
    if (config.standalonePricingWithoutSaniClean) {
      const standalone = config.standalonePricingWithoutSaniClean;
      if (standalone.pricePerUnitPerWeek !== undefined) fields.push({ label: "Standalone - Price Per Unit Per Week (Option A)", value: standalone.pricePerUnitPerWeek, path: ["standalonePricingWithoutSaniClean", "pricePerUnitPerWeek"], unit: "$ per pod" });
      if (standalone.alternatePricePerUnitPerWeek !== undefined) fields.push({ label: "Standalone - Alternate Price Per Unit Per Week (Option B)", value: standalone.alternatePricePerUnitPerWeek, path: ["standalonePricingWithoutSaniClean", "alternatePricePerUnitPerWeek"], unit: "$ per pod" });
      if (standalone.weeklyMinimumPrice !== undefined) fields.push({ label: "Standalone - Weekly Minimum Price", value: standalone.weeklyMinimumPrice, path: ["standalonePricingWithoutSaniClean", "weeklyMinimumPrice"], unit: "$" });
    }

    // Frequency Schedules
    if (config.frequencySchedules) {
      if (config.frequencySchedules.weekly?.visitsPerYear !== undefined) fields.push({ label: "Frequency Schedule - Weekly Visits Per Year", value: config.frequencySchedules.weekly.visitsPerYear, path: ["frequencySchedules", "weekly", "visitsPerYear"], unit: "visits/year" });
      if (config.frequencySchedules.biweekly?.visitsPerYear !== undefined) fields.push({ label: "Frequency Schedule - Biweekly Visits Per Year", value: config.frequencySchedules.biweekly.visitsPerYear, path: ["frequencySchedules", "biweekly", "visitsPerYear"], unit: "visits/year" });
      if (config.frequencySchedules.monthly?.visitsPerYear !== undefined) fields.push({ label: "Frequency Schedule - Monthly Visits Per Year", value: config.frequencySchedules.monthly.visitsPerYear, path: ["frequencySchedules", "monthly", "visitsPerYear"], unit: "visits/year" });
    }

    // Billing Conversions
    if (config.billingConversions) {
      if (config.billingConversions.weeksPerMonth !== undefined) fields.push({ label: "Billing Conversions - Weeks Per Month", value: config.billingConversions.weeksPerMonth, path: ["billingConversions", "weeksPerMonth"], unit: "weeks" });
      if (config.billingConversions.weeksPerYear !== undefined) fields.push({ label: "Billing Conversions - Weeks Per Year", value: config.billingConversions.weeksPerYear, path: ["billingConversions", "weeksPerYear"], unit: "weeks" });
    }

    // Contract Terms
    // if (config.minContractMonths !== undefined) fields.push({ label: "Minimum Contract Months", value: config.minContractMonths, path: ["minContractMonths"], unit: "months" });
    // if (config.maxContractMonths !== undefined) fields.push({ label: "Maximum Contract Months", value: config.maxContractMonths, path: ["maxContractMonths"], unit: "months" });

    // Rate Tiers
    // if (config.rateCategories?.redRate?.multiplier !== undefined) fields.push({ label: "Red Rate Multiplier", value: config.rateCategories.redRate.multiplier, path: ["rateCategories", "redRate", "multiplier"], unit: "×" });
    // if (config.rateCategories?.redRate?.commissionRate !== undefined) {
    //   const commValue = typeof config.rateCategories.redRate.commissionRate === 'string'
    //     ? parseFloat(config.rateCategories.redRate.commissionRate.replace('%', ''))
    //     : config.rateCategories.redRate.commissionRate;
    //   fields.push({ label: "Red Rate Commission", value: commValue, path: ["rateCategories", "redRate", "commissionRate"], unit: "%" });
    // }
    // if (config.rateCategories?.greenRate?.multiplier !== undefined) fields.push({ label: "Green Rate Multiplier", value: config.rateCategories.greenRate.multiplier, path: ["rateCategories", "greenRate", "multiplier"], unit: "×" });
    // if (config.rateCategories?.greenRate?.commissionRate !== undefined) {
    //   const commValue = typeof config.rateCategories.greenRate.commissionRate === 'string'
    //     ? parseFloat(config.rateCategories.greenRate.commissionRate.replace('%', ''))
    //     : config.rateCategories.greenRate.commissionRate;
    //   fields.push({ label: "Green Rate Commission", value: commValue, path: ["rateCategories", "greenRate", "commissionRate"], unit: "%" });
    // }

    // Frequency Metadata
    if (config.frequencyMetadata) {
      if (config.frequencyMetadata.weekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Weekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.weekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.weekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Weekly - First Month Extra Multiplier", value: config.frequencyMetadata.weekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Biweekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.biweekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Biweekly - First Month Extra Multiplier", value: config.frequencyMetadata.biweekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"], unit: "×" });
      // if (config.frequencyMetadata.monthly?.cycleMonths !== undefined) fields.push({ label: "Monthly - Cycle Months", value: config.frequencyMetadata.monthly.cycleMonths, path: ["frequencyMetadata", "monthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.bimonthly?.cycleMonths !== undefined) fields.push({ label: "Bimonthly - Cycle Months", value: config.frequencyMetadata.bimonthly.cycleMonths, path: ["frequencyMetadata", "bimonthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.quarterly?.cycleMonths !== undefined) fields.push({ label: "Quarterly - Cycle Months", value: config.frequencyMetadata.quarterly.cycleMonths, path: ["frequencyMetadata", "quarterly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.biannual?.cycleMonths !== undefined) fields.push({ label: "Biannual - Cycle Months", value: config.frequencyMetadata.biannual.cycleMonths, path: ["frequencyMetadata", "biannual", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.annual?.cycleMonths !== undefined) fields.push({ label: "Annual - Cycle Months", value: config.frequencyMetadata.annual.cycleMonths, path: ["frequencyMetadata", "annual", "cycleMonths"], unit: "months" });
    }
    } // End SaniPod

    // SANISCRUB - Complete extraction (ACTUAL STRUCTURE FROM DATABASE)
    if (serviceId === "saniscrub") {
    // Monthly Pricing
    if (config.monthlyPricing) {
      if (config.monthlyPricing.pricePerFixture !== undefined) fields.push({ label: "Monthly - Price Per Fixture", value: config.monthlyPricing.pricePerFixture, path: ["monthlyPricing", "pricePerFixture"], unit: "$ per fixture" });
      if (config.monthlyPricing.minimumPrice !== undefined) fields.push({ label: "Monthly - Minimum Price", value: config.monthlyPricing.minimumPrice, path: ["monthlyPricing", "minimumPrice"], unit: "$" });
    }

    // Bimonthly Pricing
    if (config.bimonthlyPricing) {
      if (config.bimonthlyPricing.pricePerFixture !== undefined) fields.push({ label: "Bimonthly - Price Per Fixture", value: config.bimonthlyPricing.pricePerFixture, path: ["bimonthlyPricing", "pricePerFixture"], unit: "$ per fixture" });
      if (config.bimonthlyPricing.minimumPrice !== undefined) fields.push({ label: "Bimonthly - Minimum Price", value: config.bimonthlyPricing.minimumPrice, path: ["bimonthlyPricing", "minimumPrice"], unit: "$" });
    }

    // Quarterly Pricing
    if (config.quarterlyPricing) {
      if (config.quarterlyPricing.pricePerFixture !== undefined) fields.push({ label: "Quarterly - Price Per Fixture", value: config.quarterlyPricing.pricePerFixture, path: ["quarterlyPricing", "pricePerFixture"], unit: "$ per fixture" });
      if (config.quarterlyPricing.minimumPrice !== undefined) fields.push({ label: "Quarterly - Minimum Price", value: config.quarterlyPricing.minimumPrice, path: ["quarterlyPricing", "minimumPrice"], unit: "$" });
    }

    // Twice Per Month Pricing
    if (config.twicePerMonthPricing?.discountFromMonthlyRate !== undefined) fields.push({ label: "Twice Per Month - Discount from Monthly Rate", value: config.twicePerMonthPricing.discountFromMonthlyRate, path: ["twicePerMonthPricing", "discountFromMonthlyRate"], unit: "$" });

    // Non-Bathroom Pricing
    if (config.nonBathroomSqFtPricingRule) {
      if (config.nonBathroomSqFtPricingRule.sqFtBlockUnit !== undefined) fields.push({ label: "Non-Bathroom - Sq Ft Block Unit", value: config.nonBathroomSqFtPricingRule.sqFtBlockUnit, path: ["nonBathroomSqFtPricingRule", "sqFtBlockUnit"], unit: "sq ft" });
      if (config.nonBathroomSqFtPricingRule.priceFirstBlock !== undefined) fields.push({ label: "Non-Bathroom - Price First Block", value: config.nonBathroomSqFtPricingRule.priceFirstBlock, path: ["nonBathroomSqFtPricingRule", "priceFirstBlock"], unit: "$" });
      if (config.nonBathroomSqFtPricingRule.priceAdditionalBlock !== undefined) fields.push({ label: "Non-Bathroom - Price Additional Block", value: config.nonBathroomSqFtPricingRule.priceAdditionalBlock, path: ["nonBathroomSqFtPricingRule", "priceAdditionalBlock"], unit: "$" });
    }

    // Installation Pricing
    if (config.installationPricing?.installMultiplierDirtyOrFirstTime !== undefined) fields.push({ label: "Installation - Multiplier (Dirty or First Time)", value: config.installationPricing.installMultiplierDirtyOrFirstTime, path: ["installationPricing", "installMultiplierDirtyOrFirstTime"], unit: "×" });

    // Trip Charges & Fees
    if (config.tripCharges) {
      // if (config.tripCharges.standard !== undefined) fields.push({ label: "Trip Charge - Standard", value: config.tripCharges.standard, path: ["tripCharges", "standard"], unit: "$" });
      // if (config.tripCharges.beltway !== undefined) fields.push({ label: "Trip Charge - Beltway", value: config.tripCharges.beltway, path: ["tripCharges", "beltway"], unit: "$" });
    }
    // if (config.parkingFeeAddOn !== undefined) fields.push({ label: "Parking Fee Add-On", value: config.parkingFeeAddOn, path: ["parkingFeeAddOn"], unit: "$" });

    // Frequency Metadata
    if (config.frequencyMetadata) {
      if (config.frequencyMetadata.weekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Weekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.weekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.weekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Weekly - First Month Extra Multiplier", value: config.frequencyMetadata.weekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Biweekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.biweekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Biweekly - First Month Extra Multiplier", value: config.frequencyMetadata.biweekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"], unit: "×" });
      // if (config.frequencyMetadata.monthly?.cycleMonths !== undefined) fields.push({ label: "Monthly - Cycle Months", value: config.frequencyMetadata.monthly.cycleMonths, path: ["frequencyMetadata", "monthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.bimonthly?.cycleMonths !== undefined) fields.push({ label: "Bimonthly - Cycle Months", value: config.frequencyMetadata.bimonthly.cycleMonths, path: ["frequencyMetadata", "bimonthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.quarterly?.cycleMonths !== undefined) fields.push({ label: "Quarterly - Cycle Months", value: config.frequencyMetadata.quarterly.cycleMonths, path: ["frequencyMetadata", "quarterly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.biannual?.cycleMonths !== undefined) fields.push({ label: "Biannual - Cycle Months", value: config.frequencyMetadata.biannual.cycleMonths, path: ["frequencyMetadata", "biannual", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.annual?.cycleMonths !== undefined) fields.push({ label: "Annual - Cycle Months", value: config.frequencyMetadata.annual.cycleMonths, path: ["frequencyMetadata", "annual", "cycleMonths"], unit: "months" });
    }
    } // End SaniScrub

    // FOAMING DRAIN - Complete extraction (NEW STRUCTURE)
    if (serviceId === "foamingDrain") {
    if (config.standardPricing) {
      if (config.standardPricing.standardDrainRate !== undefined) fields.push({ label: "Standard Drain Rate", value: config.standardPricing.standardDrainRate, path: ["standardPricing", "standardDrainRate"], unit: "$ per drain" });
      if (config.standardPricing.alternateBaseCharge !== undefined) fields.push({ label: "Alternate Base Charge", value: config.standardPricing.alternateBaseCharge, path: ["standardPricing", "alternateBaseCharge"], unit: "$" });
      if (config.standardPricing.alternateExtraPerDrain !== undefined) fields.push({ label: "Alternate Extra per Drain", value: config.standardPricing.alternateExtraPerDrain, path: ["standardPricing", "alternateExtraPerDrain"], unit: "$ per drain" });
    }
    if (config.minimumChargePerVisit !== undefined) fields.push({ label: "Minimum Charge Per Visit", value: config.minimumChargePerVisit, path: ["minimumChargePerVisit"], unit: "$" });

    // Volume Pricing (NEW STRUCTURE)
    if (config.volumePricing?.minimumDrains !== undefined) fields.push({ label: "Volume Pricing - Minimum Drains", value: config.volumePricing.minimumDrains, path: ["volumePricing", "minimumDrains"], unit: "drains" });
    if (config.volumePricing?.weeklyRatePerDrain !== undefined) fields.push({ label: "Volume Pricing - Weekly Rate per Drain", value: config.volumePricing.weeklyRatePerDrain, path: ["volumePricing", "weeklyRatePerDrain"], unit: "$ per drain" });
    if (config.volumePricing?.bimonthlyRatePerDrain !== undefined) fields.push({ label: "Volume Pricing - Bimonthly Rate per Drain", value: config.volumePricing.bimonthlyRatePerDrain, path: ["volumePricing", "bimonthlyRatePerDrain"], unit: "$ per drain" });

    // Grease Trap (NEW STRUCTURE)
    if (config.greaseTrapPricing) {
      if (config.greaseTrapPricing.weeklyRatePerTrap !== undefined) fields.push({ label: "Grease Trap - Weekly Rate per Trap", value: config.greaseTrapPricing.weeklyRatePerTrap, path: ["greaseTrapPricing", "weeklyRatePerTrap"], unit: "$ per trap" });
      if (config.greaseTrapPricing.installPerTrap !== undefined) fields.push({ label: "Grease Trap - Install per Trap", value: config.greaseTrapPricing.installPerTrap, path: ["greaseTrapPricing", "installPerTrap"], unit: "$" });
    }

    // Green Drain (NEW STRUCTURE)
    if (config.greenDrainPricing) {
      if (config.greenDrainPricing.installPerDrain !== undefined) fields.push({ label: "Green Drain - Install per Drain", value: config.greenDrainPricing.installPerDrain, path: ["greenDrainPricing", "installPerDrain"], unit: "$" });
      if (config.greenDrainPricing.weeklyRatePerDrain !== undefined) fields.push({ label: "Green Drain - Weekly Rate per Drain", value: config.greenDrainPricing.weeklyRatePerDrain, path: ["greenDrainPricing", "weeklyRatePerDrain"], unit: "$ per drain" });
    }

    // Add-ons (NEW STRUCTURE)
    if (config.addOns?.plumbingWeeklyAddonPerDrain !== undefined) fields.push({ label: "Plumbing - Weekly Addon per Drain", value: config.addOns.plumbingWeeklyAddonPerDrain, path: ["addOns", "plumbingWeeklyAddonPerDrain"], unit: "$ per drain" });

    // Installation Multipliers (NEW STRUCTURE)
    if (config.installationMultipliers?.filthyMultiplier !== undefined) fields.push({ label: "Installation - Filthy Multiplier", value: config.installationMultipliers.filthyMultiplier, path: ["installationMultipliers", "filthyMultiplier"], unit: "×" });

    // Contract Terms (NEW STRUCTURE)
    // if (config.contract?.minMonths !== undefined) fields.push({ label: "Contract - Minimum Months", value: config.contract.minMonths, path: ["contract", "minMonths"], unit: "months" });
    // if (config.contract?.maxMonths !== undefined) fields.push({ label: "Contract - Maximum Months", value: config.contract.maxMonths, path: ["contract", "maxMonths"], unit: "months" });
    // if (config.contract?.defaultMonths !== undefined) fields.push({ label: "Contract - Default Months", value: config.contract.defaultMonths, path: ["contract", "defaultMonths"], unit: "months" });

    // Frequency Metadata
    if (config.frequencyMetadata) {
      if (config.frequencyMetadata.weekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Weekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.weekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.weekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Weekly - First Month Extra Multiplier", value: config.frequencyMetadata.weekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Biweekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.biweekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Biweekly - First Month Extra Multiplier", value: config.frequencyMetadata.biweekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"], unit: "×" });
      // if (config.frequencyMetadata.bimonthly?.cycleMonths !== undefined) fields.push({ label: "Bimonthly - Cycle Months", value: config.frequencyMetadata.bimonthly.cycleMonths, path: ["frequencyMetadata", "bimonthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.quarterly?.cycleMonths !== undefined) fields.push({ label: "Quarterly - Cycle Months", value: config.frequencyMetadata.quarterly.cycleMonths, path: ["frequencyMetadata", "quarterly", "cycleMonths"], unit: "months" });
    }
    } // End Foaming Drain

    // MICROFIBER MOPPING - Complete extraction (NEW STRUCTURE)
    if (serviceId === "microfiberMopping") {
    // Bathroom Mopping Pricing
    if (config.bathroomMoppingPricing?.flatPricePerBathroom !== undefined) fields.push({ label: "Flat Price Per Bathroom", value: config.bathroomMoppingPricing.flatPricePerBathroom, path: ["bathroomMoppingPricing", "flatPricePerBathroom"], unit: "$ per bathroom" });
    if (config.bathroomMoppingPricing?.hugeBathroomSqFtUnit !== undefined) fields.push({ label: "Huge Bathroom - Sq-ft Unit", value: config.bathroomMoppingPricing.hugeBathroomSqFtUnit, path: ["bathroomMoppingPricing", "hugeBathroomSqFtUnit"], unit: "sq ft" });
    if (config.bathroomMoppingPricing?.hugeBathroomRate !== undefined) fields.push({ label: "Huge Bathroom - Rate", value: config.bathroomMoppingPricing.hugeBathroomRate, path: ["bathroomMoppingPricing", "hugeBathroomRate"], unit: "$ per unit" });

    // Non-Bathroom Addon Areas
    if (config.nonBathroomAddonAreas?.flatPriceSingleLargeArea !== undefined) fields.push({ label: "Non-Bathroom - Flat Price Single Large Area", value: config.nonBathroomAddonAreas.flatPriceSingleLargeArea, path: ["nonBathroomAddonAreas", "flatPriceSingleLargeArea"], unit: "$" });
    if (config.nonBathroomAddonAreas?.sqFtUnit !== undefined) fields.push({ label: "Non-Bathroom - Sq-ft Unit", value: config.nonBathroomAddonAreas.sqFtUnit, path: ["nonBathroomAddonAreas", "sqFtUnit"], unit: "sq ft" });
    if (config.nonBathroomAddonAreas?.ratePerSqFtUnit !== undefined) fields.push({ label: "Non-Bathroom - Rate Per Sq-ft Unit", value: config.nonBathroomAddonAreas.ratePerSqFtUnit, path: ["nonBathroomAddonAreas", "ratePerSqFtUnit"], unit: "$ per unit" });

    // Standalone Mopping Pricing
    if (config.standaloneMoppingPricing?.sqFtUnit !== undefined) fields.push({ label: "Standalone - Sq-ft Unit", value: config.standaloneMoppingPricing.sqFtUnit, path: ["standaloneMoppingPricing", "sqFtUnit"], unit: "sq ft" });
    if (config.standaloneMoppingPricing?.ratePerSqFtUnit !== undefined) fields.push({ label: "Standalone - Rate Per Sq-ft Unit", value: config.standaloneMoppingPricing.ratePerSqFtUnit, path: ["standaloneMoppingPricing", "ratePerSqFtUnit"], unit: "$ per unit" });
    if (config.standaloneMoppingPricing?.minimumPrice !== undefined) fields.push({ label: "Standalone - Minimum Price", value: config.standaloneMoppingPricing.minimumPrice, path: ["standaloneMoppingPricing", "minimumPrice"], unit: "$" });

    // Trip Charges & Minimum
    // if (config.tripCharges?.standard !== undefined) fields.push({ label: "Trip Charge - Standard", value: config.tripCharges.standard, path: ["tripCharges", "standard"], unit: "$" });
    // if (config.tripCharges?.beltway !== undefined) fields.push({ label: "Trip Charge - Beltway", value: config.tripCharges.beltway, path: ["tripCharges", "beltway"], unit: "$" });
    // if (config.minimumChargePerVisit !== undefined) fields.push({ label: "Minimum Charge Per Visit", value: config.minimumChargePerVisit, path: ["minimumChargePerVisit"], unit: "$" });

    // Frequency Metadata
    if (config.frequencyMetadata) {
      if (config.frequencyMetadata.weekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Weekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.weekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.weekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Weekly - First Month Extra Multiplier", value: config.frequencyMetadata.weekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Biweekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.biweekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Biweekly - First Month Extra Multiplier", value: config.frequencyMetadata.biweekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"], unit: "×" });
      // if (config.frequencyMetadata.monthly?.cycleMonths !== undefined) fields.push({ label: "Monthly - Cycle Months", value: config.frequencyMetadata.monthly.cycleMonths, path: ["frequencyMetadata", "monthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.bimonthly?.cycleMonths !== undefined) fields.push({ label: "Bimonthly - Cycle Months", value: config.frequencyMetadata.bimonthly.cycleMonths, path: ["frequencyMetadata", "bimonthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.quarterly?.cycleMonths !== undefined) fields.push({ label: "Quarterly - Cycle Months", value: config.frequencyMetadata.quarterly.cycleMonths, path: ["frequencyMetadata", "quarterly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.biannual?.cycleMonths !== undefined) fields.push({ label: "Biannual - Cycle Months", value: config.frequencyMetadata.biannual.cycleMonths, path: ["frequencyMetadata", "biannual", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.annual?.cycleMonths !== undefined) fields.push({ label: "Annual - Cycle Months", value: config.frequencyMetadata.annual.cycleMonths, path: ["frequencyMetadata", "annual", "cycleMonths"], unit: "months" });
    }
    } // End Microfiber Mopping

    // RPM WINDOWS - Complete extraction (NEW STRUCTURE - 2025)
    if (serviceId === "rpmWindows") {
    // Window Pricing (Both Sides Included)
    if (config.windowPricingBothSidesIncluded?.smallWindowPrice !== undefined) fields.push({ label: "Small Window Price", value: config.windowPricingBothSidesIncluded.smallWindowPrice, path: ["windowPricingBothSidesIncluded", "smallWindowPrice"], unit: "$ per window" });
    if (config.windowPricingBothSidesIncluded?.mediumWindowPrice !== undefined) fields.push({ label: "Medium Window Price", value: config.windowPricingBothSidesIncluded.mediumWindowPrice, path: ["windowPricingBothSidesIncluded", "mediumWindowPrice"], unit: "$ per window" });
    if (config.windowPricingBothSidesIncluded?.largeWindowPrice !== undefined) fields.push({ label: "Large Window Price", value: config.windowPricingBothSidesIncluded.largeWindowPrice, path: ["windowPricingBothSidesIncluded", "largeWindowPrice"], unit: "$ per window" });

    // Install Pricing
    if (config.installPricing?.installationMultiplier !== undefined) fields.push({ label: "Installation Multiplier", value: config.installPricing.installationMultiplier, path: ["installPricing", "installationMultiplier"], unit: "×" });

    // Minimum Charge
    if (config.minimumChargePerVisit !== undefined) fields.push({ label: "Minimum Charge Per Visit", value: config.minimumChargePerVisit, path: ["minimumChargePerVisit"], unit: "$" });

    // Trip Charges
    // if (config.tripCharges?.standard !== undefined) fields.push({ label: "Trip Charge - Standard", value: config.tripCharges.standard, path: ["tripCharges", "standard"], unit: "$" });
    // if (config.tripCharges?.beltway !== undefined) fields.push({ label: "Trip Charge - Beltway", value: config.tripCharges.beltway, path: ["tripCharges", "beltway"], unit: "$" });

    // Frequency Price Multipliers
    if (config.frequencyPriceMultipliers?.biweeklyPriceMultiplier !== undefined) fields.push({ label: "Biweekly Price Multiplier", value: config.frequencyPriceMultipliers.biweeklyPriceMultiplier, path: ["frequencyPriceMultipliers", "biweeklyPriceMultiplier"], unit: "×" });
    if (config.frequencyPriceMultipliers?.monthlyPriceMultiplier !== undefined) fields.push({ label: "Monthly Price Multiplier", value: config.frequencyPriceMultipliers.monthlyPriceMultiplier, path: ["frequencyPriceMultipliers", "monthlyPriceMultiplier"], unit: "×" });
    if (config.frequencyPriceMultipliers?.quarterlyPriceMultiplierAfterFirstTime !== undefined) fields.push({ label: "Quarterly Price Multiplier (After First Time)", value: config.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime, path: ["frequencyPriceMultipliers", "quarterlyPriceMultiplierAfterFirstTime"], unit: "×" });
    if (config.frequencyPriceMultipliers?.quarterlyFirstTimeMultiplier !== undefined) fields.push({ label: "Quarterly First Time Multiplier", value: config.frequencyPriceMultipliers.quarterlyFirstTimeMultiplier, path: ["frequencyPriceMultipliers", "quarterlyFirstTimeMultiplier"], unit: "×" });

    // Frequency Metadata
    if (config.frequencyMetadata) {
      if (config.frequencyMetadata.weekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Weekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.weekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.weekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Weekly - First Month Extra Multiplier", value: config.frequencyMetadata.weekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Biweekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.biweekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Biweekly - First Month Extra Multiplier", value: config.frequencyMetadata.biweekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"], unit: "×" });
      // if (config.frequencyMetadata.bimonthly?.cycleMonths !== undefined) fields.push({ label: "Bimonthly - Cycle Months", value: config.frequencyMetadata.bimonthly.cycleMonths, path: ["frequencyMetadata", "bimonthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.quarterly?.cycleMonths !== undefined) fields.push({ label: "Quarterly - Cycle Months", value: config.frequencyMetadata.quarterly.cycleMonths, path: ["frequencyMetadata", "quarterly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.biannual?.cycleMonths !== undefined) fields.push({ label: "Biannual - Cycle Months", value: config.frequencyMetadata.biannual.cycleMonths, path: ["frequencyMetadata", "biannual", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.annual?.cycleMonths !== undefined) fields.push({ label: "Annual - Cycle Months", value: config.frequencyMetadata.annual.cycleMonths, path: ["frequencyMetadata", "annual", "cycleMonths"], unit: "months" });
    }

    // Contract Terms
    // if (config.minContractMonths !== undefined) fields.push({ label: "Minimum Contract Months", value: config.minContractMonths, path: ["minContractMonths"], unit: "months" });
    // if (config.maxContractMonths !== undefined) fields.push({ label: "Maximum Contract Months", value: config.maxContractMonths, path: ["maxContractMonths"], unit: "months" });
    } // End RPM Windows

    // CARPET CLEANING - Complete extraction (NEW STRUCTURE)
    if (serviceId === "carpetCleaning") {
    if (config.baseSqFtUnit !== undefined) fields.push({ label: "Base Sq-ft Unit", value: config.baseSqFtUnit, path: ["baseSqFtUnit"], unit: "sq ft" });
    if (config.basePrice !== undefined) fields.push({ label: "Base Price", value: config.basePrice, path: ["basePrice"], unit: "$" });
    if (config.additionalSqFtUnit !== undefined) fields.push({ label: "Additional Sq-ft Unit", value: config.additionalSqFtUnit, path: ["additionalSqFtUnit"], unit: "sq ft" });
    if (config.additionalUnitPrice !== undefined) fields.push({ label: "Additional Unit Price", value: config.additionalUnitPrice, path: ["additionalUnitPrice"], unit: "$" });
    if (config.minimumChargePerVisit !== undefined) fields.push({ label: "Minimum Charge Per Visit", value: config.minimumChargePerVisit, path: ["minimumChargePerVisit"], unit: "$" });

    // Install Multipliers for Carpet Cleaning (NEW STRUCTURE)
    if (config.installationMultipliers?.dirtyInstallMultiplier !== undefined) fields.push({ label: "Dirty Install Multiplier", value: config.installationMultipliers.dirtyInstallMultiplier, path: ["installationMultipliers", "dirtyInstallMultiplier"], unit: "×" });
    if (config.installationMultipliers?.cleanInstallMultiplier !== undefined) fields.push({ label: "Clean Install Multiplier", value: config.installationMultipliers.cleanInstallMultiplier, path: ["installationMultipliers", "cleanInstallMultiplier"], unit: "×" });

    // Frequency Metadata for Carpet Cleaning (NEW STRUCTURE)
    if (config.frequencyMetadata) {
      if (config.frequencyMetadata.weekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Weekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.weekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.weekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Weekly - First Month Extra Multiplier", value: config.frequencyMetadata.weekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Biweekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.biweekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Biweekly - First Month Extra Multiplier", value: config.frequencyMetadata.biweekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"], unit: "×" });
      // if (config.frequencyMetadata.monthly?.cycleMonths !== undefined) fields.push({ label: "Monthly - Cycle Months", value: config.frequencyMetadata.monthly.cycleMonths, path: ["frequencyMetadata", "monthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.bimonthly?.cycleMonths !== undefined) fields.push({ label: "Bimonthly - Cycle Months", value: config.frequencyMetadata.bimonthly.cycleMonths, path: ["frequencyMetadata", "bimonthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.quarterly?.cycleMonths !== undefined) fields.push({ label: "Quarterly - Cycle Months", value: config.frequencyMetadata.quarterly.cycleMonths, path: ["frequencyMetadata", "quarterly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.biannual?.cycleMonths !== undefined) fields.push({ label: "Biannual - Cycle Months", value: config.frequencyMetadata.biannual.cycleMonths, path: ["frequencyMetadata", "biannual", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.annual?.cycleMonths !== undefined) fields.push({ label: "Annual - Cycle Months", value: config.frequencyMetadata.annual.cycleMonths, path: ["frequencyMetadata", "annual", "cycleMonths"], unit: "months" });
    }

    // Contract Terms for Carpet Cleaning
    // if (config.minContractMonths !== undefined) fields.push({ label: "Minimum Contract Months", value: config.minContractMonths, path: ["minContractMonths"], unit: "months" });
    // if (config.maxContractMonths !== undefined) fields.push({ label: "Maximum Contract Months", value: config.maxContractMonths, path: ["maxContractMonths"], unit: "months" });
    } // End Carpet Cleaning

    // PURE JANITORIAL - Complete extraction (NEW STRUCTURE - ACTUAL DATABASE)
    if (serviceId === "pureJanitorial") {
    // Standard Hourly Pricing
    if (config.standardHourlyPricing?.standardHourlyRate !== undefined) fields.push({ label: "Standard Hourly Rate", value: config.standardHourlyPricing.standardHourlyRate, path: ["standardHourlyPricing", "standardHourlyRate"], unit: "$ per hour" });
    if (config.standardHourlyPricing?.minimumHoursPerTrip !== undefined) fields.push({ label: "Minimum Hours Per Trip", value: config.standardHourlyPricing.minimumHoursPerTrip, path: ["standardHourlyPricing", "minimumHoursPerTrip"], unit: "hours" });

    // Short Job Hourly Pricing
    if (config.shortJobHourlyPricing?.shortJobHourlyRate !== undefined) fields.push({ label: "Short Job Hourly Rate", value: config.shortJobHourlyPricing.shortJobHourlyRate, path: ["shortJobHourlyPricing", "shortJobHourlyRate"], unit: "$ per hour" });

    // Dusting
    if (config.dusting?.itemsPerHour !== undefined) fields.push({ label: "Dusting - Items Per Hour", value: config.dusting.itemsPerHour, path: ["dusting", "itemsPerHour"], unit: "items/hour" });
    if (config.dusting?.pricePerItem !== undefined) fields.push({ label: "Dusting - Price Per Item", value: config.dusting.pricePerItem, path: ["dusting", "pricePerItem"], unit: "$ per item" });
    if (config.dusting?.dirtyFirstTimeMultiplier !== undefined) fields.push({ label: "Dusting - Dirty First Time Multiplier", value: config.dusting.dirtyFirstTimeMultiplier, path: ["dusting", "dirtyFirstTimeMultiplier"], unit: "×" });
    if (config.dusting?.infrequentServiceMultiplier4PerYear !== undefined) fields.push({ label: "Dusting - Infrequent Service Multiplier (4x/year)", value: config.dusting.infrequentServiceMultiplier4PerYear, path: ["dusting", "infrequentServiceMultiplier4PerYear"], unit: "×" });

    // Vacuuming
    if (config.vacuuming?.estimatedTimeHoursPerJob !== undefined) fields.push({ label: "Vacuuming - Estimated Time Hours Per Job", value: config.vacuuming.estimatedTimeHoursPerJob, path: ["vacuuming", "estimatedTimeHoursPerJob"], unit: "hours" });
    if (config.vacuuming?.largeJobMinimumTimeHours !== undefined) fields.push({ label: "Vacuuming - Large Job Minimum Time Hours", value: config.vacuuming.largeJobMinimumTimeHours, path: ["vacuuming", "largeJobMinimumTimeHours"], unit: "hours" });

    // Smooth Breakdown Pricing Table
    if (config.smoothBreakdownPricingTable && Array.isArray(config.smoothBreakdownPricingTable)) {
      config.smoothBreakdownPricingTable.forEach((row: any, index: number) => {
        const label = row.description || `Pricing Tier ${index + 1}`;
        const value = row.price || row.ratePerHour || 0;
        const unit = row.upToMinutes !== undefined ? `up to ${row.upToMinutes} min` : (row.upToHours !== undefined ? `up to ${row.upToHours} hrs` : "$");
        fields.push({ label, value, path: ["smoothBreakdownPricingTable", index.toString(), row.price !== undefined ? "price" : "ratePerHour"], unit });
      });
    }

    // Minimum Charge & Trip Charges
    // if (config.minimumChargePerVisit !== undefined) fields.push({ label: "Minimum Charge Per Visit", value: config.minimumChargePerVisit, path: ["minimumChargePerVisit"], unit: "$" });
    // if (config.tripCharges?.standard !== undefined) fields.push({ label: "Trip Charge - Standard", value: config.tripCharges.standard, path: ["tripCharges", "standard"], unit: "$" });
    // if (config.tripCharges?.beltway !== undefined) fields.push({ label: "Trip Charge - Beltway", value: config.tripCharges.beltway, path: ["tripCharges", "beltway"], unit: "$" });

    // // Contract Terms
    // if (config.contract?.minMonths !== undefined) fields.push({ label: "Contract - Minimum Months", value: config.contract.minMonths, path: ["contract", "minMonths"], unit: "months" });
    // if (config.contract?.maxMonths !== undefined) fields.push({ label: "Contract - Maximum Months", value: config.contract.maxMonths, path: ["contract", "maxMonths"], unit: "months" });

    // Frequency Metadata
    if (config.frequencyMetadata) {
      if (config.frequencyMetadata.weekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Weekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.weekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.weekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Weekly - First Month Extra Multiplier", value: config.frequencyMetadata.weekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Biweekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.biweekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Biweekly - First Month Extra Multiplier", value: config.frequencyMetadata.biweekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"], unit: "×" });
      // if (config.frequencyMetadata.bimonthly?.cycleMonths !== undefined) fields.push({ label: "Bimonthly - Cycle Months", value: config.frequencyMetadata.bimonthly.cycleMonths, path: ["frequencyMetadata", "bimonthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.quarterly?.cycleMonths !== undefined) fields.push({ label: "Quarterly - Cycle Months", value: config.frequencyMetadata.quarterly.cycleMonths, path: ["frequencyMetadata", "quarterly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.biannual?.cycleMonths !== undefined) fields.push({ label: "Biannual - Cycle Months", value: config.frequencyMetadata.biannual.cycleMonths, path: ["frequencyMetadata", "biannual", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.annual?.cycleMonths !== undefined) fields.push({ label: "Annual - Cycle Months", value: config.frequencyMetadata.annual.cycleMonths, path: ["frequencyMetadata", "annual", "cycleMonths"], unit: "months" });
    }
    } // End Pure Janitorial

    // STRIP & WAX - Complete extraction (NEW STRUCTURE)
    if (serviceId === "stripWax") {
    // Variants
    if (config.variants?.standardFull) {
      if (config.variants.standardFull.ratePerSqFt !== undefined) fields.push({ label: "Standard Full - Rate per Sq Ft", value: config.variants.standardFull.ratePerSqFt, path: ["variants", "standardFull", "ratePerSqFt"], unit: "$ per sq ft" });
      if (config.variants.standardFull.minCharge !== undefined) fields.push({ label: "Standard Full - Minimum Charge", value: config.variants.standardFull.minCharge, path: ["variants", "standardFull", "minCharge"], unit: "$" });
    }
    if (config.variants?.noSealant) {
      if (config.variants.noSealant.ratePerSqFt !== undefined) fields.push({ label: "No Sealant - Rate per Sq Ft", value: config.variants.noSealant.ratePerSqFt, path: ["variants", "noSealant", "ratePerSqFt"], unit: "$ per sq ft" });
      if (config.variants.noSealant.minCharge !== undefined) fields.push({ label: "No Sealant - Minimum Charge", value: config.variants.noSealant.minCharge, path: ["variants", "noSealant", "minCharge"], unit: "$" });
    }
    if (config.variants?.wellMaintained) {
      if (config.variants.wellMaintained.ratePerSqFt !== undefined) fields.push({ label: "Well Maintained - Rate per Sq Ft", value: config.variants.wellMaintained.ratePerSqFt, path: ["variants", "wellMaintained", "ratePerSqFt"], unit: "$ per sq ft" });
      if (config.variants.wellMaintained.minCharge !== undefined) fields.push({ label: "Well Maintained - Minimum Charge", value: config.variants.wellMaintained.minCharge, path: ["variants", "wellMaintained", "minCharge"], unit: "$" });
    }

    // Contract Terms
    // if (config.minContractMonths !== undefined) fields.push({ label: "Minimum Contract Months", value: config.minContractMonths, path: ["minContractMonths"], unit: "months" });
    // if (config.maxContractMonths !== undefined) fields.push({ label: "Maximum Contract Months", value: config.maxContractMonths, path: ["maxContractMonths"], unit: "months" });

    // Billing Conversions
    // if (config.weeksPerMonth !== undefined) fields.push({ label: "Weeks Per Month", value: config.weeksPerMonth, path: ["weeksPerMonth"], unit: "weeks" });

    // Rate Tiers
    // if (config.rateCategories?.redRate?.multiplier !== undefined) fields.push({ label: "Red Rate Multiplier", value: config.rateCategories.redRate.multiplier, path: ["rateCategories", "redRate", "multiplier"], unit: "×" });
    // if (config.rateCategories?.redRate?.commissionRate !== undefined) {
    //   const commValue = typeof config.rateCategories.redRate.commissionRate === 'string'
    //     ? parseFloat(config.rateCategories.redRate.commissionRate.replace('%', ''))
    //     : config.rateCategories.redRate.commissionRate;
    //   fields.push({ label: "Red Rate Commission", value: commValue, path: ["rateCategories", "redRate", "commissionRate"], unit: "%" });
    // }
    // if (config.rateCategories?.greenRate?.multiplier !== undefined) fields.push({ label: "Green Rate Multiplier", value: config.rateCategories.greenRate.multiplier, path: ["rateCategories", "greenRate", "multiplier"], unit: "×" });
    // if (config.rateCategories?.greenRate?.commissionRate !== undefined) {
    //   const commValue = typeof config.rateCategories.greenRate.commissionRate === 'string'
    //     ? parseFloat(config.rateCategories.greenRate.commissionRate.replace('%', ''))
    //     : config.rateCategories.greenRate.commissionRate;
    //   fields.push({ label: "Green Rate Commission", value: commValue, path: ["rateCategories", "greenRate", "commissionRate"], unit: "%" });
    // }

    // Frequency Metadata
    if (config.frequencyMetadata) {
      if (config.frequencyMetadata.weekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Weekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.weekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.weekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Weekly - First Month Extra Multiplier", value: config.frequencyMetadata.weekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Biweekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.biweekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Biweekly - First Month Extra Multiplier", value: config.frequencyMetadata.biweekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"], unit: "×" });
      // if (config.frequencyMetadata.monthly?.cycleMonths !== undefined) fields.push({ label: "Monthly - Cycle Months", value: config.frequencyMetadata.monthly.cycleMonths, path: ["frequencyMetadata", "monthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.bimonthly?.cycleMonths !== undefined) fields.push({ label: "Bimonthly - Cycle Months", value: config.frequencyMetadata.bimonthly.cycleMonths, path: ["frequencyMetadata", "bimonthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.quarterly?.cycleMonths !== undefined) fields.push({ label: "Quarterly - Cycle Months", value: config.frequencyMetadata.quarterly.cycleMonths, path: ["frequencyMetadata", "quarterly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.biannual?.cycleMonths !== undefined) fields.push({ label: "Biannual - Cycle Months", value: config.frequencyMetadata.biannual.cycleMonths, path: ["frequencyMetadata", "biannual", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.annual?.cycleMonths !== undefined) fields.push({ label: "Annual - Cycle Months", value: config.frequencyMetadata.annual.cycleMonths, path: ["frequencyMetadata", "annual", "cycleMonths"], unit: "months" });
    }
    } // End Strip & Wax

    // REFRESH POWER SCRUB - Complete extraction (NEW STRUCTURE)
    if (serviceId === "refreshPowerScrub") {
    // Core Rates
    if (config.coreRates?.defaultHourlyRate !== undefined) fields.push({ label: "Default Hourly Rate", value: config.coreRates.defaultHourlyRate, path: ["coreRates", "defaultHourlyRate"], unit: "$ per hour per worker" });
    if (config.coreRates?.perWorkerRate !== undefined) fields.push({ label: "Per Worker Rate", value: config.coreRates.perWorkerRate, path: ["coreRates", "perWorkerRate"], unit: "$ per worker" });
    if (config.coreRates?.perHourRate !== undefined) fields.push({ label: "Per Hour Rate", value: config.coreRates.perHourRate, path: ["coreRates", "perHourRate"], unit: "$ per hour" });
    if (config.coreRates?.tripCharge !== undefined) fields.push({ label: "Trip Charge", value: config.coreRates.tripCharge, path: ["coreRates", "tripCharge"], unit: "$" });
    if (config.coreRates?.minimumVisit !== undefined) fields.push({ label: "Minimum Visit", value: config.coreRates.minimumVisit, path: ["coreRates", "minimumVisit"], unit: "$" });

    // Area-Specific Pricing
    if (config.areaSpecificPricing?.kitchen?.smallMedium !== undefined) fields.push({ label: "Kitchen - Small/Medium", value: config.areaSpecificPricing.kitchen.smallMedium, path: ["areaSpecificPricing", "kitchen", "smallMedium"], unit: "$" });
    if (config.areaSpecificPricing?.kitchen?.large !== undefined) fields.push({ label: "Kitchen - Large", value: config.areaSpecificPricing.kitchen.large, path: ["areaSpecificPricing", "kitchen", "large"], unit: "$" });
    if (config.areaSpecificPricing?.frontOfHouse !== undefined) fields.push({ label: "Front of House Rate", value: config.areaSpecificPricing.frontOfHouse, path: ["areaSpecificPricing", "frontOfHouse"], unit: "$" });
    if (config.areaSpecificPricing?.patio?.standalone !== undefined) fields.push({ label: "Patio - Standalone", value: config.areaSpecificPricing.patio.standalone, path: ["areaSpecificPricing", "patio", "standalone"], unit: "$" });
    if (config.areaSpecificPricing?.patio?.upsell !== undefined) fields.push({ label: "Patio - Upsell", value: config.areaSpecificPricing.patio.upsell, path: ["areaSpecificPricing", "patio", "upsell"], unit: "$" });

    // Square Footage Pricing
    if (config.squareFootagePricing?.fixedFee !== undefined) fields.push({ label: "Square Footage - Fixed Fee", value: config.squareFootagePricing.fixedFee, path: ["squareFootagePricing", "fixedFee"], unit: "$" });
    if (config.squareFootagePricing?.insideRate !== undefined) fields.push({ label: "Square Footage - Inside Rate", value: config.squareFootagePricing.insideRate, path: ["squareFootagePricing", "insideRate"], unit: "$ per sq ft" });
    if (config.squareFootagePricing?.outsideRate !== undefined) fields.push({ label: "Square Footage - Outside Rate", value: config.squareFootagePricing.outsideRate, path: ["squareFootagePricing", "outsideRate"], unit: "$ per sq ft" });

    // Frequency Metadata
    if (config.frequencyMetadata) {
      if (config.frequencyMetadata.weekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Weekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.weekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.weekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Weekly - First Month Extra Multiplier", value: config.frequencyMetadata.weekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Biweekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.biweekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"], unit: "×" });
      if (config.frequencyMetadata.biweekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Biweekly - First Month Extra Multiplier", value: config.frequencyMetadata.biweekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"], unit: "×" });
      // if (config.frequencyMetadata.monthly?.cycleMonths !== undefined) fields.push({ label: "Monthly - Cycle Months", value: config.frequencyMetadata.monthly.cycleMonths, path: ["frequencyMetadata", "monthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.bimonthly?.cycleMonths !== undefined) fields.push({ label: "Bimonthly - Cycle Months", value: config.frequencyMetadata.bimonthly.cycleMonths, path: ["frequencyMetadata", "bimonthly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.quarterly?.cycleMonths !== undefined) fields.push({ label: "Quarterly - Cycle Months", value: config.frequencyMetadata.quarterly.cycleMonths, path: ["frequencyMetadata", "quarterly", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.biannual?.cycleMonths !== undefined) fields.push({ label: "Biannual - Cycle Months", value: config.frequencyMetadata.biannual.cycleMonths, path: ["frequencyMetadata", "biannual", "cycleMonths"], unit: "months" });
      // if (config.frequencyMetadata.annual?.cycleMonths !== undefined) fields.push({ label: "Annual - Cycle Months", value: config.frequencyMetadata.annual.cycleMonths, path: ["frequencyMetadata", "annual", "cycleMonths"], unit: "months" });
    }
    } // End Refresh Power Scrub

    // ELECTROSTATIC SPRAY - Complete extraction (NEW STRUCTURE)
    if (serviceId === "electrostaticSpray") {
    // Standard Spray Pricing
    if (config.standardSprayPricing?.sprayRatePerRoom !== undefined) fields.push({ label: "Spray Rate Per Room", value: config.standardSprayPricing.sprayRatePerRoom, path: ["standardSprayPricing", "sprayRatePerRoom"], unit: "$ per room" });
    if (config.standardSprayPricing?.sqFtUnit !== undefined) fields.push({ label: "Sq-ft Unit", value: config.standardSprayPricing.sqFtUnit, path: ["standardSprayPricing", "sqFtUnit"], unit: "sq ft" });
    if (config.standardSprayPricing?.sprayRatePerSqFtUnit !== undefined) fields.push({ label: "Spray Rate Per Sq-ft Unit", value: config.standardSprayPricing.sprayRatePerSqFtUnit, path: ["standardSprayPricing", "sprayRatePerSqFtUnit"], unit: "$ per unit" });
    if (config.standardSprayPricing?.minimumPriceOptional !== undefined) fields.push({ label: "Minimum Price Optional", value: config.standardSprayPricing.minimumPriceOptional, path: ["standardSprayPricing", "minimumPriceOptional"], unit: "$" });
    if (config.minimumChargePerVisit !== undefined) fields.push({ label: "Minimum Charge Per Visit", value: config.minimumChargePerVisit, path: ["minimumChargePerVisit"], unit: "$" });

    // Trip Charges
    // if (config.tripCharges?.standard !== undefined) fields.push({ label: "Trip Charge - Standard", value: config.tripCharges.standard, path: ["tripCharges", "standard"], unit: "$" });
    // if (config.tripCharges?.beltway !== undefined) fields.push({ label: "Trip Charge - Beltway", value: config.tripCharges.beltway, path: ["tripCharges", "beltway"], unit: "$" });

    // Frequency Metadata
    if (config.frequencyMetadata?.weekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Weekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.weekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"], unit: "×" });
    if (config.frequencyMetadata?.weekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Weekly - First Month Extra Multiplier", value: config.frequencyMetadata.weekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"], unit: "×" });
    if (config.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier !== undefined) fields.push({ label: "Biweekly - Monthly Recurring Multiplier", value: config.frequencyMetadata.biweekly.monthlyRecurringMultiplier, path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"], unit: "×" });
    if (config.frequencyMetadata?.biweekly?.firstMonthExtraMultiplier !== undefined) fields.push({ label: "Biweekly - First Month Extra Multiplier", value: config.frequencyMetadata.biweekly.firstMonthExtraMultiplier, path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"], unit: "×" });
    // if (config.frequencyMetadata?.monthly?.cycleMonths !== undefined) fields.push({ label: "Monthly - Cycle Months", value: config.frequencyMetadata.monthly.cycleMonths, path: ["frequencyMetadata", "monthly", "cycleMonths"], unit: "months" });
    // if (config.frequencyMetadata?.bimonthly?.cycleMonths !== undefined) fields.push({ label: "Bimonthly - Cycle Months", value: config.frequencyMetadata.bimonthly.cycleMonths, path: ["frequencyMetadata", "bimonthly", "cycleMonths"], unit: "months" });
    // if (config.frequencyMetadata?.quarterly?.cycleMonths !== undefined) fields.push({ label: "Quarterly - Cycle Months", value: config.frequencyMetadata.quarterly.cycleMonths, path: ["frequencyMetadata", "quarterly", "cycleMonths"], unit: "months" });
    // if (config.frequencyMetadata?.biannual?.cycleMonths !== undefined) fields.push({ label: "Biannual - Cycle Months", value: config.frequencyMetadata.biannual.cycleMonths, path: ["frequencyMetadata", "biannual", "cycleMonths"], unit: "months" });
    // if (config.frequencyMetadata?.annual?.cycleMonths !== undefined) fields.push({ label: "Annual - Cycle Months", value: config.frequencyMetadata.annual.cycleMonths, path: ["frequencyMetadata", "annual", "cycleMonths"], unit: "months" });

    // Contract Terms
    // if (config.minContractMonths !== undefined) fields.push({ label: "Minimum Contract Months", value: config.minContractMonths, path: ["minContractMonths"], unit: "months" });
    // if (config.maxContractMonths !== undefined) fields.push({ label: "Maximum Contract Months", value: config.maxContractMonths, path: ["maxContractMonths"], unit: "months" });
    } // End Electrostatic Spray

    return fields;
  };

  // Product handlers
  const handleEditProduct = (familyKey: string, productKey: string, field: "basePrice" | "warrantyPrice", currentValue: number) => {
    setEditingProduct({ familyKey, productKey, field, value: currentValue.toString() });
  };

  const handleSaveProduct = async () => {
    if (!editingProduct || !catalog) return;

    setSaving(true);
    const updatedCatalog = JSON.parse(JSON.stringify(catalog));
    const family = updatedCatalog.families.find((f: any) => f.key === editingProduct.familyKey);

    if (family) {
      const product = family.products.find((p: any) => p.key === editingProduct.productKey);

      if (product) {
        if (editingProduct.field === "basePrice" && product.basePrice) {
          product.basePrice.amount = parseFloat(editingProduct.value) || 0;
        } else if (editingProduct.field === "warrantyPrice" && product.warrantyPricePerUnit) {
          product.warrantyPricePerUnit.amount = parseFloat(editingProduct.value) || 0;
        }
      }
    }

    const result = await updateCatalog(catalog._id, {
      families: updatedCatalog.families,
      version: catalog.version
    });

    if (result.success) {
      setSuccessMessage("✓ Product price updated successfully!");
      setEditingProduct(null);
      // Force a page reload to refresh the catalog from the hook

    }
    setSaving(false);
  };

  // Service handlers
  const handleEditServiceField = (serviceId: string, path: string[], currentValue: number) => {
    setEditingServiceField({ serviceId, path, value: currentValue.toString() });
  };

  const handleSaveServiceField = async () => {
    if (!editingServiceField) return;

    const service = configs.find(c => c.serviceId === editingServiceField.serviceId);
    if (!service) return;

    setSaving(true);
    const newConfig = JSON.parse(JSON.stringify(service.config));
    let current: any = newConfig;

    for (let i = 0; i < editingServiceField.path.length - 1; i++) {
      current = current[editingServiceField.path[i]];
    }

    current[editingServiceField.path[editingServiceField.path.length - 1]] = parseFloat(editingServiceField.value) || 0;

    const result = await updateConfig(service._id, { config: newConfig });

    if (result.success) {
      setSuccessMessage("✓ Service price updated successfully!");
      setEditingServiceField(null);
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditingServiceField(null);
  };

  // Handler for detailed view field updates
  const handleDetailedViewUpdate = async (path: string[], value: number) => {
    if (!detailedViewService) return;

    const newConfig = JSON.parse(JSON.stringify(detailedViewService.config));
    let current: any = newConfig;

    // ✅ FIXED: Create nested objects if they don't exist
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;

    const result = await updateConfig(detailedViewService._id, { config: newConfig });

    if (result.success) {
      // Update the detailedViewService with the new config to refresh UI
      setDetailedViewService({
        ...detailedViewService,
        config: newConfig
      });
    }
  };

  // If detailed view is open, show it full-screen
  if (detailedViewService) {
    return (
      <ServicePricingDetailedView
        service={detailedViewService}
        onUpdateField={handleDetailedViewUpdate}
        onClose={() => setDetailedViewService(null)}
      />
    );
  }

  // Show loading only if currently loading
  if (catalogLoading || servicesLoading) {
    return (
      <div style={styles.loadingContainer} className="pricing-loading-container">
        <div style={styles.spinner} className="pricing-spinner"></div>
        <p style={styles.loadingText} className="pricing-loading-text">Loading pricing data...</p>
      </div>
    );
  }

  // Show errors if present
  if (servicesError || catalogError) {
    return (
      <div style={styles.container} className="pricing-container">
        <div style={styles.errorBox} className="pricing-error-box">
          <h3>⚠️ Error Loading Data</h3>
          {servicesError && <p>Services Error: {servicesError}</p>}
          {catalogError && <p>Catalog Error: {catalogError}</p>}
        </div>
      </div>
    );
  }

  // Show error only if finished loading but still no data
  if (!catalogLoading && !servicesLoading && (!catalog || !configs || configs.length === 0)) {
    return (
      <div style={styles.container} className="pricing-container">
        <div style={styles.errorBox} className="pricing-error-box">
          <h3>⚠️ No Data Available</h3>
          <p>No services or products found. Please check backend connection.</p>
          <p>Configs length: {configs?.length || 0}</p>
          <p>Catalog families: {catalog?.families?.length || 0}</p>
        </div>
      </div>
    );
  }

  const selectedFamily = catalog?.families.find(f => f.key === selectedProductFamily);
  const selectedServiceData = configs.find(s => s.serviceId === selectedService);

  return (
    <div style={styles.container} className="pricing-container">
      {successMessage && <div style={styles.successBanner} className="pricing-success-banner">{successMessage}</div>}

      {/* PRODUCTS SECTION */}
      <div style={styles.section} className="pricing-section">
        <h2 style={styles.sectionTitle} className="pricing-section-title">📦 PRODUCT CATALOG</h2>

        <div style={styles.tabBar} className="pricing-tab-bar">
          {catalog?.families.map((family) => (
            <button
              key={family.key}
              style={{
                ...styles.tab,
                ...(selectedProductFamily === family.key ? styles.tabActive : {}),
              }}
              className={selectedProductFamily === family.key ? "pricing-tab pricing-tab-active" : "pricing-tab"}
              onClick={() => setSelectedProductFamily(family.key)}
            >
              {family.label}
            </button>
          ))}
        </div>

        {selectedFamily && (
          <div style={styles.tableContainer} className="pricing-table-container">
            <h3 style={styles.tableTitle} className="pricing-table-title">{selectedFamily.label} ({selectedFamily.products.length} products)</h3>

            <div style={styles.tableWrapper} className="pricing-table-wrapper">
              <table style={styles.table} className="pricing-table">
                <thead>
                  <tr>
                    <th style={styles.th} className="pricing-th">Product Name</th>
                    <th style={styles.th} className="pricing-th">Product Key</th>
                    <th style={styles.th} className="pricing-th">Base Price</th>
                    <th style={styles.th} className="pricing-th">UOM</th>
                    <th style={styles.th} className="pricing-th">Warranty Price</th>
                    <th style={styles.th} className="pricing-th">Billing Period</th>
                    <th style={styles.th} className="pricing-th">Description</th>
                    <th style={styles.th} className="pricing-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFamily.products.map((product) => {
                    const isEditingBase = editingProduct?.familyKey === selectedFamily.key &&
                                         editingProduct?.productKey === product.key &&
                                         editingProduct?.field === "basePrice";
                    const isEditingWarranty = editingProduct?.familyKey === selectedFamily.key &&
                                             editingProduct?.productKey === product.key &&
                                             editingProduct?.field === "warrantyPrice";

                    return (
                      <tr key={product.key} style={styles.tr} className="pricing-tr">
                        <td style={styles.td} className="pricing-td">{product.name}</td>
                        <td style={styles.td} className="pricing-td"><code style={styles.code} className="pricing-code">{product.key}</code></td>
                        <td style={styles.td} className="pricing-td">
                          {isEditingBase ? (
                            <input
                              type="number"
                              style={styles.input}
                              className="pricing-input"
                              value={editingProduct.value}
                              onChange={(e) => setEditingProduct({ ...editingProduct, value: e.target.value })}
                              autoFocus
                            />
                          ) : (
                            <span style={styles.price} className="pricing-price">${product.basePrice?.amount || "—"}</span>
                          )}
                        </td>
                        <td style={styles.td} className="pricing-td">{product.basePrice?.uom || "—"}</td>
                        <td style={styles.td} className="pricing-td">
                          {isEditingWarranty ? (
                            <input
                              type="number"
                              style={styles.input}
                              className="pricing-input"
                              value={editingProduct.value}
                              onChange={(e) => setEditingProduct({ ...editingProduct, value: e.target.value })}
                              autoFocus
                            />
                          ) : (
                            <span style={styles.price} className="pricing-price">${product.warrantyPricePerUnit?.amount || "—"}</span>
                          )}
                        </td>
                        <td style={styles.td} className="pricing-td">{product.warrantyPricePerUnit?.billingPeriod || "—"}</td>
                        <td style={styles.td} className="pricing-td">
                          <span title={product.description || "No description"}>
                            {truncateText(product.description, 50)}
                          </span>
                        </td>
                        <td style={styles.td} className="pricing-td">
                          {isEditingBase || isEditingWarranty ? (
                            <div style={styles.actionButtons} className="pricing-action-buttons">
                              <button style={styles.saveBtn} className="pricing-save-btn" onClick={handleSaveProduct} disabled={saving}>
                                {saving ? "..." : "Save"}
                              </button>
                              <button style={styles.cancelBtn} className="pricing-cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                            </div>
                          ) : (
                            <div style={styles.actionButtons} className="pricing-action-buttons">
                              {product.basePrice && (
                                <button
                                  style={styles.editBtn}
                                  className="pricing-edit-btn"
                                  onClick={() => handleEditProduct(selectedFamily.key, product.key, "basePrice", product.basePrice!.amount)}
                                >
                                  Edit Base
                                </button>
                              )}
                              {product.warrantyPricePerUnit && (
                                <button
                                  style={styles.editBtn}
                                  className="pricing-edit-btn"
                                  onClick={() => handleEditProduct(selectedFamily.key, product.key, "warrantyPrice", product.warrantyPricePerUnit!.amount)}
                                >
                                  Edit Warranty
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SERVICES SECTION */}
      <div style={styles.section} className="pricing-section">
        <h2 style={styles.sectionTitle} className="pricing-section-title">🛠️ SERVICES PRICING</h2>

        <div style={styles.tabBar} className="pricing-tab-bar">
          {configs.map((service) => (
            <button
              key={service.serviceId}
              style={{
                ...styles.tab,
                ...(selectedService === service.serviceId ? styles.tabActive : {}),
              }}
              className={selectedService === service.serviceId ? "pricing-tab pricing-tab-active" : "pricing-tab"}
              onClick={() => setSelectedService(service.serviceId)}
            >
              {service.label}
            </button>
          ))}
        </div>

        {selectedServiceData && (
          <div style={styles.tableContainer} className="pricing-table-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }} className="pricing-table-header">
              <div>
                <h3 style={styles.tableTitle} className="pricing-table-title">
                  {selectedServiceData.label}
                  <span style={selectedServiceData.isActive ? styles.badgeActive : styles.badgeInactive} className={selectedServiceData.isActive ? "pricing-badge-active" : "pricing-badge-inactive"}>
                    {selectedServiceData.isActive ? "● Active" : "● Inactive"}
                  </span>
                </h3>
                <p style={styles.tableSubtitle} className="pricing-table-subtitle">{selectedServiceData.description}</p>
              </div>
              <button
                style={styles.viewAllFieldsBtn}
                className="pricing-view-all-fields-btn"
                onClick={() => setDetailedViewService(selectedServiceData)}
              >
                🪟 View All Fields (Organized)
              </button>
            </div>

            {(() => {
              const pricingFields = extractServicePricing(selectedServiceData.config, selectedServiceData.serviceId);

              if (pricingFields.length === 0) {
                return (
                  <div style={styles.errorBox} className="pricing-error-box">
                    <p>No pricing fields found for this service.</p>
                    <p>Service ID: {selectedServiceData.serviceId}</p>
                    <details>
                      <summary>View Config</summary>
                      <pre style={{ fontSize: "11px", overflow: "auto" }}>
                        {JSON.stringify(selectedServiceData.config, null, 2)}
                      </pre>
                    </details>
                  </div>
                );
              }

              return (
                <div style={styles.tableWrapper} className="pricing-table-wrapper">
                  <table style={styles.table} className="pricing-table">
                    <thead>
                      <tr>
                        <th style={styles.th} className="pricing-th">Pricing Field</th>
                        <th style={styles.th} className="pricing-th">Current Value</th>
                        <th style={styles.th} className="pricing-th">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricingFields.map((field, idx) => {
                        const isEditing = editingServiceField?.serviceId === selectedServiceData.serviceId &&
                                         editingServiceField?.path.join(".") === field.path.join(".");

                        return (
                          <tr key={idx} style={styles.tr} className="pricing-tr">
                            <td style={styles.td} className="pricing-td"><strong>{field.label}</strong></td>
                            <td style={styles.td} className="pricing-td">
                              {isEditing ? (
                                <input
                                  type="number"
                                  style={styles.input}
                                  className="pricing-input"
                                  value={editingServiceField.value}
                                  onChange={(e) => setEditingServiceField({ ...editingServiceField, value: e.target.value })}
                                  autoFocus
                                  step="0.01"
                                />
                              ) : (
                                <span style={styles.priceValue} className="pricing-price-value">{formatFieldValue(field)}</span>
                              )}
                            </td>
                            <td style={styles.td} className="pricing-td">
                              {isEditing ? (
                                <div style={styles.actionButtons} className="pricing-action-buttons">
                                  <button style={styles.saveBtn} className="pricing-save-btn" onClick={handleSaveServiceField} disabled={saving}>
                                    {saving ? "..." : "Save"}
                                  </button>
                                  <button style={styles.cancelBtn} className="pricing-cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                                </div>
                              ) : (
                                <button
                                  style={styles.editBtn}
                                  className="pricing-edit-btn"
                                  onClick={() => handleEditServiceField(selectedServiceData.serviceId, field.path, field.value)}
                                >
                                  Edit Price
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {!selectedServiceData && (
          <div style={styles.errorBox} className="pricing-error-box">
            <p>⚠️ Service not found</p>
            <p>Selected: {selectedService}</p>
            <p>Available services: {configs.map(c => c.serviceId).join(", ")}</p>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      {successMessage && (
        <Toast
          message={successMessage}
          type="success"
          onClose={() => setSuccessMessage(null)}
        />
      )}
      {errorMessage && (
        <Toast
          message={errorMessage}
          type="error"
          onClose={() => setErrorMessage(null)}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f7fa",
    padding: "24px",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  successBanner: {
    padding: "16px",
    backgroundColor: "#10b981",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    textAlign: "center",
    borderRadius: "8px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
  },
  section: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    width: "100%",
  },
  sectionTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "20px",
    borderBottom: "3px solid #3b82f6",
    paddingBottom: "12px",
  },
  tabBar: {
    display: "flex",
    gap: "8px",
    marginBottom: "24px",
    flexWrap: "wrap",
    borderBottom: "2px solid #e5e7eb",
    paddingBottom: "8px",
    width: "100%",
  },
  tab: {
    padding: "12px 20px",
    border: "none",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    fontSize: "14px",
    fontWeight: "600",
    borderRadius: "8px 8px 0 0",
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  tabActive: {
    backgroundColor: "#3b82f6",
    color: "white",
    boxShadow: "0 -2px 8px rgba(59, 130, 246, 0.3)",
  },
  tableContainer: {
    width: "100%",
  },
  tableTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111827",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  tableSubtitle: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "16px",
  },
  tableWrapper: {
    overflowX: "auto",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    width: "100%",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "100%",
  },
  th: {
    backgroundColor: "#f9fafb",
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "700",
    color: "#374151",
    borderBottom: "2px solid #e5e7eb",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid #f3f4f6",
    transition: "background-color 0.2s",
  },
  td: {
    padding: "14px 16px",
    fontSize: "14px",
    color: "#1f2937",
  },
  code: {
    backgroundColor: "#f3f4f6",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "monospace",
    color: "#3b82f6",
  },
  price: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#059669",
  },
  priceValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#059669",
  },
  input: {
    width: "120px",
    padding: "8px 12px",
    border: "2px solid #3b82f6",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    outline: "none",
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  editBtn: {
    padding: "8px 16px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  saveBtn: {
    padding: "8px 16px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "8px 16px",
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  viewAllFieldsBtn: {
    padding: "12px 24px",
    backgroundColor: "#8b5cf6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
  },
  badgeActive: {
    padding: "6px 12px",
    backgroundColor: "#d1fae5",
    color: "#065f46",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
  },
  badgeInactive: {
    padding: "6px 12px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    width: "100%",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e5e7eb",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    marginTop: "16px",
    fontSize: "16px",
    color: "#6b7280",
    fontWeight: "500",
  },
  errorBox: {
    padding: "24px",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    borderRadius: "12px",
    border: "2px solid #fecaca",
    fontSize: "15px",
    fontWeight: "500",
    width: "100%",
    maxWidth: "800px",
    margin: "40px auto",
  },
};

// Add spinner animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @media (max-width: 768px) {
    table { font-size: 12px; }
    th, td { padding: 10px 8px !important; }
  }
`;
document.head.appendChild(styleSheet);

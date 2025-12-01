// src/components/admin/PricingTablesView.tsx

import React, { useState, useEffect } from "react";
import { useServiceConfigs, useActiveProductCatalog } from "../../backendservice/hooks";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import type { Product } from "../../backendservice/types/productCatalog.types";
import { Toast } from "./Toast";
import { ServicePricingDetailedView } from "./ServicePricingDetailedView";

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

  // Extract pricing fields from service config
  const extractServicePricing = (config: any) => {
    const fields: Array<{ label: string; value: number; path: string[] }> = [];

    // SANICLEAN - geographicPricing structure
    if (config.geographicPricing?.insideBeltway) {
      const ib = config.geographicPricing.insideBeltway;
      if (ib.ratePerFixture !== undefined) fields.push({ label: "Inside Beltway - Rate per Fixture", value: ib.ratePerFixture, path: ["geographicPricing", "insideBeltway", "ratePerFixture"] });
      if (ib.weeklyMinimum !== undefined) fields.push({ label: "Inside Beltway - Weekly Minimum", value: ib.weeklyMinimum, path: ["geographicPricing", "insideBeltway", "weeklyMinimum"] });
      if (ib.tripCharge !== undefined) fields.push({ label: "Inside Beltway - Trip Charge", value: ib.tripCharge, path: ["geographicPricing", "insideBeltway", "tripCharge"] });
      if (ib.parkingFee !== undefined) fields.push({ label: "Inside Beltway - Parking Fee", value: ib.parkingFee, path: ["geographicPricing", "insideBeltway", "parkingFee"] });
    }
    if (config.geographicPricing?.outsideBeltway) {
      const ob = config.geographicPricing.outsideBeltway;
      if (ob.ratePerFixture !== undefined) fields.push({ label: "Outside Beltway - Rate per Fixture", value: ob.ratePerFixture, path: ["geographicPricing", "outsideBeltway", "ratePerFixture"] });
      if (ob.weeklyMinimum !== undefined) fields.push({ label: "Outside Beltway - Weekly Minimum", value: ob.weeklyMinimum, path: ["geographicPricing", "outsideBeltway", "weeklyMinimum"] });
      if (ob.tripCharge !== undefined) fields.push({ label: "Outside Beltway - Trip Charge", value: ob.tripCharge, path: ["geographicPricing", "outsideBeltway", "tripCharge"] });
    }
    if (config.allInclusivePackage?.weeklyRatePerFixture !== undefined) {
      fields.push({ label: "All-Inclusive - Weekly Rate per Fixture", value: config.allInclusivePackage.weeklyRatePerFixture, path: ["allInclusivePackage", "weeklyRatePerFixture"] });
    }
    if (config.smallFacilityMinimum?.fixtureThreshold !== undefined) {
      fields.push({ label: "Small Facility - Fixture Threshold", value: config.smallFacilityMinimum.fixtureThreshold, path: ["smallFacilityMinimum", "fixtureThreshold"] });
    }
    if (config.smallFacilityMinimum?.minimumWeeklyCharge !== undefined) {
      fields.push({ label: "Small Facility - Minimum Weekly Charge", value: config.smallFacilityMinimum.minimumWeeklyCharge, path: ["smallFacilityMinimum", "minimumWeeklyCharge"] });
    }
    if (config.warrantyFeePerDispenser !== undefined) fields.push({ label: "Warranty Fee per Dispenser", value: config.warrantyFeePerDispenser, path: ["warrantyFeePerDispenser"] });
    if (config.soapUpgrades?.standardToLuxury !== undefined) fields.push({ label: "Soap Upgrade - Standard to Luxury", value: config.soapUpgrades.standardToLuxury, path: ["soapUpgrades", "standardToLuxury"] });
    if (config.soapUpgrades?.excessUsageCharges?.standardSoap !== undefined) {
      fields.push({ label: "Excess Standard Soap Charge", value: config.soapUpgrades.excessUsageCharges.standardSoap, path: ["soapUpgrades", "excessUsageCharges", "standardSoap"] });
    }
    if (config.soapUpgrades?.excessUsageCharges?.luxurySoap !== undefined) {
      fields.push({ label: "Excess Luxury Soap Charge", value: config.soapUpgrades.excessUsageCharges.luxurySoap, path: ["soapUpgrades", "excessUsageCharges", "luxurySoap"] });
    }
    if (config.paperCredit?.creditPerFixturePerWeek !== undefined) {
      fields.push({ label: "Paper Credit per Fixture per Week", value: config.paperCredit.creditPerFixturePerWeek, path: ["paperCredit", "creditPerFixturePerWeek"] });
    }
    if (config.billingConversions?.weekly?.monthlyMultiplier !== undefined) {
      fields.push({ label: "Weekly to Monthly Multiplier", value: config.billingConversions.weekly.monthlyMultiplier, path: ["billingConversions", "weekly", "monthlyMultiplier"] });
    }
    if (config.billingConversions?.weekly?.annualMultiplier !== undefined) {
      fields.push({ label: "Weekly to Annual Multiplier", value: config.billingConversions.weekly.annualMultiplier, path: ["billingConversions", "weekly", "annualMultiplier"] });
    }
    if (config.rateTiers?.redRate?.multiplier !== undefined) {
      fields.push({ label: "Red Rate Multiplier", value: config.rateTiers.redRate.multiplier, path: ["rateTiers", "redRate", "multiplier"] });
    }
    if (config.rateTiers?.greenRate?.multiplier !== undefined) {
      fields.push({ label: "Green Rate Multiplier", value: config.rateTiers.greenRate.multiplier, path: ["rateTiers", "greenRate", "multiplier"] });
    }

    // SANIPOD - Complete extraction
    if (config.weeklyRatePerUnit !== undefined) fields.push({ label: "Weekly Rate per Unit (Option A)", value: config.weeklyRatePerUnit, path: ["weeklyRatePerUnit"] });
    if (config.altWeeklyRatePerUnit !== undefined) fields.push({ label: "Alternate Weekly Rate per Unit (Option B)", value: config.altWeeklyRatePerUnit, path: ["altWeeklyRatePerUnit"] });
    if (config.tripChargePerVisit !== undefined) fields.push({ label: "Trip Charge Per Visit", value: config.tripChargePerVisit, path: ["tripChargePerVisit"] });
    if (config.extraBagPrice !== undefined) fields.push({ label: "Extra Bag Price", value: config.extraBagPrice, path: ["extraBagPrice"] });
    if (config.installChargePerUnit !== undefined) fields.push({ label: "Install Charge Per Unit", value: config.installChargePerUnit, path: ["installChargePerUnit"] });
    if (config.standaloneExtraWeeklyCharge !== undefined) fields.push({ label: "Standalone Extra Weekly Charge", value: config.standaloneExtraWeeklyCharge, path: ["standaloneExtraWeeklyCharge"] });

    // SaniPod Frequency Settings
    if (config.annualFrequencies) {
      if (config.annualFrequencies.weekly !== undefined) fields.push({ label: "Annual Frequency - Weekly Visits", value: config.annualFrequencies.weekly, path: ["annualFrequencies", "weekly"] });
      if (config.annualFrequencies.biweekly !== undefined) fields.push({ label: "Annual Frequency - Biweekly Visits", value: config.annualFrequencies.biweekly, path: ["annualFrequencies", "biweekly"] });
      if (config.annualFrequencies.monthly !== undefined) fields.push({ label: "Annual Frequency - Monthly Visits", value: config.annualFrequencies.monthly, path: ["annualFrequencies", "monthly"] });
    }

    // SaniPod Billing Conversions
    if (config.weeksPerMonth !== undefined) fields.push({ label: "Weeks Per Month", value: config.weeksPerMonth, path: ["weeksPerMonth"] });
    if (config.weeksPerYear !== undefined) fields.push({ label: "Weeks Per Year", value: config.weeksPerYear, path: ["weeksPerYear"] });

    // SaniPod Contract Terms
    if (config.minContractMonths !== undefined) fields.push({ label: "Minimum Contract Months", value: config.minContractMonths, path: ["minContractMonths"] });
    if (config.maxContractMonths !== undefined) fields.push({ label: "Maximum Contract Months", value: config.maxContractMonths, path: ["maxContractMonths"] });

    // SaniPod Rate Tiers
    if (config.rateCategories?.redRate?.multiplier !== undefined) fields.push({ label: "Red Rate Multiplier", value: config.rateCategories.redRate.multiplier, path: ["rateCategories", "redRate", "multiplier"] });
    if (config.rateCategories?.greenRate?.multiplier !== undefined) fields.push({ label: "Green Rate Multiplier", value: config.rateCategories.greenRate.multiplier, path: ["rateCategories", "greenRate", "multiplier"] });

    // SANISCRUB - Complete extraction
    if (config.fixtureRates) {
      if (config.fixtureRates.monthly !== undefined) fields.push({ label: "Fixture Rate - Monthly", value: config.fixtureRates.monthly, path: ["fixtureRates", "monthly"] });
      if (config.fixtureRates.twicePerMonth !== undefined) fields.push({ label: "Fixture Rate - Twice per Month", value: config.fixtureRates.twicePerMonth, path: ["fixtureRates", "twicePerMonth"] });
      if (config.fixtureRates.bimonthly !== undefined) fields.push({ label: "Fixture Rate - Bimonthly", value: config.fixtureRates.bimonthly, path: ["fixtureRates", "bimonthly"] });
      if (config.fixtureRates.quarterly !== undefined) fields.push({ label: "Fixture Rate - Quarterly", value: config.fixtureRates.quarterly, path: ["fixtureRates", "quarterly"] });
    }
    if (config.minimums) {
      if (config.minimums.monthly !== undefined) fields.push({ label: "Minimum - Monthly", value: config.minimums.monthly, path: ["minimums", "monthly"] });
      if (config.minimums.twicePerMonth !== undefined) fields.push({ label: "Minimum - Twice per Month", value: config.minimums.twicePerMonth, path: ["minimums", "twicePerMonth"] });
      if (config.minimums.bimonthly !== undefined) fields.push({ label: "Minimum - Bimonthly", value: config.minimums.bimonthly, path: ["minimums", "bimonthly"] });
      if (config.minimums.quarterly !== undefined) fields.push({ label: "Minimum - Quarterly", value: config.minimums.quarterly, path: ["minimums", "quarterly"] });
    }
    if (config.nonBathroomUnitSqFt !== undefined) fields.push({ label: "Non-Bathroom Unit Sq Ft", value: config.nonBathroomUnitSqFt, path: ["nonBathroomUnitSqFt"] });
    if (config.nonBathroomFirstUnitRate !== undefined) fields.push({ label: "Non-Bathroom First Unit Rate", value: config.nonBathroomFirstUnitRate, path: ["nonBathroomFirstUnitRate"] });
    if (config.nonBathroomAdditionalUnitRate !== undefined) fields.push({ label: "Non-Bathroom Additional Unit Rate", value: config.nonBathroomAdditionalUnitRate, path: ["nonBathroomAdditionalUnitRate"] });

    // SaniScrub Install Multipliers
    if (config.installMultipliers?.dirty !== undefined) fields.push({ label: "Install Multiplier - Dirty", value: config.installMultipliers.dirty, path: ["installMultipliers", "dirty"] });
    if (config.installMultipliers?.clean !== undefined) fields.push({ label: "Install Multiplier - Clean", value: config.installMultipliers.clean, path: ["installMultipliers", "clean"] });

    // SaniScrub Frequency Meta
    if (config.frequencyMeta) {
      if (config.frequencyMeta.monthly?.visitsPerYear !== undefined) fields.push({ label: "Frequency - Monthly Visits/Year", value: config.frequencyMeta.monthly.visitsPerYear, path: ["frequencyMeta", "monthly", "visitsPerYear"] });
      if (config.frequencyMeta.twicePerMonth?.visitsPerYear !== undefined) fields.push({ label: "Frequency - Twice Per Month Visits/Year", value: config.frequencyMeta.twicePerMonth.visitsPerYear, path: ["frequencyMeta", "twicePerMonth", "visitsPerYear"] });
      if (config.frequencyMeta.bimonthly?.visitsPerYear !== undefined) fields.push({ label: "Frequency - Bimonthly Visits/Year", value: config.frequencyMeta.bimonthly.visitsPerYear, path: ["frequencyMeta", "bimonthly", "visitsPerYear"] });
      if (config.frequencyMeta.quarterly?.visitsPerYear !== undefined) fields.push({ label: "Frequency - Quarterly Visits/Year", value: config.frequencyMeta.quarterly.visitsPerYear, path: ["frequencyMeta", "quarterly", "visitsPerYear"] });
    }

    // SaniScrub Discounts & Fees
    if (config.twoTimesPerMonthDiscountFlat !== undefined) fields.push({ label: "Twice Per Month Discount (w/ SaniClean)", value: config.twoTimesPerMonthDiscountFlat, path: ["twoTimesPerMonthDiscountFlat"] });
    if (config.tripChargeBase !== undefined) fields.push({ label: "Trip Charge Base", value: config.tripChargeBase, path: ["tripChargeBase"] });
    if (config.parkingFee !== undefined) fields.push({ label: "Parking Fee", value: config.parkingFee, path: ["parkingFee"] });

    // FOAMING DRAIN - Complete extraction
    if (config.standardDrainRate !== undefined) fields.push({ label: "Standard Drain Rate", value: config.standardDrainRate, path: ["standardDrainRate"] });
    if (config.altBaseCharge !== undefined) fields.push({ label: "Alternate Base Charge", value: config.altBaseCharge, path: ["altBaseCharge"] });
    if (config.altExtraPerDrain !== undefined) fields.push({ label: "Alternate Extra per Drain", value: config.altExtraPerDrain, path: ["altExtraPerDrain"] });

    // Volume Pricing
    if (config.volumePricing?.minimumDrains !== undefined) fields.push({ label: "Volume Pricing - Minimum Drains", value: config.volumePricing.minimumDrains, path: ["volumePricing", "minimumDrains"] });
    if (config.volumePricing?.weekly?.ratePerDrain !== undefined) fields.push({ label: "Volume Pricing - Weekly Rate per Drain", value: config.volumePricing.weekly.ratePerDrain, path: ["volumePricing", "weekly", "ratePerDrain"] });
    if (config.volumePricing?.bimonthly?.ratePerDrain !== undefined) fields.push({ label: "Volume Pricing - Bimonthly Rate per Drain", value: config.volumePricing.bimonthly.ratePerDrain, path: ["volumePricing", "bimonthly", "ratePerDrain"] });

    // Grease Trap
    if (config.grease?.weeklyRatePerTrap !== undefined) fields.push({ label: "Grease - Weekly Rate per Trap", value: config.grease.weeklyRatePerTrap, path: ["grease", "weeklyRatePerTrap"] });
    if (config.grease?.installPerTrap !== undefined) fields.push({ label: "Grease - Install per Trap", value: config.grease.installPerTrap, path: ["grease", "installPerTrap"] });

    // Green Drain
    if (config.green?.weeklyRatePerDrain !== undefined) fields.push({ label: "Green - Weekly Rate per Drain", value: config.green.weeklyRatePerDrain, path: ["green", "weeklyRatePerDrain"] });
    if (config.green?.installPerDrain !== undefined) fields.push({ label: "Green - Install per Drain", value: config.green.installPerDrain, path: ["green", "installPerDrain"] });

    // Plumbing Add-on
    if (config.plumbing?.weeklyAddonPerDrain !== undefined) fields.push({ label: "Plumbing - Weekly Addon per Drain", value: config.plumbing.weeklyAddonPerDrain, path: ["plumbing", "weeklyAddonPerDrain"] });

    // Installation Rules
    if (config.installationRules?.filthyMultiplier !== undefined) fields.push({ label: "Installation - Filthy Multiplier", value: config.installationRules.filthyMultiplier, path: ["installationRules", "filthyMultiplier"] });

    // Trip Charges
    if (config.tripCharges?.standard !== undefined) fields.push({ label: "Trip Charge - Standard", value: config.tripCharges.standard, path: ["tripCharges", "standard"] });
    if (config.tripCharges?.beltway !== undefined) fields.push({ label: "Trip Charge - Beltway", value: config.tripCharges.beltway, path: ["tripCharges", "beltway"] });

    // Billing Conversions
    if (config.billingConversions?.weekly?.monthlyVisits !== undefined) fields.push({ label: "Billing - Weekly Monthly Visits", value: config.billingConversions.weekly.monthlyVisits, path: ["billingConversions", "weekly", "monthlyVisits"] });
    if (config.billingConversions?.weekly?.firstMonthExtraMonths !== undefined) fields.push({ label: "Billing - First Month Extra", value: config.billingConversions.weekly.firstMonthExtraMonths, path: ["billingConversions", "weekly", "firstMonthExtraMonths"] });
    if (config.billingConversions?.weekly?.normalMonthFactor !== undefined) fields.push({ label: "Billing - Normal Month Factor", value: config.billingConversions.weekly.normalMonthFactor, path: ["billingConversions", "weekly", "normalMonthFactor"] });
    if (config.billingConversions?.bimonthly?.monthlyMultiplier !== undefined) fields.push({ label: "Billing - Bimonthly Multiplier", value: config.billingConversions.bimonthly.monthlyMultiplier, path: ["billingConversions", "bimonthly", "monthlyMultiplier"] });

    // Contract Terms
    if (config.contract?.minMonths !== undefined) fields.push({ label: "Contract - Minimum Months", value: config.contract.minMonths, path: ["contract", "minMonths"] });
    if (config.contract?.maxMonths !== undefined) fields.push({ label: "Contract - Maximum Months", value: config.contract.maxMonths, path: ["contract", "maxMonths"] });
    if (config.contract?.defaultMonths !== undefined) fields.push({ label: "Contract - Default Months", value: config.contract.defaultMonths, path: ["contract", "defaultMonths"] });

    // MICROFIBER MOPPING
    if (config.includedBathroomRate !== undefined) fields.push({ label: "Included Bathroom Rate", value: config.includedBathroomRate, path: ["includedBathroomRate"] });
    if (config.hugeBathroomPricing?.ratePerSqFt !== undefined) fields.push({ label: "Huge Bathroom - Rate per Sq Ft", value: config.hugeBathroomPricing.ratePerSqFt, path: ["hugeBathroomPricing", "ratePerSqFt"] });
    if (config.extraAreaPricing?.singleLargeAreaRate !== undefined) fields.push({ label: "Extra Area - Single Large Area Rate", value: config.extraAreaPricing.singleLargeAreaRate, path: ["extraAreaPricing", "singleLargeAreaRate"] });
    if (config.extraAreaPricing?.extraAreaRatePerUnit !== undefined) fields.push({ label: "Extra Area - Rate per Unit", value: config.extraAreaPricing.extraAreaRatePerUnit, path: ["extraAreaPricing", "extraAreaRatePerUnit"] });
    if (config.standalonePricing?.standaloneRatePerUnit !== undefined) fields.push({ label: "Standalone - Rate per Unit", value: config.standalonePricing.standaloneRatePerUnit, path: ["standalonePricing", "standaloneRatePerUnit"] });
    if (config.standalonePricing?.standaloneMinimum !== undefined) fields.push({ label: "Standalone - Minimum", value: config.standalonePricing.standaloneMinimum, path: ["standalonePricing", "standaloneMinimum"] });

    // RPM WINDOWS - Complete extraction
    if (config.smallWindowRate !== undefined) fields.push({ label: "Small Window Rate", value: config.smallWindowRate, path: ["smallWindowRate"] });
    if (config.mediumWindowRate !== undefined) fields.push({ label: "Medium Window Rate", value: config.mediumWindowRate, path: ["mediumWindowRate"] });
    if (config.largeWindowRate !== undefined) fields.push({ label: "Large Window Rate", value: config.largeWindowRate, path: ["largeWindowRate"] });
    if (config.tripCharge !== undefined) fields.push({ label: "Trip Charge", value: config.tripCharge, path: ["tripCharge"] });

    // Install Multipliers
    if (config.installMultiplierFirstTime !== undefined) fields.push({ label: "Install Multiplier - First Time", value: config.installMultiplierFirstTime, path: ["installMultiplierFirstTime"] });
    if (config.installMultiplierClean !== undefined) fields.push({ label: "Install Multiplier - Clean", value: config.installMultiplierClean, path: ["installMultiplierClean"] });

    // Frequency Multipliers
    if (config.frequencyMultipliers) {
      if (config.frequencyMultipliers.weekly !== undefined) fields.push({ label: "Frequency Multiplier - Weekly", value: config.frequencyMultipliers.weekly, path: ["frequencyMultipliers", "weekly"] });
      if (config.frequencyMultipliers.biweekly !== undefined) fields.push({ label: "Frequency Multiplier - Biweekly", value: config.frequencyMultipliers.biweekly, path: ["frequencyMultipliers", "biweekly"] });
      if (config.frequencyMultipliers.monthly !== undefined) fields.push({ label: "Frequency Multiplier - Monthly", value: config.frequencyMultipliers.monthly, path: ["frequencyMultipliers", "monthly"] });
      if (config.frequencyMultipliers.quarterly !== undefined) fields.push({ label: "Frequency Multiplier - Quarterly", value: config.frequencyMultipliers.quarterly, path: ["frequencyMultipliers", "quarterly"] });
      if (config.frequencyMultipliers.quarterlyFirstTime !== undefined) fields.push({ label: "Frequency Multiplier - Quarterly First Time", value: config.frequencyMultipliers.quarterlyFirstTime, path: ["frequencyMultipliers", "quarterlyFirstTime"] });
    }

    // Annual Frequencies
    if (config.annualFrequencies) {
      if (config.annualFrequencies.weekly !== undefined) fields.push({ label: "Annual Frequency - Weekly", value: config.annualFrequencies.weekly, path: ["annualFrequencies", "weekly"] });
      if (config.annualFrequencies.biweekly !== undefined) fields.push({ label: "Annual Frequency - Biweekly", value: config.annualFrequencies.biweekly, path: ["annualFrequencies", "biweekly"] });
      if (config.annualFrequencies.monthly !== undefined) fields.push({ label: "Annual Frequency - Monthly", value: config.annualFrequencies.monthly, path: ["annualFrequencies", "monthly"] });
      if (config.annualFrequencies.quarterly !== undefined) fields.push({ label: "Annual Frequency - Quarterly", value: config.annualFrequencies.quarterly, path: ["annualFrequencies", "quarterly"] });
    }

    // Monthly Conversions
    if (config.monthlyConversions) {
      if (config.monthlyConversions.weekly !== undefined) fields.push({ label: "Monthly Conversion - Weekly", value: config.monthlyConversions.weekly, path: ["monthlyConversions", "weekly"] });
      if (config.monthlyConversions.actualWeeksPerMonth !== undefined) fields.push({ label: "Actual Weeks Per Month", value: config.monthlyConversions.actualWeeksPerMonth, path: ["monthlyConversions", "actualWeeksPerMonth"] });
      if (config.monthlyConversions.actualWeeksPerYear !== undefined) fields.push({ label: "Actual Weeks Per Year", value: config.monthlyConversions.actualWeeksPerYear, path: ["monthlyConversions", "actualWeeksPerYear"] });
    }

    // Rate Categories
    if (config.rateCategories?.redRate?.multiplier !== undefined) fields.push({ label: "Red Rate Multiplier", value: config.rateCategories.redRate.multiplier, path: ["rateCategories", "redRate", "multiplier"] });
    if (config.rateCategories?.greenRate?.multiplier !== undefined) fields.push({ label: "Green Rate Multiplier", value: config.rateCategories.greenRate.multiplier, path: ["rateCategories", "greenRate", "multiplier"] });

    // CARPET CLEANING - Complete extraction
    if (config.unitSqFt !== undefined) fields.push({ label: "Unit Square Feet", value: config.unitSqFt, path: ["unitSqFt"] });
    if (config.firstUnitRate !== undefined) fields.push({ label: "First Unit Rate", value: config.firstUnitRate, path: ["firstUnitRate"] });
    if (config.additionalUnitRate !== undefined) fields.push({ label: "Additional Unit Rate", value: config.additionalUnitRate, path: ["additionalUnitRate"] });
    if (config.perVisitMinimum !== undefined) fields.push({ label: "Per Visit Minimum", value: config.perVisitMinimum, path: ["perVisitMinimum"] });

    // Install Multipliers for Carpet Cleaning
    if (config.installMultipliers?.dirty !== undefined) fields.push({ label: "Install Multiplier - Dirty", value: config.installMultipliers.dirty, path: ["installMultipliers", "dirty"] });
    if (config.installMultipliers?.clean !== undefined) fields.push({ label: "Install Multiplier - Clean", value: config.installMultipliers.clean, path: ["installMultipliers", "clean"] });

    // Frequency Meta for Carpet Cleaning
    if (config.frequencyMeta) {
      if (config.frequencyMeta.monthly?.visitsPerYear !== undefined) fields.push({ label: "Frequency - Monthly Visits/Year", value: config.frequencyMeta.monthly.visitsPerYear, path: ["frequencyMeta", "monthly", "visitsPerYear"] });
      if (config.frequencyMeta.twicePerMonth?.visitsPerYear !== undefined) fields.push({ label: "Frequency - 2x Per Month Visits/Year", value: config.frequencyMeta.twicePerMonth.visitsPerYear, path: ["frequencyMeta", "twicePerMonth", "visitsPerYear"] });
      if (config.frequencyMeta.bimonthly?.visitsPerYear !== undefined) fields.push({ label: "Frequency - Bimonthly Visits/Year", value: config.frequencyMeta.bimonthly.visitsPerYear, path: ["frequencyMeta", "bimonthly", "visitsPerYear"] });
      if (config.frequencyMeta.quarterly?.visitsPerYear !== undefined) fields.push({ label: "Frequency - Quarterly Visits/Year", value: config.frequencyMeta.quarterly.visitsPerYear, path: ["frequencyMeta", "quarterly", "visitsPerYear"] });
    }

    // PURE JANITORIAL
    if (config.baseHourlyRate !== undefined) fields.push({ label: "Base Hourly Rate", value: config.baseHourlyRate, path: ["baseHourlyRate"] });
    if (config.shortJobHourlyRate !== undefined) fields.push({ label: "Short Job Hourly Rate", value: config.shortJobHourlyRate, path: ["shortJobHourlyRate"] });
    if (config.minHoursPerVisit !== undefined) fields.push({ label: "Minimum Hours per Visit", value: config.minHoursPerVisit, path: ["minHoursPerVisit"] });
    if (config.weeksPerMonth !== undefined) fields.push({ label: "Weeks Per Month", value: config.weeksPerMonth, path: ["weeksPerMonth"] });
    if (config.dirtyInitialMultiplier !== undefined) fields.push({ label: "Dirty Initial Multiplier", value: config.dirtyInitialMultiplier, path: ["dirtyInitialMultiplier"] });
    if (config.infrequentMultiplier !== undefined) fields.push({ label: "Infrequent Service Multiplier", value: config.infrequentMultiplier, path: ["infrequentMultiplier"] });
    if (config.minContractMonths !== undefined) fields.push({ label: "Minimum Contract Months", value: config.minContractMonths, path: ["minContractMonths"] });
    if (config.maxContractMonths !== undefined) fields.push({ label: "Maximum Contract Months", value: config.maxContractMonths, path: ["maxContractMonths"] });
    if (config.dustingPlacesPerHour !== undefined) fields.push({ label: "Dusting Places Per Hour", value: config.dustingPlacesPerHour, path: ["dustingPlacesPerHour"] });
    if (config.dustingPricePerPlace !== undefined) fields.push({ label: "Dusting Price Per Place", value: config.dustingPricePerPlace, path: ["dustingPricePerPlace"] });
    if (config.vacuumingDefaultHours !== undefined) fields.push({ label: "Vacuuming Default Hours", value: config.vacuumingDefaultHours, path: ["vacuumingDefaultHours"] });
    if (config.rateCategories?.redRate?.multiplier !== undefined) fields.push({ label: "Red Rate Multiplier", value: config.rateCategories.redRate.multiplier, path: ["rateCategories", "redRate", "multiplier"] });
    if (config.rateCategories?.greenRate?.multiplier !== undefined) fields.push({ label: "Green Rate Multiplier", value: config.rateCategories.greenRate.multiplier, path: ["rateCategories", "greenRate", "multiplier"] });

    // STRIP & WAX - variants
    if (config.variants?.standardFull) {
      if (config.variants.standardFull.ratePerSqFt !== undefined) fields.push({ label: "Standard Full - Rate per Sq Ft", value: config.variants.standardFull.ratePerSqFt, path: ["variants", "standardFull", "ratePerSqFt"] });
      if (config.variants.standardFull.minCharge !== undefined) fields.push({ label: "Standard Full - Minimum Charge", value: config.variants.standardFull.minCharge, path: ["variants", "standardFull", "minCharge"] });
    }
    if (config.variants?.noSealant) {
      if (config.variants.noSealant.ratePerSqFt !== undefined) fields.push({ label: "No Sealant - Rate per Sq Ft", value: config.variants.noSealant.ratePerSqFt, path: ["variants", "noSealant", "ratePerSqFt"] });
      if (config.variants.noSealant.minCharge !== undefined) fields.push({ label: "No Sealant - Minimum Charge", value: config.variants.noSealant.minCharge, path: ["variants", "noSealant", "minCharge"] });
    }
    if (config.variants?.wellMaintained) {
      if (config.variants.wellMaintained.ratePerSqFt !== undefined) fields.push({ label: "Well Maintained - Rate per Sq Ft", value: config.variants.wellMaintained.ratePerSqFt, path: ["variants", "wellMaintained", "ratePerSqFt"] });
      if (config.variants.wellMaintained.minCharge !== undefined) fields.push({ label: "Well Maintained - Minimum Charge", value: config.variants.wellMaintained.minCharge, path: ["variants", "wellMaintained", "minCharge"] });
    }

    // REFRESH POWER SCRUB
    if (config.defaultHourly !== undefined) fields.push({ label: "Default Hourly Rate", value: config.defaultHourly, path: ["defaultHourly"] });
    if (config.defaultTrip !== undefined) fields.push({ label: "Default Trip Charge", value: config.defaultTrip, path: ["defaultTrip"] });
    if (config.defaultMinimum !== undefined) fields.push({ label: "Default Minimum", value: config.defaultMinimum, path: ["defaultMinimum"] });
    if (config.kitchenPricing?.smallMedium !== undefined) fields.push({ label: "Kitchen - Small/Medium", value: config.kitchenPricing.smallMedium, path: ["kitchenPricing", "smallMedium"] });
    if (config.kitchenPricing?.large !== undefined) fields.push({ label: "Kitchen - Large", value: config.kitchenPricing.large, path: ["kitchenPricing", "large"] });
    if (config.fohRate !== undefined) fields.push({ label: "FOH Rate", value: config.fohRate, path: ["fohRate"] });
    if (config.patioPricing?.standalone !== undefined) fields.push({ label: "Patio - Standalone", value: config.patioPricing.standalone, path: ["patioPricing", "standalone"] });
    if (config.patioPricing?.upsell !== undefined) fields.push({ label: "Patio - Upsell", value: config.patioPricing.upsell, path: ["patioPricing", "upsell"] });
    if (config.sqftPricing?.fixedFee !== undefined) fields.push({ label: "Sq Ft Pricing - Fixed Fee", value: config.sqftPricing.fixedFee, path: ["sqftPricing", "fixedFee"] });
    if (config.sqftPricing?.insideRate !== undefined) fields.push({ label: "Sq Ft Pricing - Inside Rate", value: config.sqftPricing.insideRate, path: ["sqftPricing", "insideRate"] });
    if (config.sqftPricing?.outsideRate !== undefined) fields.push({ label: "Sq Ft Pricing - Outside Rate", value: config.sqftPricing.outsideRate, path: ["sqftPricing", "outsideRate"] });

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

    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;

    const result = await updateConfig(detailedViewService._id, { config: newConfig });

    if (result.success) {
      setSuccessMessage("✓ Price updated successfully!");
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
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading pricing data...</p>
      </div>
    );
  }

  // Show errors if present
  if (servicesError || catalogError) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
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
      <div style={styles.container}>
        <div style={styles.errorBox}>
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
    <div style={styles.container}>
      {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

      {/* PRODUCTS SECTION */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📦 PRODUCT CATALOG</h2>

        <div style={styles.tabBar}>
          {catalog?.families.map((family) => (
            <button
              key={family.key}
              style={{
                ...styles.tab,
                ...(selectedProductFamily === family.key ? styles.tabActive : {}),
              }}
              onClick={() => setSelectedProductFamily(family.key)}
            >
              {family.label}
            </button>
          ))}
        </div>

        {selectedFamily && (
          <div style={styles.tableContainer}>
            <h3 style={styles.tableTitle}>{selectedFamily.label} ({selectedFamily.products.length} products)</h3>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product Name</th>
                    <th style={styles.th}>Product Key</th>
                    <th style={styles.th}>Base Price</th>
                    <th style={styles.th}>UOM</th>
                    <th style={styles.th}>Warranty Price</th>
                    <th style={styles.th}>Billing Period</th>
                    <th style={styles.th}>Actions</th>
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
                      <tr key={product.key} style={styles.tr}>
                        <td style={styles.td}>{product.name}</td>
                        <td style={styles.td}><code style={styles.code}>{product.key}</code></td>
                        <td style={styles.td}>
                          {isEditingBase ? (
                            <input
                              type="number"
                              style={styles.input}
                              value={editingProduct.value}
                              onChange={(e) => setEditingProduct({ ...editingProduct, value: e.target.value })}
                              autoFocus
                            />
                          ) : (
                            <span style={styles.price}>${product.basePrice?.amount || "—"}</span>
                          )}
                        </td>
                        <td style={styles.td}>{product.basePrice?.uom || "—"}</td>
                        <td style={styles.td}>
                          {isEditingWarranty ? (
                            <input
                              type="number"
                              style={styles.input}
                              value={editingProduct.value}
                              onChange={(e) => setEditingProduct({ ...editingProduct, value: e.target.value })}
                              autoFocus
                            />
                          ) : (
                            <span style={styles.price}>${product.warrantyPricePerUnit?.amount || "—"}</span>
                          )}
                        </td>
                        <td style={styles.td}>{product.warrantyPricePerUnit?.billingPeriod || "—"}</td>
                        <td style={styles.td}>
                          {isEditingBase || isEditingWarranty ? (
                            <div style={styles.actionButtons}>
                              <button style={styles.saveBtn} onClick={handleSaveProduct} disabled={saving}>
                                {saving ? "..." : "Save"}
                              </button>
                              <button style={styles.cancelBtn} onClick={handleCancelEdit}>Cancel</button>
                            </div>
                          ) : (
                            <div style={styles.actionButtons}>
                              {product.basePrice && (
                                <button
                                  style={styles.editBtn}
                                  onClick={() => handleEditProduct(selectedFamily.key, product.key, "basePrice", product.basePrice!.amount)}
                                >
                                  Edit Base
                                </button>
                              )}
                              {product.warrantyPricePerUnit && (
                                <button
                                  style={styles.editBtn}
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
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🛠️ SERVICES PRICING</h2>

        <div style={styles.tabBar}>
          {configs.map((service) => (
            <button
              key={service.serviceId}
              style={{
                ...styles.tab,
                ...(selectedService === service.serviceId ? styles.tabActive : {}),
              }}
              onClick={() => setSelectedService(service.serviceId)}
            >
              {service.label}
            </button>
          ))}
        </div>

        {selectedServiceData && (
          <div style={styles.tableContainer}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={styles.tableTitle}>
                  {selectedServiceData.label}
                  <span style={selectedServiceData.isActive ? styles.badgeActive : styles.badgeInactive}>
                    {selectedServiceData.isActive ? "● Active" : "● Inactive"}
                  </span>
                </h3>
                <p style={styles.tableSubtitle}>{selectedServiceData.description}</p>
              </div>
              <button
                style={styles.viewAllFieldsBtn}
                onClick={() => setDetailedViewService(selectedServiceData)}
              >
                🪟 View All Fields (Organized)
              </button>
            </div>

            {(() => {
              const pricingFields = extractServicePricing(selectedServiceData.config);

              if (pricingFields.length === 0) {
                return (
                  <div style={styles.errorBox}>
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
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Pricing Field</th>
                        <th style={styles.th}>Current Value</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricingFields.map((field, idx) => {
                        const isEditing = editingServiceField?.serviceId === selectedServiceData.serviceId &&
                                         editingServiceField?.path.join(".") === field.path.join(".");

                        return (
                          <tr key={idx} style={styles.tr}>
                            <td style={styles.td}><strong>{field.label}</strong></td>
                            <td style={styles.td}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  style={styles.input}
                                  value={editingServiceField.value}
                                  onChange={(e) => setEditingServiceField({ ...editingServiceField, value: e.target.value })}
                                  autoFocus
                                  step="0.01"
                                />
                              ) : (
                                <span style={styles.priceValue}>${field.value.toFixed(2)}</span>
                              )}
                            </td>
                            <td style={styles.td}>
                              {isEditing ? (
                                <div style={styles.actionButtons}>
                                  <button style={styles.saveBtn} onClick={handleSaveServiceField} disabled={saving}>
                                    {saving ? "..." : "Save"}
                                  </button>
                                  <button style={styles.cancelBtn} onClick={handleCancelEdit}>Cancel</button>
                                </div>
                              ) : (
                                <button
                                  style={styles.editBtn}
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
          <div style={styles.errorBox}>
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

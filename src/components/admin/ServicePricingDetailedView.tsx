// src/components/admin/ServicePricingDetailedView.tsx

import React, { useState } from "react";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import "./ServicePricingDetailedView.css";

interface ServicePricingDetailedViewProps {
  service: ServiceConfig;
  onUpdateField: (path: string[], value: number) => Promise<void>;
  onClose: () => void;
}

type TabKey =
  // RPM Windows
  | "windowRates" | "installMultipliers" | "frequencyMultipliers" | "annualFrequencies" | "conversions" | "rateCategories"
  // Carpet Cleaning
  | "unitPricing" | "minimums" | "carpetInstallMultipliers" | "frequencyMeta"
  // Foaming Drain
  | "standardRates" | "volumePricing" | "greaseTrap" | "greenDrain" | "addonsMultipliers" | "tripCharges" | "billingConversions" | "contractTerms"
  // Microfiber Mopping
  | "basicRates" | "hugeBathrooms" | "extraAreas" | "standalonePricing"
  // Pure Janitorial
  | "baseRates" | "shortJobPricing" | "serviceMultipliers" | "monthlyConversions" | "contractSettings" | "dustingVacuuming" | "rateTiers"
  // SaniClean
  | "insideBeltway" | "outsideBeltway" | "allInclusive" | "smallFacility" | "soapUpgrades" | "warrantyCredits" | "sanicleanBillingConversions" | "sanicleanRateTiers"
  // SaniPod
  | "podRates" | "extraBags" | "installation" | "standaloneService" | "frequencySettings" | "sanipodBillingConversions" | "sanipodContractTerms" | "sanipodRateTiers"
  // SaniScrub
  | "fixtureRates" | "saniscrubMinimums" | "nonBathroomPricing" | "saniscrubInstallMultipliers" | "serviceFrequencies" | "discountsAndFees"
  // Strip & Wax
  | "standardFull" | "noSealant" | "wellMaintained" | "stripWaxContractTerms" | "stripWaxBillingConversions" | "stripWaxRateTiers";

interface PricingField {
  label: string;
  value: number;
  path: string[];
  unit?: string;
  description?: string;
}

export const ServicePricingDetailedView: React.FC<ServicePricingDetailedViewProps> = ({
  service,
  onUpdateField,
  onClose,
}) => {
  // Set initial tab based on service type
  const getInitialTab = (): TabKey => {
    if (service.serviceId === "rpmWindows") return "windowRates";
    if (service.serviceId === "carpetCleaning") return "unitPricing";
    if (service.serviceId === "foamingDrain") return "standardRates";
    if (service.serviceId === "microfiberMopping") return "basicRates";
    if (service.serviceId === "pureJanitorial") return "baseRates";
    if (service.serviceId === "saniclean") return "insideBeltway";
    if (service.serviceId === "sanipod") return "podRates";
    if (service.serviceId === "saniscrub") return "fixtureRates";
    if (service.serviceId === "stripWax") return "standardFull";
    return "windowRates";
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab());
  const [editingField, setEditingField] = useState<{ path: string[]; value: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const config = service.config;

  // Helper to get nested value
  const getValue = (path: string[]): any => {
    let current: any = config;
    for (const key of path) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  };

  // Organize fields by category for RPM Windows
  const getFieldsByCategory = () => {
    const categories: Record<TabKey, PricingField[]> = {
      // RPM Windows
      windowRates: [],
      installMultipliers: [],
      frequencyMultipliers: [],
      annualFrequencies: [],
      conversions: [],
      rateCategories: [],
      // Carpet Cleaning
      unitPricing: [],
      minimums: [],
      carpetInstallMultipliers: [],
      frequencyMeta: [],
      // Foaming Drain
      standardRates: [],
      volumePricing: [],
      greaseTrap: [],
      greenDrain: [],
      addonsMultipliers: [],
      tripCharges: [],
      billingConversions: [],
      contractTerms: [],
      // Microfiber Mopping
      basicRates: [],
      hugeBathrooms: [],
      extraAreas: [],
      standalonePricing: [],
      // Pure Janitorial
      baseRates: [],
      shortJobPricing: [],
      serviceMultipliers: [],
      monthlyConversions: [],
      contractSettings: [],
      dustingVacuuming: [],
      rateTiers: [],
      // SaniClean
      insideBeltway: [],
      outsideBeltway: [],
      allInclusive: [],
      smallFacility: [],
      soapUpgrades: [],
      warrantyCredits: [],
      sanicleanBillingConversions: [],
      sanicleanRateTiers: [],
      // SaniPod
      podRates: [],
      extraBags: [],
      installation: [],
      standaloneService: [],
      frequencySettings: [],
      sanipodBillingConversions: [],
      sanipodContractTerms: [],
      sanipodRateTiers: [],
      // SaniScrub
      fixtureRates: [],
      saniscrubMinimums: [],
      nonBathroomPricing: [],
      saniscrubInstallMultipliers: [],
      serviceFrequencies: [],
      discountsAndFees: [],
      // Strip & Wax
      standardFull: [],
      noSealant: [],
      wellMaintained: [],
      stripWaxContractTerms: [],
      stripWaxBillingConversions: [],
      stripWaxRateTiers: [],
    };

    if (service.serviceId === "rpmWindows") {
      // Window Rates
      categories.windowRates = [
        {
          label: "Small Window Rate",
          value: getValue(["smallWindowRate"]) ?? 0,
          path: ["smallWindowRate"],
          unit: "$ per window",
          description: "Price for cleaning small windows",
        },
        {
          label: "Medium Window Rate",
          value: getValue(["mediumWindowRate"]) ?? 0,
          path: ["mediumWindowRate"],
          unit: "$ per window",
          description: "Price for cleaning medium windows",
        },
        {
          label: "Large Window Rate",
          value: getValue(["largeWindowRate"]) ?? 0,
          path: ["largeWindowRate"],
          unit: "$ per window",
          description: "Price for cleaning large windows",
        },
        {
          label: "Trip Charge",
          value: getValue(["tripCharge"]) ?? 0,
          path: ["tripCharge"],
          unit: "$",
          description: "Additional trip charge per visit",
        },
      ];

      // Install Multipliers
      categories.installMultipliers = [
        {
          label: "First Time Install Multiplier",
          value: getValue(["installMultiplierFirstTime"]) ?? 0,
          path: ["installMultiplierFirstTime"],
          unit: "×",
          description: "Multiply rate by this for first-time/dirty installations (typically 3x)",
        },
        {
          label: "Clean Install Multiplier",
          value: getValue(["installMultiplierClean"]) ?? 0,
          path: ["installMultiplierClean"],
          unit: "×",
          description: "Multiply rate by this for clean installations (typically 1x)",
        },
      ];

      // Frequency Multipliers
      const freqMults = getValue(["frequencyMultipliers"]) || {};
      categories.frequencyMultipliers = [
        {
          label: "Weekly Multiplier",
          value: freqMults.weekly ?? 0,
          path: ["frequencyMultipliers", "weekly"],
          unit: "×",
          description: "Multiplier applied for weekly service",
        },
        {
          label: "Biweekly Multiplier",
          value: freqMults.biweekly ?? 0,
          path: ["frequencyMultipliers", "biweekly"],
          unit: "×",
          description: "Multiplier applied for biweekly service",
        },
        {
          label: "Monthly Multiplier",
          value: freqMults.monthly ?? 0,
          path: ["frequencyMultipliers", "monthly"],
          unit: "×",
          description: "Multiplier applied for monthly service",
        },
        {
          label: "Quarterly Multiplier",
          value: freqMults.quarterly ?? 0,
          path: ["frequencyMultipliers", "quarterly"],
          unit: "×",
          description: "Multiplier applied for quarterly service",
        },
        {
          label: "Quarterly First Time Multiplier",
          value: freqMults.quarterlyFirstTime ?? 0,
          path: ["frequencyMultipliers", "quarterlyFirstTime"],
          unit: "×",
          description: "Special multiplier for quarterly first-time service",
        },
      ];

      // Annual Frequencies
      const annualFreqs = getValue(["annualFrequencies"]) || {};
      categories.annualFrequencies = [
        {
          label: "Weekly Visits Per Year",
          value: annualFreqs.weekly ?? 0,
          path: ["annualFrequencies", "weekly"],
          unit: "visits/year",
          description: "Number of weekly service visits per year (typically 52)",
        },
        {
          label: "Biweekly Visits Per Year",
          value: annualFreqs.biweekly ?? 0,
          path: ["annualFrequencies", "biweekly"],
          unit: "visits/year",
          description: "Number of biweekly service visits per year (typically 26)",
        },
        {
          label: "Monthly Visits Per Year",
          value: annualFreqs.monthly ?? 0,
          path: ["annualFrequencies", "monthly"],
          unit: "visits/year",
          description: "Number of monthly service visits per year (typically 12)",
        },
        {
          label: "Quarterly Visits Per Year",
          value: annualFreqs.quarterly ?? 0,
          path: ["annualFrequencies", "quarterly"],
          unit: "visits/year",
          description: "Number of quarterly service visits per year (typically 4)",
        },
      ];

      // Conversions
      const conversions = getValue(["monthlyConversions"]) || {};
      categories.conversions = [
        {
          label: "Weekly to Monthly Conversion",
          value: conversions.weekly ?? 0,
          path: ["monthlyConversions", "weekly"],
          unit: "weeks/month",
          description: "Weeks per month for billing conversion (typically 4.33)",
        },
        {
          label: "Actual Weeks Per Month",
          value: conversions.actualWeeksPerMonth ?? 0,
          path: ["monthlyConversions", "actualWeeksPerMonth"],
          unit: "weeks",
          description: "Average weeks per month (typically 4.33)",
        },
        {
          label: "Actual Weeks Per Year",
          value: conversions.actualWeeksPerYear ?? 0,
          path: ["monthlyConversions", "actualWeeksPerYear"],
          unit: "weeks",
          description: "Total weeks per year (typically 52)",
        },
      ];

      // Rate Categories
      const rateCategories = getValue(["rateCategories"]) || {};
      categories.rateCategories = [
        {
          label: "Red Rate Multiplier",
          value: rateCategories.redRate?.multiplier ?? 0,
          path: ["rateCategories", "redRate", "multiplier"],
          unit: "×",
          description: "Standard rate multiplier (typically 1.0)",
        },
        {
          label: "Green Rate Multiplier",
          value: rateCategories.greenRate?.multiplier ?? 0,
          path: ["rateCategories", "greenRate", "multiplier"],
          unit: "×",
          description: "Premium rate multiplier (typically 1.3 = 30% higher)",
        },
      ];
    }

    // CARPET CLEANING
    if (service.serviceId === "carpetCleaning") {
      // Unit Pricing
      categories.unitPricing = [
        {
          label: "Unit Square Feet",
          value: getValue(["unitSqFt"]) ?? 0,
          path: ["unitSqFt"],
          unit: "sq ft",
          description: "Square footage per pricing unit (e.g., charge per 500 sq ft)",
        },
        {
          label: "First Unit Rate",
          value: getValue(["firstUnitRate"]) ?? 0,
          path: ["firstUnitRate"],
          unit: "$",
          description: "Price for the first unit of carpet cleaning",
        },
        {
          label: "Additional Unit Rate",
          value: getValue(["additionalUnitRate"]) ?? 0,
          path: ["additionalUnitRate"],
          unit: "$",
          description: "Price for each additional unit beyond the first",
        },
      ];

      // Minimums
      categories.minimums = [
        {
          label: "Per Visit Minimum",
          value: getValue(["perVisitMinimum"]) ?? 0,
          path: ["perVisitMinimum"],
          unit: "$",
          description: "Minimum charge per service visit regardless of area",
        },
      ];

      // Install Multipliers
      const installMults = getValue(["installMultipliers"]) || {};
      categories.carpetInstallMultipliers = [
        {
          label: "Dirty Install Multiplier",
          value: installMults.dirty ?? 0,
          path: ["installMultipliers", "dirty"],
          unit: "×",
          description: "Multiply rate by this for dirty/heavily soiled carpets (typically 3x)",
        },
        {
          label: "Clean Install Multiplier",
          value: installMults.clean ?? 0,
          path: ["installMultipliers", "clean"],
          unit: "×",
          description: "Multiply rate by this for clean/lightly soiled carpets (typically 1x)",
        },
      ];

      // Frequency Meta
      const freqMeta = getValue(["frequencyMeta"]) || {};
      categories.frequencyMeta = [
        {
          label: "Monthly Visits Per Year",
          value: freqMeta.monthly?.visitsPerYear ?? 0,
          path: ["frequencyMeta", "monthly", "visitsPerYear"],
          unit: "visits/year",
          description: "Number of monthly service visits per year (typically 12)",
        },
        {
          label: "Twice Per Month Visits Per Year",
          value: freqMeta.twicePerMonth?.visitsPerYear ?? 0,
          path: ["frequencyMeta", "twicePerMonth", "visitsPerYear"],
          unit: "visits/year",
          description: "Number of twice-per-month service visits per year (typically 24)",
        },
        {
          label: "Bimonthly Visits Per Year",
          value: freqMeta.bimonthly?.visitsPerYear ?? 0,
          path: ["frequencyMeta", "bimonthly", "visitsPerYear"],
          unit: "visits/year",
          description: "Number of bimonthly service visits per year (typically 6)",
        },
        {
          label: "Quarterly Visits Per Year",
          value: freqMeta.quarterly?.visitsPerYear ?? 0,
          path: ["frequencyMeta", "quarterly", "visitsPerYear"],
          unit: "visits/year",
          description: "Number of quarterly service visits per year (typically 4)",
        },
      ];
    }

    // FOAMING DRAIN
    if (service.serviceId === "foamingDrain") {
      // Standard Rates
      categories.standardRates = [
        {
          label: "Standard Drain Rate",
          value: getValue(["standardDrainRate"]) ?? 0,
          path: ["standardDrainRate"],
          unit: "$ per drain",
          description: "Base rate per drain for standard foaming treatment",
        },
        {
          label: "Alternate Base Charge",
          value: getValue(["altBaseCharge"]) ?? 0,
          path: ["altBaseCharge"],
          unit: "$",
          description: "Alternative pricing model - base charge",
        },
        {
          label: "Alternate Extra Per Drain",
          value: getValue(["altExtraPerDrain"]) ?? 0,
          path: ["altExtraPerDrain"],
          unit: "$ per drain",
          description: "Alternative pricing model - additional charge per drain",
        },
      ];

      // Volume Pricing
      const volPricing = getValue(["volumePricing"]) || {};
      categories.volumePricing = [
        {
          label: "Minimum Drains for Volume Pricing",
          value: volPricing.minimumDrains ?? 0,
          path: ["volumePricing", "minimumDrains"],
          unit: "drains",
          description: "Minimum number of drains required to qualify for volume pricing",
        },
        {
          label: "Weekly Volume Rate Per Drain",
          value: volPricing.weekly?.ratePerDrain ?? 0,
          path: ["volumePricing", "weekly", "ratePerDrain"],
          unit: "$ per drain",
          description: "Discounted rate per drain for weekly service with volume pricing",
        },
        {
          label: "Bimonthly Volume Rate Per Drain",
          value: volPricing.bimonthly?.ratePerDrain ?? 0,
          path: ["volumePricing", "bimonthly", "ratePerDrain"],
          unit: "$ per drain",
          description: "Discounted rate per drain for bimonthly service with volume pricing",
        },
      ];

      // Grease Trap
      const grease = getValue(["grease"]) || {};
      categories.greaseTrap = [
        {
          label: "Weekly Rate Per Trap",
          value: grease.weeklyRatePerTrap ?? 0,
          path: ["grease", "weeklyRatePerTrap"],
          unit: "$ per trap",
          description: "Weekly service rate for grease trap treatment",
        },
        {
          label: "Install Charge Per Trap",
          value: grease.installPerTrap ?? 0,
          path: ["grease", "installPerTrap"],
          unit: "$",
          description: "One-time installation charge for grease trap service",
        },
      ];

      // Green Drain
      const green = getValue(["green"]) || {};
      categories.greenDrain = [
        {
          label: "Weekly Rate Per Drain",
          value: green.weeklyRatePerDrain ?? 0,
          path: ["green", "weeklyRatePerDrain"],
          unit: "$ per drain",
          description: "Weekly service rate for eco-friendly green drain treatment",
        },
        {
          label: "Install Charge Per Drain",
          value: green.installPerDrain ?? 0,
          path: ["green", "installPerDrain"],
          unit: "$",
          description: "One-time installation charge for green drain service",
        },
      ];

      // Add-ons & Multipliers
      const plumbing = getValue(["plumbing"]) || {};
      const installRules = getValue(["installationRules"]) || {};
      categories.addonsMultipliers = [
        {
          label: "Plumbing Weekly Addon Per Drain",
          value: plumbing.weeklyAddonPerDrain ?? 0,
          path: ["plumbing", "weeklyAddonPerDrain"],
          unit: "$ per drain",
          description: "Additional weekly charge per drain for plumbing addon service",
        },
        {
          label: "Filthy Installation Multiplier",
          value: installRules.filthyMultiplier ?? 0,
          path: ["installationRules", "filthyMultiplier"],
          unit: "×",
          description: "Multiply rate by this for heavily clogged/filthy drains (typically 2-3x)",
        },
      ];

      // Trip Charges
      const tripChargesData = getValue(["tripCharges"]) || {};
      categories.tripCharges = [
        {
          label: "Standard Trip Charge",
          value: tripChargesData.standard ?? 0,
          path: ["tripCharges", "standard"],
          unit: "$",
          description: "Standard trip charge for service visits",
        },
        {
          label: "Beltway Trip Charge",
          value: tripChargesData.beltway ?? 0,
          path: ["tripCharges", "beltway"],
          unit: "$",
          description: "Trip charge for locations inside the beltway area",
        },
      ];

      // Billing Conversions
      const billingConv = getValue(["billingConversions"]) || {};
      categories.billingConversions = [
        {
          label: "Weekly Monthly Visits",
          value: billingConv.weekly?.monthlyVisits ?? 0,
          path: ["billingConversions", "weekly", "monthlyVisits"],
          unit: "visits/month",
          description: "Number of weekly service visits billed per month (typically 4.33)",
        },
        {
          label: "First Month Extra Months",
          value: billingConv.weekly?.firstMonthExtraMonths ?? 0,
          path: ["billingConversions", "weekly", "firstMonthExtraMonths"],
          unit: "months",
          description: "Additional months charged in first billing cycle",
        },
        {
          label: "Normal Month Factor",
          value: billingConv.weekly?.normalMonthFactor ?? 0,
          path: ["billingConversions", "weekly", "normalMonthFactor"],
          unit: "factor",
          description: "Billing factor for standard months (typically 1.0)",
        },
        {
          label: "Bimonthly Monthly Multiplier",
          value: billingConv.bimonthly?.monthlyMultiplier ?? 0,
          path: ["billingConversions", "bimonthly", "monthlyMultiplier"],
          unit: "×",
          description: "Multiplier to convert bimonthly rate to monthly billing",
        },
      ];

      // Contract Terms
      const contract = getValue(["contract"]) || {};
      categories.contractTerms = [
        {
          label: "Minimum Contract Months",
          value: contract.minMonths ?? 0,
          path: ["contract", "minMonths"],
          unit: "months",
          description: "Minimum contract duration required (e.g., 6 months)",
        },
        {
          label: "Maximum Contract Months",
          value: contract.maxMonths ?? 0,
          path: ["contract", "maxMonths"],
          unit: "months",
          description: "Maximum contract duration allowed (e.g., 36 months)",
        },
        {
          label: "Default Contract Months",
          value: contract.defaultMonths ?? 0,
          path: ["contract", "defaultMonths"],
          unit: "months",
          description: "Default contract duration if not specified (e.g., 12 months)",
        },
      ];
    }

    // MICROFIBER MOPPING
    if (service.serviceId === "microfiberMopping") {
      // Basic Rates
      categories.basicRates = [
        {
          label: "Included Bathroom Rate",
          value: getValue(["includedBathroomRate"]) ?? 0,
          path: ["includedBathroomRate"],
          unit: "$ per bathroom",
          description: "Base rate per bathroom included in the service package",
        },
      ];

      // Huge Bathrooms
      const hugeBathroom = getValue(["hugeBathroomPricing"]) || {};
      categories.hugeBathrooms = [
        {
          label: "Rate Per Square Foot",
          value: hugeBathroom.ratePerSqFt ?? 0,
          path: ["hugeBathroomPricing", "ratePerSqFt"],
          unit: "$ per sq ft",
          description: "Price per square foot for bathrooms exceeding standard size (typically >150 sq ft)",
        },
      ];

      // Extra Areas
      const extraArea = getValue(["extraAreaPricing"]) || {};
      categories.extraAreas = [
        {
          label: "Single Large Area Rate",
          value: extraArea.singleLargeAreaRate ?? 0,
          path: ["extraAreaPricing", "singleLargeAreaRate"],
          unit: "$",
          description: "Flat rate for a single large extra area (e.g., lobby, hallway)",
        },
        {
          label: "Extra Area Rate Per Unit",
          value: extraArea.extraAreaRatePerUnit ?? 0,
          path: ["extraAreaPricing", "extraAreaRatePerUnit"],
          unit: "$ per unit",
          description: "Rate per additional area unit beyond the first large area",
        },
      ];

      // Standalone Pricing
      const standalone = getValue(["standalonePricing"]) || {};
      categories.standalonePricing = [
        {
          label: "Standalone Rate Per Unit",
          value: standalone.standaloneRatePerUnit ?? 0,
          path: ["standalonePricing", "standaloneRatePerUnit"],
          unit: "$ per unit",
          description: "Rate per unit when purchased as a standalone service (not bundled)",
        },
        {
          label: "Standalone Minimum Charge",
          value: standalone.standaloneMinimum ?? 0,
          path: ["standalonePricing", "standaloneMinimum"],
          unit: "$",
          description: "Minimum charge for standalone microfiber mopping service",
        },
      ];
    }

    // PURE JANITORIAL
    if (service.serviceId === "pureJanitorial") {
      // Base Rates
      categories.baseRates = [
        {
          label: "Base Hourly Rate",
          value: getValue(["baseHourlyRate"]) ?? 0,
          path: ["baseHourlyRate"],
          unit: "$ per hour",
          description: "Standard hourly rate for janitorial services",
        },
        {
          label: "Minimum Hours Per Visit",
          value: getValue(["minHoursPerVisit"]) ?? 0,
          path: ["minHoursPerVisit"],
          unit: "hours",
          description: "Minimum billable hours required per service visit (e.g., 2 hours minimum)",
        },
      ];

      // Short Job Pricing
      categories.shortJobPricing = [
        {
          label: "Short Job Hourly Rate",
          value: getValue(["shortJobHourlyRate"]) ?? 0,
          path: ["shortJobHourlyRate"],
          unit: "$ per hour",
          description: "Premium hourly rate for jobs under minimum hours (typically 1.5x base rate)",
        },
      ];

      // Service Multipliers
      categories.serviceMultipliers = [
        {
          label: "Dirty Initial Multiplier",
          value: getValue(["dirtyInitialMultiplier"]) ?? 0,
          path: ["dirtyInitialMultiplier"],
          unit: "×",
          description: "Multiplier for first-time dirty/heavily soiled facilities (typically 3x dusting time)",
        },
        {
          label: "Infrequent Service Multiplier",
          value: getValue(["infrequentMultiplier"]) ?? 0,
          path: ["infrequentMultiplier"],
          unit: "×",
          description: "Multiplier for infrequent service (e.g., quarterly - typically 3x dusting time)",
        },
      ];

      // Monthly Conversions
      categories.monthlyConversions = [
        {
          label: "Weeks Per Month",
          value: getValue(["weeksPerMonth"]) ?? 0,
          path: ["weeksPerMonth"],
          unit: "weeks",
          description: "Average weeks per month for billing calculations (typically 4.33 = 52/12)",
        },
      ];

      // Contract Settings
      categories.contractSettings = [
        {
          label: "Minimum Contract Months",
          value: getValue(["minContractMonths"]) ?? 0,
          path: ["minContractMonths"],
          unit: "months",
          description: "Minimum contract duration required (e.g., 2 months)",
        },
        {
          label: "Maximum Contract Months",
          value: getValue(["maxContractMonths"]) ?? 0,
          path: ["maxContractMonths"],
          unit: "months",
          description: "Maximum contract duration allowed (e.g., 36 months)",
        },
      ];

      // Dusting & Vacuuming
      categories.dustingVacuuming = [
        {
          label: "Dusting Places Per Hour",
          value: getValue(["dustingPlacesPerHour"]) ?? 0,
          path: ["dustingPlacesPerHour"],
          unit: "places/hour",
          description: "Number of dusting locations that can be cleaned per hour",
        },
        {
          label: "Dusting Price Per Place",
          value: getValue(["dustingPricePerPlace"]) ?? 0,
          path: ["dustingPricePerPlace"],
          unit: "$",
          description: "Price per individual dusting location (alternative pricing method)",
        },
        {
          label: "Vacuuming Default Hours",
          value: getValue(["vacuumingDefaultHours"]) ?? 0,
          path: ["vacuumingDefaultHours"],
          unit: "hours",
          description: "Default hours estimated for vacuuming tasks",
        },
      ];

      // Rate Tiers
      const rateCategories = getValue(["rateCategories"]) || {};
      categories.rateTiers = [
        {
          label: "Red Rate Multiplier",
          value: rateCategories.redRate?.multiplier ?? 0,
          path: ["rateCategories", "redRate", "multiplier"],
          unit: "×",
          description: "Standard rate multiplier for Red Rate tier (typically 1.0)",
        },
        {
          label: "Green Rate Multiplier",
          value: rateCategories.greenRate?.multiplier ?? 0,
          path: ["rateCategories", "greenRate", "multiplier"],
          unit: "×",
          description: "Premium rate multiplier for Green Rate tier (typically 1.3 = 30% higher)",
        },
      ];
    }

    // SANICLEAN
    if (service.serviceId === "saniclean") {
      // Inside Beltway
      const insideBeltway = getValue(["geographicPricing", "insideBeltway"]) || {};
      categories.insideBeltway = [
        {
          label: "Rate Per Fixture",
          value: insideBeltway.ratePerFixture ?? 0,
          path: ["geographicPricing", "insideBeltway", "ratePerFixture"],
          unit: "$ per fixture",
          description: "Weekly rate per fixture for locations inside the beltway (typically $7)",
        },
        {
          label: "Weekly Minimum",
          value: insideBeltway.weeklyMinimum ?? 0,
          path: ["geographicPricing", "insideBeltway", "weeklyMinimum"],
          unit: "$",
          description: "Minimum weekly charge regardless of fixture count (typically $40)",
        },
        {
          label: "Trip Charge",
          value: insideBeltway.tripCharge ?? 0,
          path: ["geographicPricing", "insideBeltway", "tripCharge"],
          unit: "$",
          description: "Standard trip charge for inside beltway locations",
        },
        {
          label: "Parking Fee",
          value: insideBeltway.parkingFee ?? 0,
          path: ["geographicPricing", "insideBeltway", "parkingFee"],
          unit: "$",
          description: "Pass-through parking fee for paid parking locations",
        },
      ];

      // Outside Beltway
      const outsideBeltway = getValue(["geographicPricing", "outsideBeltway"]) || {};
      categories.outsideBeltway = [
        {
          label: "Rate Per Fixture",
          value: outsideBeltway.ratePerFixture ?? 0,
          path: ["geographicPricing", "outsideBeltway", "ratePerFixture"],
          unit: "$ per fixture",
          description: "Weekly rate per fixture for locations outside the beltway",
        },
        {
          label: "Weekly Minimum",
          value: outsideBeltway.weeklyMinimum ?? 0,
          path: ["geographicPricing", "outsideBeltway", "weeklyMinimum"],
          unit: "$",
          description: "Minimum weekly charge for outside beltway locations",
        },
        {
          label: "Trip Charge",
          value: outsideBeltway.tripCharge ?? 0,
          path: ["geographicPricing", "outsideBeltway", "tripCharge"],
          unit: "$",
          description: "Trip charge for outside beltway locations",
        },
      ];

      // All-Inclusive Package
      const allInclusive = getValue(["allInclusivePackage"]) || {};
      categories.allInclusive = [
        {
          label: "Weekly Rate Per Fixture",
          value: allInclusive.weeklyRatePerFixture ?? 0,
          path: ["allInclusivePackage", "weeklyRatePerFixture"],
          unit: "$ per fixture",
          description: "All-inclusive package rate (includes SaniClean, SaniPod, microfiber mopping, monthly SaniScrub)",
        },
      ];

      // Small Facility Minimum
      const smallFacility = getValue(["smallFacilityMinimum"]) || {};
      categories.smallFacility = [
        {
          label: "Fixture Threshold",
          value: smallFacility.fixtureThreshold ?? 0,
          path: ["smallFacilityMinimum", "fixtureThreshold"],
          unit: "fixtures",
          description: "Maximum fixtures to qualify as small facility (typically 6)",
        },
        {
          label: "Minimum Weekly Charge",
          value: smallFacility.minimumWeeklyCharge ?? 0,
          path: ["smallFacilityMinimum", "minimumWeeklyCharge"],
          unit: "$",
          description: "Minimum charge for small facilities (includes trip)",
        },
      ];

      // Soap Upgrades
      const soapUpgrades = getValue(["soapUpgrades"]) || {};
      const excessCharges = soapUpgrades.excessUsageCharges || {};
      categories.soapUpgrades = [
        {
          label: "Standard to Luxury Upgrade",
          value: soapUpgrades.standardToLuxury ?? 0,
          path: ["soapUpgrades", "standardToLuxury"],
          unit: "$ per fixture",
          description: "Upgrade charge from standard to luxury soap per fixture",
        },
        {
          label: "Excess Standard Soap Charge",
          value: excessCharges.standardSoap ?? 0,
          path: ["soapUpgrades", "excessUsageCharges", "standardSoap"],
          unit: "$",
          description: "Charge for excessive standard soap usage beyond normal",
        },
        {
          label: "Excess Luxury Soap Charge",
          value: excessCharges.luxurySoap ?? 0,
          path: ["soapUpgrades", "excessUsageCharges", "luxurySoap"],
          unit: "$",
          description: "Charge for excessive luxury soap usage beyond normal",
        },
      ];

      // Warranty & Credits
      const paperCredit = getValue(["paperCredit"]) || {};
      categories.warrantyCredits = [
        {
          label: "Warranty Fee Per Dispenser",
          value: getValue(["warrantyFeePerDispenser"]) ?? 0,
          path: ["warrantyFeePerDispenser"],
          unit: "$ per dispenser",
          description: "Monthly warranty fee per dispenser (waived in all-inclusive)",
        },
        {
          label: "Paper Credit Per Fixture Per Week",
          value: paperCredit.creditPerFixturePerWeek ?? 0,
          path: ["paperCredit", "creditPerFixturePerWeek"],
          unit: "$",
          description: "Credit applied per fixture per week for paper products",
        },
      ];

      // Billing Conversions
      const billingConversions = getValue(["billingConversions", "weekly"]) || {};
      categories.sanicleanBillingConversions = [
        {
          label: "Weekly to Monthly Multiplier",
          value: billingConversions.monthlyMultiplier ?? 0,
          path: ["billingConversions", "weekly", "monthlyMultiplier"],
          unit: "×",
          description: "Multiply weekly rate by this to get monthly (typically 4.33)",
        },
        {
          label: "Weekly to Annual Multiplier",
          value: billingConversions.annualMultiplier ?? 0,
          path: ["billingConversions", "weekly", "annualMultiplier"],
          unit: "×",
          description: "Multiply weekly rate by this to get annual (typically 52)",
        },
      ];

      // Rate Tiers
      const rateTiers = getValue(["rateTiers"]) || {};
      categories.sanicleanRateTiers = [
        {
          label: "Red Rate Multiplier",
          value: rateTiers.redRate?.multiplier ?? 0,
          path: ["rateTiers", "redRate", "multiplier"],
          unit: "×",
          description: "Standard rate multiplier (typically 1.0)",
        },
        {
          label: "Green Rate Multiplier",
          value: rateTiers.greenRate?.multiplier ?? 0,
          path: ["rateTiers", "greenRate", "multiplier"],
          unit: "×",
          description: "Premium rate multiplier (typically 1.3 = 30% higher)",
        },
      ];
    }

    // SANIPOD
    if (service.serviceId === "sanipod") {
      // Pod Rates
      categories.podRates = [
        {
          label: "Weekly Rate Per Unit (Option A)",
          value: getValue(["weeklyRatePerUnit"]) ?? 0,
          path: ["weeklyRatePerUnit"],
          unit: "$ per pod",
          description: "Base rate per pod per week (used in $3+$40 pricing model)",
        },
        {
          label: "Alternate Weekly Rate Per Unit (Option B)",
          value: getValue(["altWeeklyRatePerUnit"]) ?? 0,
          path: ["altWeeklyRatePerUnit"],
          unit: "$ per pod",
          description: "Flat rate per pod per week (typically $8/pod, no base charge)",
        },
        {
          label: "Trip Charge Per Visit",
          value: getValue(["tripChargePerVisit"]) ?? 0,
          path: ["tripChargePerVisit"],
          unit: "$",
          description: "Trip charge added per visit",
        },
      ];

      // Extra Bags
      categories.extraBags = [
        {
          label: "Extra Bag Price",
          value: getValue(["extraBagPrice"]) ?? 0,
          path: ["extraBagPrice"],
          unit: "$ per bag",
          description: "Price per additional waste bag (typically $2/bag)",
        },
      ];

      // Installation
      categories.installation = [
        {
          label: "Install Charge Per Unit",
          value: getValue(["installChargePerUnit"]) ?? 0,
          path: ["installChargePerUnit"],
          unit: "$ per pod",
          description: "One-time installation charge per SaniPod unit (typically $25)",
        },
      ];

      // Standalone Service
      categories.standaloneService = [
        {
          label: "Standalone Extra Weekly Charge",
          value: getValue(["standaloneExtraWeeklyCharge"]) ?? 0,
          path: ["standaloneExtraWeeklyCharge"],
          unit: "$ per week",
          description: "Account-level base charge for standalone service (used in $3+$40 model)",
        },
      ];

      // Frequency Settings
      const annualFreqs = getValue(["annualFrequencies"]) || {};
      categories.frequencySettings = [
        {
          label: "Weekly Visits Per Year",
          value: annualFreqs.weekly ?? 0,
          path: ["annualFrequencies", "weekly"],
          unit: "visits/year",
          description: "Number of weekly service visits per year (typically 52)",
        },
        {
          label: "Biweekly Visits Per Year",
          value: annualFreqs.biweekly ?? 0,
          path: ["annualFrequencies", "biweekly"],
          unit: "visits/year",
          description: "Number of biweekly service visits per year (typically 26)",
        },
        {
          label: "Monthly Visits Per Year",
          value: annualFreqs.monthly ?? 0,
          path: ["annualFrequencies", "monthly"],
          unit: "visits/year",
          description: "Number of monthly service visits per year (typically 12)",
        },
      ];

      // Billing Conversions
      categories.sanipodBillingConversions = [
        {
          label: "Weeks Per Month",
          value: getValue(["weeksPerMonth"]) ?? 0,
          path: ["weeksPerMonth"],
          unit: "weeks",
          description: "Average weeks per month for billing (typically 4.33 = 52/12)",
        },
        {
          label: "Weeks Per Year",
          value: getValue(["weeksPerYear"]) ?? 0,
          path: ["weeksPerYear"],
          unit: "weeks",
          description: "Total weeks per year (typically 52)",
        },
      ];

      // Contract Terms
      categories.sanipodContractTerms = [
        {
          label: "Minimum Contract Months",
          value: getValue(["minContractMonths"]) ?? 0,
          path: ["minContractMonths"],
          unit: "months",
          description: "Minimum contract duration required (e.g., 2 months)",
        },
        {
          label: "Maximum Contract Months",
          value: getValue(["maxContractMonths"]) ?? 0,
          path: ["maxContractMonths"],
          unit: "months",
          description: "Maximum contract duration allowed (e.g., 36 months)",
        },
      ];

      // Rate Tiers
      const rateCategories = getValue(["rateCategories"]) || {};
      categories.sanipodRateTiers = [
        {
          label: "Red Rate Multiplier",
          value: rateCategories.redRate?.multiplier ?? 0,
          path: ["rateCategories", "redRate", "multiplier"],
          unit: "×",
          description: "Standard rate multiplier (typically 1.0)",
        },
        {
          label: "Green Rate Multiplier",
          value: rateCategories.greenRate?.multiplier ?? 0,
          path: ["rateCategories", "greenRate", "multiplier"],
          unit: "×",
          description: "Premium rate multiplier (typically 1.3 = 30% higher)",
        },
      ];
    }

    // SANISCRUB
    if (service.serviceId === "saniscrub") {
      // Fixture Rates
      const fixtureRates = getValue(["fixtureRates"]) || {};
      categories.fixtureRates = [
        {
          label: "Monthly Rate Per Fixture",
          value: fixtureRates.monthly ?? 0,
          path: ["fixtureRates", "monthly"],
          unit: "$ per fixture",
          description: "Monthly rate per bathroom fixture (typically $25)",
        },
        {
          label: "Twice Per Month Rate Per Fixture",
          value: fixtureRates.twicePerMonth ?? 0,
          path: ["fixtureRates", "twicePerMonth"],
          unit: "$ per fixture",
          description: "Rate per fixture for twice-monthly service (typically $25 base, doubled)",
        },
        {
          label: "Bimonthly Rate Per Fixture",
          value: fixtureRates.bimonthly ?? 0,
          path: ["fixtureRates", "bimonthly"],
          unit: "$ per fixture",
          description: "Rate per fixture for bimonthly service - charged per visit (typically $35)",
        },
        {
          label: "Quarterly Rate Per Fixture",
          value: fixtureRates.quarterly ?? 0,
          path: ["fixtureRates", "quarterly"],
          unit: "$ per fixture",
          description: "Rate per fixture for quarterly service - charged per visit (typically $40)",
        },
      ];

      // Minimums
      const minimums = getValue(["minimums"]) || {};
      categories.saniscrubMinimums = [
        {
          label: "Monthly Minimum Charge",
          value: minimums.monthly ?? 0,
          path: ["minimums", "monthly"],
          unit: "$",
          description: "Minimum monthly charge regardless of fixture count (typically $175)",
        },
        {
          label: "Twice Per Month Minimum Charge",
          value: minimums.twicePerMonth ?? 0,
          path: ["minimums", "twicePerMonth"],
          unit: "$",
          description: "Minimum charge for twice-monthly service (typically $175 base)",
        },
        {
          label: "Bimonthly Minimum Per Visit",
          value: minimums.bimonthly ?? 0,
          path: ["minimums", "bimonthly"],
          unit: "$",
          description: "Minimum charge per visit for bimonthly service (typically $250)",
        },
        {
          label: "Quarterly Minimum Per Visit",
          value: minimums.quarterly ?? 0,
          path: ["minimums", "quarterly"],
          unit: "$",
          description: "Minimum charge per visit for quarterly service (typically $250)",
        },
      ];

      // Non-Bathroom Pricing
      categories.nonBathroomPricing = [
        {
          label: "Non-Bathroom Unit Square Feet",
          value: getValue(["nonBathroomUnitSqFt"]) ?? 0,
          path: ["nonBathroomUnitSqFt"],
          unit: "sq ft",
          description: "Square footage per pricing unit for non-bathroom areas (e.g., 500 sq ft per unit)",
        },
        {
          label: "First Unit Rate",
          value: getValue(["nonBathroomFirstUnitRate"]) ?? 0,
          path: ["nonBathroomFirstUnitRate"],
          unit: "$",
          description: "Price for the first unit of non-bathroom area scrubbing",
        },
        {
          label: "Additional Unit Rate",
          value: getValue(["nonBathroomAdditionalUnitRate"]) ?? 0,
          path: ["nonBathroomAdditionalUnitRate"],
          unit: "$",
          description: "Price for each additional unit beyond the first",
        },
      ];

      // Install Multipliers
      const installMults = getValue(["installMultipliers"]) || {};
      categories.saniscrubInstallMultipliers = [
        {
          label: "Dirty Install Multiplier",
          value: installMults.dirty ?? 0,
          path: ["installMultipliers", "dirty"],
          unit: "×",
          description: "Multiply monthly base by this for dirty first-time installations (typically 3x)",
        },
        {
          label: "Clean Install Multiplier",
          value: installMults.clean ?? 0,
          path: ["installMultipliers", "clean"],
          unit: "×",
          description: "Multiply monthly base by this for clean installations (typically 1x)",
        },
      ];

      // Service Frequencies
      const freqMeta = getValue(["frequencyMeta"]) || {};
      categories.serviceFrequencies = [
        {
          label: "Monthly Visits Per Year",
          value: freqMeta.monthly?.visitsPerYear ?? 0,
          path: ["frequencyMeta", "monthly", "visitsPerYear"],
          unit: "visits/year",
          description: "Number of monthly service visits per year (typically 12)",
        },
        {
          label: "Twice Per Month Visits Per Year",
          value: freqMeta.twicePerMonth?.visitsPerYear ?? 0,
          path: ["frequencyMeta", "twicePerMonth", "visitsPerYear"],
          unit: "visits/year",
          description: "Number of twice-monthly service visits per year (typically 24)",
        },
        {
          label: "Bimonthly Visits Per Year",
          value: freqMeta.bimonthly?.visitsPerYear ?? 0,
          path: ["frequencyMeta", "bimonthly", "visitsPerYear"],
          unit: "visits/year",
          description: "Number of bimonthly service visits per year (typically 6)",
        },
        {
          label: "Quarterly Visits Per Year",
          value: freqMeta.quarterly?.visitsPerYear ?? 0,
          path: ["frequencyMeta", "quarterly", "visitsPerYear"],
          unit: "visits/year",
          description: "Number of quarterly service visits per year (typically 4)",
        },
      ];

      // Discounts & Fees
      categories.discountsAndFees = [
        {
          label: "Twice Per Month Discount (w/ SaniClean)",
          value: getValue(["twoTimesPerMonthDiscountFlat"]) ?? 0,
          path: ["twoTimesPerMonthDiscountFlat"],
          unit: "$",
          description: "Flat discount applied to twice-monthly service when customer has SaniClean (typically $15)",
        },
        {
          label: "Trip Charge Base",
          value: getValue(["tripChargeBase"]) ?? 0,
          path: ["tripChargeBase"],
          unit: "$",
          description: "Base trip charge (currently disabled in calculations)",
        },
        {
          label: "Parking Fee",
          value: getValue(["parkingFee"]) ?? 0,
          path: ["parkingFee"],
          unit: "$",
          description: "Pass-through parking fee for paid parking locations",
        },
      ];
    }

    // STRIP & WAX
    if (service.serviceId === "stripWax") {
      // Standard Full Strip & Wax
      const standardFull = getValue(["variants", "standardFull"]) || {};
      categories.standardFull = [
        {
          label: "Rate Per Square Foot",
          value: standardFull.ratePerSqFt ?? 0,
          path: ["variants", "standardFull", "ratePerSqFt"],
          unit: "$ per sq ft",
          description: "Standard full strip & wax rate per square foot (complete strip, reseal, wax)",
        },
        {
          label: "Minimum Charge",
          value: standardFull.minCharge ?? 0,
          path: ["variants", "standardFull", "minCharge"],
          unit: "$",
          description: "Minimum charge for standard full strip & wax regardless of square footage",
        },
      ];

      // No Sealant Variant
      const noSealant = getValue(["variants", "noSealant"]) || {};
      categories.noSealant = [
        {
          label: "Rate Per Square Foot",
          value: noSealant.ratePerSqFt ?? 0,
          path: ["variants", "noSealant", "ratePerSqFt"],
          unit: "$ per sq ft",
          description: "Strip & wax without sealant - rate per square foot (lighter service)",
        },
        {
          label: "Minimum Charge",
          value: noSealant.minCharge ?? 0,
          path: ["variants", "noSealant", "minCharge"],
          unit: "$",
          description: "Minimum charge for no-sealant strip & wax",
        },
      ];

      // Well Maintained Variant
      const wellMaintained = getValue(["variants", "wellMaintained"]) || {};
      categories.wellMaintained = [
        {
          label: "Rate Per Square Foot",
          value: wellMaintained.ratePerSqFt ?? 0,
          path: ["variants", "wellMaintained", "ratePerSqFt"],
          unit: "$ per sq ft",
          description: "Well-maintained floor rate - discounted for regularly maintained floors",
        },
        {
          label: "Minimum Charge",
          value: wellMaintained.minCharge ?? 0,
          path: ["variants", "wellMaintained", "minCharge"],
          unit: "$",
          description: "Minimum charge for well-maintained floor strip & wax",
        },
      ];

      // Contract Terms
      categories.stripWaxContractTerms = [
        {
          label: "Minimum Contract Months",
          value: getValue(["minContractMonths"]) ?? 0,
          path: ["minContractMonths"],
          unit: "months",
          description: "Minimum contract duration required (typically 2 months)",
        },
        {
          label: "Maximum Contract Months",
          value: getValue(["maxContractMonths"]) ?? 0,
          path: ["maxContractMonths"],
          unit: "months",
          description: "Maximum contract duration allowed (typically 36 months)",
        },
      ];

      // Billing Conversions
      categories.stripWaxBillingConversions = [
        {
          label: "Weeks Per Month",
          value: getValue(["weeksPerMonth"]) ?? 0,
          path: ["weeksPerMonth"],
          unit: "weeks",
          description: "Average weeks per month for billing calculations (typically 4.33 = 52/12)",
        },
      ];

      // Rate Tiers
      const rateCategories = getValue(["rateCategories"]) || {};
      categories.stripWaxRateTiers = [
        {
          label: "Red Rate Multiplier",
          value: rateCategories.redRate?.multiplier ?? 0,
          path: ["rateCategories", "redRate", "multiplier"],
          unit: "×",
          description: "Standard rate multiplier (typically 1.0)",
        },
        {
          label: "Green Rate Multiplier",
          value: rateCategories.greenRate?.multiplier ?? 0,
          path: ["rateCategories", "greenRate", "multiplier"],
          unit: "×",
          description: "Premium rate multiplier (typically 1.3 = 30% higher)",
        },
      ];
    }

    return categories;
  };

  const handleEdit = (field: PricingField) => {
    setEditingField({ path: field.path, value: field.value.toString() });
  };

  const handleSave = async () => {
    if (!editingField) return;

    setSaving(true);
    try {
      await onUpdateField(editingField.path, parseFloat(editingField.value) || 0);
      setEditingField(null);
    } catch (error) {
      console.error("Error saving field:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
  };

  const categories = getFieldsByCategory();

  // Dynamic tabs based on service type
  const getTabs = (): { key: TabKey; label: string; icon: string }[] => {
    if (service.serviceId === "rpmWindows") {
      return [
        { key: "windowRates", label: "Window Rates", icon: "🪟" },
        { key: "installMultipliers", label: "Install Multipliers", icon: "⚡" },
        { key: "frequencyMultipliers", label: "Frequency Multipliers", icon: "📅" },
        { key: "annualFrequencies", label: "Annual Frequencies", icon: "📊" },
        { key: "conversions", label: "Billing Conversions", icon: "🔄" },
        { key: "rateCategories", label: "Rate Tiers", icon: "💰" },
      ];
    }

    if (service.serviceId === "carpetCleaning") {
      return [
        { key: "unitPricing", label: "Unit Pricing", icon: "📐" },
        { key: "minimums", label: "Minimums", icon: "💵" },
        { key: "carpetInstallMultipliers", label: "Install Multipliers", icon: "⚡" },
        { key: "frequencyMeta", label: "Service Frequencies", icon: "📅" },
      ];
    }

    if (service.serviceId === "foamingDrain") {
      return [
        { key: "standardRates", label: "Standard Rates", icon: "💧" },
        { key: "volumePricing", label: "Volume Pricing", icon: "📊" },
        { key: "greaseTrap", label: "Grease Trap", icon: "🛢️" },
        { key: "greenDrain", label: "Green Drain", icon: "🌿" },
        { key: "addonsMultipliers", label: "Add-ons & Multipliers", icon: "➕" },
        { key: "tripCharges", label: "Trip Charges", icon: "🚗" },
        { key: "billingConversions", label: "Billing Conversions", icon: "🔄" },
        { key: "contractTerms", label: "Contract Terms", icon: "📋" },
      ];
    }

    if (service.serviceId === "microfiberMopping") {
      return [
        { key: "basicRates", label: "Basic Rates", icon: "🧹" },
        { key: "hugeBathrooms", label: "Huge Bathrooms", icon: "🏢" },
        { key: "extraAreas", label: "Extra Areas", icon: "🏛️" },
        { key: "standalonePricing", label: "Standalone Service", icon: "⭐" },
      ];
    }

    if (service.serviceId === "pureJanitorial") {
      return [
        { key: "baseRates", label: "Base Rates", icon: "🕐" },
        { key: "shortJobPricing", label: "Short Job Pricing", icon: "⚡" },
        { key: "serviceMultipliers", label: "Service Multipliers", icon: "✖️" },
        { key: "monthlyConversions", label: "Monthly Conversions", icon: "📅" },
        { key: "contractSettings", label: "Contract Terms", icon: "📋" },
        { key: "dustingVacuuming", label: "Dusting & Vacuuming", icon: "🧹" },
        { key: "rateTiers", label: "Rate Tiers", icon: "💰" },
      ];
    }

    if (service.serviceId === "saniclean") {
      return [
        { key: "insideBeltway", label: "Inside Beltway", icon: "🏙️" },
        { key: "outsideBeltway", label: "Outside Beltway", icon: "🌳" },
        { key: "allInclusive", label: "All-Inclusive Package", icon: "📦" },
        { key: "smallFacility", label: "Small Facility", icon: "🏪" },
        { key: "soapUpgrades", label: "Soap Upgrades", icon: "🧴" },
        { key: "warrantyCredits", label: "Warranty & Credits", icon: "🎫" },
        { key: "sanicleanBillingConversions", label: "Billing Conversions", icon: "🔄" },
        { key: "sanicleanRateTiers", label: "Rate Tiers", icon: "💰" },
      ];
    }

    if (service.serviceId === "sanipod") {
      return [
        { key: "podRates", label: "Pod Rates", icon: "🗑️" },
        { key: "extraBags", label: "Extra Bags", icon: "🛍️" },
        { key: "installation", label: "Installation", icon: "🔧" },
        { key: "standaloneService", label: "Standalone Service", icon: "⭐" },
        { key: "frequencySettings", label: "Service Frequencies", icon: "📅" },
        { key: "sanipodBillingConversions", label: "Billing Conversions", icon: "🔄" },
        { key: "sanipodContractTerms", label: "Contract Terms", icon: "📋" },
        { key: "sanipodRateTiers", label: "Rate Tiers", icon: "💰" },
      ];
    }

    if (service.serviceId === "saniscrub") {
      return [
        { key: "fixtureRates", label: "Fixture Rates", icon: "🚿" },
        { key: "saniscrubMinimums", label: "Minimums", icon: "💵" },
        { key: "nonBathroomPricing", label: "Non-Bathroom Areas", icon: "🏛️" },
        { key: "saniscrubInstallMultipliers", label: "Install Multipliers", icon: "⚡" },
        { key: "serviceFrequencies", label: "Service Frequencies", icon: "📅" },
        { key: "discountsAndFees", label: "Discounts & Fees", icon: "🎟️" },
      ];
    }

    if (service.serviceId === "stripWax") {
      return [
        { key: "standardFull", label: "Standard Full", icon: "🌟" },
        { key: "noSealant", label: "No Sealant", icon: "💧" },
        { key: "wellMaintained", label: "Well Maintained", icon: "✨" },
        { key: "stripWaxContractTerms", label: "Contract Terms", icon: "📋" },
        { key: "stripWaxBillingConversions", label: "Billing Conversions", icon: "🔄" },
        { key: "stripWaxRateTiers", label: "Rate Tiers", icon: "💰" },
      ];
    }

    return [];
  };

  const tabs = getTabs();

  return (
    <div className="spd">
      <div className="spd__header">
        <div>
          <h2 className="spd__title">{service.label} - Pricing Details</h2>
          <p className="spd__subtitle">{service.description}</p>
        </div>
        <button className="spd__close" onClick={onClose}>
          ✕ Close
        </button>
      </div>

      <div className="spd__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`spd__tab ${activeTab === tab.key ? "spd__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="spd__tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="spd__content">
        <div className="spd__fields">
          {categories[activeTab].map((field, index) => {
            const isEditing =
              editingField?.path.join(".") === field.path.join(".");

            return (
              <div key={index} className="spd__field">
                <div className="spd__field-info">
                  <div className="spd__field-label">{field.label}</div>
                  {field.description && (
                    <div className="spd__field-description">{field.description}</div>
                  )}
                </div>

                <div className="spd__field-value">
                  {isEditing ? (
                    <div className="spd__field-edit">
                      <input
                        type="number"
                        className="spd__input"
                        value={editingField.value}
                        onChange={(e) =>
                          setEditingField({ ...editingField, value: e.target.value })
                        }
                        step="0.01"
                        autoFocus
                      />
                      <span className="spd__unit">{field.unit}</span>
                      <div className="spd__actions">
                        <button
                          className="spd__btn spd__btn--save"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? "..." : "Save"}
                        </button>
                        <button
                          className="spd__btn spd__btn--cancel"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="spd__field-display">
                      <span className="spd__value">
                        {field.value} {field.unit}
                      </span>
                      <button
                        className="spd__btn spd__btn--edit"
                        onClick={() => handleEdit(field)}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {categories[activeTab].length === 0 && (
          <div className="spd__empty">
            No fields available in this category
          </div>
        )}
      </div>
    </div>
  );
};

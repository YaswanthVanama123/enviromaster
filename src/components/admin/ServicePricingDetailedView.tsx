// src/components/admin/ServicePricingDetailedView.tsx

import React, { useState, useEffect } from "react";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import { Toast } from "./Toast";
import "./ServicePricingDetailedView.css";

interface ServicePricingDetailedViewProps {
  service: ServiceConfig;
  onUpdateField: (path: string[], value: number) => Promise<void>;
  onClose: () => void;
}

type TabKey =
  // RPM Windows
  | "windowRates" | "installMultipliers" | "minimumAndTripCharges" | "frequencyPriceMultipliers" | "frequencyConversions" | "contractTerms"
  // Carpet Cleaning
  | "unitPricing" | "minimums" | "carpetInstallMultipliers" | "frequencyMeta"
  // Electrostatic Spray
  | "sprayRates" | "sprayTripCharges" | "sprayFrequencyConversions"
  // Foaming Drain
  | "standardRates" | "volumePricing" | "greaseTrap" | "greenDrain" | "addonsMultipliers" | "tripCharges" | "billingConversions" | "contractTerms"
  // Microfiber Mopping
  | "basicRates" | "hugeBathrooms" | "extraAreas" | "standalonePricing" | "moppingMetadata" | "contractTerms"
  // Pure Janitorial
  | "baseRates" | "shortJobPricing" | "serviceMultipliers" | "monthlyConversions" | "contractSettings" | "dustingVacuuming" | "rateTiers" | "smoothBreakdown"
  // SaniClean
  | "insideBeltway" | "outsideBeltway" | "allInclusive" | "smallFacility" | "soapUpgrades" | "warrantyCredits" | "sanicleanBillingConversions" | "sanicleanRateTiers" | "includedItems" | "monthlyAddOns" | "microfiberMoppingAddon" | "contractTerms"
  // SaniPod
  | "podRates" | "extraBags" | "installation" | "standaloneService" | "frequencySettings" | "sanipodBillingConversions" | "sanipodContractTerms" | "sanipodRateTiers"
  // SaniScrub
  | "fixtureRates" | "saniscrubMinimums" | "nonBathroomPricing" | "saniscrubInstallMultipliers" | "serviceFrequencies" | "discountsAndFees" | "contractTerms"
  // Strip & Wax
  | "standardFull" | "noSealant" | "wellMaintained" | "stripWaxContractTerms" | "stripWaxBillingConversions" | "stripWaxRateTiers"
  // Refresh Power Scrub
  | "defaultRates" | "kitchenPricing" | "fohPricing" | "patioPricing" | "sqftPricing" | "scrubFrequencyConversions" | "contractTerms";

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
    if (service.serviceId === "electrostaticSpray") return "sprayRates";
    if (service.serviceId === "foamingDrain") return "standardRates";
    if (service.serviceId === "microfiberMopping") return "basicRates";
    if (service.serviceId === "pureJanitorial") return "baseRates";
    if (service.serviceId === "saniclean") return "insideBeltway";
    if (service.serviceId === "sanipod") return "podRates";
    if (service.serviceId === "saniscrub") return "fixtureRates";
    if (service.serviceId === "stripWax") return "standardFull";
    if (service.serviceId === "refreshPowerScrub") return "defaultRates";
    return "windowRates";
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab());
  const [editingField, setEditingField] = useState<{ path: string[]; value: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-clear messages after 5 seconds
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

  const config = service.config;

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

  // Apply defaults to config before processing
  const configWithDefaults = ensureNestedDefaults({...config});

  // Helper to get nested value
  const getValue = (path: string[], configSource?: any): any => {
    let current: any = configSource || configWithDefaults; // ✅ Use configWithDefaults by default
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
      minimumAndTripCharges: [],
      frequencyPriceMultipliers: [],
      frequencyConversions: [],
      contractTerms: [],
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
      moppingMetadata: [],
      // Pure Janitorial
      baseRates: [],
      shortJobPricing: [],
      serviceMultipliers: [],
      monthlyConversions: [],
      contractSettings: [],
      dustingVacuuming: [],
      rateTiers: [],
      smoothBreakdown: [],
      // SaniClean
      insideBeltway: [],
      outsideBeltway: [],
      allInclusive: [],
      smallFacility: [],
      soapUpgrades: [],
      warrantyCredits: [],
      sanicleanBillingConversions: [],
      sanicleanRateTiers: [],
      includedItems: [],
      monthlyAddOns: [],
      microfiberMoppingAddon: [],
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
      // Refresh Power Scrub
      defaultRates: [],
      kitchenPricing: [],
      fohPricing: [],
      patioPricing: [],
      sqftPricing: [],
      scrubFrequencyConversions: [],
    };

    // RPM WINDOWS - NEW 2025 STRUCTURE
    if (service.serviceId === "rpmWindows") {
      // Window Pricing (Both Sides Included)
      const windowPricing = getValue(["windowPricingBothSidesIncluded"]) || {};
      categories.windowRates = [
        {
          label: "Small Window Price",
          value: windowPricing.smallWindowPrice ?? 0,
          path: ["windowPricingBothSidesIncluded", "smallWindowPrice"],
          unit: "$ per window",
          description: "Price for cleaning small windows (both sides included, typically $1.50)",
        },
        {
          label: "Medium Window Price",
          value: windowPricing.mediumWindowPrice ?? 0,
          path: ["windowPricingBothSidesIncluded", "mediumWindowPrice"],
          unit: "$ per window",
          description: "Price for cleaning medium windows (both sides included, typically $3.00)",
        },
        {
          label: "Large Window Price",
          value: windowPricing.largeWindowPrice ?? 0,
          path: ["windowPricingBothSidesIncluded", "largeWindowPrice"],
          unit: "$ per window",
          description: "Price for cleaning large windows (both sides included, typically $7.00)",
        },
      ];

      // Install Multiplier
      const installPricing = getValue(["installPricing"]) || {};
      categories.installMultipliers = [
        {
          label: "Installation Multiplier",
          value: installPricing.installationMultiplier ?? 0,
          path: ["installPricing", "installationMultiplier"],
          unit: "×",
          description: "Multiply base price by this for first-time/dirty installations (typically 3x)",
        },
      ];

      // Minimum Charge & Trip Charges
      const tripChargesData = getValue(["tripCharges"]) || {};
      categories.minimumAndTripCharges = [
        {
          label: "Minimum Charge Per Visit",
          value: getValue(["minimumChargePerVisit"]) ?? 0,
          path: ["minimumChargePerVisit"],
          unit: "$",
          description: "Minimum charge per service visit (typically $50)",
        },
        {
          label: "Standard Trip Charge",
          value: tripChargesData.standard ?? 0,
          path: ["tripCharges", "standard"],
          unit: "$",
          description: "Standard trip charge for service visits (typically $0)",
        },
        {
          label: "Beltway Trip Charge",
          value: tripChargesData.beltway ?? 0,
          path: ["tripCharges", "beltway"],
          unit: "$",
          description: "Trip charge for beltway locations (typically $0)",
        },
      ];

      // Frequency Price Multipliers
      const freqPriceMultipliers = getValue(["frequencyPriceMultipliers"]) || {};
      categories.frequencyPriceMultipliers = [
        {
          label: "Biweekly Price Multiplier",
          value: freqPriceMultipliers.biweeklyPriceMultiplier ?? 0,
          path: ["frequencyPriceMultipliers", "biweeklyPriceMultiplier"],
          unit: "×",
          description: "Multiplier applied for biweekly service (typically 1.25x)",
        },
        {
          label: "Monthly Price Multiplier",
          value: freqPriceMultipliers.monthlyPriceMultiplier ?? 0,
          path: ["frequencyPriceMultipliers", "monthlyPriceMultiplier"],
          unit: "×",
          description: "Multiplier applied for monthly service (typically 1.25x)",
        },
        {
          label: "Quarterly Price Multiplier (After First Time)",
          value: freqPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime ?? 0,
          path: ["frequencyPriceMultipliers", "quarterlyPriceMultiplierAfterFirstTime"],
          unit: "×",
          description: "Multiplier for quarterly service after initial clean (typically 2x)",
        },
        {
          label: "Quarterly First Time Multiplier",
          value: freqPriceMultipliers.quarterlyFirstTimeMultiplier ?? 0,
          path: ["frequencyPriceMultipliers", "quarterlyFirstTimeMultiplier"],
          unit: "×",
          description: "Multiplier for quarterly first-time service (typically 3x)",
        },
      ];

      // Frequency Metadata (Billing Conversions)
      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.frequencyConversions = [
        {
          label: "Weekly - Monthly Recurring Multiplier",
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply weekly rate to get monthly billing (typically 4.33)",
        },
        {
          label: "Weekly - First Month Extra Multiplier",
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 3.33)",
        },
        {
          label: "Biweekly - Monthly Recurring Multiplier",
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply biweekly rate to get monthly billing (typically 2.165)",
        },
        {
          label: "Biweekly - First Month Extra Multiplier",
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 1.165)",
        },
        {
          label: "Bimonthly - Cycle Months",
          value: freqMeta.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 2)",
        },
        {
          label: "Quarterly - Cycle Months",
          value: freqMeta.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 3)",
        },
        {
          label: "Biannual - Cycle Months",
          value: freqMeta.biannual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "biannual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 6)",
        },
        {
          label: "Annual - Cycle Months",
          value: freqMeta.annual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "annual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 12)",
        },
      ];

      // Contract Terms
      categories.contractTerms = [
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
    }

    // CARPET CLEANING
    if (service.serviceId === "carpetCleaning") {
      // Unit Pricing
      categories.unitPricing = [
        {
          label: "Base Sq-ft Unit",
          value: getValue(["baseSqFtUnit"]) ?? 0,
          path: ["baseSqFtUnit"],
          unit: "sq ft",
          description: "Base square footage unit for pricing (typically 500 sq ft)",
        },
        {
          label: "Base Price",
          value: getValue(["basePrice"]) ?? 0,
          path: ["basePrice"],
          unit: "$",
          description: "Price for the base square footage unit",
        },
        {
          label: "Additional Sq-ft Unit",
          value: getValue(["additionalSqFtUnit"]) ?? 0,
          path: ["additionalSqFtUnit"],
          unit: "sq ft",
          description: "Additional square footage unit for pricing",
        },
        {
          label: "Additional Unit Price",
          value: getValue(["additionalUnitPrice"]) ?? 0,
          path: ["additionalUnitPrice"],
          unit: "$",
          description: "Price for each additional unit beyond the base",
        },
      ];

      // Minimums
      categories.minimums = [
        {
          label: "Minimum Charge Per Visit",
          value: getValue(["minimumChargePerVisit"]) ?? 0,
          path: ["minimumChargePerVisit"],
          unit: "$",
          description: "Minimum charge per service visit regardless of area",
        },
      ];

      // Install Multipliers
      const installMults = getValue(["installationMultipliers"]) || {};
      categories.carpetInstallMultipliers = [
        {
          label: "Dirty Install Multiplier",
          value: installMults.dirtyInstallMultiplier ?? 0,
          path: ["installationMultipliers", "dirtyInstallMultiplier"],
          unit: "×",
          description: "Multiply rate by this for dirty/heavily soiled carpets (typically 3x)",
        },
        {
          label: "Clean Install Multiplier",
          value: installMults.cleanInstallMultiplier ?? 0,
          path: ["installationMultipliers", "cleanInstallMultiplier"],
          unit: "×",
          description: "Multiply rate by this for clean/lightly soiled carpets (typically 1x)",
        },
      ];

      // Frequency Metadata
      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.frequencyMeta = [
        {
          label: "Weekly - Monthly Recurring Multiplier",
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply weekly rate to get monthly billing (typically 4.33)",
        },
        {
          label: "Weekly - First Month Extra Multiplier",
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 3.33)",
        },
        {
          label: "Biweekly - Monthly Recurring Multiplier",
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply biweekly rate to get monthly billing (typically 2.165)",
        },
        {
          label: "Biweekly - First Month Extra Multiplier",
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 1.165)",
        },
        {
          label: "Monthly - Cycle Months",
          value: freqMeta.monthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "monthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 1)",
        },
        {
          label: "Bimonthly - Cycle Months",
          value: freqMeta.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 2)",
        },
        {
          label: "Quarterly - Cycle Months",
          value: freqMeta.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 3)",
        },
        {
          label: "Biannual - Cycle Months",
          value: freqMeta.biannual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "biannual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 6)",
        },
        {
          label: "Annual - Cycle Months",
          value: freqMeta.annual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "annual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 12)",
        },
      ];

      // Contract Terms
      categories.contractTerms = [
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
    }

    // ELECTROSTATIC SPRAY
    if (service.serviceId === "electrostaticSpray") {
      const standardSprayPricing = getValue(["standardSprayPricing"]) || {};
      const tripChargesData = getValue(["tripCharges"]) || {};
      const freqMeta = getValue(["frequencyMetadata"]) || {};

      // Spray Rates
      categories.sprayRates = [
        {
          label: "Spray Rate Per Room",
          value: standardSprayPricing.sprayRatePerRoom ?? 0,
          path: ["standardSprayPricing", "sprayRatePerRoom"],
          unit: "$ per room",
          description: "Rate per room when pricing by room count (typically $20)",
        },
        {
          label: "Sq-ft Unit",
          value: standardSprayPricing.sqFtUnit ?? 0,
          path: ["standardSprayPricing", "sqFtUnit"],
          unit: "sq ft",
          description: "Square footage unit for pricing (typically 1000 sq ft)",
        },
        {
          label: "Spray Rate Per Sq-ft Unit",
          value: standardSprayPricing.sprayRatePerSqFtUnit ?? 0,
          path: ["standardSprayPricing", "sprayRatePerSqFtUnit"],
          unit: "$ per unit",
          description: "Rate per square footage unit (typically $50)",
        },
        {
          label: "Minimum Price Optional",
          value: standardSprayPricing.minimumPriceOptional ?? 0,
          path: ["standardSprayPricing", "minimumPriceOptional"],
          unit: "$",
          description: "Optional minimum price per visit",
        },
        {
          label: "Minimum Charge Per Visit",
          value: getValue(["minimumChargePerVisit"]) ?? 0,
          path: ["minimumChargePerVisit"],
          unit: "$",
          description: "Minimum charge per service visit (typically $50)",
        },
      ];

      // Trip Charges
      categories.sprayTripCharges = [
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
          description: "Trip charge for beltway locations",
        },
      ];

      // Frequency Conversions
      categories.sprayFrequencyConversions = [
        {
          label: "Weekly - Monthly Recurring Multiplier",
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Weekly to monthly conversion (typically 4.33)",
        },
        {
          label: "Weekly - First Month Extra Multiplier",
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 3.33)",
        },
        {
          label: "Biweekly - Monthly Recurring Multiplier",
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Biweekly to monthly conversion (typically 2.165)",
        },
        {
          label: "Biweekly - First Month Extra Multiplier",
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 1.165)",
        },
        {
          label: "Monthly - Cycle Months",
          value: freqMeta.monthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "monthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 1)",
        },
        {
          label: "Bimonthly - Cycle Months",
          value: freqMeta.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 2)",
        },
        {
          label: "Quarterly - Cycle Months",
          value: freqMeta.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 3)",
        },
        {
          label: "Biannual - Cycle Months",
          value: freqMeta.biannual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "biannual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 6)",
        },
        {
          label: "Annual - Cycle Months",
          value: freqMeta.annual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "annual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 12)",
        },
      ];

      // Contract Terms
      categories.contractTerms = [
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
    }

    // FOAMING DRAIN
    if (service.serviceId === "foamingDrain") {
      // Standard Rates
      const standardPricing = getValue(["standardPricing"]) || {};
      categories.standardRates = [
        {
          label: "Standard Drain Rate",
          value: standardPricing.standardDrainRate ?? 0,
          path: ["standardPricing", "standardDrainRate"],
          unit: "$ per drain",
          description: "Base rate per drain for standard foaming treatment",
        },
        {
          label: "Alternate Base Charge",
          value: standardPricing.alternateBaseCharge ?? 0,
          path: ["standardPricing", "alternateBaseCharge"],
          unit: "$",
          description: "Alternative pricing model - base charge",
        },
        {
          label: "Alternate Extra Per Drain",
          value: standardPricing.alternateExtraPerDrain ?? 0,
          path: ["standardPricing", "alternateExtraPerDrain"],
          unit: "$ per drain",
          description: "Alternative pricing model - additional charge per drain",
        },
        {
          label: "Minimum Charge Per Visit",
          value: getValue(["minimumChargePerVisit"]) ?? 0,
          path: ["minimumChargePerVisit"],
          unit: "$",
          description: "Minimum charge per service visit",
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
          label: "Weekly Rate Per Drain",
          value: volPricing.weeklyRatePerDrain ?? 0,
          path: ["volumePricing", "weeklyRatePerDrain"],
          unit: "$ per drain",
          description: "Discounted rate per drain for weekly service with volume pricing",
        },
        {
          label: "Bimonthly Rate Per Drain",
          value: volPricing.bimonthlyRatePerDrain ?? 0,
          path: ["volumePricing", "bimonthlyRatePerDrain"],
          unit: "$ per drain",
          description: "Discounted rate per drain for bimonthly service with volume pricing",
        },
      ];

      // Grease Trap
      const grease = getValue(["greaseTrapPricing"]) || {};
      categories.greaseTrap = [
        {
          label: "Weekly Rate Per Trap",
          value: grease.weeklyRatePerTrap ?? 0,
          path: ["greaseTrapPricing", "weeklyRatePerTrap"],
          unit: "$ per trap",
          description: "Weekly service rate for grease trap treatment",
        },
        {
          label: "Install Charge Per Trap",
          value: grease.installPerTrap ?? 0,
          path: ["greaseTrapPricing", "installPerTrap"],
          unit: "$",
          description: "One-time installation charge for grease trap service",
        },
      ];

      // Green Drain
      const green = getValue(["greenDrainPricing"]) || {};
      categories.greenDrain = [
        {
          label: "Install Per Drain",
          value: green.installPerDrain ?? 0,
          path: ["greenDrainPricing", "installPerDrain"],
          unit: "$",
          description: "One-time installation charge for green drain service",
        },
        {
          label: "Weekly Rate Per Drain",
          value: green.weeklyRatePerDrain ?? 0,
          path: ["greenDrainPricing", "weeklyRatePerDrain"],
          unit: "$ per drain",
          description: "Weekly service rate for eco-friendly green drain treatment",
        },
      ];

      // Add-ons & Multipliers
      const addOns = getValue(["addOns"]) || {};
      const installMults = getValue(["installationMultipliers"]) || {};
      categories.addonsMultipliers = [
        {
          label: "Plumbing Weekly Addon Per Drain",
          value: addOns.plumbingWeeklyAddonPerDrain ?? 0,
          path: ["addOns", "plumbingWeeklyAddonPerDrain"],
          unit: "$ per drain",
          description: "Additional weekly charge per drain for plumbing addon service",
        },
        {
          label: "Filthy Installation Multiplier",
          value: installMults.filthyMultiplier ?? 0,
          path: ["installationMultipliers", "filthyMultiplier"],
          unit: "×",
          description: "Multiply rate by this for heavily clogged/filthy drains (typically 3x)",
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

      // Billing Conversions (Frequency Metadata)
      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.billingConversions = [
        {
          label: "Weekly - Monthly Recurring Multiplier",
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply weekly rate to get monthly billing (typically 4.33)",
        },
        {
          label: "Weekly - First Month Extra Multiplier",
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 3.33)",
        },
        {
          label: "Biweekly - Monthly Recurring Multiplier",
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply biweekly rate to get monthly billing (typically 2.165)",
        },
        {
          label: "Biweekly - First Month Extra Multiplier",
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 1.165)",
        },
        {
          label: "Bimonthly - Cycle Months",
          value: freqMeta.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 2)",
        },
        {
          label: "Quarterly - Cycle Months",
          value: freqMeta.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 3)",
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
          description: "Minimum contract duration required (typically 2 months)",
        },
        {
          label: "Maximum Contract Months",
          value: contract.maxMonths ?? 0,
          path: ["contract", "maxMonths"],
          unit: "months",
          description: "Maximum contract duration allowed (typically 36 months)",
        },
        {
          label: "Default Contract Months",
          value: contract.defaultMonths ?? 0,
          path: ["contract", "defaultMonths"],
          unit: "months",
          description: "Default contract duration if not specified (typically 36 months)",
        },
      ];
    }

    // MICROFIBER MOPPING
    if (service.serviceId === "microfiberMopping") {
      // Basic Rates (Bathroom Mopping)
      const bathroomPricing = getValue(["bathroomMoppingPricing"]) || {};
      categories.basicRates = [
        {
          label: "Flat Price Per Bathroom",
          value: bathroomPricing.flatPricePerBathroom ?? 0,
          path: ["bathroomMoppingPricing", "flatPricePerBathroom"],
          unit: "$ per bathroom",
          description: "Base rate per bathroom included with SaniClean service",
        },
        {
          label: "Minimum Charge Per Visit",
          value: getValue(["minimumChargePerVisit"]) ?? 0,
          path: ["minimumChargePerVisit"],
          unit: "$",
          description: "Minimum charge per service visit",
        },
      ];

      // Huge Bathrooms
      categories.hugeBathrooms = [
        {
          label: "Huge Bathroom Sq-ft Unit",
          value: bathroomPricing.hugeBathroomSqFtUnit ?? 0,
          path: ["bathroomMoppingPricing", "hugeBathroomSqFtUnit"],
          unit: "sq ft",
          description: "Square footage threshold for huge bathrooms (typically 300 sq ft)",
        },
        {
          label: "Huge Bathroom Rate",
          value: bathroomPricing.hugeBathroomRate ?? 0,
          path: ["bathroomMoppingPricing", "hugeBathroomRate"],
          unit: "$ per unit",
          description: "Rate per unit for bathrooms exceeding standard size",
        },
      ];

      // Extra Areas (Non-Bathroom Add-On Areas)
      const extraArea = getValue(["nonBathroomAddonAreas"]) || {};
      categories.extraAreas = [
        {
          label: "Flat Price Single Large Area",
          value: extraArea.flatPriceSingleLargeArea ?? 0,
          path: ["nonBathroomAddonAreas", "flatPriceSingleLargeArea"],
          unit: "$",
          description: "Flat rate for a single large extra area (e.g., lobby, hallway)",
        },
        {
          label: "Sq-ft Unit",
          value: extraArea.sqFtUnit ?? 0,
          path: ["nonBathroomAddonAreas", "sqFtUnit"],
          unit: "sq ft",
          description: "Square footage unit for extra areas pricing (typically 400 sq ft)",
        },
        {
          label: "Rate Per Sq-ft Unit",
          value: extraArea.ratePerSqFtUnit ?? 0,
          path: ["nonBathroomAddonAreas", "ratePerSqFtUnit"],
          unit: "$ per unit",
          description: "Rate per square footage unit for extra areas",
        },
        {
          label: "Use Higher Rate",
          value: extraArea.useHigherRate ? 1 : 0,
          path: ["nonBathroomAddonAreas", "useHigherRate"],
          unit: "boolean",
          description: "Use the higher of flat rate or per-unit calculation",
        },
      ];

      // Standalone Pricing
      const standalone = getValue(["standaloneMoppingPricing"]) || {};
      const tripCharges = getValue(["tripCharges"]) || {};
      categories.standalonePricing = [
        {
          label: "Sq-ft Unit",
          value: standalone.sqFtUnit ?? 0,
          path: ["standaloneMoppingPricing", "sqFtUnit"],
          unit: "sq ft",
          description: "Square footage unit for standalone pricing (typically 200 sq ft)",
        },
        {
          label: "Rate Per Sq-ft Unit",
          value: standalone.ratePerSqFtUnit ?? 0,
          path: ["standaloneMoppingPricing", "ratePerSqFtUnit"],
          unit: "$ per unit",
          description: "Rate per unit when purchased as a standalone service",
        },
        {
          label: "Minimum Price",
          value: standalone.minimumPrice ?? 0,
          path: ["standaloneMoppingPricing", "minimumPrice"],
          unit: "$",
          description: "Minimum charge for standalone microfiber mopping service",
        },
        {
          label: "Include Trip Charge",
          value: standalone.includeTripCharge ? 1 : 0,
          path: ["standaloneMoppingPricing", "includeTripCharge"],
          unit: "boolean",
          description: "Whether to include trip charge in standalone pricing",
        },
        {
          label: "Standard Trip Charge",
          value: tripCharges.standard ?? 0,
          path: ["tripCharges", "standard"],
          unit: "$",
          description: "Standard trip charge amount",
        },
        {
          label: "Beltway Trip Charge",
          value: tripCharges.beltway ?? 0,
          path: ["tripCharges", "beltway"],
          unit: "$",
          description: "Beltway area trip charge amount",
        },
      ];

      // Frequency Metadata (Billing Conversions)
      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.moppingMetadata = [
        {
          label: "Weekly - Monthly Recurring Multiplier",
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply weekly rate to get monthly billing (typically 4.33)",
        },
        {
          label: "Weekly - First Month Extra Multiplier",
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 3.33)",
        },
        {
          label: "Biweekly - Monthly Recurring Multiplier",
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply biweekly rate to get monthly billing (typically 2.165)",
        },
        {
          label: "Biweekly - First Month Extra Multiplier",
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 1.165)",
        },
        {
          label: "Monthly - Cycle Months",
          value: freqMeta.monthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "monthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 1)",
        },
        {
          label: "Bimonthly - Cycle Months",
          value: freqMeta.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 2)",
        },
        {
          label: "Quarterly - Cycle Months",
          value: freqMeta.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 3)",
        },
        {
          label: "Biannual - Cycle Months",
          value: freqMeta.biannual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "biannual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 6)",
        },
        {
          label: "Annual - Cycle Months",
          value: freqMeta.annual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "annual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 12)",
        },
      ];

      // Contract Terms
      categories.contractTerms = [
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
    }

    // PURE JANITORIAL - ACTUAL DATABASE STRUCTURE
    if (service.serviceId === "pureJanitorial") {
      // Base Rates (Standard Hourly Pricing)
      const standardHourly = getValue(["standardHourlyPricing"]) || {};
      categories.baseRates = [
        {
          label: "Standard Hourly Rate",
          value: standardHourly.standardHourlyRate ?? 0,
          path: ["standardHourlyPricing", "standardHourlyRate"],
          unit: "$ per hour",
          description: "Standard hourly rate for janitorial services (typically $30/hour)",
        },
        {
          label: "Minimum Hours Per Trip",
          value: standardHourly.minimumHoursPerTrip ?? 0,
          path: ["standardHourlyPricing", "minimumHoursPerTrip"],
          unit: "hours",
          description: "Minimum billable hours required per service visit (typically 4 hours minimum)",
        },
      ];

      // Short Job Pricing
      const shortJobPricing = getValue(["shortJobHourlyPricing"]) || {};
      categories.shortJobPricing = [
        {
          label: "Short Job Hourly Rate",
          value: shortJobPricing.shortJobHourlyRate ?? 0,
          path: ["shortJobHourlyPricing", "shortJobHourlyRate"],
          unit: "$ per hour",
          description: "Premium hourly rate for jobs under minimum hours (typically $50/hour)",
        },
      ];

      // Service Multipliers (from Dusting config)
      const dustingData = getValue(["dusting"]) || {};
      categories.serviceMultipliers = [
        {
          label: "Dirty First Time Multiplier",
          value: dustingData.dirtyFirstTimeMultiplier ?? 0,
          path: ["dusting", "dirtyFirstTimeMultiplier"],
          unit: "×",
          description: "Multiplier for first-time dirty/heavily soiled facilities (typically 3x dusting time)",
        },
        {
          label: "Infrequent Service Multiplier (4x/year)",
          value: dustingData.infrequentServiceMultiplier4PerYear ?? 0,
          path: ["dusting", "infrequentServiceMultiplier4PerYear"],
          unit: "×",
          description: "Multiplier for infrequent service like quarterly (typically 3x dusting time)",
        },
      ];

      // Monthly Conversions (Frequency Metadata)
      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.monthlyConversions = [
        {
          label: "Weekly - Monthly Recurring Multiplier",
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply weekly rate to get monthly billing (typically 4.33)",
        },
        {
          label: "Weekly - First Month Extra Multiplier",
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 3.33)",
        },
        {
          label: "Biweekly - Monthly Recurring Multiplier",
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply biweekly rate to get monthly billing (typically 2.165)",
        },
        {
          label: "Biweekly - First Month Extra Multiplier",
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 1.165)",
        },
        {
          label: "Bimonthly - Cycle Months",
          value: freqMeta.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 2)",
        },
        {
          label: "Quarterly - Cycle Months",
          value: freqMeta.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 3)",
        },
        {
          label: "Biannual - Cycle Months",
          value: freqMeta.biannual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "biannual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 6)",
        },
        {
          label: "Annual - Cycle Months",
          value: freqMeta.annual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "annual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 12)",
        },
      ];

      // Contract Settings
      const contract = getValue(["contract"]) || {};
      categories.contractSettings = [
        {
          label: "Minimum Contract Months",
          value: contract.minMonths ?? 0,
          path: ["contract", "minMonths"],
          unit: "months",
          description: "Minimum contract duration required (typically 2 months)",
        },
        {
          label: "Maximum Contract Months",
          value: contract.maxMonths ?? 0,
          path: ["contract", "maxMonths"],
          unit: "months",
          description: "Maximum contract duration allowed (typically 36 months)",
        },
      ];

      // Dusting & Vacuuming
      const vacuumingData = getValue(["vacuuming"]) || {};
      categories.dustingVacuuming = [
        {
          label: "Dusting Items Per Hour",
          value: dustingData.itemsPerHour ?? 0,
          path: ["dusting", "itemsPerHour"],
          unit: "items/hour",
          description: "Number of dusting items that can be cleaned per hour (typically 30)",
        },
        {
          label: "Dusting Price Per Item",
          value: dustingData.pricePerItem ?? 0,
          path: ["dusting", "pricePerItem"],
          unit: "$ per item",
          description: "Price per individual dusting item (typically $1)",
        },
        {
          label: "Vacuuming Estimated Time Per Job",
          value: vacuumingData.estimatedTimeHoursPerJob ?? 0,
          path: ["vacuuming", "estimatedTimeHoursPerJob"],
          unit: "hours",
          description: "Estimated hours per vacuuming job (typically 1 hour)",
        },
        {
          label: "Vacuuming Large Job Minimum Time",
          value: vacuumingData.largeJobMinimumTimeHours ?? 0,
          path: ["vacuuming", "largeJobMinimumTimeHours"],
          unit: "hours",
          description: "Minimum hours for large vacuuming jobs (typically 1 hour)",
        },
      ];

      // Rate Tiers - REMOVED (not in database)
      categories.rateTiers = [];

      // Smooth Breakdown Pricing Table
      const smoothBreakdown = getValue(["smoothBreakdownPricingTable"]) || [];
      console.log("🔍 [DEBUG] Pure Janitorial smoothBreakdown data:", smoothBreakdown);
      categories.smoothBreakdown = smoothBreakdown.map((row: any, index: number) => {
        console.log(`🔍 [DEBUG] Row ${index}:`, row);
        console.log(`🔍 [DEBUG] standalonePrice:`, row.standalonePrice);
        const description = `${row.description || ""} - ${row.addonOnly ? "Add-on only" : "Standalone"}${row.standalonePrice ? ` (Standalone: $${row.standalonePrice})` : ""}`;
        console.log(`🔍 [DEBUG] Final description:`, description);
        return {
          label: row.description || `Tier ${index + 1}`,
          value: row.price || row.ratePerHour || 0,
          path: ["smoothBreakdownPricingTable", index.toString(), row.price !== undefined ? "price" : "ratePerHour"],
          unit: row.upToMinutes !== undefined ? `up to ${row.upToMinutes} min` : (row.upToHours !== undefined ? `up to ${row.upToHours} hrs` : ""),
          description: description,
        };
      });
    }

    // SANICLEAN - ACTUAL DATABASE STRUCTURE
    if (service.serviceId === "saniclean") {
      // Inside Beltway (Standard A La Carte)
      const insideBeltway = getValue(["standardALaCartePricing", "insideBeltway"]) || {};
      categories.insideBeltway = [
        {
          label: "Price Per Fixture",
          value: insideBeltway.pricePerFixture ?? 0,
          path: ["standardALaCartePricing", "insideBeltway", "pricePerFixture"],
          unit: "$ per fixture",
          description: "Standard a la carte rate per fixture for inside beltway locations (typically $7)",
        },
        {
          label: "Minimum Price",
          value: insideBeltway.minimumPrice ?? 0,
          path: ["standardALaCartePricing", "insideBeltway", "minimumPrice"],
          unit: "$",
          description: "Minimum charge for inside beltway locations (typically $40)",
        },
        {
          label: "Trip Charge",
          value: insideBeltway.tripCharge ?? 0,
          path: ["standardALaCartePricing", "insideBeltway", "tripCharge"],
          unit: "$",
          description: "Trip charge for inside beltway locations (typically $8)",
        },
        {
          label: "Parking Fee Add-On",
          value: insideBeltway.parkingFeeAddOn ?? 0,
          path: ["standardALaCartePricing", "insideBeltway", "parkingFeeAddOn"],
          unit: "$",
          description: "Additional parking fee for paid parking locations (typically $15)",
        },
      ];

      // Outside Beltway (Standard A La Carte)
      const outsideBeltway = getValue(["standardALaCartePricing", "outsideBeltway"]) || {};
      categories.outsideBeltway = [
        {
          label: "Price Per Fixture",
          value: outsideBeltway.pricePerFixture ?? 0,
          path: ["standardALaCartePricing", "outsideBeltway", "pricePerFixture"],
          unit: "$ per fixture",
          description: "Standard a la carte rate per fixture for outside beltway locations (typically $6)",
        },
        {
          label: "Trip Charge",
          value: outsideBeltway.tripCharge ?? 0,
          path: ["standardALaCartePricing", "outsideBeltway", "tripCharge"],
          unit: "$",
          description: "Trip charge for outside beltway locations (typically $0)",
        },
      ];

      // All-Inclusive Pricing
      const allInclusive = getValue(["allInclusivePricing"]) || {};
      categories.allInclusive = [
        {
          label: "Price Per Fixture",
          value: allInclusive.pricePerFixture ?? 0,
          path: ["allInclusivePricing", "pricePerFixture"],
          unit: "$ per fixture",
          description: "All-inclusive package rate per fixture (typically $12)",
        },
        {
          label: "Auto All-Inclusive Minimum Fixtures",
          value: allInclusive.autoAllInclusiveMinFixtures ?? 0,
          path: ["allInclusivePricing", "autoAllInclusiveMinFixtures"],
          unit: "fixtures",
          description: "Minimum fixtures to auto-qualify for all-inclusive pricing (typically 25)",
        },
      ];

      // Small Bathroom Minimums
      const smallBathroom = getValue(["smallBathroomMinimums"]) || {};
      categories.smallFacility = [
        {
          label: "Minimum Fixtures Threshold",
          value: smallBathroom.minimumFixturesThreshold ?? 0,
          path: ["smallBathroomMinimums", "minimumFixturesThreshold"],
          unit: "fixtures",
          description: "Maximum fixtures to qualify as small facility (typically 6)",
        },
        {
          label: "Minimum Price Under Threshold",
          value: smallBathroom.minimumPriceUnderThreshold ?? 0,
          path: ["smallBathroomMinimums", "minimumPriceUnderThreshold"],
          unit: "$",
          description: "Minimum charge for small facilities under threshold (typically $48)",
        },
      ];

      // Soap Upgrades
      const soapUpgrades = getValue(["soapUpgrades"]) || {};
      const excessCharges = soapUpgrades.excessUsageCharges || {};
      categories.soapUpgrades = [
        {
          label: "Standard to Luxury Per Dispenser Per Week",
          value: soapUpgrades.standardToLuxuryPerDispenserPerWeek ?? 0,
          path: ["soapUpgrades", "standardToLuxuryPerDispenserPerWeek"],
          unit: "$ per dispenser per week",
          description: "Upgrade charge from standard to luxury soap per dispenser per week (typically $0.50)",
        },
        {
          label: "Excess Standard Soap Per Gallon",
          value: excessCharges.standardSoapPerGallon ?? 0,
          path: ["soapUpgrades", "excessUsageCharges", "standardSoapPerGallon"],
          unit: "$ per gallon",
          description: "Charge for excessive standard soap usage per gallon (typically $45)",
        },
        {
          label: "Excess Luxury Soap Per Gallon",
          value: excessCharges.luxurySoapPerGallon ?? 0,
          path: ["soapUpgrades", "excessUsageCharges", "luxurySoapPerGallon"],
          unit: "$ per gallon",
          description: "Charge for excessive luxury soap usage per gallon (typically $75)",
        },
      ];

      // Warranty Fees & Paper Credits
      const warrantyFees = getValue(["warrantyFees"]) || {};
      const paperCredit = getValue(["paperCredit"]) || {};
      categories.warrantyCredits = [
        {
          label: "Air Freshener Dispenser Warranty Fee Per Week",
          value: warrantyFees.airFreshenerDispenserWarrantyFeePerWeek ?? 0,
          path: ["warrantyFees", "airFreshenerDispenserWarrantyFeePerWeek"],
          unit: "$ per week",
          description: "Weekly warranty fee per air freshener dispenser (typically $1.25)",
        },
        {
          label: "Soap Dispenser Warranty Fee Per Week",
          value: warrantyFees.soapDispenserWarrantyFeePerWeek ?? 0,
          path: ["warrantyFees", "soapDispenserWarrantyFeePerWeek"],
          unit: "$ per week",
          description: "Weekly warranty fee per soap dispenser (typically $0.50)",
        },
        {
          label: "Paper Credit Per Fixture Per Week",
          value: paperCredit.creditPerFixturePerWeek ?? 0,
          path: ["paperCredit", "creditPerFixturePerWeek"],
          unit: "$",
          description: "Credit applied per fixture per week for paper products (typically $1)",
        },
      ];

      // Billing Conversions (Frequency Metadata)
      const freqMetadata = getValue(["frequencyMetadata"]) || {};
      categories.sanicleanBillingConversions = [
        {
          label: "Weekly - Monthly Recurring Multiplier",
          value: freqMetadata.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply weekly rate by this to get monthly billing (typically 4.33)",
        },
        {
          label: "Weekly - First Month Extra Multiplier",
          value: freqMetadata.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 3.33)",
        },
        {
          label: "Biweekly - Monthly Recurring Multiplier",
          value: freqMetadata.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply biweekly rate to get monthly billing (typically 2.165)",
        },
        {
          label: "Biweekly - First Month Extra Multiplier",
          value: freqMetadata.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 1.165)",
        },
        {
          label: "Monthly - Cycle Months",
          value: freqMetadata.monthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "monthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 1)",
        },
        {
          label: "Bimonthly - Cycle Months",
          value: freqMetadata.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 2)",
        },
        {
          label: "Quarterly - Cycle Months",
          value: freqMetadata.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 3)",
        },
        {
          label: "Biannual - Cycle Months",
          value: freqMetadata.biannual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "biannual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 6)",
        },
        {
          label: "Annual - Cycle Months",
          value: freqMetadata.annual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "annual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 12)",
        },
      ];

      // Rate Tiers
      const rateCategories = getValue(["rateCategories"]) || {};
      categories.sanicleanRateTiers = [
        {
          label: "Red Rate Multiplier",
          value: rateCategories.redRate?.multiplier ?? 0,
          path: ["rateCategories", "redRate", "multiplier"],
          unit: "×",
          description: "Standard rate multiplier (typically 1.0)",
        },
        {
          label: "Red Rate Commission",
          value: parseFloat(rateCategories.redRate?.commissionRate?.replace('%', '') || '0'),
          path: ["rateCategories", "redRate", "commissionRate"],
          unit: "%",
          description: "Commission rate for Red Rate tier (typically 20%)",
        },
        {
          label: "Green Rate Multiplier",
          value: rateCategories.greenRate?.multiplier ?? 0,
          path: ["rateCategories", "greenRate", "multiplier"],
          unit: "×",
          description: "Premium rate multiplier (typically 1.3 = 30% higher)",
        },
        {
          label: "Green Rate Commission",
          value: parseFloat(rateCategories.greenRate?.commissionRate?.replace('%', '') || '0'),
          path: ["rateCategories", "greenRate", "commissionRate"],
          unit: "%",
          description: "Commission rate for Green Rate tier (typically 25%)",
        },
      ];

      // Included Items
      const includedItemsData = getValue(["includedItems"]) || {};
      categories.includedItems = [
        {
          label: "Electrostatic Spray Included",
          value: includedItemsData.electrostaticSprayIncluded ? 1 : 0,
          path: ["includedItems", "electrostaticSprayIncluded"],
          unit: "boolean",
          description: "Whether electrostatic spray service is included in the package",
        },
        {
          label: "Included Weekly Refills Default",
          value: includedItemsData.includedWeeklyRefillsDefault ?? 0,
          path: ["includedItems", "includedWeeklyRefillsDefault"],
          unit: "refills",
          description: "Default number of weekly refills included (typically 1)",
        },
      ];

      // Monthly Add-Ons
      const monthlyAddOns = getValue(["monthlyAddOnSupplyPricing"]) || {};
      categories.monthlyAddOns = [
        {
          label: "Urinal Mat Monthly Price",
          value: monthlyAddOns.urinalMatMonthlyPrice ?? 0,
          path: ["monthlyAddOnSupplyPricing", "urinalMatMonthlyPrice"],
          unit: "$ per month",
          description: "Monthly charge for urinal mat supply (typically $16)",
        },
        {
          label: "Urinal Screen Monthly Price",
          value: monthlyAddOns.urinalScreenMonthlyPrice === "included" ? 0 : (monthlyAddOns.urinalScreenMonthlyPrice ?? 0),
          path: ["monthlyAddOnSupplyPricing", "urinalScreenMonthlyPrice"],
          unit: monthlyAddOns.urinalScreenMonthlyPrice === "included" ? "included" : "$ per month",
          description: "Monthly charge for urinal screen (typically included)",
        },
        {
          label: "Toilet Clip Monthly Price",
          value: monthlyAddOns.toiletClipMonthlyPrice ?? 0,
          path: ["monthlyAddOnSupplyPricing", "toiletClipMonthlyPrice"],
          unit: "$ per month",
          description: "Monthly charge for toilet clip supply (typically $4)",
        },
        {
          label: "Toilet Seat Cover Dispenser Monthly Price",
          value: monthlyAddOns.toiletSeatCoverDispenserMonthlyPrice === "included" ? 0 : (monthlyAddOns.toiletSeatCoverDispenserMonthlyPrice ?? 0),
          path: ["monthlyAddOnSupplyPricing", "toiletSeatCoverDispenserMonthlyPrice"],
          unit: monthlyAddOns.toiletSeatCoverDispenserMonthlyPrice === "included" ? "included" : "$ per month",
          description: "Monthly charge for toilet seat cover dispenser (typically included)",
        },
        {
          label: "SaniPod Monthly Price Per Pod",
          value: monthlyAddOns.sanipodMonthlyPricePerPod ?? 0,
          path: ["monthlyAddOnSupplyPricing", "sanipodMonthlyPricePerPod"],
          unit: "$ per month",
          description: "Monthly charge per SaniPod unit (typically $12)",
        },
      ];

      // Microfiber Mopping Addon
      const microfiberMopping = getValue(["microfiberMoppingIncludedWithSaniClean"]) || {};
      categories.microfiberMoppingAddon = [
        {
          label: "Price Per Bathroom",
          value: microfiberMopping.pricePerBathroom ?? 0,
          path: ["microfiberMoppingIncludedWithSaniClean", "pricePerBathroom"],
          unit: "$ per bathroom",
          description: "Microfiber mopping charge per bathroom when bundled with SaniClean (typically $10)",
        },
        {
          label: "Huge Bathroom Sq-ft Unit",
          value: microfiberMopping.hugeBathroomSqFtUnit ?? 0,
          path: ["microfiberMoppingIncludedWithSaniClean", "hugeBathroomSqFtUnit"],
          unit: "sq ft",
          description: "Square footage threshold for huge bathrooms (typically 300 sq ft)",
        },
        {
          label: "Huge Bathroom Rate",
          value: microfiberMopping.hugeBathroomRate ?? 0,
          path: ["microfiberMoppingIncludedWithSaniClean", "hugeBathroomRate"],
          unit: "$ per unit",
          description: "Additional rate per unit for bathrooms exceeding standard size (typically $10)",
        },
      ];

      // Contract Terms
      categories.contractTerms = [
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
    }

    // SANIPOD - ACTUAL DATABASE STRUCTURE
    if (service.serviceId === "sanipod") {
      // Core Pricing (Included with SaniClean)
      const corePricing = getValue(["corePricingIncludedWithSaniClean"]) || {};
      categories.podRates = [
        {
          label: "Core - Weekly Price Per Unit",
          value: corePricing.weeklyPricePerUnit ?? 0,
          path: ["corePricingIncludedWithSaniClean", "weeklyPricePerUnit"],
          unit: "$ per pod",
          description: "Base weekly rate per pod when included with SaniClean (typically $3)",
        },
        {
          label: "Core - Install Price Per Unit",
          value: corePricing.installPricePerUnit ?? 0,
          path: ["corePricingIncludedWithSaniClean", "installPricePerUnit"],
          unit: "$ per pod",
          description: "One-time installation charge per pod (typically $25)",
        },
        {
          label: "Core - Included Weekly Refills",
          value: corePricing.includedWeeklyRefills ?? 0,
          path: ["corePricingIncludedWithSaniClean", "includedWeeklyRefills"],
          unit: "refills",
          description: "Number of weekly refills included in base price (typically 1)",
        },
      ];

      // Extra Bags
      const extraBagPricing = getValue(["extraBagPricing"]) || {};
      categories.extraBags = [
        {
          label: "Price Per Bag",
          value: extraBagPricing.pricePerBag ?? 0,
          path: ["extraBagPricing", "pricePerBag"],
          unit: "$ per bag",
          description: "Price per additional waste bag beyond included refills (typically $2/bag)",
        },
      ];

      // Standalone Pricing (Without SaniClean)
      const standalonePricing = getValue(["standalonePricingWithoutSaniClean"]) || {};
      categories.standaloneService = [
        {
          label: "Standalone - Price Per Unit Per Week (Option A)",
          value: standalonePricing.pricePerUnitPerWeek ?? 0,
          path: ["standalonePricingWithoutSaniClean", "pricePerUnitPerWeek"],
          unit: "$ per pod",
          description: "Flat rate per pod per week for standalone service (typically $8/pod)",
        },
        {
          label: "Standalone - Alternate Price Per Unit Per Week (Option B)",
          value: standalonePricing.alternatePricePerUnitPerWeek ?? 0,
          path: ["standalonePricingWithoutSaniClean", "alternatePricePerUnitPerWeek"],
          unit: "$ per pod",
          description: "Alternative pricing: per-pod rate in $3+$40 model (typically $3/pod)",
        },
        {
          label: "Standalone - Weekly Minimum Price",
          value: standalonePricing.weeklyMinimumPrice ?? 0,
          path: ["standalonePricingWithoutSaniClean", "weeklyMinimumPrice"],
          unit: "$",
          description: "Account-level base charge for standalone service (typically $40/week)",
        },
      ];

      // NOTE: Installation moved to podRates category as it's part of corePricingIncludedWithSaniClean
      categories.installation = [];

      // Frequency Settings
      const freqSchedules = getValue(["frequencySchedules"]) || {};
      categories.frequencySettings = [
        {
          label: "Weekly - Visits Per Year",
          value: freqSchedules.weekly?.visitsPerYear ?? 0,
          path: ["frequencySchedules", "weekly", "visitsPerYear"],
          unit: "visits/year",
          description: "Number of weekly service visits per year (typically 52)",
        },
        {
          label: "Biweekly - Visits Per Year",
          value: freqSchedules.biweekly?.visitsPerYear ?? 0,
          path: ["frequencySchedules", "biweekly", "visitsPerYear"],
          unit: "visits/year",
          description: "Number of biweekly service visits per year (typically 26)",
        },
        {
          label: "Monthly - Visits Per Year",
          value: freqSchedules.monthly?.visitsPerYear ?? 0,
          path: ["frequencySchedules", "monthly", "visitsPerYear"],
          unit: "visits/year",
          description: "Number of monthly service visits per year (typically 12)",
        },
      ];

      // Billing Conversions (Frequency Metadata)
      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.sanipodBillingConversions = [
        {
          label: "Weekly - Monthly Recurring Multiplier",
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply weekly rate to get monthly billing (typically 4.33 = 52/12)",
        },
        {
          label: "Weekly - First Month Extra Multiplier",
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 3.33)",
        },
        {
          label: "Biweekly - Monthly Recurring Multiplier",
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply biweekly rate to get monthly billing (typically 2.165 = 26/12)",
        },
        {
          label: "Biweekly - First Month Extra Multiplier",
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 1.165)",
        },
        {
          label: "Monthly - Cycle Months",
          value: freqMeta.monthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "monthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 1)",
        },
        {
          label: "Bimonthly - Cycle Months",
          value: freqMeta.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 2)",
        },
        {
          label: "Quarterly - Cycle Months",
          value: freqMeta.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 3)",
        },
        {
          label: "Biannual - Cycle Months",
          value: freqMeta.biannual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "biannual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 6)",
        },
        {
          label: "Annual - Cycle Months",
          value: freqMeta.annual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "annual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 12)",
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
          label: "Red Rate Commission",
          value: parseFloat(rateCategories.redRate?.commissionRate?.replace('%', '') || '0'),
          path: ["rateCategories", "redRate", "commissionRate"],
          unit: "%",
          description: "Commission rate for Red Rate tier (typically 20%)",
        },
        {
          label: "Green Rate Multiplier",
          value: rateCategories.greenRate?.multiplier ?? 0,
          path: ["rateCategories", "greenRate", "multiplier"],
          unit: "×",
          description: "Premium rate multiplier (typically 1.3 = 30% higher)",
        },
        {
          label: "Green Rate Commission",
          value: parseFloat(rateCategories.greenRate?.commissionRate?.replace('%', '') || '0'),
          path: ["rateCategories", "greenRate", "commissionRate"],
          unit: "%",
          description: "Commission rate for Green Rate tier (typically 25%)",
        },
      ];
    }

    // SANISCRUB - ACTUAL DATABASE STRUCTURE
    if (service.serviceId === "saniscrub") {
      // Monthly Pricing
      const monthlyPricing = getValue(["monthlyPricing"]) || {};
      categories.fixtureRates = [
        {
          label: "Monthly - Price Per Fixture",
          value: monthlyPricing.pricePerFixture ?? 0,
          path: ["monthlyPricing", "pricePerFixture"],
          unit: "$ per fixture",
          description: "Monthly rate per bathroom fixture (typically $25)",
        },
        {
          label: "Monthly - Minimum Price",
          value: monthlyPricing.minimumPrice ?? 0,
          path: ["monthlyPricing", "minimumPrice"],
          unit: "$",
          description: "Minimum monthly charge (typically $175)",
        },
      ];

      // Bimonthly & Quarterly Pricing
      const bimonthlyPricing = getValue(["bimonthlyPricing"]) || {};
      const quarterlyPricing = getValue(["quarterlyPricing"]) || {};
      const twicePerMonthPricing = getValue(["twicePerMonthPricing"]) || {};
      categories.saniscrubMinimums = [
        {
          label: "Bimonthly - Price Per Fixture",
          value: bimonthlyPricing.pricePerFixture ?? 0,
          path: ["bimonthlyPricing", "pricePerFixture"],
          unit: "$ per fixture",
          description: "Bimonthly rate per fixture (typically $35)",
        },
        {
          label: "Bimonthly - Minimum Price",
          value: bimonthlyPricing.minimumPrice ?? 0,
          path: ["bimonthlyPricing", "minimumPrice"],
          unit: "$",
          description: "Minimum bimonthly charge (typically $250)",
        },
        {
          label: "Quarterly - Price Per Fixture",
          value: quarterlyPricing.pricePerFixture ?? 0,
          path: ["quarterlyPricing", "pricePerFixture"],
          unit: "$ per fixture",
          description: "Quarterly rate per fixture (typically $40)",
        },
        {
          label: "Quarterly - Minimum Price",
          value: quarterlyPricing.minimumPrice ?? 0,
          path: ["quarterlyPricing", "minimumPrice"],
          unit: "$",
          description: "Minimum quarterly charge (typically $250)",
        },
        {
          label: "Twice Per Month - Discount",
          value: twicePerMonthPricing.discountFromMonthlyRate ?? 0,
          path: ["twicePerMonthPricing", "discountFromMonthlyRate"],
          unit: "$",
          description: "Discount applied to twice-monthly service (typically $15)",
        },
      ];

      // Non-Bathroom Pricing
      const nonBathroomRule = getValue(["nonBathroomSqFtPricingRule"]) || {};
      categories.nonBathroomPricing = [
        {
          label: "Sq Ft Block Unit",
          value: nonBathroomRule.sqFtBlockUnit ?? 0,
          path: ["nonBathroomSqFtPricingRule", "sqFtBlockUnit"],
          unit: "sq ft",
          description: "Square footage per pricing block (typically 500 sq ft)",
        },
        {
          label: "Price First Block",
          value: nonBathroomRule.priceFirstBlock ?? 0,
          path: ["nonBathroomSqFtPricingRule", "priceFirstBlock"],
          unit: "$",
          description: "Price for the first block (typically $250)",
        },
        {
          label: "Price Additional Block",
          value: nonBathroomRule.priceAdditionalBlock ?? 0,
          path: ["nonBathroomSqFtPricingRule", "priceAdditionalBlock"],
          unit: "$",
          description: "Price per additional block (typically $125)",
        },
      ];

      // Install Multipliers
      const installPricing = getValue(["installationPricing"]) || {};
      categories.saniscrubInstallMultipliers = [
        {
          label: "Dirty/First Time Multiplier",
          value: installPricing.installMultiplierDirtyOrFirstTime ?? 0,
          path: ["installationPricing", "installMultiplierDirtyOrFirstTime"],
          unit: "×",
          description: "Multiply base by this for dirty/first-time installs (typically 3x)",
        },
      ];

      // Service Frequencies
      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.serviceFrequencies = [
        {
          label: "Weekly - Monthly Recurring Multiplier",
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Weekly to monthly conversion (typically 4.33)",
        },
        {
          label: "Weekly - First Month Extra Multiplier",
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 3.33)",
        },
        {
          label: "Biweekly - Monthly Recurring Multiplier",
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Biweekly to monthly conversion (typically 2.165)",
        },
        {
          label: "Biweekly - First Month Extra Multiplier",
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 1.165)",
        },
        {
          label: "Monthly - Cycle Months",
          value: freqMeta.monthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "monthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 1)",
        },
        {
          label: "Bimonthly - Cycle Months",
          value: freqMeta.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 2)",
        },
        {
          label: "Quarterly - Cycle Months",
          value: freqMeta.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 3)",
        },
      ];

      // Discounts & Fees
      const tripChargesData = getValue(["tripCharges"]) || {};
      categories.discountsAndFees = [
        {
          label: "Trip Charge - Standard",
          value: tripChargesData.standard ?? 0,
          path: ["tripCharges", "standard"],
          unit: "$",
          description: "Standard trip charge (typically $8)",
        },
        {
          label: "Trip Charge - Beltway",
          value: tripChargesData.beltway ?? 0,
          path: ["tripCharges", "beltway"],
          unit: "$",
          description: "Beltway trip charge (typically $8)",
        },
        {
          label: "Parking Fee Add-On",
          value: getValue(["parkingFeeAddOn"]) ?? 0,
          path: ["parkingFeeAddOn"],
          unit: "$",
          description: "Additional parking fee (typically $0)",
        },
      ];

      // Contract Terms
      categories.contractTerms = [
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

      // Billing Conversions (Frequency Metadata)
      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.stripWaxBillingConversions = [
        {
          label: "Weekly - Monthly Recurring Multiplier",
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply weekly rate to get monthly billing (typically 4.33 = 52/12)",
        },
        {
          label: "Weekly - First Month Extra Multiplier",
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 3.33)",
        },
        {
          label: "Biweekly - Monthly Recurring Multiplier",
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply biweekly rate to get monthly billing (typically 2.165 = 26/12)",
        },
        {
          label: "Biweekly - First Month Extra Multiplier",
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 1.165)",
        },
        {
          label: "Monthly - Cycle Months",
          value: freqMeta.monthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "monthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 1)",
        },
        {
          label: "Bimonthly - Cycle Months",
          value: freqMeta.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 2)",
        },
        {
          label: "Quarterly - Cycle Months",
          value: freqMeta.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 3)",
        },
        {
          label: "Biannual - Cycle Months",
          value: freqMeta.biannual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "biannual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 6)",
        },
        {
          label: "Annual - Cycle Months",
          value: freqMeta.annual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "annual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 12)",
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
          label: "Red Rate Commission",
          value: parseFloat(rateCategories.redRate?.commissionRate?.replace('%', '') || '0'),
          path: ["rateCategories", "redRate", "commissionRate"],
          unit: "%",
          description: "Commission rate for Red Rate tier (typically 20%)",
        },
        {
          label: "Green Rate Multiplier",
          value: rateCategories.greenRate?.multiplier ?? 0,
          path: ["rateCategories", "greenRate", "multiplier"],
          unit: "×",
          description: "Premium rate multiplier (typically 1.3 = 30% higher)",
        },
        {
          label: "Green Rate Commission",
          value: parseFloat(rateCategories.greenRate?.commissionRate?.replace('%', '') || '0'),
          path: ["rateCategories", "greenRate", "commissionRate"],
          unit: "%",
          description: "Commission rate for Green Rate tier (typically 25%)",
        },
      ];
    }

    // REFRESH POWER SCRUB
    if (service.serviceId === "refreshPowerScrub") {
      // Default Rates - using new backend structure
      categories.defaultRates = [
        {
          label: "Default Hourly Rate",
          value: getValue(["coreRates", "defaultHourlyRate"]) ?? 0,
          path: ["coreRates", "defaultHourlyRate"],
          unit: "$ per hour per worker",
          description: "Standard hourly rate per worker (typically $200/hr/worker)",
        },
        {
          label: "Per Worker Rate",
          value: getValue(["coreRates", "perWorkerRate"]) ?? 0,
          path: ["coreRates", "perWorkerRate"],
          unit: "$ per worker",
          description: "Rate per worker when pricing per worker (typically $200)",
        },
        {
          label: "Per Hour Rate",
          value: getValue(["coreRates", "perHourRate"]) ?? 0,
          path: ["coreRates", "perHourRate"],
          unit: "$ per hour",
          description: "Rate per hour when pricing per hour (typically $400)",
        },
        {
          label: "Default Trip Charge",
          value: getValue(["coreRates", "tripCharge"]) ?? 0,
          path: ["coreRates", "tripCharge"],
          unit: "$",
          description: "Trip charge added to hourly/sq ft pricing (typically $75)",
        },
        {
          label: "Default Minimum",
          value: getValue(["coreRates", "minimumVisit"]) ?? 0,
          path: ["coreRates", "minimumVisit"],
          unit: "$",
          description: "Minimum charge per visit regardless of service size (typically $475)",
        },
      ];

      // Kitchen Pricing - using new backend structure
      categories.kitchenPricing = [
        {
          label: "Small/Medium Kitchen",
          value: getValue(["areaSpecificPricing", "kitchen", "smallMedium"]) ?? 0,
          path: ["areaSpecificPricing", "kitchen", "smallMedium"],
          unit: "$",
          description: "Package price for small/medium kitchen back of house (typically $1,500)",
        },
        {
          label: "Large Kitchen",
          value: getValue(["areaSpecificPricing", "kitchen", "large"]) ?? 0,
          path: ["areaSpecificPricing", "kitchen", "large"],
          unit: "$",
          description: "Package price for large kitchen back of house (typically $2,500)",
        },
      ];

      // Front of House Pricing - using new backend structure
      categories.fohPricing = [
        {
          label: "Front of House Rate",
          value: getValue(["areaSpecificPricing", "frontOfHouse"]) ?? 0,
          path: ["areaSpecificPricing", "frontOfHouse"],
          unit: "$",
          description: "Package price for front of house deep clean (typically $2,500)",
        },
      ];

      // Patio Pricing - using new backend structure
      categories.patioPricing = [
        {
          label: "Patio Standalone",
          value: getValue(["areaSpecificPricing", "patio", "standalone"]) ?? 0,
          path: ["areaSpecificPricing", "patio", "standalone"],
          unit: "$",
          description: "Package price for patio only service (typically $800)",
        },
        {
          label: "Patio Upsell",
          value: getValue(["areaSpecificPricing", "patio", "upsell"]) ?? 0,
          path: ["areaSpecificPricing", "patio", "upsell"],
          unit: "$",
          description: "Upsell price when adding patio to FOH service (typically $500)",
        },
      ];

      // Square Footage Pricing - using new backend structure
      categories.sqftPricing = [
        {
          label: "Fixed Fee",
          value: getValue(["squareFootagePricing", "fixedFee"]) ?? 0,
          path: ["squareFootagePricing", "fixedFee"],
          unit: "$",
          description: "Fixed base fee for square footage pricing (typically $200)",
        },
        {
          label: "Inside Rate",
          value: getValue(["squareFootagePricing", "insideRate"]) ?? 0,
          path: ["squareFootagePricing", "insideRate"],
          unit: "$ per sq ft",
          description: "Rate per square foot for inside areas (typically $0.60/sq ft)",
        },
        {
          label: "Outside Rate",
          value: getValue(["squareFootagePricing", "outsideRate"]) ?? 0,
          path: ["squareFootagePricing", "outsideRate"],
          unit: "$ per sq ft",
          description: "Rate per square foot for outside areas (typically $0.40/sq ft)",
        },
      ];

      // Frequency Metadata (Billing Conversions)
      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.scrubFrequencyConversions = [
        {
          label: "Weekly - Monthly Recurring Multiplier",
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply weekly rate to get monthly billing (typically 4.33)",
        },
        {
          label: "Weekly - First Month Extra Multiplier",
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 3.33)",
        },
        {
          label: "Biweekly - Monthly Recurring Multiplier",
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: "Multiply biweekly rate to get monthly billing (typically 2.165)",
        },
        {
          label: "Biweekly - First Month Extra Multiplier",
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: "Additional multiplier for first month (typically 1.165)",
        },
        {
          label: "Monthly - Cycle Months",
          value: freqMeta.monthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "monthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 1)",
        },
        {
          label: "Bimonthly - Cycle Months",
          value: freqMeta.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 2)",
        },
        {
          label: "Quarterly - Cycle Months",
          value: freqMeta.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 3)",
        },
        {
          label: "Biannual - Cycle Months",
          value: freqMeta.biannual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "biannual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 6)",
        },
        {
          label: "Annual - Cycle Months",
          value: freqMeta.annual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "annual", "cycleMonths"],
          unit: "months",
          description: "Billing cycle in months (typically 12)",
        },
      ];

      // Contract Terms
      categories.contractTerms = [
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
      setSuccessMessage("✓ Price updated successfully!");
      setEditingField(null);
    } catch (error) {
      console.error("Error saving field:", error);
      setErrorMessage("❌ Failed to update price. Please try again.");
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
        { key: "installMultipliers", label: "Install Multiplier", icon: "⚡" },
        { key: "minimumAndTripCharges", label: "Minimum & Trip Charges", icon: "💵" },
        { key: "frequencyPriceMultipliers", label: "Frequency Multipliers", icon: "✖️" },
        { key: "frequencyConversions", label: "Billing Conversions", icon: "🔄" },
        { key: "contractTerms", label: "Contract Terms", icon: "📋" },
      ];
    }

    if (service.serviceId === "carpetCleaning") {
      return [
        { key: "unitPricing", label: "Unit Pricing", icon: "📐" },
        { key: "minimums", label: "Minimums", icon: "💵" },
        { key: "carpetInstallMultipliers", label: "Install Multipliers", icon: "⚡" },
        { key: "frequencyMeta", label: "Service Frequencies", icon: "📅" },
        { key: "contractTerms", label: "Contract Terms", icon: "📋" },
      ];
    }

    if (service.serviceId === "electrostaticSpray") {
      return [
        { key: "sprayRates", label: "Spray Rates", icon: "💨" },
        { key: "sprayTripCharges", label: "Trip Charges", icon: "🚗" },
        { key: "sprayFrequencyConversions", label: "Frequency Conversions", icon: "🔄" },
        { key: "contractTerms", label: "Contract Terms", icon: "📋" },
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
        { key: "moppingMetadata", label: "Billing Conversions", icon: "🔄" },
        { key: "contractTerms", label: "Contract Terms", icon: "📋" },
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
        { key: "smoothBreakdown", label: "Smooth Breakdown Pricing", icon: "📊" },
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
        { key: "includedItems", label: "Included Items", icon: "✅" },
        { key: "monthlyAddOns", label: "Monthly Add-Ons", icon: "📋" },
        { key: "microfiberMoppingAddon", label: "Microfiber Mopping", icon: "🧹" },
        { key: "sanicleanBillingConversions", label: "Billing Conversions", icon: "🔄" },
        { key: "sanicleanRateTiers", label: "Rate Tiers", icon: "💰" },
        { key: "contractTerms", label: "Contract Terms", icon: "📋" },
      ];
    }

    if (service.serviceId === "sanipod") {
      return [
        { key: "podRates", label: "Pod Rates", icon: "🗑️" },
        { key: "extraBags", label: "Extra Bags", icon: "🛍️" },
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
        { key: "contractTerms", label: "Contract Terms", icon: "📋" },
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

    if (service.serviceId === "refreshPowerScrub") {
      return [
        { key: "defaultRates", label: "Default Rates", icon: "💵" },
        { key: "kitchenPricing", label: "Kitchen Pricing", icon: "🍳" },
        { key: "fohPricing", label: "Front of House", icon: "🏛️" },
        { key: "patioPricing", label: "Patio Pricing", icon: "🌿" },
        { key: "sqftPricing", label: "Square Footage", icon: "📐" },
        { key: "scrubFrequencyConversions", label: "Billing Conversions", icon: "🔄" },
        { key: "contractTerms", label: "Contract Terms", icon: "📋" },
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

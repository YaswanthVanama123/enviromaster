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
  | "baseRates" | "shortJobPricing";

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

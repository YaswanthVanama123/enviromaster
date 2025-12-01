// src/components/admin/ServicePricingDetailedView.tsx

import React, { useState } from "react";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import "./ServicePricingDetailedView.css";

interface ServicePricingDetailedViewProps {
  service: ServiceConfig;
  onUpdateField: (path: string[], value: number) => Promise<void>;
  onClose: () => void;
}

type TabKey = "windowRates" | "installMultipliers" | "frequencyMultipliers" | "annualFrequencies" | "conversions" | "rateCategories";

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
  const [activeTab, setActiveTab] = useState<TabKey>("windowRates");
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
      windowRates: [],
      installMultipliers: [],
      frequencyMultipliers: [],
      annualFrequencies: [],
      conversions: [],
      rateCategories: [],
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
  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "windowRates", label: "Window Rates", icon: "🪟" },
    { key: "installMultipliers", label: "Install Multipliers", icon: "⚡" },
    { key: "frequencyMultipliers", label: "Frequency Multipliers", icon: "📅" },
    { key: "annualFrequencies", label: "Annual Frequencies", icon: "📊" },
    { key: "conversions", label: "Billing Conversions", icon: "🔄" },
    { key: "rateCategories", label: "Rate Tiers", icon: "💰" },
  ];

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

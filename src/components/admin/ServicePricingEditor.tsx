// src/components/admin/ServicePricingEditor.tsx

import React, { useState, useEffect } from "react";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import "./ServicePricingEditor.css";

interface ServicePricingEditorProps {
  config: ServiceConfig;
  onSave: (updatedConfig: Record<string, any>) => Promise<void>;
  onCancel: () => void;
}

type TabKey =
  | "overview"
  | "frequencies"
  | "geographic"
  | "rateTiers"
  | "minimums"
  | "multipliers"
  | "components"
  | "addons"
  | "refreshPowerScrub"
  | "advanced";

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
}

export const ServicePricingEditor: React.FC<ServicePricingEditorProps> = ({
  config,
  onSave,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [editedConfig, setEditedConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedConfig(JSON.parse(JSON.stringify(config.config)));
  }, [config]);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(editedConfig) !== JSON.stringify(config.config);
    setHasChanges(changed);
  }, [editedConfig, config.config]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(editedConfig);
    setSaving(false);
  };

  // Helper to update nested config values
  const updateConfig = (path: string[], value: any) => {
    setEditedConfig((prev) => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      let current = newConfig;

      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      return newConfig;
    });
  };

  // Helper to get nested config value
  const getConfigValue = (path: string[]): any => {
    let current = editedConfig;
    for (const key of path) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  };

  // Get available tabs based on service type
  const getAvailableTabs = (): Tab[] => {
    const serviceId = config.serviceId;
    const allTabs: Tab[] = [
      { key: "overview", label: "Overview", icon: "📋" },
    ];

    // Add frequency tab for services with frequency-based pricing
    if (["saniscrub", "microfiberMopping", "rpmWindows", "carpetCleaning", "stripWax", "foamingDrain", "sanipod", "electrostaticSpray", "refreshPowerScrub"].includes(serviceId)) {
      allTabs.push({ key: "frequencies", label: "Frequencies", icon: "📅" });
    }

    // Add geographic tab for services with location-based pricing
    if (["saniclean"].includes(serviceId)) {
      allTabs.push({ key: "geographic", label: "Geographic Pricing", icon: "🗺️" });
    }

    // Add rate tiers tab for services with red/green rates
    if (["saniclean", "sanipod", "microfiberMopping", "rpmWindows", "pureJanitorial", "stripWax"].includes(serviceId)) {
      allTabs.push({ key: "rateTiers", label: "Rate Tiers", icon: "💰" });
    }

    // Add minimums tab
    if (["saniscrub", "saniclean", "microfiberMopping"].includes(serviceId)) {
      allTabs.push({ key: "minimums", label: "Minimums", icon: "📊" });
    }

    // Add multipliers tab for services with install/frequency multipliers
    if (["saniscrub", "rpmWindows", "carpetCleaning", "pureJanitorial", "refreshPowerScrub"].includes(serviceId)) {
      allTabs.push({ key: "multipliers", label: "Multipliers", icon: "✖️" });
    }

    // Add components tab for services with facility components
    if (["saniclean"].includes(serviceId)) {
      allTabs.push({ key: "components", label: "Facility Components", icon: "🏢" });
    }

    // Add addons tab
    if (["saniclean", "microfiberMopping", "electrostaticSpray"].includes(serviceId)) {
      allTabs.push({ key: "addons", label: "Add-Ons", icon: "➕" });
    }

    // Add Refresh Power Scrub specific tab
    if (serviceId === "refreshPowerScrub") {
      allTabs.push({ key: "refreshPowerScrub", label: "Core Rates & Areas", icon: "🏭" });
    }

    allTabs.push({ key: "advanced", label: "Advanced", icon: "⚙️" });

    return allTabs;
  };

  const tabs = getAvailableTabs();

  return (
    <div className="spe">
      <div className="spe__header">
        <div>
          <h2 className="spe__title">Edit Pricing: {config.label}</h2>
          <p className="spe__subtitle">{config.serviceId} - v{config.version}</p>
        </div>
        <div className="spe__actions">
          <button className="spe__btn spe__btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="spe__btn spe__btn--save"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="spe__changes-indicator">
          ⚠️ You have unsaved changes
        </div>
      )}

      <div className="spe__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`spe__tab ${activeTab === tab.key ? "spe__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="spe__tab-icon">{tab.icon}</span>
            <span className="spe__tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="spe__content">
        {activeTab === "overview" && (
          <OverviewTab config={config} editedConfig={editedConfig} />
        )}

        {activeTab === "frequencies" && (
          <FrequenciesTab
            serviceId={config.serviceId}
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "geographic" && (
          <GeographicTab
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "rateTiers" && (
          <RateTiersTab
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "minimums" && (
          <MinimumsTab
            serviceId={config.serviceId}
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "multipliers" && (
          <MultipliersTab
            serviceId={config.serviceId}
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "components" && (
          <ComponentsTab
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "addons" && (
          <AddonsTab
            serviceId={config.serviceId}
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "refreshPowerScrub" && (
          <RefreshPowerScrubTab
            editedConfig={editedConfig}
            updateConfig={updateConfig}
            getConfigValue={getConfigValue}
          />
        )}

        {activeTab === "advanced" && (
          <AdvancedTab
            editedConfig={editedConfig}
            updateConfig={updateConfig}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab
const OverviewTab: React.FC<{
  config: ServiceConfig;
  editedConfig: Record<string, any>;
}> = ({ config, editedConfig }) => {
  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">Service Overview</h3>

      <div className="spe__info-grid">
        <div className="spe__info-card">
          <div className="spe__info-label">Service ID</div>
          <div className="spe__info-value">{config.serviceId}</div>
        </div>

        <div className="spe__info-card">
          <div className="spe__info-label">Label</div>
          <div className="spe__info-value">{config.label}</div>
        </div>

        <div className="spe__info-card">
          <div className="spe__info-label">Version</div>
          <div className="spe__info-value">{config.version}</div>
        </div>

        <div className="spe__info-card">
          <div className="spe__info-label">Status</div>
          <div className="spe__info-value">
            <span className={`spe__status ${config.isActive ? "spe__status--active" : "spe__status--inactive"}`}>
              {config.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      <div className="spe__description">
        <div className="spe__info-label">Description</div>
        <p>{config.description}</p>
      </div>

      {config.tags && config.tags.length > 0 && (
        <div className="spe__tags">
          <div className="spe__info-label">Tags</div>
          <div className="spe__tag-list">
            {config.tags.map((tag) => (
              <span key={tag} className="spe__tag">{tag}</span>
            ))}
          </div>
        </div>
      )}

      <div className="spe__config-summary">
        <div className="spe__info-label">Configuration Summary</div>
        <pre className="spe__json-preview">
          {JSON.stringify(editedConfig, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// Frequencies Tab
const FrequenciesTab: React.FC<{
  serviceId: string;
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ serviceId, editedConfig, updateConfig, getConfigValue }) => {
  // Helper to update linked fields (e.g., monthly and twicePerMonth share same values)
  const updateLinkedFields = (
    primaryPath: string[],
    value: any,
    linkedPaths?: string[][]
  ) => {
    updateConfig(primaryPath, value);
    if (linkedPaths) {
      linkedPaths.forEach((path) => updateConfig(path, value));
    }
  };

  // Get frequency-related configuration based on service type
  const renderFrequencyConfig = () => {
    if (serviceId === "saniscrub") {
      const fixtureRates = getConfigValue(["fixtureRates"]) || {};
      const minimums = getConfigValue(["minimums"]) || {};
      const frequencyMeta = getConfigValue(["frequencyMeta"]) || {};

      const frequencies = ["monthly", "twicePerMonth", "bimonthly", "quarterly"];

      // Track if monthly is being edited (to show warning about linked fields)
      const monthlyAndTwiceLinked =
        fixtureRates.monthly === fixtureRates.twicePerMonth &&
        minimums.monthly === minimums.twicePerMonth;

      return (
        <div className="spe__table-container">
          {monthlyAndTwiceLinked && (
            <div className="spe__note" style={{ marginBottom: "16px" }}>
              🔗 Monthly and 2x Per Month are linked. Changing one will update the other.
            </div>
          )}

          <table className="spe__table">
            <thead>
              <tr>
                <th>Frequency</th>
                <th>Rate Per Fixture</th>
                <th>Minimum Charge</th>
                <th>Visits Per Year</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => {
                const isLinkedToMonthly = freq === "monthly" || freq === "twicePerMonth";
                const linkedPaths = isLinkedToMonthly
                  ? freq === "monthly"
                    ? [["fixtureRates", "twicePerMonth"]]
                    : [["fixtureRates", "monthly"]]
                  : undefined;

                const linkedMinimumPaths = isLinkedToMonthly
                  ? freq === "monthly"
                    ? [["minimums", "twicePerMonth"]]
                    : [["minimums", "monthly"]]
                  : undefined;

                return (
                  <tr key={freq}>
                    <td className="spe__freq-label">
                      {freq === "twicePerMonth" ? "2x Per Month" : freq.charAt(0).toUpperCase() + freq.slice(1)}
                      {isLinkedToMonthly && monthlyAndTwiceLinked && (
                        <span style={{ marginLeft: "8px", fontSize: "12px", color: "#2563eb" }}>
                          🔗
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="spe__input"
                        value={fixtureRates[freq] || ""}
                        onChange={(e) =>
                          updateLinkedFields(
                            ["fixtureRates", freq],
                            Number(e.target.value) || 0 || 0,
                            linkedPaths
                          )
                        }
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="spe__input"
                        value={minimums[freq] || ""}
                        onChange={(e) =>
                          updateLinkedFields(
                            ["minimums", freq],
                            Number(e.target.value) || 0 || 0,
                            linkedMinimumPaths
                          )
                        }
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="spe__input"
                        value={frequencyMeta[freq]?.visitsPerYear || ""}
                        onChange={(e) =>
                          updateConfig(
                            ["frequencyMeta", freq, "visitsPerYear"],
                            Number(e.target.value) || 0 || 0
                          )
                        }
                        min="0"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="spe__note" style={{ marginTop: "16px" }}>
            💡 Tip: In SaniScrub, monthly and 2x monthly typically share the same rate per fixture and minimum. The linked values ensure consistency.
          </div>
        </div>
      );
    }

    if (serviceId === "rpmWindows") {
      const frequencyMultipliers = getConfigValue(["frequencyMultipliers"]) || {};
      const annualFrequencies = getConfigValue(["annualFrequencies"]) || {};

      const frequencies = ["weekly", "biweekly", "monthly", "quarterly"];

      return (
        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>Frequency</th>
                <th>Multiplier</th>
                <th>Visits Per Year</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1).replace(/([A-Z])/g, " $1")}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={frequencyMultipliers[freq] || ""}
                      onChange={(e) =>
                        updateConfig(["frequencyMultipliers", freq], Number(e.target.value) || 0 || 0)
                      }
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={annualFrequencies[freq] || ""}
                      onChange={(e) =>
                        updateConfig(["annualFrequencies", freq], Number(e.target.value) || 0 || 0)
                      }
                      min="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="spe__field-group">
            <label className="spe__label">Quarterly First Time Multiplier</label>
            <input
              type="number"
              className="spe__input"
              value={frequencyMultipliers.quarterlyFirstTime || ""}
              onChange={(e) =>
                updateConfig(["frequencyMultipliers", "quarterlyFirstTime"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>
      );
    }

    if (serviceId === "microfiberMopping") {
      const billingConversions = getConfigValue(["billingConversions"]) || {};
      const frequencies = ["weekly", "biweekly", "monthly"];

      return (
        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>Frequency</th>
                <th>Annual Multiplier</th>
                <th>Monthly Multiplier</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.annualMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "annualMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.monthlyMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "monthlyMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.01"
                      min="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (serviceId === "sanipod") {
      const annualFrequencies = getConfigValue(["annualFrequencies"]) || {};
      const frequencies = ["weekly", "biweekly", "monthly"];

      return (
        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>Frequency</th>
                <th>Annual Visits</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={annualFrequencies[freq] || ""}
                      onChange={(e) =>
                        updateConfig(["annualFrequencies", freq], Number(e.target.value) || 0 || 0)
                      }
                      min="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="spe__field-group">
            <label className="spe__label">Weeks Per Month</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["weeksPerMonth"]) || ""}
              onChange={(e) => updateConfig(["weeksPerMonth"], Number(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Weeks Per Year</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["weeksPerYear"]) || ""}
              onChange={(e) => updateConfig(["weeksPerYear"], Number(e.target.value) || 0)}
              min="0"
            />
          </div>
        </div>
      );
    }

    if (serviceId === "electrostaticSpray") {
      const billingConversions = getConfigValue(["billingConversions"]) || {};
      const frequencies = ["weekly", "biweekly", "monthly", "bimonthly", "quarterly"];

      return (
        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>Frequency</th>
                <th>Monthly Multiplier</th>
                <th>Annual Multiplier</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.monthlyMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "monthlyMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.001"
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.annualMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "annualMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.01"
                      min="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="spe__field-group">
            <label className="spe__label">Actual Weeks Per Month</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["billingConversions", "actualWeeksPerMonth"]) || ""}
              onChange={(e) => updateConfig(["billingConversions", "actualWeeksPerMonth"], Number(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
          </div>
        </div>
      );
    }

    if (serviceId === "refreshPowerScrub") {
      const billingConversions = getConfigValue(["billingConversions"]) || {};
      const frequencies = ["weekly", "biweekly", "monthly", "bimonthly", "quarterly"];

      return (
        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>Frequency</th>
                <th>Monthly Multiplier</th>
                <th>Annual Multiplier</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.monthlyMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "monthlyMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.001"
                      min="0"
                      placeholder={freq === "weekly" ? "4.33" : freq === "biweekly" ? "2.165" : freq === "monthly" ? "1.0" : freq === "bimonthly" ? "0.5" : "0.333"}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.annualMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "annualMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.01"
                      min="0"
                      placeholder={freq === "weekly" ? "52" : freq === "biweekly" ? "26" : freq === "monthly" ? "12" : freq === "bimonthly" ? "6" : "4"}
                    />
                  </td>
                  <td className="spe__description">
                    <input
                      type="text"
                      className="spe__input"
                      value={billingConversions[freq]?.description || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "description"],
                          e.target.value
                        )
                      }
                      placeholder={`${freq} frequency description`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="spe__note" style={{ marginTop: "16px" }}>
            💡 Tip: Monthly multipliers convert per-visit costs to monthly costs. Annual multipliers convert to yearly costs. For example, weekly service has a 4.33 monthly multiplier (4.33 weeks per month average).
          </div>
        </div>
      );
    }

    return <div className="spe__empty">No frequency configuration for this service</div>;
  };

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">Frequency-Based Pricing</h3>
      {renderFrequencyConfig()}
    </div>
  );
};

// Geographic Tab (for SaniClean)
const GeographicTab: React.FC<{
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ editedConfig, updateConfig, getConfigValue }) => {
  const insideBeltway = getConfigValue(["geographicPricing", "insideBeltway"]) || {};
  const outsideBeltway = getConfigValue(["geographicPricing", "outsideBeltway"]) || {};

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">Geographic Pricing</h3>

      <div className="spe__geo-grid">
        {/* Inside Beltway */}
        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Inside Beltway</h4>

          <div className="spe__field-group">
            <label className="spe__label">Rate Per Fixture</label>
            <input
              type="number"
              className="spe__input"
              value={insideBeltway.ratePerFixture || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "insideBeltway", "ratePerFixture"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Weekly Minimum</label>
            <input
              type="number"
              className="spe__input"
              value={insideBeltway.weeklyMinimum || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "insideBeltway", "weeklyMinimum"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Trip Charge</label>
            <input
              type="number"
              className="spe__input"
              value={insideBeltway.tripCharge || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "insideBeltway", "tripCharge"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Parking Fee</label>
            <input
              type="number"
              className="spe__input"
              value={insideBeltway.parkingFee || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "insideBeltway", "parkingFee"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>

        {/* Outside Beltway */}
        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Outside Beltway</h4>

          <div className="spe__field-group">
            <label className="spe__label">Rate Per Fixture</label>
            <input
              type="number"
              className="spe__input"
              value={outsideBeltway.ratePerFixture || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "outsideBeltway", "ratePerFixture"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Weekly Minimum</label>
            <input
              type="number"
              className="spe__input"
              value={outsideBeltway.weeklyMinimum || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "outsideBeltway", "weeklyMinimum"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Trip Charge</label>
            <input
              type="number"
              className="spe__input"
              value={outsideBeltway.tripCharge || ""}
              onChange={(e) =>
                updateConfig(
                  ["geographicPricing", "outsideBeltway", "tripCharge"],
                  Number(e.target.value) || 0
                )
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Rate Tiers Tab
const RateTiersTab: React.FC<{
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ editedConfig, updateConfig, getConfigValue }) => {
  const rateTiers = getConfigValue(["rateTiers"]) || getConfigValue(["rateCategories"]) || {};
  const pathPrefix = editedConfig.rateTiers ? "rateTiers" : "rateCategories";

  const redRate = rateTiers.redRate || {};
  const greenRate = rateTiers.greenRate || {};

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">Rate Tiers (Red & Green)</h3>

      <div className="spe__geo-grid">
        {/* Red Rate */}
        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Red Rate (Standard)</h4>

          <div className="spe__field-group">
            <label className="spe__label">Multiplier</label>
            <input
              type="number"
              className="spe__input"
              value={redRate.multiplier || ""}
              onChange={(e) =>
                updateConfig([pathPrefix, "redRate", "multiplier"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Commission Rate</label>
            <input
              type="text"
              className="spe__input"
              value={redRate.commissionRate || ""}
              onChange={(e) =>
                updateConfig([pathPrefix, "redRate", "commissionRate"], e.target.value)
              }
              placeholder="e.g., 20% or 0.2"
            />
          </div>
        </div>

        {/* Green Rate */}
        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Green Rate (Premium)</h4>

          <div className="spe__field-group">
            <label className="spe__label">Multiplier</label>
            <input
              type="number"
              className="spe__input"
              value={greenRate.multiplier || ""}
              onChange={(e) =>
                updateConfig([pathPrefix, "greenRate", "multiplier"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
            <div className="spe__hint">Typically 1.3 (30% higher than red)</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Commission Rate</label>
            <input
              type="text"
              className="spe__input"
              value={greenRate.commissionRate || ""}
              onChange={(e) =>
                updateConfig([pathPrefix, "greenRate", "commissionRate"], e.target.value)
              }
              placeholder="e.g., 25% or 0.25"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Minimums Tab
const MinimumsTab: React.FC<{
  serviceId: string;
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ serviceId, editedConfig, updateConfig, getConfigValue }) => {
  if (serviceId === "saniclean") {
    const smallFacilityMinimum = getConfigValue(["smallFacilityMinimum"]) || {};
    const allInclusivePackage = getConfigValue(["allInclusivePackage"]) || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">Minimum Charges</h3>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Small Facility Minimum</h4>

          <div className="spe__field-group">
            <label className="spe__label">Fixture Threshold</label>
            <input
              type="number"
              className="spe__input"
              value={smallFacilityMinimum.fixtureThreshold || ""}
              onChange={(e) =>
                updateConfig(["smallFacilityMinimum", "fixtureThreshold"], Number(e.target.value) || 0)
              }
              min="0"
            />
            <div className="spe__hint">Facilities with ≤ this many fixtures get minimum charge</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Minimum Weekly Charge</label>
            <input
              type="number"
              className="spe__input"
              value={smallFacilityMinimum.minimumWeeklyCharge || ""}
              onChange={(e) =>
                updateConfig(["smallFacilityMinimum", "minimumWeeklyCharge"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={smallFacilityMinimum.includesTripCharge || false}
                onChange={(e) =>
                  updateConfig(["smallFacilityMinimum", "includesTripCharge"], e.target.checked)
                }
              />
              <span>Includes Trip Charge</span>
            </label>
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">All-Inclusive Package</h4>

          <div className="spe__field-group">
            <label className="spe__label">Weekly Rate Per Fixture</label>
            <input
              type="number"
              className="spe__input"
              value={allInclusivePackage.weeklyRatePerFixture || ""}
              onChange={(e) =>
                updateConfig(["allInclusivePackage", "weeklyRatePerFixture"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Auto All-Inclusive Min Fixtures</label>
            <input
              type="number"
              className="spe__input"
              value={allInclusivePackage.autoAllInclusiveMinFixtures || ""}
              onChange={(e) =>
                updateConfig(["allInclusivePackage", "autoAllInclusiveMinFixtures"], Number(e.target.value) || 0)
              }
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={allInclusivePackage.includeAllAddOns || false}
                onChange={(e) =>
                  updateConfig(["allInclusivePackage", "includeAllAddOns"], e.target.checked)
                }
              />
              <span>Include All Add-Ons</span>
            </label>
          </div>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={allInclusivePackage.waiveTripCharge || false}
                onChange={(e) =>
                  updateConfig(["allInclusivePackage", "waiveTripCharge"], e.target.checked)
                }
              />
              <span>Waive Trip Charge</span>
            </label>
          </div>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={allInclusivePackage.waiveWarrantyFees || false}
                onChange={(e) =>
                  updateConfig(["allInclusivePackage", "waiveWarrantyFees"], e.target.checked)
                }
              />
              <span>Waive Warranty Fees</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (serviceId === "microfiberMopping") {
    const standalonePricing = getConfigValue(["standalonePricing"]) || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">Minimum Charges</h3>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Standalone Pricing</h4>

          <div className="spe__field-group">
            <label className="spe__label">Standalone Minimum</label>
            <input
              type="number"
              className="spe__input"
              value={standalonePricing.standaloneMinimum || ""}
              onChange={(e) =>
                updateConfig(["standalonePricing", "standaloneMinimum"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={standalonePricing.includeTripCharge || false}
                onChange={(e) =>
                  updateConfig(["standalonePricing", "includeTripCharge"], e.target.checked)
                }
              />
              <span>Include Trip Charge</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">Minimum Charges</h3>
      <div className="spe__empty">No minimum configuration for this service</div>
    </div>
  );
};

// Multipliers Tab
const MultipliersTab: React.FC<{
  serviceId: string;
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ serviceId, editedConfig, updateConfig, getConfigValue }) => {
  if (serviceId === "saniscrub" || serviceId === "carpetCleaning") {
    const installMultipliers = getConfigValue(["installMultipliers"]) || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">Install Multipliers</h3>

        <div className="spe__field-group">
          <label className="spe__label">Dirty/First Time Multiplier</label>
          <input
            type="number"
            className="spe__input"
            value={installMultipliers.dirty || ""}
            onChange={(e) =>
              updateConfig(["installMultipliers", "dirty"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
          <div className="spe__hint">Typically 3x for dirty/first-time installations</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">Clean Multiplier</label>
          <input
            type="number"
            className="spe__input"
            value={installMultipliers.clean || ""}
            onChange={(e) =>
              updateConfig(["installMultipliers", "clean"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
          <div className="spe__hint">Typically 1x for clean installations</div>
        </div>
      </div>
    );
  }

  if (serviceId === "rpmWindows") {
    const installMultiplierFirstTime = getConfigValue(["installMultiplierFirstTime"]) || "";
    const installMultiplierClean = getConfigValue(["installMultiplierClean"]) || "";

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">Install Multipliers</h3>

        <div className="spe__field-group">
          <label className="spe__label">First Time Install Multiplier</label>
          <input
            type="number"
            className="spe__input"
            value={installMultiplierFirstTime}
            onChange={(e) =>
              updateConfig(["installMultiplierFirstTime"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
          <div className="spe__hint">Typically 3x for first-time installations</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">Clean Install Multiplier</label>
          <input
            type="number"
            className="spe__input"
            value={installMultiplierClean}
            onChange={(e) =>
              updateConfig(["installMultiplierClean"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
          <div className="spe__hint">Typically 1x for clean installations</div>
        </div>
      </div>
    );
  }

  if (serviceId === "refreshPowerScrub") {
    const billingConversions = getConfigValue(["billingConversions"]) || {};
    const frequencies = ["weekly", "biweekly", "monthly", "bimonthly", "quarterly"];

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">Billing Conversion Multipliers</h3>

        <div className="spe__table-container">
          <table className="spe__table">
            <thead>
              <tr>
                <th>Frequency</th>
                <th>Monthly Multiplier</th>
                <th>Annual Multiplier</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {frequencies.map((freq) => (
                <tr key={freq}>
                  <td className="spe__freq-label">
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.monthlyMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "monthlyMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.001"
                      min="0"
                      placeholder={
                        freq === "weekly" ? "4.33" :
                        freq === "biweekly" ? "2.165" :
                        freq === "monthly" ? "1.0" :
                        freq === "bimonthly" ? "0.5" : "0.333"
                      }
                    />
                    <div className="spe__hint">
                      {freq === "weekly" ? "4.33 weeks/month" :
                       freq === "biweekly" ? "26 visits ÷ 12 months" :
                       freq === "monthly" ? "1 visit/month" :
                       freq === "bimonthly" ? "0.5 visits/month" : "4 visits ÷ 12 months"}
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="spe__input"
                      value={billingConversions[freq]?.annualMultiplier || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "annualMultiplier"],
                          Number(e.target.value) || 0
                        )
                      }
                      step="0.01"
                      min="0"
                      placeholder={
                        freq === "weekly" ? "52" :
                        freq === "biweekly" ? "26" :
                        freq === "monthly" ? "12" :
                        freq === "bimonthly" ? "6" : "4"
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="spe__input"
                      value={billingConversions[freq]?.description || ""}
                      onChange={(e) =>
                        updateConfig(
                          ["billingConversions", freq, "description"],
                          e.target.value
                        )
                      }
                      placeholder={`${freq} billing conversion`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="spe__note" style={{ marginTop: "16px" }}>
            💡 These multipliers convert per-visit costs to monthly and annual billing amounts. They are used throughout the Refresh Power Scrub calculation engine.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">Multipliers</h3>
      <div className="spe__empty">No multiplier configuration for this service</div>
    </div>
  );
};

// Components Tab (for SaniClean)
const ComponentsTab: React.FC<{
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ editedConfig, updateConfig, getConfigValue }) => {
  const facilityComponents = getConfigValue(["facilityComponents"]) || {};
  const urinals = facilityComponents.urinals || {};
  const maleToilets = facilityComponents.maleToilets || {};
  const femaleToilets = facilityComponents.femaleToilets || {};
  const sinks = facilityComponents.sinks || {};
  const soapUpgrades = getConfigValue(["soapUpgrades"]) || {};
  const warrantyFeePerDispenser = getConfigValue(["warrantyFeePerDispenser"]) || "";

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">Facility Components</h3>

      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">Urinals</h4>

        <div className="spe__field-group">
          <label className="spe__label">Urinal Screen</label>
          <input
            type="number"
            className="spe__input"
            value={urinals.urinalScreen || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "urinals", "urinalScreen"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>

        <div className="spe__field-group">
          <label className="spe__label">Urinal Mat</label>
          <input
            type="number"
            className="spe__input"
            value={urinals.urinalMat || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "urinals", "urinalMat"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">Male Toilets</h4>

        <div className="spe__field-group">
          <label className="spe__label">Toilet Clips</label>
          <input
            type="number"
            className="spe__input"
            value={maleToilets.toiletClips || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "maleToilets", "toiletClips"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>

        <div className="spe__field-group">
          <label className="spe__label">Seat Cover Dispenser</label>
          <input
            type="number"
            className="spe__input"
            value={maleToilets.seatCoverDispenser || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "maleToilets", "seatCoverDispenser"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">Female Toilets</h4>

        <div className="spe__field-group">
          <label className="spe__label">SaniPod Service</label>
          <input
            type="number"
            className="spe__input"
            value={femaleToilets.sanipodService || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "femaleToilets", "sanipodService"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">Sinks</h4>

        <div className="spe__field-group">
          <label className="spe__label">Ratio Sink to Soap</label>
          <input
            type="number"
            className="spe__input"
            value={sinks.ratioSinkToSoap || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "sinks", "ratioSinkToSoap"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>

        <div className="spe__field-group">
          <label className="spe__label">Ratio Sink to Air Freshener</label>
          <input
            type="number"
            className="spe__input"
            value={sinks.ratioSinkToAirFreshener || ""}
            onChange={(e) =>
              updateConfig(["facilityComponents", "sinks", "ratioSinkToAirFreshener"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">Soap Upgrades & Warranty</h4>

        <div className="spe__field-group">
          <label className="spe__label">Standard to Luxury Soap Upgrade</label>
          <input
            type="number"
            className="spe__input"
            value={soapUpgrades.standardToLuxury || ""}
            onChange={(e) =>
              updateConfig(["soapUpgrades", "standardToLuxury"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>

        <div className="spe__field-group">
          <label className="spe__label">Warranty Fee Per Dispenser</label>
          <input
            type="number"
            className="spe__input"
            value={warrantyFeePerDispenser}
            onChange={(e) =>
              updateConfig(["warrantyFeePerDispenser"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
          />
        </div>
      </div>
    </div>
  );
};

// Add-ons Tab
const AddonsTab: React.FC<{
  serviceId: string;
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ serviceId, editedConfig, updateConfig, getConfigValue }) => {
  if (serviceId === "saniclean") {
    const addOnServices = getConfigValue(["addOnServices"]) || {};
    const microfiberMopping = addOnServices.microfiberMopping || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">Add-On Services</h3>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Microfiber Mopping</h4>

          <div className="spe__field-group">
            <label className="spe__label">Price Per Bathroom</label>
            <input
              type="number"
              className="spe__input"
              value={microfiberMopping.pricePerBathroom || ""}
              onChange={(e) =>
                updateConfig(["addOnServices", "microfiberMopping", "pricePerBathroom"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>
    );
  }

  if (serviceId === "microfiberMopping") {
    const tripCharges = getConfigValue(["tripCharges"]) || {};
    const hugeBathroomPricing = getConfigValue(["hugeBathroomPricing"]) || {};
    const extraAreaPricing = getConfigValue(["extraAreaPricing"]) || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">Additional Pricing Options</h3>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Trip Charges</h4>

          <div className="spe__field-group">
            <label className="spe__label">Inside Beltway</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.insideBeltway || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "insideBeltway"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Outside Beltway</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.outsideBeltway || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "outsideBeltway"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Standard</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.standard || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "standard"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Huge Bathroom Pricing</h4>

          <div className="spe__field-group">
            <label className="spe__checkbox-label">
              <input
                type="checkbox"
                checked={hugeBathroomPricing.enabled || false}
                onChange={(e) =>
                  updateConfig(["hugeBathroomPricing", "enabled"], e.target.checked)
                }
              />
              <span>Enable Huge Bathroom Pricing</span>
            </label>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Rate Per Sq Ft</label>
            <input
              type="number"
              className="spe__input"
              value={hugeBathroomPricing.ratePerSqFt || ""}
              onChange={(e) =>
                updateConfig(["hugeBathroomPricing", "ratePerSqFt"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Sq Ft Unit</label>
            <input
              type="number"
              className="spe__input"
              value={hugeBathroomPricing.sqFtUnit || ""}
              onChange={(e) =>
                updateConfig(["hugeBathroomPricing", "sqFtUnit"], Number(e.target.value) || 0)
              }
              min="0"
            />
            <div className="spe__hint">Charge per this many square feet</div>
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Extra Area Pricing</h4>

          <div className="spe__field-group">
            <label className="spe__label">Single Large Area Rate</label>
            <input
              type="number"
              className="spe__input"
              value={extraAreaPricing.singleLargeAreaRate || ""}
              onChange={(e) =>
                updateConfig(["extraAreaPricing", "singleLargeAreaRate"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Extra Area Sq Ft Unit</label>
            <input
              type="number"
              className="spe__input"
              value={extraAreaPricing.extraAreaSqFtUnit || ""}
              onChange={(e) =>
                updateConfig(["extraAreaPricing", "extraAreaSqFtUnit"], Number(e.target.value) || 0)
              }
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Rate Per Unit</label>
            <input
              type="number"
              className="spe__input"
              value={extraAreaPricing.extraAreaRatePerUnit || ""}
              onChange={(e) =>
                updateConfig(["extraAreaPricing", "extraAreaRatePerUnit"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>
    );
  }

  if (serviceId === "electrostaticSpray") {
    const tripCharges = getConfigValue(["tripCharges"]) || {};

    return (
      <div className="spe__tab-content">
        <h3 className="spe__section-title">Pricing Rates & Trip Charges</h3>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Pricing Rates</h4>

          <div className="spe__field-group">
            <label className="spe__label">Rate Per Room</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["ratePerRoom"]) || ""}
              onChange={(e) => updateConfig(["ratePerRoom"], Number(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
            <div className="spe__hint">Price per moderately sized room</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Rate Per 1000 Sq Ft</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["ratePerThousandSqFt"]) || ""}
              onChange={(e) => updateConfig(["ratePerThousandSqFt"], Number(e.target.value) || 0)}
              step="0.01"
              min="0"
            />
            <div className="spe__hint">Price per 1000 square feet</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Sq Ft Unit</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["sqFtUnit"]) || ""}
              onChange={(e) => updateConfig(["sqFtUnit"], Number(e.target.value) || 0)}
              min="0"
            />
            <div className="spe__hint">Square footage unit (typically 1000)</div>
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Trip Charges</h4>

          <div className="spe__field-group">
            <label className="spe__label">Inside Beltway</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.insideBeltway || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "insideBeltway"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Outside Beltway</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.outsideBeltway || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "outsideBeltway"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Standard</label>
            <input
              type="number"
              className="spe__input"
              value={tripCharges.standard || ""}
              onChange={(e) =>
                updateConfig(["tripCharges", "standard"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div className="spe__geo-section">
          <h4 className="spe__subsection-title">Contract Settings</h4>

          <div className="spe__field-group">
            <label className="spe__label">Min Contract Months</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["minContractMonths"]) || ""}
              onChange={(e) => updateConfig(["minContractMonths"], Number(e.target.value) || 0)}
              min="0"
            />
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Max Contract Months</label>
            <input
              type="number"
              className="spe__input"
              value={getConfigValue(["maxContractMonths"]) || ""}
              onChange={(e) => updateConfig(["maxContractMonths"], Number(e.target.value) || 0)}
              min="0"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">Add-On Services</h3>
      <div className="spe__empty">No add-on configuration for this service</div>
    </div>
  );
};

// Refresh Power Scrub Tab - Core Rates & Area-Specific Pricing
const RefreshPowerScrubTab: React.FC<{
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
  getConfigValue: (path: string[]) => any;
}> = ({ editedConfig, updateConfig, getConfigValue }) => {
  const coreRates = getConfigValue(["coreRates"]) || {};
  const areaSpecificPricing = getConfigValue(["areaSpecificPricing"]) || {};
  const squareFootagePricing = getConfigValue(["squareFootagePricing"]) || {};

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">Core Rates & Area-Specific Pricing</h3>

      {/* Core Rates Section */}
      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">Core Rates</h4>

        <div className="spe__field-group">
          <label className="spe__label">Default Hourly Rate</label>
          <input
            type="number"
            className="spe__input"
            value={coreRates.defaultHourlyRate || ""}
            onChange={(e) =>
              updateConfig(["coreRates", "defaultHourlyRate"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="200"
          />
          <div className="spe__hint">Base rate per hour per worker ($200)</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">Per Worker Rate</label>
          <input
            type="number"
            className="spe__input"
            value={coreRates.perWorkerRate || ""}
            onChange={(e) =>
              updateConfig(["coreRates", "perWorkerRate"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="200"
          />
          <div className="spe__hint">Rate per worker when pricing per worker ($200)</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">Per Hour Rate</label>
          <input
            type="number"
            className="spe__input"
            value={coreRates.perHourRate || ""}
            onChange={(e) =>
              updateConfig(["coreRates", "perHourRate"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="400"
          />
          <div className="spe__hint">Rate per hour when pricing per hour ($400)</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">Trip Charge</label>
          <input
            type="number"
            className="spe__input"
            value={coreRates.tripCharge || ""}
            onChange={(e) =>
              updateConfig(["coreRates", "tripCharge"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="75"
          />
          <div className="spe__hint">Trip charge per visit ($75)</div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">Minimum Visit</label>
          <input
            type="number"
            className="spe__input"
            value={coreRates.minimumVisit || ""}
            onChange={(e) =>
              updateConfig(["coreRates", "minimumVisit"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="475"
          />
          <div className="spe__hint">Minimum charge per visit ($475)</div>
        </div>
      </div>

      {/* Area-Specific Pricing Section */}
      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">Area-Specific Pricing</h4>

        <div className="spe__field-row">
          <div className="spe__field-group">
            <label className="spe__label">Kitchen - Small/Medium</label>
            <input
              type="number"
              className="spe__input"
              value={areaSpecificPricing.kitchen?.smallMedium || ""}
              onChange={(e) =>
                updateConfig(["areaSpecificPricing", "kitchen", "smallMedium"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="1500"
            />
            <div className="spe__hint">Small/medium kitchen package ($1,500)</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Kitchen - Large</label>
            <input
              type="number"
              className="spe__input"
              value={areaSpecificPricing.kitchen?.large || ""}
              onChange={(e) =>
                updateConfig(["areaSpecificPricing", "kitchen", "large"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="2500"
            />
            <div className="spe__hint">Large kitchen package ($2,500)</div>
          </div>
        </div>

        <div className="spe__field-group">
          <label className="spe__label">Front of House Rate</label>
          <input
            type="number"
            className="spe__input"
            value={areaSpecificPricing.frontOfHouse || ""}
            onChange={(e) =>
              updateConfig(["areaSpecificPricing", "frontOfHouse"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="2500"
          />
          <div className="spe__hint">Front of house package rate ($2,500)</div>
        </div>

        <div className="spe__field-row">
          <div className="spe__field-group">
            <label className="spe__label">Patio - Standalone</label>
            <input
              type="number"
              className="spe__input"
              value={areaSpecificPricing.patio?.standalone || ""}
              onChange={(e) =>
                updateConfig(["areaSpecificPricing", "patio", "standalone"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="800"
            />
            <div className="spe__hint">Standalone patio service ($800)</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Patio - Upsell/Add-on</label>
            <input
              type="number"
              className="spe__input"
              value={areaSpecificPricing.patio?.upsell || ""}
              onChange={(e) =>
                updateConfig(["areaSpecificPricing", "patio", "upsell"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="500"
            />
            <div className="spe__hint">Patio add-on service ($500)</div>
          </div>
        </div>
      </div>

      {/* Square Footage Pricing Section */}
      <div className="spe__geo-section">
        <h4 className="spe__subsection-title">Square Footage Pricing</h4>

        <div className="spe__field-group">
          <label className="spe__label">Fixed Fee</label>
          <input
            type="number"
            className="spe__input"
            value={squareFootagePricing.fixedFee || ""}
            onChange={(e) =>
              updateConfig(["squareFootagePricing", "fixedFee"], Number(e.target.value) || 0)
            }
            step="0.01"
            min="0"
            placeholder="200"
          />
          <div className="spe__hint">Base fixed fee for square footage pricing ($200)</div>
        </div>

        <div className="spe__field-row">
          <div className="spe__field-group">
            <label className="spe__label">Inside Rate (per sq ft)</label>
            <input
              type="number"
              className="spe__input"
              value={squareFootagePricing.insideRate || ""}
              onChange={(e) =>
                updateConfig(["squareFootagePricing", "insideRate"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="0.6"
            />
            <div className="spe__hint">Rate per square foot inside ($0.60/sq ft)</div>
          </div>

          <div className="spe__field-group">
            <label className="spe__label">Outside Rate (per sq ft)</label>
            <input
              type="number"
              className="spe__input"
              value={squareFootagePricing.outsideRate || ""}
              onChange={(e) =>
                updateConfig(["squareFootagePricing", "outsideRate"], Number(e.target.value) || 0)
              }
              step="0.01"
              min="0"
              placeholder="0.4"
            />
            <div className="spe__hint">Rate per square foot outside ($0.40/sq ft)</div>
          </div>
        </div>
      </div>

      <div className="spe__note" style={{ marginTop: "24px" }}>
        💡 <strong>Refresh Power Scrub Pricing Rules:</strong>
        <br />• <strong>Trip Charge:</strong> ${coreRates.tripCharge || 75} per visit
        <br />• <strong>Hourly Rate:</strong> ${coreRates.defaultHourlyRate || 200}/hour/worker
        <br />• <strong>Minimum:</strong> ${coreRates.minimumVisit || 475} per visit
        <br />• <strong>Areas:</strong> Dumpster, Patio, Walkway, Front of House, Back of House, Other
        <br />• <strong>Pricing Types:</strong> Preset packages, Per worker, Per hour, Square footage, Custom
      </div>
    </div>
  );
};

// Advanced Tab
const AdvancedTab: React.FC<{
  editedConfig: Record<string, any>;
  updateConfig: (path: string[], value: any) => void;
}> = ({ editedConfig, updateConfig }) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(editedConfig, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setJsonText(JSON.stringify(editedConfig, null, 2));
  }, [editedConfig]);

  const handleJsonChange = (value: string) => {
    setJsonText(value);
    try {
      const parsed = JSON.parse(value);
      setJsonError(null);

      // Update entire config
      Object.keys(editedConfig).forEach((key) => {
        updateConfig([key], parsed[key]);
      });
      Object.keys(parsed).forEach((key) => {
        if (!(key in editedConfig)) {
          updateConfig([key], parsed[key]);
        }
      });
    } catch (err) {
      setJsonError("Invalid JSON");
    }
  };

  return (
    <div className="spe__tab-content">
      <h3 className="spe__section-title">Advanced JSON Editor</h3>

      <div className="spe__warning">
        ⚠️ Warning: Editing JSON directly can break the pricing calculator. Use the structured tabs above when possible.
      </div>

      {jsonError && <div className="spe__error">{jsonError}</div>}

      <textarea
        className="spe__json-editor"
        value={jsonText}
        onChange={(e) => handleJsonChange(e.target.value)}
        rows={30}
        spellCheck={false}
      />
    </div>
  );
};
